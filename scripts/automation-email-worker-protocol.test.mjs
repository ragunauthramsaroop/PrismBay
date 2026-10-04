import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomationEmailWorkerClient, runAutomationEmailWorkerBatch } from './automation-email-worker-protocol.mjs';
import { sealRecipientEnvelope } from './automation-recipient-envelope.mjs';

const WORKER_TOKEN = 'automation-worker-token-abcdefghijklmnopqrstuvwxyz-123456';
const ENVELOPE_KEY = 'aa'.repeat(32);
const JOB = Object.freeze({
  schemaVersion: 1,
  id: 'auto_worker_001',
  jobClass: 'email',
  operation: 'order_received',
  resourceRef: 'checkout:cs_test_worker:order_received',
  idempotencyKey: 'f'.repeat(64),
  state: 'running',
  attempt: 0,
  maxAttempts: 4,
  nextRunAt: '2026-10-04T11:00:00.000Z',
  lastErrorCode: null,
  deadLetterReason: null,
  createdAt: '2026-10-04T11:00:00.000Z',
  updatedAt: '2026-10-04T11:00:01.000Z',
  payload: {
    eventId: 'evt_worker_001',
    recipientRef: `recipient_${'c'.repeat(32)}`,
    orderRef: 'cs_test_worker',
    productRef: 'crevice',
    trackingRef: null,
    refundAmountUsd: null,
    templateKind: 'order_received'
  },
  lease: {
    id: 'lease_worker_001',
    expiresAt: '2026-10-04T11:05:00.000Z'
  }
});
const RECIPIENT = Object.freeze({
  recipientRef: JOB.payload.recipientRef,
  email: 'buyer@example.com',
  suppressed: false,
  transactionalAllowed: true,
  marketingConsent: false,
  deliveryVerified: false,
  productName: 'Crevice Brush',
  trackingUrl: null,
  supportUrl: null,
  reviewUrl: null,
  storefrontUrl: 'https://clean.prismbayai.com/'
});

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => structuredClone(body) };
}

function protocolFetch({ recipient = RECIPIENT, ackState = 'completed', failEnvelope = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options: structuredClone(options) });
    const path = new URL(url).pathname;
    const body = JSON.parse(options.body);
    if (path.endsWith('/lease')) return response(200, { recoveredExpiredLeases: 0, jobs: [JOB] });
    if (path.endsWith('/recipient-envelope')) {
      if (failEnvelope) return response(503, { error: 'recipient_state_unavailable' });
      const envelope = sealRecipientEnvelope({ jobId: body.jobId, leaseId: body.leaseId, recipientState: recipient, secret: ENVELOPE_KEY });
      return response(200, { jobId: body.jobId, leaseId: body.leaseId, envelope });
    }
    if (path.endsWith('/ack')) return response(200, { ok: true, jobId: body.jobId, state: ackState, nextRunAt: null, reason: null });
    return response(404, { error: 'not_found' });
  };
  return { calls, fetchImpl };
}

test('worker requires HTTPS outside localhost and accepts local development HTTP', () => {
  assert.throws(
    () => createAutomationEmailWorkerClient({ baseUrl: 'http://orders.example.com', workerToken: WORKER_TOKEN, envelopeKey: ENVELOPE_KEY, fetchImpl: async () => {} }),
    /requires_https/,
  );
  assert.doesNotThrow(() => createAutomationEmailWorkerClient({ baseUrl: 'http://127.0.0.1:3001', workerToken: WORKER_TOKEN, envelopeKey: ENVELOPE_KEY, fetchImpl: async () => {} }));
});

test('worker leases, decrypts recipient locally and acknowledges only after executor success', async () => {
  const fake = protocolFetch();
  const client = createAutomationEmailWorkerClient({
    baseUrl: 'https://orders.example.com',
    workerToken: WORKER_TOKEN,
    envelopeKey: ENVELOPE_KEY,
    fetchImpl: fake.fetchImpl,
    limit: 1,
    leaseMs: 30000
  });
  let execution = null;
  const result = await runAutomationEmailWorkerBatch({
    client,
    execute: async (job, state) => {
      execution = { job, state };
      return { ok: true, outcomeKnown: true };
    }
  });
  assert.equal(result.leased, 1);
  assert.equal(result.results[0].status, 'completed');
  assert.equal(execution.state.email, 'buyer@example.com');
  assert.equal(execution.job.payload.recipientRef, RECIPIENT.recipientRef);
  assert.equal(fake.calls.length, 3);
  assert.deepEqual(fake.calls.map((call) => new URL(call.url).pathname), [
    '/internal/automation/jobs/lease',
    '/internal/automation/jobs/recipient-envelope',
    '/internal/automation/jobs/ack'
  ]);
  assert.equal(fake.calls.every((call) => call.options.headers['x-automation-worker-token'] === WORKER_TOKEN), true);
  assert.equal(fake.calls.some((call) => String(call.options.body).includes('buyer@example.com')), false);
});

test('recipient handoff failure never invokes executor and is acknowledged as known pre-send failure', async () => {
  const fake = protocolFetch({ failEnvelope: true, ackState: 'delayed' });
  const client = createAutomationEmailWorkerClient({
    baseUrl: 'https://orders.example.com',
    workerToken: WORKER_TOKEN,
    envelopeKey: ENVELOPE_KEY,
    fetchImpl: fake.fetchImpl
  });
  let executions = 0;
  const result = await runAutomationEmailWorkerBatch({
    client,
    execute: async () => { executions += 1; return { ok: true }; }
  });
  assert.equal(executions, 0);
  assert.equal(result.results[0].phase, 'recipient');
  const ackBody = JSON.parse(fake.calls.at(-1).options.body);
  assert.equal(ackBody.outcome.ok, false);
  assert.equal(ackBody.outcome.outcomeKnown, true);
  assert.equal(ackBody.outcome.errorCode, 'recipient_handoff_unavailable');
});

test('executor exception is acknowledged as unknown outcome so queue fails closed', async () => {
  const fake = protocolFetch({ ackState: 'dead_letter' });
  const client = createAutomationEmailWorkerClient({
    baseUrl: 'https://orders.example.com',
    workerToken: WORKER_TOKEN,
    envelopeKey: ENVELOPE_KEY,
    fetchImpl: fake.fetchImpl
  });
  const result = await runAutomationEmailWorkerBatch({
    client,
    execute: async () => { throw new Error('do not leak me'); }
  });
  assert.equal(result.results[0].status, 'dead_letter');
  const ackBody = JSON.parse(fake.calls.at(-1).options.body);
  assert.equal(ackBody.outcome.outcomeKnown, false);
  assert.equal(ackBody.outcome.errorCode, 'automation_email_worker_exception');
  assert.equal(JSON.stringify(ackBody).includes('do not leak me'), false);
});

test('recipient envelope identity mismatch is rejected before execution', async () => {
  const fake = protocolFetch({ recipient: { ...RECIPIENT, recipientRef: `recipient_${'d'.repeat(32)}` }, ackState: 'delayed' });
  const client = createAutomationEmailWorkerClient({
    baseUrl: 'https://orders.example.com',
    workerToken: WORKER_TOKEN,
    envelopeKey: ENVELOPE_KEY,
    fetchImpl: fake.fetchImpl
  });
  let executions = 0;
  const result = await runAutomationEmailWorkerBatch({
    client,
    execute: async () => { executions += 1; return { ok: true }; }
  });
  assert.equal(executions, 0);
  assert.equal(result.results[0].phase, 'recipient');
});
