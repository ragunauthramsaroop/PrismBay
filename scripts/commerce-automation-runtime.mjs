import crypto from 'node:crypto';
import {
  UNCERTAIN_SIDE_EFFECT_CLASSES,
  createJob,
  markCompleted,
  markRunning,
  transitionAfterFailure
} from './commerce-job-reliability.mjs';

const REVIEW_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export const AUTOMATION_EVENTS = Object.freeze([
  'payment_completed',
  'order_processing',
  'shipment_update',
  'delivery_confirmed',
  'delivery_exception',
  'refund_processed',
  'checkout_abandoned'
]);

export const EVENT_TO_EMAIL_KIND = Object.freeze({
  payment_completed: 'order_received',
  order_processing: 'processing_update',
  shipment_update: 'shipped',
  delivery_confirmed: 'delivered',
  delivery_exception: 'delivery_exception',
  refund_processed: 'refund',
  checkout_abandoned: 'abandonment'
});

function safeToken(value, max = 180) {
  const token = String(value || '').trim();
  return token && token.length <= max && /^[A-Za-z0-9._:/-]+$/.test(token) ? token : null;
}

function parseTime(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function stableId(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

function automationResourceRef(event, operation) {
  return `${event.resourceRef}:${operation}`;
}

function buildEmailJob(event, operation, createdAt = event.occurredAt) {
  const job = createJob({
    id: `auto_${stableId([event.eventId, operation, event.resourceRef])}`,
    jobClass: 'email',
    operation,
    resourceRef: automationResourceRef(event, operation),
    payload: {
      eventId: event.eventId,
      recipientRef: event.recipientRef,
      orderRef: event.orderRef || null,
      productRef: event.productRef || null,
      trackingRef: event.trackingRef || null,
      refundAmountUsd: Number.isFinite(event.refundAmountUsd) ? event.refundAmountUsd : null,
      templateKind: operation
    },
    maxAttempts: 4,
    createdAt
  });
  return job;
}

export function validateAutomationEvent(input = {}) {
  const eventId = safeToken(input.eventId, 220);
  const type = AUTOMATION_EVENTS.includes(input.type) ? input.type : null;
  const resourceRef = safeToken(input.resourceRef, 220);
  const recipientRef = safeToken(input.recipientRef, 120);
  const occurredMs = parseTime(input.occurredAt);
  const orderRef = input.orderRef ? safeToken(input.orderRef, 180) : null;
  const productRef = input.productRef ? safeToken(input.productRef, 180) : null;
  const trackingRef = input.trackingRef ? safeToken(input.trackingRef, 220) : null;
  const refundAmountUsd = input.refundAmountUsd == null ? null : Number(input.refundAmountUsd);
  const consent = input.consent === true;
  const deliveryVerified = input.deliveryVerified === true;

  const reasons = [];
  if (!eventId) reasons.push('event_id_required');
  if (!type) reasons.push('supported_event_type_required');
  if (!resourceRef) reasons.push('resource_ref_required');
  if (!recipientRef) reasons.push('recipient_ref_required');
  if (occurredMs === null) reasons.push('occurred_at_required');
  if (input.orderRef && !orderRef) reasons.push('invalid_order_ref');
  if (input.productRef && !productRef) reasons.push('invalid_product_ref');
  if (input.trackingRef && !trackingRef) reasons.push('invalid_tracking_ref');
  if (refundAmountUsd !== null && (!Number.isFinite(refundAmountUsd) || refundAmountUsd < 0 || refundAmountUsd > 100000)) reasons.push('invalid_refund_amount');
  if (type === 'checkout_abandoned' && !consent) reasons.push('consent_required_for_abandonment');
  if (type === 'delivery_confirmed' && !deliveryVerified) reasons.push('verified_delivery_required');

  return {
    ok: reasons.length === 0,
    reasons,
    event: reasons.length ? null : {
      eventId,
      type,
      resourceRef,
      recipientRef,
      occurredAt: new Date(occurredMs).toISOString(),
      orderRef,
      productRef,
      trackingRef,
      refundAmountUsd,
      consent,
      deliveryVerified
    }
  };
}

export function routeCommerceEvent(input = {}) {
  const validation = validateAutomationEvent(input);
  if (!validation.ok) return { accepted: false, reasons: validation.reasons, jobs: [] };

  const event = validation.event;
  const jobs = [];
  const primaryKind = EVENT_TO_EMAIL_KIND[event.type];
  if (primaryKind) jobs.push(buildEmailJob(event, primaryKind));

  if (event.type === 'delivery_confirmed') {
    const reviewJob = buildEmailJob(event, 'review_request', new Date(Date.parse(event.occurredAt) + REVIEW_DELAY_MS).toISOString());
    reviewJob.state = 'delayed';
    reviewJob.nextRunAt = new Date(Date.parse(event.occurredAt) + REVIEW_DELAY_MS).toISOString();
    jobs.push(reviewJob);
  }

  return {
    accepted: true,
    reasons: [],
    eventRef: stableId([event.eventId, event.type, event.resourceRef]),
    jobs,
    externalActionAttempted: false,
    supplierOrderingAttempted: false,
    liveEmailAttempted: false
  };
}

export async function enqueueAutomationEvent(store, input = {}) {
  if (!store?.enqueue) throw new Error('automation_job_store_required');
  const routed = routeCommerceEvent(input);
  if (!routed.accepted) return routed;
  const enqueued = [];
  for (const job of routed.jobs) enqueued.push(await store.enqueue(job));
  return { ...routed, enqueued };
}

function due(job, nowMs) {
  const next = parseTime(job?.nextRunAt);
  return ['queued', 'delayed'].includes(job?.state) && next !== null && next <= nowMs;
}

export async function processDueJobs(store, handlers = {}, { nowMs = Date.now(), limit = 25 } = {}) {
  if (!store?.list || !store?.put) throw new Error('automation_job_store_required');
  const candidates = store.list().filter((job) => due(job, nowMs)).slice(0, Math.max(1, Math.min(Number(limit) || 25, 100)));
  const results = [];

  for (const job of candidates) {
    const handler = handlers?.[job.jobClass];
    if (typeof handler !== 'function') {
      results.push({ jobId: job.id, status: 'skipped', reason: 'handler_not_configured' });
      continue;
    }

    const running = markRunning(job, new Date(nowMs).toISOString());
    await store.put(running);
    try {
      const outcome = await handler(structuredClone(running));
      if (!outcome || outcome.ok !== true) {
        const failed = transitionAfterFailure(running, {
          errorCode: outcome?.errorCode || 'automation_handler_failed',
          httpStatus: outcome?.httpStatus ?? null,
          outcomeKnown: outcome?.outcomeKnown !== false
        }, { nowMs });
        await store.put(failed);
        results.push({ jobId: job.id, status: failed.state, reason: failed.deadLetterReason || failed.lastErrorCode });
        continue;
      }
      const completed = markCompleted(running, new Date(nowMs).toISOString());
      await store.put(completed);
      results.push({ jobId: job.id, status: 'completed' });
    } catch (error) {
      const failed = transitionAfterFailure(running, {
        errorCode: error?.code || 'automation_handler_exception',
        outcomeKnown: error?.outcomeKnown !== false,
        httpStatus: error?.httpStatus ?? null
      }, { nowMs });
      await store.put(failed);
      results.push({ jobId: job.id, status: failed.state, reason: failed.deadLetterReason || failed.lastErrorCode });
    }
  }

  return { examined: candidates.length, results };
}

export async function replayDeadLetter(store, jobId, approval = {}) {
  const job = store?.get?.(jobId);
  if (!job) return { ok: false, reason: 'job_not_found' };
  if (job.state !== 'dead_letter') return { ok: false, reason: 'job_not_dead_letter' };
  if (UNCERTAIN_SIDE_EFFECT_CLASSES.has(job.jobClass)) return { ok: false, reason: 'manual_reconciliation_required' };
  if (approval.explicit !== true || safeToken(approval.approvedBy, 120) == null) return { ok: false, reason: 'explicit_replay_approval_required' };
  const now = new Date().toISOString();
  const replay = {
    ...job,
    state: 'queued',
    attempt: 0,
    nextRunAt: now,
    deadLetterReason: null,
    lastErrorCode: null,
    updatedAt: now,
    replayApprovalRef: stableId([approval.approvedBy, job.id, now])
  };
  await store.put(replay);
  return { ok: true, job: replay };
}
