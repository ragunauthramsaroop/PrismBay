import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRevenueEvidence} from './revenue-evidence-gates.mjs';

test('200 responses alone never establish a paid sale',()=>{
 const state=classifyRevenueEvidence({guideHealthy:true,checkoutHealthy:true});
 assert.equal(state.technicalPathHealthy,true);
 assert.equal(state.firstSaleVerified,false);
 assert.equal(state.trafficStatus,'UNMEASURED');
 assert.equal(state.paymentStatus,'STRIPE_DATA_NOT_CONNECTED');
 assert.equal(state.deliveryStatus,'NOT_VERIFIED');
 assert.equal(state.nextAction,'MEASURE_EXTERNAL_BUYER_TRAFFIC');
});
test('zero genuine visitors prioritizes acquisition',()=>{
 const state=classifyRevenueEvidence({guideHealthy:true,checkoutHealthy:true,trafficCount:0,paidOrders:0});
 assert.equal(state.nextAction,'DISTRIBUTE_TO_RELEVANT_BUYERS');
 assert.equal(state.firstSaleVerified,false);
});
test('observed visits and no orders identify conversion blocker',()=>{
 const state=classifyRevenueEvidence({guideHealthy:true,checkoutHealthy:true,trafficCount:100,paidOrders:0});
 assert.equal(state.nextAction,'IMPROVE_OFFER_CONVERSION');
 assert.equal(state.firstSaleVerified,false);
});
test('paid orders are distinct from fulfillment',()=>{
 const state=classifyRevenueEvidence({guideHealthy:true,checkoutHealthy:true,trafficCount:100,paidOrders:1});
 assert.equal(state.firstSaleVerified,true);
 assert.equal(state.deliveryStatus,'NOT_VERIFIED');
 assert.equal(state.nextAction,'VERIFY_ORDER_BOUND_FULFILLMENT');
});
test('failed checkout blocks paid promotion readiness',()=>{
 const state=classifyRevenueEvidence({guideHealthy:true,checkoutHealthy:false});
 assert.equal(state.technicalPathHealthy,false);
 assert.equal(state.nextAction,'REPAIR_BUYER_LINKS');
});
