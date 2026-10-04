import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { FileJobStore } from '../../scripts/commerce-job-file-store.mjs';
import { createPhysicalAutomationBridge, eligiblePhysicalCheckout } from './automation-bridge.mjs';
import { openContactVault } from './contact-vault.mjs';

const ENC_KEY = '44'.repeat(32);
const REF_KEY = '55'.repeat(32);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prismbay-physical-auto-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const contactVault = await openContactVault({
    directory: path.join(root, 'contacts'),
    encryptionSecret: ENC_KEY,
    recipientRefSecret: REF_KEY
  });
  const jobStore = await new FileJobStore(path.join(root, 'jobs.json')).load();
  return { root, contactVault, jobStore, bridge: createPhysicalAutomationBridge({ contactVault, jobStore, now: () => Date.parse('2026-10-04T04:00:00.000Z') }) };
}

function paidEvent(overrides = {}) {
  return {
    id: 'evt_test_automation123',
    type: 'checkout.session.completed',
    created: 1791086400,
    data: {
      object: {
        id: 'cs_test_automation123',
        mode: 'payment',
        payment_status: 'paid',
        amount_total: 1295,
        currency: 'usd',
        customer_details: { email: 'buyer@example.com' },
        ...overrides
      }
    }
  };
}

function snapshot(status = 'manual_fulfillment') {
  return {
    version: 1,
    events: {},
    orders: {
      pi_test_order123: {
        paymentIntentId: 'pi_test_order123',
        sessionId: 'cs_test_automation123',
        paid: true,
        status,
        reason: null,
        items: [{ sku: 'crevice', quantity: 1 }]
      }
    }
  };
}

test('only a verified manual-fulfillment paid checkout is automation eligible', () => {
  assert.equal(eligiblePhysicalCheckout(paidEvent(), snapshot()).eligible, true);
  assert.deepEqual(eligiblePhysicalCheckout(paidEvent(), snapshot('needs_review')), {
    eligible: false,
    reason: 'physical_order_not_automation_ready'
  });
  assert.equal(eligiblePhysicalCheckout(paidEvent({ payment_status: 'unpaid' }), snapshot()).eligible, false);
});

test('paid physical checkout projects one de-identified order-received job', async (t) => {
  const { bridge, jobStore } = await fixture(t);
  const projected = await bridge.projectStripeEvent(paidEvent(), snapshot());
  assert.equal(projected.projected, true);
  assert.equal(projected.insertedJobs, 1);
  assert.match(projected.recipientRef, /^recipient_[A-Za-z0-9_-]{32}$/);
  const jobs = jobStore.list();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].operation, 'order_received');
  assert.equal(jobs[0].payload.recipientRef, projected.recipientRef);
  assert.equal(Object.values(jobs[0].payload).includes('buyer@example.com'), false);
});

test('Stripe webhook replay preserves queue idempotency', async (t) => {
  const { bridge, jobStore } = await fixture(t);
  const first = await bridge.projectStripeEvent(paidEvent(), snapshot());
  const replay = await bridge.projectStripeEvent(paidEvent(), snapshot());
  assert.equal(first.insertedJobs, 1);
  assert.equal(replay.insertedJobs, 0);
  assert.equal(replay.duplicateJobs, 1);
  assert.equal(jobStore.list().length, 1);
});

test('raw email never appears in durable automation queue file', async (t) => {
  const { bridge, jobStore } = await fixture(t);
  await bridge.projectStripeEvent(paidEvent(), snapshot());
  const persisted = await readFile(jobStore.filePath, 'utf8');
  assert.equal(persisted.includes('buyer@example.com'), false);
});

test('missing customer email skips automation without corrupting order processing', async (t) => {
  const { bridge, jobStore } = await fixture(t);
  const event = paidEvent({ customer_details: {}, customer_email: '' });
  const result = await bridge.projectStripeEvent(event, snapshot());
  assert.deepEqual(result, { projected: false, reason: 'customer_email_missing' });
  assert.equal(jobStore.list().length, 0);
});

test('multi-item physical order does not invent a product identity', async (t) => {
  const { bridge, jobStore } = await fixture(t);
  const multi = snapshot();
  multi.orders.pi_test_order123.items = [
    { sku: 'crevice', quantity: 1 },
    { sku: 'pethair', quantity: 1 }
  ];
  await bridge.projectStripeEvent(paidEvent(), multi);
  const [job] = jobStore.list();
  assert.equal(job.payload.productRef, null);
});
