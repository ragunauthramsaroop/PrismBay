import test from 'node:test';
import assert from 'node:assert/strict';
import { observeSwarm, REQUIRED_WORKERS, verifySwarmStatus } from './appdeploy-swarm-verifier.mjs';

const now = Date.parse('2026-10-04T21:40:00Z');
function healthyPayload() {
  return {
    status: 'ok',
    mode: 'backend-swarm-24x7',
    workerCount: REQUIRED_WORKERS.length,
    activeWorkerCount: REQUIRED_WORKERS.length,
    totalRuns: 48,
    verifiedSales: 0,
    controllerFocus: 'Close evidence gaps without bypassing commercial gates.',
    lastUpdatedAt: '2026-10-04T21:35:00Z',
    workers: REQUIRED_WORKERS.map((id, index) => ({
      id,
      status: 'ok',
      runs: 8 + index,
      lastRunAt: '2026-10-04T21:30:00Z',
      kpiScore: 82,
      kpiBand: 'yellow',
      lastInspectionCount: 3,
      lastActionCount: 2,
      consecutiveMisses: 0,
      interventionRequired: false,
      roleRewriteRequired: false,
    })),
  };
}

test('verifies fresh persisted work for all six backend workers', () => {
  const result = verifySwarmStatus(healthyPayload(), { now });
  assert.equal(result.executionVerified, true);
  assert.equal(result.healthy, true);
  assert.equal(result.observedWorkers, 6);
  assert.equal(result.reasons.length, 0);
});

test('does not confuse cron invocation with completed worker output', () => {
  const payload = healthyPayload();
  payload.workers[1].lastInspectionCount = 0;
  payload.workers[1].lastActionCount = 0;
  const result = verifySwarmStatus(payload, { now });
  assert.equal(result.executionVerified, false);
  assert.equal(result.healthy, false);
  assert.ok(result.reasons.includes('worker_no_output_evidence:product-scout'));
});

test('surfaces worker errors and stale state instead of treating the endpoint as healthy', () => {
  const payload = healthyPayload();
  payload.lastUpdatedAt = '2026-10-04T17:00:00Z';
  payload.workers[2].status = 'error';
  payload.workers[2].lastRunAt = '2026-10-04T17:00:00Z';
  const result = verifySwarmStatus(payload, { now });
  assert.equal(result.healthy, false);
  assert.ok(result.reasons.includes('swarm_state_stale'));
  assert.ok(result.reasons.includes('worker_stale:site-auditor'));
  assert.ok(result.reasons.includes('worker_status_error:site-auditor'));
});

test('rejects an HTML fallback even when HTTP status is 200', async () => {
  const response = {
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => '<!doctype html><title>fallback</title>',
  };
  const report = await observeSwarm(async () => response, now);
  assert.equal(report.reachable, true);
  assert.equal(report.executionVerified, false);
  assert.ok(report.reasons.includes('non_json_response'));
});

test('accepts a JSON endpoint only after validating the worker receipts inside it', async () => {
  const response = {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json; charset=utf-8' },
    text: async () => JSON.stringify(healthyPayload()),
  };
  const report = await observeSwarm(async () => response, now);
  assert.equal(report.reachable, true);
  assert.equal(report.executionVerified, true);
  assert.equal(report.healthy, true);
});
