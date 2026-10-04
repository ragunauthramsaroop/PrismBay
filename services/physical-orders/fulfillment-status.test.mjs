import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { openLedger } from './ledger.mjs';
import { openContactVault } from './contact-vault.mjs';
import { FileJobStore } from '../../scripts/commerce-job-file-store.mjs';
import { createFulfillmentStatusAutomation, createPhysicalRecipientResolver, statusTokenAuthorized, validateFulfillmentEvidence } from './fulfillment-status.mjs';

const ENC_KEY = '66'.repeat(32);
const REF_KEY = '77'.repeat(32);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prismbay-fulfillment-auto-'));
  const ledger = await openLedger(path.join(root, 'ledger'));
  t.after(async () => { await ledger.close(); await rm(root, { recursive: true, force: true }); });
  await ledger.transact((state) => {
    state.orders.pi_test_order = {
      paymentIntentId: 'pi_test_order',
      sessionId: 'cs_test_order123',
      paid: true,
      status: 'manual_fulfillment',
      reason: null,
      items: [{ sku: 'crevice', quantity: 1 }]
    };
  });
  const contactVault = await openContactVault({ directory: path.join(root, 'contacts'), encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const captured = await contactVault.capturePaidCheckout({ email: 'buyer@example.com', checkoutRef: 'cs_test_order123', now: '2026-10-04T04:00:00.000Z' });
  const jobStore = await new FileJobStore(path.join(root, 'jobs.json')).load();
  return { ledger, contactVault, captured, jobStore, automation: createFulfillmentStatusAutomation({ ledger, contactVault, jobStore }) };
}

function evidence(type, overrides = {}) {
  return {
    eventId: `ful_${type}_001`,
    sessionId: 'cs_test_order123',
    type,
    source: type === 'delivery_confirmed' ? 'carrier_api' : type === 'refund_processed' ? 'stripe_webhook' : 'supplier_api',
    evidenceRef: `evidence-${type}-001`,
    occurredAt: '2026-10-04T05:00:00.000Z',
    trackingUrl: ['shipment_update', 'delivery_exception'].includes(type) ? 'https://carrier.example/track/PB1001' : undefined,
    refundAmountUsd: type === 'refund_processed' ? 12.95 : undefined,
    ...overrides
  };
}

test('delivery and refund evidence sources fail closed', () => {
  assert.equal(validateFulfillmentEvidence(evidence('delivery_confirmed', { source: 'supplier_api' })).ok, false);
  assert.equal(validateFulfillmentEvidence(evidence('refund_processed', { source: 'carrier_api' })).ok, false);
  assert.equal(validateFulfillmentEvidence(evidence('shipment_update', { trackingUrl: 'http://carrier.example/x' })).ok, false);
  assert.equal(validateFulfillmentEvidence(evidence('refund_processed', { refundAmountUsd: -1 })).ok, false);
});

test('processing, shipped and delivered states project notification jobs', async (t) => {
  const { automation, ledger, contactVault, captured, jobStore } = await fixture(t);
  const processing = await automation.record(evidence('order_processing'));
  assert.equal(processing.ok, true);
  const shipped = await automation.record(evidence('shipment_update', { occurredAt: '2026-10-04T06:00:00.000Z' }));
  assert.equal(shipped.ok, true);
  const delivered = await automation.record(evidence('delivery_confirmed', { occurredAt: '2026-10-05T06:00:00.000Z' }));
  assert.equal(delivered.ok, true);
  assert.equal(ledger.snapshot().orders.pi_test_order.fulfillment.state, 'delivered');
  const contact = await contactVault.resolveRecipient({ recipientRef: captured.recipientRef });
  assert.equal(contact.deliveryVerified, true);
  const operations = jobStore.list().map((job) => job.operation).sort();
  assert.deepEqual(operations, ['delivered', 'processing_update', 'review_request', 'shipped'].sort());
});

test('illegal fulfillment transition is rejected without a notification job', async (t) => {
  const { automation, jobStore } = await fixture(t);
  await assert.rejects(() => automation.record(evidence('delivery_confirmed')), /illegal_fulfillment_transition/);
  assert.equal(jobStore.list().length, 0);
});

test('stale fulfillment evidence cannot move chronology backwards', async (t) => {
  const { automation, jobStore } = await fixture(t);
  await automation.record(evidence('order_processing', { occurredAt: '2026-10-04T08:00:00.000Z' }));
  await assert.rejects(
    () => automation.record(evidence('shipment_update', { occurredAt: '2026-10-04T07:00:00.000Z' })),
    /stale_fulfillment_evidence/,
  );
  assert.equal(jobStore.list().length, 1);
});

test('replayed evidence keeps notification queue idempotent', async (t) => {
  const { automation, jobStore } = await fixture(t);
  const first = await automation.record(evidence('order_processing'));
  const replay = await automation.record(evidence('order_processing'));
  assert.equal(first.insertedJobs, 1);
  assert.equal(replay.replay, true);
  assert.equal(replay.insertedJobs, 0);
  assert.equal(replay.duplicateJobs, 1);
  assert.equal(jobStore.list().length, 1);
});

test('same fulfillment event id with changed evidence is rejected', async (t) => {
  const { automation, jobStore } = await fixture(t);
  await automation.record(evidence('order_processing'));
  await assert.rejects(
    () => automation.record(evidence('order_processing', { evidenceRef: 'different-evidence-ref' })),
    /fulfillment_event_replay_mismatch/,
  );
  assert.equal(jobStore.list().length, 1);
});

test('refund evidence projects the verified amount without requiring supplier mutation', async (t) => {
  const { automation, ledger, jobStore } = await fixture(t);
  const result = await automation.record(evidence('refund_processed'));
  assert.equal(result.ok, true);
  assert.equal(ledger.snapshot().orders.pi_test_order.fulfillment.state, 'refunded');
  assert.equal(ledger.snapshot().orders.pi_test_order.fulfillment.refundAmountUsd, 12.95);
  const [job] = jobStore.list();
  assert.equal(job.operation, 'refund');
  assert.equal(job.payload.refundAmountUsd, 12.95);
});

test('physical recipient resolver joins encrypted contact with tracking context', async (t) => {
  const { automation, ledger, contactVault, captured } = await fixture(t);
  await automation.record(evidence('shipment_update'));
  const resolveRecipient = createPhysicalRecipientResolver({ contactVault, ledger });
  const resolved = await resolveRecipient({ recipientRef: captured.recipientRef, orderRef: 'cs_test_order123' });
  assert.equal(resolved.email, 'buyer@example.com');
  assert.equal(resolved.trackingUrl, 'https://carrier.example/track/PB1001');
  assert.equal(resolved.productName, 'crevice');
});

test('repeat customer checkout history retains older order-to-recipient linkage', async (t) => {
  const { contactVault, captured } = await fixture(t);
  const second = await contactVault.capturePaidCheckout({
    email: 'buyer@example.com',
    checkoutRef: 'cs_test_order456',
    now: '2026-10-05T04:00:00.000Z'
  });
  assert.equal(second.recipientRef, captured.recipientRef);
  assert.equal(await contactVault.recipientRefForCheckout('cs_test_order123'), captured.recipientRef);
  assert.equal(await contactVault.recipientRefForCheckout('cs_test_order456'), captured.recipientRef);
});

test('status write token comparison requires a long exact token', () => {
  const token = 'status-write-token-abcdefghijklmnopqrstuvwxyz-123456';
  assert.equal(statusTokenAuthorized(token, token), true);
  assert.equal(statusTokenAuthorized(token, `${token}x`), false);
  assert.equal(statusTokenAuthorized('short', 'short'), false);
});
