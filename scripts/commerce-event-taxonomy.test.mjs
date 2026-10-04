import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceEventPrivacyNotice, createCommerceEvent, sanitizeCommerceProperties, validateCommerceEvent } from './commerce-event-taxonomy.mjs';
import { createNoOpCommerceAnalyticsAdapter, createPostHogLikeAdapter } from './commerce-event-adapters.mjs';

test('PII keys and unknown properties are stripped', () => {
  const safe = sanitizeCommerceProperties({
    sku: 'sku-1', email: 'person@example.com', ip: '127.0.0.1', zip: '10001', token: 'secret', arbitrary: 'drop-me'
  });
  assert.deepEqual(safe, { sku: 'sku-1' });
});

test('paths are normalized without query or fragment', () => {
  const event = createCommerceEvent('commerce_product_viewed', { path: '/products/brush/?email=a%40b.com#x', sku: 'brush-1' });
  assert.equal(event.properties.path, '/products/brush/');
  assert.equal(JSON.stringify(event).includes('a%40b.com'), false);
});

test('commerce events preserve Stripe as revenue authority', () => {
  const event = createCommerceEvent('commerce_payment_completed', { sku: 'sku-1', valueUsd: 29.95, currency: 'usd' });
  assert.equal(event.revenueAuthority, 'stripe_paid_transaction_only');
  assert.equal(event.properties.currency, 'USD');
  assert.equal(validateCommerceEvent(event).ok, true);
});

test('unsupported events fail closed', () => {
  assert.throws(() => createCommerceEvent('customer_email_captured', {}), /unsupported_commerce_event/);
});

test('validator rejects a forged unsafe property', () => {
  const event = createCommerceEvent('commerce_checkout_started', { sku: 'sku-1' });
  event.properties.email = 'person@example.com';
  const validation = validateCommerceEvent(event);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(','), /unsafe_property:email|possible_email_value/);
});

test('no-op adapter never sends', async () => {
  const adapter = createNoOpCommerceAnalyticsAdapter();
  const result = await adapter.capture('commerce_search_performed', { resultCount: 5, queryLength: 7 });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'analytics_provider_disabled');
});

test('PostHog-like adapter requires an explicit capture function when enabled', () => {
  assert.throws(() => createPostHogLikeAdapter({ enabled: true }), /capture_function_required/);
});

test('enabled adapter receives sanitized event only', async () => {
  let captured;
  const adapter = createPostHogLikeAdapter({ enabled: true, captureFn: async (event) => { captured = event; } });
  await adapter.capture('commerce_checkout_blocked', { sku: 'sku-1', reasonCode: 'freight_pending', email: 'x@example.com' });
  assert.equal(captured.properties.sku, 'sku-1');
  assert.equal('email' in captured.properties, false);
});

test('privacy notice states analytics is disabled by default', () => {
  const notice = commerceEventPrivacyNotice();
  assert.equal(notice.liveAnalytics, false);
  assert.equal(notice.customerPiiAllowed, false);
});
