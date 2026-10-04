import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTransition, advanceCandidate, auditCatalogTransitions } from './catalog-stage-controller.mjs';

const readyBase = {
  sku: 'demo-1', category: 'cleaning-tools', priceUsd: 19.95,
  checkoutUrl: 'https://buy.stripe.com/example',
  demandEvidenceVerified: true,
  supplierIdentityVerified: true,
  exactVariantVerified: true,
  variantStockVerified: true,
  finalDestinationFreightVerified: true,
  landedCostVerified: true,
  marginFloorPassed: true,
  mediaRightsVerified: true,
  checkoutInfrastructureVerified: true,
  fulfillmentReady: true
};

test('blocks illegal status skipping', () => {
  const r = validateTransition({ status: 'RESEARCH_CANDIDATE' }, 'SALE_READY');
  assert.equal(r.ok, false);
  assert.match(r.reason, /illegal_transition/);
});

test('requires supplier identity and exact variant before supplier matched', () => {
  const r = validateTransition({ status: 'RESEARCH_CANDIDATE', supplierIdentityVerified: true }, 'SUPPLIER_MATCHED');
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['exactVariantVerified']);
});

test('requires complete commercial evidence for final commercial gate', () => {
  const r = validateTransition({ ...readyBase, status: 'COMMERCIAL_EVIDENCE_PENDING', mediaRightsVerified: false }, 'READY_FOR_FINAL_COMMERCIAL_GATE');
  assert.equal(r.ok, false);
  assert.ok(r.missing.includes('mediaRightsVerified'));
});

test('permits SALE_READY only after every gate passes', () => {
  const r = validateTransition({ ...readyBase, status: 'READY_FOR_FINAL_COMMERCIAL_GATE' }, 'SALE_READY');
  assert.equal(r.ok, true);
});

test('records lifecycle evidence on transition', () => {
  const next = advanceCandidate({ status: 'RESEARCH_CANDIDATE', supplierIdentityVerified: true, exactVariantVerified: true }, 'SUPPLIER_MATCHED', { correlationId: 'corr-1', evidenceRefs: ['supplier:abc'], transitionedAt: '2026-10-04T00:00:00Z' });
  assert.equal(next.status, 'SUPPLIER_MATCHED');
  assert.equal(next.lifecycle.previousState, 'RESEARCH_CANDIDATE');
  assert.equal(next.lifecycle.correlationId, 'corr-1');
});

test('audits false SALE_READY declarations', () => {
  const r = auditCatalogTransitions([{ ...readyBase, status: 'SALE_READY', fulfillmentReady: false }]);
  assert.equal(r.ok, false);
  assert.equal(r.invalid[0].reason, 'sale_ready_gate_failure');
});
