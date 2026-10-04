import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  buildCheckoutSessionParams,
  buildPriceIndex,
  resolvePriceForFixedBasket,
  resolvePriceForSku,
  stripeCheckoutProvenance,
  validateCheckoutAuthorization,
  validatePaidCheckoutSession
} from './checkout-session-factory.mjs';

const catalog = JSON.parse(await fs.readFile(new URL('./catalog.prismbay-live.json', import.meta.url), 'utf8'));
const approved = {
  ok: true,
  checkoutAllowed: true,
  sku: 'crevice',
  quantity: 1,
  stockRevalidatedAtCheckout: true,
  shippingRevalidatedAtCheckout: true,
  economicsRevalidatedAtCheckout: true,
  supplierOrderingEnabled: false
};

test('indexes all current single-SKU Stripe Price mappings without treating them as sale readiness', () => {
  const index = buildPriceIndex(catalog);
  assert.equal(index.singleSku.size, 9);
  assert.match(index.singleSku.get('crevice'), /^price_/);
});

test('resolves exact fixed-basket bundle price', () => {
  const price = resolvePriceForFixedBasket(catalog, [
    { sku: 'pethair', quantity: 1 },
    { sku: 'scrubber', quantity: 1 },
    { sku: 'crevice', quantity: 1 }
  ]);
  assert.equal(price, 'price_1UIpiRKDLFBMHojQTOlFnjZk');
});

test('builds Checkout Session params only after full checkout revalidation', () => {
  const priceId = resolvePriceForSku(catalog, 'crevice');
  const result = buildCheckoutSessionParams({
    authorization: approved,
    priceId,
    successUrl: 'https://clean.prismbayai.com/order/success.html?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://clean.prismbayai.com/products/crevice/',
    quoteRef: 'quote-1234567890',
    correlationId: 'corr:crevice:123456'
  });
  assert.equal(result.params.mode, 'payment');
  assert.deepEqual(result.params.shipping_address_collection.allowed_countries, ['US']);
  assert.equal(result.params.line_items[0].price, priceId);
  assert.equal(result.params.line_items[0].quantity, 1);
  assert.equal(result.params.metadata.sku, 'crevice');
  assert.match(result.params.metadata.quote_ref_hash, /^[a-f0-9]{24}$/);
  assert.equal(JSON.stringify(result).includes('10001'), false);
  assert.equal(result.liveStripeCallPerformed, false);
  assert.equal(result.supplierOrderingEnabled, false);
});

test('fails closed when checkout authorization is missing revalidation evidence', () => {
  const unsafe = { ...approved, shippingRevalidatedAtCheckout: false };
  assert.equal(validateCheckoutAuthorization(unsafe).ok, false);
  assert.throws(() => buildCheckoutSessionParams({
    authorization: unsafe,
    priceId: resolvePriceForSku(catalog, 'crevice'),
    successUrl: 'https://clean.prismbayai.com/success',
    cancelUrl: 'https://clean.prismbayai.com/cancel',
    quoteRef: 'quote-x'
  }), /shipping_revalidation_required/);
});

test('rejects non-Stripe Price IDs', () => {
  assert.throws(() => buildCheckoutSessionParams({
    authorization: approved,
    priceId: 'plink_1UHk3oKDLFBMHojQEAnzuocV',
    successUrl: 'https://clean.prismbayai.com/success',
    cancelUrl: 'https://clean.prismbayai.com/cancel',
    quoteRef: 'quote-x'
  }), /verified_stripe_price_required/);
});

test('rejects unsafe return hosts', () => {
  assert.throws(() => buildCheckoutSessionParams({
    authorization: approved,
    priceId: resolvePriceForSku(catalog, 'crevice'),
    successUrl: 'https://evil.example/success',
    cancelUrl: 'https://clean.prismbayai.com/cancel',
    quoteRef: 'quote-x'
  }), /safe_return_urls_required/);
});

test('paid-session validator requires PrismBay metadata and paid USD mode', () => {
  const valid = {
    id: 'cs_test_123456789',
    mode: 'payment',
    payment_status: 'paid',
    currency: 'usd',
    amount_total: 1295,
    metadata: { commerce_schema: 'prismbay-v1', sku: 'crevice', quote_ref_hash: 'a'.repeat(24) }
  };
  assert.equal(validatePaidCheckoutSession(valid).ok, true);
  assert.equal(validatePaidCheckoutSession({ ...valid, payment_status: 'unpaid' }).ok, false);
  assert.equal(validatePaidCheckoutSession({ ...valid, currency: 'eur' }).ok, false);
});

test('provenance records official Stripe MIT source and no live mutation', () => {
  const provenance = stripeCheckoutProvenance();
  assert.equal(provenance.license, 'MIT');
  assert.equal(provenance.liveStripeObjectMutation, false);
});
