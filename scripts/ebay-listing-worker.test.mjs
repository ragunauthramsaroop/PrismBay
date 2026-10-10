import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildListingPack, evaluateEconomics } from './ebay-listing-worker.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../marketplaces/ebay/garment-steamer.json', import.meta.url), 'utf8'));

test('title fits eBay 80-character limit and contains only relevant terms', () => {
  assert.ok(manifest.product.title.length <= 80);
  assert.match(manifest.product.title, /Garment Steamer/i);
  assert.doesNotMatch(manifest.product.title, /Conair|Rowenta|Hilife/i);
});

test('economics remain positive at the configured maximum screening freight', () => {
  const result = evaluateEconomics(manifest);
  assert.equal(result.pass, true);
  assert.ok(result.modeledProfitUsd >= manifest.economics.minimumProfitUsd);
  assert.ok(result.modeledMarginRate >= manifest.economics.minimumMarginRate);
});

test('listing never includes an off-eBay Stripe checkout route', () => {
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /buy\.stripe\.com/i);
  assert.equal(manifest.safety.directStripeLinkAllowedInEbay, false);
  assert.equal(manifest.safety.offEbayCheckoutAllowed, false);
});

test('publishing fails closed without authentication, live stock and exact dispatch location', () => {
  const pack = buildListingPack(manifest, {});
  assert.equal(pack.readyForPublish, false);
  assert.equal(pack.gates.ebaySellerAuthenticated, false);
  assert.equal(pack.gates.liveStockVerified, false);
  assert.equal(pack.gates.dispatchLocationVerified, false);
  assert.equal(pack.listing.itemLocation, null);
});

test('publishing becomes eligible only when every marketplace gate is explicitly verified', () => {
  const pack = buildListingPack(manifest, {
    EBAY_AUTH_VERIFIED: '1',
    CJ_LIVE_STOCK_VERIFIED: '1',
    CJ_DISPATCH_CITY: 'Yiwu',
    CJ_DISPATCH_REGION: 'Zhejiang',
    CJ_DISPATCH_POSTAL: '322000',
    CJ_DISPATCH_COUNTRY: 'CN',
  });
  assert.equal(pack.readyForPublish, true);
  assert.equal(pack.listing.itemLocation.city, 'Yiwu');
  assert.equal(pack.safeguards.automaticSupplierOrdering, false);
});
