// Separate technical checks and unverified counts from authenticated live Stripe evidence.
// Pass only the complete result of readStripe() in daily-revenue-brief.mjs as stripeEvidence.
function verifiedStripeChargeCount(evidence) {
  if (evidence?.state !== 'VERIFIED' ||
      !Number.isSafeInteger(evidence.successfulCharges) || evidence.successfulCharges < 0 ||
      !Number.isSafeInteger(evidence.scanned) || evidence.scanned < evidence.successfulCharges ||
      !evidence.totals || typeof evidence.totals !== 'object' || Array.isArray(evidence.totals)) return null;

  let totalCharges = 0;
  let netMinor = 0;
  for (const [currency, total] of Object.entries(evidence.totals)) {
    if (!/^[A-Z]{3}$/.test(currency) ||
        !Number.isSafeInteger(total?.successfulCharges) || total.successfulCharges < 1 ||
        !Number.isSafeInteger(total.grossMinor) || total.grossMinor < 0 ||
        !Number.isSafeInteger(total.refundedMinor) || total.refundedMinor < 0 ||
        total.refundedMinor > total.grossMinor ||
        !Number.isSafeInteger(total.netAfterRefundsMinor) ||
        total.netAfterRefundsMinor !== total.grossMinor - total.refundedMinor) return null;
    totalCharges += total.successfulCharges;
    netMinor += total.netAfterRefundsMinor;
    if (!Number.isSafeInteger(totalCharges) || !Number.isSafeInteger(netMinor)) return null;
  }
  return totalCharges === evidence.successfulCharges ? { count: totalCharges, netMinor } : null;
}

export function classifyRevenueEvidence({
  guideHealthy = false,
  checkoutHealthy = false,
  trafficCount = null,
  stripeEvidence = null,
  deliveredOrders = null
} = {}) {
  const technicalPathHealthy = Boolean(guideHealthy && checkoutHealthy);
  // Ignore malformed counters. Only upstream authenticated sources establish paid sales.
  // Legacy deliveredOrders is untrusted without order-bound fulfillment evidence.
  const validTrafficCount = Number.isSafeInteger(trafficCount) && trafficCount >= 0 ? trafficCount : null;
  const trafficStatus = validTrafficCount === null ? 'UNMEASURED' : validTrafficCount === 0 ? 'NO_RECORDED_TRAFFIC' : 'MEASURED';
  // Legacy paidOrders input is intentionally ignored. A numeric claim is not payment evidence.
  const verifiedStripe = verifiedStripeChargeCount(stripeEvidence);
  const paymentStatus = verifiedStripe === null ? 'STRIPE_DATA_NOT_CONNECTED' :
    verifiedStripe.count === 0 ? 'NO_PAID_ORDERS' : 'PAYMENTS_RECORDED';
  // A caller-provided count is not a verified shipment or delivery receipt.
  // Keep this field fail-closed until an authenticated fulfillment adapter is integrated.
  const deliveryStatus = 'NOT_VERIFIED';
  const revenueVerified = verifiedStripe !== null && verifiedStripe.count > 0 && verifiedStripe.netMinor > 0;
  const firstSaleVerified = revenueVerified;
  const nextAction = !technicalPathHealthy ? 'REPAIR_BUYER_LINKS' :
    validTrafficCount === null ? 'MEASURE_EXTERNAL_BUYER_TRAFFIC' :
    validTrafficCount === 0 ? 'DISTRIBUTE_TO_RELEVANT_BUYERS' :
    verifiedStripe === null ? 'VERIFY_PAID_STRIPE_EVENTS' :
    verifiedStripe.count === 0 ? 'IMPROVE_OFFER_CONVERSION' :
    verifiedStripe.netMinor === 0 ? 'VERIFY_REFUNDS_AND_NET_REVENUE' :
    'VERIFY_ORDER_BOUND_FULFILLMENT';
  return {
    technicalPathHealthy, trafficStatus, paymentStatus, deliveryStatus,
    revenueVerified, firstSaleVerified, nextAction,
    note: 'Only a complete authenticated live Stripe charge read establishes payment activity; first-sale credit also requires positive after-refunds revenue. Generated content, checkout links, untrusted traffic counters and numeric delivery or paidOrders claims do not.'
  };
}
