import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDraftCsv, buildDraftRows, buildManualPacketCsv } from './ebay-draft-feed.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../marketplaces/ebay/garment-steamer.json', import.meta.url), 'utf8'));

test('draft feed uses eBay documented minimal draft headers', () => {
  const { headers, row } = buildDraftRows(manifest);
  assert.deepEqual(headers, ['Action','Custom label (SKU)','Category ID','Title']);
  assert.equal(row[0], 'Draft');
  assert.equal(row[1], 'CJYD245844002BY');
  assert.equal(row[2], '79656');
  assert.equal(row[3], manifest.product.title);
});

test('draft CSV contains one product and no checkout or dispatch claims', () => {
  const out = buildDraftCsv(manifest);
  assert.equal(out.trim().split('\n').length, 2);
  assert.match(out, /^Action,Custom label \(SKU\),Category ID,Title/m);
  assert.doesNotMatch(out, /stripe|buy\.stripe|United States|USA|U\.S\./i);
});

test('manual packet is complete enough for first-item manual entry', () => {
  const out = buildManualPacketCsv(manifest);
  assert.match(out, /Price USD,29\.99/);
  assert.match(out, /Best Offer floor USD,28\.49/);
  assert.match(out, /Item specific: Type,Handheld/);
  assert.match(out, /Item specific: Power Type,USB/);
  assert.match(out, /Item specific: Country of Origin,China/);
  assert.doesNotMatch(out, /buy\.stripe\.com/i);
});
