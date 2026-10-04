import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { FileJobStore } from './commerce-job-file-store.mjs';
import {
  enqueueAutomationEvent,
  processDueJobs,
  replayDeadLetter,
  routeCommerceEvent,
  validateAutomationEvent
} from './commerce-automation-runtime.mjs';

const baseEvent = Object.freeze({
  eventId: 'evt_auto_123456',
  resourceRef: 'order:PB-1001',
  recipientRef: 'recipient_abcdef123456',
  orderRef: 'PB-1001',
  productRef: 'crevice',
  occurredAt: '2026-10-04T03:00:00.000Z',
  consent: true,
  deliveryVerified: false
});

async function storeFor(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prismbay-auto-'));
  t.after(async () => fs.rm(dir, { recursive: true, force: true }));
  return new FileJobStore(path.join(dir, 'jobs.json')).load();
}

test('abandonment fails closed without consent', () => {
  const result = validateAutomationEvent({ ...baseEvent, type: 'checkout_abandoned', consent: false });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('consent_required_for_abandonment'));
});

test('verified delivery creates delivered now and delayed review job', () => {
  const result = routeCommerceEvent({ ...baseEvent, type: 'delivery_confirmed', deliveryVerified: true });
  assert.equal(result.accepted, true);
  assert.equal(result.jobs.length, 2);
  const delivered = result.jobs.find((job) => job.operation === 'delivered');
  const review = result.jobs.find((job) => job.operation === 'review_request');
  assert.equal(delivered.state, 'queued');
  assert.equal(review.state, 'delayed');
  assert.equal(Date.parse(review.nextRunAt) - Date.parse(baseEvent.occurredAt), 7 * 24 * 60 * 60 * 1000);
});

test('file store persists idempotency across reloads', async (t) => {
  const store = await storeFor(t);
  const first = await enqueueAutomationEvent(store, { ...baseEvent, type: 'payment_completed' });
  assert.equal(first.enqueued[0].inserted, true);
  const reloaded = await new FileJobStore(store.filePath).load();
  const duplicate = await enqueueAutomationEvent(reloaded, { ...baseEvent, type: 'payment_completed' });
  assert.equal(duplicate.enqueued[0].inserted, false);
});

test('file store rejects raw customer email data', async (t) => {
  const store = await storeFor(t);
  await assert.rejects(() => store.enqueue({
    id: 'job-1',
    idempotencyKey: 'idem-1',
    state: 'queued',
    payload: { email: 'buyer@example.com' }
  }), /raw_email_not_allowed_in_job_store/);
});

test('processor does nothing when no handler is configured', async (t) => {
  const store = await storeFor(t);
  const routed = await enqueueAutomationEvent(store, { ...baseEvent, type: 'order_processing' });
  const jobId = routed.jobs[0].id;
  const result = await processDueJobs(store, {}, { nowMs: Date.parse('2026-10-04T03:05:00.000Z') });
  assert.equal(result.results[0].status, 'skipped');
  assert.equal(store.get(jobId).state, 'queued');
});

test('successful injected email handler completes the job', async (t) => {
  const store = await storeFor(t);
  const routed = await enqueueAutomationEvent(store, { ...baseEvent, type: 'order_processing' });
  const jobId = routed.jobs[0].id;
  const result = await processDueJobs(store, { email: async () => ({ ok: true }) }, { nowMs: Date.parse('2026-10-04T03:05:00.000Z') });
  assert.equal(result.results[0].status, 'completed');
  assert.equal(store.get(jobId).state, 'completed');
});

test('transient handler failure is delayed instead of duplicated', async (t) => {
  const store = await storeFor(t);
  const routed = await enqueueAutomationEvent(store, { ...baseEvent, type: 'shipment_update', trackingRef: 'tracking:PB1001' });
  const jobId = routed.jobs[0].id;
  const result = await processDueJobs(store, { email: async () => ({ ok: false, errorCode: 'temporary_provider_error', httpStatus: 503, outcomeKnown: true }) }, { nowMs: Date.parse('2026-10-04T03:05:00.000Z') });
  assert.equal(result.results[0].status, 'delayed');
  assert.equal(store.get(jobId).attempt, 1);
});

test('manual replay requires explicit approval', async (t) => {
  const store = await storeFor(t);
  const routed = await enqueueAutomationEvent(store, { ...baseEvent, type: 'refund_processed', refundAmountUsd: 12.95 });
  const job = routed.jobs[0];
  await store.put({ ...job, state: 'dead_letter', nextRunAt: null, deadLetterReason: 'manual_review' });
  assert.deepEqual(await replayDeadLetter(store, job.id, {}), { ok: false, reason: 'explicit_replay_approval_required' });
  const replayed = await replayDeadLetter(store, job.id, { explicit: true, approvedBy: 'owner' });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.job.state, 'queued');
});
