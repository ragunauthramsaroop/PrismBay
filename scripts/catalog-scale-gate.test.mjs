import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCatalogStatus,
  missingSaleReadyGates,
  validatePublishableCandidate,
  summarizeCatalog
} from './catalog-scale-gate.mjs';

const ready = {
  sku: 'PB-001',
  category: 'cleaning-tools',
  priceUsd: 19.95,
  checkoutUrl: 'https://buy.stripe.com/example',
  demandEvidence: { source: 'retailer', observedAt: '2026-10-04', evidenceType: 'best-seller', confidence: 'high' },
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

test('fully verified candidate derives SALE_READY', () => {
  assert.equal(deriveCatalogStatus(ready), 'SALE_READY');
  assert.deepEqual(missingSaleReadyGates(ready), []);
  assert.equal(validatePublishableCandidate({ ...ready, status: 'SALE_READY' }).ok, true);
});

test('research candidate stays fail-closed without supplier identity', () => {
  const candidate = { sku: 'PB-002', category: 'bathroom-accessories', demandEvidence: ready.demandEvidence };
  assert.equal(deriveCatalogStatus(candidate), 'RESEARCH_CANDIDATE');
  assert.equal(validatePublishableCandidate({ ...candidate, status: 'SALE_READY' }).ok, false);
});

test('sale-ready declaration is rejected if final freight is missing', () => {
  const candidate = { ...ready, sku: 'PB-003', finalDestinationFreightVerified: false, status: 'SALE_READY' };
  const result = validatePublishableCandidate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('missing:finalDestinationFreightVerified'));
});

test('missing demand evidence blocks publishing even when boolean gate is true', () => {
  const candidate = { ...ready, sku: 'PB-004' };
  delete candidate.demandEvidence;
  assert.ok(missingSaleReadyGates(candidate).includes('demandEvidence'));
});

test('summary counts duplicates and sale-ready gap', () => {
  const candidates = [ready, { ...ready, sku: 'PB-005', category: 'bathroom-accessories' }, { ...ready, sku: 'PB-005' }];
  const summary = summarizeCatalog(candidates, { researchPoolTarget: 600, liveSaleReadyTarget: 500, maximumCategoryShare: 0.8 });
  assert.equal(summary.total, 3);
  assert.equal(summary.saleReady, 3);
  assert.deepEqual(summary.duplicateSkus, ['PB-005']);
  assert.equal(summary.saleReadyGap, 497);
});

test('rejected candidate remains rejected regardless of other gates', () => {
  assert.equal(deriveCatalogStatus({ ...ready, sku: 'PB-006', rejected: true }), 'REJECTED');
});
