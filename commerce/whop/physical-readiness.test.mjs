import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPhysicalOffer, reconcileWhopPayment, inspectCurrentCatalog } from './physical-readiness.mjs';

const now = Date.UTC(2026, 10, 10, 18, 0, 0);
const candidate = {
  slug: 'crevice', retailPriceUsd: 12.95, supplierSku: 'sku_CREVICE123',
  variantId: 'vid_VARIANT123',
  supplierVerified: true, variantVerified: true, stockVerified: true,
  destinationFreightVerified: true, economicsApproved: true,
  mediaRightsVerified: true, fulfillmentApproved: true, saleReady: true,
};
function fixture() {
  return {
    catalog: { market: 'US', physicalCheckoutPermitted: true, candidates: [{ ...candidate }] },
    quote: {
      orderId: 'pb_1234567890abcdef', slug: 'crevice',
      supplierSku: candidate.supplierSku, variantId: candidate.variantId,
      buyerZip: '10001', freightScope: 'buyer_destination_zip', country: 'US',
      authenticatedSupplierEvidence: true, quantity: 1, verifiedAt: now - 60_000,
      expiresAt: now + 60_000, supplierCostCents: 200, freightCents: 350,
      paymentFeeCents: 65, returnsReserveCents: 65, totalCents: 1295,
    },
    checkout: {
      mode: 'sandbox', accountId: 'biz_SANDBOX123', productId: 'prod_DEMO123',
      planId: 'plan_DEMO123', merchantApproved: true, payoutApproved: true,
      shippingAddressCollected: true, returnPolicyConfigured: true,
      orderId: 'pb_1234567890abcdef', signedServerSession: true,
      currency: 'usd', amountCents: 1295,
      checkoutUrl: 'https://sandbox.whop.com/checkout/sample-123',
    },
  };
}
function inspect(f = fixture()) {
  return inspectPhysicalOffer(f.catalog, 'crevice', { quote: f.quote, checkout: f.checkout, now });
}

test('approved fixture returns only the sandbox checkout link', () => {
  const result = inspect();
  assert.equal(result.approved, true);
  assert.match(result.checkoutUrl, /^https:\/\/sandbox\.whop\.com\/checkout\//);
});
test('checkout closed at catalog level always denies sale', () => {
  const f = fixture(); f.catalog.physicalCheckoutPermitted = false;
  assert.equal(inspect(f).checkoutUrl, null);
});
test('all product flags must be independently true', () => {
  for (const flag of ['supplierVerified', 'stockVerified', 'mediaRightsVerified', 'fulfillmentApproved', 'saleReady']) {
    const f = fixture(); f.catalog.candidates[0][flag] = false;
    assert.equal(inspect(f).approved, false, flag);
  }
});
test('unrelated SKU or variant fails closed', () => {
  const f = fixture(); f.quote.variantId = 'vid_UNRELATED';
  assert.ok(inspect(f).blockers.includes('buyer_quote_or_product_mismatch'));
});
test('illustrative ZIP or stale quote cannot authorize a checkout', () => {
  const f = fixture(); f.quote.freightScope = 'example_zip_estimate';
  assert.equal(inspect(f).approved, false);
  f.quote.freightScope = 'buyer_destination_zip'; f.quote.expiresAt = now - 1;
  assert.ok(inspect(f).blockers.includes('buyer_quote_stale'));
});
test('checkout payment amount and product price must match', () => {
  const f = fixture(); f.checkout.amountCents += 100;
  assert.ok(inspect(f).blockers.includes('whop_price_mismatch'));
  const g = fixture(); g.quote.totalCents -= 100;
  assert.ok(inspect(g).blockers.includes('price_or_cost_mismatch'));
});
test('insufficient contribution margin blocks otherwise valid quote', () => {
  const f = fixture(); f.quote.freightCents = 900;
  assert.ok(inspect(f).blockers.includes('contribution_margin_insufficient'));
});
test('Whop merchant, payout and order binding are mandatory', () => {
  const f = fixture(); f.checkout.payoutApproved = false;
  assert.equal(inspect(f).approved, false);
  const g = fixture(); g.checkout.orderId = 'pb_wrongorder1234';
  assert.equal(inspect(g).approved, false);
});
test('untrusted URLs and cross-environment checkouts are rejected', () => {
  for (const checkoutUrl of [
    'https://evil.example/checkout/sample-123',
    'http://sandbox.whop.com/checkout/sample-123',
    'https://sandbox.whop.com.evil.example/checkout/sample-123',
    'https://whop.com/checkout/sample-123',
    'https://sandbox.whop.com/profile/not-a-checkout',
  ]) {
    const f = fixture(); f.checkout.checkoutUrl = checkoutUrl;
    assert.equal(inspect(f).checkoutUrl, null, checkoutUrl);
  }
});
test('production links require production environment and matching hostname', () => {
  const f = fixture(); f.checkout.mode = 'live';
  f.checkout.checkoutUrl = 'https://whop.com/checkout/sample-123';
  assert.equal(inspect(f).approved, true);
});
function paid() {
  return {
    order: { id: 'pb_1234567890abcdef', status: 'pending',
      supplierApprovalRecorded: true, buyerDestinationVerified: true,
      fulfillmentRouteVerified: true, planId: 'plan_DEMO123',
      businessId: 'biz_SANDBOX123', totalCents: 1295, currency: 'usd' },
    payment: { id: 'pay_CONFIRMED123', status: 'paid',
      metadata: { order_id: 'pb_1234567890abcdef' },
      plan_id: 'plan_DEMO123', business_id: 'biz_SANDBOX123',
      amount_cents: 1295, currency: 'usd', refunded: false },
  };
}
const event = { eventId: 'evt_EVENT123456', alreadyProcessed: false };
test('matching confirmed payment advances to human-reviewed fulfillment only', () => {
  const p = paid(); const result = reconcileWhopPayment(p.order, p.payment, event);
  assert.equal(result.approvedForFulfillmentReview, true);
  assert.equal(result.automaticSupplierOrdering, false);
});
test('replayed or unclaimed events cannot release fulfillment', () => {
  const p = paid();
  assert.equal(reconcileWhopPayment(p.order, p.payment, { ...event, alreadyProcessed: true }).approvedForFulfillmentReview, false);
  assert.equal(reconcileWhopPayment(p.order, p.payment).approvedForFulfillmentReview, false);
});
test('failed, disputed or refunded payments never release fulfillment', () => {
  for (const patch of [{ status: 'failed' }, { refunded: true }, { disputed: true }]) {
    const p = paid(); Object.assign(p.payment, patch);
    assert.equal(reconcileWhopPayment(p.order, p.payment, event).approvedForFulfillmentReview, false);
  }
});
test('wrong order, plan, account, amount or currency fails closed', () => {
  for (const patch of [
    { metadata: { order_id: 'pb_someone_else12345' } },
    { plan_id: 'plan_OTHER1234' }, { business_id: 'biz_OTHER1234' },
    { amount_cents: 125 }, { currency: 'eur' },
  ]) {
    const p = paid(); Object.assign(p.payment, patch);
    assert.equal(reconcileWhopPayment(p.order, p.payment, event).approvedForFulfillmentReview, false);
  }
});
test('existing PrismBay physical catalog is not falsely cleared for checkout', async () => {
  const status = await inspectCurrentCatalog();
  assert.equal(status.physicalCheckoutPermitted, false);
  assert.ok(status.products.length > 0);
  assert.equal(status.products.every(row => !row.approved), true);
});
