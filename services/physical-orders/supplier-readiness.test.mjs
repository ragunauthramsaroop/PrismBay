import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessSupplierReadiness,
  issueSupplierApproval,
  verifySupplierApproval
} from './supplier-readiness.mjs';

const NOW = Date.parse('2026-10-04T12:00:00.000Z');
const SECRET = 'supplier-approval-secret-0123456789abcdef';

function ledger(status = 'manual_fulfillment') {
  return {
    version: 1,
    events: {},
    orders: {
      pi_test_supplier123: {
        paymentIntentId: 'pi_test_supplier123',
        sessionId: 'cs_test_supplier123',
        paid: true,
        status,
        reason: null,
        items: [{ sku: 'crevice', quantity: 1 }]
      }
    }
  };
}

function evidence(overrides = {}) {
  return {
    evidenceRef: 'evidence_supplier_123',
    verifiedAt: new Date(NOW - 60_000).toISOString(),
    supplierIdentityVerified: true,
    supplierSubmissionRouteVerified: true,
    items: [{
      sku: 'crevice',
      variantId: 'cj_variant_123',
      supplierVariantVerified: true,
      inventoryVerified: true,
      inventory: 50,
      stockVerifiedAt: new Date(NOW - 60_000).toISOString(),
      listingRightsVerified: true
    }],
    destination: {
      country: 'US',
      zip: '10001',
      finalDestinationFreight: true,
      freightScope: 'buyer_destination_zip',
      freightQuotedAt: new Date(NOW - 60_000).toISOString()
    },
    economicsVerified: true,
    economics: {
      retailUsd: 12.95,
      productCostUsd: 2.0,
      freightUsd: 2.0,
      feeRatePct: 3.0
    },
    ...overrides
  };
}

test('fresh verified supplier evidence produces a de-identified non-spending draft', () => {
  const result = assessSupplierReadiness({
    ledgerSnapshot: ledger(),
    orderRef: 'cs_test_supplier123',
    evidence: evidence(),
    now: NOW
  });
  assert.equal(result.ready, true);
  assert.equal(result.supplierSubmissionEnabled, false);
  assert.match(result.draft.draftId, /^supplier_draft_[A-Za-z0-9_-]{32}$/);
  assert.equal(result.draft.orderRef, 'cs_test_supplier123');
  assert.equal(result.draft.items[0].variantId, 'cj_variant_123');
  assert.ok(!JSON.stringify(result.draft).includes('10001'));
  assert.ok(!JSON.stringify(result.draft).includes('email'));
});

test('missing or stale commercial evidence fails closed', () => {
  const stale = evidence({
    destination: {
      ...evidence().destination,
      freightQuotedAt: new Date(NOW - 11 * 60_000).toISOString()
    }
  });
  const result = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: stale, now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes('fresh_freight_quote_required'));
  assert.equal(result.supplierSubmissionEnabled, false);

  const missingRights = evidence();
  missingRights.items[0].listingRightsVerified = false;
  const blocked = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: missingRights, now: NOW });
  assert.ok(blocked.reasons.includes('listing_rights_not_verified'));
});

test('order item identity and verified supplier variant must match exactly', () => {
  const mismatch = evidence();
  mismatch.items[0].sku = 'pethair';
  const result = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: mismatch, now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes('order_item_identity_mismatch'));
});

test('owner/commercial approval is signed, scoped and expires', () => {
  const readiness = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: evidence(), now: NOW });
  const approval = issueSupplierApproval({
    draft: readiness.draft,
    approvalRef: 'approval_owner_001',
    approverRef: 'approver_owner',
    secret: SECRET,
    now: NOW,
    ttlMs: 10 * 60_000
  });
  const verified = verifySupplierApproval({ token: approval.token, draft: readiness.draft, secret: SECRET, now: NOW + 60_000 });
  assert.equal(verified.valid, true);
  assert.equal(verified.supplierSubmissionEnabled, false);

  const expired = verifySupplierApproval({ token: approval.token, draft: readiness.draft, secret: SECRET, now: NOW + 11 * 60_000 });
  assert.deepEqual(expired, { valid: false, reason: 'expired_supplier_approval' });
});

test('approval cannot be reused for a mutated supplier draft', () => {
  const readiness = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: evidence(), now: NOW });
  const approval = issueSupplierApproval({
    draft: readiness.draft,
    approvalRef: 'approval_owner_002',
    approverRef: 'approver_owner',
    secret: SECRET,
    now: NOW
  });
  const mutated = structuredClone(readiness.draft);
  mutated.items[0].variantId = 'cj_variant_other';
  const result = verifySupplierApproval({ token: approval.token, draft: mutated, secret: SECRET, now: NOW + 1_000 });
  assert.equal(result.valid, false);
});

test('negative economics never becomes supplier ready', () => {
  const weak = evidence({
    economicsVerified: true,
    economics: {
      retailUsd: 12.95,
      productCostUsd: 8.5,
      freightUsd: 4.0,
      feeRatePct: 3.0
    }
  });
  const result = assessSupplierReadiness({ ledgerSnapshot: ledger(), orderRef: 'cs_test_supplier123', evidence: weak, now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes('commercial_thresholds_fail'));
});
