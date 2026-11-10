import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Pure, fail-closed commercial policy. Inputs must originate from trusted
// server-side supplier verification, order records and Whop account settings.
// This module deliberately does not call Whop, charge cards or place orders.
export const REQUIRED_PRODUCT_GATES = Object.freeze([
  'supplierVerified',
  'variantVerified',
  'stockVerified',
  'destinationFreightVerified',
  'economicsApproved',
  'mediaRightsVerified',
  'fulfillmentApproved',
  'saleReady',
]);

const positiveInt = value => Number.isSafeInteger(value) && value > 0;
const nonnegativeInt = value => Number.isSafeInteger(value) && value >= 0;
const validId = (value, prefix) => typeof value === 'string' &&
  new RegExp('^' + prefix + '_[A-Za-z0-9_-]{5,}$').test(value);

function validCheckoutUrl(raw, mode) {
  if (typeof raw !== 'string') return false;
  try {
    const url = new URL(raw);
    const host = mode === 'sandbox' ? 'sandbox.whop.com' : 'whop.com';
    return url.protocol === 'https:' && url.hostname === host &&
      !url.username && !url.password && url.pathname.startsWith('/checkout/') &&
      url.pathname.length > '/checkout/'.length && !url.hash;
  } catch {
    return false;
  }
}

export function inspectPhysicalOffer(catalog, slug, { quote, checkout, now = Date.now() } = {}) {
  const blockers = [];
  const item = catalog?.candidates?.find(row => row?.slug === slug);
  if (!item) blockers.push('catalog_product_missing');
  if (catalog?.market !== 'US') blockers.push('market_not_approved');
  if (catalog?.physicalCheckoutPermitted !== true) blockers.push('catalog_checkout_closed');

  for (const gate of REQUIRED_PRODUCT_GATES) {
    if (item?.[gate] !== true) blockers.push('product_' + gate + '_missing');
  }
  if (typeof item?.supplierSku !== 'string' || !/^[A-Za-z0-9_-]{5,120}$/.test(item.supplierSku)) blockers.push('supplier_sku_missing');
  // CJ variant IDs are often numeric. Do not impose Whop's prefix format.
  if (typeof item?.variantId !== 'string' || !/^[A-Za-z0-9_-]{5,120}$/.test(item.variantId)) blockers.push('supplier_variant_missing');

  const retailCents = Math.round(Number(item?.retailPriceUsd) * 100);
  if (!positiveInt(retailCents)) blockers.push('retail_price_invalid');

  if (!quote || quote.authenticatedSupplierEvidence !== true ||
      quote.slug !== slug || quote.supplierSku !== item?.supplierSku ||
      quote.variantId !== item?.variantId) {
    blockers.push('buyer_quote_or_product_mismatch');
  }
  if (!/^\d{5}$/.test(String(quote?.buyerZip || '')) ||
      quote?.freightScope !== 'buyer_destination_zip' ||
      quote?.country !== 'US') blockers.push('buyer_destination_unverified');
  if (!Number.isSafeInteger(quote?.verifiedAt) ||
      !Number.isSafeInteger(quote?.expiresAt) ||
      quote.verifiedAt > now || quote.expiresAt <= now ||
      quote.expiresAt - quote.verifiedAt > 300_000) blockers.push('buyer_quote_stale');
  if (!positiveInt(quote?.quantity) || quote.quantity !== 1 ||
      !positiveInt(quote?.supplierCostCents) ||
      !positiveInt(quote?.freightCents) ||
      !nonnegativeInt(quote?.paymentFeeCents) ||
      !nonnegativeInt(quote?.returnsReserveCents) ||
      !positiveInt(quote?.totalCents) ||
      quote.totalCents !== retailCents) blockers.push('price_or_cost_mismatch');

  if (positiveInt(quote?.totalCents) && positiveInt(quote?.supplierCostCents) &&
      positiveInt(quote?.freightCents) && nonnegativeInt(quote?.paymentFeeCents) &&
      nonnegativeInt(quote?.returnsReserveCents)) {
    const contribution = quote.totalCents - quote.supplierCostCents -
      quote.freightCents - quote.paymentFeeCents - quote.returnsReserveCents;
    if (contribution < 300 || contribution / quote.totalCents < 0.25)
      blockers.push('contribution_margin_insufficient');
  }
  if (typeof quote?.orderId !== 'string' || !/^pb_[a-zA-Z0-9_-]{12,}$/.test(quote.orderId))
    blockers.push('order_reference_missing');

  if (checkout?.mode !== 'sandbox' && checkout?.mode !== 'live')
    blockers.push('whop_environment_missing');
  if (!validId(checkout?.accountId, 'biz') ||
      !validId(checkout?.productId, 'prod') ||
      !validId(checkout?.planId, 'plan')) blockers.push('whop_identity_missing');
  if (checkout?.merchantApproved !== true ||
      checkout?.payoutApproved !== true ||
      checkout?.shippingAddressCollected !== true ||
      checkout?.returnPolicyConfigured !== true ||
      checkout?.orderId === undefined ||
      checkout?.orderId !== quote?.orderId ||
      checkout?.signedServerSession !== true) blockers.push('whop_merchant_or_order_setup_missing');
  if (checkout?.currency !== 'usd' ||
      !positiveInt(checkout?.amountCents) ||
      checkout.amountCents !== quote?.totalCents) blockers.push('whop_price_mismatch');
  if (!validCheckoutUrl(checkout?.checkoutUrl, checkout?.mode))
    blockers.push('whop_checkout_url_untrusted');

  const approved = blockers.length === 0;
  return {
    slug,
    status: approved ? 'sandbox_ready_or_live_ready' : 'blocked',
    approved,
    blockers,
    // Never expose a URL on a failed verification. The caller must still
    // validate stock and its own order record immediately before redirect.
    checkoutUrl: approved ? checkout.checkoutUrl : null,
  };
}

// This is a second guard AFTER cryptographic webhook verification AND an
// independent server-side Whop payment fetch. Never pass browser-supplied
// payment data to this function. Caller owns durable event-id deduplication.
export function reconcileWhopPayment(order, payment, { eventId, alreadyProcessed = true } = {}) {
  const blockers = [];
  if (alreadyProcessed) blockers.push('event_already_processed_or_not_claimed');
  if (!validId(eventId, 'evt')) blockers.push('event_id_invalid');
  if (!order || order.status !== 'pending' || !/^pb_[a-zA-Z0-9_-]{12,}$/.test(String(order.id || '')))
    blockers.push('trusted_pending_order_missing');
  if (!order?.supplierApprovalRecorded || !order?.buyerDestinationVerified ||
      !order?.fulfillmentRouteVerified) blockers.push('fulfillment_approval_missing');
  if (!payment || !validId(payment.id, 'pay') ||
      !['paid', 'succeeded'].includes(payment.status) ||
      payment.refunded === true || payment.disputed === true)
    blockers.push('payment_not_final');
  if (payment?.metadata?.order_id !== order?.id ||
      payment?.plan_id !== order?.planId ||
      payment?.business_id !== order?.businessId ||
      !validId(order?.planId, 'plan') || !validId(order?.businessId, 'biz'))
    blockers.push('payment_identity_mismatch');
  if (!positiveInt(order?.totalCents) || payment?.amount_cents !== order?.totalCents ||
      payment?.currency !== order?.currency || order?.currency !== 'usd')
    blockers.push('payment_value_mismatch');

  return {
    approvedForFulfillmentReview: blockers.length === 0,
    blockers,
    // Deliberately NO automatic supplier-order instruction.
    automaticSupplierOrdering: false,
  };
}

export async function inspectCurrentCatalog(filepath = 'config/top15-merchandising.json') {
  const catalog = JSON.parse(await readFile(filepath, 'utf8'));
  return {
    market: catalog.market,
    physicalCheckoutPermitted: catalog.physicalCheckoutPermitted === true,
    products: (catalog.candidates || []).map(({ slug }) =>
      inspectPhysicalOffer(catalog, slug)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const status = await inspectCurrentCatalog();
  process.stdout.write(JSON.stringify({
    ...status,
    products: status.products.map(({ slug, approved, blockers }) => ({
      slug, approved, blockers,
    })),
  }, null, 2) + '\n');
  // Don't fail CI because an unverified product correctly remains closed.
  // DO fail if the public policy is opened while no product is verified.
  // Catalog-level permission is distinct from each buyer's live quote.
  // Never turn checkout on merely because a catalog file is updated.
  const unsafe = status.physicalCheckoutPermitted &&
    status.products.length === 0;
  if (unsafe) process.exitCode = 1;
}
