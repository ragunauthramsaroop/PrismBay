import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRevenueEvidence } from './revenue-evidence-gates.mjs';

const liveEvidence = (successfulCharges) => ({
  state: 'VERIFIED',
  scanned: successfulCharges,
  successfulCharges,
  totals: successfulCharges ? {
    USD: { successfulCharges, grossMinor: 7900 * successfulCharges, refundedMinor: 0, netAfterRefundsMinor: 7900 * successfulCharges }
  } : {}
});

test('healthy pages alone never establish a paid sale', () => {
  const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true });
  assert.equal(state.technicalPathHealthy, true);
  assert.equal(state.firstSaleVerified, false);
  assert.equal(state.trafficStatus, 'UNMEASURED');
  assert.equal(state.paymentStatus, 'STRIPE_DATA_NOT_CONNECTED');
  assert.equal(state.deliveryStatus, 'NOT_VERIFIED');
  assert.equal(state.nextAction, 'MEASURE_EXTERNAL_BUYER_TRAFFIC');
});

test('zero genuine visitors prioritizes acquisition without inferring payment state', () => {
  const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 0, paidOrders: 0 });
  assert.equal(state.nextAction, 'DISTRIBUTE_TO_RELEVANT_BUYERS');
  assert.equal(state.paymentStatus, 'STRIPE_DATA_NOT_CONNECTED');
  assert.equal(state.firstSaleVerified, false);
});

test('numeric paidOrders claims cannot establish a first sale or zero orders', () => {
  for (const paidOrders of [0, 1, 99]) {
    const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 100, paidOrders });
    assert.equal(state.firstSaleVerified, false);
    assert.equal(state.paymentStatus, 'STRIPE_DATA_NOT_CONNECTED');
    assert.equal(state.nextAction, 'VERIFY_PAID_STRIPE_EVENTS');
  }
});

test('a complete live Stripe zero-charge read identifies a conversion blocker', () => {
  const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 100, stripeEvidence: liveEvidence(0) });
  assert.equal(state.nextAction, 'IMPROVE_OFFER_CONVERSION');
  assert.equal(state.paymentStatus, 'NO_PAID_ORDERS');
  assert.equal(state.firstSaleVerified, false);
});

test('a complete live Stripe positive-charge read is distinct from fulfillment', () => {
  const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 100, stripeEvidence: liveEvidence(1) });
  assert.equal(state.firstSaleVerified, true);
  assert.equal(state.paymentStatus, 'PAYMENTS_RECORDED');
  assert.equal(state.deliveryStatus, 'NOT_VERIFIED');
  assert.equal(state.nextAction, 'VERIFY_ORDER_BOUND_FULFILLMENT');
});

test('incomplete or inconsistent Stripe summaries fail closed', () => {
  const invalid = [
    { ...liveEvidence(1), state: 'INCOMPLETE' },
    { ...liveEvidence(1), scanned: 0 },
    { ...liveEvidence(1), successfulCharges: 2 },
    { ...liveEvidence(1), totals: {} },
    { ...liveEvidence(1), totals: { USD: { successfulCharges: 1, grossMinor: 7900, refundedMinor: 8000, netAfterRefundsMinor: -100 } } },
    { ...liveEvidence(0), scanned: -1 },
    { ...liveEvidence(0), successfulCharges: '0' },
    null
  ];
  for (const stripeEvidence of invalid) {
    const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 100, stripeEvidence });
    assert.equal(state.firstSaleVerified, false);
    assert.equal(state.paymentStatus, 'STRIPE_DATA_NOT_CONNECTED');
  }
});

test('fully refunded or zero-value Stripe charges do not establish collected revenue', () => {
  for (const grossMinor of [0, 7900]) {
    const stripeEvidence = {
      state: 'VERIFIED', scanned: 1, successfulCharges: 1,
      totals: { USD: { successfulCharges: 1, grossMinor, refundedMinor: grossMinor, netAfterRefundsMinor: 0 } }
    };
    const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: true, trafficCount: 100, stripeEvidence });
    assert.equal(state.firstSaleVerified, false);
    assert.equal(state.paymentStatus, 'PAYMENTS_RECORDED');
    assert.equal(state.nextAction, 'VERIFY_REFUNDS_AND_NET_REVENUE');
  }
});

test('failed checkout blocks paid promotion readiness', () => {
  const state = classifyRevenueEvidence({ guideHealthy: true, checkoutHealthy: false });
  assert.equal(state.technicalPathHealthy, false);
  assert.equal(state.nextAction, 'REPAIR_BUYER_LINKS');
});

test('malformed traffic counters never become measured buyer activity', () => {
  for (const trafficCount of [-1, 0.5, NaN, Infinity, '17', false, true, {}, []]) {
    const state = classifyRevenueEvidence({
      guideHealthy: true, checkoutHealthy: true, trafficCount
    });
    assert.equal(state.trafficStatus, 'UNMEASURED');
    assert.equal(state.nextAction, 'MEASURE_EXTERNAL_BUYER_TRAFFIC');
  }
});

test('unverified delivery counters cannot claim delivered orders or completed fulfillment', () => {
  for (const deliveredOrders of [0, 1, 100, -1, '12', true]) {
    const state = classifyRevenueEvidence({
      guideHealthy: true, checkoutHealthy: true,
      trafficCount: 10, stripeEvidence: liveEvidence(1), deliveredOrders
    });
    assert.equal(state.deliveryStatus, 'NOT_VERIFIED');
    assert.equal(state.firstSaleVerified, true);
    assert.equal(state.nextAction, 'VERIFY_ORDER_BOUND_FULFILLMENT');
  }
});
