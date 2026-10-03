import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChallengerEvidence } from './commercial-resilience-orchestrator.mjs';

const policy={supplierPortfolio:{targetVerifiedRoutesPerSku:3}};
const base={
 products:[{
  slug:'crevice',storeSku:'crevice',routes:[{productId:'P1',variantId:'V1',originCountryCode:'CN',inventory:1,productCostUsd:1.89,screeningFreightUsd:6.31,screenedSingleUnitLandedUsd:8.2,variantInventoryVerified:true,screeningFreightVerified:true}],verifiedRouteCount:1,independentSupplierCount:1,independentOriginCount:1,supplierConcentrationScore:80,supplierConcentrationRisk:'critical',supplierRouteDeficit:2,promotionProposal:{status:'proposal_only'}
 }]
};

test('merges independently verified challenger routes and lowers concentration risk',()=>{
 const challenger={checkedAt:'2026-10-03T00:00:00Z',results:[{slug:'crevice',verifiedRoutes:[
  {productId:'P1',variantId:'V1',originCountryCode:'CN',inventory:1,productCostUsd:1.89,screeningFreightUsd:6.31,screenedLandedUsd:8.2,stockVerified:true,freightVerified:true},
  {productId:'P2',variantId:'V2',originCountryCode:'US',inventory:30,productCostUsd:2.1,screeningFreightUsd:3.2,screenedLandedUsd:5.3,stockVerified:true,freightVerified:true},
  {productId:'P3',variantId:'V3',originCountryCode:'US',inventory:40,productCostUsd:2.2,screeningFreightUsd:3.0,screenedLandedUsd:5.2,stockVerified:true,freightVerified:true}
 ]}]};
 const merged=mergeChallengerEvidence(base,challenger,policy);
 const p=merged.products[0];
 assert.equal(p.verifiedRouteCount,3);
 assert.equal(p.supplierRouteDeficit,0);
 assert.equal(p.supplierConcentrationRisk,'low');
 assert.equal(p.promotionProposal.backupRoutes.length,2);
 assert.equal(p.promotionProposal.automaticActivation,false);
});

test('does not count challenger routes without stock and freight evidence',()=>{
 const challenger={results:[{slug:'crevice',verifiedRoutes:[{productId:'P2',variantId:'V2',productCostUsd:2,screenedLandedUsd:5,stockVerified:true,freightVerified:false}]}]};
 const p=mergeChallengerEvidence(base,challenger,policy).products[0];
 assert.equal(p.verifiedRouteCount,1);
 assert.equal(p.supplierRouteDeficit,2);
 assert.equal(p.supplierConcentrationRisk,'critical');
});
