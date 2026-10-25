import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrganization, selectBottleneck, buildFirstSaleWarRoom, buildDashboard, verifiedPromotionReadyCount } from './paperclip-commerce-group.mjs';


// Existing gate-unit fixtures intentionally omit report transport metadata.
// Wrap them in fresh authenticated reports so their assertions isolate
// individual SKU, stock, freight, media, checkout and fulfillment gates.
function readyCountForFixture(supplier, promotion) {
 const checkedAt = new Date().toISOString();
 const reviewedSupplier = supplier && {
  ...supplier, schemaVersion: 3, checkedAt, authenticationVerified: true,
  candidates: Array.isArray(supplier.candidates)
   ? supplier.candidates.map(candidate => ({...candidate, observedAt: checkedAt}))
   : supplier.candidates
 };
 const reviewedPromotion = promotion && {
  ...promotion, schemaVersion: 2, generatedAt: checkedAt, reviewFresh: true
 };
 return verifiedPromotionReadyCount(reviewedSupplier, reviewedPromotion);
}

const rules={
  verifiedPurchasesOnlyCountAsRevenue:true,
  dashboardOnlyFromVerifiedEvidence:true,
  blockerCreatesAlternativeTask:true,
  parallelExecutionRequired:true,
  neverIdleWholeSystemForOneDependency:true,
  firstSaleWarRoomUntilVerifiedSale:true,
  zeroCostFirst:true,
};
const manifest={
  parent:'PrismBay Commerce Group',
  objective:'Generate verified, profitable dropshipping sales for PrismBay Clean.',
  masterExecutionPrompt:'paperclip/prismbay-commerce-group/MASTER_EXECUTION_PROMPT.md',
  rules,
  commercialEscalation:Array.from({length:8},(_,i)=>({level:i+1,action:'level_'+(i+1)})),
  companies:Array.from({length:10},(_,i)=>({id:'c'+i,name:'Company '+i,funnelStage:'stage'+i,mission:'mission',primaryKpi:'kpi'}))
};

test('requires exactly ten unique specialist companies and persistence rules',()=>{
 assert.equal(validateOrganization(manifest),true);
 assert.throws(()=>validateOrganization({...manifest,companies:manifest.companies.slice(0,9)}),/exactly ten/);
 assert.throws(()=>validateOrganization({...manifest,masterExecutionPrompt:null}),/master execution prompt/);
 assert.throws(()=>validateOrganization({...manifest,rules:{...rules,parallelExecutionRequired:false}}),/parallelExecutionRequired/);
});

test('nearest commercially verified product routes bottleneck to supplier fulfillment',()=>{
 const supplier={candidates:[{slug:'crevice',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true}]};
 const b=selectBottleneck({firstSale:{verifiedFirstSale:false},supplier,promotion:{promotionEligibleCount:0},opportunities:null});
 assert.equal(b.owner,'supplier-fulfillment');
 assert.equal(b.product,'crevice');
 assert.ok(b.missing.includes('final_zip_freight'));
 assert.ok(b.missing.includes('checkout'));
});

test('First Sale War Room preserves primary blocker and runs backup work in parallel',()=>{
 const supplier={candidates:[{slug:'crevice',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true}]};
 const opportunities={sourcingQueue:[{slug:'toilet-scrubber-kit'},{slug:'microfiber-car-detailing-cloths'}]};
 const bottleneck=selectBottleneck({firstSale:{verifiedFirstSale:false},supplier,promotion:{promotionEligibleCount:0},opportunities});
 const war=buildFirstSaleWarRoom({bottleneck,supplier,promotion:{promotionEligibleCount:0},storefront:{result:{activeStorefront:{status:200}}},tiktok:{readyForPublicRetailPublishing:false},opportunities,firstSale:{verifiedFirstSale:false}});
 assert.equal(war.closestProduct,'crevice');
 assert.equal(war.nextBestProduct,'toilet-scrubber-kit');
 assert.ok(war.gateOwners.some(g=>g.gate==='final_zip_freight'&&g.owner==='supplier-fulfillment'));
 assert.ok(war.gateOwners.some(g=>g.gate==='checkout'&&g.owner==='storefront-conversion'));
 assert.ok(war.parallelWorkRequired.includes('supplier_verification:toilet-scrubber-kit'));
 assert.ok(war.alternativePathsInProgress.some(x=>x.includes('toilet-scrubber-kit')));
 assert.equal(war.checkoutReadiness,'infrastructure_verified_waiting_remaining_commercial_gates');
});

test('dashboard never invents revenue or funnel metrics and exposes alternatives',()=>{
 const dashboard=buildDashboard({
  manifest,
  firstSale:{verifiedFirstSale:false},
  supplier:{candidates:[{slug:'crevice',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true}]},
  promotion:{promotionEligibleCount:0},
  opportunities:{sourcingQueue:[{slug:'toilet-scrubber-kit'}]},
  storefront:{result:{activeStorefront:{status:200}}},
  tiktok:{siteVerificationReady:false,readyForPublicRetailPublishing:false},
  revenueBoard:null
 });
 assert.equal(dashboard.verifiedSales,0);
 assert.equal(dashboard.grossRevenueUsd,0);
 assert.equal(dashboard.conversionRate,null);
 assert.equal(dashboard.scoreboard.qualifiedExternalVisitors,null);
 assert.deepEqual(dashboard.scoreboard.productsActivelyPromoted,[]);
 assert.equal(dashboard.companyQueue.length,10);
 assert.ok(dashboard.evidenceGaps.includes('grossMarginUsd'));
 assert.ok(dashboard.scoreboard.alternativePathsInProgress.length>=1);
 assert.equal(dashboard.firstSaleWarRoom.nextBestProduct,'toilet-scrubber-kit');
 assert.ok(dashboard.priorityTasks.every(t=>t.objective&&t.owner&&t.commercialReason&&Array.isArray(t.requiredEvidence)&&t.fallbackRoute&&t.successMetric&&t.stopCondition&&t.nextAction));
 assert.equal(dashboard.externalActionsAwaitingOwnerApproval.length,0);
});

test('a verified sale closes First Sale War Room and shifts control to measurement',()=>{
 const b=selectBottleneck({firstSale:{verifiedFirstSale:true},supplier:null,promotion:null,storefront:null,tiktok:null,opportunities:null});
 assert.equal(b.owner,'revenue-analytics');
 assert.equal(b.reason,'verified_sale_exists_measure_margin_and_repeatability');
 const war=buildFirstSaleWarRoom({bottleneck:b,supplier:null,promotion:null,storefront:null,tiktok:null,opportunities:null,firstSale:{verifiedFirstSale:true}});
 assert.equal(war,null);
});

const fullyCleared={slug:'verified-physical-item',observedVariantSku:'SKU-001',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:true,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:true,fulfillmentRouteVerified:true,automaticPromotionAllowed:true};

const fullyEligible={slug:'verified-physical-item',sku:'SKU-001',promotionEligible:true,directCheckoutEligible:true};
const promotionEvidence={promotionEligibleCount:1,promotionEligible:[fullyEligible]};

test('physical readiness requires independent supplier and promotion counts plus complete candidate evidence',()=>{
 const supplier={saleReadyCount:1,candidates:[fullyCleared]};
 assert.equal(readyCountForFixture(supplier,promotionEvidence),1);
 assert.equal(readyCountForFixture({...supplier,saleReadyCount:0},promotionEvidence),0);
 assert.equal(readyCountForFixture(supplier,{promotionEligibleCount:0}),0);
 assert.equal(readyCountForFixture({candidates:[fullyCleared]},promotionEvidence),0);
 assert.equal(readyCountForFixture(null,promotionEvidence),0);
});

test('no missing or malformed commercial gate is treated as approval',()=>{
 const keys=['independentIdentityMatch','variantStockVerified','freightEstimateVerified','finalZipFreightVerified','mediaRightsVerified','checkoutInfrastructureVerified','checkoutAllowed','fulfillmentRouteVerified','automaticPromotionAllowed'];
 for(const key of keys){
  for(const value of [false,null,undefined,'true',1]){
   const candidate={...fullyCleared,[key]:value};
   assert.equal(readyCountForFixture({saleReadyCount:1,candidates:[candidate]},promotionEvidence),0,`${key}=${String(value)}`);
  }
 }
});

test('promotion summary cannot manufacture sale-ready products without candidates',()=>{
 const supplier={saleReadyCount:12,candidates:[]};
 const promotion={promotionEligibleCount:12};
 assert.equal(readyCountForFixture(supplier,promotion),0);
 const dashboard=buildDashboard({manifest,supplier,promotion,firstSale:{verifiedFirstSale:false},opportunities:{sourcingQueue:[]},storefront:{result:{activeStorefront:{status:200}}},tiktok:{readyForPublicRetailPublishing:false}});
 assert.equal(dashboard.promotionEligibleCount,0);
 assert.equal(dashboard.firstSaleWarRoom.trafficSourceReadyToActivate,null);
});

test('a partially cleared candidate stays in supplier verification despite inflated promotion counts',()=>{
 const supplier={saleReadyCount:1,candidates:[{...fullyCleared,finalZipFreightVerified:false,checkoutAllowed:false}]};
 const promotion=promotionEvidence;
 assert.equal(readyCountForFixture(supplier,promotion),0);
 const bottleneck=selectBottleneck({firstSale:{verifiedFirstSale:false},supplier,promotion,opportunities:{sourcingQueue:[]},tiktok:{readyForPublicRetailPublishing:false}});
 assert.equal(bottleneck.stage,'supplier_verification');
 assert.deepEqual(bottleneck.missing.sort(),['checkout','final_zip_freight']);
});


test('Paperclip does not approve promotion without independent checkout and fulfillment evidence',()=>{
 const promotion={promotionEligibleCount:1};
 for(const gate of ['checkoutInfrastructureVerified','fulfillmentRouteVerified']){
  const supplier={saleReadyCount:1,candidates:[{...fullyCleared,[gate]:false}]};
  assert.equal(readyCountForFixture(supplier,promotion),0);
  const dashboard=buildDashboard({manifest,supplier,promotion,firstSale:{verifiedFirstSale:false},opportunities:{sourcingQueue:[]},storefront:{result:{activeStorefront:{status:200}}},tiktok:{readyForPublicRetailPublishing:false}});
  assert.equal(dashboard.promotionEligibleCount,0);
  assert.deepEqual(dashboard.productsApprovedForPromotion,[]);
  assert.ok(dashboard.productsAwaitingCommercialGateClosure.includes('verified-physical-item'));
  assert.ok(dashboard.currentBottleneck.missing.includes(gate==='fulfillmentRouteVerified'?'fulfillment_route':'checkout_infrastructure'));
 }
});

test('Paperclip approval list requires agreeing supplier and promotion counts',()=>{
 const supplier={saleReadyCount:0,candidates:[fullyCleared]};
 const dashboard=buildDashboard({manifest,supplier,promotion:promotionEvidence,firstSale:{verifiedFirstSale:false},opportunities:{sourcingQueue:[]},storefront:{result:{activeStorefront:{status:200}}},tiktok:{readyForPublicRetailPublishing:false}});
 assert.equal(dashboard.promotionEligibleCount,0);
 assert.deepEqual(dashboard.productsApprovedForPromotion,[]);
 assert.ok(dashboard.productsAwaitingCommercialGateClosure.includes('verified-physical-item'));
});

test('Paperclip rejects unmatched, ambiguous or unverified retail SKU approvals',()=>{
 const supplier={saleReadyCount:1,candidates:[fullyCleared]};
 const valid=promotionEvidence;
 assert.equal(readyCountForFixture(supplier,valid),1);
 assert.equal(readyCountForFixture(supplier,{promotionEligibleCount:1}),0);
 assert.equal(readyCountForFixture(supplier,{...valid,promotionEligible:[{...fullyEligible,slug:'other-product'}]}),0);
 assert.equal(readyCountForFixture(supplier,{...valid,promotionEligible:[{...fullyEligible,sku:'OTHER-VARIANT'}]}),0);
 assert.equal(readyCountForFixture(supplier,{...valid,promotionEligible:[{...fullyEligible,promotionEligible:false}]}),0);
 assert.equal(readyCountForFixture(supplier,{...valid,promotionEligible:[{...fullyEligible,directCheckoutEligible:false}]}),0);
 assert.equal(readyCountForFixture(supplier,{...valid,promotionEligible:[fullyEligible,fullyEligible]}),0);
 assert.equal(readyCountForFixture({saleReadyCount:2,candidates:[fullyCleared,{...fullyCleared,observedVariantSku:'SKU-002'}]},valid),0);
 const dashboard=buildDashboard({manifest,supplier,promotion:{...valid,promotionEligible:[{...fullyEligible,sku:'OTHER-VARIANT'}]},firstSale:{verifiedFirstSale:false},opportunities:{sourcingQueue:[]},storefront:{result:{activeStorefront:{status:200}}},tiktok:{readyForPublicRetailPublishing:false}});
 assert.equal(dashboard.promotionEligibleCount,0);
 assert.deepEqual(dashboard.productsApprovedForPromotion,[]);
 assert.ok(dashboard.productsAwaitingCommercialGateClosure.includes('verified-physical-item'));
});

test('versioned supplier and promotion evidence must be authenticated and fresh',()=>{
 const checkedAt=new Date().toISOString();
 const candidate={...fullyCleared,observedAt:checkedAt};
 const supplier={schemaVersion:3,checkedAt,authenticationVerified:true,saleReadyCount:1,candidates:[candidate]};
 const promotion={...promotionEvidence,schemaVersion:2,reviewFresh:true,generatedAt:checkedAt};
 assert.equal(verifiedPromotionReadyCount(supplier,promotion),1);
 assert.equal(verifiedPromotionReadyCount({...supplier,authenticationVerified:false},promotion),0);
 assert.equal(verifiedPromotionReadyCount({...supplier,checkedAt:'2026-01-01T00:00:00.000Z'},promotion),0);
 assert.equal(verifiedPromotionReadyCount({...supplier,checkedAt:'not-a-date'},promotion),0);
 assert.equal(verifiedPromotionReadyCount({...supplier,candidates:[{...candidate,observedAt:'2026-01-01T00:00:00.000Z'}]},promotion),0);
 assert.equal(verifiedPromotionReadyCount(supplier,{...promotion,reviewFresh:false}),0);
 assert.equal(verifiedPromotionReadyCount(supplier,{...promotion,generatedAt:'2026-01-01T00:00:00.000Z'}),0);
 assert.equal(verifiedPromotionReadyCount(supplier,{...promotion,generatedAt:'not-a-date'}),0);
 assert.equal(verifiedPromotionReadyCount(supplier,{...promotion,generatedAt:new Date(Date.now()+60_000).toISOString()}),0);
});


test('unversioned and legacy report formats fail closed even with every SKU gate true',()=>{
 const checkedAt = new Date().toISOString();
 const supplier = {schemaVersion:3,checkedAt,authenticationVerified:true,saleReadyCount:1,
  candidates:[{...fullyCleared,observedAt:checkedAt}]};
 const promotion = {...promotionEvidence,schemaVersion:2,generatedAt:checkedAt,reviewFresh:true};
 assert.equal(verifiedPromotionReadyCount(supplier,promotion),1);
 for(const schemaVersion of [undefined,1,2,'3',null]){
  assert.equal(verifiedPromotionReadyCount({...supplier,schemaVersion},promotion),0,
   `supplier schema ${String(schemaVersion)}`);
 }
 for(const schemaVersion of [undefined,1,'2',null]){
  assert.equal(verifiedPromotionReadyCount(supplier,{...promotion,schemaVersion}),0,
   `promotion schema ${String(schemaVersion)}`);
 }
 assert.equal(verifiedPromotionReadyCount({...supplier,candidates:[{...fullyCleared}]},promotion),0);
});
