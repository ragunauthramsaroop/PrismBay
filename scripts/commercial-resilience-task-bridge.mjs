import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildFirstSaleRescueBoard } from './first-sale-rescue-engine.mjs';
import { bridgeFirstSaleRescue } from './first-sale-rescue-task-bridge.mjs';

const readJson = async (path, fallback = {}) => { try { return JSON.parse(await fs.readFile(path,'utf8')); } catch { return fallback; } };

function resilienceTask(companyId, priority, title, evidenceRequired, doneWhen, context = {}) {
  return {
    id: `${companyId}:resilience:${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)}`,
    companyId,
    priority,
    status: 'active',
    title,
    evidenceRequired,
    doneWhen,
    context,
    prohibitedShortcuts: ['fabricated stock/freight/economics','automatic supplier ordering','automatic live price changes','bypassing checkout/payment controls']
  };
}

export function bridgeResilience({ taskboard = {}, supplierBoard = {}, offerBoard = {}, recoveryBoard = {}, inventoryBoard = {} } = {}) {
  const tasks = Array.isArray(taskboard.tasks) ? [...taskboard.tasks] : [];
  for (const product of supplierBoard.products || []) {
    if (Number(product.supplierRouteDeficit || 0) > 0) {
      tasks.push(resilienceTask('supplier-fulfillment', 1,
        `Reduce supplier concentration for ${product.slug}`,
        ['independent supplier identity','variant','stock','screening freight','landed-cost evidence'],
        `Reach at least ${supplierBoard.targetVerifiedRoutesPerSku || 3} verified routes or document evidence-backed rejection of unavailable alternatives.`,
        { slug:product.slug, risk:product.supplierConcentrationRisk, routeDeficit:product.supplierRouteDeficit }));
    }
    if (product.promotionProposal) {
      tasks.push(resilienceTask('supplier-fulfillment', 1,
        `Review route-promotion proposal for ${product.slug}`,
        ['preferred route evidence','backup route evidence','customer-facing SKU mapping'],
        'Approved route portfolio is ready for quote-runtime configuration while final buyer ZIP and checkout economics remain session-gated.',
        { slug:product.slug, proposal:product.promotionProposal }));
    }
  }

  for (const product of inventoryBoard.products || []) {
    if (!product.fragilePrimary) continue;
    tasks.push(resilienceTask('supplier-fulfillment', 1,
      `Recover inventory depth for ${product.slug}`,
      ['current verified route inventory','alternative supplier stock','backup product readiness'],
      `At least one route reaches ${inventoryBoard.minimumPrimaryInventory || 5} verified units OR a stronger verified backup supplier/product is advanced without falsely declaring the current route unavailable.`,
      { slug:product.slug, inventoryRisk:product.inventoryRisk, maxVerifiedRouteInventory:product.maxVerifiedRouteInventory, totalVerifiedInventoryAcrossRoutes:product.totalVerifiedInventoryAcrossRoutes }));
    tasks.push(resilienceTask('commerce-control', 1,
      `Protect first-sale plan from low inventory on ${product.slug}`,
      ['supplier concentration board','inventory depth board','next-best product evidence'],
      'Primary route may remain available for a valid buyer, but CEO attention is also allocated to an independently sellable backup route/product until inventory depth recovers.',
      { slug:product.slug, requiredAction:product.requiredAction }));
  }

  for (const product of offerBoard.products || []) {
    if (!product.viableHypotheses?.length) continue;
    tasks.push(resilienceTask('offer-engineering', 1,
      `Run price and bundle tournament design for ${product.slug}`,
      ['verified landed-cost evidence','current or explicitly unknown retail price','measurement plan'],
      'At least one commercially viable hypothesis has a defined audience, metric, stop rule and decision rule; no live price changes occur automatically.',
      { slug:product.slug, testSequence:product.recommendedTestSequence, elasticityStatus:product.elasticityStatus }));
    tasks.push(resilienceTask('experiment-lab', 2,
      `Instrument elasticity experiment for ${product.slug}`,
      product.measurementRequired || [],
      'Experiment can distinguish conversion/revenue effects from cost-model projections using real qualified sessions and verified paid-order outcomes.',
      { slug:product.slug, hypotheses:product.recommendedTestSequence }));
  }

  for (const row of recoveryBoard.tasks || []) {
    tasks.push(resilienceTask(row.owner || 'commerce-control', 1,
      `Recover checkout failure ${row.failureCode}${row.sku ? ` for ${row.sku}` : ''}`,
      ['runtime failure code','current supplier/offer/checkout evidence','replacement or repair evidence'],
      row.doneWhen,
      { sourceTaskId:row.id, sku:row.sku, failureCode:row.failureCode, alternativeVerifiedRoutes:row.alternativeVerifiedRoutes }));
  }

  const seen = new Set();
  const deduped = tasks.filter(row => { if (!row?.id || seen.has(row.id)) return false; seen.add(row.id); return true; });
  const companies = { ...(taskboard.companies || {}) };
  for (const task of deduped) {
    if (!Array.isArray(companies[task.companyId])) companies[task.companyId] = [];
  }
  for (const id of Object.keys(companies)) companies[id] = deduped.filter(row => row.companyId === id);

  return {
    ...taskboard,
    schemaVersion: Math.max(3, Number(taskboard.schemaVersion || 1)),
    generatedAt: new Date().toISOString(),
    totalTasks: deduped.length,
    tasks: deduped,
    companies,
    commercialResilience: {
      supplierRiskProducts: (supplierBoard.highRiskProducts || []).length,
      routePromotionProposals: (supplierBoard.routePromotionProposals || []).length,
      fragileInventoryProducts: Number(inventoryBoard.fragileProductCount || 0),
      offerHypotheses: Number(offerBoard.hypothesisCount || 0),
      checkoutRecoveryTasks: (recoveryBoard.tasks || []).length,
    }
  };
}

export async function main() {
  const supplierBoard = await readJson('growth-reports/supplier-route-promotion-board.json');
  const offerBoard = await readJson('growth-reports/offer-price-tournament.json');
  const inventoryBoard = await readJson('growth-reports/inventory-depth-board.json');
  let output = bridgeResilience({
    taskboard: await readJson('growth-reports/autonomous-company-taskboard.json'),
    supplierBoard,
    offerBoard,
    recoveryBoard: await readJson('growth-reports/checkout-recovery-board.json'),
    inventoryBoard,
  });
  const rescueBoard = buildFirstSaleRescueBoard({
    growth: await readJson('growth-reports/ceo-autonomous-growth-board.json'),
    supplierBoard,
    challenger: await readJson('growth-reports/supplier-challenger-board.json'),
    offerBoard,
    inventoryBoard,
  });
  output = bridgeFirstSaleRescue({ taskboard: output, rescueBoard });
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/first-sale-rescue-board.json',JSON.stringify(rescueBoard,null,2)+'\n');
  await fs.writeFile('growth-reports/autonomous-company-taskboard.json',JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({totalTasks:output.totalTasks,...output.commercialResilience,recommendedRescue:rescueBoard.recommendedAction?.id||null,parallelRescues:rescueBoard.parallelActions.map(x=>x.id)},null,2));
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
