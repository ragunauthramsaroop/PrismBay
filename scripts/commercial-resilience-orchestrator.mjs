import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildSupplierPortfolioBoard, buildOfferTournament, buildCheckoutRecoveryBoard } from './commercial-resilience-engine.mjs';

const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null;};
const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
const key=r=>`${r?.productId||''}:${r?.variantId||''}:${r?.originCountryCode||''}`;
const riskBand=score=>score>=75?'critical':score>=55?'high':score>=35?'medium':'low';

function normalizeChallengerRoute(route={}){
  return {
    productId:route.productId||null,productSku:route.productSku||null,variantId:route.variantId||null,variantSku:route.variantSku||null,
    originCountryCode:route.originCountryCode||null,inventory:Number(route.inventory||0),productCostUsd:positive(route.productCostUsd),
    screeningFreightUsd:positive(route.screeningFreightUsd),screenedSingleUnitLandedUsd:positive(route.screenedLandedUsd??route.screenedSingleUnitLandedUsd),
    variantInventoryVerified:route.stockVerified===true||route.variantInventoryVerified===true,screeningFreightVerified:route.freightVerified===true||route.screeningFreightVerified===true,source:'supplier_challenger'
  };
}
function concentration(routes,target){
  const independentSuppliers=new Set(routes.map(r=>r.productId).filter(Boolean)).size;
  const independentOrigins=new Set(routes.map(r=>r.originCountryCode).filter(Boolean)).size;
  const count=routes.length;
  let score=count===0?100:count===1?80:count===2?50:25;
  if(independentSuppliers<=1&&count>1)score+=15;
  if(independentOrigins<=1&&count>1)score+=5;
  score=Math.max(0,Math.min(100,score));
  return {count,independentSuppliers,independentOrigins,score,risk:riskBand(score),deficit:Math.max(0,target-count)};
}
function routeEconomics(route,retail,policy={}){
  const landed=positive(route?.screenedSingleUnitLandedUsd),revenue=positive(retail);
  if(!landed||!revenue)return{status:'unknown',passes:null,reason:'retail_or_landed_cost_missing'};
  const e=policy.economics||{},feePct=Number(e.defaultFeeRatePct||3.2),reservePct=Number(e.defaultReturnReservePct||5),minUsd=Number(e.minimumContributionUsd||3),minPct=Number(e.minimumContributionPct||25),maxLandedPct=Number(e.maximumLandedPctOfRetail||55);
  const fees=revenue*feePct/100,reserve=revenue*reservePct/100,contribution=revenue-landed-fees-reserve,contributionPct=contribution/revenue*100,landedPct=landed/revenue*100;
  const passes=contribution>=minUsd&&contributionPct>=minPct&&landedPct<=maxLandedPct;
  return{status:passes?'passing':'failing',passes,reason:passes?'commercial_thresholds_pass':'commercial_thresholds_fail',retailUsd:+revenue.toFixed(2),landedUsd:+landed.toFixed(2),contributionUsd:+contribution.toFixed(2),contributionPct:+contributionPct.toFixed(2),landedPctOfRetail:+landedPct.toFixed(2)};
}

export function mergeChallengerEvidence(board={},challenger={},policy={}){
  const target=Number(policy?.supplierPortfolio?.targetVerifiedRoutesPerSku||3),bySlug=new Map((challenger.results||[]).map(row=>[row.slug,row]));
  const products=(board.products||[]).map(product=>{
    const evidence=bySlug.get(product.slug);if(!evidence)return product;
    const routes=[...(product.routes||[])],seen=new Set(routes.map(key)),candidates=[...(evidence.verifiedRoutes||[]),...(evidence.routePromotionCandidates||[])];
    for(const raw of candidates){const route=normalizeChallengerRoute(raw);if(!route.productId||!route.variantId||!route.variantInventoryVerified||!route.screeningFreightVerified||!route.productCostUsd||!route.screenedSingleUnitLandedUsd)continue;const k=key(route);if(seen.has(k))continue;seen.add(k);routes.push(route);}
    routes.sort((a,b)=>(a.screenedSingleUnitLandedUsd??Infinity)-(b.screenedSingleUnitLandedUsd??Infinity)||Number(b.inventory||0)-Number(a.inventory||0));
    const c=concentration(routes,target),proposal=c.count?{status:'proposal_only',customerFacingSku:product.storeSku,preferredRoute:routes[0],backupRoutes:routes.slice(1,target),automaticActivation:false,finalBuyerZipStillRequired:true,rule:'Operational route proposal only; economics qualification still runs before commercial promotion.'}:null;
    return {...product,routes,operationallyVerifiedRouteCount:c.count,verifiedRouteCount:c.count,independentSupplierCount:c.independentSuppliers,independentOriginCount:c.independentOrigins,supplierConcentrationScore:c.score,supplierConcentrationRisk:c.risk,supplierRouteDeficit:c.deficit,promotionProposal:proposal,challengerEvidenceMerged:true};
  });
  return {...board,products,routePromotionProposals:products.filter(p=>p.promotionProposal).map(p=>({slug:p.slug,...p.promotionProposal})),highRiskProducts:products.filter(p=>['critical','high'].includes(p.supplierConcentrationRisk)).map(p=>({slug:p.slug,risk:p.supplierConcentrationRisk,deficit:p.supplierRouteDeficit})),challengerBoardCheckedAt:challenger.checkedAt||null};
}

export function mergeLiveRetailEvidence(economicsEvidence={},liveCatalog={}){
  const merged=structuredClone(economicsEvidence&&typeof economicsEvidence==='object'?economicsEvidence:{});
  for(const row of Array.isArray(liveCatalog?.candidates)?liveCatalog.candidates:[]){const slug=String(row?.slug||'').trim(),retail=positive(row?.retailPriceUsd);if(!slug||!retail)continue;merged[slug]={...(merged[slug]||{}),retailUsd:positive(merged[slug]?.retailUsd)||retail,retailEvidenceSource:positive(merged[slug]?.retailUsd)?(merged[slug]?.retailEvidenceSource||'existing_economics_evidence'):'live_storefront_catalog'};}
  return merged;
}

export function qualifySupplierRoutesByEconomics(board={},economicsEvidence={},policy={}){
  const target=Number(policy?.supplierPortfolio?.targetVerifiedRoutesPerSku||3);
  const products=(board.products||[]).map(product=>{
    const retail=positive(economicsEvidence?.[product.slug]?.retailUsd);
    const operationalRoutes=(product.routes||[]).map(route=>({...route,economics:routeEconomics(route,retail,policy)}));
    const promotableRoutes=operationalRoutes.filter(route=>route.economics.passes===true);
    const explicitFailures=operationalRoutes.filter(route=>route.economics.passes===false);
    const unknownEconomics=operationalRoutes.filter(route=>route.economics.passes===null);
    const c=concentration(promotableRoutes,target);
    const proposal=promotableRoutes.length?{status:'proposal_only',customerFacingSku:product.storeSku,preferredRoute:promotableRoutes[0],backupRoutes:promotableRoutes.slice(1,target),automaticActivation:false,finalBuyerZipStillRequired:true,rule:'Only economics-passing operational routes are commercially promotable; checkout still revalidates live stock, exact ZIP freight and economics.'}:null;
    return {...product,routes:operationalRoutes,operationallyVerifiedRouteCount:operationalRoutes.length,economicsPassingRouteCount:promotableRoutes.length,promotableRouteCount:promotableRoutes.length,economicsFailingRouteCount:explicitFailures.length,economicsUnknownRouteCount:unknownEconomics.length,verifiedRouteCount:promotableRoutes.length,promotableRoutes,independentSupplierCount:c.independentSuppliers,independentOriginCount:c.independentOrigins,supplierConcentrationScore:c.score,supplierConcentrationRisk:c.risk,supplierRouteDeficit:c.deficit,promotionProposal:proposal,routeQualificationRule:'Operational verification and commercial promotion are separate. A route failing current economics remains evidence for rescue pricing/sourcing but does not count as resilient commercial capacity.'};
  });
  return {...board,schemaVersion:Math.max(2,Number(board.schemaVersion||1)),products,routePromotionProposals:products.filter(p=>p.promotionProposal).map(p=>({slug:p.slug,...p.promotionProposal})),highRiskProducts:products.filter(p=>['critical','high'].includes(p.supplierConcentrationRisk)).map(p=>({slug:p.slug,risk:p.supplierConcentrationRisk,deficit:p.supplierRouteDeficit,economicsFailingRouteCount:p.economicsFailingRouteCount})),routeQualification:{operationalRoutes:products.reduce((n,p)=>n+p.operationallyVerifiedRouteCount,0),promotableRoutes:products.reduce((n,p)=>n+p.promotableRouteCount,0),economicsFailingRoutes:products.reduce((n,p)=>n+p.economicsFailingRouteCount,0),economicsUnknownRoutes:products.reduce((n,p)=>n+p.economicsUnknownRouteCount,0)}};
}

export async function main(){
  const policy=await readJson('config/commercial-resilience-policy.json'),sourcing=await readJson('growth-reports/paperclip-cj-sourcing.json'),opportunities=await readJson('growth-reports/global-commerce-opportunities.json'),challenger=await readJson('growth-reports/supplier-challenger-board.json'),quoteRuntime=await readJson('growth-reports/quote-runtime-config.json'),economicsEvidence=await readJson('growth-reports/global-commerce-unit-economics.json'),liveCatalog=await readJson('services/physical-orders/live-catalog-candidates.json');
  const mergedEconomicsEvidence=mergeLiveRetailEvidence(economicsEvidence,liveCatalog),failureEvidence=await readJson('growth-reports/checkout-failure-evidence.json',{events:[]});
  const base=buildSupplierPortfolioBoard({sourcing,opportunities,policy});
  const operationalBoard=mergeChallengerEvidence(base,challenger,policy);
  const supplierBoard=qualifySupplierRoutesByEconomics(operationalBoard,mergedEconomicsEvidence,policy);
  const offerTournament=buildOfferTournament({supplierBoard,quoteRuntime,economicsEvidence:mergedEconomicsEvidence,policy});
  const checkoutRecovery=buildCheckoutRecoveryBoard({failureEvidence,supplierBoard,policy});
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/supplier-route-promotion-board.json',JSON.stringify(supplierBoard,null,2)+'\n');
  await fs.writeFile('growth-reports/offer-price-tournament.json',JSON.stringify(offerTournament,null,2)+'\n');
  await fs.writeFile('growth-reports/checkout-recovery-board.json',JSON.stringify(checkoutRecovery,null,2)+'\n');
  console.log(JSON.stringify({routePromotionProposals:supplierBoard.routePromotionProposals.length,highRiskProducts:supplierBoard.highRiskProducts.length,operationalRoutes:supplierBoard.routeQualification.operationalRoutes,promotableRoutes:supplierBoard.routeQualification.promotableRoutes,economicsFailingRoutes:supplierBoard.routeQualification.economicsFailingRoutes,economicsUnknownRoutes:supplierBoard.routeQualification.economicsUnknownRoutes,challengerEvidenceMerged:Boolean(challenger.checkedAt),liveRetailPricesBridged:Object.values(mergedEconomicsEvidence).filter(x=>x?.retailEvidenceSource==='live_storefront_catalog').length,offerHypotheses:offerTournament.hypothesisCount,checkoutRecoveryTasks:checkoutRecovery.tasks.length},null,2));
  return {supplierBoard,offerTournament,checkoutRecovery};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
