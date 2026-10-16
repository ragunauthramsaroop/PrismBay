import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWarRoom, readInputs } from './packzeno-warroom-cloud.mjs';

const nowMs = Date.parse('2026-09-27T18:00:00Z');
const iso = '2026-09-27T17:30:00Z';
const fixture = () => ({
  catalog: { updatedAt: iso, products: [{ slug: 'product-a' }], secret: 'must-never-appear' },
  candidates: { updatedAt: iso, candidates: [{ slug: 'candidate-a' }] },
  supplierReview: {
    checkedAt: iso, independentProductMatches: 1, verifiedVariantCount: 1,
    countryFreightEstimateCount: 0, saleReadyCount: 0, privateToken: 'must-never-appear',
  },
  workerBoard: { generatedAt: iso, tasks: [{ state: 'review_required' }, { state: 'scheduled' }] },
  storefrontHealth: { checkedAt: iso, status: 'PASS' },
});

test('fresh public inputs produce a review-only summary, never revenue evidence', () => {
  const report = buildWarRoom(fixture(), nowMs);
  assert.equal(report.summaryStatus, 'public_data_current');
  assert.equal(report.attentionCatalog.productCount, 1);
  assert.equal(report.workerAssignments.reviewRequired, 1);
  assert.equal(report.verifiedSales.revenueUSD, null);
  assert.equal(report.verifiedSales.orderCount, null);
  assert.equal(report.parity.approvedForAGMLaptopRetirement, false);
  assert.deepEqual(Object.values(report.automatedSideEffects), Array(6).fill(false));
  assert.ok(!JSON.stringify(report).includes('must-never-appear'));
});

test('missing or stale inputs are called out instead of treated as current', () => {
  const inputs = fixture();
  inputs.catalog.updatedAt = '2026-09-20T00:00:00Z';
  inputs.supplierReview = null;
  const report = buildWarRoom(inputs, nowMs);
  assert.equal(report.summaryStatus, 'source_review_required');
  assert.equal(report.sources.catalog.state, 'stale');
  assert.equal(report.sources.supplierReview.state, 'missing');
  assert.equal(report.supplierChecks.independentProductMatches, null);
});

test('future timestamps and invalid supplier counts are not accepted as evidence', () => {
  const inputs = fixture();
  inputs.workerBoard.generatedAt = '2030-01-01T00:00:00Z';
  inputs.supplierReview.verifiedVariantCount = -9;
  const report = buildWarRoom(inputs, nowMs);
  assert.equal(report.sources.workerBoard.state, 'future_timestamp');
  assert.equal(report.supplierChecks.verifiedVariantCount, null);
});

test('readInputs handles absent source files without contacting any external system', async () => {
  const result = await readInputs('/nonexistent-packzeno-cloud-test-directory');
  assert.deepEqual(Object.values(result), Array(5).fill(null));
});
