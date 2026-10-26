import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessTop15} from './top15-readiness.mjs';
import {hasApprovedProductClass} from './cj-match-policy.mjs';
const merch=JSON.parse(fs.readFileSync(new URL('../config/top15-merchandising.json',import.meta.url),'utf8'));
const live=JSON.parse(fs.readFileSync(new URL('../services/physical-orders/live-catalog-candidates.json',import.meta.url),'utf8'));
test('all fifteen unique shortlisted categories use explicit strict identity policies',()=>{
 assert.equal(merch.candidates.length,15);
 assert.equal(new Set(merch.candidates.map(x=>x.slug)).size,15);
 merch.candidates.forEach(x=>assert.equal(hasApprovedProductClass(x.slug),true,x.slug));
 assert.equal(live.candidates.length,9);
});
test('status report never confuses supplier estimates with purchasable inventory',()=>{
 const out=assessTop15(merch,{checkedAt:'2026-10-26T12:00:00Z',candidates:merch.candidates.map((x)=>({
  slug:x.slug, independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,
  finalZipFreightVerified:false,mediaRightsVerified:false,checkoutInfrastructureVerified:true,
  fulfillmentRouteVerified:false,automaticPromotionAllowed:false
 }))});
 assert.equal(out.candidateCount,15);
 assert.equal(out.globalPhysicalCheckoutEnabled,false);
 assert.equal(out.anyClaimOfCheapestAuthorized,false);
 assert.equal(out.supplierScreeningPassedCount,15);
 assert.ok(out.products.every(x=>x.checkoutAction==='price_request_only' && x.globallySaleReady===false));
 assert.ok(out.products.every(x=>x.missingChecks.includes('destinationQuotePerBuyer')));
});
test('duplicate and incomplete shortlist fail closed',()=>{
 const short={candidates:merch.candidates.slice(0,14)};
 assert.throws(()=>assessTop15(short,{}),/Exactly 15/);
 const dup={candidates:merch.candidates.map((x,i)=>i===1?{...x,slug:merch.candidates[0].slug}:x)};
 assert.throws(()=>assessTop15(dup,{}),/duplicate/);
});
