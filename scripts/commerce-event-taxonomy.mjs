// PrismBay original analytics contract inspired by open-source PostHog event modeling.
// Upstream reference: https://github.com/PostHog/posthog (MIT-Expat outside ee/).
// No PostHog source code is copied. This module makes no network calls.

export const COMMERCE_EVENTS = Object.freeze([
  'commerce_product_viewed',
  'commerce_search_performed',
  'commerce_checkout_intent',
  'commerce_checkout_started',
  'commerce_checkout_blocked',
  'commerce_payment_completed',
  'commerce_order_processing',
  'commerce_supplier_accepted',
  'commerce_shipped',
  'commerce_tracking_available',
  'commerce_delivered',
  'commerce_delivery_exception',
  'commerce_review_requested',
  'commerce_review_submitted',
  'commerce_abandonment_eligible',
  'commerce_refund_recorded',
  'commerce_repeat_purchase'
]);

const EVENT_SET = new Set(COMMERCE_EVENTS);
const PII_KEY_PATTERN = /(email|e-mail|phone|ip|address|street|zip|postal|token|card|payment_method|name|customer|session_id|distinct_id)/i;
const ALLOWED_PROPERTIES = new Set([
  'sku', 'category', 'surface', 'path', 'referrerHost', 'quantity', 'stage', 'reasonCode',
  'correlationId', 'orderRef', 'valueUsd', 'currency', 'resultCount', 'queryLength', 'fulfillmentState',
  'reviewEligible', 'isRepeatPurchase', 'source'
]);

function cleanString(value, max = 160) {
  if (value === null || value === undefined) return undefined;
  const out = String(value).trim();
  return out ? out.slice(0, max) : undefined;
}

function cleanPath(value) {
  const out = cleanString(value, 240);
  if (!out) return undefined;
  try {
    const url = new URL(out, 'https://clean.prismbayai.com');
    return url.pathname.slice(0, 240);
  } catch {
    return out.split('?')[0].split('#')[0].slice(0, 240);
  }
}

function cleanInteger(value, min, max) {
  const out = Number(value);
  if (!Number.isInteger(out) || out < min || out > max) return undefined;
  return out;
}

function cleanMoney(value) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < 0 || out > 1_000_000) return undefined;
  return Math.round(out * 100) / 100;
}

export function sanitizeCommerceProperties(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (PII_KEY_PATTERN.test(key) || !ALLOWED_PROPERTIES.has(key)) continue;
    if (value === undefined || value === null) continue;

    if (key === 'path') {
      const path = cleanPath(value);
      if (path) output.path = path;
    } else if (key === 'quantity') {
      const quantity = cleanInteger(value, 1, 100);
      if (quantity !== undefined) output.quantity = quantity;
    } else if (key === 'resultCount' || key === 'queryLength') {
      const count = cleanInteger(value, 0, 1_000_000);
      if (count !== undefined) output[key] = count;
    } else if (key === 'valueUsd') {
      const money = cleanMoney(value);
      if (money !== undefined) output.valueUsd = money;
    } else if (key === 'reviewEligible' || key === 'isRepeatPurchase') {
      if (typeof value === 'boolean') output[key] = value;
    } else if (key === 'currency') {
      const currency = cleanString(value, 3)?.toUpperCase();
      if (/^[A-Z]{3}$/.test(currency || '')) output.currency = currency;
    } else {
      const str = cleanString(value);
      if (str) output[key] = str;
    }
  }
  return output;
}

export function createCommerceEvent(eventName, properties = {}, { occurredAt = new Date().toISOString() } = {}) {
  if (!EVENT_SET.has(eventName)) throw new Error(`unsupported_commerce_event:${eventName}`);
  const safeProperties = sanitizeCommerceProperties(properties);
  return {
    schemaVersion: 1,
    event: eventName,
    occurredAt: new Date(occurredAt).toISOString(),
    properties: safeProperties,
    privacy: 'no_email_phone_ip_address_zip_token_card_or_customer_identity',
    revenueAuthority: 'stripe_paid_transaction_only'
  };
}

export function validateCommerceEvent(event) {
  const errors = [];
  if (!event || typeof event !== 'object') return { ok: false, errors: ['event_object_required'] };
  if (event.schemaVersion !== 1) errors.push('invalid_schema_version');
  if (!EVENT_SET.has(event.event)) errors.push('unsupported_event');
  if (event.privacy !== 'no_email_phone_ip_address_zip_token_card_or_customer_identity') errors.push('invalid_privacy_contract');
  if (event.revenueAuthority !== 'stripe_paid_transaction_only') errors.push('invalid_revenue_authority');
  const raw = JSON.stringify(event.properties || {});
  for (const key of Object.keys(event.properties || {})) {
    if (PII_KEY_PATTERN.test(key) || !ALLOWED_PROPERTIES.has(key)) errors.push(`unsafe_property:${key}`);
  }
  if (/@/.test(raw)) errors.push('possible_email_value');
  return { ok: errors.length === 0, errors };
}

export function commerceEventPrivacyNotice() {
  return {
    schemaVersion: 1,
    providerConfigured: false,
    liveAnalytics: false,
    customerPiiAllowed: false,
    revenueAuthority: 'Stripe paid transaction only',
    provenance: {
      upstream: 'https://github.com/PostHog/posthog',
      licenseBoundary: 'MIT-Expat open-source portions only; ee/ excluded',
      adaptation: 'Original PrismBay event contract inspired by open-source event analytics patterns'
    }
  };
}
