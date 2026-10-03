import test from 'node:test';
import assert from 'node:assert/strict';
import { compareMappedToChallengers } from './supplier-challenger-worker.mjs';

test('recommends a materially better challenger without authorizing remap',()=>{
 const result=compareMappedToChallengers({
  candidate:{slug:'crevice'}, retailPriceUsd:12.95,
  mapped:{productId:'mapped',variantId:'vm',productCostUsd:1.89,screeningFreightUsd:6.31,screenedLandedUsd:8.2,stockVerified:true,freightVerified:true},
  challengers:[{productId:'alt',variantId:'v1',productCostUsd:1.7,screeningFreightUsd:3.1,screenedLandedUsd:4.8,stockVerified:true,freightVerified:true,inventory:50}]
 });
 assert.equal(result.mapped.screeningEconomicsPass,false);
 assert.equal(result.recommendedRemapCandidate.productId,'alt');
 assert.equal(result.automaticRemapAllowed,false);
 assert.equal(result.exactBuyerZipStillRequired,true);
 assert.ok(result.screenedLandedImprovementUsd>=3);
 assert.equal(result.verifiedRouteCount,1);
 assert.equal(result.routeDeficit,2);
 assert.equal(result.supplierConcentrationRisk,'critical');
});

test('does not recommend a challenger that still fails the freight ceiling',()=>{
 const result=compareMappedToChallengers({candidate:{slug:'x'},retailPriceUsd:10,mapped:{productId:'mapped',variantId:'vm',productCostUsd:2,screeningFreightUsd:7,screenedLandedUsd:9,stockVerified:true,freightVerified:true},challengers:[{productId:'alt',variantId:'v1',productCostUsd:2,screeningFreightUsd:6.5,screenedLandedUsd:8.5,stockVerified:true,freightVerified:true}]});
 assert.equal(result.recommendedRemapCandidate,null);
 assert.equal(result.routePromotionCandidates.length,0);
});

test('requires at least fifty cents screened landed improvement before remap proposal',()=>{
 const result=compareMappedToChallengers({candidate:{slug:'x'},retailPriceUsd:20,mapped:{productId:'mapped',variantId:'vm',productCostUsd:2,screeningFreightUsd:3,screenedLandedUsd:5,stockVerified:true,freightVerified:true},challengers:[{productId:'alt',variantId:'v1',productCostUsd:2,screeningFreightUsd:2.7,screenedLandedUsd:4.7,stockVerified:true,freightVerified:true}]});
 assert.equal(result.recommendedRemapCandidate,null);
 assert.equal(result.routePromotionCandidates.length,1);
});

test('three independent economics-passing routes eliminate concentration deficit',()=>{
 const result=compareMappedToChallengers({
  candidate:{slug:'x'},retailPriceUsd:20,
  mapped:{productId:'mapped',variantId:'vm',originCountryCode:'US',productCostUsd:2,screeningFreightUsd:3,screenedLandedUsd:5,stockVerified:true,freightVerified:true},
  challengers:[
   {productId:'alt1',variantId:'v1',originCountryCode:'US',productCostUsd:2.1,screeningFreightUsd:3.1,screenedLandedUsd:5.2,stockVerified:true,freightVerified:true},
   {productId:'alt2',variantId:'v2',originCountryCode:'CN',productCostUsd:1.7,screeningFreightUsd:4,screenedLandedUsd:5.7,stockVerified:true,freightVerified:true}
  ]
 });
 assert.equal(result.verifiedRouteCount,3);
 assert.equal(result.routeDeficit,0);
 assert.equal(result.supplierConcentrationRisk,'low');
 assert.equal(result.replacementSourcingRequired,false);
});
