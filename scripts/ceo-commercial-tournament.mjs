import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function readJson(path, fallback = {}) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function validateTournamentPolicy(policy) {
  if (!policy || policy.schemaVersion !== 1) throw new Error('invalid_tournament_policy');
  if (Number(policy.resourceBudget?.internalUnits) !== 100) throw new Error('internal_units_must_equal_100');
  if (Number(policy.resourceBudget?.minimumExplorationReservePct) < 15) throw new Error('exploration_reserve_too_low');
  if (policy.tournamentRules?.zeroPaidSpendUntilAuthorized !== true) throw new Error('paid_spend_guard_required');
  if (policy.tournamentRules?.promotionRequiresPromotionReadyProduct !== true) throw new Error('promotion_gate_required');
  if (policy.tournamentRules?.fragilityChangesAttentionNotTruth !== true) throw new Error('fragility_truth_boundary_required');
  if (policy.hypothesisRules?.everyHypothesisNeedsMetric !== true || policy.hypothesisRules?.everyHypothesisNeedsStopRule !== true) throw new Error('hypothesis_discipline_required');
  return true;
}

function resilienceAdjustment(slug, policy, supplierMap, inventoryMap) {
  const w = policy.productScoring || {};
  const supplier = supplierMap.get(slug);
  const inventory = inventoryMap.get(slug);
  let adjustment = 0;
  const reasons = [];
  if (supplier?.supplierConcentrationRisk === 'critical') { adjustment -= Number(w.criticalSupplierConcentrationPenalty || 0); reasons.push('critical_supplier_concentration'); }
  else if (supplier?.supplierConcentrationRisk === 'high') { adjustment -= Number(w.highSupplierConcentrationPenalty || 0); reasons.push('high_supplier_concentration'); }
  if (supplier && Number(supplier.verifiedRouteCount || 0) === 0) { adjustment -= Number(w.zeroVerifiedCommercialRoutePenalty || 0); reasons.push('zero_verified_commercial_routes'); }
  else if (supplier && Number(supplier.verifiedRouteCount || 0) >= 3) { adjustment += Number(w.multiRouteResilienceBonus || 0); reasons.push('multi_route_resilience'); }
  if (inventory?.fragilePrimary === true) { adjustment -= Number(w.fragileInventoryPenalty || 0); reasons.push('fragile_inventory_depth'); }
  return { adjustment, reasons, supplierRisk: supplier?.supplierConcentrationRisk || 'unknown', verifiedRouteCount: supplier ? Number(supplier.verifiedRouteCount || 0) : null, inventoryRisk: inventory?.inventoryRisk || 'unknown' };
}

function productScore(row, policy, primaryProduct, supplierMap, inventoryMap) {
  const w = policy.productScoring;
  const readiness = clamp(Number(row.readinessPct || 0), 0, 100);
  const research = clamp(Number(row.researchScore || 0), 0, 100);
  const totalMissing = Array.isArray(row.missing) ? row.missing.length : 0;
  const completion = clamp(100 - totalMissing * 15, 0, 100);
  const checkoutBonus = row.slug === primaryProduct ? Number(w.primaryCheckoutInfrastructureBonus || 0) : 0;
  const resilience = resilienceAdjustment(row.slug, policy, supplierMap, inventoryMap);
  const baseScore =
    readiness * Number(w.readinessPctWeight || 0) / 100 +
    research * Number(w.researchScoreWeight || 0) / 100 +
    completion * Number(w.evidenceCompletionWeight || 0) / 100 +
    checkoutBonus;
  return { score: Math.round(clamp(baseScore + resilience.adjustment, 0, 100)), baseScore: Math.round(baseScore), resilience };
}

function allocateProducts(productRace, policy, primaryProduct, supplierBoard = {}, inventoryBoard = {}) {
  const minimum = Number(policy.tournamentRules.minimumProductsCompetingBeforeFirstSale || 5);
  const supplierMap = new Map((supplierBoard.products || []).map(row => [row.slug, row]));
  const inventoryMap = new Map((inventoryBoard.products || []).map(row => [row.slug, row]));
  const rows = productRace.slice(0, Math.max(minimum, productRace.length)).map(row => {
    const scored = productScore(row, policy, primaryProduct, supplierMap, inventoryMap);
    return { ...row, tournamentScore: scored.score, preResilienceScore: scored.baseScore, resilienceAdjustment: scored.resilience.adjustment, resilienceReasons: scored.resilience.reasons, supplierConcentrationRisk: scored.resilience.supplierRisk, verifiedCommercialRouteCount: scored.resilience.verifiedRouteCount, inventoryRisk: scored.resilience.inventoryRisk };
  }).sort((a, b) => b.tournamentScore - a.tournamentScore);
  if (!rows.length) return [];
  const minShare = Number(policy.resourceBudget.minimumActiveProductPct || 5);
  const maxShare = Number(policy.resourceBudget.maximumSingleProductPct || 35);
  const explorationReserve = Number(policy.resourceBudget.minimumExplorationReservePct || 20);
  const base = rows.map(row => ({ ...row, allocationPct: minShare }));
  let remaining = 100 - base.length * minShare;
  const reserve = Math.min(explorationReserve, remaining);
  remaining -= reserve;
  const scoreTotal = base.reduce((sum, row) => sum + Math.max(1, row.tournamentScore), 0);
  for (const row of base) {
    const add = scoreTotal ? remaining * row.tournamentScore / scoreTotal : 0;
    row.allocationPct = Math.min(maxShare, row.allocationPct + add);
  }
  const used = base.reduce((sum, row) => sum + row.allocationPct, 0);
  let leftover = 100 - used;
  const explorers = [...base].sort((a, b) => a.tournamentScore - b.tournamentScore);
  for (const row of explorers) {
    if (leftover <= 0) break;
    const room = maxShare - row.allocationPct;
    const add = Math.min(room, leftover / Math.max(1, explorers.length));
    row.allocationPct += add;
    leftover -= add;
  }
  return base.map((row, i) => ({
    ...row,
    allocationPct: Number(row.allocationPct.toFixed(1)),
    lane: i < Number(policy.tournamentRules.topProductsFastLaneCount || 2) ? 'fast-lane' : 'exploration-lane',
    allocationReason: 'Internal worker attention only; resilience penalties change attention, not factual product availability or sales probability.'
  }));
}

function strategyBase(state, policy) {
  const s = policy.strategyScoring;
  if (state === 'active_internal') return Number(s.activeInternal || 80);
  if (state === 'active_internal_prepare') return Number(s.activeInternalPrepare || 65);
  if (state === 'account_or_owner_activation_check') return Number(s.accountOrOwnerActivationCheck || 55);
  if (state === 'post_sale_measure_and_scale') return Number(s.postSaleMeasureAndScale || 90);
  return 40;
}

function allocateStrategies(strategyBoard, policy) {
  const rows = (strategyBoard.strategies || []).map(row => {
    let score = strategyBase(row.state, policy);
    if (Array.isArray(row.blockedBy) && row.blockedBy.length) score -= Number(policy.strategyScoring.blockedPenalty || 0);
    return { ...row, tournamentScore: clamp(score, 0, 100) };
  }).sort((a, b) => b.tournamentScore - a.tournamentScore);
  const min = Number(policy.tournamentRules.minimumStrategiesCompetingBeforeFirstSale || 8);
  const selected = rows.slice(0, Math.max(min, rows.length));
  const max = Number(policy.resourceBudget.maximumSingleStrategyPct || 20);
  const total = selected.reduce((sum, row) => sum + Math.max(1, row.tournamentScore), 0);
  return selected.map(row => ({
    ...row,
    allocationPct: Number(Math.min(max, 100 * row.tournamentScore / total).toFixed(1)),
    executionMode: row.blockedBy?.length ? 'prepare_or_unblock' : 'execute_internal_or_activation_check'
  }));
}

function buildHypotheses(growthBoard, strategyBoard, policy) {
  const items = [];
  const primary = growthBoard.primaryProduct || 'primary-product';
  const add = (id, owner, hypothesis, metric, stopRule, evidenceGate) => items.push({ id, owner, hypothesis, metric, stopRule, evidenceGate, status: 'open' });
  add(`offer-${primary}`, 'offer-engineering', `At least one truthful offer framing can improve buyer clarity for ${primary} without lowering verified margin below floor.`, 'offer_variant_measurement', 'kill or rewrite after measurement shows no improvement or economics fail', 'verified economics and product facts');
  add(`cro-${primary}`, 'storefront-conversion', `Removing a measurable buyer-path friction point can improve checkout progression for ${primary}.`, 'buyer_path_progression', 'stop after instrumented test shows no material improvement', 'working checkout path and event instrumentation');
  add(`creative-${primary}`, 'creative-studio', `An original problem-solution creative angle can produce measurable qualified engagement for ${primary}.`, 'qualified_engagement', 'kill creative after sufficient measured exposure with no qualified engagement', 'rights-safe original asset and product eligibility');
  add(`seo-${primary}`, 'organic-growth', `Owned-search assets around real use cases can produce qualified organic sessions for ${primary}.`, 'qualified_organic_sessions', 'rewrite topic after indexed asset receives no qualified sessions across the defined observation window', 'search asset published only when product facts are verified');
  for (const path of strategyBoard.acquisitionPaths || []) {
    add(`channel-${path.id}`, 'revenue-analytics', `${path.id} can become a measurable acquisition path once its activation gates are satisfied.`, 'attributed_sessions_or_orders', 'pause activation if attribution is unavailable or policy/account eligibility fails', 'promotion-ready product plus channel/account eligibility');
  }
  return items.slice(0, Number(policy.hypothesisRules.maximumOpenHypotheses || 30));
}

export function buildTournament({ policy, growthBoard, strategyBoard, scorecard, firstSale, supplierBoard = {}, inventoryBoard = {} }) {
  validateTournamentPolicy(policy);
  const verifiedSales = firstSale?.verifiedFirstSale === true ? 1 : Number(growthBoard.verifiedSales || 0);
  const products = allocateProducts(growthBoard.productRace || [], policy, growthBoard.primaryProduct, supplierBoard, inventoryBoard);
  const strategies = allocateStrategies(strategyBoard, policy);
  const hypotheses = buildHypotheses(growthBoard, strategyBoard, policy);
  const weakestCompanies = Object.entries(scorecard.companies || {}).sort((a, b) => Number(a[1].score || 0) - Number(b[1].score || 0)).slice(0, 5).map(([id, row]) => ({ id, score: row.score, band: row.band }));
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    mode: verifiedSales > 0 ? 'post-sale-evidence-allocation' : 'pre-sale-commercial-tournament',
    verifiedSales,
    rule: 'Allocation represents internal attention and experiment capacity, never a forecast or claim of sales probability. Supplier and inventory fragility change attention only, not factual availability.',
    productTournament: products,
    strategyTournament: strategies,
    hypothesisLedger: hypotheses,
    weakestCompanies,
    ceoActions: [
      products[0] ? `Give first commercial-attention priority to ${products[0].slug} while preserving exploration reserve.` : 'Rebuild product race.',
      products.some(row => row.resilienceReasons?.length) ? 'Shift some internal attention away from fragile supplier/inventory routes toward independently sellable backups while remediation continues.' : 'Maintain supplier and inventory resilience checks.',
      weakestCompanies[0] ? `Direct cross-company recovery support to ${weakestCompanies[0].id}.` : 'Maintain KPI discipline.',
      'Kill or rewrite unmeasurable hypotheses instead of allowing indefinite activity.',
      'Do not activate blocked external channels until product, account, rights and measurement gates are satisfied.'
    ],
    safeguards: policy.tournamentRules
  };
}

export async function main() {
  const board = buildTournament({
    policy: await readJson('config/commercial-tournament-policy.json'),
    growthBoard: await readJson('growth-reports/ceo-autonomous-growth-board.json'),
    strategyBoard: await readJson('growth-reports/sales-strategy-board.json'),
    scorecard: await readJson('growth-reports/strict-kpi-scorecard.json'),
    firstSale: await readJson('growth-reports/first-sale-verification.json'),
    supplierBoard: await readJson('growth-reports/supplier-route-promotion-board.json'),
    inventoryBoard: await readJson('growth-reports/inventory-depth-board.json')
  });
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/ceo-commercial-tournament.json', JSON.stringify(board, null, 2) + '\n');
  await fs.writeFile('growth-reports/commercial-hypothesis-ledger.json', JSON.stringify({ generatedAt: board.generatedAt, items: board.hypothesisLedger }, null, 2) + '\n');
  console.log(JSON.stringify({ mode: board.mode, verifiedSales: board.verifiedSales, topProduct: board.productTournament[0]?.slug || null, productCount: board.productTournament.length, strategyCount: board.strategyTournament.length, hypothesisCount: board.hypothesisLedger.length, weakestCompany: board.weakestCompanies[0]?.id || null, resilienceAdjustedProducts: board.productTournament.filter(row => row.resilienceReasons?.length).map(row => row.slug) }, null, 2));
  return board;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
