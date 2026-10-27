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
  slug:x.slug, observedProduct:x.slug==='home-caddy'?'Portable Cleaning Supply Caddy':x.slug==='motion-sensor-cabinet-lights'?'Motion Sensor Cabinet Light':x.name, independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,
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

test('original-only creative rights never imply supplier photo or video permission',()=>{
 const steamer=merch.candidates.find(x=>x.slug==='garment-steamer');
 const out=assessTop15(merch,{checkedAt:'2026-10-26T22:00:00Z',candidates:[{
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
 const out=assessTop15(merch,{checkedAt:'2026-10-26T23:57:11Z',candidates:[
  {slug:'pethair',observedProduct:'Pets Comb Brush Massage Cleaning Remove Hair Comb Pet Products',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true},
  {slug:'garment-steamer',observedProduct:'Standing Garment Steamer',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true},
  {slug:'screen-protector',observedProduct:'Mobile Phone Tempered Glass Screen Protector',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,mediaRightsVerified:true}
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
