import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Cloud-only, public-data snapshot. This is not a reproduction of the
// uninspected PackZenoRevenueWarRoom task on AGMADMINLPT18.
const SOURCES = Object.freeze({
  catalog: { path: 'public/viral-catalog.json', timestamp: 'updatedAt', maxAgeHours: 24 },
  candidates: { path: 'public/viral-candidates.json', timestamp: 'updatedAt', maxAgeHours: 24 },
  supplierReview: { path: 'growth-reports/cj-worker-review.json', timestamp: 'checkedAt', maxAgeHours: 30 },
  workerBoard: { path: 'growth-reports/dropshipping-worker-board.json', timestamp: 'generatedAt', maxAgeHours: 30 },
  storefrontHealth: { path: 'growth-reports/revenue-health-latest.json', timestamp: 'checkedAt', maxAgeHours: 24 },
});

const safeNonnegativeInteger = value =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;

function sourceStatus(value, definition, nowMs) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { state: 'missing', ageHours: null };
  }
  const timestamp = Date.parse(value[definition.timestamp]);
  if (!Number.isFinite(timestamp)) return { state: 'invalid_timestamp', ageHours: null };
  const hours = (nowMs - timestamp) / 3_600_000;
  if (hours < -1) return { state: 'future_timestamp', ageHours: Math.round(hours * 100) / 100 };
  return {
    state: hours > definition.maxAgeHours ? 'stale' : 'fresh',
    ageHours: Math.round(hours * 100) / 100,
  };
}

export function buildWarRoom(inputs, nowMs = Date.now()) {
  const sourceStates = Object.fromEntries(
    Object.entries(SOURCES).map(([name, definition]) => [
      name, { path: definition.path, ...sourceStatus(inputs[name], definition, nowMs) },
    ]),
  );

  const catalog = inputs.catalog || {};
  const candidates = inputs.candidates || {};
  const review = inputs.supplierReview || {};
  const worker = inputs.workerBoard || {};
  const health = inputs.storefrontHealth || {};

  const sourcesFresh = Object.values(sourceStates).every(x => x.state === 'fresh');
  const staleSources = Object.entries(sourceStates)
    .filter(([, value]) => value.state !== 'fresh')
    .map(([key, value]) => ({ source: key, state: value.state }));

  const tasks = Array.isArray(worker.tasks) ? worker.tasks : [];
  return {
    schemaVersion: 1,
    generatedAt: new Date(nowMs).toISOString(),
    title: 'PackZeno Revenue War Room: cloud candidate',
    executionEnvironment: 'GitHub-hosted Ubuntu runner',
    scope: 'Read-only public PrismBay operations summary',
    parity: {
      originalTask: 'PackZenoRevenueWarRoom',
      taskActionInspected: false,
      taskScheduleVerified: false,
      originalAgentOSLogicMigrated: false,
      approvedForAGMLaptopRetirement: false,
    },
    summaryStatus: sourcesFresh ? 'public_data_current' : 'source_review_required',
    sources: sourceStates,
    sourceExceptions: staleSources,
    attentionCatalog: {
      productCount: Array.isArray(catalog.products) ? catalog.products.length : null,
      candidateCount: Array.isArray(candidates.candidates) ? candidates.candidates.length : null,
      note: 'Public research signals are not verified purchases, traffic, sales, or social reach.',
    },
    supplierChecks: {
      independentProductMatches: safeNonnegativeInteger(review.independentProductMatches),
      verifiedVariantCount: safeNonnegativeInteger(review.verifiedVariantCount),
      countryFreightEstimateCount: safeNonnegativeInteger(review.countryFreightEstimateCount),
      declaredSaleReadyCount: safeNonnegativeInteger(review.saleReadyCount),
      commercialApprovalRequired: true,
      note: 'Supplier-review fields reflect the latest stored report, not live inventory or buyer freight.',
    },
    workerAssignments: {
      total: tasks.length,
      reviewRequired: tasks.filter(x => x && ['review_required', 'supplier_quote_needed', 'awaiting_new_evidence'].includes(x.state)).length,
      state: sourceStates.workerBoard.state,
    },
    storefrontChecks: {
      lastRecordedStatus: typeof health.status === 'string' ? health.status : 'unknown',
      state: sourceStates.storefrontHealth.state,
      note: 'A previous check never establishes current checkout fulfillment.',
    },
    verifiedSales: {
      orderCount: null,
      revenueUSD: null,
      paymentProviderRead: false,
      note: 'No verified sales or private Stripe data are accessible to this cloud candidate.',
    },
    automatedSideEffects: {
      payments: false,
      fulfillment: false,
      outreach: false,
      advertising: false,
      publishing: false,
      devicesAccessed: false,
    },
  };
}

export async function readInputs(root = '.') {
  const entries = await Promise.all(Object.entries(SOURCES).map(async ([name, value]) => {
    try {
      const data = JSON.parse(await fs.readFile(root + '/' + value.path, 'utf8'));
      return [name, data];
    } catch {
      return [name, null];
    }
  }));
  return Object.fromEntries(entries);
}

export async function main() {
  const report = buildWarRoom(await readInputs());
  await fs.mkdir('growth-reports', { recursive: true });
  const target = 'growth-reports/packzeno-revenue-warroom-cloud.json';
  await fs.writeFile(target, JSON.stringify(report, null, 2) + '\n', 'utf8');
  const summary = [
    '## PackZeno cloud war room candidate',
    '',
    '- Status: ' + report.summaryStatus,
    '- Original AGM task action inspected: **NO**',
    '- Original task schedule verified: **NO**',
    '- Exact task parity / retirement permission: **NO**',
    '- Public attention products: ' + (report.attentionCatalog.productCount ?? 'unknown'),
    '- Supplier data state: ' + report.sources.supplierReview.state,
    '- Worker-board state: ' + report.sources.workerBoard.state,
    '- Stored storefront check state: ' + report.sources.storefrontHealth.state,
    '- Verified sales or revenue: **NOT AVAILABLE**',
    '',
    'No PCs or private services were accessed. No sales, supplier orders, payments, messages, or posts were performed.',
  ].join('\n') + '\n';
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  process.stdout.write(summary);
  if (report.sourceExceptions.length) {
    process.stdout.write('Source exceptions: ' + JSON.stringify(report.sourceExceptions) + '\n');
  }
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error('PACKZENO_CLOUD_CANDIDATE_FAILED', error.message);
    process.exitCode = 1;
  });
}
