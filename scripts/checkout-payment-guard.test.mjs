import test from 'node:test';
import assert from 'node:assert/strict';
import { isPaidDigitalCheckout } from '../src/lib/checkout-payment-guard.ts';
const paid = {
  id: 'cs_test_123', mode: 'payment', payment_status: 'paid',
  amount_total: 2995, currency: 'usd'
};
test('a confirmed positive USD checkout is eligible for digital delivery', () => {
  assert.equal(isPaidDigitalCheckout(paid), true);
});
test('completed checkout with unpaid asynchronous payment is not eligible', () => {
  assert.equal(isPaidDigitalCheckout({...paid, payment_status:'unpaid'}), false);
});
test('zero-total or no-payment-required sessions are not paid purchases', () => {
  assert.equal(isPaidDigitalCheckout({...paid, amount_total:0}), false);
  assert.equal(isPaidDigitalCheckout({...paid, payment_status:'no_payment_required'}), false);
});
test('subscriptions, foreign currencies and forged session IDs do not qualify', () => {
  assert.equal(isPaidDigitalCheckout({...paid, mode:'subscription'}), false);
  assert.equal(isPaidDigitalCheckout({...paid, currency:'eur'}), false);
  assert.equal(isPaidDigitalCheckout({...paid, id:'pi_test_123'}), false);
});
test('invalid and missing payment snapshots fail closed', () => {
  assert.equal(isPaidDigitalCheckout(undefined), false);
  assert.equal(isPaidDigitalCheckout({}), false);
  assert.equal(isPaidDigitalCheckout({...paid, amount_total:NaN}), false);
});

import { readFileSync } from 'node:fs';
test('webhook handles both confirmed and asynchronous payment success', () => {
  const source = readFileSync(new URL('../src/routes/api/webhooks/stripe.ts', import.meta.url), 'utf8');
  assert.match(source, /case "checkout.session.async_payment_succeeded"/);
  assert.match(source, /if \(!isPaidDigitalCheckout\(session\)\)/);
  assert.match(source, /if \(!process\.env\.RESEND_API_KEY \|\| !customerEmail\)/);
  assert.doesNotMatch(source, /Download token: \$\{token\}/);
});
test('email fallback never reports an unsent message as delivered or logs its body', () => {
  const source = readFileSync(new URL('../src/lib/email.ts', import.meta.url), 'utf8');
  assert.match(source, /Transactional email provider not configured\./);
  assert.match(source, /outcomeKnown: true/);
  assert.doesNotMatch(source, /params\.body\.slice/);
  assert.doesNotMatch(source, /\[EMAIL\] To: \$\{params\.to\}/);
});
