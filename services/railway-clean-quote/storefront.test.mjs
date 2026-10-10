import test from 'node:test';
import assert from 'node:assert/strict';
import { buyerPage, CANONICAL, createStorefrontServer, isBuyerPath, PRODUCT_IMAGE } from './storefront.mjs';

test('buyer routes include GET and HEAD-compatible product paths', () => {
  assert.equal(isBuyerPath('/'), true);
  assert.equal(isBuyerPath('/garment-steamer'), true);
  assert.equal(isBuyerPath('/garment-steamer/'), true);
  assert.equal(isBuyerPath('/v1/quote'), false);
});

test('buyer page uses canonical storefront, verified image and guarded API without direct Stripe exposure', () => {
  const html = buyerPage();
  assert.ok(html.includes(CANONICAL));
  assert.ok(html.includes(PRODUCT_IMAGE));
  assert.ok(html.includes('USD 29.95'));
  assert.ok(html.includes("fetch('/v1/quote'"));
  assert.ok(html.includes('noindex,follow'));
  assert.doesNotMatch(html, /buy\.stripe\.com/);
  assert.match(html, /No payment during ZIP check/);
});

test('live wrapper answers HEAD and GET without invoking supplier APIs', async () => {
  const server = createStorefrontServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const head = await fetch(base + '/garment-steamer/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const get = await fetch(base + '/garment-steamer/');
    assert.equal(get.status, 200);
    assert.match(await get.text(), /Check delivery to your ZIP/);
    const favicon = await fetch(base + '/favicon.ico');
    assert.equal(favicon.status, 204);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
