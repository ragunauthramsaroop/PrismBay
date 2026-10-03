import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const positive = value => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; };
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const readJson = async (path, fallback = {}) => { try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; } };

function sourcingRows(report = {}) {
  if (Array.isArray(report)) return report;
  for (const value of [report.results, report.candidates, report.sourcingResults, report.rows, report.products, report.items, report.data]) {
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(report?.results?.candidates)) return report.results.candidates;
  return [];
}

function opportunityMap(opportunities = {}) {
  return new Map((opportunities.candidates || []).map(row => [row.slug, row]));
}

function riskBand(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function buildSupplierPortfolioBoard({ sourcing = {}, opportunities = {}, policy = {} } = {}) {
  const candidates = opportunityMap(opportunities);
  const target = Number(policy?.supplierPortfolio?.targetVerifiedRoutesPerSku || 3);
  const rows = sourcingRows(sourcing).map(row => {
    const slug = row.slug || row.product?.slug || row.candidateSlug || null;
    const storeSku = candidates.get(slug)?.storeSku || row.storeSku || null;
    const routes = (Array.isArray(row.supplierRoutePortfolio) ? row.supplierRoutePortfolio : []).map((route, index) => ({
      rank: index + 1,
      productId: route.productId || null,
      productSku: route.productSku || null,
      variantId: route.variantId || null,
      variantSku: route.variantSku || null,
      originCountryCode: route.originCountryCode || null,
      inventory: Number(route.inventory || 0),
      productCostUsd: positive(route.productCostUsd),
      screeningFreightUsd: positive(route.screeningFreightUsd),
      screenedSingleUnitLandedUsd: positive(route.screenedSingleUnitLandedUsd),
      variantInventoryVerified: route.variantInventoryVerified === true,
      screeningFreightVerified: route.screeningFreightVerified === true,
    }));
    const verified = routes.filter(route => route.variantInventoryVerified && route.screeningFreightVerified && route.variantId && route.productId && route.productCostUsd && route.screenedSingleUnitLandedUsd);
    const independentSuppliers = new Set(verified.map(route => route.productId)).size;
    const independentOrigins = new Set(verified.map(route => route.originCountryCode).filter(Boolean)).size;
    const routeCount = verified.length;
    let concentrationScore = routeCount === 0 ? 100 : routeCount === 1 ? 80 : routeCount === 2 ? 50 : 25;
    if (independentSuppliers <= 1 && routeCount > 1) concentrationScore += 15;
    if (independentOrigins <= 1 && routeCount > 1) concentrationScore += 5;
    concentrationScore = clamp(concentrationScore, 0, 100);
    const sorted = [...verified].sort((a, b) => (a.screenedSingleUnitLandedUsd ?? Infinity) - (b.screenedSingleUnitLandedUsd ?? Infinity) || b.inventory - a.inventory);
    const promotionProposal = sorted.length ? {
      status: 'proposal_only',
      customerFacingSku: storeSku,
      preferredRoute: sorted[0],
      backupRoutes: sorted.slice(1, target),
      automaticActivation: false,
      finalBuyerZipStillRequired: true,
      rule: 'Promote only pre-approved verified routes into quote-runtime configuration; final checkout still requires live stock, exact destination freight and margin revalidation.'
    } : null;
    return {
      slug,
      storeSku,
      candidate: row.candidate || candidates.get(slug)?.name || slug,
      verifiedRouteCount: routeCount,
      independentSupplierCount: independentSuppliers,
      independentOriginCount: independentOrigins,
      supplierConcentrationScore: concentrationScore,
      supplierConcentrationRisk: riskBand(concentrationScore),
      supplierRouteDeficit: Math.max(0, target - routeCount),
      routes: sorted,
      promotionProposal,
      packFreightScreening: Array.isArray(row.packFreightScreening) ? row.packFreightScreening : [],
    };
  }).filter(row => row.slug);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    targetVerifiedRoutesPerSku: target,
    products: rows.sort((a, b) => a.supplierConcentrationScore - b.supplierConcentrationScore || b.verifiedRouteCount - a.verifiedRouteCount),
    routePromotionProposals: rows.filter(row => row.promotionProposal).map(row => ({ slug: row.slug, ...row.promotionProposal })),
    highRiskProducts: rows.filter(row => ['critical', 'high'].includes(row.supplierConcentrationRisk)).map(row => ({ slug: row.slug, risk: row.supplierConcentrationRisk, deficit: row.supplierRouteDeficit })),
    safeguards: { automaticSupplierOrdering: false, automaticActivation: false, finalBuyerZipRequired: true }
  };
}

function economics({ landed, retail, feePct, reservePct, minContributionUsd, minContributionPct, maxLandedPct }) {
  const revenue = positive(retail), landedCost = positive(landed);
  if (!revenue || !landedCost) return { passes: false, reason: 'incomplete_inputs' };
  const fees = revenue * feePct / 100;
  const reserve = revenue * reservePct / 100;
  const contribution = revenue - landedCost - fees - reserve;
  const contributionPct = contribution / revenue * 100;
  const landedPct = landedCost / revenue * 100;
  const passes = contribution >= minContributionUsd && contributionPct >= minContributionPct && landedPct <= maxLandedPct;
  return { passes, revenueUsd: +revenue.toFixed(2), landedUsd: +landedCost.toFixed(2), contributionUsd: +contribution.toFixed(2), contributionPct: +contributionPct.toFixed(2), landedPctOfRetail: +landedPct.toFixed(2) };
}

function minimumRetail({ landed, feePct, reservePct, minContributionUsd, minContributionPct, maxLandedPct }) {
  const x = positive(landed); if (!x) return null;
  const feeReserve = (feePct + reservePct) / 100;
  const byUsd = (x + minContributionUsd) / Math.max(0.01, 1 - feeReserve);
  const byPct = x / Math.max(0.01, 1 - feeReserve - minContributionPct / 100);
  const byLanded = x / (maxLandedPct / 100);
  return +Math.max(byUsd, byPct, byLanded).toFixed(2);
}

export function buildOfferTournament({ supplierBoard = {}, quoteRuntime = {}, economicsEvidence = {}, policy = {} } = {}) {
  const e = policy.economics || {};
  const feePct = Number(e.defaultFeeRatePct || 3.2), reservePct = Number(e.defaultReturnReservePct || 5);
  const minContributionUsd = Number(e.minimumContributionUsd || 3), minContributionPct = Number(e.minimumContributionPct || 25), maxLandedPct = Number(e.maximumLandedPctOfRetail || 55);
  const runtime = new Map((quoteRuntime.products || []).map(row => [row.sku, row]));
  const quantities = policy?.offerTournament?.quantities || [1, 3, 5];
  const products = (supplierBoard.products || []).map(product => {
    const sku = product.storeSku;
    const route = product.routes?.[0];
    const currentRetail = positive(runtime.get(sku)?.retailUsd) || positive(economicsEvidence?.[product.slug]?.retailUsd);
    const packMap = new Map((product.packFreightScreening || []).filter(x => x.priced).map(x => [Number(x.quantity), x]));
    const offers = [];
    for (const quantity of quantities) {
      const pack = packMap.get(Number(quantity));
      const landed = quantity === 1 ? route?.screenedSingleUnitLandedUsd : positive(pack?.landedCostUsd);
      if (!landed) continue;
      const floor = minimumRetail({ landed, feePct, reservePct, minContributionUsd, minContributionPct, maxLandedPct });
      if (!floor) continue;
      if (quantity === 1 && currentRetail) {
        for (const delta of policy?.offerTournament?.singleUnitPriceTestsPct || [-5, 0, 5]) {
          const retail = +(currentRetail * (1 + Number(delta) / 100)).toFixed(2);
          offers.push({ quantity, hypothesis: `single_${delta >= 0 ? 'plus' : 'minus'}_${Math.abs(delta)}pct`, proposedTotalRetailUsd: retail, minimumCommercialRetailUsd: floor, economics: economics({ landed, retail, feePct, reservePct, minContributionUsd, minContributionPct, maxLandedPct }), livePriceChangeAllowed: false });
        }
      } else {
        for (const discount of policy?.offerTournament?.bundleDiscountTestsPct || [0, 5, 10]) {
          const anchor = currentRetail ? currentRetail * quantity : floor;
          const retail = +Math.max(floor, anchor * (1 - Number(discount) / 100)).toFixed(2);
          offers.push({ quantity, hypothesis: `bundle_${quantity}_discount_${discount}pct`, proposedTotalRetailUsd: retail, minimumCommercialRetailUsd: floor, economics: economics({ landed, retail, feePct, reservePct, minContributionUsd, minContributionPct, maxLandedPct }), livePriceChangeAllowed: false });
        }
      }
    }
    const viable = offers.filter(o => o.economics.passes).sort((a, b) => b.economics.contributionUsd - a.economics.contributionUsd);
    return {
      slug: product.slug,
      storeSku: sku,
      supplierConcentrationRisk: product.supplierConcentrationRisk,
      elasticityStatus: 'unmeasured_until_real_conversion_evidence_exists',
      currentRetailUsd: currentRetail,
      hypotheses: offers,
      viableHypotheses: viable,
      recommendedTestSequence: viable.slice(0, 3).map(x => x.hypothesis),
      measurementRequired: ['qualified_sessions', 'add_to_cart_rate', 'checkout_start_rate', 'paid_conversion_rate', 'revenue_per_session', 'contribution_per_order'],
      automaticLivePriceChanges: false,
    };
  }).filter(row => row.hypotheses.length);
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), products, hypothesisCount: products.reduce((n, p) => n + p.hypotheses.length, 0), safeguards: { elasticityIsNotInferredFromCostMath: true, automaticLivePriceChanges: false, paidSpend: false } };
}

export function buildCheckoutRecoveryBoard({ failureEvidence = {}, supplierBoard = {}, policy = {} } = {}) {
  const events = Array.isArray(failureEvidence.events) ? failureEvidence.events : Array.isArray(failureEvidence) ? failureEvidence : [];
  const supplierErrors = new Set(policy?.checkoutRecovery?.replacementSupplierErrors || []);
  const offerErrors = new Set(policy?.checkoutRecovery?.offerErrors || []);
  const checkoutErrors = new Set(policy?.checkoutRecovery?.checkoutErrors || []);
  const productMap = new Map((supplierBoard.products || []).map(row => [row.storeSku || row.slug, row]));
  const tasks = events.map((event, index) => {
    const code = String(event.error || event.code || event.reason || 'unknown_checkout_failure');
    const sku = event.sku || event.slug || null;
    const product = productMap.get(sku);
    let owner = 'commerce-control', action = 'triage_checkout_failure_and_preserve_evidence';
    if (supplierErrors.has(code)) { owner = 'supplier-fulfillment'; action = 'promote_or_verify_alternative_supplier_route'; }
    else if (offerErrors.has(code)) { owner = 'offer-engineering'; action = 'rebuild_price_or_bundle_hypothesis_with_verified_economics'; }
    else if (checkoutErrors.has(code)) { owner = 'storefront-conversion'; action = 'repair_quote_or_checkout_session_flow_without_bypassing_gates'; }
    return {
      id: `checkout-recovery:${index + 1}:${code}`,
      status: 'active',
      owner,
      sku,
      failureCode: code,
      action,
      supplierConcentrationRisk: product?.supplierConcentrationRisk || 'unknown',
      alternativeVerifiedRoutes: Math.max(0, Number(product?.verifiedRouteCount || 0) - 1),
      doneWhen: 'The failure is reproduced or evidenced, a legitimate route is restored or replaced, and the checkout gate still requires live stock, destination freight and passing economics.',
      prohibited: ['bypass payment controls', 'invent stock or freight', 'auto-order supplier inventory', 'disable margin gates']
    };
  });
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), eventCount: events.length, tasks, automaticRecoveryWorkCreated: tasks.length > 0 };
}

export function buildCommercialResilience(inputs = {}) {
  const supplierBoard = buildSupplierPortfolioBoard(inputs);
  const offerTournament = buildOfferTournament({ supplierBoard, quoteRuntime: inputs.quoteRuntime, economicsEvidence: inputs.economicsEvidence, policy: inputs.policy });
  const checkoutRecovery = buildCheckoutRecoveryBoard({ failureEvidence: inputs.failureEvidence, supplierBoard, policy: inputs.policy });
  return { supplierBoard, offerTournament, checkoutRecovery };
}

export async function main() {
  const policy = await readJson('config/commercial-resilience-policy.json');
  const result = buildCommercialResilience({
    policy,
    sourcing: await readJson('growth-reports/paperclip-cj-sourcing.json'),
    opportunities: await readJson('growth-reports/global-commerce-opportunities.json'),
    quoteRuntime: await readJson('growth-reports/quote-runtime-config.json'),
    economicsEvidence: await readJson('growth-reports/global-commerce-unit-economics.json'),
    failureEvidence: await readJson('growth-reports/checkout-failure-evidence.json', { events: [] }),
  });
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/supplier-route-promotion-board.json', JSON.stringify(result.supplierBoard, null, 2) + '\n');
  await fs.writeFile('growth-reports/offer-price-tournament.json', JSON.stringify(result.offerTournament, null, 2) + '\n');
  await fs.writeFile('growth-reports/checkout-recovery-board.json', JSON.stringify(result.checkoutRecovery, null, 2) + '\n');
  console.log(JSON.stringify({ routePromotionProposals: result.supplierBoard.routePromotionProposals.length, highRiskProducts: result.supplierBoard.highRiskProducts.length, offerHypotheses: result.offerTournament.hypothesisCount, checkoutRecoveryTasks: result.checkoutRecovery.tasks.length }, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
