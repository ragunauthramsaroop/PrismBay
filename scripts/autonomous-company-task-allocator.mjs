import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const COMPANIES = [
  'product-intelligence',
  'supplier-fulfillment',
  'offer-engineering',
  'storefront-conversion',
  'creative-studio',
  'organic-growth',
  'creator-affiliate-growth',
  'revenue-analytics',
  'experiment-lab',
  'commerce-control',
];

async function readJson(path, fallback = {}) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; }
}

function task(companyId, priority, title, evidenceRequired, doneWhen, context = {}) {
  return {
    id: `${companyId}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72)}`,
    companyId,
    priority,
    status: 'active',
    title,
    evidenceRequired,
    doneWhen,
    context,
    prohibitedShortcuts: [
      'fabricated metrics, reviews, sales, stock or freight',
      'unapproved paid spend',
      'automatic supplier ordering',
      'bulk unsolicited outreach',
      'unauthorized external publishing',
      'bypassing platform, payment, identity or security controls',
    ],
  };
}

export function allocateTasks({ growthBoard, dashboard, strategyBoard, opportunities, promotion, storefront }, now = Date.now()) {
  const primary = growthBoard.primaryProduct || dashboard.firstSaleWarRoom?.closestProduct || 'current-primary';
  const productRace = growthBoard.productRace || [];
  const backups = productRace.filter(row => row.slug !== primary).slice(0, 4).map(row => row.slug);
  const recoveryByCompany = new Map((growthBoard.recoverySprints || []).map(row => [row.companyId, row]));
  const evidenceByCompany = new Map();
  for (const row of growthBoard.evidenceDebt || []) {
    const list = evidenceByCompany.get(row.companyId) || [];
    list.push(row.evidenceGap);
    evidenceByCompany.set(row.companyId, list);
  }
  const acquisitionPaths = Array.isArray(strategyBoard.acquisitionPaths)
    ? strategyBoard.acquisitionPaths.map(row => typeof row === 'string' ? row : row.id).filter(Boolean)
    : [];
  const promotionReady = Number(promotion.promotionEligibleCount || 0);
  const tasks = [];

  const age = now - Date.parse(storefront?.checkedAt);
  const requiredResources = ['/', 'catalog-data.js', 'catalog-ui.js', 'catalog-store.css'];
  const usableObservation = storefront?.origin === 'https://clean.prismbayai.com'
    && Number.isFinite(age) && age >= 0 && age <= 30 * 60 * 1000
    && Array.isArray(storefront.checks)
    && requiredResources.every(resource => storefront.checks?.some(check => check.resource === resource && typeof check.ok === 'boolean'));
  if (!usableObservation) {
    tasks.push(task('storefront-conversion', 1, 'Restore current Clean storefront observations',
      ['fresh homepage and catalog asset delivery checks from clean.prismbayai.com'],
      'A complete observation less than 30 minutes old exists for the customer-facing domain. Missing evidence is never healthy.',
      { observationStatus: 'missing_stale_or_invalid' }));
  } else {
    for (const resource of requiredResources) {
      const check = storefront.checks.find(row => row.resource === resource);
      if (check.ok) continue;
      tasks.push(task('storefront-conversion', 1, `Repair Clean storefront delivery ${resource}`,
        [`${storefront.origin}:${resource}:HTTP ${check.status ?? 'unavailable'}`],
        'A fresh independent storefront observation passes for this resource; prepare code changes through a reviewed PR.',
        { resource, checkedAt: storefront.checkedAt, productionChangeRequiresApproval: true }));
    }
  }

  for (const recovery of growthBoard.recoverySprints || []) {
    tasks.push(task(
      recovery.companyId,
      recovery.band === 'critical' ? 1 : recovery.band === 'red' ? 2 : 3,
      `Recover ${recovery.companyId} KPI performance`,
      recovery.evidenceTargets,
      `Create authoritative evidence that closes at least one current evidence gap and raises the next KPI score above ${recovery.currentScore}.`,
      { currentScore: recovery.currentScore, band: recovery.band, supportingCompanies: recovery.supportingCompanies }
    ));
  }

  tasks.push(task(
    'product-intelligence', 1,
    `Maintain five-product race around ${primary}`,
    productRace.map(row => `${row.slug}:${row.source}`),
    'At least five distinct non-prohibited candidates remain ranked with a specific next commercial gate and no duplicate identity.',
    { primary, backups, productRaceCount: productRace.length }
  ));

  tasks.push(task(
    'supplier-fulfillment', 1,
    `Close or route around ${primary} fulfillment blockers`,
    ['supplier identity', 'exact variant', 'stock', 'destination freight', 'landed economics', 'checkout release'],
    'Primary product clears its remaining gates OR a better verified supplier/SKU/product route is promoted to primary with preserved evidence.',
    { primary, blockerEscalation: growthBoard.blockerEscalation, backups }
  ));

  for (const backup of backups.slice(0, 2)) {
    tasks.push(task(
      'supplier-fulfillment', 2,
      `Verify backup product ${backup}`,
      ['supplier identity', 'variant', 'stock', 'freight screening', 'product cost'],
      'Backup has enough verified supplier evidence for a real landed-economics decision or is explicitly rejected with evidence.',
      { backup }
    ));
  }

  for (let i = 1; i <= Number(growthBoard.factories?.offerFactory?.requiredOutput || 3); i++) {
    tasks.push(task(
      'offer-engineering', 2,
      `Prepare evidence-gated offer hypothesis ${i} for ${primary}`,
      ['verified product facts', 'verified or explicitly unknown economics', 'no unsupported claim'],
      'Offer hypothesis states audience/problem, value proposition, price/bundle assumption, margin gate and rejection condition without changing live price.',
      { primary, hypothesis: i }
    ));
  }

  for (let i = 1; i <= Number(growthBoard.factories?.croFactory?.requiredOutput || 3); i++) {
    tasks.push(task(
      'storefront-conversion', 2,
      `Prepare measurable CRO hypothesis ${i} for ${primary}`,
      ['current page observation', 'specific buyer friction', 'measurable success metric'],
      'Hypothesis names one storefront change, one measurable outcome and one stop condition; material production changes remain approval-gated.',
      { primary, hypothesis: i }
    ));
  }

  for (let i = 1; i <= Number(growthBoard.factories?.creativeFactory?.requiredOutput || 5); i++) {
    tasks.push(task(
      'creative-studio', 2,
      `Prepare rights-safe creative concept ${i} for ${primary}`,
      ['original concept', 'product evidence source', 'claim check', 'measurement hypothesis'],
      'Concept can be produced from original/authorized assets and contains no fabricated review, scarcity, performance result or unsupported product claim.',
      { primary, concept: i }
    ));
  }

  for (const path of acquisitionPaths) {
    tasks.push(task(
      'organic-growth', promotionReady > 0 ? 2 : 3,
      `${promotionReady > 0 ? 'Validate activation' : 'Prepare'} for channel ${path}`,
      ['channel eligibility', 'product eligibility', 'rights-safe asset plan', 'attribution plan'],
      promotionReady > 0
        ? 'Channel is either ready for approved activation with complete prerequisites or explicitly blocked with a fallback route.'
        : 'All non-product prerequisites are prepared while external product promotion remains blocked until a product is promotion-ready.',
      { path, promotionReady }
    ));
  }

  tasks.push(task(
    'creator-affiliate-growth', 3,
    `Prepare performance-partner package for ${primary}`,
    ['commission/economics assumption', 'rights-safe brief', 'eligibility prerequisites', 'no-send shortlist structure'],
    'A partner package is ready for owner-approved or platform-native activation once product/account eligibility exists; no bulk unsolicited outreach occurs.',
    { primary }
  ));

  const debt = growthBoard.evidenceDebt || [];
  tasks.push(task(
    'revenue-analytics', 1,
    'Drive evidence-debt closure across the group',
    debt.map(row => `${row.companyId}:${row.evidenceGap}`),
    'Every closed evidence-debt item points to an authoritative current source; unknowns remain unknown rather than being inferred as passes.',
    { evidenceDebtCount: debt.length }
  ));

  tasks.push(task(
    'experiment-lab', 2,
    `Build two executable pre-sale experiments for ${primary}`,
    ['hypothesis', 'metric', 'baseline or explicit no-baseline state', 'stop rule', 'decision rule'],
    'At least two experiments can be executed when prerequisite traffic/product readiness exists and do not require fabricated demand or unapproved spend.',
    { primary }
  ));

  tasks.push(task(
    'commerce-control', 1,
    `Eliminate primary route deficit and recover weakest companies`,
    ['current KPI scorecard', 'recovery sprint board', 'blocker owner', 'parallel routes'],
    'Every Critical/Red company has an active recovery owner, the primary blocker has the required parallel routes, and the next cycle has a concrete commercial decision.',
    {
      criticalCompanies: growthBoard.portfolioControls?.criticalCompanies || [],
      redCompanies: growthBoard.portfolioControls?.redCompanies || [],
      parallelRouteDeficit: growthBoard.portfolioControls?.parallelRouteDeficit || 0,
    }
  ));

  const grouped = Object.fromEntries(COMPANIES.map(id => [id, tasks.filter(row => row.companyId === id)]));
  const missingCompanies = COMPANIES.filter(id => grouped[id].length === 0);
  if (missingCompanies.length) throw new Error(`unassigned_companies:${missingCompanies.join(',')}`);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    objective: 'Convert CEO recovery decisions into measurable work for every specialist company.',
    primaryProduct: primary,
    promotionReady,
    totalTasks: tasks.length,
    activeCompanies: COMPANIES.length,
    tasks,
    companies: grouped,
    recoveryCoverage: Object.fromEntries(COMPANIES.map(id => [id, {
      taskCount: grouped[id].length,
      kpiBand: recoveryByCompany.get(id)?.band || 'green_or_unreported',
      evidenceDebt: evidenceByCompany.get(id) || [],
    }])),
  };
}

export async function main() {
  const board = allocateTasks({
    growthBoard: await readJson('growth-reports/ceo-autonomous-growth-board.json'),
    dashboard: await readJson('growth-reports/prismbay-commerce-group-dashboard.json'),
    strategyBoard: await readJson('growth-reports/sales-strategy-board.json'),
    opportunities: await readJson('growth-reports/global-commerce-opportunities.json'),
    promotion: await readJson('growth-reports/retail-promotion-swarm.json'),
    storefront: await readJson('growth-reports/clean-storefront-observation.json'),
  });
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/autonomous-company-taskboard.json', JSON.stringify(board, null, 2) + '\n');
  console.log(JSON.stringify({ totalTasks: board.totalTasks, activeCompanies: board.activeCompanies, primaryProduct: board.primaryProduct }, null, 2));
  return board;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
