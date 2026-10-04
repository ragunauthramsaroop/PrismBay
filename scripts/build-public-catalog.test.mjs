import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from './build-public-catalog.mjs';

const categories = [{ id: 'cleaning-tools' }, { id: 'bathroom-accessories' }];
const legacy = [{
  sku: 'legacy-1', slug: 'legacy-one', name: 'Legacy One', category: 'cleaning-tools',
  description: 'Existing live product', priceUsd: 12.95,
  checkoutUrl: 'https://buy.stripe.com/test-legacy', imageUrl: 'https://example.com/a.jpg', legacyLive: true
}];
const now = Date.parse('2026-10-04T21:45:00Z');

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

function verifiedPromotion(overrides = {}) {
  return {
    sku: 'new-1',
    campaignId: 'october-clean-sale',
    regularPriceUsd: 24.95,
    salePriceUsd: 19.95,
    startsAt: '2026-10-04T20:00:00Z',
    endsAt: '2026-10-10T20:00:00Z',
    authorized: true,
    regularPriceVerified: true,
    marginVerified: true,
    checkoutPriceVerified: true,
    evidenceRefs: ['supplier-margin:run-1', 'stripe-price:plink-1'],
    ...overrides
  };
}

test('publishes existing legacy products and fully gated sale-ready products', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady()], categories, now });
  assert.equal(out.catalog.productCount, 2);
  assert.equal(out.rejected.length, 0);
  assert.deepEqual(out.catalog.products.map((x) => x.sku).sort(), ['legacy-1', 'new-1']);
});

test('blocks candidates missing final destination freight evidence', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ finalDestinationFreightVerified: false })], categories, now });
  assert.equal(out.catalog.productCount, 1);
  assert.equal(out.rejected.length, 1);
  assert.match(out.rejected[0].reasons.join(','), /finalDestinationFreightVerified/);
});

test('blocks a candidate that declares SALE_READY without demand evidence', () => {
  const candidate = saleReady({ demandEvidence: null });
  const out = buildCatalog({ legacyProducts: [], candidates: [candidate], categories, now });
  assert.equal(out.catalog.productCount, 0);
  assert.equal(out.rejected.length, 1);
  assert.match(out.rejected[0].reasons.join(','), /demandEvidence/);
});

test('rejects duplicate public SKUs', () => {
  assert.throws(() => buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ sku: 'legacy-1' })], categories, now }), /duplicate_sku/);
});

test('rejects duplicate public slugs', () => {
  assert.throws(() => buildCatalog({ legacyProducts: legacy, candidates: [saleReady({ slug: 'legacy-one' })], categories, now }), /duplicate_slug/);
});

test('legacy entries require explicit grandfathering', () => {
  const bad = [{ ...legacy[0], legacyLive: false }];
  assert.throws(() => buildCatalog({ legacyProducts: bad, candidates: [], categories, now }), /legacy_not_explicit/);
});

test('legacy entries require Stripe-hosted checkout', () => {
  const bad = [{ ...legacy[0], checkoutUrl: 'https://example.com/checkout' }];
  assert.throws(() => buildCatalog({ legacyProducts: bad, candidates: [], categories, now }), /legacy_invalid_checkout/);
});

test('unknown categories are rejected', () => {
  assert.throws(() => buildCatalog({ legacyProducts: [], candidates: [saleReady({ category: 'unknown' })], categories, now }), /unknown_category/);
});

test('search index exposes public discovery fields without checkout URLs', () => {
  const out = buildCatalog({ legacyProducts: legacy, candidates: [saleReady()], categories, now });
  assert.equal(out.searchIndex.documents.length, 2);
  assert.equal('checkoutUrl' in out.searchIndex.documents[0], false);
  assert.ok(out.searchIndex.documents.every((x) => x.productUrl.startsWith('/products/')));
});

test('publishes a sale badge payload only after all commercial and checkout evidence gates pass', () => {
  const out = buildCatalog({
    legacyProducts: [],
    candidates: [saleReady()],
    categories,
    promotions: [verifiedPromotion()],
    now
  });
  assert.equal(out.catalog.promotionCount, 1);
  const product = out.catalog.products[0];
  assert.equal(product.promotion.regularPriceUsd, 24.95);
  assert.equal(product.promotion.salePriceUsd, 19.95);
  assert.equal(product.promotion.checkoutPriceVerified, true);
  assert.equal(out.promotionRejections.length, 0);
});

test('does not publish a discount when checkout price evidence is missing', () => {
  const out = buildCatalog({
    legacyProducts: [],
    candidates: [saleReady()],
    categories,
    promotions: [verifiedPromotion({ checkoutPriceVerified: false })],
    now
  });
  assert.equal(out.catalog.promotionCount, 0);
  assert.equal('promotion' in out.catalog.products[0], false);
  assert.ok(out.promotionRejections[0].reasons.includes('checkout_price_unverified'));
});

test('does not publish a was-price when regular price history is unverified', () => {
  const out = buildCatalog({
    legacyProducts: [],
    candidates: [saleReady()],
    categories,
    promotions: [verifiedPromotion({ regularPriceVerified: false })],
    now
  });
  assert.equal(out.catalog.promotionCount, 0);
  assert.ok(out.promotionRejections[0].reasons.includes('regular_price_unverified'));
});

test('does not publish a discount if the sale price differs from the actual catalog checkout price', () => {
  const out = buildCatalog({
    legacyProducts: [],
    candidates: [saleReady()],
    categories,
    promotions: [verifiedPromotion({ salePriceUsd: 18.95 })],
    now
  });
  assert.equal(out.catalog.promotionCount, 0);
  assert.ok(out.promotionRejections[0].reasons.includes('sale_price_not_checkout_price'));
});

test('expired promotions fail closed and disappear from the public catalog', () => {
  const out = buildCatalog({
    legacyProducts: [],
    candidates: [saleReady()],
    categories,
    promotions: [verifiedPromotion({ endsAt: '2026-10-04T21:00:00Z' })],
    now
  });
  assert.equal(out.catalog.promotionCount, 0);
  assert.ok(out.promotionRejections[0].reasons.includes('promotion_expired'));
});
