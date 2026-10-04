import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateTasks } from './autonomous-company-task-allocator.mjs';

function fixture() {
  return {
    growthBoard: {
      primaryProduct: 'crevice',
      recoverySprints: [
        { companyId: 'offer-engineering', currentScore: 20, band: 'critical', evidenceTargets: ['offer_variant_inventory'], supportingCompanies: ['revenue-analytics'] },
        { companyId: 'supplier-fulfillment', currentScore: 60, band: 'red', evidenceTargets: ['supplier_count'], supportingCompanies: ['commerce-control'] },
      ],
      evidenceDebt: [
        { companyId: 'offer-engineering', evidenceGap: 'offer_variant_inventory' },
        { companyId: 'storefront-conversion', evidenceGap: 'buyer_path_breakage_count' },
      ],
      productRace: [
        { slug: 'crevice', source: 'promotion-readiness' },
        { slug: 'toilet-scrubber-kit', source: 'global-opportunity' },
        { slug: 'microfiber-car-detailing-cloths', source: 'global-opportunity' },
        { slug: 'car-seat-headrest-hooks', source: 'global-opportunity' },
        { slug: 'knife-cleaning-brush', source: 'global-opportunity' },
      ],
      factories: {
        offerFactory: { requiredOutput: 3 },
        creativeFactory: { requiredOutput: 5 },
        croFactory: { requiredOutput: 3 },
      },
      blockerEscalation: { stage: 'replace-route' },
      portfolioControls: { criticalCompanies: ['offer-engineering'], redCompanies: ['supplier-fulfillment'], parallelRouteDeficit: 2 },
    },
    dashboard: { firstSaleWarRoom: { closestProduct: 'crevice' } },
    strategyBoard: { acquisitionPaths: ['seo', 'google-free', 'pinterest', 'tiktok-affiliate', 'marketplace', 'creator-affiliate'] },
    opportunities: {},
    promotion: { promotionEligibleCount: 0 },
  };
}

test('allocates active measurable work to all ten specialist companies', () => {
  const board = allocateTasks(fixture());
  assert.equal(board.activeCompanies, 10);
  assert.equal(Object.keys(board.companies).length, 10);
  for (const tasks of Object.values(board.companies)) assert.ok(tasks.length >= 1);
});

test('critical KPI failure becomes priority-one recovery work with evidence', () => {
  const board = allocateTasks(fixture());
  const recovery = board.companies['offer-engineering'].find(row => row.title.includes('Recover'));
  assert.equal(recovery.priority, 1);
  assert.ok(recovery.evidenceRequired.includes('offer_variant_inventory'));
});

test('creates quantified offer, creative and CRO factories', () => {
  const board = allocateTasks(fixture());
  assert.equal(board.companies['offer-engineering'].filter(row => row.title.includes('offer hypothesis')).length, 3);
  assert.equal(board.companies['creative-studio'].filter(row => row.title.includes('creative concept')).length, 5);
  assert.equal(board.companies['storefront-conversion'].filter(row => row.title.includes('CRO hypothesis')).length, 3);
});

test('keeps external channels in preparation mode before product readiness', () => {
  const board = allocateTasks(fixture());
  const channelTasks = board.companies['organic-growth'].filter(row => row.title.includes('channel'));
  assert.equal(channelTasks.length, 6);
  assert.ok(channelTasks.every(row => row.title.startsWith('Prepare')));
});

const observedAt = Date.parse('2026-10-04T20:00:00Z');
function observation() {
  return { origin: 'https://clean.prismbayai.com', checkedAt: new Date(observedAt).toISOString(),
    checks: ['/', 'catalog-data.js', 'catalog-ui.js', 'catalog-store.css'].map(resource => ({ resource, ok: true, status: 200 })) };
}
function storefrontTasks(storefront) {
  return allocateTasks({ ...fixture(), storefront }, observedAt).tasks.filter(row => row.title.includes('Clean storefront'));
}
test('missing and stale storefront evidence creates an explicit priority-one assignment', () => {
  assert.equal(storefrontTasks(undefined)[0].priority, 1);
  assert.equal(storefrontTasks({ ...observation(), checkedAt: '2026-10-03T20:00:00Z' })[0].context.observationStatus, 'missing_stale_or_invalid');
});
test('fresh healthy storefront observation creates no repair work', () => {
  assert.equal(storefrontTasks(observation()).length, 0);
});
test('delivery failure is assigned with evidence and stable identity', () => {
  const report = observation(); report.checks[1].ok = false; report.checks[1].status = 404;
  const tasks = storefrontTasks(report);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].companyId, 'storefront-conversion');
  assert.match(tasks[0].evidenceRequired[0], /404/);
  assert.equal(tasks[0].id, storefrontTasks(report)[0].id);
  assert.equal(tasks[0].context.productionChangeRequiresApproval, true);
});
test('wrong origin, incomplete and future evidence never receive healthy credit', () => {
  for (const report of [{ ...observation(), origin: 'https://example.com' }, { ...observation(), checks: [] }, { ...observation(), checkedAt: '2026-10-05T20:00:00Z' }]) {
    assert.equal(storefrontTasks(report)[0].context.observationStatus, 'missing_stale_or_invalid');
  }
});
