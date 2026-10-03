import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirstSaleRescueBoard } from './first-sale-rescue-engine.mjs';

const growth={primaryProduct:'crevice',productRace:[{slug:'crevice',readinessPct:71,researchScore:97},{slug:'pethair',readinessPct:43,researchScore:95}]};
const supplierBoard={products:[{slug:'crevice',supplierConcentrationRisk:'critical',verifiedRouteCount:1,supplierRouteDeficit:2}]};
const inventoryBoard={products:[{slug:'crevice',fragilePrimary:true,inventoryRisk:'critical'}]};

test('price-floor rescue can outrank weak supplier search while keeping backup routes parallel',()=>{
  const offerBoard={products:[{slug:'crevice',currentRetailUsd:12.95,hypotheses:[{hypothesis:'single_threshold_floor',proposedTotalRetailUsd:14.95,economics:{passes:true,contributionUsd:3.1}}]}]};
  const challenger={results:[{slug:'crevice',routePromotionCandidates:[],recommendedRemapCandidate:null}]};
  const board=buildFirstSaleRescueBoard({growth,supplierBoard,challenger,offerBoard,inventoryBoard});
  assert.equal(board.primaryProduct,'crevice');
  assert.equal(board.recommendedAction.id,'price_rescue');
  assert.equal(board.recommendedAction.owner,'offer-engineering');
  assert.equal(board.recommendedAction.automaticActivation,false);
  assert.ok(board.parallelActions.some(x=>x.id==='supplier_rescue'||x.id==='product_switch_rescue'));
});

test('verified lower-landed supplier becomes lowest-friction rescue but never auto-remaps',()=>{
  const offerBoard={products:[{slug:'crevice',currentRetailUsd:12.95,hypotheses:[]}]};
  const challenger={results:[{slug:'crevice',recommendedRemapCandidate:{productId:'P2',variantId:'V2',screenedLandedUsd:6.5},routePromotionCandidates:[{productId:'P2'}]}]};
  const board=buildFirstSaleRescueBoard({growth,supplierBoard,challenger,offerBoard,inventoryBoard});
  assert.equal(board.recommendedAction.id,'supplier_rescue');
  assert.equal(board.recommendedAction.context.recommendedRemapCandidate.productId,'P2');
  assert.equal(board.recommendedAction.automaticActivation,false);
});

test('backup product remains a rescue path when price and supplier alternatives are unavailable',()=>{
  const board=buildFirstSaleRescueBoard({growth,supplierBoard:{products:[{slug:'crevice',supplierConcentrationRisk:'low',verifiedRouteCount:3,supplierRouteDeficit:0}]},challenger:{results:[]},offerBoard:{products:[]},inventoryBoard});
  assert.equal(board.recommendedAction.id,'product_switch_rescue');
  assert.equal(board.recommendedAction.context.backup.slug,'pethair');
});

test('no primary fails closed without invented action',()=>{
  const board=buildFirstSaleRescueBoard({growth:{productRace:[]}});
  assert.equal(board.primaryProduct,null);
  assert.equal(board.recommendedAction,null);
});
