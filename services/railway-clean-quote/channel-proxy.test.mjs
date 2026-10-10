import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { channelFromBuyerRequest, channelFromQuotePath, createChannelServer } from './channel-proxy.mjs';

test('social buyer attribution accepts only YouTube and TikTok', () => {
  assert.equal(channelFromBuyerRequest(new URL('https://x/garment-steamer/youtube/')), 'youtube');
  assert.equal(channelFromBuyerRequest(new URL('https://x/garment-steamer/tiktok/')), 'tiktok');
  assert.equal(channelFromBuyerRequest(new URL('https://x/garment-steamer/github/?utm_source=youtube')), 'youtube');
  assert.equal(channelFromBuyerRequest(new URL('https://x/garment-steamer/github/?utm_source=tiktok')), 'tiktok');
  assert.equal(channelFromBuyerRequest(new URL('https://x/garment-steamer/github/?utm_source=email')), null);
});

test('social quote attribution accepts only dedicated channel routes', () => {
  assert.equal(channelFromQuotePath('/v1/quote/youtube'), 'youtube');
  assert.equal(channelFromQuotePath('/v1/quote/tiktok/'), 'tiktok');
  assert.equal(channelFromQuotePath('/v1/quote/github'), null);
});

test('legacy github social URLs redirect to dedicated channel path and preserve UTM values', async () => {
  const server = createChannelServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/garment-steamer/github/?utm_source=youtube&utm_medium=shorts`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/garment-steamer/youtube/?utm_source=youtube&utm_medium=shorts');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('dedicated social buyer page uses dedicated quote path without exposing Stripe', async () => {
  const server = createChannelServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/garment-steamer/tiktok/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /\/v1\/quote\/tiktok/);
    assert.doesNotMatch(html, /buy\.stripe\.com/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('dedicated quote path is rewritten to unchanged core quote route without adding source to payload', async () => {
  const base = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ url: req.url, method: req.method, body: JSON.parse(body || '{}') }));
    });
  });
  const server = createChannelServer({ baseServer: base });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/v1/quote/youtube?probe=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ zip: '10001' })
    });
    const out = await response.json();
    assert.equal(out.url, '/v1/quote?probe=1');
    assert.equal(out.method, 'POST');
    assert.deepEqual(out.body, { zip: '10001' });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
