import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildTikTokRetailReadiness } from './tiktok-retail-readiness.mjs';
import { verifyFirstSale } from './first-sale-verifier.mjs';

test('TikTok readiness fails closed when signature file is missing', () => {
  const report = buildTikTokRetailReadiness({
    publisher: { result: { tiktokVerificationReady: false, checks: [
      { url: 'https://www.prismbayai.com/terms', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/privacy', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/tiktokio-example.txt', ok: false, status: 404 },
    ] } },
    supplierReview: { saleReadyCount: 1 },
    publicPost: { publicPostVerified: true },
  });
  assert.equal(report.readyForPublicRetailPublishing, false);
  assert.ok(report.missing.includes('site_verification_file'));
});

test('TikTok readiness requires a sale-ready product and verified public post', () => {
  const report = buildTikTokRetailReadiness({
    publisher: { result: { tiktokVerificationReady: true, checks: [
      { url: 'https://www.prismbayai.com/terms', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/privacy', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/tiktokio-example.txt', ok: true, status: 200 },
    ] } },
    supplierReview: { saleReadyCount: 0 },
  });
  assert.equal(report.readyForPublicRetailPublishing, false);
  assert.deepEqual(
    report.missing.filter(x => ['public_post_verification', 'sale_ready_product'].includes(x)).sort(),
    ['public_post_verification', 'sale_ready_product'].sort(),
  );
  assert.ok(report.missing.includes('authenticated_retail_tiktok_connection'));
  assert.ok(report.missing.includes('owner_publication_authorization'));
});

test('test or incomplete orders never count as first sale', () => {
  const report = verifyFirstSale({ order: {
    test: true, paid: true, paymentId: 'pi_test', supplierOrderVerified: true,
    shipmentVerified: true, refunded: false, grossRevenueUsd: 30, productCostUsd: 10, freightCostUsd: 5,
  } });
  assert.equal(report.verifiedFirstSale, false);
});

test('locally asserted profitable order is not a verified Stripe sale', () => {
  const report = verifyFirstSale({ order: {
    orderReference: 'PB-001', test: false, paid: true, paymentId: 'pi_live_123',
    supplierOrderVerified: true, shipmentVerified: true, refunded: false,
    grossRevenueUsd: 35, productCostUsd: 12, freightCostUsd: 6, paymentFeesUsd: 1.5,
  } });
  assert.equal(report.verifiedFirstSale, false);
  assert.equal(report.verifiedSaleCount, 0);
  assert.equal(report.grossRevenueUsd, 0);
  assert.equal(report.marginVerified, false);
  assert.equal(report.netMarginUsd, null);
});

// Public repository copy must not outrun authenticated supplier release gates.
// A later authorized physical launch must deliberately update this test and the evidence.
test('public README does not market an unverified physical product as a priced offer', async () => {
  const readme = await fs.readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /No physical product is currently approved for checkout or retail promotion/i);
  assert.match(readme, /final buyer-ZIP freight, landed cost, commercial media rights and fulfillment route/i);
  assert.doesNotMatch(readme, /Portable Garment Steamer,\s*USD\s*\$?29\.95/i);
  assert.doesNotMatch(readme, /\[View the Portable Garment Steamer/i);
  assert.doesNotMatch(readme, /## PrismBay Clean live commerce/i);
});
