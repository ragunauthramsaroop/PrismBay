import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichOfferFloors } from './offer-floor-enrichment.mjs';

const policy={economics:{minimumContributionUsd:3,minimumContributionPct:25,maximumLandedPctOfRetail:55,defaultFeeRatePct:3.2,defaultReturnReservePct:5}};

test('adds a measured threshold-crossing price hypothesis when current retail is below the commercial floor',()=>{
 const offerBoard={products:[{slug:'crevice',currentRetailUsd:12.95,hypotheses:[{quantity:1,hypothesis:'single_plus_5pct',minimumCommercialRetailUsd:14.91,economics:{passes:false}}],viableHypotheses:[],recommendedTestSequence:[]}],hypothesisCount:1,safeguards:{automaticLivePriceChanges:false}};
 const supplierBoard={products:[{slug:'crevice',routes:[{screenedSingleUnitLandedUsd:8.2}]}]};
 const out=enrichOfferFloors({offerBoard,supplierBoard,policy});
 assert.equal(out.thresholdCrossingHypothesesAdded,1);
 const p=out.products[0];
 const h=p.hypotheses.find(x=>x.hypothesis==='single_threshold_floor');
 assert.equal(h.proposedTotalRetailUsd,14.95);
 assert.equal(h.economics.passes,true);
 assert.equal(h.livePriceChangeAllowed,false);
 assert.equal(p.recommendedTestSequence[0],'single_threshold_floor');
});

test('does not add a floor hypothesis when current retail already clears it',()=>{
 const offerBoard={products:[{slug:'x',currentRetailUsd:19.95,hypotheses:[{quantity:1,hypothesis:'single',minimumCommercialRetailUsd:14.91,economics:{passes:true}}],viableHypotheses:[{hypothesis:'single'}]}]};
 const supplierBoard={products:[{slug:'x',routes:[{screenedSingleUnitLandedUsd:8.2}]}]};
 const out=enrichOfferFloors({offerBoard,supplierBoard,policy});
 assert.equal(out.thresholdCrossingHypothesesAdded,0);
});
