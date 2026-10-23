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
