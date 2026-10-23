import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buyerPage, buyerSourceFromPath, CANONICAL, createStorefrontServer, isBuyerPath, PRODUCT_IMAGE, quoteSourceFromPath } from './storefront.mjs';

test('buyer routes include direct and privacy-safe attributed product paths', () => {
  assert.equal(isBuyerPath('/'), true);
  assert.equal(isBuyerPath('/garment-steamer'), true);
  assert.equal(isBuyerPath('/garment-steamer/'), true);
  assert.equal(isBuyerPath('/garment-steamer/github/'), true);
  assert.equal(isBuyerPath('/garment-steamer/canonical/'), true);
  assert.equal(isBuyerPath('/garment-steamer/unknown/'), false);
  assert.equal(isBuyerPath('/v1/quote'), false);
  assert.equal(buyerSourceFromPath('/garment-steamer/github/'), 'github');
  assert.equal(buyerSourceFromPath('/garment-steamer/'), 'direct');
});

test('quote attribution paths map only approved source labels', () => {
  assert.equal(quoteSourceFromPath('/v1/quote/github'), 'github');
  assert.equal(quoteSourceFromPath('/v1/quote/canonical/'), 'canonical');
  assert.equal(quoteSourceFromPath('/v1/quote/guide'), 'guide');
  assert.equal(quoteSourceFromPath('/v1/quote/direct'), 'direct');
  assert.equal(quoteSourceFromPath('/v1/quote/email'), null);
});

test('buyer page uses canonical storefront, verified image and guarded attributed API without direct Stripe exposure', () => {
  const html = buyerPage('github');
  assert.ok(html.includes(CANONICAL));
  assert.ok(html.includes(PRODUCT_IMAGE));
  assert.ok(html.includes('USD 29.95'));
  assert.ok(html.includes("const API='/v1/quote/github'"));
  assert.ok(html.includes('noindex,follow'));
  assert.doesNotMatch(html, /buy\.stripe\.com/);
  assert.match(html, /No payment during ZIP check/);
  assert.match(html, /Fulfillment reviewed after payment/);
});

test('live wrapper answers HEAD and GET without invoking supplier APIs', async () => {
  const server = createStorefrontServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const head = await fetch(base + '/garment-steamer/github/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const get = await fetch(base + '/garment-steamer/github/');
    assert.equal(get.status, 200);
    const html = await get.text();
    assert.match(html, /Check delivery to your ZIP/);
    assert.match(html, /\/v1\/quote\/github/);
    const favicon = await fetch(base + '/favicon.ico');
    assert.equal(favicon.status, 204);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('attributed quote route is rewritten to core quote endpoint without retaining source in payload', async () => {
  const core = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ url: req.url, method: req.method }));
  });
  const server = createStorefrontServer({ coreServer: core });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/v1/quote/github?probe=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ zip: '10001' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.url, '/v1/quote?probe=1');
    assert.equal(body.method, 'POST');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
