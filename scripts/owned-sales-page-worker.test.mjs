import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';
import { buildOfferPage, buildHub, ownedSalesUrls, salesPlanFromReport } from './owned-sales-page-worker.mjs';

test('owned sales pages use only existing verified digital offers', () => {
  assert.equal(ACTIVE_DIGITAL_OFFERS.length, 4);
  for (const offer of ACTIVE_DIGITAL_OFFERS) {
    const html = buildOfferPage(offer);
    assert.match(html, new RegExp('\\$' + offer.priceUsd));
    assert.ok(html.includes(offer.checkout));
    assert.ok(html.includes('One-time purchase'));
    for (const item of offer.deliverables) assert.ok(html.includes(item));
    assert.doesNotMatch(html, /guaranteed|best[- ]?seller|only \\d+ left|verified customer|thousands of customers/i);
  }
});

test('bundle page uses verified price, Stripe checkout and comparison-first copy', () => {
  const offer = ACTIVE_DIGITAL_OFFERS.find(row => row.slug === 'bundle');
  assert.ok(offer);
  const html = buildOfferPage(offer);
  assert.match(html, /\$179/);
  assert.ok(html.includes('https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t'));
  assert.match(html, /Compare the included systems/);
  assert.match(html, /Compare first/);
  assert.match(html, /No subscription/);
});

test('owned sales pages include search and conversion metadata', () => {
  const stakeholder = ACTIVE_DIGITAL_OFFERS.find(row => row.slug === 'stakeholder');
  const html = buildOfferPage(stakeholder);
  assert.match(html, /<meta name="description"/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /schema\.org\/InStock/);
  assert.match(html, /client_reference_id=owned_seo_stakeholder/);
  assert.match(html, /utm_medium=organic_search/);
});

test('buyer guide hub links all four offer pages', () => {
  const hub = buildHub();
  const urls = ownedSalesUrls();
  assert.equal(urls.length, 5);
  assert.match(urls[0], /\/learn\/$/);
  assert.match(hub, /executive-intelligence-bundle\.html/);
  assert.match(hub, /stakeholder-mapping-toolkit\.html/);
  assert.match(hub, /esg-reporting-toolkit\.html/);
  assert.match(hub, /board-briefing-white-paper-system\.html/);
});

test('published buyer page uses a verified FreeLLM strategy for the active offer', () => {
  const offer = ACTIVE_DIGITAL_OFFERS.find(row => row.slug === 'stakeholder');
  const report = {
    offer: { slug: offer.slug },
    freeLLM: { status: 'ok', strategy: 'free-guide-first' }
  };
  const plan = salesPlanFromReport(offer, report);
  assert.ok(plan);
  assert.equal(plan.llmStrategy, 'free-guide-first');
  const html = buildOfferPage(offer, plan);
  assert.match(html, /data-sales-strategy="free-guide-first"/);
  assert.match(html, /Start with the free/);
  assert.match(html, new RegExp('\\$' + offer.priceUsd));
  assert.doesNotMatch(html, /guaranteed|best[- ]?seller|only \\d+ left|verified customer/i);
});

test('buyer page falls back when the FreeLLM report is not verified for that offer', () => {
  const offer = ACTIVE_DIGITAL_OFFERS.find(row => row.slug === 'stakeholder');
  assert.equal(salesPlanFromReport(offer, {
    offer: { slug: offer.slug },
    freeLLM: { status: 'invalid_output', strategy: 'evidence-led' }
  }), null);
  assert.equal(salesPlanFromReport(offer, {
    offer: { slug: 'esg' },
    freeLLM: { status: 'ok', strategy: 'evidence-led' }
  }), null);
  const html = buildOfferPage(offer);
  assert.match(html, /data-sales-strategy="baseline"/);
});
