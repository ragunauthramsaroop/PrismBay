import test from 'node:test';
import assert from 'node:assert/strict';
import {
  automationEmailDeliveryKey,
  createStrictAutomationEmailHandler,
  evaluateRecipientForJob
} from './automation-email-delivery-contract.mjs';

function makeJob(templateKind = 'order_received') {
  return {
    id: `job_${templateKind}`,
    jobClass: 'email',
    idempotencyKey: `email:${templateKind}:order-PB-1001`,
    state: 'queued',
    payload: {
      eventId: 'evt_auto_123456',
      recipientRef: 'recipient_abcdef123456',
      orderRef: 'PB-1001',
      productRef: 'crevice',
      trackingRef: 'tracking-PB1001',
      templateKind
    }
  };
}

function eligibleRecipient(overrides = {}) {
  return {
    recipientRef: 'recipient_abcdef123456',
    email: 'buyer@example.com',
    suppressed: false,
    transactionalAllowed: true,
    marketingConsent: true,
    deliveryVerified: true,
    productName: 'Crevice Brush',
    trackingUrl: 'https://carrier.example/track/PB1001',
    reviewUrl: 'https://clean.prismbayai.com/review/PB1001',
    ...overrides
  };
}

function fakeLedger(status = 'reserved') {
  const calls = [];
  return {
    calls,
    async reserve(input) { calls.push(['reserve', input]); return { status }; },
    async markSent(key, metadata) { calls.push(['sent', key, metadata]); },
    async markFailedKnown(key, code) { calls.push(['failed_known', key, code]); },
    async markManualReview(key, code) { calls.push(['manual_review', key, code]); }
  };
}

const render = async (kind) => ({
  subject: `Subject ${kind}`,
  text: `Text ${kind}`,
  html: `<p>${kind}</p>`
});

test('handler remains disabled unless explicitly enabled', () => {
  assert.equal(createStrictAutomationEmailHandler({ enabled: false }), null);
});

test('suppressed recipient is blocked before ledger reservation or send', async () => {
  const ledger = fakeLedger();
  let sends = 0;
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => eligibleRecipient({ suppressed: true }),
    ledger,
    render,
    send: async () => { sends += 1; return { success: true, outcomeKnown: true }; }
  });
  const result = await handler(makeJob());
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'recipient_suppressed');
  assert.equal(ledger.calls.length, 0);
  assert.equal(sends, 0);
});

test('abandonment recovery requires current marketing consent', () => {
  const result = evaluateRecipientForJob(
    makeJob('abandonment'),
    eligibleRecipient({ marketingConsent: false })
  );
  assert.deepEqual(result, { allowed: false, reason: 'marketing_consent_required' });
});

test('review request requires verified delivery evidence', () => {
  const result = evaluateRecipientForJob(
    makeJob('review_request'),
    eligibleRecipient({ deliveryVerified: false })
  );
  assert.deepEqual(result, { allowed: false, reason: 'verified_delivery_required' });
});

test('already-sent delivery is treated as complete without another send', async () => {
  const ledger = fakeLedger('duplicate_sent');
  let sends = 0;
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => eligibleRecipient(),
    ledger,
    render,
    send: async () => { sends += 1; return { success: true, outcomeKnown: true }; }
  });
  const result = await handler(makeJob());
  assert.deepEqual(result, { ok: true, duplicate: true });
  assert.equal(sends, 0);
});

test('known sender rejection is safely retryable and recorded as failed_known', async () => {
  const ledger = fakeLedger();
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => eligibleRecipient(),
    ledger,
    render,
    send: async () => ({ success: false, outcomeKnown: true, errorCode: 'provider_rejected', httpStatus: 503 })
  });
  const result = await handler(makeJob());
  assert.equal(result.ok, false);
  assert.equal(result.outcomeKnown, true);
  assert.equal(result.errorCode, 'provider_rejected');
  assert.equal(ledger.calls.at(-1)[0], 'failed_known');
});

test('unknown sender outcome goes directly to manual review', async () => {
  const ledger = fakeLedger();
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => eligibleRecipient(),
    ledger,
    render,
    send: async () => ({ success: false, outcomeKnown: false, errorCode: 'provider_unknown' })
  });
  const result = await handler(makeJob());
  assert.equal(result.ok, false);
  assert.equal(result.outcomeKnown, false);
  assert.equal(ledger.calls.at(-1)[0], 'manual_review');
});

test('successful send is marked sent with provider message id', async () => {
  const ledger = fakeLedger();
  let sendParams = null;
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => eligibleRecipient(),
    ledger,
    render,
    send: async (params) => {
      sendParams = params;
      return { success: true, outcomeKnown: true, providerMessageId: 'msg_test_123' };
    }
  });
  const result = await handler(makeJob());
  assert.deepEqual(result, { ok: true, duplicate: false });
  assert.equal(sendParams.to, 'buyer@example.com');
  assert.equal(ledger.calls.at(-1)[0], 'sent');
  assert.equal(ledger.calls.at(-1)[2].providerMessageId, 'msg_test_123');
});

test('recipient resolver outage fails closed before reservation', async () => {
  const ledger = fakeLedger();
  let sends = 0;
  const handler = createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient: async () => { throw new Error('database unavailable'); },
    ledger,
    render,
    send: async () => { sends += 1; return { success: true, outcomeKnown: true }; }
  });
  const result = await handler(makeJob());
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'recipient_resolution_unavailable');
  assert.equal(ledger.calls.length, 0);
  assert.equal(sends, 0);
});

test('delivery key is stable and contains no raw customer email', () => {
  const first = automationEmailDeliveryKey(makeJob('shipped'));
  const second = automationEmailDeliveryKey(makeJob('shipped'));
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first.includes('buyer@example.com'), false);
});

test('recipient reference mismatch fails closed', () => {
  const result = evaluateRecipientForJob(
    makeJob('order_received'),
    eligibleRecipient({ recipientRef: 'recipient_other' })
  );
  assert.deepEqual(result, { allowed: false, reason: 'recipient_reference_mismatch' });
});
