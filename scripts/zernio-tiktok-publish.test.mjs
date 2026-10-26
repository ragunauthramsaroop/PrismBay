import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayload,
  extractAccountCandidates,
  findExistingPublishRequest,
  hasUnverifiedPromotionClaim,
  isPromotionReady,
  sanitizeForReceipt,
  validatePublishRequest,
  requireCurrentPhysicalPromotionEvidence
} from './zernio-tiktok-publish.mjs';

const config = {
  account: { id: '6ac41ebe5450b4ad42dec37e', username: 'prismbayclean' },
  product: {
    caption: 'Small tool. Big difference. $12.95. Shop at clean.prismbayai.com',
    videoUrl: 'https://clean.prismbayai.com/media/retail-shorts/3-in-1-crevice-cleaning-brush.mp4'
  },
  tiktok: {
    privacyLevel: 'PUBLIC_TO_EVERYONE',
    allowComment: true,
    allowDuet: true,
    allowStitch: true,
    commercialContentType: 'brand_organic',
    contentPreviewConfirmed: true,
    expressConsentGiven: true,
    videoMadeWithAi: true
  }
};
const product = {
  sku: 'legacy-crevice-brush-001',
  name: '3-in-1 Crevice Cleaning Brush',
  priceUsd: 12.95,
  checkoutUrl: 'https://buy.stripe.com/example'
};

test('payload targets only the connected TikTok account and uses a public hosted MP4', () => {
  const payload = buildPayload({ config, product, dryRun: true, publishRequestId: 'first-crevice-001' });
  assert.equal(payload.platforms.length, 1);
  assert.deepEqual(payload.platforms[0], {
    platform: 'tiktok',
    accountId: '6ac41ebe5450b4ad42dec37e'
  });
  assert.equal(payload.mediaItems[0].type, 'video');
  assert.equal(payload.mediaItems[0].url, config.product.videoUrl);
  assert.equal(payload.dryRun, true);
  assert.equal(payload.publishNow, true);
  assert.equal(payload.metadata.prismbayPublishRequestId, 'first-crevice-001');
});

test('TikTok disclosures and interaction controls are explicit', () => {
  const payload = buildPayload({ config, product, dryRun: false });
  assert.equal(payload.tiktokSettings.privacyLevel, 'PUBLIC_TO_EVERYONE');
  assert.equal(payload.tiktokSettings.allowComment, true);
  assert.equal(payload.tiktokSettings.allowDuet, true);
  assert.equal(payload.tiktokSettings.allowStitch, true);
  assert.equal(payload.tiktokSettings.videoMadeWithAi, true);
  assert.equal(payload.tiktokSettings.commercialContentType, 'brand_organic');
  assert.equal(payload.tiktokSettings.contentPreviewConfirmed, true);
  assert.equal(payload.tiktokSettings.expressConsentGiven, true);
});

test('unverified sale and discount language is blocked', () => {
  assert.equal(hasUnverifiedPromotionClaim('Sale today, save 20% off'), true);
  assert.equal(hasUnverifiedPromotionClaim('Was $19.95, now $12.95'), true);
  assert.equal(hasUnverifiedPromotionClaim('Current verified price $12.95'), false);
});

test('promotion readiness requires every verification gate and an active price reduction', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const ready = {
    authorized: true,
    checkoutPriceVerified: true,
    marginVerified: true,
    regularPriceVerified: true,
    regularPriceUsd: 15.95,
    salePriceUsd: 12.95,
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2026-10-10T00:00:00Z'
  };
  assert.equal(isPromotionReady(ready, now), true);
  assert.equal(isPromotionReady({ ...ready, marginVerified: false }, now), false);
  assert.equal(isPromotionReady({ ...ready, endsAt: '2026-10-04T00:00:00Z' }, now), false);
  assert.equal(isPromotionReady({ ...ready, startsAt: 'bad-date' }, now), false);
});

test('account extraction finds nested Zernio account records', () => {
  const body = {
    data: {
      accounts: [
        { _id: 'other', platform: 'instagram' },
        { _id: '6ac41ebe5450b4ad42dec37e', platform: 'tiktok', username: 'prismbayclean' }
      ]
    }
  };
  const accounts = extractAccountCandidates(body);
  assert.equal(accounts.length, 2);
  assert.equal(accounts[1].username, 'prismbayclean');
});

test('publish request requires exact approval, product, account, video and price', () => {
  const request = {
    schemaVersion: 1,
    requestId: 'first-crevice-001',
    approved: true,
    confirmation: 'PUBLISH_PRISMBAY_TIKTOK',
    sku: product.sku,
    accountId: config.account.id,
    videoUrl: config.product.videoUrl,
    expectedPriceUsd: 12.95
  };
  assert.equal(validatePublishRequest(request, config, product).requestId, 'first-crevice-001');
  assert.throws(() => validatePublishRequest({ ...request, approved: false }, config, product), /publish_request_not_approved/);
  assert.throws(() => validatePublishRequest({ ...request, accountId: 'wrong' }, config, product), /publish_request_account_mismatch/);
  assert.throws(() => validatePublishRequest({ ...request, expectedPriceUsd: 9.99 }, config, product), /publish_request_price_mismatch/);
});

test('existing request metadata is found recursively for duplicate prevention', () => {
  const posts = {
    data: {
      posts: [
        { _id: 'a', metadata: { prismbayPublishRequestId: 'other' }, status: 'published' },
        { _id: 'b', metadata: { prismbayPublishRequestId: 'first-crevice-001' }, status: 'published' }
      ]
    }
  };
  const found = findExistingPublishRequest(posts, 'first-crevice-001');
  assert.equal(found._id, 'b');
  assert.equal(findExistingPublishRequest(posts, 'missing'), null);
});

test('receipts remove provider credentials and tokens recursively', () => {
  const clean = sanitizeForReceipt({
    ok: true,
    accessToken: 'secret',
    nested: { refresh_token: 'secret2', username: 'prismbayclean' }
  });
  assert.deepEqual(clean, { ok: true, nested: { username: 'prismbayclean' } });
});

// A previously deployed physical SKU, a configured checkout URL, and stored
// TikTok consent flags do not constitute a current supplier release.
test('legacy physical products are rejected before any TikTok provider request', () => {
  const old = { ...product, legacyLive: true, supplierEvidenceStatus: 'not-migrated-into-new-sale-ready-gate' };
  assert.throws(() => requireCurrentPhysicalPromotionEvidence(old, {
    schemaVersion: 3, checkedAt: '2026-10-25T10:00:00Z', authenticationVerified: true,
    saleReadyCount: 1, candidates: []
  }, Date.parse('2026-10-25T10:05:00Z')), /legacy_physical_product_not_qualified/);
});

test('missing supplier SKU mapping and stale evidence block physical TikTok promotion', () => {
  const noMap = { ...product, legacyLive: false, supplierEvidenceStatus: 'verified_sale_ready' };
  assert.throws(() => requireCurrentPhysicalPromotionEvidence(noMap, null), /legacy_physical_product_not_qualified/);
  const mapped = { ...noMap, supplierSlug: 'scrubber', supplierVariantSku: 'CJSKU123' };
  const stale = { schemaVersion: 3, checkedAt: '2026-10-20T00:00:00Z',
    authenticationVerified: true, saleReadyCount: 1, candidates: [{
      slug: 'scrubber', observedVariantSku: 'CJSKU123', liveStoreProduct: true,
      independentIdentityMatch: true, variantStockVerified: true, freightEstimateVerified: true,
      finalZipFreightVerified: true, mediaRightsVerified: true,
      checkoutInfrastructureVerified: true, checkoutAllowed: true,
      fulfillmentRouteVerified: true, automaticPromotionAllowed: true,
      observedAt: '2026-10-20T00:00:00Z'
    }] };
  assert.throws(() => requireCurrentPhysicalPromotionEvidence(mapped, stale,
    Date.parse('2026-10-25T10:05:00Z')), /current_physical_commercial_evidence_required/);
});
