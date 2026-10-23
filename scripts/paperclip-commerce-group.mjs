import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

const GATE_OWNERS = Object.freeze({
  independentIdentityMatch: 'supplier-fulfillment',
  variantStockVerified: 'supplier-fulfillment',
  freightEstimateVerified: 'supplier-fulfillment',
  finalZipFreightVerified: 'supplier-fulfillment',
  final_zip_freight: 'supplier-fulfillment',
  mediaRightsVerified: 'creative-studio',
  media_rights: 'creative-studio',
  checkoutInfrastructureVerified: 'storefront-conversion',
  checkout_infrastructure: 'storefront-conversion',
  fulfillmentRouteVerified: 'supplier-fulfillment',
  fulfillment_route: 'supplier-fulfillment',
  checkoutAllowed: 'storefront-conversion',
  checkout: 'storefront-conversion',
  automaticPromotionAllowed: 'commerce-control',
  promotion_authorization: 'commerce-control',
});

export function validateOrganization(manifest) {
  if (!manifest || !Array.isArray(manifest.companies)) throw new Error('commerce group manifest missing companies');
  const ids = manifest.companies.map(c => c.id);
  if (manifest.companies.length !== 10 || new Set(ids).size !== 10) throw new Error('PrismBay Commerce Group must contain exactly ten unique specialist companies');
  if (!manifest.masterExecutionPrompt) throw new Error('commerce group manifest missing master execution prompt');
  for (const company of manifest.companies) {
    for (const field of ['id','name','funnelStage','mission','primaryKpi']) if (!company[field]) throw new Error(`company ${company.id || 'unknown'} missing ${field}`);
  }
  for (const rule of ['verifiedPurchasesOnlyCountAsRevenue','dashboardOnlyFromVerifiedEvidence','blockerCreatesAlternativeTask','parallelExecutionRequired','neverIdleWholeSystemForOneDependency','firstSaleWarRoomUntilVerifiedSale']) {
    if (manifest.rules?.[rule] !== true) throw new Error(`commerce group rule ${rule} must remain enabled`);
  }
  return true;
}

const REQUIRED_PHYSICAL_PROMOTION_GATES = Object.freeze([
  'independentIdentityMatch', 'variantStockVerified', 'freightEstimateVerified',
  'finalZipFreightVerified', 'mediaRightsVerified', 'checkoutInfrastructureVerified',
  'checkoutAllowed', 'fulfillmentRouteVerified', 'automaticPromotionAllowed',
]);

function isCommerciallyCleared(candidate) {
  return REQUIRED_PHYSICAL_PROMOTION_GATES.every(key => candidate?.[key] === true);
}

// Aggregate counters are not SKU-level authorization. Require matching exact
// variants in both independent supplier and retail promotion reports, and
// reject ambiguous duplicate slugs before any external acquisition route.
function verifiedPromotionReadyCandidates(supplier, promotion) {
  const supplierCount = supplier?.saleReadyCount;
  const promotionCount = promotion?.promotionEligibleCount;
  if (!Number.isSafeInteger(supplierCount) || supplierCount < 1 ||
      !Number.isSafeInteger(promotionCount) || promotionCount < 1) return [];
  const candidates = Array.isArray(supplier?.candidates) ? supplier.candidates : [];
  const retail = Array.isArray(promotion?.promotionEligible) ? promotion.promotionEligible : [];
  const approvedRetail = new Map();
  for (const item of retail) {
    if (item?.promotionEligible !== true || item?.directCheckoutEligible !== true ||
        typeof item.slug !== 'string' || !item.slug ||
        typeof item.sku !== 'string' || !item.sku) continue;
    // A duplicate entry invalidates the slug, even if both entries agree.
    approvedRetail.set(item.slug, approvedRetail.has(item.slug) ? null : item.sku);
  }
  const supplierSlugCounts = new Map();
  for (const candidate of candidates) {
    if (typeof candidate?.slug === 'string')
      supplierSlugCounts.set(candidate.slug, (supplierSlugCounts.get(candidate.slug) || 0) + 1);
  }
  const matched = candidates.filter(candidate =>
    isCommerciallyCleared(candidate) &&
    supplierSlugCounts.get(candidate.slug) === 1 &&
    typeof candidate.observedVariantSku === 'string' &&
    candidate.observedVariantSku.length > 0 &&
    approvedRetail.get(candidate.slug) === candidate.observedVariantSku
  );
  return matched.slice(0, Math.min(supplierCount, promotionCount));
}

export function verifiedPromotionReadyCount(supplier, promotion) {
  return verifiedPromotionReadyCandidates(supplier, promotion).length;
}

function nearestCommercialCandidate(supplier) {
  const candidates = Array.isArray(supplier?.candidates) ? supplier.candidates : [];
  return candidates
    .filter(c => c.independentIdentityMatch === true)
    .sort((a,b) => {
      const score = c => [c.variantStockVerified,c.freightEstimateVerified,c.finalZipFreightVerified,c.mediaRightsVerified,c.checkoutInfrastructureVerified,c.checkoutAllowed,c.fulfillmentRouteVerified,c.automaticPromotionAllowed].filter(Boolean).length;
      return score(b) - score(a) || Number(b.liveStoreProduct === true) - Number(a.liveStoreProduct === true);
    })[0] || null;
}

export function selectBottleneck({firstSale, promotion, supplier, storefront, tiktok, opportunities}) {
  if (storefront?.result?.activeStorefront?.status && storefront.result.activeStorefront.status !== 200) {
    return {stage:'storefront_readiness', owner:'storefront-conversion', reason:'live_storefront_unavailable'};
  }
  if (firstSale?.verifiedFirstSale === true) {
    return {stage:'measurement', owner:'revenue-analytics', reason:'verified_sale_exists_measure_margin_and_repeatability'};
  }
  const approved = verifiedPromotionReadyCount(supplier, promotion);
  if (approved > 0 && tiktok?.readyForPublicRetailPublishing !== true) {
    return {stage:'traffic_generation', owner:'organic-growth', reason:'sale_ready_product_exists_but_public_distribution_not_ready'};
  }
  const nearCommercial = nearestCommercialCandidate(supplier);
  if (nearCommercial?.variantStockVerified === true && nearCommercial?.freightEstimateVerified === true) {
    const missing = [];
    if (!nearCommercial.finalZipFreightVerified) missing.push('final_zip_freight');
    if (!nearCommercial.mediaRightsVerified) missing.push('media_rights');
    if (!nearCommercial.checkoutInfrastructureVerified) missing.push('checkout_infrastructure');
    if (!nearCommercial.checkoutAllowed) missing.push('checkout');
    if (!nearCommercial.fulfillmentRouteVerified) missing.push('fulfillment_route');
    if (!nearCommercial.automaticPromotionAllowed) missing.push('promotion_authorization');
    return {stage:'supplier_verification', owner:'supplier-fulfillment', reason:'nearest_product_has_unclosed_commercial_gates', product:nearCommercial.slug, missing};
  }
  if ((opportunities?.sourcingQueue || []).length > 0) {
    return {stage:'supplier_verification', owner:'supplier-fulfillment', reason:'high_scoring_research_candidates_require_supplier_and_economics_validation'};
  }
  return {stage:'product_discovery', owner:'product-intelligence', reason:'no_verified_commercial_candidate_available'};
}

function listSupplierStates(supplier, promotion) {
  const candidates = Array.isArray(supplier?.candidates) ? supplier.candidates : [];
  // A candidate is not approved merely because local flags are set.
  // Both independent supplier and retail promotion counts must agree.
  const approved = verifiedPromotionReadyCandidates(supplier, promotion);
  const approvedSlugs = new Set(approved.map(c => c.slug));
  return {
    awaitingSupplierVerification: candidates.filter(c => c.independentIdentityMatch !== true || c.variantStockVerified !== true || c.freightEstimateVerified !== true).map(c => c.slug).filter(Boolean),
    awaitingCommercialGateClosure: candidates.filter(c => c.independentIdentityMatch === true && c.variantStockVerified === true && c.freightEstimateVerified === true && !approvedSlugs.has(c.slug)).map(c => c.slug).filter(Boolean),
    approvedForPromotion: approved.map(c => c.slug).filter(Boolean),
    removedFromPromotion: candidates.filter(c => c.status === 'identity_rejected').map(c => c.slug).filter(Boolean),
  };
}

function nextBestCandidate({closestProduct, opportunities, supplier}) {
  const queued = (opportunities?.sourcingQueue || []).map(x => x.slug).filter(Boolean);
  const candidate = queued.find(slug => slug !== closestProduct);
  if (candidate) return candidate;
  const supplierCandidates = (supplier?.candidates || [])
    .filter(c => c.slug && c.slug !== closestProduct && c.independentIdentityMatch === true)
    .sort((a,b) => Number(b.variantStockVerified) - Number(a.variantStockVerified) || Number(b.freightEstimateVerified) - Number(a.freightEstimateVerified));
  return supplierCandidates[0]?.slug || null;
}

function task({objective, owner, commercialReason, requiredEvidence = [], dependency = null, fallbackRoute, successMetric, stopCondition, nextAction, state = 'active_internal'}) {
  return {objective, owner, commercialReason, requiredEvidence, dependency, fallbackRoute, successMetric, stopCondition, nextAction, state};
}

export function buildFirstSaleWarRoom({bottleneck, supplier, promotion, storefront, tiktok, opportunities, firstSale}) {
  if (firstSale?.verifiedFirstSale === true) return null;
  const nearest = nearestCommercialCandidate(supplier);
  const closestProduct = bottleneck?.product || nearest?.slug || opportunities?.sourcingQueue?.[0]?.slug || null;
  const remainingGates = Array.isArray(bottleneck?.missing) ? bottleneck.missing : [];
  const gateOwners = remainingGates.map(gate => ({gate, owner:GATE_OWNERS[gate] || bottleneck?.owner || 'commerce-control'}));
  const nextBest = nextBestCandidate({closestProduct,opportunities,supplier});
  const promotionReady = verifiedPromotionReadyCount(supplier, promotion);
  const storefrontReachable = storefront?.result?.activeStorefront?.status === 200;
  const closestRecord = (supplier?.candidates || []).find(c => c.slug === closestProduct) || nearest;
  const checkoutReadiness = closestRecord?.checkoutAllowed === true
    ? 'released'
    : closestRecord?.checkoutInfrastructureVerified === true
      ? 'infrastructure_verified_waiting_remaining_commercial_gates'
      : 'not_verified';
  const alternativePaths = [
    nextBest ? `verify_backup_candidate:${nextBest}` : 'continue_global_product_discovery',
    'prepare_storefront_and_checkout_without_releasing_blocked_product',
    'prepare_original_rights_safe_creative_as_draft_only',
    'continue_zero_cost_channel_research_without_unverified_product_promotion',
  ];
  return {
    state:'first_sale_war_room',
    closestProduct,
    remainingGates,
    gateOwners,
    workActivelyRunning:[
      'commercial_bottleneck_control_loop',
      'global_product_opportunity_refresh',
      'revenue_evidence_refresh',
    ],
    parallelWorkRequired:[
      nextBest ? `supplier_verification:${nextBest}` : 'product_discovery:new_candidate',
      'storefront_conversion:preflight_checkout_and_disclosures',
      'creative_studio:truthful_original_draft_angles',
      'product_intelligence:continuous_product_search',
    ],
    alternativePathsInProgress:alternativePaths,
    nextBestProduct:nextBest,
    trafficSourceReadyToActivate:promotionReady > 0 ? 'approved_zero_cost_organic_channels' : null,
    storefrontReadiness:storefrontReachable ? 'reachable_http_200' : 'needs_repair_or_fresh_evidence',
    checkoutReadiness,
    strongestAuthorizedAction: bottleneck?.stage === 'supplier_verification' && closestProduct
      ? `close_material_supplier_and_checkout_gates_for:${closestProduct}`
      : bottleneck?.reason || 'advance_highest_value_verified_commercial_task',
  };
}

function buildPriorityTasks({bottleneck, warRoom, opportunities}) {
  const tasks = [];
  const closest = warRoom?.closestProduct || bottleneck?.product || null;
  const nextBest = warRoom?.nextBestProduct || opportunities?.sourcingQueue?.[0]?.slug || null;
  if (bottleneck?.stage === 'supplier_verification') {
    tasks.push(task({
      objective:`Close material commercial gates for ${closest || 'highest-ranked candidate'}`,
      owner:'supplier-fulfillment',
      commercialReason:'A product must become genuinely promotion-ready before qualified traffic can convert into a valid sale.',
      requiredEvidence:['exact product identity','exact SKU and variant','target-market inventory','supported destination freight','delivery estimate','product cost','landed cost','margin','supplier listing status'],
      dependency:closest || 'highest-ranked supplier candidate',
      fallbackRoute:nextBest ? `If a material gate fails, preserve evidence and promote ${nextBest} into primary verification.` : 'If a material gate fails, advance the strongest newly discovered candidate.',
      successMetric:'one product passes supplier, freight, margin and fulfillment verification without weakened standards',
      stopCondition:'material supplier evidence fails or product reaches commercial gate closure',
      nextAction:closest ? `resolve remaining verified gates for ${closest}` : 'run supplier validation on top research candidate'
    }));
  }
  if (nextBest) {
    tasks.push(task({
      objective:`Verify backup product ${nextBest} in parallel`,
      owner:'supplier-fulfillment',
      commercialReason:'A blocked primary product must not freeze the first-sale pipeline.',
      requiredEvidence:['supplier identity','variant stock','product cost','freight screening','delivery estimate'],
      dependency:'authenticated supplier data',
      fallbackRoute:'advance the next research candidate if supplier or economics evidence fails',
      successMetric:'backup candidate reaches a clear pass or reject decision',
      stopCondition:'candidate is rejected with evidence or advances to commercial gate closure',
      nextAction:`source and verify ${nextBest}`
    }));
  }
  tasks.push(task({
    objective:'Prepare storefront and checkout path without releasing blocked products',
    owner:'storefront-conversion',
    commercialReason:'Supplier approval should not create a second avoidable delay before a customer can purchase.',
    requiredEvidence:['storefront HTTP health','correct price/currency configuration','shipping disclosure','refund disclosure','fulfillment mapping','confirmation and order-capture path'],
    dependency:'no live checkout release until product verification passes',
    fallbackRoute:'repair the existing storefront and payment mapping before creating replacement infrastructure',
    successMetric:'storefront preflight passes and checkout infrastructure is ready for a verified SKU',
    stopCondition:'preflight passes or a concrete defect is assigned for repair',
    nextAction:'run non-purchasing checkout and disclosure preflight'
  }));
  tasks.push(task({
    objective:'Prepare truthful original creative drafts for likely-to-clear candidates',
    owner:'creative-studio',
    commercialReason:'Rights-safe creative should be ready when a product becomes promotion-ready.',
    requiredEvidence:['original media or documented rights','evidence-backed claims','product identity'],
    dependency:'draft-only until product becomes promotion-ready',
    fallbackRoute:'use original typography, diagrams and product-neutral problem/solution concepts if supplier media rights remain unavailable',
    successMetric:'multiple rights-safe draft angles ready without unsupported claims',
    stopCondition:'draft package ready or product is rejected',
    nextAction:'prepare problem-solution, demonstration, FAQ and objection-handling drafts'
  }));
  tasks.push(task({
    objective:'Continue searching for stronger product candidates',
    owner:'product-intelligence',
    commercialReason:'The portfolio must not depend on one product and trend velocity changes quickly.',
    requiredEvidence:['current demand signals','shipping profile','competitive pricing','supplier discoverability','return and breakage risk'],
    dependency:null,
    fallbackRoute:'broaden category and marketplace research while staying within low-regulation product classes',
    successMetric:'new evidence-backed candidates enter supplier verification or weak candidates are rejected',
    stopCondition:'continuous routine; re-rank each cycle',
    nextAction:'refresh current global opportunity signals and compare against the existing queue'
  }));
  return tasks;
}

export function buildDashboard({manifest, opportunities, supplier, promotion, storefront, tiktok, firstSale, revenueBoard}) {
  validateOrganization(manifest);
  const bottleneck = selectBottleneck({firstSale,promotion,supplier,storefront,tiktok,opportunities});
  const supplierStates = listSupplierStates(supplier, promotion);
  const verifiedSales = Number.isFinite(Number(firstSale?.verifiedSaleCount)) ? Number(firstSale.verifiedSaleCount) : (firstSale?.verifiedFirstSale === true ? 1 : 0);
  const verifiedRevenueUsd = verifiedSales > 0 && Number.isFinite(Number(firstSale?.grossRevenueUsd)) ? Number(firstSale.grossRevenueUsd) : 0;
  const known = value => value === undefined || value === null ? null : value;
  const promotionEligibleCount = verifiedPromotionReadyCount(supplier, promotion);
  const warRoom = buildFirstSaleWarRoom({bottleneck,supplier,promotion,storefront,tiktok,opportunities,firstSale});
  const priorityTasks = buildPriorityTasks({bottleneck,warRoom,opportunities});
  const externalApprovals = [];
  if (promotionEligibleCount > 0 && tiktok?.publicPostVerified !== true) externalApprovals.push('owner_approval_for_external_retail_publication_if_required_by_repository_controls');
  const blockedActions = [];
  if (bottleneck?.product && bottleneck?.missing?.length) blockedActions.push({action:`promote_or_release:${bottleneck.product}`,reason:`missing:${bottleneck.missing.join(',')}`,alternative:warRoom?.alternativePathsInProgress || []});
  if (tiktok?.siteVerificationReady === false) blockedActions.push({action:'tiktok_publication_readiness',reason:'site_verification_not_live',alternative:['continue_authorized_hosting_and_verification-file_deployment_investigation','continue_other_zero_cost_channels_and_internal_preparation']});
  const companyQueue = manifest.companies.map(company => ({
    companyId: company.id,
    company: company.name,
    funnelStage: company.funnelStage,
    primaryKpi: company.primaryKpi,
    status: company.id === bottleneck.owner ? 'priority' : 'parallel_support',
    currentAction: company.id === bottleneck.owner ? bottleneck.reason : priorityTasks.find(t => t.owner === company.id)?.nextAction || null,
  }));

  return {
    schemaVersion:2,
    generatedAt:new Date().toISOString(),
    organization:manifest.parent,
    objective:manifest.objective,
    masterExecutionPrompt:manifest.masterExecutionPrompt,
    scoreboard:{
      verifiedSales,
      verifiedRevenueUsd,
      promotionReadyProducts:promotionEligibleCount,
      productsUnderVerification:[...new Set([...supplierStates.awaitingSupplierVerification,...supplierStates.awaitingCommercialGateClosure])],
      productsRejected:supplierStates.removedFromPromotion,
      productsActivelyPromoted:promotionEligibleCount === 0 ? [] : known(revenueBoard?.productsActivelyPromoted),
      qualifiedExternalVisitors:known(revenueBoard?.qualifiedExternalVisitors ?? revenueBoard?.storeSessions),
      addToCartEvents:known(revenueBoard?.addToCartEvents),
      checkoutInitiations:known(revenueBoard?.checkoutInitiations),
      completedPaidOrders:verifiedSales,
      conversionRate:known(revenueBoard?.conversionRate),
      averageOrderValueUsd:verifiedSales > 0 ? known(firstSale?.grossRevenueUsd) : null,
      grossMarginUsd:known(firstSale?.grossMarginUsd),
      contributionMarginUsd:known(firstSale?.netMarginUsd ?? firstSale?.contributionMarginUsd),
      refunds:known(firstSale?.refundCount),
      fulfillmentFailures:known(revenueBoard?.fulfillmentFailures),
      bestPerformingProduct:known(revenueBoard?.topProduct),
      bestPerformingChannel:known(revenueBoard?.topTrafficSource),
      bestPerformingCreative:known(revenueBoard?.topCreative),
      bestPerformingExperiment:known(revenueBoard?.topExperiment),
      currentBottleneck:bottleneck,
      accountableCompany:bottleneck.owner,
      nextAction:warRoom?.strongestAuthorizedAction || priorityTasks[0]?.nextAction || null,
      blockedActions,
      alternativePathsInProgress:warRoom?.alternativePathsInProgress || [],
    },
    verifiedSales,
    grossRevenueUsd:verifiedRevenueUsd,
    grossMarginUsd:known(firstSale?.grossMarginUsd),
    contributionMarginUsd:known(firstSale?.netMarginUsd ?? firstSale?.contributionMarginUsd),
    orders:verifiedSales,
    averageOrderValueUsd:verifiedSales > 0 ? known(firstSale?.grossRevenueUsd) : null,
    conversionRate:known(revenueBoard?.conversionRate),
    storeSessions:known(revenueBoard?.storeSessions),
    addToCartRate:known(revenueBoard?.addToCartRate),
    checkoutRate:known(revenueBoard?.checkoutRate),
    refundRate:known(firstSale?.refundRate),
    topProduct:known(revenueBoard?.topProduct),
    topTrafficSource:known(revenueBoard?.topTrafficSource),
    topCreative:known(revenueBoard?.topCreative),
    topExperiment:known(revenueBoard?.topExperiment),
    currentBottleneck:bottleneck,
    firstSaleWarRoom:warRoom,
    priorityTasks,
    commercialEscalation:manifest.commercialEscalation || [],
    researchCandidates:(opportunities?.sourcingQueue || []).map(x => x.slug),
    productsAwaitingSupplierVerification:supplierStates.awaitingSupplierVerification,
    productsAwaitingCommercialGateClosure:supplierStates.awaitingCommercialGateClosure,
    productsApprovedForPromotion:supplierStates.approvedForPromotion,
    productsRemovedFromPromotion:supplierStates.removedFromPromotion,
    externalActionsAwaitingOwnerApproval:externalApprovals,
    promotionEligibleCount,
    supplierReviewCheckedAt:supplier?.checkedAt || null,
    storefrontHttpStatus:storefront?.result?.activeStorefront?.status ?? null,
    publicRetailPublishingReady:tiktok?.readyForPublicRetailPublishing === true,
    companyQueue,
    evidenceGaps:[
      ...(['grossMarginUsd','contributionMarginUsd','refundCount'].filter(k => !(k in (firstSale || {})))),
      ...(['conversionRate','storeSessions','addToCartEvents','checkoutInitiations','topProduct','topTrafficSource','topCreative','topExperiment','fulfillmentFailures'].filter(k => !(k in (revenueBoard || {}))))
    ],
    rules:manifest.rules
  };
}

export async function main() {
  const manifest = JSON.parse(await fs.readFile('paperclip/prismbay-commerce-group/companies.json','utf8'));
  await fs.access(manifest.masterExecutionPrompt);
  const [opportunities,supplier,promotion,storefront,tiktok,firstSale,revenueBoard] = await Promise.all([
    readJson('growth-reports/global-commerce-opportunities.json'),
    readJson('growth-reports/cj-worker-review.json'),
    readJson('growth-reports/retail-promotion-swarm.json'),
    readJson('growth-reports/storefront-cro-auditor.json'),
    readJson('growth-reports/tiktok-retail-readiness.json'),
    readJson('growth-reports/first-sale-verification.json'),
    readJson('growth-reports/paperclip-revenue-board.json')
  ]);
  const dashboard = buildDashboard({manifest,opportunities,supplier,promotion,storefront,tiktok,firstSale,revenueBoard});
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/prismbay-commerce-group-dashboard.json',JSON.stringify(dashboard,null,2)+'\n');
  console.log(JSON.stringify({
    verifiedSales:dashboard.verifiedSales,
    promotionReadyProducts:dashboard.promotionEligibleCount,
    currentBottleneck:dashboard.currentBottleneck,
    closestProduct:dashboard.firstSaleWarRoom?.closestProduct || null,
    remainingGates:dashboard.firstSaleWarRoom?.remainingGates || [],
    nextBestProduct:dashboard.firstSaleWarRoom?.nextBestProduct || null,
    alternativePaths:dashboard.firstSaleWarRoom?.alternativePathsInProgress || [],
    externalOwnerAction:dashboard.externalActionsAwaitingOwnerApproval,
    nextCommercialAction:dashboard.scoreboard.nextAction,
  },null,2));
  return dashboard;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
