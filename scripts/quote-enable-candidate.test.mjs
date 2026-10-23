import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuoteEnableCandidates } from './quote-enable-candidate.mjs';

const authorization = {
  ownerAuthorized: true,
  checkoutInfrastructure: {
    deployed: true,
    stripeWebhookSecretConfigured: true,
    checkoutAllowedOnlyAfterFinalZipFreight: true,
    verifiedCheckoutSkus: ['crevice'],
    verifiedCheckoutUrls: { crevice: 'https://buy.stripe.com/cNi5kE8XAeSndGib8QgnK02' },
  },
};

const report = {
  checkedAt: '2026-10-03T12:00:00.000Z',
  results: [{
    slug: 'crevice',
    retailPriceUsd: 12.95,
    supplierVerified: true,
    variantInventoryVerified: true,
    freightVerified: true,
    originCountryCode: 'US',
    product: {
      name: '3 In 1 Crevice Gap Cleaning Brush',
      sku: 'SYNTHETIC-3IN1-CREVICE',
      variantSku: 'SYNTHETIC-3IN1-CREVICE-VARIANT',
      variantId: 'VID-123',
      productCostUsd: 1.75,
      warehouse: 'US',
    },
  }],
};

test('eligible verified product becomes a quote-enable candidate but never auto-activates', () => {
  const output = buildQuoteEnableCandidates(report, authorization);
  assert.equal(output.candidateCount, 1);
  assert.equal(output.automaticActivation, false);
  assert.equal(output.finalBuyerZipRequired, true);
  const candidate = output.quoteProducts[0];
  assert.equal(candidate.sku, 'crevice');
  assert.equal(candidate.cjVariantId, 'VID-123');
  assert.equal(candidate.cjVariantSku, 'SYNTHETIC-3IN1-CREVICE-VARIANT');
  assert.equal(candidate.supplierCostUsd, 1.75);
  assert.equal(candidate.activationAllowed, false);
  assert.equal(candidate.evidence.finalBuyerZipVerified, false);
});

test('candidate is rejected when checkout URL or variant evidence is missing', () => {
  const noUrl = structuredClone(authorization);
  noUrl.checkoutInfrastructure.verifiedCheckoutUrls = {};
  assert.equal(buildQuoteEnableCandidates(report, noUrl).candidateCount, 0);
  const noVariant = structuredClone(report);
  noVariant.results[0].product.variantId = null;
  assert.equal(buildQuoteEnableCandidates(noVariant, authorization).candidateCount, 0);
});

test('candidate is rejected when independent identity check fails', () => {
  const bad = structuredClone(report);
  bad.results[0].product.name = 'Stand Airless Paint Sprayer';
  assert.equal(buildQuoteEnableCandidates(bad, authorization).candidateCount, 0);
});

test('production steamer checkout mapping reaches quote handoff without sale activation', async () => {
  const fs = await import('node:fs/promises');
  const configured = JSON.parse(await fs.readFile('config/retail-commercial-authorization.json', 'utf8'));
  const steamer = {
    checkedAt: '2026-10-08T04:00:00.000Z',
    results: [{
      slug: 'garment-steamer', retailPriceUsd: 29.95,
      supplierVerified: true, variantInventoryVerified: true, freightVerified: true,
      originCountryCode: 'CN',
      product: { name: 'Portable Garment Clothes Steamer', sku: 'SYNTHETIC-STEAMER',
        variantSku: 'SYNTHETIC-VARIANT', variantId: 'TEST-STEAMER-VID',
        productCostUsd: 2.72, warehouse: 'CN' },
    }],
  };
  const output = buildQuoteEnableCandidates(steamer, configured);
  assert.equal(output.candidateCount, 1);
  assert.equal(output.quoteProducts[0].stripePaymentUrl, 'https://buy.stripe.com/bJe4gA8XAdOjeKmb8QgnK05');
  assert.equal(output.automaticActivation, false);
  assert.equal(output.supplierOrderingEnabled, false);
  assert.equal(output.finalBuyerZipRequired, true);
  assert.equal(output.quoteProducts[0].activationAllowed, false);
  assert.equal(output.quoteProducts[0].evidence.finalBuyerZipVerified, false);
  steamer.results[0].variantInventoryVerified = false;
  assert.equal(buildQuoteEnableCandidates(steamer, configured).candidateCount, 0);
});

test('quote handoff rejects the real 4-in-1 supplier title for a 3-in-1 offer', () => {
  const mismatched = structuredClone(report);
  mismatched.results[0].product.name =
    '4 In 1 Bottle Gap Cleaner Brush Multifunctional Cup Cleaning Brushes';
  assert.equal(buildQuoteEnableCandidates(mismatched, authorization).candidateCount, 0);
});
