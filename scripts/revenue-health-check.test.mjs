import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, DIGITAL_CHECKOUT_TOKENS, PHYSICAL_PRODUCTS, BUYER_GUIDE_OFFERS, validatePaidStore, validateBuyerGuide, validateScorecard, validatePhysicalStore, validateCatalog } from './revenue-health-check.mjs';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

test('paid store requires every configured digital checkout token and customer policy routes', () => {
  const html = 'x'.repeat(6100) + DIGITAL_CHECKOUT_TOKENS.join(' ') + ' www.prismbayai.com/refunds www.prismbayai.com/contact';
  assert.deepEqual(validatePaidStore(html).checkoutLinks, 4);
  assert.throws(() => validatePaidStore(html.replace(DIGITAL_CHECKOUT_TOKENS[2], 'missing')), /paid_store_invalid/);
  assert.throws(() => validatePaidStore(html.replace('www.prismbayai.com/refunds', '')), /paid_store_invalid/);
});

test('free assessment remains visibly no-paywall and wired to its client script', () => {
  const html = 'Free AI Vendor Evidence Check No login or paywall scorecard-ui.mjs';
  assert.doesNotThrow(() => validateScorecard(html));
  assert.throws(() => validateScorecard(html.replace('No login or paywall', '')), /scorecard_invalid/);
});

test('physical storefront must show all nine products and the supplier-verification safety boundary', () => {
  const html = PHYSICAL_PRODUCTS.join(' ') + ' confirm the exact product, stock, total shipping cost and delivery estimate for your US ZIP code';
  assert.equal(validatePhysicalStore(html).productsVisible, 9);
  assert.throws(() => validatePhysicalStore(html.replace(PHYSICAL_PRODUCTS[0], '')), /physical_store_invalid/);
  assert.throws(() => validatePhysicalStore(PHYSICAL_PRODUCTS.join(' ')), /safety_copy_missing/);
});

test('catalog rejects stale, incomplete and duplicate public attention data', () => {
  const now = Date.parse('2026-09-25T20:00:00Z');
  const base = {
    updatedAt: '2026-09-25T19:00:00Z',
    products: Array.from({length: 9}, (_, i) => ({ slug: 'p' + i, signalScore: 10 - i })),
  };
  assert.equal(validateCatalog(base, now).products, 9);
  assert.throws(() => validateCatalog({...base, updatedAt:'2026-09-23T00:00:00Z'}, now), /catalog_stale/);
  assert.throws(() => validateCatalog({...base, products:base.products.slice(0,8)}, now), /catalog_incomplete/);
  assert.throws(() => validateCatalog({...base, products:[...base.products.slice(0,8), base.products[0]]}, now), /duplicate_slugs/);
});

test('four paid offers are monitored while standalone guide validation remains scoped to the three original guides', () => {
  assert.equal(ACTIVE_DIGITAL_OFFERS.length,4);
  assert.equal(BUYER_GUIDE_OFFERS.length,3);
  assert.deepEqual(BUYER_GUIDE_OFFERS.map(offer => offer.slug), ['stakeholder','esg','whitepaper']);
  const bundle = ACTIVE_DIGITAL_OFFERS.find(offer => offer.slug === 'bundle');
  assert.ok(bundle);
  assert.ok(DIGITAL_CHECKOUT_TOKENS.includes(bundle.checkout.split('/').at(-1)));
});

test('live paid-product acquisition guides enforce exact canonical, checkout, price and refund policy', () => {
  for(const offer of BUYER_GUIDE_OFFERS) {
    const html='x'.repeat(7200)+'<link rel="canonical" href="'+offer.guide+'">'+
      '<link rel="stylesheet" href="./buyer-guides.css"><h1>Free original guide</h1>'+
      '<a href="'+offer.checkout+'">Buy for $'+offer.priceUsd+'</a>'+
      '<a href="https://www.prismbayai.com/refunds">Refund policy</a>';
    assert.equal(validateBuyerGuide(html,offer).priceUsd,offer.priceUsd);
    assert.throws(()=>validateBuyerGuide(html.replace(offer.checkout,'https://invalid.example/buy'),offer),/buyer_guide_invalid/);
    assert.throws(()=>validateBuyerGuide(html.replace('$'+offer.priceUsd,'$999'),offer),/buyer_guide_invalid/);
    assert.throws(()=>validateBuyerGuide(html.replace(offer.guide,'https://incorrect.example/'),offer),/buyer_guide_invalid/);
  }
});

test('revenue checks and campaigns use the current GitHub owner', () => {
  for (const url of [TARGETS.paidStore, TARGETS.freeScorecard, ...ACTIVE_DIGITAL_OFFERS.map(offer => offer.guide)]) {
    assert.equal(new URL(url).hostname, 'ragunauthramsaroop.github.io');
  }
  assert.equal(new URL(TARGETS.catalog).pathname, '/repos/ragunauthramsaroop/PrismBay/contents/public/viral-catalog.json');
});
