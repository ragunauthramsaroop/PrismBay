import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storefront = readFileSync(new URL('../src/Storefront.tsx', import.meta.url), 'utf8');
const garment = readFileSync(new URL('../pages/garment-steamer.tsx', import.meta.url), 'utf8');

test('unapproved physical catalog displays research status without fixed checkout prices', () => {
  assert.doesNotMatch(storefront, /price:\\s*['"`]\\$/);
  assert.doesNotMatch(storefront, /Live checkout|buy\\.stripe\\.com|checkoutHref/);
  assert.match(storefront, /Research preview/);
  assert.match(storefront, /No physical product is approved for checkout/);
  assert.match(storefront, /Price pending verification/);
  assert.match(storefront, /Request shipping review/);
});

test('garment inquiry does not assert unverified product functionality or a sale price', () => {
  assert.doesNotMatch(garment, /USD 29\\.95|Handheld steam care|buy\\.stripe\\.com|cjdropshipping\\.com/);
  assert.match(garment, /noindex,follow/);
  assert.match(garment, /Steaming function, electrical specifications, plug compatibility and fabric suitability have not been independently verified/);
  assert.match(garment, /Physical checkout remains closed until all commercial gates pass/);
});

test('checkout remains dependent on the existing live quote authorization', () => {
  assert.match(garment, /data\\?\\.ok && data\\?\\.stage === 'checkout_authorized' && data\\?\\.checkoutUrl/);
  assert.match(garment, /quote\\?\\.ok && quote\\.stage === 'checkout_authorized' && quote\\.checkoutUrl/);
  assert.match(storefront, /const inquiryHref = hasQuoteInquiry \\? '\\/garment-steamer\\/' : '\\/contact\\/\\?product='/);
});
