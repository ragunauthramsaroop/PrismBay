import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTournament, validateTournamentPolicy } from './ceo-commercial-tournament.mjs';

const policy = {
  schemaVersion:1,
  resourceBudget:{internalUnits:100,minimumExplorationReservePct:20,maximumSingleProductPct:35,minimumActiveProductPct:5,maximumSingleStrategyPct:20},
  productScoring:{readinessPctWeight:45,researchScoreWeight:25,evidenceCompletionWeight:20,primaryCheckoutInfrastructureBonus:10,criticalSupplierConcentrationPenalty:18,highSupplierConcentrationPenalty:10,fragileInventoryPenalty:12,zeroVerifiedCommercialRoutePenalty:15,multiRouteResilienceBonus:5},
  strategyScoring:{activeInternal:80,activeInternalPrepare:65,accountOrOwnerActivationCheck:55,postSaleMeasureAndScale:90,blockedPenalty:25,measurementPlanBonus:10},
  tournamentRules:{minimumProductsCompetingBeforeFirstSale:5,minimumStrategiesCompetingBeforeFirstSale:8,topProductsFastLaneCount:2,promotionRequiresPromotionReadyProduct:true,noProbabilityClaimsWithoutObservedSales:true,zeroPaidSpendUntilAuthorized:true,noAutomaticSupplierOrdering:true,noUnauthorizedPublishing:true,noFakeTrafficReviewsScarcityOrSales:true,fragilityChangesAttentionNotTruth:true},
  hypothesisRules:{everyHypothesisNeedsMetric:true,everyHypothesisNeedsStopRule:true,everyHypothesisNeedsEvidenceGate:true,maximumOpenHypotheses:30,staleHypothesisHours:24,unmeasurableHypothesisAction:'rewrite_or_kill'},
  reallocation:{criticalCompanyBoostUnits:5,redCompanyBoostUnits:3,yellowCompanyBoostUnits:1,greenCompanyBoostUnits:0,staleBlockerShiftUnits:10,routeKillRequiresEvidence:true}
};

const growthBoard = {
  verifiedSales:0,
  primaryProduct:'crevice',
  productRace:[
    {slug:'crevice',readinessPct:71,missing:['final_zip_freight','checkout'],researchScore:null},
    {slug:'garment-steamer',readinessPct:71,missing:['final_zip_freight','checkout'],researchScore:null},
    {slug:'toilet-scrubber-kit',readinessPct:0,missing:['supplier','stock','freight'],researchScore:95},
    {slug:'microfiber-car-detailing-cloths',readinessPct:0,missing:['supplier','stock','freight'],researchScore:92},
    {slug:'car-seat-headrest-hooks',readinessPct:0,missing:['supplier','stock','freight'],researchScore:92}
  ],
  factories:{}
};
const strategyBoard = {
  strategies:Array.from({length:12},(_,i)=>({id:`s${i}`,state:i<6?'active_internal':'active_internal_prepare',blockedBy:i>8?['sale_ready_product']:[]})),
  acquisitionPaths:[{id:'owned-search-seo'},{id:'google-free-listings'},{id:'pinterest-product-pins'}]
};
const scorecard = {companies:{a:{score:20,band:'critical'},b:{score:55,band:'red'},c:{score:92,band:'green'}}};

test('policy enforces safety and exploration reserve',()=>{
  assert.equal(validateTournamentPolicy(policy),true);
});

test('keeps at least five products in competition and caps product allocation',()=>{
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false}});
  assert.ok(board.productTournament.length>=5);
  assert.ok(board.productTournament.every(x=>x.allocationPct<=35));
  assert.equal(board.productTournament.filter(x=>x.lane==='fast-lane').length,2);
});

test('retains at least eight strategies before first sale',()=>{
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false}});
  assert.ok(board.strategyTournament.length>=8);
});

test('creates measurable hypotheses with stop rules and evidence gates',()=>{
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false}});
  assert.ok(board.hypothesisLedger.length>=4);
  assert.ok(board.hypothesisLedger.every(x=>x.metric&&x.stopRule&&x.evidenceGate));
});

test('does not describe allocation as sales probability',()=>{
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false}});
  assert.match(board.rule,/never a forecast|not a forecast/i);
  assert.equal(board.verifiedSales,0);
});

test('directs recovery support toward weakest company',()=>{
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false}});
  assert.equal(board.weakestCompanies[0].id,'a');
  assert.match(board.ceoActions.join(' '),/a/);
});

test('fragile zero-route primary loses attention without being labeled unavailable',()=>{
  const supplierBoard={products:[
    {slug:'crevice',supplierConcentrationRisk:'critical',verifiedRouteCount:0},
    {slug:'garment-steamer',supplierConcentrationRisk:'low',verifiedRouteCount:3}
  ]};
  const inventoryBoard={products:[{slug:'crevice',fragilePrimary:true,inventoryRisk:'critical'},{slug:'garment-steamer',fragilePrimary:false,inventoryRisk:'normal'}]};
  const board=buildTournament({policy,growthBoard,strategyBoard,scorecard,firstSale:{verifiedFirstSale:false},supplierBoard,inventoryBoard});
  const crevice=board.productTournament.find(x=>x.slug==='crevice');
  const steamer=board.productTournament.find(x=>x.slug==='garment-steamer');
  assert.ok(crevice.resilienceAdjustment<0);
  assert.ok(crevice.tournamentScore<crevice.preResilienceScore);
  assert.ok(steamer.tournamentScore>crevice.tournamentScore);
  assert.match(crevice.allocationReason,/attention.*not.*availability|not factual product availability/i);
});
