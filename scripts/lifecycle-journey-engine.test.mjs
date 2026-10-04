import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSentSet, buildSuppressionSet, dryRun, evaluateStep, idempotencyKey, recipientRef } from './lifecycle-journey-engine.mjs';

const nowMs = Date.parse('2026-10-04T12:00:00Z');

function contact(overrides = {}) {
  return {
    email: 'buyer@example.invalid',
    consent: true,
    purchasedAt: '2026-10-03T12:00:00Z',
    subscribedAt: '2026-10-03T12:00:00Z',
    abandonedAt: '2026-10-04T10:00:00Z',
    deliveredAt: '2026-09-27T12:00:00Z',
    ...overrides
  };
}

test('recipient references and idempotency keys do not expose raw email', () => {
  const ref = recipientRef('Buyer@Example.invalid');
  const key = idempotencyKey('review-request', 'Buyer@Example.invalid', 'verified-review-day-7');
  assert.equal(ref.includes('@'), false);
  assert.equal(key.includes('@'), false);
  assert.equal(ref.length, 16);
});

test('eligible post-purchase step is dry-run only', () => {
  const result = evaluateStep({
    journeyName: 'post-purchase-onboarding',
    step: { day: 1, template: 'post-purchase-day-1' },
    contact: contact(), nowMs
  });
  assert.equal(result.eligible, true);
  assert.equal(result.entry.liveSendAttempted, false);
  assert.equal(JSON.stringify(result).includes('buyer@example.invalid'), false);
});

test('duplicate logical message is blocked case-insensitively', () => {
  const sentSet = buildSentSet([{ campaign_name: 'post-purchase-onboarding', recipient_email: 'BUYER@EXAMPLE.INVALID', template_name: 'post-purchase-day-1' }]);
  const result = evaluateStep({
    journeyName: 'post-purchase-onboarding', step: { day: 1, template: 'post-purchase-day-1' }, contact: contact(), nowMs, sentSet
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'duplicate_idempotency');
});

test('suppression reasons override timing eligibility', () => {
  const suppressions = buildSuppressionSet({ unsubscribed: ['buyer@example.invalid'] });
  const result = evaluateStep({
    journeyName: 'post-purchase-onboarding', step: { day: 1, template: 'post-purchase-day-1' }, contact: contact(), nowMs, suppressions
  });
  assert.equal(result.reason, 'suppressed_unsubscribed');
});

test('review request requires delivered purchase evidence', () => {
  const result = evaluateStep({
    journeyName: 'review-request', step: { day: 7, template: 'verified-review-day-7' }, contact: contact({ deliveredAt: null }), nowMs
  });
  assert.equal(result.reason, 'missing_delivery_evidence');
});

test('abandonment recovery requires consent evidence', () => {
  const result = evaluateStep({
    journeyName: 'abandonment-recovery', step: { day: 0, afterHours: 2, template: 'abandonment-2h' }, contact: contact({ consent: false }), nowMs
  });
  assert.equal(result.reason, 'missing_consent_evidence');
});

test('outside time window is blocked', () => {
  const result = evaluateStep({
    journeyName: 'post-purchase-onboarding', step: { day: 3, template: 'post-purchase-day-3' }, contact: contact(), nowMs
  });
  assert.equal(result.reason, 'outside_window');
});

test('dry run aggregates without sending or supplier ordering', () => {
  const report = dryRun({
    contactsByJourney: {
      'post-purchase-onboarding': [contact()],
      'review-request': [contact()]
    },
    nowMs
  });
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.liveSendAttempted, false);
  assert.equal(report.supplierOrderingAttempted, false);
  assert.ok(report.totals.eligible >= 2);
  assert.equal(JSON.stringify(report).includes('buyer@example.invalid'), false);
});
