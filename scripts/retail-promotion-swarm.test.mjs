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
    'mediaRightsVerified',
    'checkoutInfrastructureVerified',
    'automaticPromotionAllowed',
    'verifiedPreflightRoute',
  ]);
});

test('garment steamer can be promoted to guarded preflight without pre-known buyer ZIP or direct checkout release', () => {
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
  assert.equal(item.promotionEligible, true);
  assert.equal(item.directCheckoutEligible, false);
  assert.equal(item.missing.length, 0);
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
  assert.equal(swarm.promotionEligibleCount, 1);
  assert.equal(swarm.trackedOffers.length, 1);
  assert.equal(swarm.trackedOffers[0].checkoutMode, 'buyer_zip_guarded_preflight');
  assert.equal(swarm.trackedOffers[0].directCheckoutEligible, false);
  assert.equal(swarm.trackedOffers[0].storefrontUrl.startsWith('https://buy.stripe.com/'), false);
  assert.equal(swarm.execution.tiktok.state, 'approval_gated_preflight_publication_path_ready');
  assert.equal(swarm.execution.creatorPartners.state, 'qualified_shortlist_ready_for_owner_approved_contact');
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
