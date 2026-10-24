import test from 'node:test';
import assert from 'node:assert/strict';
import { observeStorefront, ORIGIN } from './clean-storefront-observer.mjs';

const home = '<html><head><style>body{color:#173a2f;background:#f6f8f6;font-family:Arial,sans-serif;min-height:100vh;}</style></head><body><div>PrismBay <b>Clean</b></div><a href="/garment-steamer/">Product</a><a href="/shipping.html">Shipping</a></body></html>';
const buyer = '<html><h1>Portable Garment Steamer</h1><p>No payment during ZIP check</p><a href="/shipping.html">Request shipping review</a></html>';
const policy = '<html><head><link rel="stylesheet" href="/assets/store.css?v=3"></head><h1>Shipping Policy</h1><p>Physical-product checkout remains unavailable until supplier approval before any physical-product payment.</p></html>';

function fetcher(overrides = {}) {
  const pages = {
    [ORIGIN + '/']: { body: home, type: 'text/html' },
    [ORIGIN + '/assets/store.css?v=3']: { body: 'body{color:green}', type: 'text/css' },
    [ORIGIN + '/garment-steamer/']: { body: buyer, type: 'text/html' },
    [ORIGIN + '/shipping.html']: { body: policy, type: 'text/html' },
    ...overrides
  };
  return async url => {
    const page = pages[url];
    if (!page) throw new Error('unexpected fetch: ' + url);
    if (page.throw) throw new Error('network down');
    return new Response(page.body, { status: page.status || 200, headers: { 'content-type': page.type } });
  };
}

test('verifies the current canonical buyer journey and versioned stylesheet', async () => {
  const report = await observeStorefront(fetcher());
  assert.equal(report.healthy, true);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.checks.length, 5);
  assert.equal(report.checks[1].resource, 'homepage_inline_style');
  assert.equal(report.checks[4].url, ORIGIN + '/assets/store.css?v=3');
});

test('fails closed when shipping policy claims supplier stock is checked only after payment', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/shipping.html']: { body: '<h1>Shipping Policy</h1><p>Supplier stock and delivery timing are confirmed after payment.</p>', type: 'text/html' }
  }));
  assert.equal(report.healthy, false);
  assert.equal(report.checks[3].reason, 'physical_policy_not_prepayment_gated');
});

test('rejects direct physical checkout on the gated buyer route', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: buyer + '<a href="https://buy.stripe.com/example">Pay</a>', type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('reports buyer-route outage without losing other observations', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { throw: true }
  }));
  assert.equal(report.healthy, false);
  assert.equal(report.checks[2].status, null);
  assert.equal(report.checks.length, 5);
});

test('HTML fallback cannot masquerade as CSS', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/assets/store.css?v=3']: { body: home, type: 'text/html' }
  }));
  assert.equal(report.checks[4].ok, false);
});

test('foreign stylesheet URLs are never fetched', async () => {
  const seen = [];
  const foreignPolicy = policy.replace('/assets/store.css?v=3', 'https://untrusted.invalid/assets/store.css?v=3');
  const inner = fetcher({ [ORIGIN + '/shipping.html']: { body: foreignPolicy, type: 'text/html' } });
  const report = await observeStorefront(async url => { seen.push(url); return inner(url); });
  assert.equal(report.healthy, false);
  assert.equal(report.checks[4].reason, 'missing_same_origin_reference');
  assert.ok(seen.every(url => url.startsWith(ORIGIN + '/')));
  assert.equal(seen.length, 3);
});

test('homepage outage does not fabricate healthy storefront', async () => {
  const report = await observeStorefront(async () => { throw new Error('timeout'); });
  assert.equal(report.healthy, false);
  assert.ok(report.checks.every(check => !check.ok));
});
