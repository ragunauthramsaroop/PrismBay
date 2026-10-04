import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from './server.mjs';

const WORKER_TOKEN = 'automation-worker-token-abcdefghijklmnopqrstuvwxyz-123456';

async function withServer(t, options, fn) {
  const logs = [];
  const server = createServer({
    secret: 'whsec_test_automation_handoff',
    ledger: { snapshot: () => ({ version: 1, events: {}, orders: {} }) },
    catalog: { accountId: 'acct_test' },
    live: false,
    logger: (line) => logs.push(String(line)),
    ...options
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const address = server.address();
  await fn(`http://127.0.0.1:${address.port}`, logs);
}

test('job handoff endpoints are hidden without the exact worker token', async (t) => {
  let leases = 0;
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    jobLeaseBroker: {
      leaseDue: async () => { leases += 1; return { recoveredExpiredLeases: 0, jobs: [] }; },
      acknowledge: async () => ({ ok: true })
    }
  }, async (base) => {
    const response = await fetch(`${base}/internal/automation/jobs/lease`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': 'wrong-token' },
      body: JSON.stringify({ limit: 1, leaseMs: 30000 })
    });
    assert.equal(response.status, 404);
    assert.equal(leases, 0);
  });
});

test('authorized lease returns de-identified execution payload and opaque lease only', async (t) => {
  const job = {
    id: 'auto_test_job',
    jobClass: 'email',
    operation: 'order_received',
    idempotencyKey: 'a'.repeat(64),
    state: 'running',
    attempt: 0,
    maxAttempts: 4,
    payload: {
      eventId: 'evt_test',
      recipientRef: 'recipient_00000000000000000000000000000001',
      orderRef: 'cs_test_123',
      productRef: 'crevice',
      trackingRef: null,
      refundAmountUsd: null,
      templateKind: 'order_received'
    },
    lease: {
      id: 'lease_worker_123',
      leasedAt: '2026-10-04T10:00:00.000Z',
      expiresAt: '2026-10-04T10:01:00.000Z'
    },
    resourceRef: 'checkout:cs_test_123:order_received',
    createdAt: '2026-10-04T09:59:00.000Z',
    updatedAt: '2026-10-04T10:00:00.000Z'
  };
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    jobLeaseBroker: {
      leaseDue: async ({ limit, leaseMs }) => {
        assert.equal(limit, 2);
        assert.equal(leaseMs, 30000);
        return { recoveredExpiredLeases: 1, jobs: [job] };
      },
      acknowledge: async () => ({ ok: true })
    }
  }, async (base, logs) => {
    const response = await fetch(`${base}/internal/automation/jobs/lease`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ limit: 2, leaseMs: 30000 })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.recoveredExpiredLeases, 1);
    assert.equal(body.jobs.length, 1);
    assert.equal(body.jobs[0].payload.recipientRef, job.payload.recipientRef);
    assert.equal(body.jobs[0].lease.id, 'lease_worker_123');
    assert.equal('resourceRef' in body.jobs[0], false);
    assert.equal('createdAt' in body.jobs[0], false);
    assert.equal(JSON.stringify(body).includes('@'), false);
    assert.equal(logs.some((line) => line.includes('automation_job_lease_ok')), true);
    assert.equal(logs.some((line) => line.includes('recipient_')), false);
  });
});

test('authorized acknowledgement returns only structured queue transition data', async (t) => {
  let ackInput = null;
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    jobLeaseBroker: {
      leaseDue: async () => ({ recoveredExpiredLeases: 0, jobs: [] }),
      acknowledge: async (input) => {
        ackInput = input;
        return { ok: true, jobId: input.jobId, state: 'completed', nextRunAt: null, reason: null };
      }
    }
  }, async (base, logs) => {
    const response = await fetch(`${base}/internal/automation/jobs/ack`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ jobId: 'auto_test_job', leaseId: 'lease_worker_123', outcome: { ok: true } })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      jobId: 'auto_test_job',
      state: 'completed',
      nextRunAt: null,
      reason: null
    });
    assert.deepEqual(ackInput, { jobId: 'auto_test_job', leaseId: 'lease_worker_123', outcome: { ok: true } });
    assert.equal(logs.some((line) => line.includes('automation_job_ack_ok')), true);
  });
});

test('stale acknowledgement is a conflict and does not leak worker data', async (t) => {
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    jobLeaseBroker: {
      leaseDue: async () => ({ recoveredExpiredLeases: 0, jobs: [] }),
      acknowledge: async () => ({ ok: false, reason: 'stale_or_mismatched_lease' })
    }
  }, async (base) => {
    const response = await fetch(`${base}/internal/automation/jobs/ack`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ jobId: 'auto_old_job', leaseId: 'lease_old', outcome: { ok: true } })
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { ok: false, reason: 'stale_or_mismatched_lease' });
  });
});
