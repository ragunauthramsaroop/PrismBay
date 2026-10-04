import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from './server.mjs';
import { openRecipientEnvelope } from '../../scripts/automation-recipient-envelope.mjs';

const WORKER_TOKEN = 'automation-worker-token-abcdefghijklmnopqrstuvwxyz-123456';
const ENVELOPE_KEY = '99'.repeat(32);
const RECIPIENT_REF = `recipient_${'b'.repeat(32)}`;
const JOB = Object.freeze({
  id: 'auto_envelope_job_001',
  jobClass: 'email',
  operation: 'shipped',
  idempotencyKey: 'c'.repeat(64),
  state: 'running',
  payload: {
    eventId: 'evt_envelope_001',
    recipientRef: RECIPIENT_REF,
    orderRef: 'cs_test_envelope_001',
    productRef: 'crevice',
    trackingRef: 'carrier-evidence-001',
    refundAmountUsd: null,
    templateKind: 'shipped'
  },
  lease: {
    id: 'lease_envelope_001',
    leasedAt: '2026-10-04T10:00:00.000Z',
    expiresAt: '2026-10-04T10:01:00.000Z'
  }
});

async function withServer(t, options, fn) {
  const logs = [];
  const server = createServer({
    secret: 'whsec_test_recipient_envelope',
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

function brokerFor(job = JOB) {
  return {
    leaseDue: async () => ({ recoveredExpiredLeases: 0, jobs: [] }),
    acknowledge: async () => ({ ok: true }),
    withActiveLease: async ({ jobId, leaseId }, fn) => {
      if (jobId !== job.id || leaseId !== job.lease.id) return { ok: false, reason: 'stale_or_mismatched_lease' };
      return { ok: true, value: await fn(structuredClone(job)) };
    }
  };
}

test('recipient envelope endpoint is hidden without exact worker authorization', async (t) => {
  let resolves = 0;
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    automationWorkerEnvelopeKey: ENVELOPE_KEY,
    jobLeaseBroker: brokerFor(),
    automationRecipientResolver: async () => { resolves += 1; return null; }
  }, async (base) => {
    const response = await fetch(`${base}/internal/automation/jobs/recipient-envelope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': 'wrong-token' },
      body: JSON.stringify({ jobId: JOB.id, leaseId: JOB.lease.id })
    });
    assert.equal(response.status, 404);
    assert.equal(resolves, 0);
  });
});

test('authorized active lease receives encrypted state with no plaintext customer email', async (t) => {
  const state = {
    recipientRef: RECIPIENT_REF,
    email: 'buyer@example.com',
    suppressed: false,
    transactionalAllowed: true,
    marketingConsent: false,
    deliveryVerified: true,
    productName: 'Crevice Brush',
    trackingUrl: 'https://carrier.example/track/PB1001',
    supportUrl: null,
    reviewUrl: null,
    storefrontUrl: 'https://clean.prismbayai.com/'
  };
  let lookup = null;
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    automationWorkerEnvelopeKey: ENVELOPE_KEY,
    jobLeaseBroker: brokerFor(),
    automationRecipientResolver: async (input) => { lookup = input; return state; }
  }, async (base, logs) => {
    const response = await fetch(`${base}/internal/automation/jobs/recipient-envelope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ jobId: JOB.id, leaseId: JOB.lease.id, recipientRef: 'caller_must_not_control_this' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes('buyer@example.com'), false);
    assert.equal(serialized.includes('@'), false);
    assert.deepEqual(lookup, {
      recipientRef: JOB.payload.recipientRef,
      orderRef: JOB.payload.orderRef,
      eventId: JOB.payload.eventId,
      templateKind: JOB.payload.templateKind
    });
    const opened = openRecipientEnvelope({
      jobId: JOB.id,
      leaseId: JOB.lease.id,
      envelope: body.envelope,
      secret: ENVELOPE_KEY
    });
    assert.equal(opened.email, 'buyer@example.com');
    assert.equal(opened.recipientRef, RECIPIENT_REF);
    assert.equal(logs.some((line) => line.includes('buyer@example.com')), false);
    assert.equal(logs.some((line) => line.includes('automation_recipient_envelope_ok')), true);
  });
});

test('stale lease is rejected before recipient resolution', async (t) => {
  let resolves = 0;
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    automationWorkerEnvelopeKey: ENVELOPE_KEY,
    jobLeaseBroker: brokerFor(),
    automationRecipientResolver: async () => { resolves += 1; return null; }
  }, async (base) => {
    const response = await fetch(`${base}/internal/automation/jobs/recipient-envelope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ jobId: JOB.id, leaseId: 'lease_stale' })
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { ok: false, reason: 'stale_or_mismatched_lease' });
    assert.equal(resolves, 0);
  });
});

test('recipient reference mismatch fails closed and does not return plaintext state', async (t) => {
  await withServer(t, {
    automationWorkerToken: WORKER_TOKEN,
    automationWorkerEnvelopeKey: ENVELOPE_KEY,
    jobLeaseBroker: brokerFor(),
    automationRecipientResolver: async () => ({
      recipientRef: `recipient_${'d'.repeat(32)}`,
      email: 'other@example.com',
      suppressed: false,
      transactionalAllowed: true,
      marketingConsent: false,
      deliveryVerified: false
    })
  }, async (base) => {
    const response = await fetch(`${base}/internal/automation/jobs/recipient-envelope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-automation-worker-token': WORKER_TOKEN },
      body: JSON.stringify({ jobId: JOB.id, leaseId: JOB.lease.id })
    });
    assert.equal(response.status, 409);
    const text = await response.text();
    assert.equal(text.includes('other@example.com'), false);
    assert.deepEqual(JSON.parse(text), { error: 'recipient_reference_mismatch' });
  });
});
