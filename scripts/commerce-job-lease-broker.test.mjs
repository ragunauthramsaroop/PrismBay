import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { createJob } from './commerce-job-reliability.mjs';
import { FileJobStore } from './commerce-job-file-store.mjs';
import { automationWorkerTokenAuthorized, createJobLeaseBroker } from './commerce-job-lease-broker.mjs';

function emailJob(index, createdAt = '2026-10-04T10:00:00.000Z') {
  return createJob({
    id: `auto_job_${index}`,
    jobClass: 'email',
    operation: 'order_received',
    resourceRef: `checkout:cs_test_${index}:order_received`,
    payload: {
      eventId: `evt_${index}`,
      recipientRef: `recipient_${String(index).padStart(32, '0')}`,
      orderRef: `cs_test_${index}`,
      productRef: 'crevice',
      trackingRef: null,
      refundAmountUsd: null,
      templateKind: 'order_received'
    },
    createdAt
  });
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prismbay-job-handoff-'));
  const file = path.join(root, 'automation-jobs.json');
  const store = await new FileJobStore(file).load();
  t.after(async () => rm(root, { recursive: true, force: true }));
  return { root, file, store };
}

test('FileJobStore serializes concurrent durable enqueue operations', async (t) => {
  const { file, store } = await fixture(t);
  await Promise.all(Array.from({ length: 20 }, (_, index) => store.enqueue(emailJob(index))));
  await store.waitForWrites();
  assert.equal(store.list().length, 20);
  const reloaded = await new FileJobStore(file).load();
  assert.equal(reloaded.list().length, 20);
  assert.equal(new Set(reloaded.list().map((job) => job.idempotencyKey)).size, 20);
});

test('FileJobStore still rejects raw customer email in any queued payload', async (t) => {
  const { store } = await fixture(t);
  const job = emailJob(1);
  job.payload.customerEmail = 'buyer@example.com';
  await assert.rejects(() => store.enqueue(job), /raw_email_not_allowed_in_job_store/);
  assert.equal(store.list().length, 0);
});

test('lease broker leases due email jobs once and acknowledges completion', async (t) => {
  const { store } = await fixture(t);
  await store.enqueue(emailJob(1));
  let now = Date.parse('2026-10-04T10:00:10.000Z');
  let sequence = 0;
  const broker = createJobLeaseBroker({ store, nowMs: () => now, randomId: () => `worker_${++sequence}` });
  const first = await broker.leaseDue({ limit: 10, leaseMs: 30_000 });
  assert.equal(first.jobs.length, 1);
  assert.equal(first.jobs[0].state, 'running');
  assert.equal(first.jobs[0].lease.id, 'lease_worker_1');
  const second = await broker.leaseDue({ limit: 10, leaseMs: 30_000 });
  assert.equal(second.jobs.length, 0);
  const ack = await broker.acknowledge({
    jobId: first.jobs[0].id,
    leaseId: first.jobs[0].lease.id,
    outcome: { ok: true }
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.state, 'completed');
  assert.equal(store.get(first.jobs[0].id).lease, null);
});

test('concurrent lease calls never hand the same job to two workers', async (t) => {
  const { store } = await fixture(t);
  await store.enqueue(emailJob(1));
  let sequence = 0;
  const broker = createJobLeaseBroker({
    store,
    nowMs: () => Date.parse('2026-10-04T10:00:10.000Z'),
    randomId: () => `concurrent_${++sequence}`
  });
  const [left, right] = await Promise.all([
    broker.leaseDue({ limit: 1, leaseMs: 30_000 }),
    broker.leaseDue({ limit: 1, leaseMs: 30_000 })
  ]);
  assert.equal(left.jobs.length + right.jobs.length, 1);
});

test('expired email lease is recovered, re-leased and rejects the stale acknowledgement', async (t) => {
  const { store } = await fixture(t);
  await store.enqueue(emailJob(1));
  let now = Date.parse('2026-10-04T10:00:10.000Z');
  let sequence = 0;
  const broker = createJobLeaseBroker({ store, nowMs: () => now, randomId: () => `expiry_${++sequence}` });
  const first = await broker.leaseDue({ limit: 1, leaseMs: 5_000 });
  now += 5_001;
  const stale = await broker.acknowledge({ jobId: first.jobs[0].id, leaseId: first.jobs[0].lease.id, outcome: { ok: true } });
  assert.deepEqual(stale, { ok: false, reason: 'lease_expired' });
  const second = await broker.leaseDue({ limit: 1, leaseMs: 5_000 });
  assert.equal(second.recoveredExpiredLeases, 1);
  assert.equal(second.jobs.length, 1);
  assert.notEqual(second.jobs[0].lease.id, first.jobs[0].lease.id);
  const oldAck = await broker.acknowledge({ jobId: first.jobs[0].id, leaseId: first.jobs[0].lease.id, outcome: { ok: true } });
  assert.deepEqual(oldAck, { ok: false, reason: 'stale_or_mismatched_lease' });
});

test('known transient worker failure follows canonical retry backoff', async (t) => {
  const { store } = await fixture(t);
  await store.enqueue(emailJob(1));
  const now = Date.parse('2026-10-04T10:00:10.000Z');
  const broker = createJobLeaseBroker({ store, nowMs: () => now, randomId: () => 'transient' });
  const leased = await broker.leaseDue({ limit: 1, leaseMs: 30_000 });
  const ack = await broker.acknowledge({
    jobId: leased.jobs[0].id,
    leaseId: leased.jobs[0].lease.id,
    outcome: { ok: false, errorCode: 'provider_temporarily_unavailable', httpStatus: 503, outcomeKnown: true }
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.state, 'delayed');
  assert.equal(store.get(leased.jobs[0].id).attempt, 1);
});

test('unknown worker outcome fails closed instead of blind retry', async (t) => {
  const { store } = await fixture(t);
  await store.enqueue(emailJob(1));
  const now = Date.parse('2026-10-04T10:00:10.000Z');
  const broker = createJobLeaseBroker({ store, nowMs: () => now, randomId: () => 'unknown' });
  const leased = await broker.leaseDue({ limit: 1, leaseMs: 30_000 });
  const ack = await broker.acknowledge({
    jobId: leased.jobs[0].id,
    leaseId: leased.jobs[0].lease.id,
    outcome: { ok: false, errorCode: 'automation_email_sender_unknown_outcome', outcomeKnown: false }
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.state, 'dead_letter');
  assert.equal(store.get(leased.jobs[0].id).deadLetterReason, 'unclassified_fail_closed');
});

test('worker token authorization requires a long exact token', () => {
  const workerToken = 'automation-worker-token-abcdefghijklmnopqrstuvwxyz-123456';
  assert.equal(automationWorkerTokenAuthorized(workerToken, workerToken), true);
  assert.equal(automationWorkerTokenAuthorized(workerToken, `${workerToken}x`), false);
  assert.equal(automationWorkerTokenAuthorized('short', 'short'), false);
});
