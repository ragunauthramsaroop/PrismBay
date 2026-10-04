import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATIC_SUPPLIER_ORDERING,
  candidateToCoreProduct,
  commerceCoreProvenance,
  createCoreOrderFromLedgerRecord,
  createCoreShipment,
  isCoreProductSaleReady,
  transitionCoreOrder,
  validateOrderTransition
} from './contracts.mjs';

function saleReadyCandidate(overrides = {}) {
  return {
    sku: 'brush-1', slug: 'detail-brush', name: 'Detail Brush', category: 'cleaning-tools', status: 'SALE_READY',
    variantId: 'cj-variant-1', priceUsd: 19.95, checkoutUrl: 'https://buy.stripe.com/test',
    demandEvidenceVerified: true,
    demandEvidence: { source: 'market', observedAt: '2026-10-04T00:00:00Z', evidenceType: 'ranking', confidence: 'high' },
    supplierIdentityVerified: true, exactVariantVerified: true, variantStockVerified: true,
    finalDestinationFreightVerified: true, landedCostVerified: true, marginFloorPassed: true,
    mediaRightsVerified: true, checkoutInfrastructureVerified: true, fulfillmentReady: true,
    ...overrides
  };
}

test('fully gated candidate becomes a sale-ready core product', () => {
  const product = candidateToCoreProduct(saleReadyCandidate());
  assert.equal(product.publishable, true);
  assert.equal(isCoreProductSaleReady(product), true);
  assert.equal(product.fulfillment.automaticSupplierOrdering, false);
});

test('missing exact destination freight fails closed', () => {
  const product = candidateToCoreProduct(saleReadyCandidate({ finalDestinationFreightVerified: false }));
  assert.equal(product.publishable, false);
  assert.equal(product.offer.checkoutUrl, null);
  assert.ok(product.evidence.missing.includes('finalDestinationFreightVerified'));
});

test('missing explicit supplier variant identity fails core publishability', () => {
  const product = candidateToCoreProduct(saleReadyCandidate({ variantId: null }));
  assert.equal(product.publishable, false);
  assert.ok(product.evidence.missing.includes('variantId'));
});

test('non-SALE_READY candidate never exposes commercial checkout offer', () => {
  const product = candidateToCoreProduct(saleReadyCandidate({ status: 'READY_FOR_FINAL_COMMERCIAL_GATE', checkoutInfrastructureVerified: false, fulfillmentReady: false }));
  assert.equal(isCoreProductSaleReady(product), false);
  assert.equal(product.offer.checkoutUrl, null);
});

test('automatic supplier ordering is globally false in commerce core', () => {
  assert.equal(AUTOMATIC_SUPPLIER_ORDERING, false);
  const order = createCoreOrderFromLedgerRecord({ paymentIntentId: 'pi_123', paid: true, status: 'manual_fulfillment', currency: 'usd', amountTotal: 1995, items: [{ sku: 'brush-1', quantity: 1 }] });
  assert.equal(order.automaticSupplierOrdering, false);
});

test('supplier-pending transition requires explicit supplier-order authorization', () => {
  const order = createCoreOrderFromLedgerRecord({ paymentIntentId: 'pi_123', paid: true, status: 'manual_fulfillment', currency: 'usd', amountTotal: 1995, items: [{ sku: 'brush-1', quantity: 1 }] });
  assert.equal(validateOrderTransition('manual_fulfillment', 'supplier_pending').ok, true);
  assert.throws(() => transitionCoreOrder(order, 'supplier_pending', {}), /explicit_supplier_order_authorization_required/);
  const next = transitionCoreOrder(order, 'supplier_pending', { explicitSupplierOrderAuthorization: true, correlationId: 'corr-12345678' });
  assert.equal(next.status, 'supplier_pending');
  assert.equal(next.automaticSupplierOrdering, false);
});

test('illegal order transitions are rejected', () => {
  assert.equal(validateOrderTransition('manual_fulfillment', 'delivered').ok, false);
  assert.throws(() => transitionCoreOrder({ status: 'manual_fulfillment' }, 'delivered'), /illegal_order_transition/);
});

test('ledger order bridge keeps unsupported currency from looking valid', () => {
  const order = createCoreOrderFromLedgerRecord({ paymentIntentId: 'pi_123', paid: true, status: 'manual_fulfillment', currency: 'eur', amountTotal: 1995, items: [{ sku: 'brush-1', quantity: 1 }] });
  assert.equal(order.amount.currency, 'UNSUPPORTED');
});

test('shipment contract requires verified tracking identity fields but performs no supplier action', () => {
  const shipment = createCoreShipment({ orderId: 'pi_123', carrier: 'Carrier', trackingNumber: 'TRACK123', trackingUrl: 'https://carrier.example/track/TRACK123', verified: true });
  assert.equal(shipment.verified, true);
  assert.equal(shipment.supplierOrderingPerformedByThisModule, false);
  assert.throws(() => createCoreShipment({ orderId: 'pi_123', carrier: 'Carrier', trackingNumber: 'TRACK123', trackingUrl: 'http://unsafe.example' }), /verified_shipment_identity_required/);
});

test('provenance records correct Medusa and Saleor license boundaries', () => {
  const provenance = commerceCoreProvenance();
  assert.equal(provenance.medusa.license, 'MIT core only');
  assert.equal(provenance.medusa.enterpriseExcluded, true);
  assert.equal(provenance.saleor.license, 'BSD-3-Clause');
  assert.equal(provenance.saleor.use, 'architecture_reference');
});
