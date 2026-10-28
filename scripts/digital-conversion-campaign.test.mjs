import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_DIGITAL_OFFERS, auditPublicStripeLinks, campaignForSlot, currentSixHourSlot } from './digital-conversion-campaign.mjs';

test('rotate four verified paid document offers across six-hour cloud runs', () => {
  assert.equal(ACTIVE_DIGITAL_OFFERS.length, 4);
  const first = [0,1,2,3,4,5,6,7].map(x => campaignForSlot(x).offer.slug);
  assert.deepEqual(first, ['stakeholder','esg','whitepaper','bundle','stakeholder','esg','whitepaper','bundle']);
  assert.equal(currentSixHourSlot(0),0);
  assert.equal(currentSixHourSlot(6 * 60 * 60 * 1000),1);
});

test('bundle uses the verified live Stripe offer and exact component arithmetic', () => {
  const bundle = ACTIVE_DIGITAL_OFFERS.find(offer => offer.slug === 'bundle');
  assert.ok(bundle);
  assert.equal(bundle.priceUsd, 179);
  assert.equal(bundle.checkout, 'https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t');
  assert.equal(bundle.deliverables.length, 3);
  const individualTotal = ACTIVE_DIGITAL_OFFERS
    .filter(offer => offer.slug !== 'bundle')
    .reduce((sum, offer) => sum + offer.priceUsd, 0);
  assert.equal(individualTotal, 227);
  assert.equal(individualTotal - bundle.priceUsd, 48);
});

test('each campaign has its matching owned guide or comparison page, Stripe link, price and tracked identifiers', () => {
  for (const [i,offer] of ACTIVE_DIGITAL_OFFERS.entries()) {
    const c = campaignForSlot(i);
    assert.equal(c.offer.title,offer.name);
    assert.equal(c.offer.priceUsd,offer.priceUsd);
    assert.ok(c.guideUrl.startsWith(offer.guide + '?utm_source=github_cloud'));
    assert.ok(c.checkoutUrl.startsWith(offer.checkout + '?client_reference_id=owned_content_'));
    assert.match(c.editorialDraft, new RegExp('\\$'+offer.priceUsd+' USD'));
    assert.equal(c.videoBrief.durationSeconds,30);
    assert.equal(c.videoBrief.scenes.reduce((n,s)=>n+s.seconds,0),30);
    assert.equal(c.guardrails.publishedAutomatically,false);
    assert.equal(c.guardrails.physicalProductsPromoted,false);
    assert.equal(c.guardrails.marketingEmailsSent,false);
  }
});

test('marketing drafts do not claim customers, inventory, certainty or hidden software', () => {
  for (let i=0;i<ACTIVE_DIGITAL_OFFERS.length;i++){
    const c=campaignForSlot(i);
    assert.match(c.editorialDraft,/not hosted AI software/);
    assert.match(c.editorialDraft,/one time/);
    assert.ok(c.guardrails.noInventedTestimonials && c.guardrails.noClaimsOfNewSales);
    assert.ok(!/best.?seller|guaranteed income|only [0-9]+ left|customer testimonial/i.test(c.editorialDraft));
  }
  assert.match(campaignForSlot(3).editorialDraft,/Free comparison page/);
  assert.match(campaignForSlot(0).editorialDraft,/Free step-by-step example/);
  assert.throws(()=>campaignForSlot(-1));
  assert.throws(()=>campaignForSlot(1.5));
  assert.throws(()=>currentSixHourSlot(Number.NaN));
});

test('public home page may link to the verified $179 digital bundle without clearing physical checkout', () => {
  const html = '<a href="https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t?client_reference_id=clean_home_featured_bundle">Downloadable bundle</a>';
  const audit = auditPublicStripeLinks(html);
  assert.equal(audit.hasDirectStripeLink, true);
  assert.equal(audit.approvedDigitalStripeLinkCount, 1);
  assert.equal(audit.unapprovedDirectStripeLinkCount, 0);
  assert.equal(audit.hasUnapprovedDirectStripeLink, false);
});

test('unknown physical or unclassified Stripe links fail closed, even beside a digital offer', () => {
  const digital = ACTIVE_DIGITAL_OFFERS[3].checkout;
  const physical = 'https://buy.stripe.com/UNVERIFIEDPHYSICAL000?utm_source=shop';
  for (const html of [physical, digital + ' ' + physical, '//buy.stripe.com/UNVERIFIEDPHYSICAL000']) {
    const audit = auditPublicStripeLinks(html);
    assert.equal(audit.hasUnapprovedDirectStripeLink, true);
    assert.ok(audit.unapprovedDirectStripeLinkCount >= 1);
  }
});

test('every existing digital offer is allowlisted by exact checkout path, not a broad Stripe domain', () => {
  const html = ACTIVE_DIGITAL_OFFERS.map(offer => offer.checkout + '?client_reference_id=existing_digital').join(' ');
  const audit = auditPublicStripeLinks(html);
  assert.equal(audit.directStripeLinkCount, ACTIVE_DIGITAL_OFFERS.length);
  assert.equal(audit.approvedDigitalStripeLinkCount, ACTIVE_DIGITAL_OFFERS.length);
  assert.equal(audit.hasUnapprovedDirectStripeLink, false);
  assert.equal(auditPublicStripeLinks('').hasDirectStripeLink, false);
});


test('HTML-encoded or alternate Stripe checkout URLs cannot bypass the direct-payment guard', () => {
  const approved = ACTIVE_DIGITAL_OFFERS.find(offer => offer.slug === 'bundle').checkout;
  const unsafe = [
    '<a href="https:&#x2F;&#x2F;buy&#46;stripe&#46;com/UNVERIFIED">Buy</a>',
    '<a href="https&#58;&#47;&#47;buy&#46;stripe&#46;com/UNVERIFIED">Buy</a>',
    'https://buy.stripe.com:443/UNVERIFIED',
    'https://checkout.stripe.com/c/pay/UNVERIFIED',
    'http://' + approved.slice('https://'.length),
    approved.replace('buy.stripe.com', 'buy.stripe.com.'),
    approved.replace('buy.stripe.com', 'buy.stripe.com:8443'),
    'https:\n//buy.stripe.com/UNVERIFIED',
    'https://buy%2estripe.com/UNVERIFIED',
  ];
  for (const html of unsafe) {
    const audit = auditPublicStripeLinks(html);
    assert.equal(audit.hasUnapprovedDirectStripeLink, true, html);
    assert.equal(audit.unapprovedDirectStripeLinkCount, 1, html);
  }
  assert.equal(auditPublicStripeLinks(approved).approvedDigitalStripeLinkCount, 1);
  assert.equal(auditPublicStripeLinks('https://example.org/guide').directStripeLinkCount, 0);
});

test('encoded physical link beside an approved digital checkout still fails closed', () => {
  const approved = ACTIVE_DIGITAL_OFFERS[0].checkout;
  const encodedPhysical = '<a href="https:&#47;&#47;buy.stripe.com/UNVERIFIED">Shop</a>';
  const audit = auditPublicStripeLinks(approved + ' ' + encodedPhysical);
  assert.equal(audit.approvedDigitalStripeLinkCount, 1);
  assert.equal(audit.unapprovedDirectStripeLinkCount, 1);
  assert.equal(audit.hasUnapprovedDirectStripeLink, true);
});
