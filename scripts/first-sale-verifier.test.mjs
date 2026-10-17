import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFirstSale} from './first-sale-verifier.mjs';
test('local payment claims fail closed',()=>{const r=verifyFirstSale({order:{test:false,paid:true,paymentId:'pi_FAKE123',supplierOrderVerified:true,shipmentVerified:true,refunded:false,grossRevenueUsd:29.95,productCostUsd:2.72,freightCostUsd:8.43}});assert.equal(r.verifiedFirstSale,false);assert.equal(r.netMarginUsd,null);});
