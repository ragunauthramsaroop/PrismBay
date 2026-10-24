import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildTikTokRetailReadiness } from './tiktok-retail-readiness.mjs';

const PREFLIGHT_ROUTES = Object.freeze({
  'garment-steamer': 'https://browser-worker-production-f5b4.up.railway.app/garment-steamer/',
});

const REQUIRED_PREFLIGHT_PROMOTION_GATES = [
  ['independentIdentityMatch', 'independent product identity'],
  ['variantStockVerified', 'exact variant stock'],
  ['freightEstimateVerified', 'supplier freight estimate'],
  ['finalZipFreightVerified', 'final destination ZIP freight'],
  ['mediaRightsVerified', 'product media rights'],
  ['checkoutInfrastructureVerified', 'guarded checkout infrastructure'],
  ['checkoutAllowed', 'live checkout approval'],
  ['fulfillmentRouteVerified', 'verified supplier fulfillment route'],
  ['automaticPromotionAllowed', 'promotion approval'],
];

const REQUIRED_DIRECT_CHECKOUT_GATES = REQUIRED_PREFLIGHT_PROMOTION_GATES;

function missingFor(candidate, gates) {
  return gates
    .filter(([field]) => candidate[field] !== true)
    .map(([field, label]) => ({ field, label }));
}

export function candidateReadiness(candidate = {}) {
  // Only explicit, owned route mappings qualify; inherited object keys such
  // as "constructor" or "__proto__" must never become preflight URLs.
  const preflightUrl = typeof candidate.slug === 'string' && Object.hasOwn(PREFLIGHT_ROUTES, candidate.slug)
    ? PREFLIGHT_ROUTES[candidate.slug] : null;
  const missingPreflight = missingFor(candidate, REQUIRED_PREFLIGHT_PROMOTION_GATES);
  const missingDirectCheckout = missingFor(candidate, REQUIRED_DIRECT_CHECKOUT_GATES);
  // Boolean stock and identity flags do not establish an exact variant SKU
  // or an independently recognized live-store product.
  const variantSku = typeof candidate.observedVariantSku === 'string'
    ? candidate.observedVariantSku.trim() : '';
  const identityMissing = [];
  if (candidate.liveStoreProduct !== true) {
    identityMissing.push({ field: 'liveStoreProduct', label: 'verified live-store product identity' });
  }
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(variantSku)) {
    identityMissing.push({ field: 'observedVariantSku', label: 'exact verified supplier variant SKU' });
  }
  missingPreflight.push(...identityMissing);
  missingDirectCheckout.push(...identityMissing);
  if (!preflightUrl) missingPreflight.push({ field: 'verifiedPreflightRoute', label: 'verified preflight route' });
  const preflightTotal = REQUIRED_PREFLIGHT_PROMOTION_GATES.length + 3;
  const directTotal = REQUIRED_DIRECT_CHECKOUT_GATES.length + 2;
  const passed = preflightTotal - missingPreflight.length;
  const directPassed = directTotal - missingDirectCheckout.length;
  return {
    slug: candidate.slug || null,
    candidate: candidate.candidate || null,
    sku: variantSku || candidate.observedSupplierSku || null,
    variantSku: variantSku || null,
    liveStoreProduct: candidate.liveStoreProduct === true,
    status: candidate.status || 'unknown',
    observedAt: typeof candidate.observedAt === 'string' ? candidate.observedAt : null,
    passedGates: passed,
    totalGates: preflightTotal,
    readinessPct: Math.round((passed / preflightTotal) * 100),
    directCheckoutReadinessPct: Math.round((directPassed / directTotal) * 100),
    missing: missingPreflight,
    missingPreflight,
    missingDirectCheckout,
    promotionEligible: missingPreflight.length === 0,
    directCheckoutEligible: missingDirectCheckout.length === 0,
    preflightUrl,
  };
}

export function buildRetailPromotionSwarm({ review, workerBoard = null, reports = {}, now = Date.now() }) {
  const checkedAt = review?.checkedAt || null;
  const reviewAgeHours = checkedAt ? (now - Date.parse(checkedAt)) / 36e5 : null;
  const reviewFresh = Number.isFinite(reviewAgeHours) && reviewAgeHours >= 0 && reviewAgeHours < 30;
  const rawCandidates = reviewFresh && Array.isArray(review?.candidates) ? review.candidates : [];
  // An individual candidate's flags do not override the supplier board's sale-ready declaration.
  // Preserve a strict cap when supplier evidence declares fewer approved products than candidates.
  const declaredSaleReadyCount = Number.isSafeInteger(review?.saleReadyCount) && review.saleReadyCount > 0
    ? review.saleReadyCount : 0;
  let remainingSupplierApprovals = declaredSaleReadyCount;
  // Reject all occurrences of ambiguous product/variant identities.
  const variantCounts = new Map();
  const slugCounts = new Map();
  for (const candidate of rawCandidates) {
    const variant = typeof candidate?.observedVariantSku === 'string' ? candidate.observedVariantSku.trim() : '';
    const slug = typeof candidate?.slug === 'string' ? candidate.slug.trim() : '';
    if (variant) variantCounts.set(variant, (variantCounts.get(variant) || 0) + 1);
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }
  const readiness = rawCandidates.map(candidateReadiness).sort((a, b) => {
    if (b.passedGates !== a.passedGates) return b.passedGates - a.passedGates;
    if (a.liveStoreProduct !== b.liveStoreProduct) return a.liveStoreProduct ? -1 : 1;
    return String(a.slug).localeCompare(String(b.slug));
  }).map(item => {
    // A newly generated board must not reauthorize a carried-forward supplier
    // observation or a report lacking authenticated supplier evidence.
    // Schema v3 supplies per-candidate observedAt and authenticationVerified.
    const evidenceGaps = [];
    if (review?.schemaVersion >= 3) {
      if (review.authenticationVerified !== true) {
        evidenceGaps.push({ field: 'supplierAuthenticationVerified', label: 'authenticated current supplier review' });
      }
      if (item.observedAt !== checkedAt) {
        evidenceGaps.push({ field: 'currentSupplierObservation', label: 'supplier observation from current verification cycle' });
      }
    }
    const duplicates = [];
    if (item.variantSku && variantCounts.get(item.variantSku) > 1) {
      duplicates.push({ field: 'uniqueVariantSku', label: 'unambiguous supplier variant identity' });
    }
    if (item.slug && slugCounts.get(item.slug) > 1) {
      duplicates.push({ field: 'uniqueProductSlug', label: 'unambiguous live-store product identity' });
    }
    const disqualifiers = [...evidenceGaps, ...duplicates];
    if (disqualifiers.length) {
      return {
        ...item,
        promotionEligible: false,
        directCheckoutEligible: false,
        missing: [...item.missing, ...disqualifiers],
        missingPreflight: [...item.missingPreflight, ...disqualifiers],
        missingDirectCheckout: [...item.missingDirectCheckout, ...disqualifiers],
      };
    }
    if (!item.promotionEligible) return item;
    if (remainingSupplierApprovals > 0) {
      remainingSupplierApprovals -= 1;
      return item;
    }
    const gate = { field: 'supplierSaleReadyCount', label: 'independent supplier sale-ready approval' };
    return {
      ...item,
      promotionEligible: false,
      directCheckoutEligible: false,
      missing: [...item.missing, gate],
      missingPreflight: [...item.missingPreflight, gate],
      missingDirectCheckout: [...item.missingDirectCheckout, gate],
    };
  });
  const eligible = readiness.filter(item => item.promotionEligible);
  const nearReady = readiness.filter(item => !item.promotionEligible).slice(0, 3);
  const activeStorefront = reports['storefront-cro-auditor']?.result?.activeStorefront || null;
  const publisher = reports.publisher?.result || null;
  const analytics = reports['analytics-reviewer']?.result || null;
  // Site verification and supplier eligibility do not prove account connection,
  // video.publish scope, creative rights or owner consent. Reuse the dedicated
  // TikTok readiness evaluator rather than inferring publication clearance.
  const tiktokReadiness = buildTikTokRetailReadiness({
    publisher: reports.publisher,
    supplierReview: review,
    publicPost: reports['tiktok-public-post-evidence'],
  });

  const execution = {
    supplierVerification: {
      state: reviewFresh ? (eligible.length ? 'guarded_preflight_products_available' : 'blockers_active') : 'stale_or_missing',
      checkedAt,
      next: reviewFresh
        ? nearReady.map(item => ({ slug: item.slug, sku: item.sku, missing: item.missing.map(x => x.field) }))
        : [{ action: 'Run PrismBay CJ Supplier Verification before any product promotion.' }],
    },
    creative: {
      state: eligible.length ? 'guarded_preflight_promotion_allowed_for_eligible_only' : 'informational_drafts_only',
      products: eligible.map(item => item.slug),
      rule: 'Promote only the guarded availability page. Use original or supplier-authorized media and evidence-backed product claims only.',
    },
    creatorPartners: {
      state: eligible.length ? 'qualified_shortlist_ready_for_owner_approved_contact' : 'research_only',
      products: eligible.map(item => item.slug),
      rule: 'No bulk messages, fake engagement, paid-upfront promises, or implied relationships. Send traffic only to the guarded preflight page.',
    },
    ownedSearch: {
      state: eligible.length ? 'guarded_preflight_pages_allowed_for_eligible_only' : 'informational_only',
      products: eligible.map(item => item.slug),
      rule: 'Do not expose a direct Stripe URL. Buyer-specific stock, destination freight and economics are checked before checkout release.',
    },
    storefront: {
      state: activeStorefront?.status === 200 ? 'reachable' : 'needs_review',
      url: activeStorefront?.finalUrl || activeStorefront?.target || null,
      ctaCount: activeStorefront?.ctaCount ?? null,
      hasProductSchema: activeStorefront?.hasProductSchema ?? null,
    },
    tiktok: {
      state: eligible.length && tiktokReadiness.readyForPublicRetailPublishing === true
        ? 'approval_gated_preflight_publication_path_ready' : 'blocked_or_readiness_only',
      siteVerificationReady: publisher?.tiktokVerificationReady === true,
      publicationAuthorized: tiktokReadiness.readyForPublicRetailPublishing === true,
      missing: tiktokReadiness.missing,
      products: eligible.map(item => item.slug),
      rule: 'Keep consent, media-digest, rights, OWNER_AUTHORIZED and video.publish gates. Retail posts must land on the guarded preflight page, never direct Stripe. Do not use the educational YouTube channel for retail.',
    },
    analytics: {
      state: analytics?.live ? 'control_plane_reachable' : 'needs_review',
      rule: 'Treat only verified non-test paid orders as sales. Availability checks, views, health checks and generated assets are not revenue.',
    },
  };

  const trackedOffers = eligible.map(item => ({
    slug: item.slug,
    sku: item.sku,
    storefrontUrl: `${item.preflightUrl}?utm_source=retail_swarm&utm_medium=organic&utm_campaign=verified_${encodeURIComponent(item.slug)}`,
    checkoutMode: 'buyer_zip_guarded_preflight',
    directCheckoutEligible: item.directCheckoutEligible,
    allowedChannels: ['owned-search', 'owner-approved-creator', 'approval-gated-short-form'],
  }));

  return {
    schemaVersion: 2,
    generatedAt: new Date(now).toISOString(),
    objective: 'First verified non-test paid PrismBay Clean order through buyer-specific live stock, ZIP freight and checkout verification.',
    reviewFresh,
    saleReadyCount: declaredSaleReadyCount,
    promotionEligibleCount: eligible.length,
    promotionEligible: eligible,
    nearReady,
    trackedOffers,
    execution,
    existingWorkerCount: Array.isArray(workerBoard?.tasks) ? workerBoard.tasks.length : 0,
    safeguards: {
      unverifiedProductPromotion: false,
      directStripePromotion: false,
      buyerSpecificFreightBypass: false,
      automaticSocialPosting: false,
      bulkCreatorOutreach: false,
      paidSpend: false,
      fakeEngagement: false,
      educationalYouTubeRetailUse: false,
    },
  };
}

async function readOptional(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

export async function main() {
  const review = await readOptional('growth-reports/cj-worker-review.json');
  const workerBoard = await readOptional('growth-reports/dropshipping-worker-board.json');
  const reports = {};
  for (const name of ['storefront-cro-auditor', 'publisher', 'analytics-reviewer', 'tiktok-public-post-evidence']) {
    reports[name] = await readOptional(`growth-reports/${name}.json`);
  }
  const swarm = buildRetailPromotionSwarm({ review, workerBoard, reports });
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/retail-promotion-swarm.json', JSON.stringify(swarm, null, 2) + '\n');
  console.log(JSON.stringify({
    objective: swarm.objective,
    promotionEligibleCount: swarm.promotionEligibleCount,
    trackedOffers: swarm.trackedOffers.map(item => ({ slug: item.slug, checkoutMode: item.checkoutMode, directCheckoutEligible: item.directCheckoutEligible })),
    nearReady: swarm.nearReady.map(item => ({ slug: item.slug, readinessPct: item.readinessPct, missing: item.missing.map(x => x.field) })),
    tiktok: swarm.execution.tiktok.state,
  }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '',
      '## PrismBay Clean retail promotion swarm',
      '',
      `Guarded-preflight promotion eligible products: ${swarm.promotionEligibleCount}`,
      `Supplier review fresh: ${swarm.reviewFresh}`,
      '',
      ...swarm.trackedOffers.map(item => `- ${item.slug}: guarded buyer-ZIP preflight route. Direct checkout eligible before buyer ZIP: ${item.directCheckoutEligible}`),
      ...swarm.nearReady.map(item => `- ${item.candidate || item.slug}: ${item.readinessPct}% preflight-promotion gates passed. Missing: ${item.missing.map(x => x.label).join(', ')}`),
      '',
      'Promotion points to a fail-closed preflight page. Direct Stripe promotion remains prohibited and payment stays blocked until live buyer-specific verification passes.',
      '',
    ];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
  return swarm;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
