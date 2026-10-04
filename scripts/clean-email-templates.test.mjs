import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const emailSource = await fs.readFile(new URL('../src/lib/email.ts', import.meta.url), 'utf8');
const templateSource = await fs.readFile(new URL('../src/lib/clean-email-templates.ts', import.meta.url), 'utf8');

test('reuses the existing single Resend sender', () => {
  assert.equal((emailSource.match(/new Resend\(/g) || []).length, 1);
  assert.equal((templateSource.match(/new Resend\(/g) || []).length, 0);
  assert.equal(templateSource.includes('resend.emails.send'), false);
});

test('existing sender supports text plus optional HTML without logging content', () => {
  assert.match(emailSource, /html\?: string/);
  assert.match(emailSource, /text: params\.body/);
  assert.match(emailSource, /params\.html \? \{ html: params\.html \}/);
  assert.equal(emailSource.includes('console.log(params.to'), false);
  assert.equal(emailSource.includes('console.log(params.body'), false);
});

test('Clean renderer contains required brand and operator identity', () => {
  assert.match(templateSource, /PrismBay Clean/);
  assert.match(templateSource, /Practical tools\. Straightforward checkout\./);
  assert.match(templateSource, /STUDYSMARTZ LLC/);
  assert.match(templateSource, /support@prismbayai\.com|contact\.html/);
});

test('templates cover the required transaction and lifecycle states', () => {
  for (const kind of ['order_received','processing_update','shipped','delivered','delivery_exception','refund','abandonment','review_request']) {
    assert.ok(templateSource.includes(`\"${kind}\"`), `missing ${kind}`);
  }
});

test('review copy demands honest post-delivery evidence and no positive-review incentive', () => {
  assert.match(templateSource, /honest review/);
  assert.match(templateSource, /only after delivery evidence is available/);
  assert.match(templateSource, /no incentive for a positive rating/);
});

test('abandonment template does not invent discounts, scarcity, countdowns or stock claims', () => {
  const lower = templateSource.toLowerCase();
  for (const phrase of ['limited time discount', 'only 2 left', 'countdown', 'selling fast', 'exclusive discount code']) {
    assert.equal(lower.includes(phrase), false, `unsafe phrase: ${phrase}`);
  }
  assert.match(templateSource, /check current availability before checkout/);
});

test('templates never ask customers for card details by email', () => {
  assert.match(templateSource, /We do not ask for card details by email/);
  assert.match(templateSource, /card details remain with the payment provider/);
});

test('template module has no direct send side effect', () => {
  assert.equal(templateSource.includes('sendEmail('), false);
  assert.equal(templateSource.includes('fetch('), false);
  assert.equal(templateSource.includes('process.env.RESEND_API_KEY'), false);
});
