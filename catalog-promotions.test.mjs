import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./assets/catalog-ui.js', import.meta.url), 'utf8');
const context = { window: { PRISMBAY_CATALOG: { products: [] } }, URL, Intl,
  document: { querySelector: () => true, getElementById: () => null } };
vm.runInNewContext(source.replace('  start();', '  window.testApi = { validatePromotion, validatePublishedProduct, validateFallbackProduct, card };'), context);
const api = context.window.testApi;
const now = Date.now();
const promotion = { authorized: true, checkoutPriceVerified: true, marginVerified: true,
  regularPriceVerified: true, regularPriceUsd: 25, salePriceUsd: 20,
  startsAt: new Date(now - 60000).toISOString(), endsAt: new Date(now + 60000).toISOString() };
const remote = { sku: 'fixture', name: 'Test fixture', description: 'Offline test only', priceUsd: 20,
  checkoutUrl: 'https://buy.stripe.com/test', promotion };

test('remote product preserves valid promotion through normalization and rendering', () => {
  const product = api.validatePublishedProduct(remote);
  assert.match(api.card(product), /On sale/);
  assert.match(api.card(product), /Was \$25\.00/);
  assert.match(api.card(product), /Save \$5\.00 \(20% off\)/);
});
test('fallback catalog preserves valid promotion through normalization', () => {
  const product = api.validateFallbackProduct({ sku: 'fixture', name: 'Test', status: 'checkout-live', price: 20,
    checkout: remote.checkoutUrl, promotion });
  assert.match(api.card(product), /On sale/);
});
test('missing verification never displays sale', () => {
  for (const field of ['authorized', 'checkoutPriceVerified', 'marginVerified', 'regularPriceVerified']) {
    const product = api.validatePublishedProduct({ ...remote, promotion: { ...promotion, [field]: false } });
    assert.doesNotMatch(api.card(product), /On sale|pb-sale-meta/);
  }
});
test('price mismatch is rejected', () => {
  assert.equal(api.validatePromotion(promotion, 21, now), null);
});
test('expired and future promotions are rejected at render time', () => {
  for (const p of [{ ...promotion, endsAt: new Date(now - 1).toISOString() },
    { ...promotion, startsAt: new Date(now + 60000).toISOString() }]) {
    assert.doesNotMatch(api.card(api.validatePublishedProduct({ ...remote, promotion: p })), /On sale/);
  }
});
test('non-finite prices cannot produce an infinite discount', () => {
  assert.equal(api.validatePromotion({ ...promotion, regularPriceUsd: 'Infinity' }, 20, now), null);
});
test('percentage savings are never rounded above the actual discount', () => {
  assert.equal(api.validatePromotion({ ...promotion, regularPriceUsd: 29.95 }, 20, now).percentOff, 33);
});
