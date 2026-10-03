import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function thresholdHypothesis(product={}){
  return (product.hypotheses||[]).find(h=>h.hypothesis==='single_threshold_floor'&&h.economics?.passes===true)||null;
}
function challengerFor(challenger={},slug){return (challenger.results||[]).find(r=>r.slug===slug)||null;}
function supplierFor(board={},slug){return (board.products||[]).find(r=>r.slug===slug)||null;}
function inventoryFor(board={},slug){return (board.products||[]).find(r=>r.slug===slug)||null;}
function offerFor(board={},slug){return (board.products||[]).find(r=>r.slug===slug)||null;}
function raceFor(growth={},slug){return (growth.productRace||[]).find(r=>r.slug===slug)||null;}

function backupCandidates(growth={},primary){
  return (growth.productRace||[]).filter(r=>r.slug&&r.slug!==primary).map(r=>({slug:r.slug,readinessPct:Number(r.readinessPct||0),researchScore:Number(r.researchScore||0),lane:r.lane||null})).sort((a,b)=>b.readinessPct-a.readinessPct||b.researchScore-a.researchScore);
}

export function buildFirstSaleRescueBoard({growth={},supplierBoard={},challenger={},offerBoard={},inventoryBoard={}}={}){
  const primary=growth.primaryProduct||growth.productRace?.[0]?.slug||null;
  if(!primary)return{schemaVersion:1,generatedAt:new Date().toISOString(),primaryProduct:null,recommendedAction:null,actions:[],parallelActions:[],rule:'No primary product exists; rebuild the product race.'};
  const supplier=supplierFor(supplierBoard,primary)||{};
  const challenge=challengerFor(challenger,primary)||{};
  const offer=offerFor(offerBoard,primary)||{};
  const inventory=inventoryFor(inventoryBoard,primary)||{};
  const race=raceFor(growth,primary)||{};
  const actions=[];

  const remap=challenge.recommendedRemapCandidate||null;
  const routeCandidates=challenge.routePromotionCandidates||[];
  if(remap||routeCandidates.length||Number(supplier.supplierRouteDeficit||0)>0){
    const evidenceStrength=remap?'verified_lower_landed_route':routeCandidates.length?'verified_alternative_route':'route_deficit_only';
    const friction=remap?18:routeCandidates.length?28:62;
    actions.push({id:'supplier_rescue',owner:'supplier-fulfillment',frictionScore:friction,evidenceStrength,action:remap?'validate_and_promote_lower_landed_supplier_route':routeCandidates.length?'validate_and_promote_backup_supplier_route':'continue_replacement_supplier_search',available:true,automaticActivation:false,context:{routeDeficit:Number(supplier.supplierRouteDeficit||0),supplierRisk:supplier.supplierConcentrationRisk||'unknown',recommendedRemapCandidate:remap,routePromotionCandidateCount:routeCandidates.length}});
  }

  const floor=thresholdHypothesis(offer);
  const currentRetail=positive(offer.currentRetailUsd);
  if(floor&&currentRetail){
    const proposed=positive(floor.proposedTotalRetailUsd);
    const liftPct=proposed?((proposed/currentRetail)-1)*100:null;
    const fragilityPenalty=inventory.fragilePrimary===true?10:0;
    const concentrationPenalty=['critical','high'].includes(supplier.supplierConcentrationRisk)?10:0;
    const friction=clamp((liftPct??40)*1.5+fragilityPenalty+concentrationPenalty,10,90);
    actions.push({id:'price_rescue',owner:'offer-engineering',frictionScore:+friction.toFixed(1),evidenceStrength:'verified_cost_floor_hypothesis',action:'prepare_measured_threshold_price_test',available:true,automaticActivation:false,context:{currentRetailUsd:currentRetail,proposedRetailUsd:proposed,priceLiftPct:liftPct==null?null:+liftPct.toFixed(1),economics:floor.economics,inventoryRisk:inventory.inventoryRisk||'unknown',supplierRisk:supplier.supplierConcentrationRisk||'unknown'}});
  }

  const backups=backupCandidates(growth,primary);
  const bestBackup=backups[0]||null;
  if(bestBackup){
    const friction=clamp(65-bestBackup.readinessPct*0.35-bestBackup.researchScore*0.08,20,80);
    actions.push({id:'product_switch_rescue',owner:'commerce-control',frictionScore:+friction.toFixed(1),evidenceStrength:'portfolio_backup_candidate',action:'accelerate_best_backup_product_without_abandoning_valid_primary_evidence',available:true,automaticActivation:false,context:{backup:bestBackup,primaryReadinessPct:Number(race.readinessPct||0)}});
  }

  actions.sort((a,b)=>a.frictionScore-b.frictionScore||a.id.localeCompare(b.id));
  const recommended=actions[0]||null;
  const parallel=actions.slice(1,3);
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    mode:'first_sale_rescue_decision',
    primaryProduct:primary,
    recommendedAction:recommended,
    parallelActions:parallel,
    actions,
    diagnosis:{supplierRisk:supplier.supplierConcentrationRisk||'unknown',verifiedRouteCount:Number(supplier.verifiedRouteCount||0),routeDeficit:Number(supplier.supplierRouteDeficit||0),inventoryRisk:inventory.inventoryRisk||'unknown',fragileInventory:inventory.fragilePrimary===true,currentRetailUsd:currentRetail,thresholdPriceAvailable:Boolean(floor),backupCount:backups.length},
    rule:'Choose the lowest-friction evidence-backed rescue path while keeping other viable paths active. Never auto-change live price, auto-remap suppliers, auto-order inventory, fabricate demand, or bypass final-ZIP/payment gates.'
  };
}

export async function main(){
  const board=buildFirstSaleRescueBoard({
    growth:await readJson('growth-reports/ceo-autonomous-growth-board.json'),
    supplierBoard:await readJson('growth-reports/supplier-route-promotion-board.json'),
    challenger:await readJson('growth-reports/supplier-challenger-board.json'),
    offerBoard:await readJson('growth-reports/offer-price-tournament.json'),
    inventoryBoard:await readJson('growth-reports/inventory-depth-board.json')
  });
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/first-sale-rescue-board.json',JSON.stringify(board,null,2)+'\n');
  console.log(JSON.stringify({primaryProduct:board.primaryProduct,recommendedAction:board.recommendedAction?.id||null,recommendedOwner:board.recommendedAction?.owner||null,parallelActions:board.parallelActions.map(x=>x.id)},null,2));
  return board;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
