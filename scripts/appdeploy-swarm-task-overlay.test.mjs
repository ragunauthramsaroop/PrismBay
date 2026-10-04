import test from 'node:test';
import assert from 'node:assert/strict';
import { applySwarmVerification } from './appdeploy-swarm-task-overlay.mjs';

function board() {
  const existing = {
    id: 'commerce-control:existing-control-task',
    companyId: 'commerce-control',
    priority: 2,
    status: 'active',
    title: 'Existing control task',
  };
  return {
    totalTasks: 1,
    tasks: [existing],
    companies: { 'commerce-control': [existing] },
    recoveryCoverage: { 'commerce-control': { taskCount: 1 } },
  };
}

test('adds priority-one recovery when backend execution is not independently verified', () => {
  const next = applySwarmVerification(board(), {
    checkedAt: '2026-10-04T21:40:00Z',
    healthy: false,
    executionVerified: false,
    observedWorkers: 6,
    expectedWorkers: 6,
    reasons: ['worker_no_output_evidence:product-scout'],
  });
  assert.equal(next.totalTasks, 2);
  const task = next.tasks.find(row => row.id === 'commerce-control:restore-verifiable-backend-swarm-execution');
  assert.equal(task.priority, 1);
  assert.ok(task.evidenceRequired.some(value => value.includes('product-scout')));
  assert.match(task.doneWhen, /Cron invocation status alone is not completion evidence/);
});

test('does not create false recovery work when fresh worker execution evidence is healthy', () => {
  const next = applySwarmVerification(board(), {
    checkedAt: '2026-10-04T21:40:00Z',
    healthy: true,
    executionVerified: true,
    observedWorkers: 6,
    expectedWorkers: 6,
    reasons: [],
  });
  assert.equal(next.totalTasks, 1);
  assert.equal(next.backendSwarmVerification.executionVerified, true);
  assert.equal(next.tasks.some(row => row.id === 'commerce-control:restore-verifiable-backend-swarm-execution'), false);
});

test('missing verification fails closed into explicit recovery work', () => {
  const next = applySwarmVerification(board(), null);
  const task = next.tasks.find(row => row.id === 'commerce-control:restore-verifiable-backend-swarm-execution');
  assert.ok(task);
  assert.ok(task.context.reasons.includes('verification_missing'));
});
