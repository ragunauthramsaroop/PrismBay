// PrismBay original commerce-core contracts.
// Architecture references:
// - Medusa core commerce primitives: https://github.com/medusajs/medusa (MIT core only)
// - Saleor API-first commerce model: https://github.com/saleor/saleor (BSD-3-Clause)
// No upstream source code is copied. Existing PrismBay catalog gates remain authoritative.

import { deriveCatalogStatus, missingSaleReadyGates, validatePublishableCandidate } from '../../scripts/catalog-scale-gate.mjs';

export const COMMERCE_CORE_VERSION = 1;
export const AUTOMATIC_SUPPLIER_ORDERING = false;

export const CORE_ORDER_STATES = Object.freeze([
  'needs_review',
  'manual_fulfillment',
  'supplier_pending',
  'supplier_accepted',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]);

const ORDER_TRANSITIONS = Object.freeze({
  needs_review: ['manual_fulfillment', 'cancelled', 'refunded'],
  manual_fulfillment: ['supplier_pending', 'cancelled', 'refunded'],
  supplier_pending: ['supplier_accepted', 'needs_review', 'cancelled', 'refunded'],
  supplier_accepted: ['shipped', 'needs_review', 'cancelled', 'refunded'],
  shipped: ['delivered', 'needs_review', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: []
});

function string(value, max = 240) {
  const out = String(value ?? '').trim();
  return out ? out.slice(0, max) : null;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeMoney(value, currency = 'USD') {
  const amount = Number(value);
  const code = String(currency || '').trim().toUpperCase();
  if (!Number.isFinite(amount) || amount < 0 || code !== 'USD') return null;
  return Object.freeze({ currency: 'USD', amount: Math.round(amount * 100) / 100 });
}

function candidateVariantId(candidate = {}) {
  return string(candidate.variantId || candidate.cjVariantId || candidate.supplierVariantId, 220);
}

export function candidateToCoreProduct(candidate = {}) {
  const sku = string(candidate.sku, 120);
  const variantId = candidateVariantId(candidate);
  const catalogGate = validatePublishableCandidate(candidate);
  const missing = missingSaleReadyGates(candidate);
  if (!sku) missing.unshift('sku');
  if (!variantId) missing.push('variantId');

  const price = safeMoney(candidate.priceUsd);
  if (!price) missing.push('priceUsd');

  const status = deriveCatalogStatus(candidate);
  const checkoutUrl = catalogGate.ok ? safeUrl(candidate.checkoutUrl) : null;
  if (catalogGate.ok && !checkoutUrl) missing.push('checkoutUrl');

  const product = {
    schemaVersion: COMMERCE_CORE_VERSION,
    id: sku,
    handle: string(candidate.slug || sku, 160),
    title: string(candidate.name || candidate.product || sku, 240),
    category: string(candidate.category, 160),
    catalogStatus: status,
    publishable: catalogGate.ok && missing.length === 0,
    variants: variantId ? [{
      id: variantId,
      sku,
      inventoryVerified: candidate.variantStockVerified === true,
      supplierIdentityVerified: candidate.supplierIdentityVerified === true,
      exactVariantVerified: candidate.exactVariantVerified === true
    }] : [],
    offer: price ? {
      price,
      checkoutUrl,
      checkoutInfrastructureVerified: candidate.checkoutInfrastructureVerified === true,
      commercialReady: catalogGate.ok && missing.length === 0
    } : null,
    fulfillment: {
      finalDestinationFreightVerified: candidate.finalDestinationFreightVerified === true,
      landedCostVerified: candidate.landedCostVerified === true,
      marginFloorPassed: candidate.marginFloorPassed === true,
      fulfillmentReady: candidate.fulfillmentReady === true,
      automaticSupplierOrdering: AUTOMATIC_SUPPLIER_ORDERING
    },
    evidence: {
      demandEvidenceVerified: candidate.demandEvidenceVerified === true,
      mediaRightsVerified: candidate.mediaRightsVerified === true,
      missing: [...new Set(missing)]
    }
  };

  return Object.freeze(product);
}

export function isCoreProductSaleReady(product = {}) {
  return Boolean(
    product.schemaVersion === COMMERCE_CORE_VERSION &&
    product.catalogStatus === 'SALE_READY' &&
    product.publishable === true &&
    product.variants?.length === 1 &&
    product.offer?.commercialReady === true &&
    product.offer?.checkoutUrl &&
    product.fulfillment?.automaticSupplierOrdering === false &&
    product.evidence?.missing?.length === 0
  );
}

export function missingCoreSaleReadyGates(candidate = {}) {
  return candidateToCoreProduct(candidate).evidence.missing;
}

export function createCoreOrderFromLedgerRecord(record = {}) {
  const status = CORE_ORDER_STATES.includes(record.status) ? record.status : 'needs_review';
  const items = Array.isArray(record.items)
    ? record.items.map((item) => ({ sku: string(item.sku, 120), quantity: Number(item.quantity) })).filter((item) => item.sku && Number.isInteger(item.quantity) && item.quantity > 0)
    : [];
  const amountTotalCents = Number.isSafeInteger(record.amountTotal) && record.amountTotal > 0 ? record.amountTotal : null;
  return Object.freeze({
    schemaVersion: COMMERCE_CORE_VERSION,
    id: string(record.paymentIntentId || record.sessionId, 240),
    checkoutSessionId: string(record.sessionId, 240),
    paymentIntentId: string(record.paymentIntentId, 240),
    paid: record.paid === true,
    amount: amountTotalCents !== null ? Object.freeze({ currency: record.currency === 'usd' ? 'USD' : 'UNSUPPORTED', amount: amountTotalCents / 100 }) : null,
    items,
    status,
    reason: string(record.reason, 160),
    automaticSupplierOrdering: AUTOMATIC_SUPPLIER_ORDERING
  });
}

export function validateOrderTransition(currentState, nextState) {
  if (!CORE_ORDER_STATES.includes(currentState)) return { ok: false, reason: 'invalid_current_order_state' };
  if (!CORE_ORDER_STATES.includes(nextState)) return { ok: false, reason: 'invalid_next_order_state' };
  if (!(ORDER_TRANSITIONS[currentState] || []).includes(nextState)) return { ok: false, reason: `illegal_order_transition:${currentState}->${nextState}` };
  return { ok: true, reason: null };
}

export function transitionCoreOrder(order = {}, nextState, evidence = {}) {
  const check = validateOrderTransition(order.status, nextState);
  if (!check.ok) throw new Error(check.reason);
  if (nextState === 'supplier_pending' && evidence.explicitSupplierOrderAuthorization !== true) {
    throw new Error('explicit_supplier_order_authorization_required');
  }
  return Object.freeze({
    ...order,
    status: nextState,
    automaticSupplierOrdering: AUTOMATIC_SUPPLIER_ORDERING,
    lifecycle: {
      previousState: order.status,
      transitionedAt: evidence.transitionedAt || new Date().toISOString(),
      correlationId: string(evidence.correlationId, 160),
      evidenceRefs: Array.isArray(evidence.evidenceRefs) ? evidence.evidenceRefs.map((item) => string(item, 240)).filter(Boolean) : []
    }
  });
}

export function createCoreShipment(input = {}) {
  const orderId = string(input.orderId, 240);
  const carrier = string(input.carrier, 120);
  const trackingNumber = string(input.trackingNumber, 160);
  const trackingUrl = safeUrl(input.trackingUrl);
  if (!orderId || !carrier || !trackingNumber || !trackingUrl) throw new Error('verified_shipment_identity_required');
  return Object.freeze({
    schemaVersion: COMMERCE_CORE_VERSION,
    orderId,
    carrier,
    trackingNumber,
    trackingUrl,
    verified: input.verified === true,
    supplierOrderingPerformedByThisModule: false
  });
}

export function commerceCoreProvenance() {
  return Object.freeze({
    medusa: { repository: 'medusajs/medusa', license: 'MIT core only', enterpriseExcluded: true },
    saleor: { repository: 'saleor/saleor', license: 'BSD-3-Clause', use: 'architecture_reference' },
    adaptation: 'Original PrismBay contracts; no upstream source copied',
    automaticSupplierOrdering: false
  });
}
