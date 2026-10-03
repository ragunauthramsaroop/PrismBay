import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChallengerEvidence, mergeLiveRetailEvidence, qualifySupplierRoutesByEconomics } from './commercial-resilience-orchestrator.mjs';

const policy={supplierPortfolio:{targetVerifiedRoutesPerSku:3},economics:{defaultFeeRatePct:3.2,defaultReturnReservePct:5,minimumContributionUsd:3,minimumContributionPct:25,maximumLandedPctOfRetail:55}};
const base={products:[{slug:'crevice',storeSku:'crevice',routes:[{productId:'P1',variantId:'V1',originCountryCode:'CN',inventory:1,productCostUsd:1.89,screeningFreightUsd:6.31,screenedSingleUnitLandedUsd:8.2,variantInventoryVerified:true,screeningFreightVerified:true}],verifiedRouteCount:1,independentSupplierCount:1,independentOriginCount:1,supplierConcentrationScore:80,supplierConcentrationRisk:'critical',supplierRouteDeficit:2,promotionProposal:{status:'proposal_only'}}]};

test('merges independently verified challenger routes as operational evidence',()=>{
 const challenger={checkedAt:'2026-10-03T00:00:00Z',results:[{slug:'crevice',verifiedRoutes:[
  {productId:'P1',variantId:'V1',originCountryCode:'CN',inventory:1,productCostUsd:1.89,screeningFreightUsd:6.31,screenedLandedUsd:8.2,stockVerified:true,freightVerified:true},
  {productId:'P2',variantId:'V2',originCountryCode:'US',inventory:30,productCostUsd:2.1,screeningFreightUsd:3.2,screenedLandedUsd:5.3,stockVerified:true,freightVerified:true},
  {productId:'P3',variantId:'V3',originCountryCode:'US',inventory:40,productCostUsd:2.2,screeningFreightUsd:3.0,screenedLandedUsd:5.2,stockVerified:true,freightVerified:true}
 ]}]};
 const p=mergeChallengerEvidence(base,challenger,policy).products[0];
 assert.equal(p.operationallyVerifiedRouteCount,3);
 assert.equal(p.verifiedRouteCount,3);
 assert.equal(p.supplierRouteDeficit,0);
});

test('does not count challenger routes without stock and freight evidence',()=>{
 const challenger={results:[{slug:'crevice',verifiedRoutes:[{productId:'P2',variantId:'V2',productCostUsd:2,screenedLandedUsd:5,stockVerified:true,freightVerified:false}]}]};
 const p=mergeChallengerEvidence(base,challenger,policy).products[0];
 assert.equal(p.verifiedRouteCount,1);
 assert.equal(p.supplierRouteDeficit,2);
});

test('economics qualification separates operational from promotable routes',()=>{
 const operational=mergeChallengerEvidence(base,{results:[]},policy);
 const qualified=qualifySupplierRoutesByEconomics(operational,{crevice:{retailUsd:12.95}},policy);
 const p=qualified.products[0];
 assert.equal(p.operationallyVerifiedRouteCount,1);
 assert.equal(p.economicsFailingRouteCount,1);
 assert.equal(p.promotableRouteCount,0);
 assert.equal(p.verifiedRouteCount,0);
 assert.equal(p.promotionProposal,null);
 assert.equal(p.supplierConcentrationRisk,'critical');
 assert.equal(p.supplierRouteDeficit,3);
 assert.equal(qualified.routeQualification.economicsFailingRoutes,1);
});

test('economics-passing routes count as commercial resilience capacity',()=>{
 const operational={products:[{slug:'x',storeSku:'x',routes:[
  {productId:'P1',variantId:'V1',originCountryCode:'US',inventory:10,screenedSingleUnitLandedUsd:5},
  {productId:'P2',variantId:'V2',originCountryCode:'CN',inventory:10,screenedSingleUnitLandedUsd:5.5},
  {productId:'P3',variantId:'V3',originCountryCode:'US',inventory:10,screenedSingleUnitLandedUsd:6}
 ]}]};
 const p=qualifySupplierRoutesByEconomics(operational,{x:{retailUsd:19.95}},policy).products[0];
 assert.equal(p.promotableRouteCount,3);
 assert.equal(p.verifiedRouteCount,3);
 assert.equal(p.supplierRouteDeficit,0);
 assert.equal(p.promotionProposal.backupRoutes.length,2);
 assert.equal(p.supplierConcentrationRisk,'low');
});

test('unknown retail preserves operational evidence but cannot promote route',()=>{
 const p=qualifySupplierRoutesByEconomics(base,{},policy).products[0];
 assert.equal(p.operationallyVerifiedRouteCount,1);
 assert.equal(p.economicsUnknownRouteCount,1);
 assert.equal(p.promotableRouteCount,0);
 assert.equal(p.promotionProposal,null);
});

test('bridges live storefront retail price when economics evidence does not already provide one',()=>{
 const merged=mergeLiveRetailEvidence({}, {candidates:[{slug:'crevice',retailPriceUsd:12.95}]});
 assert.equal(merged.crevice.retailUsd,12.95);
 assert.equal(merged.crevice.retailEvidenceSource,'live_storefront_catalog');
});

test('does not overwrite an existing evidence-backed retail price',()=>{
 const merged=mergeLiveRetailEvidence({crevice:{retailUsd:15.25,retailEvidenceSource:'verified_market_evidence'}},{candidates:[{slug:'crevice',retailPriceUsd:12.95}]});
 assert.equal(merged.crevice.retailUsd,15.25);
 assert.equal(merged.crevice.retailEvidenceSource,'verified_market_evidence');
});
