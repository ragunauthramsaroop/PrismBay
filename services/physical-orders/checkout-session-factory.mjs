// PrismBay Checkout Session factory inspired by Stripe's official one-time Checkout sample.
// Upstream: https://github.com/stripe-samples/checkout-one-time-payments (MIT).
// This module builds and validates parameters only. It does not call Stripe or create live objects.

import crypto from 'node:crypto';

function safePriceId(value) {
  const id = String(value || '').trim();
  return /^price_[A-Za-z0-9]+$/.test(id) ? id : null;
}

function safeSku(value) {
  const sku = String(value || '').trim();
  return /^[A-Za-z0-9._-]{1,120}$/.test(sku) ? sku : null;
}

function safeQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 25 ? quantity : null;
}

function safeReturnUrl(value, allowedHosts = ['clean.prismbayai.com', 'www.prismbayai.com']) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeCorrelation(value) {
  const input = String(value || '').trim();
  return /^[A-Za-z0-9._:-]{8,120}$/.test(input) ? input : null;
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function buildPriceIndex(catalog) {
  if (!catalog || !Array.isArray(catalog.mappings)) throw new Error('valid_physical_catalog_required');
  const singleSku = new Map();
  const fixedBasket = new Map();

  for (const row of catalog.mappings) {
    const priceId = safePriceId(row?.stripeId);
    if (!priceId || !Array.isArray(row?.items) || row.items.length === 0) continue;
    const items = row.items
      .map((item) => ({ sku: safeSku(item?.sku), quantity: safeQuantity(item?.quantity) }))
      .filter((item) => item.sku && item.quantity)
      .sort((a, b) => a.sku.localeCompare(b.sku));
    if (items.length !== row.items.length) continue;

    const basketKey = items.map((item) => `${item.sku}:${item.quantity}`).join('|');
    fixedBasket.set(basketKey, priceId);
    if (items.length === 1 && items[0].quantity === 1 && !singleSku.has(items[0].sku)) singleSku.set(items[0].sku, priceId);
  }

  return Object.freeze({ singleSku, fixedBasket });
}

export function resolvePriceForSku(catalog, sku) {
  const key = safeSku(sku);
  if (!key) return null;
  return buildPriceIndex(catalog).singleSku.get(key) || null;
}

export function resolvePriceForFixedBasket(catalog, items = []) {
  if (!Array.isArray(items) || !items.length) return null;
  const normalized = items
    .map((item) => ({ sku: safeSku(item?.sku), quantity: safeQuantity(item?.quantity) }))
    .filter((item) => item.sku && item.quantity)
    .sort((a, b) => a.sku.localeCompare(b.sku));
  if (normalized.length !== items.length) return null;
  const key = normalized.map((item) => `${item.sku}:${item.quantity}`).join('|');
  return buildPriceIndex(catalog).fixedBasket.get(key) || null;
}

export function validateCheckoutAuthorization(authorization = {}) {
  const reasons = [];
  const sku = safeSku(authorization.sku);
  const quantity = safeQuantity(authorization.quantity);
  if (authorization.ok !== true || authorization.checkoutAllowed !== true) reasons.push('checkout_not_authorized');
  if (!sku) reasons.push('valid_sku_required');
  if (!quantity) reasons.push('valid_quantity_required');
  if (authorization.stockRevalidatedAtCheckout !== true) reasons.push('stock_revalidation_required');
  if (authorization.shippingRevalidatedAtCheckout !== true) reasons.push('shipping_revalidation_required');
  if (authorization.economicsRevalidatedAtCheckout !== true) reasons.push('economics_revalidation_required');
  if (authorization.supplierOrderingEnabled !== false) reasons.push('unsafe_supplier_ordering_state');
  return { ok: reasons.length === 0, reasons, sku, quantity };
}

export function buildCheckoutSessionParams({
  authorization,
  priceId,
  successUrl,
  cancelUrl,
  quoteRef,
  correlationId,
  allowedReturnHosts
} = {}) {
  const auth = validateCheckoutAuthorization(authorization);
  if (!auth.ok) throw new Error(`checkout_authorization_rejected:${auth.reasons.join(',')}`);

  const price = safePriceId(priceId);
  if (!price) throw new Error('verified_stripe_price_required');
  const success = safeReturnUrl(successUrl, allowedReturnHosts);
  const cancel = safeReturnUrl(cancelUrl, allowedReturnHosts);
  if (!success || !cancel) throw new Error('safe_return_urls_required');

  const correlation = safeCorrelation(correlationId) || `checkout:${auth.sku}:${digest(`${quoteRef || ''}|${price}`).slice(0, 20)}`;
  const quoteHash = digest(String(quoteRef || 'missing')).slice(0, 24);
  const idempotencyKey = `prismbay-checkout-${digest(`${auth.sku}|${price}|${quoteHash}|${correlation}`).slice(0, 40)}`;

  return {
    idempotencyKey,
    params: {
      mode: 'payment',
      line_items: [{ price, quantity: auth.quantity }],
      success_url: success,
      cancel_url: cancel,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      client_reference_id: correlation.slice(0, 200),
      metadata: {
        commerce_schema: 'prismbay-v1',
        sku: auth.sku,
        quote_ref_hash: quoteHash,
        correlation_id: correlation.slice(0, 120)
      },
      payment_intent_data: {
        metadata: {
          commerce_schema: 'prismbay-v1',
          sku: auth.sku,
          quote_ref_hash: quoteHash,
          correlation_id: correlation.slice(0, 120)
        }
      }
    },
    liveStripeCallPerformed: false,
    supplierOrderingEnabled: false
  };
}

export function validatePaidCheckoutSession(session = {}, { accountId = null } = {}) {
  const reasons = [];
  const sessionId = typeof session.id === 'string' && /^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(session.id) ? session.id : null;
  if (!sessionId) reasons.push('valid_checkout_session_required');
  if (session.mode !== 'payment') reasons.push('payment_mode_required');
  if (session.payment_status !== 'paid') reasons.push('paid_status_required');
  if (session.currency !== 'usd') reasons.push('usd_currency_required');
  if (!Number.isSafeInteger(session.amount_total) || session.amount_total <= 0) reasons.push('positive_amount_required');
  if (accountId && session.account && session.account !== accountId) reasons.push('account_scope_mismatch');
  if (!session.metadata || session.metadata.commerce_schema !== 'prismbay-v1') reasons.push('prismbay_metadata_required');
  if (!safeSku(session.metadata?.sku)) reasons.push('metadata_sku_required');
  if (!/^[a-f0-9]{24}$/.test(String(session.metadata?.quote_ref_hash || ''))) reasons.push('quote_ref_hash_required');
  return { ok: reasons.length === 0, reasons, sessionId, sku: safeSku(session.metadata?.sku) };
}

export function stripeCheckoutProvenance() {
  return Object.freeze({
    upstream: 'https://github.com/stripe-samples/checkout-one-time-payments',
    license: 'MIT',
    adaptation: 'Original PrismBay factory using official Stripe Checkout Session patterns; no live Stripe mutation',
    liveStripeObjectMutation: false
  });
}
