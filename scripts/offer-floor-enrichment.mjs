import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null;};
const roundUpFiveCents=value=>Math.ceil(Number(value)*20-1e-9)/20;

function economics({landed,retail,feePct,reservePct,minContributionUsd,minContributionPct,maxLandedPct}){
 const revenue=positive(retail),landedCost=positive(landed);if(!revenue||!landedCost)return{passes:false,reason:'incomplete_inputs'};
 const fees=revenue*feePct/100,reserve=revenue*reservePct/100,contribution=revenue-landedCost-fees-reserve,contributionPct=contribution/revenue*100,landedPct=landedCost/revenue*100;
 const passes=contribution>=minContributionUsd&&contributionPct>=minContributionPct&&landedPct<=maxLandedPct;
 return{passes,revenueUsd:+revenue.toFixed(2),landedUsd:+landedCost.toFixed(2),contributionUsd:+contribution.toFixed(2),contributionPct:+contributionPct.toFixed(2),landedPctOfRetail:+landedPct.toFixed(2)};
}

export function enrichOfferFloors({offerBoard={},supplierBoard={},policy={}}={}){
 const e=policy.economics||{},feePct=Number(e.defaultFeeRatePct||3.2),reservePct=Number(e.defaultReturnReservePct||5),minContributionUsd=Number(e.minimumContributionUsd||3),minContributionPct=Number(e.minimumContributionPct||25),maxLandedPct=Number(e.maximumLandedPctOfRetail||55);
 const suppliers=new Map((supplierBoard.products||[]).map(p=>[p.slug,p]));
 let added=0;
 const products=(offerBoard.products||[]).map(product=>{
   const supplier=suppliers.get(product.slug),route=supplier?.routes?.[0];
   const landed=positive(route?.screenedSingleUnitLandedUsd);
   const singleFloors=(product.hypotheses||[]).filter(h=>Number(h.quantity)===1).map(h=>positive(h.minimumCommercialRetailUsd)).filter(Boolean);
   const floor=singleFloors.length?Math.max(...singleFloors):null;
   const current=positive(product.currentRetailUsd);
   if(!landed||!floor||!current||current>=floor)return product;
   const proposed=+roundUpFiveCents(floor).toFixed(2);
   const model=economics({landed,retail:proposed,feePct,reservePct,minContributionUsd,minContributionPct,maxLandedPct});
   if(!model.passes)return product;
   const hypothesis={quantity:1,hypothesis:'single_threshold_floor',proposedTotalRetailUsd:proposed,minimumCommercialRetailUsd:+floor.toFixed(2),economics:model,livePriceChangeAllowed:false,reason:'current retail is below at least one commercial threshold; this is a measured test candidate, not an automatic price decision'};
   const existing=(product.hypotheses||[]).filter(h=>h.hypothesis!=='single_threshold_floor');
   const viable=[...(product.viableHypotheses||[]).filter(h=>h.hypothesis!=='single_threshold_floor'),hypothesis].sort((a,b)=>Number(b.economics?.contributionUsd||0)-Number(a.economics?.contributionUsd||0));
   added++;
   return{...product,hypotheses:[...existing,hypothesis],viableHypotheses:viable,recommendedTestSequence:[hypothesis.hypothesis,...(product.recommendedTestSequence||[]).filter(x=>x!==hypothesis.hypothesis)].slice(0,3),commercialFloorGapUsd:+(floor-current).toFixed(2),thresholdCrossingHypothesisAdded:true};
 });
 return{...offerBoard,schemaVersion:Math.max(2,Number(offerBoard.schemaVersion||1)),generatedAt:new Date().toISOString(),products,hypothesisCount:products.reduce((n,p)=>n+(p.hypotheses?.length||0),0),thresholdCrossingHypothesesAdded:added,safeguards:{...(offerBoard.safeguards||{}),automaticLivePriceChanges:false,elasticityRequiresMeasuredConversionEvidence:true}};
}

export async function main(){
 const offerBoard=await readJson('growth-reports/offer-price-tournament.json');
 const supplierBoard=await readJson('growth-reports/supplier-route-promotion-board.json');
 const policy=await readJson('config/commercial-resilience-policy.json');
 const output=enrichOfferFloors({offerBoard,supplierBoard,policy});
 await fs.writeFile('growth-reports/offer-price-tournament.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({thresholdCrossingHypothesesAdded:output.thresholdCrossingHypothesesAdded,hypothesisCount:output.hypothesisCount},null,2));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
