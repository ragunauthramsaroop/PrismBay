import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_CONTENT_POLICY, researchContentBrief, buildResearchContentQueue } from './retail-content-brief.mjs';

const candidate = (slug = 'garment-steamer', name = 'Portable Garment Steamer') => ({ slug, name, signalScore: 99 });

test('public attention creates research-only concepts, never retail offers', () => {
  const brief = researchContentBrief(candidate(), 1);
  assert.equal(brief.status, 'RESEARCH_CANDIDATE');
  assert.equal(brief.channel, 'tiktok');
  for (const key of ['approved', 'saleReady', 'finalZipFreightVerified', 'checkoutAllowed', 'mediaRightsVerified', 'publicationAuthorized', 'publishable']) {
    assert.equal(brief[key], false, `${key} must fail closed`);
  }
  assert.match(brief.cta, /No product offer or checkout/);
  assert.doesNotMatch(brief.hook, /before.and.after|buy now|order now|guaranteed/i);
  assert.match(brief.mediaPlan, /Original typography/);
  assert.doesNotMatch(JSON.stringify(brief), /youtube/i);
});

test('ranking only changes research prompts, not commercial authorization', () => {
  for (const rank of [1, 2, 3, 4, 5]) {
    const brief = researchContentBrief(candidate(), rank);
    assert.equal(brief.rank, rank);
    assert.equal(brief.publishable, false);
    assert.equal(brief.checkoutAllowed, false);
  }
});

test('invalid candidate identities and ranks fail closed', () => {
  for (const product of [null, {}, candidate('../outside'), candidate('Bad Slug'), candidate('valid', ''), candidate('__proto__')]) {
    assert.throws(() => researchContentBrief(product, 1), /Invalid research content candidate/);
  }
  for (const rank of [0, -1, 1.5, NaN, '1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => researchContentBrief(candidate(), rank), /Invalid research content candidate/);
  }
});

test('queue caps five items, preserves order, and never claims approval', () => {
  const at = new Date('2026-10-08T00:00:00.000Z');
  const ranked = Array.from({ length: 7 }, (_, i) => candidate(`product-${i + 1}`, `Product ${i + 1}`));
  const queue = buildResearchContentQueue(ranked, at);
  assert.equal(queue.schemaVersion, 2);
  assert.equal(queue.updatedAt, at.toISOString());
  assert.equal(queue.items.length, 5);
  assert.deepEqual(queue.items.map(x => x.slug), ranked.slice(0, 5).map(x => x.slug));
  assert.equal(queue.policy, RESEARCH_CONTENT_POLICY);
  assert.ok(queue.items.every(x => x.approved === false && x.publishable === false));
});

test('malformed queue inputs fail closed and empty research list stays empty', () => {
  for (const input of [null, {}, 'not an array']) {
    assert.throws(() => buildResearchContentQueue(input), /Invalid research queue inputs/);
  }
  assert.throws(() => buildResearchContentQueue([candidate()], new Date('invalid')), /Invalid research queue inputs/);
  assert.deepEqual(buildResearchContentQueue([]).items, []);
});
