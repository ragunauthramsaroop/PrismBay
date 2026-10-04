import test from 'node:test';
import assert from 'node:assert/strict';
import { getMeilisearchIndexSettings, searchOffline, toMeilisearchDocuments } from './search-index-adapter.mjs';

const products = [
  {
    sku: 'brush-1', slug: 'detail-brush', name: 'Detail Brush', category: 'cleaning-tools',
    description: 'Reusable brush for narrow spaces', priceUsd: 12.95,
    checkoutUrl: 'https://buy.stripe.com/not-for-search', imageUrl: 'https://example.invalid/brush.jpg',
    productUrl: '/products/detail-brush/', source: 'legacy-live-migration'
  },
  {
    sku: 'scrub-1', slug: 'bathroom-scrubber', name: 'Bathroom Scrubber', category: 'bathroom-accessories',
    description: 'Reusable bathroom cleaning tool', priceUsd: 29.95,
    imageUrl: 'https://example.invalid/scrub.jpg', productUrl: '/products/bathroom-scrubber/', source: 'sale-ready-gate'
  }
];

test('maps only public search fields and never exposes checkout URLs', () => {
  const docs = toMeilisearchDocuments(products);
  assert.equal(docs.length, 2);
  assert.equal(docs[0].id, 'brush-1');
  assert.equal('checkoutUrl' in docs[0], false);
  assert.equal(JSON.stringify(docs).includes('buy.stripe.com'), false);
});

test('settings expose only CE-style search, filter and sort fields', () => {
  const settings = getMeilisearchIndexSettings();
  assert.deepEqual(settings.filterableAttributes, ['category', 'priceUsd', 'source']);
  assert.deepEqual(settings.sortableAttributes, ['priceUsd', 'name']);
  assert.equal(settings.provenance.license, 'MIT');
  assert.equal(settings.provenance.enterpriseFeaturesUsed, false);
});

test('offline fallback performs multi-term matching', () => {
  const docs = toMeilisearchDocuments(products);
  const out = searchOffline(docs, { query: 'reusable brush' });
  assert.deepEqual(out.map((x) => x.sku), ['brush-1']);
});

test('offline fallback filters by category', () => {
  const docs = toMeilisearchDocuments(products);
  const out = searchOffline(docs, { filters: { category: 'bathroom-accessories' } });
  assert.deepEqual(out.map((x) => x.sku), ['scrub-1']);
});

test('offline fallback filters by price range', () => {
  const docs = toMeilisearchDocuments(products);
  const out = searchOffline(docs, { filters: { minPriceUsd: 20, maxPriceUsd: 40 } });
  assert.deepEqual(out.map((x) => x.sku), ['scrub-1']);
});

test('offline fallback sorts by price descending', () => {
  const docs = toMeilisearchDocuments(products);
  const out = searchOffline(docs, { sort: 'priceUsd:desc' });
  assert.deepEqual(out.map((x) => x.sku), ['scrub-1', 'brush-1']);
});

test('empty product set is a valid fallback state', () => {
  assert.deepEqual(toMeilisearchDocuments([]), []);
  assert.deepEqual(searchOffline([], { query: 'anything' }), []);
});

test('invalid prices fail closed', () => {
  assert.throws(() => toMeilisearchDocuments([{ ...products[0], priceUsd: 0 }]), /search_document_invalid_price/);
});
