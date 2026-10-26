import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { retrieveLiveStripePayment, verifyFirstSale } from './first-sale-verifier.mjs';

const order = { sku:'garment-steamer', paymentId:'pi_fixture123', grossRevenueUsd:29.95, productCostUsd:5, freightCostUsd:9, paymentFeesUsd:1.2, paid:true, test:false, supplierOrderVerified:false, shipmentVerified:false, refunded:false };
const stripeIntent = {
  object:'payment_intent', id:order.paymentId, livemode:true, status:'succeeded', currency:'usd', amount_received:2995, metadata:{commerce_schema:'prismbay-v1',sku:order.sku},
  latest_charge:{payment_intent:order.paymentId, livemode:true, currency:'usd', status:'succeeded', paid:true, captured:true, amount_captured:2995, refunded:false, disputed:false, amount_refunded:0}
};
const fakeFetch = body => async () => ({ok:true, json:async()=>body});
async function withFakeStripe(body, run) {
 const previousFlag=process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION;
 const previousKey=process.env.PRISMBAY_STRIPE_READ_ONLY_KEY;
 process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION='1';
 process.env.PRISMBAY_STRIPE_READ_ONLY_KEY='rk_live_fixture123';
 const spy=mock.method(globalThis,'fetch',fakeFetch(body));
 try { return await run(); } finally {
  spy.mock.restore();
  if(previousFlag===undefined)delete process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION;
  else process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION=previousFlag;
  if(previousKey===undefined)delete process.env.PRISMBAY_STRIPE_READ_ONLY_KEY;
  else process.env.PRISMBAY_STRIPE_READ_ONLY_KEY=previousKey;
 }
}

test('synthetic local paid and shipped flags never establish a verified sale',()=>{
 const r=verifyFirstSale({order:{...order,supplierOrderVerified:true,shipmentVerified:true}},null);
 assert.equal(r.verifiedFirstSale,false);
 assert.equal(r.grossRevenueUsd,0);
 assert.equal(r.verifiedSaleCount,0);
});

test('read-only live payment establishes sale independently of fulfillment',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 const r=verifyFirstSale({order},live);
 assert.equal(r.verifiedFirstSale,true);
 assert.equal(r.grossRevenueUsd,29.95);
 assert.equal(r.fulfillmentVerified,false);
 assert.equal(r.marginVerified,false);
 assert.equal(r.netMarginUsd,null);
});

test('absent owner authorization or restricted key blocks live inspection',async()=>{
 await withFakeStripe(stripeIntent,async()=>{
  process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION='0';
  assert.equal(await retrieveLiveStripePayment(order.paymentId),null);
  process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION='1';
  process.env.PRISMBAY_STRIPE_READ_ONLY_KEY='sk_live_wrongscope';
  assert.equal(await retrieveLiveStripePayment(order.paymentId),null);
 });
});

test('test-mode, unpaid, refunded and disputed Stripe records are rejected',async()=>{
 for(const patch of [{livemode:false},{status:'requires_payment_method'},{latest_charge:{...stripeIntent.latest_charge,refunded:true}},{latest_charge:{...stripeIntent.latest_charge,disputed:true}},{latest_charge:{...stripeIntent.latest_charge,amount_refunded:100}}]){
  const record={...stripeIntent,...patch};
  assert.equal(await withFakeStripe(record,()=>retrieveLiveStripePayment(order.paymentId)),null);
 }
});

test('wrong payment ID, missing charge and wrong currency fail closed',async()=>{
 for(const patch of [{id:'pi_other'},{latest_charge:'ch_unexpanded'},{currency:'eur'}]){
  assert.equal(await withFakeStripe({...stripeIntent,...patch},()=>retrieveLiveStripePayment(order.paymentId)),null);
 }
});

test('untrusted order amounts never override authenticated Stripe amount',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 const r=verifyFirstSale({order:{...order,grossRevenueUsd:129.95}},live);
 assert.equal(r.verifiedFirstSale,false);
 assert.equal(r.grossRevenueUsd,0);
});

test('unknown fulfillment costs do not block paid-sale recognition or invent margin',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 const r=verifyFirstSale({order:{...order,productCostUsd:null,freightCostUsd:null,paymentFeesUsd:null}},live);
 assert.equal(r.verifiedFirstSale,true);
 assert.equal(r.marginVerified,false);
 assert.equal(r.netMarginUsd,null);
});

test('Stripe API failures are fail-closed and redact payment details',async()=>{
 const live=await withFakeStripe(stripeIntent,async()=>{
  const spy=mock.method(globalThis,'fetch',async()=>{throw new Error('sensitive details');});
  try{return await retrieveLiveStripePayment(order.paymentId);}finally{spy.mock.restore();}
 });
 assert.equal(live,null);
 const report=JSON.stringify(verifyFirstSale({order},live));
 assert.equal(report.includes(order.paymentId),false);
});

test('caller-supplied payment-shaped JSON never counts as authenticated Stripe proof',()=>{
 const forged = {paymentId:order.paymentId,sku:order.sku,amountReceivedCents:2995,currency:'usd'};
 const r=verifyFirstSale({order:{...order,supplierOrderVerified:true,shipmentVerified:true}},forged);
 assert.equal(r.verifiedFirstSale,false);
 assert.equal(r.verifiedSaleCount,0);
 assert.equal(r.grossRevenueUsd,0);
});

test('authenticated payment receipt is immutable and cannot be repurposed for a different order',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 assert.equal(Object.isFrozen(live),true);
 assert.throws(()=>{live.amountReceivedCents=999999;},TypeError);
 assert.equal(verifyFirstSale({order:{...order,paymentId:'pi_another'}},live).verifiedFirstSale,false);
});

test('live payment for another product cannot count as PrismBay Clean order',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 assert.equal(verifyFirstSale({order:{...order,sku:'crevice'}},live).verifiedFirstSale,false);
});

test('unscoped live Stripe payment is rejected even when paid',async()=>{
 const other={...stripeIntent,metadata:{commerce_schema:'other-business',sku:order.sku}};
 assert.equal(await withFakeStripe(other,()=>retrieveLiveStripePayment(order.paymentId)),null);
 const missing={...stripeIntent,metadata:null};
 assert.equal(await withFakeStripe(missing,()=>retrieveLiveStripePayment(order.paymentId)),null);
});

test('locally marked test order never counts against live Stripe',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 assert.equal(verifyFirstSale({order:{...order,test:true}},live).verifiedFirstSale,false);
});

test('self-asserted supplier and shipment flags never establish fulfilled status after real payment', async () => {
  const live = await withFakeStripe(stripeIntent, () => retrieveLiveStripePayment(order.paymentId));
  const r = verifyFirstSale({ order: { ...order, supplierOrderVerified: true, shipmentVerified: true } }, live);
  assert.equal(r.verifiedFirstSale, true);
  assert.equal(r.fulfillmentVerified, false);
  assert.equal(r.checks.supplierOrderVerified, false);
  assert.equal(r.checks.shipmentVerified, false);
});

test('self-reported product, freight and fee costs never establish verified profit',async()=>{
 const live=await withFakeStripe(stripeIntent,()=>retrieveLiveStripePayment(order.paymentId));
 for(const costs of [
  {productCostUsd:0,freightCostUsd:0,paymentFeesUsd:0},
  {productCostUsd:5,freightCostUsd:9,paymentFeesUsd:1.2},
  {productCostUsd:500,freightCostUsd:900,paymentFeesUsd:120}
 ]){
  const r=verifyFirstSale({order:{...order,...costs}},live);
  assert.equal(r.verifiedFirstSale,true);
  assert.equal(r.marginVerified,false);
  assert.equal(r.netMarginUsd,null);
  assert.equal(r.checks.marginInputsComplete,false);
 }
});
