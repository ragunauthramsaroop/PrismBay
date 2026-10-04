import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from './build-public-catalog.mjs';

const categories = [{ id: 'cleaning-tools' }, { id: 'bathroom-accessories' }];
const legacy = [{
  sku: 'legacy-1', slug: 'legacy-one', name: 'Legacy One', category: 'cleaning-tools',
  description: 'Existing live product', priceUsd: 12.95,
  checkoutUrl: 'https://buy.stripe.com/test-legacy', imageUrl: 'https://example.com/a.jpg', legacyLive: true
}];

function saleReady(overrides = {}) {
  return {
    sku: 'new-1', slug: 'new-one', name: 'New One', category: 'bathroom-accessories',
    description: 'Verified new product', priceUsd: 19.95,
    checkoutUrl: 'https://buy.stripe.com/test-new', imageUrl: 'https://example.com/b.jpg',
    status: 'SALE_READY',
    demandEvidence: { source: 'source', observedAt: '2026-10-04', evidenceType: 'retail-ranking', confidence: 'high' },
    demandEvidenceVerified: true,
    supplierIdentityVerified: true,
    exactVariantVerified: true,
    variantStockVerified: true,
    finalDestinationFreightVerified: true,
    landedCostVerified: true,
    marginFloorPassed: true,
    mediaRightsVerified: true,
    checkoutInfrastructureVerified: true,
    fulfillmentReady: true,
    ...overrides
  };
}

test('publishes existing legacy products and fully gated sale-ready products', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady()], categories });
  assert.equal(out.catalog.productCount, 2);
  assert.equal(out.rejected.length, 0);
  assert.deepEqual(out.catalog.products.map((x) => x.sku).sort(), ['legacy-1', 'new-1']);
});

test('blocks candidates missing final destination freight evidence', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ finalDestinationFreightVerified: false })], categories });
  assert.equal(out.catalog.productCount, 1);
  assert.equal(out.rejected.length, 1);
  assert.match(out.rejected[0].reasons.join(','), /finalDestinationFreightVerified/);
});

test('blocks a candidate that declares SALE_READY without demand evidence', () => {
  const candidate = saleReady({ demandEvidence: null });
  const out = buildCatalog({ legacyProducts: [], candidates: [candidate], categories });
  assert.equal(out.catalog.productCount, 0);
  assert.equal(out.rejected.length, 1);
  assert.match(out.rejected[0].reasons.join(','), /demandEvidence/);
});

test('rejects duplicate public SKUs', () => {
  assert.throws(() => buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ sku: 'legacy-1' })], categories }), /duplicate_sku/);
});

test('rejects duplicate public slugs', () => {
  assert.throws(() => buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ slug: 'legacy-one' })], categories }), /duplicate_slug/);
});

test('legacy entries require explicit grandfathering', () => {
  const bad = [{ ...legacy[0], legacyLive: false }];
  assert.throws(() => buildCatalog({ legacyProducts: bad, candidates: [], categories }), /legacy_not_explicit/);
});

test('legacy entries require Stripe-hosted checkout', () => {
  const bad = [{ ...legacy[0], checkoutUrl: 'https://example.com/checkout' }];
  assert.throws(() => buildCatalog({ legacyProducts: bad, candidates: [], categories }), /legacy_invalid_checkout/);
});

test('unknown categories are rejected', () => {
  assert.throws(() => buildCatalog({ legacyProducts: [], candidates: [saleReady({ category: 'unknown' })], categories }), /unknown_category/);
});

test('search index exposes public discovery fields without checkout URLs', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady()], categories });
  assert.equal(out.searchIndex.documents.length, 2);
  assert.equal('checkoutUrl' in out.searchIndex.documents[0], false);
  assert.ok(out.searchIndex.documents.every((x) => x.productUrl.startsWith('/products/')));
});
