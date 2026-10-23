import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRetailPromotionSwarm, candidateReadiness } from './retail-promotion-swarm.mjs';

test('blocked product without rights or a verified preflight route never becomes promotion eligible', () => {
  const item = candidateReadiness({
    slug: 'crevice',
    candidate: '3-in-1 Crevice Cleaning Brush',
    independentIdentityMatch: true,
    variantStockVerified: true,
    freightEstimateVerified: true,
    finalZipFreightVerified: false,
    mediaRightsVerified: false,
    checkoutInfrastructureVerified: false,
    checkoutAllowed: false,
    automaticPromotionAllowed: false,
  });
  assert.equal(item.promotionEligible, false);
  assert.equal(item.directCheckoutEligible, false);
  assert.deepEqual(item.missing.map(x => x.field), [
    'finalZipFreightVerified',
    'mediaRightsVerified',
    'checkoutInfrastructureVerified',
    'checkoutAllowed',
    'fulfillmentRouteVerified',
    'automaticPromotionAllowed',
    'verifiedPreflightRoute',
  ]);
});

test('garment steamer remains research-only without final freight, checkout and fulfillment clearance', () => {
  const now = Date.parse('2026-10-09T23:30:00.000Z');
  const candidate = {
    slug: 'garment-steamer',
    candidate: 'Portable Garment Steamer',
    liveStoreProduct: true,
    observedVariantSku: 'CJYD245844002BY',
    independentIdentityMatch: true,
    variantStockVerified: true,
    freightEstimateVerified: true,
    finalZipFreightVerified: false,
    mediaRightsVerified: true,
    checkoutInfrastructureVerified: true,
    checkoutAllowed: false,
    automaticPromotionAllowed: true,
  };
  const item = candidateReadiness(candidate);
  assert.equal(item.promotionEligible, false);
  assert.equal(item.directCheckoutEligible, false);
  assert.deepEqual(item.missing.map(x => x.field), [
    'finalZipFreightVerified', 'checkoutAllowed', 'fulfillmentRouteVerified',
  ]);
  assert.ok(item.preflightUrl.includes('browser-worker-production-f5b4.up.railway.app/garment-steamer/'));

  const swarm = buildRetailPromotionSwarm({
    now,
    review: {
      checkedAt: '2026-10-09T23:00:00.000Z',
      saleReadyCount: 0,
      candidates: [candidate],
    },
    workerBoard: { tasks: new Array(8).fill({}) },
    reports: {
      publisher: { result: { tiktokVerificationReady: true } },
      'storefront-cro-auditor': { result: { activeStorefront: { status: 200, finalUrl: 'https://clean.prismbayai.com/' } } },
      'analytics-reviewer': { result: { live: true } },
    },
  });
  assert.equal(swarm.promotionEligibleCount, 0);
  assert.equal(swarm.trackedOffers.length, 0);
  assert.equal(swarm.execution.tiktok.state, 'blocked_or_readiness_only');
  assert.equal(swarm.execution.creatorPartners.state, 'research_only');
  assert.equal(swarm.execution.creative.state, 'informational_drafts_only');
});


test('fully verified product requires independent supplier sale-ready declaration before promotion', () => {
  const now = Date.parse('2026-10-23T09:00:00.000Z');
  const candidate = {
    slug: 'garment-steamer',
    independentIdentityMatch: true,
    variantStockVerified: true,
    freightEstimateVerified: true,
    finalZipFreightVerified: true,
    mediaRightsVerified: true,
    checkoutInfrastructureVerified: true,
    checkoutAllowed: true,
    fulfillmentRouteVerified: true,
    automaticPromotionAllowed: true,
  };
  const review = { checkedAt: '2026-10-23T08:59:00.000Z', candidates: [candidate] };
  const blocked = buildRetailPromotionSwarm({ now, review: { ...review, saleReadyCount: 0 } });
  assert.equal(blocked.promotionEligibleCount, 0);
  assert.equal(blocked.trackedOffers.length, 0);
  assert.deepEqual(blocked.nearReady[0].missing.map(x => x.field), ['supplierSaleReadyCount']);

  const cleared = buildRetailPromotionSwarm({ now, review: { ...review, saleReadyCount: 1 } });
  assert.equal(cleared.promotionEligibleCount, 1);
  assert.equal(cleared.trackedOffers[0].directCheckoutEligible, true);
  assert.equal(cleared.trackedOffers[0].checkoutMode, 'buyer_zip_guarded_preflight');
  assert.equal(cleared.trackedOffers[0].storefrontUrl.startsWith('https://buy.stripe.com/'), false);
});

test('supplier-ready products and public TikTok site flags do not authorize retail publication', () => {
  const now = Date.parse('2026-10-23T18:00:00.000Z');
  const candidate = {
    slug: 'garment-steamer',
    independentIdentityMatch: true,
    variantStockVerified: true,
    freightEstimateVerified: true,
    finalZipFreightVerified: true,
    mediaRightsVerified: true,
    checkoutInfrastructureVerified: true,
    checkoutAllowed: true,
    fulfillmentRouteVerified: true,
    automaticPromotionAllowed: true,
  };
  const swarm = buildRetailPromotionSwarm({
    now,
    review: {
      checkedAt: '2026-10-23T17:59:00.000Z',
      saleReadyCount: 1,
      candidates: [candidate],
    },
    reports: {
      publisher: { result: {
        tiktokVerificationReady: true,
        checks: [
          { url: 'https://www.prismbayai.com/terms', ok: true, status: 200 },
          { url: 'https://www.prismbayai.com/privacy', ok: true, status: 200 },
          { url: 'https://www.prismbayai.com/tiktokio-test.txt', ok: true, status: 200 },
        ],
      } },
      'tiktok-public-post-evidence': { publicPostVerified: true },
    },
  });
  assert.equal(swarm.promotionEligibleCount, 1);
  assert.equal(swarm.execution.tiktok.siteVerificationReady, true);
  assert.equal(swarm.execution.tiktok.publicationAuthorized, false);
  assert.equal(swarm.execution.tiktok.state, 'blocked_or_readiness_only');
  assert.ok(swarm.execution.tiktok.missing.includes('authenticated_retail_tiktok_connection'));
  assert.ok(swarm.execution.tiktok.missing.includes('retail_video_publish_scope'));
  assert.ok(swarm.execution.tiktok.missing.includes('creative_rights_and_media_digest'));
  assert.ok(swarm.execution.tiktok.missing.includes('owner_publication_authorization'));
});

test('supplier sale-ready count never authorizes a candidate missing fulfillment evidence', () => {
  const now = Date.parse('2026-10-23T09:00:00.000Z');
  const candidate = {
    slug: 'garment-steamer', independentIdentityMatch: true, variantStockVerified: true,
    freightEstimateVerified: true, finalZipFreightVerified: true, mediaRightsVerified: true,
    checkoutInfrastructureVerified: true, checkoutAllowed: true,
    fulfillmentRouteVerified: false, automaticPromotionAllowed: true,
  };
  const swarm = buildRetailPromotionSwarm({ now, review: {
    checkedAt: '2026-10-23T08:59:00.000Z', saleReadyCount: 1, candidates: [candidate],
  } });
  assert.equal(swarm.promotionEligibleCount, 0);
  assert.deepEqual(swarm.nearReady[0].missing.map(x => x.field), ['fulfillmentRouteVerified']);
});

test('even a commercially ready unsupported product is not promoted until a verified preflight route exists', () => {
  const item = candidateReadiness({
    slug: 'unsupported-ready-product',
    independentIdentityMatch: true,
    variantStockVerified: true,
    freightEstimateVerified: true,
    finalZipFreightVerified: true,
    mediaRightsVerified: true,
    checkoutInfrastructureVerified: true,
    checkoutAllowed: true,
    fulfillmentRouteVerified: true,
    automaticPromotionAllowed: true,
  });
  assert.equal(item.directCheckoutEligible, true);
  assert.equal(item.promotionEligible, false);
  assert.deepEqual(item.missing.map(x => x.field), ['verifiedPreflightRoute']);
});

test('stale supplier evidence blocks every product', () => {
  const now = Date.parse('2026-10-11T12:00:00.000Z');
  const swarm = buildRetailPromotionSwarm({
    now,
    review: {
      checkedAt: '2026-10-09T00:00:00.000Z',
      saleReadyCount: 1,
      candidates: [{
        slug: 'garment-steamer',
        independentIdentityMatch: true,
        variantStockVerified: true,
        freightEstimateVerified: true,
        finalZipFreightVerified: true,
        mediaRightsVerified: true,
        checkoutInfrastructureVerified: true,
        checkoutAllowed: true,
        automaticPromotionAllowed: true,
      }],
    },
  });
  assert.equal(swarm.reviewFresh, false);
  assert.equal(swarm.promotionEligibleCount, 0);
  assert.equal(swarm.execution.supplierVerification.state, 'stale_or_missing');
});
