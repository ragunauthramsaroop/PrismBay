import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { createJob } from './commerce-job-reliability.mjs';
import { FileJobStore } from './commerce-job-file-store.mjs';
import { createJobLeaseBroker } from './commerce-job-lease-broker.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prismbay-active-lease-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const store = await new FileJobStore(path.join(root, 'jobs.json')).load();
  await store.enqueue(createJob({
    id: 'auto_active_lease_001',
    jobClass: 'email',
    operation: 'shipped',
    resourceRef: 'checkout:cs_test_active:shipped',
    payload: {
      eventId: 'evt_active_001',
      recipientRef: `recipient_${'e'.repeat(32)}`,
      orderRef: 'cs_test_active',
      productRef: 'crevice',
      trackingRef: 'carrier-evidence-001',
      refundAmountUsd: null,
      templateKind: 'shipped'
    },
    createdAt: '2026-10-04T10:00:00.000Z'
  }));
  return store;
}

test('sensitive callback runs only while the exact lease is active', async (t) => {
  const store = await fixture(t);
  let now = Date.parse('2026-10-04T10:00:10.000Z');
  const broker = createJobLeaseBroker({ store, nowMs: () => now, randomId: () => 'sensitive_001' });
  const leased = await broker.leaseDue({ limit: 1, leaseMs: 5000 });
  const job = leased.jobs[0];
  let calls = 0;
  const active = await broker.withActiveLease({ jobId: job.id, leaseId: job.lease.id }, async (current) => {
    calls += 1;
    return { recipientRef: current.payload.recipientRef };
  });
  assert.equal(active.ok, true);
  assert.equal(active.value.recipientRef, job.payload.recipientRef);
  assert.equal(calls, 1);

  const wrong = await broker.withActiveLease({ jobId: job.id, leaseId: 'lease_wrong' }, async () => {
    calls += 1;
    return {};
  });
  assert.deepEqual(wrong, { ok: false, reason: 'stale_or_mismatched_lease' });
  assert.equal(calls, 1);

  now += 5001;
  const expired = await broker.withActiveLease({ jobId: job.id, leaseId: job.lease.id }, async () => {
    calls += 1;
    return {};
  });
  assert.deepEqual(expired, { ok: false, reason: 'lease_expired' });
  assert.equal(calls, 1);
});
