// PrismBay original reliability contract inspired by BullMQ queue semantics.
// Upstream reference: https://github.com/taskforcesh/bullmq (MIT).
// No BullMQ source is copied and no Redis service is provisioned here.

import crypto from 'node:crypto';

export const JOB_STATES = Object.freeze(['queued', 'running', 'delayed', 'completed', 'dead_letter']);
export const UNCERTAIN_SIDE_EFFECT_CLASSES = new Set(['supplier_order', 'payment', 'external_publication']);

export function createIdempotencyKey({ jobClass, operation, resourceRef, version = 1 }) {
  const raw = `${version}|${String(jobClass || '')}|${String(operation || '')}|${String(resourceRef || '')}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function createJob({ id, jobClass, operation, resourceRef, payload = {}, maxAttempts = 4, createdAt = new Date().toISOString() }) {
  if (!id || !jobClass || !operation || !resourceRef) throw new Error('job_identity_required');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error('invalid_max_attempts');
  return {
    schemaVersion: 1,
    id: String(id),
    jobClass: String(jobClass),
    operation: String(operation),
    resourceRef: String(resourceRef),
    payload,
    idempotencyKey: createIdempotencyKey({ jobClass, operation, resourceRef }),
    state: 'queued',
    attempt: 0,
    maxAttempts,
    nextRunAt: createdAt,
    lastErrorCode: null,
    deadLetterReason: null,
    createdAt,
    updatedAt: createdAt
  };
}

export function computeBackoffMs(attempt, { baseMs = 1_000, maxMs = 300_000, jitterSeed = 0 } = {}) {
  const safeAttempt = Math.max(1, Number(attempt) || 1);
  const exponential = Math.min(maxMs, baseMs * (2 ** (safeAttempt - 1)));
  const jitter = Math.floor((Math.abs(Number(jitterSeed) || 0) % 1000) / 1000 * Math.min(1000, Math.max(1, exponential * 0.1)));
  return Math.min(maxMs, exponential + jitter);
}

export function classifyFailure({ jobClass, errorCode, outcomeKnown = true, httpStatus = null } = {}) {
  const code = String(errorCode || 'unknown_error').toLowerCase();
  const status = Number(httpStatus);

  if (!outcomeKnown && UNCERTAIN_SIDE_EFFECT_CLASSES.has(String(jobClass))) {
    return { retryable: false, uncertain: true, reason: 'uncertain_side_effect_no_retry' };
  }
  if (code.includes('quota') || code.includes('auth') || code.includes('permission') || status === 401 || status === 403) {
    return { retryable: false, uncertain: false, reason: 'non_retryable_authorization_or_quota' };
  }
  if (code.includes('validation') || code.includes('invalid_') || status === 400 || status === 404 || status === 409 || status === 422) {
    return { retryable: false, uncertain: false, reason: 'non_retryable_request_error' };
  }
  if (status === 429 || status >= 500 || code.includes('timeout') || code.includes('temporar') || code.includes('network')) {
    return { retryable: true, uncertain: false, reason: 'transient_failure' };
  }
  return { retryable: false, uncertain: false, reason: 'unclassified_fail_closed' };
}

export function transitionAfterFailure(job, failure, { nowMs = Date.now(), jitterSeed = 0 } = {}) {
  if (!job || !JOB_STATES.includes(job.state)) throw new Error('invalid_job');
  const attempt = Number(job.attempt || 0) + 1;
  const classification = classifyFailure({ jobClass: job.jobClass, ...failure });
  const updatedAt = new Date(nowMs).toISOString();

  if (!classification.retryable || attempt >= job.maxAttempts) {
    return {
      ...job,
      attempt,
      state: 'dead_letter',
      nextRunAt: null,
      lastErrorCode: String(failure?.errorCode || 'unknown_error'),
      deadLetterReason: attempt >= job.maxAttempts && classification.retryable ? 'max_attempts_exhausted' : classification.reason,
      updatedAt
    };
  }

  const delayMs = computeBackoffMs(attempt, { jitterSeed });
  return {
    ...job,
    attempt,
    state: 'delayed',
    nextRunAt: new Date(nowMs + delayMs).toISOString(),
    lastErrorCode: String(failure?.errorCode || 'unknown_error'),
    deadLetterReason: null,
    updatedAt
  };
}

export function markRunning(job, now = new Date().toISOString()) {
  if (!['queued', 'delayed'].includes(job?.state)) throw new Error('job_not_runnable');
  return { ...job, state: 'running', updatedAt: now };
}

export function markCompleted(job, now = new Date().toISOString()) {
  if (job?.state !== 'running') throw new Error('job_not_running');
  return { ...job, state: 'completed', nextRunAt: null, updatedAt: now };
}

export class InMemoryJobStore {
  constructor() {
    this.jobs = new Map();
    this.idempotency = new Map();
  }

  enqueue(job) {
    if (!job?.id || !job?.idempotencyKey) throw new Error('invalid_job');
    const existingId = this.idempotency.get(job.idempotencyKey);
    if (existingId) return { inserted: false, duplicateOf: existingId, job: this.jobs.get(existingId) };
    this.jobs.set(job.id, structuredClone(job));
    this.idempotency.set(job.idempotencyKey, job.id);
    return { inserted: true, job: structuredClone(job) };
  }

  put(job) {
    if (!this.jobs.has(job.id)) throw new Error('job_not_found');
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }

  get(id) {
    const job = this.jobs.get(id);
    return job ? structuredClone(job) : null;
  }

  list(state = null) {
    return [...this.jobs.values()].filter((job) => !state || job.state === state).map((job) => structuredClone(job));
  }
}
