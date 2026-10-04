import crypto from 'node:crypto';
import { enqueueAutomationEvent } from '../../scripts/commerce-automation-runtime.mjs';

const EVENT_TO_STATE = Object.freeze({
  order_processing: 'processing',
  shipment_update: 'shipped',
  delivery_exception: 'delivery_exception',
  delivery_confirmed: 'delivered',
  refund_processed: 'refunded'
});
const TRANSITIONS = Object.freeze({
  none: new Set(['processing', 'shipped', 'refunded']),
  processing: new Set(['shipped', 'delivery_exception', 'refunded']),
  shipped: new Set(['delivered', 'delivery_exception', 'refunded']),
  delivery_exception: new Set(['shipped', 'delivered', 'refunded']),
  delivered: new Set(['refunded']),
  refunded: new Set()
});
const SOURCES = new Set(['supplier_api', 'carrier_api', 'stripe_webhook', 'operator_verified']);
const DELIVERED_SOURCES = new Set(['carrier_api', 'operator_verified']);
const REFUND_SOURCES = new Set(['stripe_webhook', 'operator_verified']);

function token(value, pattern, max = 220) {
  const text = String(value || '').trim();
  return text && text.length <= max && pattern.test(text) ? text : null;
}
function safeHttpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && url.username === '' && url.password === '' ? url.toString() : null;
  } catch { return null; }
}
function iso(value) {
  try { return new Date(value).toISOString(); } catch { return null; }
}
function findOrder(snapshot, sessionId) {
  return Object.values(snapshot?.orders || {}).find((order) => order?.sessionId === sessionId) || null;
}
function evidenceFingerprint(evidence) {
  return crypto.createHash('sha256').update(JSON.stringify({
    eventId: evidence.eventId,
    sessionId: evidence.sessionId,
    type: evidence.type,
    source: evidence.source,
    evidenceRef: evidence.evidenceRef,
    occurredAt: evidence.occurredAt,
    trackingUrl: evidence.trackingUrl,
    refundAmountUsd: evidence.refundAmountUsd
  })).digest('hex');
}

export function validateFulfillmentEvidence(input = {}) {
  const eventId = token(input.eventId, /^ful_[A-Za-z0-9_-]+$/);
  const sessionId = token(input.sessionId, /^cs_[A-Za-z0-9_]+$/);
  const type = Object.hasOwn(EVENT_TO_STATE, input.type) ? input.type : null;
  const source = SOURCES.has(input.source) ? input.source : null;
  const evidenceRef = token(input.evidenceRef, /^[A-Za-z0-9._:/-]+$/);
  const occurredAt = iso(input.occurredAt);
  const trackingUrl = input.trackingUrl ? safeHttpsUrl(input.trackingUrl) : null;
  const refundAmountUsd = input.refundAmountUsd == null ? null : Number(input.refundAmountUsd);
  const reasons = [];
  if (!eventId) reasons.push('valid_fulfillment_event_id_required');
  if (!sessionId) reasons.push('valid_checkout_session_required');
  if (!type) reasons.push('supported_fulfillment_event_type_required');
  if (!source) reasons.push('verified_evidence_source_required');
  if (!evidenceRef) reasons.push('evidence_reference_required');
  if (!occurredAt) reasons.push('valid_occurred_at_required');
  if (['shipment_update', 'delivery_exception'].includes(type) && !trackingUrl) reasons.push('https_tracking_url_required');
  if (type === 'delivery_confirmed' && !DELIVERED_SOURCES.has(source)) reasons.push('verified_delivery_source_required');
  if (type === 'refund_processed' && !REFUND_SOURCES.has(source)) reasons.push('verified_refund_source_required');
  if (type === 'refund_processed' && (!Number.isFinite(refundAmountUsd) || refundAmountUsd < 0 || refundAmountUsd > 100000)) reasons.push('verified_refund_amount_required');
  return { ok: reasons.length === 0, reasons, evidence: reasons.length ? null : { eventId, sessionId, type, state: EVENT_TO_STATE[type], source, evidenceRef, occurredAt, trackingUrl, refundAmountUsd } };
}

export function statusTokenAuthorized(expected, supplied) {
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(String(supplied || ''));
  return left.length >= 32 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createPhysicalRecipientResolver({ contactVault, ledger } = {}) {
  if (!contactVault?.resolveRecipient || !ledger?.snapshot) throw new Error('physical_recipient_resolver_dependencies_required');
  return async ({ recipientRef, orderRef } = {}) => {
    const contact = await contactVault.resolveRecipient({ recipientRef });
    if (!contact) return null;
    const order = orderRef ? findOrder(ledger.snapshot(), orderRef) : null;
    return {
      ...contact,
      trackingUrl: order?.fulfillment?.trackingUrl || undefined,
      productName: Array.isArray(order?.items) && order.items.length === 1 ? order.items[0]?.sku || undefined : undefined,
      storefrontUrl: 'https://clean.prismbayai.com/'
    };
  };
}

export function createFulfillmentStatusAutomation({ ledger, contactVault, jobStore } = {}) {
  if (!ledger?.transact || !ledger?.snapshot) throw new Error('fulfillment_ledger_required');
  if (!contactVault?.recipientRefForCheckout || !contactVault?.updateEvidence) throw new Error('fulfillment_contact_vault_required');
  if (!jobStore?.enqueue) throw new Error('fulfillment_job_store_required');

  return Object.freeze({
    async record(input = {}) {
      const validated = validateFulfillmentEvidence(input);
      if (!validated.ok) return { ok: false, status: 422, error: validated.reasons[0] };
      const evidence = validated.evidence;
      const fingerprint = evidenceFingerprint(evidence);

      const recorded = await ledger.transact((state) => {
        state.fulfillmentEvents ??= {};
        const existing = state.fulfillmentEvents[evidence.eventId];
        if (existing) {
          if (existing.fingerprint !== fingerprint) throw new Error('fulfillment_event_replay_mismatch');
          return { replay: true, sessionId: existing.sessionId, type: existing.type };
        }
        const order = findOrder(state, evidence.sessionId);
        if (!order || order.paid !== true || order.status !== 'manual_fulfillment') throw new Error('physical_order_not_fulfillment_ready');
        const current = order.fulfillment?.state || 'none';
        if (!TRANSITIONS[current]?.has(evidence.state)) throw new Error(`illegal_fulfillment_transition:${current}->${evidence.state}`);
        const priorOccurredAt = order.fulfillment?.occurredAt ? Date.parse(order.fulfillment.occurredAt) : null;
        const nextOccurredAt = Date.parse(evidence.occurredAt);
        if (Number.isFinite(priorOccurredAt) && nextOccurredAt < priorOccurredAt) throw new Error('stale_fulfillment_evidence');
        order.fulfillment = {
          state: evidence.state,
          source: evidence.source,
          evidenceRef: evidence.evidenceRef,
          trackingUrl: evidence.trackingUrl || order.fulfillment?.trackingUrl || null,
          refundAmountUsd: evidence.type === 'refund_processed' ? evidence.refundAmountUsd : order.fulfillment?.refundAmountUsd ?? null,
          occurredAt: evidence.occurredAt,
          updatedAt: evidence.occurredAt
        };
        state.fulfillmentEvents[evidence.eventId] = {
          sessionId: evidence.sessionId,
          type: evidence.type,
          state: evidence.state,
          evidenceRef: evidence.evidenceRef,
          occurredAt: evidence.occurredAt,
          fingerprint
        };
        return { replay: false, sessionId: evidence.sessionId, type: evidence.type };
      });

      const recipientRef = await contactVault.recipientRefForCheckout(evidence.sessionId);
      if (!recipientRef) return { ok: false, status: 409, error: 'recipient_link_missing', recorded: true };
      if (evidence.type === 'delivery_confirmed') await contactVault.updateEvidence(recipientRef, { deliveryVerified: true }, evidence.occurredAt);

      const snapshot = ledger.snapshot();
      const order = findOrder(snapshot, evidence.sessionId);
      const routed = await enqueueAutomationEvent(jobStore, {
        eventId: evidence.eventId,
        type: evidence.type,
        resourceRef: `checkout:${evidence.sessionId}`,
        recipientRef,
        orderRef: evidence.sessionId,
        productRef: Array.isArray(order?.items) && order.items.length === 1 ? order.items[0]?.sku || null : null,
        trackingRef: evidence.trackingUrl ? evidence.evidenceRef : null,
        refundAmountUsd: evidence.refundAmountUsd,
        occurredAt: evidence.occurredAt,
        consent: false,
        deliveryVerified: evidence.type === 'delivery_confirmed'
      });
      return {
        ok: routed.accepted === true,
        status: routed.accepted === true ? 200 : 409,
        replay: recorded.replay,
        state: evidence.state,
        insertedJobs: routed.enqueued?.filter((row) => row.inserted).length || 0,
        duplicateJobs: routed.enqueued?.filter((row) => !row.inserted).length || 0,
        error: routed.accepted ? null : routed.reasons?.[0] || 'automation_route_rejected'
      };
    }
  });
}
