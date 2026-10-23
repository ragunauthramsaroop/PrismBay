import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCJReview } from './cj-review-board.mjs';

const report = {
  checkedAt: '2026-10-02T22:14:50.048Z',
  market: 'US',
  authentication: 'verified',
  results: [{
    slug: 'crevice',
    candidate: '3-in-1 Crevice Cleaning Brush',
    liveStoreProduct: true,
    supplierVerified: true,
    variantInventoryVerified: true,
    freightVerified: true,
    freightQuoteScope: 'country_estimate',
    product: {
      name: '3-in-1 Crevice Cleaning Brush',
      sku: 'CJJT1731477',
      variantSku: 'CJJT173147702BY',
    },
  }],
};

const authorization = {
  ownerAuthorized: true,
  paidSpendAuthorized: false,
  bulkOutreachAuthorized: false,
  promotion: { automaticPromotionAllowedAfterAllOtherGates: true },
  media: {
    policy: 'original_graphics_and_original_copy_only',
    supplierMediaAuthorized: false,
    thirdPartyMediaAuthorized: false,
    promotionMediaRightsVerified: true,
  },
  checkoutInfrastructure: {
    deployed: true,
    stripeWebhookSecretConfigured: true,
    verifiedCheckoutSkus: ['crevice'],
    checkoutAllowedOnlyAfterFinalZipFreight: true,
  },
};

test('owner authorization closes media and promotion gates without bypassing final ZIP freight', () => {
  const review = buildCJReview(report, authorization);
  const row = review.candidates[0];
  assert.equal(row.mediaRightsVerified, true);
  assert.equal(row.promotionMediaPolicy, 'original_graphics_and_original_copy_only');
  assert.equal(row.promotionPolicyAuthorized, true);
  assert.equal(row.automaticPromotionAllowed, false);
  assert.equal(row.checkoutInfrastructureVerified, true);
  assert.equal(row.finalZipFreightVerified, false);
  assert.equal(row.checkoutAllowed, false);
  assert.equal(row.status, 'final_zip_freight_required');
  assert.equal(review.saleReadyCount, 0);
});

test('verified exact destination freight releases checkout only for an approved mapped SKU', () => {
  const withZip = structuredClone(report);
  withZip.results[0].finalZipFreightVerified = true;
  withZip.results[0].freightQuoteScope = 'buyer_destination_zip';
  const review = buildCJReview(withZip, authorization);
  const row = review.candidates[0];
  assert.equal(row.finalZipFreightVerified, true);
  assert.equal(row.checkoutInfrastructureVerified, true);
  assert.equal(row.checkoutAllowed, true);
  assert.equal(row.mediaRightsVerified, true);
  assert.equal(row.promotionPolicyAuthorized, true);
  assert.equal(row.automaticPromotionAllowed, false);
  assert.equal(row.fulfillmentRouteVerified, false);
  assert.equal(row.status, 'fulfillment_route_required');
  assert.equal(review.saleReadyCount, 0);
});

test('owner approval never authorizes checkout for an unmapped SKU', () => {
  const other = structuredClone(report);
  other.results[0].slug = 'pressure-washer';
  other.results[0].candidate = 'Cordless Pressure Washer';
  other.results[0].product.name = 'Cordless Portable Pressure Washer';
  other.results[0].finalZipFreightVerified = true;
  other.results[0].freightQuoteScope = 'buyer_destination_zip';
  const review = buildCJReview(other, authorization);
  assert.equal(review.candidates[0].checkoutInfrastructureVerified, false);
  assert.equal(review.candidates[0].checkoutAllowed, false);
  assert.equal(review.saleReadyCount, 0);
});
