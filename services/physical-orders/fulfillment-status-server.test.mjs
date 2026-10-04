import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from './server.mjs';

const WRITE_TOKEN = 'fulfillment-write-token-abcdefghijklmnopqrstuvwxyz-123456';

async function withServer(t, options, fn) {
  const logs = [];
  const server = createServer({
    secret: 'whsec_test_fulfillment_status',
    ledger: { snapshot: () => ({ version: 1, events: {}, orders: {} }) },
    catalog: { accountId: 'acct_test' },
    live: false,
    logger: (line) => logs.push(String(line)),
    ...options
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const address = server.address();
  await fn(`http://127.0.0.1:${address.port}`, logs);
}

test('fulfillment status endpoint is hidden without the exact internal token', async (t) => {
  let calls = 0;
  await withServer(t, {
    fulfillmentStatusWriteToken: WRITE_TOKEN,
    fulfillmentAutomation: { record: async () => { calls += 1; return { ok: true, status: 200 }; } }
  }, async (base) => {
    const response = await fetch(`${base}/internal/fulfillment/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-fulfillment-status-token': 'wrong-token' },
      body: JSON.stringify({ eventId: 'ful_test' })
    });
    assert.equal(response.status, 404);
    assert.equal(calls, 0);
  });
});

test('authorized fulfillment status evidence is projected through the injected automation only', async (t) => {
  let received = null;
  await withServer(t, {
    fulfillmentStatusWriteToken: WRITE_TOKEN,
    fulfillmentAutomation: {
      record: async (body) => {
        received = body;
        return { ok: true, status: 200, state: 'shipped', insertedJobs: 1, duplicateJobs: 0 };
      }
    }
  }, async (base, logs) => {
    const evidence = {
      eventId: 'ful_shipment_001',
      sessionId: 'cs_test_123',
      type: 'shipment_update',
      source: 'carrier_api',
      evidenceRef: 'carrier-evt-123',
      occurredAt: '2026-10-04T06:00:00.000Z',
      trackingUrl: 'https://carrier.example/track/PB123'
    };
    const response = await fetch(`${base}/internal/fulfillment/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-fulfillment-status-token': WRITE_TOKEN },
      body: JSON.stringify(evidence)
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, {
      ok: true,
      replay: false,
      state: 'shipped',
      insertedJobs: 1,
      duplicateJobs: 0,
      error: null
    });
    assert.deepEqual(received, evidence);
    assert.equal(logs.some((line) => line.includes('carrier.example')), false);
    assert.equal(logs.some((line) => line.includes('fulfillment_status_ok')), true);
  });
});

test('known transition conflicts return a safe conflict without leaking details', async (t) => {
  await withServer(t, {
    fulfillmentStatusWriteToken: WRITE_TOKEN,
    fulfillmentAutomation: {
      record: async () => { throw new Error('illegal_fulfillment_transition:shipped->processing'); }
    }
  }, async (base) => {
    const response = await fetch(`${base}/internal/fulfillment/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-fulfillment-status-token': WRITE_TOKEN },
      body: JSON.stringify({ eventId: 'ful_conflict_001' })
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'illegal_fulfillment_transition' });
  });
});
