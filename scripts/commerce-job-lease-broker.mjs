import crypto from 'node:crypto';
import { markCompleted, markRunning, transitionAfterFailure } from './commerce-job-reliability.mjs';

const SAFE_TOKEN = /^[A-Za-z0-9._:/-]+$/;
const MIN_LEASE_MS = 5_000;
const MAX_LEASE_MS = 5 * 60_000;

function token(value, max = 220) {
  const text = String(value || '').trim();
  return text && text.length <= max && SAFE_TOKEN.test(text) ? text : null;
}

function parseTime(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function due(job, nowMs) {
  const nextRunMs = parseTime(job?.nextRunAt);
  return job?.jobClass === 'email' && ['queued', 'delayed'].includes(job?.state) && nextRunMs !== null && nextRunMs <= nowMs;
}

function leaseExpired(job, nowMs) {
  const expiresMs = parseTime(job?.lease?.expiresAt);
  return job?.jobClass === 'email' && job?.state === 'running' && token(job?.lease?.id, 160) && expiresMs !== null && expiresMs <= nowMs;
}

function safeFailure(outcome = {}) {
  const errorCode = token(outcome.errorCode || 'automation_worker_failed', 120) || 'automation_worker_failed';
  const rawStatus = outcome.httpStatus == null ? null : Number(outcome.httpStatus);
  const httpStatus = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : null;
  return {
    errorCode,
    httpStatus,
    outcomeKnown: outcome.outcomeKnown !== false
  };
}

export function automationWorkerTokenAuthorized(expected, supplied) {
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(String(supplied || ''));
  return left.length >= 32 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createJobLeaseBroker({ store, nowMs = () => Date.now(), randomId = () => crypto.randomUUID() } = {}) {
  if (!store?.list || !store?.update || !store?.get) throw new Error('durable_job_store_with_atomic_update_required');
  let brokerTail = Promise.resolve();

  function serialize(fn) {
    const operation = brokerTail.then(fn);
    brokerTail = operation.catch(() => {});
    return operation;
  }

  async function recoverExpiredLeases(currentMs) {
    const expired = store.list().filter((job) => leaseExpired(job, currentMs));
    let recovered = 0;
    for (const candidate of expired) {
      try {
        await store.update(candidate.id, (current) => {
          if (!leaseExpired(current, currentMs)) return current;
          recovered += 1;
          const now = new Date(currentMs).toISOString();
          return {
            ...current,
            state: 'queued',
            nextRunAt: now,
            lease: null,
            lastErrorCode: 'automation_worker_lease_expired',
            deadLetterReason: null,
            updatedAt: now
          };
        });
      } catch (error) {
        if (error?.message !== 'job_not_found') throw error;
      }
    }
    return recovered;
  }

  return Object.freeze({
    async leaseDue({ limit = 10, leaseMs = 60_000 } = {}) {
      return serialize(async () => {
        const currentMs = Number(nowMs());
        if (!Number.isFinite(currentMs)) throw new Error('valid_broker_time_required');
        const requestedLeaseMs = Number(leaseMs);
        if (!Number.isInteger(requestedLeaseMs) || requestedLeaseMs < MIN_LEASE_MS || requestedLeaseMs > MAX_LEASE_MS) {
          throw new Error('invalid_lease_duration');
        }
        const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
        const recovered = await recoverExpiredLeases(currentMs);
        const candidates = store.list()
          .filter((job) => due(job, currentMs))
          .sort((left, right) => {
            const nextDelta = (parseTime(left.nextRunAt) || 0) - (parseTime(right.nextRunAt) || 0);
            if (nextDelta !== 0) return nextDelta;
            return String(left.id).localeCompare(String(right.id));
          })
          .slice(0, safeLimit);

        const leased = [];
        for (const candidate of candidates) {
          const leaseId = `lease_${String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80)}`;
          if (!token(leaseId, 160)) throw new Error('invalid_generated_lease_id');
          const leasedAt = new Date(currentMs).toISOString();
          const expiresAt = new Date(currentMs + requestedLeaseMs).toISOString();
          let acquired = false;
          const updated = await store.update(candidate.id, (current) => {
            if (!due(current, currentMs)) return current;
            acquired = true;
            return {
              ...markRunning(current, leasedAt),
              lease: { id: leaseId, leasedAt, expiresAt }
            };
          });
          if (acquired) leased.push(updated);
        }
        return { recoveredExpiredLeases: recovered, jobs: leased };
      });
    },

    async acknowledge({ jobId, leaseId, outcome = {} } = {}) {
      return serialize(async () => {
        const safeJobId = token(jobId, 220);
        const safeLeaseId = token(leaseId, 160);
        if (!safeJobId || !safeLeaseId) return { ok: false, reason: 'valid_job_and_lease_required' };
        const currentMs = Number(nowMs());
        if (!Number.isFinite(currentMs)) throw new Error('valid_broker_time_required');
        const current = store.get(safeJobId);
        if (!current) return { ok: false, reason: 'job_not_found' };
        if (current.jobClass !== 'email') return { ok: false, reason: 'email_job_required' };
        if (current.state !== 'running' || current.lease?.id !== safeLeaseId) return { ok: false, reason: 'stale_or_mismatched_lease' };
        const expiresMs = parseTime(current.lease?.expiresAt);
        if (expiresMs === null || expiresMs <= currentMs) return { ok: false, reason: 'lease_expired' };

        const updated = await store.update(safeJobId, (latest) => {
          if (latest.state !== 'running' || latest.lease?.id !== safeLeaseId) throw new Error('lease_changed_during_ack');
          const latestExpiry = parseTime(latest.lease?.expiresAt);
          if (latestExpiry === null || latestExpiry <= currentMs) throw new Error('lease_expired');
          if (outcome?.ok === true) {
            return { ...markCompleted(latest, new Date(currentMs).toISOString()), lease: null };
          }
          const failed = transitionAfterFailure(latest, safeFailure(outcome), { nowMs: currentMs });
          return { ...failed, lease: null };
        });
        return {
          ok: true,
          jobId: updated.id,
          state: updated.state,
          nextRunAt: updated.nextRunAt || null,
          reason: updated.deadLetterReason || updated.lastErrorCode || null
        };
      });
    },

    async recoverExpired() {
      return serialize(async () => {
        const currentMs = Number(nowMs());
        if (!Number.isFinite(currentMs)) throw new Error('valid_broker_time_required');
        return { recoveredExpiredLeases: await recoverExpiredLeases(currentMs) };
      });
    }
  });
}
