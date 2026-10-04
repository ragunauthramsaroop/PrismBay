import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryJobStore,
  classifyFailure,
  computeBackoffMs,
  createIdempotencyKey,
  createJob,
  markCompleted,
  markRunning,
  transitionAfterFailure
} from './commerce-job-reliability.mjs';

test('idempotency key is stable for the same logical operation', () => {
  const a = createIdempotencyKey({ jobClass: 'email', operation: 'order_status', resourceRef: 'order-1' });
  const b = createIdempotencyKey({ jobClass: 'email', operation: 'order_status', resourceRef: 'order-1' });
  assert.equal(a, b);
});

test('store suppresses duplicate logical jobs', () => {
  const store = new InMemoryJobStore();
  const first = createJob({ id: 'a', jobClass: 'email', operation: 'order_status', resourceRef: 'order-1' });
  const second = createJob({ id: 'b', jobClass: 'email', operation: 'order_status', resourceRef: 'order-1' });
  assert.equal(store.enqueue(first).inserted, true);
  const duplicate = store.enqueue(second);
  assert.equal(duplicate.inserted, false);
  assert.equal(duplicate.duplicateOf, 'a');
});

test('transient HTTP failures are retryable', () => {
  assert.equal(classifyFailure({ jobClass: 'email', errorCode: 'upstream', httpStatus: 503 }).retryable, true);
  assert.equal(classifyFailure({ jobClass: 'supplier_read', errorCode: 'rate_limit', httpStatus: 429 }).retryable, true);
});

test('uncertain supplier order is never auto-retried', () => {
  const result = classifyFailure({ jobClass: 'supplier_order', errorCode: 'network_timeout', outcomeKnown: false });
  assert.equal(result.retryable, false);
  assert.equal(result.uncertain, true);
  assert.equal(result.reason, 'uncertain_side_effect_no_retry');
});

test('uncertain publication is routed directly to dead letter', () => {
  const job = createJob({ id: 'pub-1', jobClass: 'external_publication', operation: 'publish_tiktok', resourceRef: 'asset-1' });
  const next = transitionAfterFailure(job, { errorCode: 'network_timeout', outcomeKnown: false }, { nowMs: 0 });
  assert.equal(next.state, 'dead_letter');
  assert.equal(next.deadLetterReason, 'uncertain_side_effect_no_retry');
});

test('retryable failure becomes delayed with deterministic backoff', () => {
  const job = createJob({ id: 'read-1', jobClass: 'supplier_read', operation: 'stock', resourceRef: 'sku-1' });
  const next = transitionAfterFailure(job, { errorCode: 'temporary_503', httpStatus: 503 }, { nowMs: 0, jitterSeed: 42 });
  assert.equal(next.state, 'delayed');
  assert.equal(next.attempt, 1);
  assert.equal(new Date(next.nextRunAt).getTime(), computeBackoffMs(1, { jitterSeed: 42 }));
});

test('max attempts exhausted becomes dead letter', () => {
  const job = { ...createJob({ id: 'read-2', jobClass: 'supplier_read', operation: 'stock', resourceRef: 'sku-2', maxAttempts: 2 }), attempt: 1 };
  const next = transitionAfterFailure(job, { errorCode: 'temporary_503', httpStatus: 503 }, { nowMs: 0 });
  assert.equal(next.state, 'dead_letter');
  assert.equal(next.deadLetterReason, 'max_attempts_exhausted');
});

test('authorization and validation failures fail closed without retry', () => {
  assert.equal(classifyFailure({ jobClass: 'email', errorCode: 'auth_failed', httpStatus: 401 }).retryable, false);
  assert.equal(classifyFailure({ jobClass: 'email', errorCode: 'invalid_payload', httpStatus: 400 }).retryable, false);
});

test('normal state path is queued to running to completed', () => {
  const job = createJob({ id: 'email-1', jobClass: 'email', operation: 'order_confirmation', resourceRef: 'order-1' });
  const running = markRunning(job, '2026-10-04T00:00:00.000Z');
  const completed = markCompleted(running, '2026-10-04T00:00:01.000Z');
  assert.equal(completed.state, 'completed');
  assert.equal(completed.nextRunAt, null);
});
