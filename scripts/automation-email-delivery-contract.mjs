import crypto from 'node:crypto';

export const AUTOMATION_EMAIL_KINDS = Object.freeze([
  'order_received',
  'processing_update',
  'shipped',
  'delivered',
  'delivery_exception',
  'refund',
  'abandonment',
  'review_request'
]);

const MARKETING_KINDS = new Set(['abandonment', 'review_request']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function token(value, max = 220) {
  const text = String(value || '').trim();
  return text && text.length <= max && /^[A-Za-z0-9._:/-]+$/.test(text) ? text : null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function automationEmailDeliveryKey(job) {
  const recipientRef = token(job?.payload?.recipientRef, 120);
  const templateKind = AUTOMATION_EMAIL_KINDS.includes(job?.payload?.templateKind) ? job.payload.templateKind : null;
  const idempotencyKey = token(job?.idempotencyKey, 180);
  if (!recipientRef || !templateKind || !idempotencyKey) throw new Error('automation_email_identity_required');
  return crypto.createHash('sha256')
    .update(`automation-email-v1|${idempotencyKey}|${recipientRef}|${templateKind}`)
    .digest('hex');
}

export function validateAutomationEmailJob(job = {}) {
  const reasons = [];
  if (job.jobClass !== 'email') reasons.push('email_job_required');
  if (!token(job.id, 220)) reasons.push('job_id_required');
  if (!token(job.idempotencyKey, 180)) reasons.push('idempotency_key_required');
  if (!token(job?.payload?.recipientRef, 120)) reasons.push('recipient_ref_required');
  if (!AUTOMATION_EMAIL_KINDS.includes(job?.payload?.templateKind)) reasons.push('supported_template_kind_required');
  if (job?.payload?.eventId && !token(job.payload.eventId, 220)) reasons.push('invalid_event_id');
  if (job?.payload?.orderRef && !token(job.payload.orderRef, 180)) reasons.push('invalid_order_ref');
  if (job?.payload?.productRef && !token(job.payload.productRef, 180)) reasons.push('invalid_product_ref');
  if (job?.payload?.trackingRef && !token(job.payload.trackingRef, 220)) reasons.push('invalid_tracking_ref');
  return { ok: reasons.length === 0, reasons };
}

export function evaluateRecipientForJob(job, recipientState = {}) {
  const validation = validateAutomationEmailJob(job);
  if (!validation.ok) return { allowed: false, reason: validation.reasons[0] };

  const email = normalizeEmail(recipientState.email);
  if (!EMAIL_PATTERN.test(email)) return { allowed: false, reason: 'authoritative_recipient_email_required' };
  if (recipientState.recipientRef !== job.payload.recipientRef) return { allowed: false, reason: 'recipient_reference_mismatch' };
  if (recipientState.suppressed === true) return { allowed: false, reason: 'recipient_suppressed' };
  if (recipientState.transactionalAllowed !== true) return { allowed: false, reason: 'transactional_delivery_not_authorized' };

  const kind = job.payload.templateKind;
  if (MARKETING_KINDS.has(kind) && recipientState.marketingConsent !== true) {
    return { allowed: false, reason: 'marketing_consent_required' };
  }
  if (kind === 'review_request' && recipientState.deliveryVerified !== true) {
    return { allowed: false, reason: 'verified_delivery_required' };
  }

  return {
    allowed: true,
    email,
    recipientRef: recipientState.recipientRef,
    templateKind: kind,
    evidence: {
      transactionalAllowed: true,
      marketingConsent: MARKETING_KINDS.has(kind) ? true : null,
      deliveryVerified: kind === 'review_request' ? true : null
    }
  };
}

function renderData(job, recipientState) {
  return {
    orderRef: job.payload.orderRef || undefined,
    productName: recipientState.productName || job.payload.productRef || undefined,
    trackingUrl: recipientState.trackingUrl || undefined,
    supportUrl: recipientState.supportUrl || undefined,
    reviewUrl: recipientState.reviewUrl || undefined,
    storefrontUrl: recipientState.storefrontUrl || undefined,
    refundAmountUsd: Number.isFinite(job.payload.refundAmountUsd) ? job.payload.refundAmountUsd : undefined
  };
}

export function createStrictAutomationEmailHandler({
  enabled = false,
  resolveRecipient,
  ledger,
  render,
  send
} = {}) {
  if (enabled !== true) return null;
  if (typeof resolveRecipient !== 'function') throw new Error('automation_recipient_resolver_required');
  if (!ledger || typeof ledger.reserve !== 'function' || typeof ledger.markSent !== 'function' || typeof ledger.markFailedKnown !== 'function' || typeof ledger.markManualReview !== 'function') {
    throw new Error('automation_email_ledger_required');
  }
  if (typeof render !== 'function') throw new Error('automation_email_renderer_required');
  if (typeof send !== 'function') throw new Error('automation_email_sender_required');

  return async function automationEmailHandler(job) {
    const validation = validateAutomationEmailJob(job);
    if (!validation.ok) return { ok: false, errorCode: validation.reasons[0], outcomeKnown: true, httpStatus: 422 };

    let recipientState;
    try {
      recipientState = await resolveRecipient({
        recipientRef: job.payload.recipientRef,
        orderRef: job.payload.orderRef || null,
        eventId: job.payload.eventId || null,
        templateKind: job.payload.templateKind
      });
    } catch {
      return { ok: false, errorCode: 'recipient_resolution_unavailable', outcomeKnown: true, httpStatus: 503 };
    }

    const eligibility = evaluateRecipientForJob(job, recipientState || {});
    if (!eligibility.allowed) return { ok: false, errorCode: eligibility.reason, outcomeKnown: true, httpStatus: 422 };

    const deliveryKey = automationEmailDeliveryKey(job);
    let reservation;
    try {
      reservation = await ledger.reserve({
        deliveryKey,
        jobId: job.id,
        recipientRef: job.payload.recipientRef,
        templateKind: job.payload.templateKind,
        metadata: { eventId: job.payload.eventId || null }
      });
    } catch {
      return { ok: false, errorCode: 'automation_email_ledger_unavailable', outcomeKnown: true, httpStatus: 503 };
    }

    if (reservation?.status === 'duplicate_sent') return { ok: true, duplicate: true };
    if (reservation?.status !== 'reserved') {
      return { ok: false, errorCode: 'automation_email_manual_review_required', outcomeKnown: false, httpStatus: 409 };
    }

    let rendered;
    try {
      rendered = await render(job.payload.templateKind, renderData(job, recipientState || {}));
      if (!rendered?.subject || !rendered?.text || !rendered?.html) throw new Error('invalid_rendered_email');
    } catch {
      await ledger.markFailedKnown(deliveryKey, 'automation_email_render_failed');
      return { ok: false, errorCode: 'automation_email_render_failed', outcomeKnown: true, httpStatus: 422 };
    }

    let result;
    try {
      result = await send({
        to: eligibility.email,
        subject: rendered.subject,
        body: rendered.text,
        html: rendered.html
      });
    } catch {
      await ledger.markManualReview(deliveryKey, 'automation_email_sender_exception_unknown_outcome');
      return { ok: false, errorCode: 'automation_email_sender_exception_unknown_outcome', outcomeKnown: false };
    }

    if (!result?.success) {
      if (result?.outcomeKnown === false) {
        await ledger.markManualReview(deliveryKey, 'automation_email_sender_unknown_outcome');
        return { ok: false, errorCode: 'automation_email_sender_unknown_outcome', outcomeKnown: false, httpStatus: result?.httpStatus ?? null };
      }
      await ledger.markFailedKnown(deliveryKey, result?.errorCode || 'automation_email_sender_rejected');
      return {
        ok: false,
        errorCode: result?.errorCode || 'automation_email_sender_rejected',
        outcomeKnown: true,
        httpStatus: result?.httpStatus ?? 503
      };
    }

    try {
      await ledger.markSent(deliveryKey, { providerMessageId: result.providerMessageId || null });
    } catch {
      return { ok: false, errorCode: 'automation_email_post_send_ledger_failure', outcomeKnown: false };
    }
    return { ok: true, duplicate: false };
  };
}
