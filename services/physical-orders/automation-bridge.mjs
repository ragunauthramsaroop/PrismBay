import { enqueueAutomationEvent } from '../../scripts/commerce-automation-runtime.mjs';

const CHECKOUT_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded'
]);

function identifier(value, prefix) {
  const id = typeof value === 'string' ? value : value?.id;
  return typeof id === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(id) ? id : null;
}

function eventTime(event, now) {
  const seconds = Number(event?.created);
  if (Number.isInteger(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  return new Date(now()).toISOString();
}

function customerEmail(session) {
  return String(session?.customer_details?.email || session?.customer_email || '').trim();
}

function matchingOrder(snapshot, sessionId) {
  const orders = snapshot?.orders && typeof snapshot.orders === 'object' ? Object.values(snapshot.orders) : [];
  return orders.find((order) => order?.sessionId === sessionId) || null;
}

export function eligiblePhysicalCheckout(event, ledgerSnapshot, now = Date.now) {
  if (!CHECKOUT_EVENT_TYPES.has(event?.type)) return { eligible: false, reason: 'not_checkout_success_event' };
  const eventId = identifier(event?.id, 'evt');
  const session = event?.data?.object;
  const sessionId = identifier(session?.id, 'cs');
  if (!eventId || !sessionId) return { eligible: false, reason: 'invalid_event_identity' };
  if (session?.mode !== 'payment' || session?.payment_status !== 'paid') return { eligible: false, reason: 'payment_not_confirmed' };
  if (!Number.isSafeInteger(session?.amount_total) || session.amount_total <= 0 || session?.currency !== 'usd') return { eligible: false, reason: 'unsupported_payment_shape' };

  const order = matchingOrder(ledgerSnapshot, sessionId);
  if (!order) return { eligible: false, reason: 'physical_order_not_found' };
  if (order.paid !== true || order.status !== 'manual_fulfillment') return { eligible: false, reason: 'physical_order_not_automation_ready' };

  const email = customerEmail(session);
  if (!email) return { eligible: false, reason: 'customer_email_missing' };
  const singleProductRef = Array.isArray(order.items) && order.items.length === 1 ? String(order.items[0]?.sku || '').trim() || null : null;

  return {
    eligible: true,
    eventId,
    sessionId,
    email,
    occurredAt: eventTime(event, now),
    productRef: singleProductRef
  };
}

export function createPhysicalAutomationBridge({ contactVault, jobStore, now = Date.now } = {}) {
  if (!contactVault || typeof contactVault.capturePaidCheckout !== 'function') throw new Error('physical_contact_vault_required');
  if (!jobStore || typeof jobStore.enqueue !== 'function') throw new Error('physical_automation_job_store_required');

  return Object.freeze({
    async projectStripeEvent(event, ledgerSnapshot) {
      const eligible = eligiblePhysicalCheckout(event, ledgerSnapshot, now);
      if (!eligible.eligible) return { projected: false, reason: eligible.reason };

      const captured = await contactVault.capturePaidCheckout({
        email: eligible.email,
        checkoutRef: eligible.sessionId,
        now: eligible.occurredAt
      });

      const routed = await enqueueAutomationEvent(jobStore, {
        eventId: eligible.eventId,
        type: 'payment_completed',
        resourceRef: `checkout:${eligible.sessionId}`,
        recipientRef: captured.recipientRef,
        orderRef: eligible.sessionId,
        productRef: eligible.productRef,
        occurredAt: eligible.occurredAt,
        consent: false,
        deliveryVerified: false
      });

      return {
        projected: routed.accepted === true,
        reason: routed.accepted === true ? null : routed.reasons?.[0] || 'automation_route_rejected',
        eventRef: routed.eventRef || null,
        recipientRef: captured.recipientRef,
        insertedJobs: Array.isArray(routed.enqueued) ? routed.enqueued.filter((row) => row.inserted === true).length : 0,
        duplicateJobs: Array.isArray(routed.enqueued) ? routed.enqueued.filter((row) => row.inserted === false).length : 0
      };
    }
  });
}
