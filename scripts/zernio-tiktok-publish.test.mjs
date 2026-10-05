import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayload,
  extractAccountCandidates,
  hasUnverifiedPromotionClaim,
  isPromotionReady,
  sanitizeForReceipt
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
  const payload = buildPayload({ config, product, dryRun: true });
  assert.equal(payload.platforms.length, 1);
  assert.deepEqual(payload.platforms[0], {
    platform: 'tiktok',
    accountId: '6ac41ebe5450b4ad42dec37e'
  });
  assert.equal(payload.mediaItems[0].type, 'video');
  assert.equal(payload.mediaItems[0].url, config.product.videoUrl);
  assert.equal(payload.dryRun, true);
  assert.equal(payload.publishNow, true);
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

test('receipts remove provider credentials and tokens recursively', () => {
  const clean = sanitizeForReceipt({
    ok: true,
    accessToken: 'secret',
    nested: { refresh_token: 'secret2', username: 'prismbayclean' }
  });
  assert.deepEqual(clean, { ok: true, nested: { username: 'prismbayclean' } });
});
