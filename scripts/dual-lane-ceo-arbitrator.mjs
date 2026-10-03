import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
function unique(items){return [...new Set(items.filter(Boolean))];}
function task(id,companyId,priority,title,evidenceRequired,doneWhen,context={}){return{id,companyId,priority,status:'active',title,evidenceRequired,doneWhen,context,prohibitedShortcuts:['fabricated evidence or metrics','automatic supplier ordering','automatic live price changes','bypassing final-ZIP, payment, identity or security controls']};}

export function buildDualLaneBoard({dashboard={},tournament={},rescue={},growth={},supplierBoard={}}={}){
  const checkoutProduct=dashboard.firstSaleWarRoom?.closestProduct||dashboard.closestProduct||growth.primaryProduct||null;
  const ranked=(tournament.productTournament||[]).map(row=>row.slug).filter(Boolean);
  const commercialProduct=ranked.find(slug=>slug!==checkoutProduct)||ranked[0]||growth.productRace?.find(row=>row.slug!==checkoutProduct)?.slug||null;
  const divergence=Boolean(checkoutProduct&&commercialProduct&&checkoutProduct!==commercialProduct);
  const checkoutSupplier=(supplierBoard.products||[]).find(p=>p.slug===checkoutProduct)||{};
  const commercialSupplier=(supplierBoard.products||[]).find(p=>p.slug===commercialProduct)||{};
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    mode:'dual_lane_first_sale',
    divergence,
    checkoutLane:{
      product:checkoutProduct,
      objective:'Preserve and close the shortest legitimate path to a real paid checkout without weakening commercial gates.',
      owner:'commerce-control',
      supportingCompanies:['supplier-fulfillment','storefront-conversion','offer-engineering','revenue-analytics'],
      rescueAction:rescue.recommendedAction?.id||null,
      parallelRescues:(rescue.parallelActions||[]).map(x=>x.id),
      remainingGates:dashboard.firstSaleWarRoom?.remainingGates||dashboard.remainingGates||[],
      operationalRoutes:Number(checkoutSupplier.operationallyVerifiedRouteCount??checkoutSupplier.routes?.length??0),
      promotableRoutes:Number(checkoutSupplier.promotableRouteCount??checkoutSupplier.verifiedRouteCount??0),
      rule:'A checkout-near product stays alive while its evidence remains valid, even if another product wins the commercial tournament.'
    },
    commercialLane:{
      product:commercialProduct,
      objective:'Advance the strongest distinct commercial contender through supplier, economics and checkout gates in parallel.',
      owner:'product-intelligence',
      supportingCompanies:['supplier-fulfillment','offer-engineering','storefront-conversion','experiment-lab'],
      tournamentRank:commercialProduct?ranked.indexOf(commercialProduct)+1:null,
      operationalRoutes:Number(commercialSupplier.operationallyVerifiedRouteCount??commercialSupplier.routes?.length??0),
      promotableRoutes:Number(commercialSupplier.promotableRouteCount??commercialSupplier.verifiedRouteCount??0),
      rule:'Tournament strength does not authorize promotion; supplier identity, stock, freight, economics and checkout evidence still control commercialization.'
    },
    portfolioRule:'Do not force one product to serve both speed-to-checkout and best-commercial-opportunity roles. Maintain both lanes until one produces a verified sale or evidence invalidates it.'
  };
}

export function injectDualLaneTasks(taskboard={},board={}){
  const tasks=[...(taskboard.tasks||[])];
  if(board.checkoutLane?.product){
    tasks.push(task(`commerce-control:dual-lane:checkout:${board.checkoutLane.product}`,'commerce-control',1,`Protect checkout lane for ${board.checkoutLane.product}`,['current gate evidence','rescue-board decision','supplier and checkout evidence'],'The checkout lane either reaches a valid session-scoped checkout for a real buyer or is rejected with authoritative evidence while a replacement checkout lane is named.',{lane:'checkout',...board.checkoutLane}));
    tasks.push(task(`storefront-conversion:dual-lane:checkout:${board.checkoutLane.product}`,'storefront-conversion',1,`Close buyer-path gates for ${board.checkoutLane.product}`,['working quote path','checkout instrumentation','current gate status'],'All non-supplier buyer-path blockers are repaired or explicitly evidenced; no gate is bypassed.',{lane:'checkout',product:board.checkoutLane.product,remainingGates:board.checkoutLane.remainingGates}));
  }
  if(board.commercialLane?.product){
    tasks.push(task(`product-intelligence:dual-lane:commercial:${board.commercialLane.product}`,'product-intelligence',1,`Advance commercial lane ${board.commercialLane.product}`,['current tournament evidence','supplier identity','stock/freight evidence','economics evidence'],'The commercial contender advances at least one material gate or is replaced by the next evidence-backed tournament contender.',{lane:'commercial',...board.commercialLane}));
    tasks.push(task(`supplier-fulfillment:dual-lane:commercial:${board.commercialLane.product}`,'supplier-fulfillment',1,`Build resilient supplier path for ${board.commercialLane.product}`,['supplier identity','variant','stock','freight','commercial economics'],'At least one economics-qualified supplier path is established, or supplier unavailability is evidenced and the contender is rerouted/replaced.',{lane:'commercial',product:board.commercialLane.product}));
  }
  const seen=new Set();
  const deduped=tasks.filter(row=>row?.id&&!seen.has(row.id)&&(seen.add(row.id),true));
  const companies={...(taskboard.companies||{})};
  for(const row of deduped)if(!Array.isArray(companies[row.companyId]))companies[row.companyId]=[];
  for(const id of Object.keys(companies))companies[id]=deduped.filter(row=>row.companyId===id);
  return {...taskboard,schemaVersion:Math.max(5,Number(taskboard.schemaVersion||1)),generatedAt:new Date().toISOString(),totalTasks:deduped.length,tasks:deduped,companies,dualLane:{checkoutProduct:board.checkoutLane?.product||null,commercialProduct:board.commercialLane?.product||null,divergence:board.divergence}};
}

export async function main(){
  const board=buildDualLaneBoard({dashboard:await readJson('growth-reports/prismbay-commerce-group-dashboard.json'),tournament:await readJson('growth-reports/ceo-commercial-tournament.json'),rescue:await readJson('growth-reports/first-sale-rescue-board.json'),growth:await readJson('growth-reports/ceo-autonomous-growth-board.json'),supplierBoard:await readJson('growth-reports/supplier-route-promotion-board.json')});
  const output=injectDualLaneTasks(await readJson('growth-reports/autonomous-company-taskboard.json'),board);
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/dual-lane-first-sale-board.json',JSON.stringify(board,null,2)+'\n');
  await fs.writeFile('growth-reports/autonomous-company-taskboard.json',JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({checkoutLane:board.checkoutLane.product,commercialLane:board.commercialLane.product,divergence:board.divergence,totalTasks:output.totalTasks},null,2));
  return {board,taskboard:output};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
