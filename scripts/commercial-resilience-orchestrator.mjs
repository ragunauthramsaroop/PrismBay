import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildSupplierPortfolioBoard, buildOfferTournament, buildCheckoutRecoveryBoard } from './commercial-resilience-engine.mjs';

const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null;};
const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
const key=r=>`${r?.productId||''}:${r?.variantId||''}:${r?.originCountryCode||''}`;
const riskBand=score=>score>=75?'critical':score>=55?'high':score>=35?'medium':'low';

function normalizeChallengerRoute(route={}){
  return {
    productId:route.productId||null,
    productSku:route.productSku||null,
    variantId:route.variantId||null,
    variantSku:route.variantSku||null,
    originCountryCode:route.originCountryCode||null,
    inventory:Number(route.inventory||0),
    productCostUsd:positive(route.productCostUsd),
    screeningFreightUsd:positive(route.screeningFreightUsd),
    screenedSingleUnitLandedUsd:positive(route.screenedLandedUsd??route.screenedSingleUnitLandedUsd),
    variantInventoryVerified:route.stockVerified===true||route.variantInventoryVerified===true,
    screeningFreightVerified:route.freightVerified===true||route.screeningFreightVerified===true,
    source:'supplier_challenger'
  };
}

export function mergeChallengerEvidence(board={},challenger={},policy={}){
  const target=Number(policy?.supplierPortfolio?.targetVerifiedRoutesPerSku||3);
  const bySlug=new Map((challenger.results||[]).map(row=>[row.slug,row]));
  const products=(board.products||[]).map(product=>{
    const evidence=bySlug.get(product.slug);
    if(!evidence)return product;
    const routes=[...(product.routes||[])];
    const seen=new Set(routes.map(key));
    const candidates=[...(evidence.verifiedRoutes||[]),...(evidence.routePromotionCandidates||[])];
    for(const raw of candidates){
      const route=normalizeChallengerRoute(raw);
      if(!route.productId||!route.variantId||!route.variantInventoryVerified||!route.screeningFreightVerified||!route.productCostUsd||!route.screenedSingleUnitLandedUsd)continue;
      const k=key(route);if(seen.has(k))continue;seen.add(k);routes.push(route);
    }
    routes.sort((a,b)=>(a.screenedSingleUnitLandedUsd??Infinity)-(b.screenedSingleUnitLandedUsd??Infinity)||Number(b.inventory||0)-Number(a.inventory||0));
    const independentSuppliers=new Set(routes.map(r=>r.productId).filter(Boolean)).size;
    const independentOrigins=new Set(routes.map(r=>r.originCountryCode).filter(Boolean)).size;
    const count=routes.length;
    let score=count===0?100:count===1?80:count===2?50:25;
    if(independentSuppliers<=1&&count>1)score+=15;
    if(independentOrigins<=1&&count>1)score+=5;
    score=Math.max(0,Math.min(100,score));
    const proposal=count?{
      status:'proposal_only',customerFacingSku:product.storeSku,preferredRoute:routes[0],backupRoutes:routes.slice(1,target),automaticActivation:false,finalBuyerZipStillRequired:true,
      rule:'Promote only verified pre-approved routes; final checkout still revalidates stock, exact destination freight and economics.'
    }:null;
    return {...product,routes,verifiedRouteCount:count,independentSupplierCount:independentSuppliers,independentOriginCount:independentOrigins,supplierConcentrationScore:score,supplierConcentrationRisk:riskBand(score),supplierRouteDeficit:Math.max(0,target-count),promotionProposal:proposal,challengerEvidenceMerged:true};
  });
  return {...board,products,routePromotionProposals:products.filter(p=>p.promotionProposal).map(p=>({slug:p.slug,...p.promotionProposal})),highRiskProducts:products.filter(p=>['critical','high'].includes(p.supplierConcentrationRisk)).map(p=>({slug:p.slug,risk:p.supplierConcentrationRisk,deficit:p.supplierRouteDeficit})),challengerBoardCheckedAt:challenger.checkedAt||null};
}

export function mergeLiveRetailEvidence(economicsEvidence={},liveCatalog={}){
  const merged=structuredClone(economicsEvidence&&typeof economicsEvidence==='object'?economicsEvidence:{});
  for(const row of Array.isArray(liveCatalog?.candidates)?liveCatalog.candidates:[]){
    const slug=String(row?.slug||'').trim(),retail=positive(row?.retailPriceUsd);
    if(!slug||!retail)continue;
    merged[slug]={...(merged[slug]||{}),retailUsd:positive(merged[slug]?.retailUsd)||retail,retailEvidenceSource:positive(merged[slug]?.retailUsd)?(merged[slug]?.retailEvidenceSource||'existing_economics_evidence'):'live_storefront_catalog'};
  }
  return merged;
}

export async function main(){
  const policy=await readJson('config/commercial-resilience-policy.json');
  const sourcing=await readJson('growth-reports/paperclip-cj-sourcing.json');
  const opportunities=await readJson('growth-reports/global-commerce-opportunities.json');
  const challenger=await readJson('growth-reports/supplier-challenger-board.json');
  const quoteRuntime=await readJson('growth-reports/quote-runtime-config.json');
  const economicsEvidence=await readJson('growth-reports/global-commerce-unit-economics.json');
  const liveCatalog=await readJson('services/physical-orders/live-catalog-candidates.json');
  const mergedEconomicsEvidence=mergeLiveRetailEvidence(economicsEvidence,liveCatalog);
  const failureEvidence=await readJson('growth-reports/checkout-failure-evidence.json',{events:[]});
  const base=buildSupplierPortfolioBoard({sourcing,opportunities,policy});
  const supplierBoard=mergeChallengerEvidence(base,challenger,policy);
  const offerTournament=buildOfferTournament({supplierBoard,quoteRuntime,economicsEvidence:mergedEconomicsEvidence,policy});
  const checkoutRecovery=buildCheckoutRecoveryBoard({failureEvidence,supplierBoard,policy});
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/supplier-route-promotion-board.json',JSON.stringify(supplierBoard,null,2)+'\n');
  await fs.writeFile('growth-reports/offer-price-tournament.json',JSON.stringify(offerTournament,null,2)+'\n');
  await fs.writeFile('growth-reports/checkout-recovery-board.json',JSON.stringify(checkoutRecovery,null,2)+'\n');
  console.log(JSON.stringify({routePromotionProposals:supplierBoard.routePromotionProposals.length,highRiskProducts:supplierBoard.highRiskProducts.length,challengerEvidenceMerged:Boolean(challenger.checkedAt),liveRetailPricesBridged:Object.values(mergedEconomicsEvidence).filter(x=>x?.retailEvidenceSource==='live_storefront_catalog').length,offerHypotheses:offerTournament.hypothesisCount,checkoutRecoveryTasks:checkoutRecovery.tasks.length},null,2));
  return {supplierBoard,offerTournament,checkoutRecovery};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
