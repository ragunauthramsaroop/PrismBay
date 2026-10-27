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
 const now=new Date().toISOString();
 const out=assessTop15(merch,{checkedAt:now,authenticationVerified:true,candidates:merch.candidates.map((x)=>({
  observedAt:now,observedSupplierSku:'CJTEST123456',observedVariantSku:'CJTEST12345601',
  slug:x.slug, observedProduct:x.slug==='home-caddy'?'Portable Cleaning Supply Caddy':x.slug==='motion-sensor-cabinet-lights'?'Motion Sensor Cabinet Light':x.name, independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,
  finalZipFreightVerified:false,mediaRightsVerified:false,checkoutInfrastructureVerified:true,
  fulfillmentRouteVerified:false,automaticPromotionAllowed:false
 }))});
 assert.equal(out.candidateCount,15);
 assert.equal(out.supplierReportAuthenticatedAndFresh,true);
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

test('original-only creative rights never imply supplier photo or video permission',()=>{
 const steamer=merch.candidates.find(x=>x.slug==='garment-steamer');
 const now=new Date().toISOString();
 const out=assessTop15(merch,{checkedAt:now,authenticationVerified:true,candidates:[{observedAt:now,
  slug:steamer.slug, observedProduct:'USB Handheld Garment Steamer',
  observedSupplierSku:'CJYD2458440',observedVariantSku:'CJYD245844002BY',
  independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,
  mediaRightsVerified:true,promotionMediaPolicy:'original_graphics_and_original_copy_only',
  finalZipFreightVerified:false,fulfillmentRouteVerified:false,automaticPromotionAllowed:false
 }]});
 const row=out.products.find(x=>x.slug===steamer.slug);
 assert.equal(row.verifiedChecks.mediaRights,true);
 assert.equal(row.mediaRightsScope,'original_graphics_and_original_copy_only');
 assert.equal(row.supplierPhotoVideoRightsVerified,false);
 assert.equal(row.observedSupplierSku,'CJYD2458440');
 assert.equal(row.observedVariantSku,'CJYD245844002BY');
 assert.equal(row.checkoutAction,'price_request_only');
 assert.equal(row.globallySaleReady,false);
 assert.match(out.revenueProofRequired,/Stripe paid transaction/);
 assert.match(out.fulfillmentProofRequired,/order-specific/);
});
test('unverified rights and mismatched supplier evidence remain visibly blocked',()=>{
 const out=assessTop15(merch,{candidates:[{
  slug:'crevice',observedProduct:'4 In 1 Bottle Gap Cleaner Brush',
  observedSupplierSku:'CJJT1731477',independentIdentityMatch:false,
  mediaRightsVerified:false,automaticPromotionAllowed:false
 }]});
 const row=out.products.find(x=>x.slug==='crevice');
 assert.equal(row.verifiedChecks.independentSupplierMatch,false);
 assert.equal(row.mediaRightsScope,'unverified');
 assert.equal(row.supplierPhotoVideoRightsVerified,false);
 assert.equal(row.observedSupplierProduct,'4 In 1 Bottle Gap Cleaner Brush');
 assert.equal(row.globallySaleReady,false);
});

test('stale supplier report cannot bypass the current exact-product identity policy',()=>{
 const now=new Date().toISOString();
 const out=assessTop15(merch,{checkedAt:now,authenticationVerified:true,candidates:[
  {slug:'pethair',observedAt:now,observedSupplierSku:'CJTEST123456',observedVariantSku:'CJTEST12345601',observedProduct:'Pets Comb Brush Massage Cleaning Remove Hair Comb Pet Products',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true},
  {slug:'garment-steamer',observedAt:now,observedSupplierSku:'CJTEST123456',observedVariantSku:'CJTEST12345601',observedProduct:'Standing Garment Steamer',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true},
  {slug:'screen-protector',observedAt:now,observedSupplierSku:'CJTEST123456',observedVariantSku:'CJTEST12345601',observedProduct:'Mobile Phone Tempered Glass Screen Protector',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true}
 ]});
 assert.equal(out.supplierScreeningPassedCount,1);
 for(const slug of ['pethair','garment-steamer']){
  const row=out.products.find(x=>x.slug===slug);
  assert.equal(row.verifiedChecks.independentSupplierMatch,false,slug);
  assert.equal(row.supplierScreeningPassed,false,slug);
  assert.equal(row.globallySaleReady,false,slug);
  assert.equal(row.checkoutAction,'price_request_only',slug);
 }
 assert.equal(out.products.find(x=>x.slug==='screen-protector').supplierScreeningPassed,true);
});

test('unauthenticated, stale, future, undated or incomplete supplier evidence cannot pass screening',()=>{
 const nowMs=Date.parse('2026-10-27T06:30:00Z');
 const iso=delta=>new Date(nowMs+delta).toISOString();
 const candidate={
  slug:'screen-protector',observedProduct:'Mobile Phone Tempered Glass Screen Protector',
  observedSupplierSku:'CJPB2377299',observedVariantSku:'CJPB237729905EV',
  observedAt:iso(-60_000),independentIdentityMatch:true,
  variantStockVerified:true,freightEstimateVerified:true
 };
 const report={checkedAt:iso(0),authenticationVerified:true,candidates:[candidate]};
 const assess=value=>assessTop15(merch,value,nowMs);
 assert.equal(assess(report).supplierScreeningPassedCount,1);
 assert.equal(assess(report).supplierReportAuthenticatedAndFresh,true);
 for(const bad of [
  {...report,authenticationVerified:false},
  {...report,authenticationVerified:undefined},
  {...report,checkedAt:iso(-37*3_600_000)},
  {...report,checkedAt:iso(6*60_000)},
  {...report,candidates:[{...candidate,observedAt:undefined}]},
  {...report,candidates:[{...candidate,observedAt:iso(-31*3_600_000)}]},
  {...report,candidates:[{...candidate,observedAt:iso(6*60_000)}]},
  {...report,candidates:[{...candidate,observedSupplierSku:null}]},
  {...report,candidates:[{...candidate,observedVariantSku:null}]},
  {...report,candidates:[{...candidate,observedVariantSku:'CJYD245844002BY'}]}, // unrelated garment-steamer variant
  {...report,candidates:[{...candidate,variantStockVerified:false}]}
 ]){
  const result=assess(bad);
  assert.equal(result.supplierScreeningPassedCount,0,JSON.stringify(bad).slice(0,150));
  assert.equal(result.products.find(x=>x.slug==='screen-protector').globallySaleReady,false);
 }
});

test('commercial readiness flags fail closed when supplier identity or variant provenance fails',()=>{
 const nowMs=Date.parse('2026-10-27T10:00:00Z');
 const now=new Date(nowMs).toISOString();
 const positive={
  slug:'screen-protector',observedAt:now,
  observedProduct:'Mobile Phone Tempered Glass Screen Protector',
  observedSupplierSku:'CJPB2377299',observedVariantSku:'CJPB237729905EV',
  independentIdentityMatch:true,variantStockVerified:true,
  freightEstimateVerified:true,finalZipFreightVerified:true,
  mediaRightsVerified:true,supplierPhotoVideoRightsVerified:true,
  promotionMediaPolicy:'supplier_photography_authorized',
  checkoutInfrastructureVerified:true,fulfillmentRouteVerified:true,
  automaticPromotionAllowed:true
 };
 const assess=row=>assessTop15(merch,{checkedAt:now,authenticationVerified:true,candidates:[row]},nowMs)
   .products.find(x=>x.slug==='screen-protector');
 const approvedEvidence=assess(positive);
 assert.ok(Object.values(approvedEvidence.verifiedChecks).every(Boolean));
 assert.equal(approvedEvidence.globallySaleReady,false);
 assert.equal(approvedEvidence.checkoutAction,'price_request_only');
 for(const invalid of [
  {...positive,observedProduct:'Standing Garment Steamer'},
  {...positive,independentIdentityMatch:false},
  {...positive,observedSupplierSku:'CJYD2458440',observedVariantSku:'CJYD245844002BY'},
  {...positive,observedVariantSku:'CJYD245844002BY'},
  {...positive,variantStockVerified:false},
  {...positive,observedAt:undefined}
 ]){
  const row=assess(invalid);
  assert.ok(Object.values(row.verifiedChecks).every(x=>x===false),
    'unmatched supplier or variant must not retain any downstream approval');
  assert.equal(row.supplierPhotoVideoRightsVerified,false);
  assert.equal(row.supplierScreeningPassed,false);
  assert.equal(row.globallySaleReady,false);
  assert.equal(row.checkoutAction,'price_request_only');
 }
});
