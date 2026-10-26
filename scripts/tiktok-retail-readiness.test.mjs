import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTikTokRetailReadiness } from './tiktok-retail-readiness.mjs';

const verifiedSite = {
  result: {
    tiktokVerificationReady: true,
    checks: [
      { url: 'https://www.prismbayai.com/terms', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/privacy', ok: true, status: 200 },
      { url: 'https://www.prismbayai.com/tiktokioExample.txt', ok: true, status: 200 },
    ],
  },
};

test('missing inputs fail closed without false sale-ready counts', () => {
  const report = buildTikTokRetailReadiness({});
  assert.equal(report.readyForPublicRetailPublishing, false);
  assert.equal(report.technicalPrerequisitesReady, false);
  assert.equal(report.saleReadyProductCount, 0);
  assert.ok(report.missing.includes('authenticated_retail_tiktok_connection'));
  assert.ok(report.missing.includes('owner_publication_authorization'));
});

test('all public and repository prerequisites still do not authorize TikTok publication', () => {
  const report = buildTikTokRetailReadiness({
    publisher: verifiedSite,
    supplierReview: { saleReadyCount: 1 },
    publicPost: { publicPostVerified: true },
  });
  assert.equal(report.technicalPrerequisitesReady, true);
  assert.equal(report.readyForPublicRetailPublishing, false);
  assert.deepEqual(report.missing, [
    'authenticated_retail_tiktok_connection',
    'retail_video_publish_scope',
    'creative_rights_and_media_digest',
    'owner_publication_authorization',
  ]);
});

test('untrusted repository flags do not override independent owner and provider gates', () => {
  const report = buildTikTokRetailReadiness({
    publisher: { result: { ...verifiedSite.result, ownerAuthorized: true, tiktokConnected: true, mediaRightsVerified: true, videoPublishScope: true } },
    supplierReview: { saleReadyCount: 9 },
    publicPost: { publicPostVerified: true, ownerAuthorized: true },
  });
  assert.equal(report.readyForPublicRetailPublishing, false);
  assert.ok(report.ownerOrProviderEvidenceRequired.includes('creative_rights_and_media_digest'));
});

test('invalid or negative sale-ready counts never establish readiness', () => {
  for (const count of [-1, 0, 1.5, '3', null]) {
    const report = buildTikTokRetailReadiness({ publisher: verifiedSite, supplierReview: { saleReadyCount: count } });
    assert.equal(report.saleReadyProductCount, 0);
    assert.ok(report.missing.includes('sale_ready_product'));
  }
});

test('legacy retail TikTok publishing configuration is revoked and cannot be mistaken for fresh consent', async () => {
  const { readFile } = await import('node:fs/promises');
  const legacy = JSON.parse(await readFile(new URL('../config/tiktok-publish.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../config/tiktok-publish-lock.json', import.meta.url), 'utf8'));
  const auto = JSON.parse(await readFile(new URL('../config/tiktok-approved-autopost.json', import.meta.url), 'utf8'));
  assert.equal(lock.locked, true);
  assert.equal(auto.enabled, false);
  assert.equal(legacy.tiktok.expressConsentGiven, false);
  assert.equal(legacy.tiktok.contentPreviewConfirmed, false);
  assert.equal(legacy.tiktok.publicationDisabled, true);
  assert.equal(legacy.tiktok.privacyLevel, 'SELF_ONLY');
  assert.equal(legacy.product.videoUrl, '');
  assert.equal(legacy.product.caption, '');
  assert.equal(legacy.product.expectedPriceUsd, null);
  assert.equal(legacy.safety.requireCurrentOwnerApproval, true);
});
