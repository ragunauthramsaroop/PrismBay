import crypto from 'node:crypto';
import { checkoutEconomics, validateDestination } from './checkout-quote-gate.mjs';

const MAX_STOCK_AGE_MS = 30 * 60 * 1000;
const MAX_FREIGHT_AGE_MS = 10 * 60 * 1000;
const MAX_EVIDENCE_AGE_MS = 30 * 60 * 1000;
const MAX_APPROVAL_TTL_MS = 30 * 60 * 1000;

function text(value, max = 220) {
  const v = String(value || '').trim();
  return v && v.length <= max ? v : null;
}

function parseTime(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('base64url');
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function draftFingerprint(draft) {
  return stableHash(JSON.stringify(stableObject({
    version: draft.version,
    orderRef: draft.orderRef,
    items: draft.items,
    destinationHash: draft.destinationHash,
    evidenceRef: draft.evidenceRef,
    economics: draft.economics
  })));
}

function validApprovalSecret(secret) {
  return typeof secret === 'string' && secret.length >= 32 && secret.length <= 512;
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function matchingOrder(snapshot, orderRef) {
  const orders = snapshot?.orders && typeof snapshot.orders === 'object' ? Object.values(snapshot.orders) : [];
  return orders.find((order) => order?.sessionId === orderRef) || null;
}

export function assessSupplierReadiness({ ledgerSnapshot, orderRef, evidence, now = Date.now() } = {}) {
  const reasons = [];
  const sessionId = text(orderRef);
  const order = sessionId ? matchingOrder(ledgerSnapshot, sessionId) : null;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) reasons.push('valid_paid_order_reference_required');
  if (!order || order.paid !== true || !['manual_fulfillment', 'processing'].includes(order.status)) reasons.push('paid_physical_order_not_ready');

  const evidenceRef = text(evidence?.evidenceRef);
  const evidenceAt = parseTime(evidence?.verifiedAt);
  if (!evidenceRef || !/^evidence_[A-Za-z0-9._:-]+$/.test(evidenceRef)) reasons.push('verified_evidence_reference_required');
  if (evidenceAt === null || evidenceAt > now || now - evidenceAt > MAX_EVIDENCE_AGE_MS) reasons.push('fresh_supplier_evidence_required');

  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const suppliedItems = Array.isArray(evidence?.items) ? evidence.items : [];
  if (!orderItems.length || suppliedItems.length !== orderItems.length) reasons.push('exact_order_item_evidence_required');

  const normalizedItems = [];
  for (let i = 0; i < orderItems.length; i += 1) {
    const expected = orderItems[i] || {};
    const supplied = suppliedItems[i] || {};
    const sku = text(expected.sku, 120);
    const quantity = Number(expected.quantity);
    const variantId = text(supplied.variantId);
    const inventory = Number(supplied.inventory);
    const stockAt = parseTime(supplied.stockVerifiedAt);
    if (!sku || supplied.sku !== sku || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) reasons.push('order_item_identity_mismatch');
    if (!variantId || supplied.supplierVariantVerified !== true) reasons.push('verified_supplier_variant_required');
    if (supplied.inventoryVerified !== true || !Number.isFinite(inventory) || inventory < quantity) reasons.push('verified_inventory_insufficient');
    if (stockAt === null || stockAt > now || now - stockAt > MAX_STOCK_AGE_MS) reasons.push('fresh_stock_verification_required');
    if (supplied.listingRightsVerified !== true) reasons.push('listing_rights_not_verified');
    normalizedItems.push({ sku, quantity, variantId, inventory });
  }

  const destination = validateDestination(evidence?.destination?.country, evidence?.destination?.zip);
  if (!destination.valid || evidence?.destination?.finalDestinationFreight !== true || evidence?.destination?.freightScope !== 'buyer_destination_zip') reasons.push('exact_buyer_destination_freight_required');
  const freightAt = parseTime(evidence?.destination?.freightQuotedAt);
  if (freightAt === null || freightAt > now || now - freightAt > MAX_FREIGHT_AGE_MS) reasons.push('fresh_freight_quote_required');

  const economics = checkoutEconomics(evidence?.economics || {});
  if (!economics.verified || !economics.pass) reasons.push(economics.reason);
  if (evidence?.economicsVerified !== true) reasons.push('verified_economics_required');
  if (evidence?.supplierIdentityVerified !== true) reasons.push('supplier_identity_not_verified');
  if (evidence?.supplierSubmissionRouteVerified !== true) reasons.push('supplier_submission_route_not_verified');

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length) return { ready: false, reasons: uniqueReasons, supplierSubmissionEnabled: false };

  const destinationHash = stableHash(`${destination.country}:${destination.zip}`);
  const draft = {
    version: 1,
    orderRef: sessionId,
    evidenceRef,
    items: normalizedItems.map(({ sku, quantity, variantId }) => ({ sku, quantity, variantId })),
    destinationHash,
    economics,
    preparedAt: new Date(now).toISOString(),
    supplierSubmissionEnabled: false
  };
  const fingerprint = draftFingerprint(draft);
  return {
    ready: true,
    reasons: [],
    draft: { ...draft, draftId: `supplier_draft_${fingerprint.slice(0, 32)}`, fingerprint },
    supplierSubmissionEnabled: false
  };
}

export function issueSupplierApproval({ draft, approvalRef, approverRef, secret, now = Date.now(), ttlMs = 15 * 60 * 1000 } = {}) {
  if (!draft || draft.supplierSubmissionEnabled !== false || !/^supplier_draft_[A-Za-z0-9_-]{32}$/.test(String(draft.draftId || ''))) throw new Error('valid_supplier_draft_required');
  if (draft.fingerprint !== draftFingerprint(draft)) throw new Error('supplier_draft_fingerprint_mismatch');
  if (!validApprovalSecret(secret)) throw new Error('supplier_approval_secret_required');
  const approval = text(approvalRef, 160);
  const approver = text(approverRef, 160);
  if (!approval || !/^approval_[A-Za-z0-9._:-]+$/.test(approval)) throw new Error('valid_supplier_approval_reference_required');
  if (!approver || !/^approver_[A-Za-z0-9._:-]+$/.test(approver)) throw new Error('valid_supplier_approver_reference_required');
  const ttl = Number(ttlMs);
  if (!Number.isInteger(ttl) || ttl <= 0 || ttl > MAX_APPROVAL_TTL_MS) throw new Error('invalid_supplier_approval_ttl');
  const payloadObject = {
    v: 1,
    draftId: draft.draftId,
    fingerprint: draft.fingerprint,
    orderRef: draft.orderRef,
    approvalRef: approval,
    approverRef: approver,
    issuedAt: now,
    expiresAt: now + ttl,
    supplierSubmissionEnabled: false
  };
  const payload = Buffer.from(JSON.stringify(payloadObject), 'utf8').toString('base64url');
  return { token: `${payload}.${sign(payload, secret)}`, ...payloadObject };
}

export function verifySupplierApproval({ token, draft, secret, now = Date.now() } = {}) {
  if (!validApprovalSecret(secret)) return { valid: false, reason: 'invalid_supplier_approval_secret' };
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed_supplier_approval' };
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload, secret))) return { valid: false, reason: 'invalid_supplier_approval_signature' };
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return { valid: false, reason: 'invalid_supplier_approval_payload' }; }
  if (data.v !== 1 || data.supplierSubmissionEnabled !== false) return { valid: false, reason: 'unsafe_supplier_approval' };
  if (!draft || data.draftId !== draft.draftId || data.fingerprint !== draft.fingerprint || data.orderRef !== draft.orderRef) return { valid: false, reason: 'supplier_approval_scope_mismatch' };
  if (draft.fingerprint !== draftFingerprint(draft)) return { valid: false, reason: 'supplier_draft_fingerprint_mismatch' };
  if (!Number.isFinite(data.issuedAt) || !Number.isFinite(data.expiresAt) || data.expiresAt <= data.issuedAt || data.expiresAt - data.issuedAt > MAX_APPROVAL_TTL_MS) return { valid: false, reason: 'invalid_supplier_approval_lifetime' };
  if (now < data.issuedAt || now >= data.expiresAt) return { valid: false, reason: 'expired_supplier_approval' };
  return {
    valid: true,
    draftId: data.draftId,
    orderRef: data.orderRef,
    approvalRef: data.approvalRef,
    approverRef: data.approverRef,
    expiresAt: data.expiresAt,
    supplierSubmissionEnabled: false
  };
}
