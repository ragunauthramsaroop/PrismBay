import test from 'node:test';
import assert from 'node:assert/strict';
import { observeStorefront, ORIGIN } from './clean-storefront-observer.mjs';

const html = '<div id="catalog"></div><script src="/assets/catalog-data.js?v=hd"></script><script src="/assets/catalog-ui.js?v=hd"></script><link href="/assets/catalog-store.css?v=hd">';
function fetcher(home = html, broken = '') {
  return async url => {
    if (url.endsWith('/')) return new Response(home, { headers: { 'content-type': 'text/html' } });
    if (url.includes(broken) && broken) throw new Error('network down');
    return new Response('content', { headers: { 'content-type': url.includes('.css') ? 'text/css' : 'text/javascript' } });
  };
}
test('checks actual cache-versioned asset URLs', async () => {
  const report = await observeStorefront(fetcher());
  assert.equal(report.healthy, true);
  assert.equal(report.checks[1].url, ORIGIN + '/assets/catalog-data.js?v=hd');
});
test('outage is recorded without dropping other observations', async () => {
  const report = await observeStorefront(fetcher(html, 'catalog-data'));
  assert.equal(report.healthy, false);
  assert.equal(report.checks.length, 4);
  assert.equal(report.checks[1].status, null);
});
test('homepage outage still produces evidence', async () => {
  const report = await observeStorefront(async () => { throw new Error('timeout'); });
  assert.equal(report.healthy, false);
  assert.ok(report.checks.every(check => !check.ok));
});
test('HTML fallback cannot masquerade as JavaScript', async () => {
  const report = await observeStorefront(async () => new Response(html, { headers: { 'content-type': 'text/html' } }));
  assert.equal(report.healthy, false);
});
test('foreign asset URLs are never fetched', async () => {
  const seen = [];
  await observeStorefront(async url => { seen.push(url); return fetcher(html.replace('/assets/catalog-data.js', 'https://evil.invalid/assets/catalog-data.js'))(url); });
  assert.ok(seen.every(url => url.startsWith(ORIGIN + '/')));
  assert.equal(seen.length, 3);
});
