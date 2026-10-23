import test from 'node:test';
import assert from 'node:assert/strict';
import {commercialReadinessScore,prioritizeCandidates,supplierEconomicsBySlug} from './prioritize-commercial-candidates.mjs';

test('checkout-ready infrastructure breaks otherwise similar supplier-readiness ties when economics are unknown',()=>{
 const steamer={slug:'garment-steamer',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:false,checkoutAllowed:false,automaticPromotionAllowed:true,liveStoreProduct:true};
 const crevice={...steamer,slug:'crevice',checkoutInfrastructureVerified:true};
 const out=prioritizeCandidates({candidates:[steamer,crevice]});
 assert.equal(out.candidates[0].slug,'crevice');
 assert.ok(commercialReadinessScore(crevice)>commercialReadinessScore(steamer));
});

test('positive screened economics outrank a similar candidate that loses money',()=>{
 const base={independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true,liveStoreProduct:true};
 const crevice={...base,slug:'crevice'};
 const steamer={...base,slug:'garment-steamer'};
 const economics={
  crevice:{screeningEconomicsPass:false,screeningFreightHeadroomUsd:-1.08,verifiedRouteCount:0},
  'garment-steamer':{screeningEconomicsPass:true,screeningFreightHeadroomUsd:5.32,verifiedRouteCount:1},
 };
 const out=prioritizeCandidates({candidates:[crevice,steamer]},economics);
 assert.equal(out.candidates[0].slug,'garment-steamer');
 assert.ok(commercialReadinessScore(steamer,economics['garment-steamer'])>commercialReadinessScore(crevice,economics.crevice));
});

test('supplier challenger evidence is normalized by slug',()=>{
 const out=supplierEconomicsBySlug({results:[
  {slug:'crevice',mapped:{screeningEconomicsPass:false,screeningFreightHeadroomUsd:-1.08},verifiedRouteCount:0},
  {slug:'garment-steamer',mapped:{screeningEconomicsPass:true,screeningFreightHeadroomUsd:5.32},verifiedRouteCount:1},
 ]});
 assert.deepEqual(out.crevice,{screeningEconomicsPass:false,screeningFreightHeadroomUsd:-1.08,verifiedRouteCount:0});
 assert.deepEqual(out['garment-steamer'],{screeningEconomicsPass:true,screeningFreightHeadroomUsd:5.32,verifiedRouteCount:1});
});

test('a fully sale-ready candidate outranks a merely prepared candidate with equal economics',()=>{
 const prepared={slug:'prepared',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutInfrastructureVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true,liveStoreProduct:true};
 const ready={...prepared,slug:'ready',finalZipFreightVerified:true,checkoutAllowed:true};
 const economics={prepared:{screeningEconomicsPass:true,verifiedRouteCount:1},ready:{screeningEconomicsPass:true,verifiedRouteCount:1}};
 assert.equal(prioritizeCandidates({candidates:[prepared,ready]},economics).candidates[0].slug,'ready');
});
