import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSitemap } from './sales-sitemap-sync.mjs';
import { ownedSalesUrls } from './owned-sales-page-worker.mjs';

test('sitemap sync adds each owned sales URL once', () => {
  const input = '<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://clean.prismbayai.com/</loc></url>\n  <url><loc>https://ragunauthramsaroop.github.io/PrismBay/learn/</loc><lastmod>2026-09-01</lastmod></url>\n  <url><loc>https://ragunauthramsaroop.github.io/PrismBay/learn/stakeholder-mapping-toolkit.html</loc></url>\n</urlset>\n';
  const once = mergeSitemap(input, '2026-10-01');
  const twice = mergeSitemap(once, '2026-10-02');
  assert.equal(once.includes('ragunauthramsaroop.github.io/PrismBay/learn'),false);
  assert.equal(twice.includes('ragunauthramsaroop.github.io/PrismBay/learn'),false);
  for (const url of ownedSalesUrls()) {
    assert.ok(url.startsWith('https://clean.prismbayai.com/learn/'));
    assert.equal(once.split('<loc>' + url + '</loc>').length - 1, 1);
    assert.equal(twice.split('<loc>' + url + '</loc>').length - 1, 1);
  }
});

test('invalid sitemap fails closed', () => {
  assert.throws(() => mergeSitemap('not xml'), /invalid_sitemap/);
});
