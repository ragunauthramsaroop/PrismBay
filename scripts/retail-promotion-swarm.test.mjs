import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRetailPromotionSwarm, candidateReadiness } from './retail-promotion-swarm.mjs';


// Legacy unit fixtures isolate candidate-level gates. Supply authenticated
// current-cycle transport metadata without changing individual gate values.
function buildSwarmWithAuthenticatedFixture(args) {
 const review = args.review;
 if (!review) return buildRetailPromotionSwarm(args);
 return buildRetailPromotionSwarm({...args, review: {
  schemaVersion: 3, authenticationVerified: true, ...review,
  candidates: Array.isArray(review.candidates)
   ? review.candidates.map(candidate => ({
     ...candidate, observedAt: candidate.observedAt ?? review.checkedAt
   }))
   : review.candidates
 }});
}

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
    'liveStoreProduct',
    'observedVariantSku',
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

  const swarm = buildSwarmWithAuthenticatedFixture({
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
    liveStoreProduct: true,
    observedVariantSku: 'CJYD245844002BY',
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
  const blocked = buildSwarmWithAuthenticatedFixture({ now, review: { ...review, saleReadyCount: 0 } });
  assert.equal(blocked.promotionEligibleCount, 0);
  assert.equal(blocked.trackedOffers.length, 0);
  assert.deepEqual(blocked.nearReady[0].missing.map(x => x.field), ['supplierSaleReadyCount']);

  const cleared = buildSwarmWithAuthenticatedFixture({ now, review: { ...review, saleReadyCount: 1 } });
  assert.equal(cleared.promotionEligibleCount, 1);
  assert.equal(cleared.trackedOffers[0].directCheckoutEligible, true);
  assert.equal(cleared.trackedOffers[0].checkoutMode, 'buyer_zip_guarded_preflight');
  assert.equal(cleared.trackedOffers[0].storefrontUrl.startsWith('https://buy.stripe.com/'), false);
});

test('supplier-ready products and public TikTok site flags do not authorize retail publication', () => {
  const now = Date.parse('2026-10-23T18:00:00.000Z');
  const candidate = {
    slug: 'garment-steamer',
    liveStoreProduct: true,
    observedVariantSku: 'CJYD245844002BY',
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
  const swarm = buildSwarmWithAuthenticatedFixture({
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
    slug: 'garment-steamer', liveStoreProduct: true, observedVariantSku: 'CJYD245844002BY', independentIdentityMatch: true, variantStockVerified: true,
    freightEstimateVerified: true, finalZipFreightVerified: true, mediaRightsVerified: true,
    checkoutInfrastructureVerified: true, checkoutAllowed: true,
    fulfillmentRouteVerified: false, automaticPromotionAllowed: true,
  };
  const swarm = buildSwarmWithAuthenticatedFixture({ now, review: {
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
  assert.equal(item.directCheckoutEligible, false);
  assert.equal(item.promotionEligible, false);
  assert.deepEqual(item.missing.map(x => x.field), ['liveStoreProduct', 'observedVariantSku', 'verifiedPreflightRoute']);
});

test('stale supplier evidence blocks every product', () => {
  const now = Date.parse('2026-10-11T12:00:00.000Z');
  const swarm = buildSwarmWithAuthenticatedFixture({
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

test('product-level supplier SKU or an unlisted variant never receives retail promotion clearance', () => {
  const now = Date.parse('2026-10-23T23:00:00.000Z');
  const complete = {
    slug: 'garment-steamer', liveStoreProduct: true, observedVariantSku: 'CJYD245844002BY',
    independentIdentityMatch: true, variantStockVerified: true, freightEstimateVerified: true,
    finalZipFreightVerified: true, mediaRightsVerified: true, checkoutInfrastructureVerified: true,
    checkoutAllowed: true, fulfillmentRouteVerified: true, automaticPromotionAllowed: true,
  };
  for (const candidate of [
    { ...complete, observedVariantSku: null, observedSupplierSku: 'CJYD2458440' },
    { ...complete, liveStoreProduct: false },
    { ...complete, observedVariantSku: '  ' },
  ]) {
    const swarm = buildSwarmWithAuthenticatedFixture({ now, review: {
      checkedAt: '2026-10-23T22:59:00.000Z', saleReadyCount: 1, candidates: [candidate],
    } });
    assert.equal(swarm.promotionEligibleCount, 0);
    assert.equal(swarm.trackedOffers.length, 0);
    assert.equal(swarm.nearReady[0].directCheckoutEligible, false);
  }
});

test('duplicate supplier variants and duplicate storefront identities fail closed', () => {
  const now = Date.parse('2026-10-23T23:00:00.000Z');
  const complete = {
    slug: 'garment-steamer', liveStoreProduct: true, observedVariantSku: 'CJYD245844002BY',
    independentIdentityMatch: true, variantStockVerified: true, freightEstimateVerified: true,
    finalZipFreightVerified: true, mediaRightsVerified: true, checkoutInfrastructureVerified: true,
    checkoutAllowed: true, fulfillmentRouteVerified: true, automaticPromotionAllowed: true,
  };
  const swarm = buildSwarmWithAuthenticatedFixture({ now, review: {
    checkedAt: '2026-10-23T22:59:00.000Z', saleReadyCount: 2, candidates: [complete, { ...complete }],
  } });
  assert.equal(swarm.promotionEligibleCount, 0);
  assert.equal(swarm.trackedOffers.length, 0);
  assert.ok(swarm.nearReady.every(item => item.missing.some(g => g.field === 'uniqueVariantSku')));
  assert.ok(swarm.nearReady.every(item => item.missing.some(g => g.field === 'uniqueProductSlug')));
});

test('prototype property names never resolve to a verified preflight route', () => {
  for (const slug of ['constructor', 'toString', '__proto__']) {
    const item = candidateReadiness({
      slug, liveStoreProduct: true, observedVariantSku: 'CJYD245844002BY',
      independentIdentityMatch: true, variantStockVerified: true,
      freightEstimateVerified: true, finalZipFreightVerified: true,
      mediaRightsVerified: true, checkoutInfrastructureVerified: true,
      checkoutAllowed: true, fulfillmentRouteVerified: true,
      automaticPromotionAllowed: true,
    });
    assert.equal(item.preflightUrl, null);
    assert.equal(item.promotionEligible, false);
    assert.ok(item.missing.some(g => g.field === 'verifiedPreflightRoute'));
  }
});

test('schema v3 retail promotion requires authenticated current-cycle supplier observations', () => {
  const now = Date.parse('2026-10-24T01:00:00.000Z');
  const checkedAt = '2026-10-24T00:59:00.000Z';
  const candidate = {
    slug: 'garment-steamer',
    liveStoreProduct: true,
    observedVariantSku: 'CJYD245844002BY',
    observedAt: checkedAt,
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
  const review = { schemaVersion: 3, checkedAt, authenticationVerified: true,
    saleReadyCount: 1, candidates: [candidate] };
  const current = buildRetailPromotionSwarm({ now, review });
  assert.equal(current.promotionEligibleCount, 1);

  for (const observedAt of ['2026-10-23T23:59:00.000Z', null, '2026-10-24T01:10:00.000Z']) {
    const stale = buildRetailPromotionSwarm({ now, review: {
      ...review, candidates: [{ ...candidate, observedAt }],
    } });
    assert.equal(stale.promotionEligibleCount, 0);
    assert.equal(stale.trackedOffers.length, 0);
    assert.equal(stale.nearReady[0].directCheckoutEligible, false);
    assert.ok(stale.nearReady[0].missing.some(g => g.field === 'currentSupplierObservation'));
  }

  const unauthenticated = buildRetailPromotionSwarm({ now, review: {
    ...review, authenticationVerified: false,
  } });
  assert.equal(unauthenticated.promotionEligibleCount, 0);
  assert.equal(unauthenticated.trackedOffers.length, 0);
  assert.ok(unauthenticated.nearReady[0].missing.some(g => g.field === 'supplierAuthenticationVerified'));
});


test('legacy supplier reviews never release products for promotion or direct checkout',()=>{
 const now=Date.parse('2026-10-24T01:00:00.000Z');
 const checkedAt='2026-10-24T00:59:00.000Z';
 const candidate={
  slug:'garment-steamer',liveStoreProduct:true,observedVariantSku:'CJYD245844002BY',
  observedAt:checkedAt,independentIdentityMatch:true,variantStockVerified:true,
  freightEstimateVerified:true,finalZipFreightVerified:true,mediaRightsVerified:true,
  checkoutInfrastructureVerified:true,checkoutAllowed:true,
  fulfillmentRouteVerified:true,automaticPromotionAllowed:true
 };
 const current={schemaVersion:3,checkedAt,authenticationVerified:true,
  saleReadyCount:1,candidates:[candidate]};
 assert.equal(buildRetailPromotionSwarm({now,review:current}).promotionEligibleCount,1);
 for(const schemaVersion of [undefined,1,2,'3',null]){
  const blocked=buildRetailPromotionSwarm({now,review:{...current,schemaVersion}});
  assert.equal(blocked.promotionEligibleCount,0);
  assert.equal(blocked.trackedOffers.length,0);
  assert.ok(blocked.nearReady[0].missing.some(g=>g.field==='supplierEvidenceSchema'));
 }
 const unauthenticated=buildRetailPromotionSwarm({now,review:{...current,authenticationVerified:false}});
 assert.equal(unauthenticated.promotionEligibleCount,0);
 assert.ok(unauthenticated.nearReady[0].missing.some(g=>g.field==='supplierAuthenticationVerified'));
});
