import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createCJReadOnlyClient } from './cj-api-limiter.mjs';
import { chooseProducts, candidateVariantChoices, chooseStock, positiveNumber } from './paperclip-cj-sourcing.mjs';
import { freightRequest, parseCJFreight } from './cj-freight-policy.mjs';
import { commercialFreightCeiling } from './freight-ceiling-engine.mjs';

const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const TARGET_VERIFIED_ROUTES=3;
const headers=t=>({'CJ-Access-Token':t,'Content-Type':'application/json','User-Agent':'PrismBay-Supplier-Challenger/1.1'});
const productId=p=>String(p?.id??p?.pid??p?.productId??'').trim();
const productName=p=>String(p?.nameEn??p?.productNameEn??p?.productName??p?.name??'').trim();
const productSku=p=>String(p?.sku??p?.productSku??p?.spu??'').trim();

async function inspectRoute({client,token,candidate,product,lockExactVariant=false}){
  const vurl=new URL(BASE+'/product/variant/query'); vurl.searchParams.set('pid',productId(product));
  let variants=[]; try{variants=candidateVariantChoices((await client(vurl,{headers:headers(token)}))?.data,lockExactVariant?candidate:{...candidate,exactVariantSku:null}).slice(0,4);}catch{}
  for(const variant of variants){
    const surl=new URL(BASE+'/product/stock/queryByVid'); surl.searchParams.set('vid',String(variant.vid));
    let stock=null; try{stock=chooseStock((await client(surl,{headers:headers(token)}))?.data,variant.vid);}catch{}
    if(!stock) continue;
    const cost=positiveNumber(variant.variantSellPrice)??positiveNumber(product?.sellPrice??product?.nowPrice);
    let freight={offers:[]};
    try{freight=parseCJFreight(await client(BASE+'/logistic/freightCalculate',{method:'POST',headers:headers(token),body:JSON.stringify(freightRequest(String(variant.vid),null,String(stock.countryCode).toUpperCase(),1))}),'country_estimate');}catch{}
    const freightUsd=positiveNumber(freight?.offers?.[0]?.usd);
    return {productId:productId(product),productSku:productSku(product)||null,productName:productName(product),variantId:String(variant.vid),variantSku:String(variant.variantSku||''),originCountryCode:String(stock.countryCode).toUpperCase(),inventory:Number(stock.cjInventoryNum||0),productCostUsd:cost,screeningFreightUsd:freightUsd,screenedLandedUsd:cost&&freightUsd?+(cost+freightUsd).toFixed(2):null,stockVerified:true,freightVerified:Boolean(freightUsd)};
  }
  return {productId:productId(product),productSku:productSku(product)||null,productName:productName(product),stockVerified:false,freightVerified:false};
}

async function mappedProduct(client,token,candidate){
  const url=new URL(BASE+'/product/query');
  if(candidate.exactVariantSku) url.searchParams.set('variantSku',candidate.exactVariantSku); else url.searchParams.set('productSku',candidate.exactSupplierSku);
  try{const p=(await client(url,{headers:headers(token)}))?.data; return Array.isArray(p)?p[0]:p;}catch{return null;}
}

async function challengerProducts(client,token,candidate,mappedId){
  const found=[]; const seen=new Set([mappedId]);
  for(const query of (candidate.queries||[candidate.query]).slice(0,3)){
    const url=new URL(BASE+'/product/listV2');
    url.searchParams.set('page','1');url.searchParams.set('size','20');url.searchParams.set('keyWord',query);url.searchParams.set('sort','desc');url.searchParams.set('orderBy','1');url.searchParams.append('features','enable_category');
    let rows=[]; try{const payload=await client(url,{headers:headers(token)});const groups=payload?.data?.content;const flat=Array.isArray(groups)?groups.flatMap(g=>Array.isArray(g?.productList)?g.productList:[]):[];rows=chooseProducts(flat,{...candidate,exactVariantSku:null,exactSupplierSku:null},5);}catch{}
    for(const row of rows){const id=productId(row);if(!id||seen.has(id))continue;seen.add(id);found.push(row);if(found.length>=4)return found;}
  }
  return found;
}

function routeKey(route){return `${route?.productId||''}:${route?.variantId||''}:${route?.originCountryCode||''}`;}
function concentrationBand(count){return count<=1?'critical':count===2?'high':'low';}

export function compareMappedToChallengers({candidate,mapped,challengers,retailPriceUsd}){
  const retail=positiveNumber(retailPriceUsd);
  const mappedCeiling=retail&&mapped?.productCostUsd?commercialFreightCeiling({retailUsd:retail,supplierCostUsd:mapped.productCostUsd}):null;
  const mappedHeadroom=mappedCeiling?.viable&&mapped?.screeningFreightUsd?+(mappedCeiling.maxFreightUsd-mapped.screeningFreightUsd).toFixed(2):null;
  const mappedRoute={...mapped,maxAffordableFreightUsd:mappedCeiling?.viable?mappedCeiling.maxFreightUsd:null,screeningFreightHeadroomUsd:mappedHeadroom,screeningEconomicsPass:mappedHeadroom!=null?mappedHeadroom>=0:null};
  const ranked=[...(challengers||[])].filter(x=>x.stockVerified&&x.freightVerified&&x.screenedLandedUsd!=null).map(route=>{
    const c=retail&&route.productCostUsd?commercialFreightCeiling({retailUsd:retail,supplierCostUsd:route.productCostUsd}):null;
    const headroom=c?.viable&&route.screeningFreightUsd?+(c.maxFreightUsd-route.screeningFreightUsd).toFixed(2):null;
    return {...route,maxAffordableFreightUsd:c?.viable?c.maxFreightUsd:null,screeningFreightHeadroomUsd:headroom,screeningEconomicsPass:headroom!=null?headroom>=0:null};
  }).sort((a,b)=>(b.screeningEconomicsPass===true)-(a.screeningEconomicsPass===true)||(b.screeningFreightHeadroomUsd??-999)-(a.screeningFreightHeadroomUsd??-999)||(a.screenedLandedUsd??999)-(b.screenedLandedUsd??999));
  const best=ranked[0]||null;
  const improvement=best?.screenedLandedUsd!=null&&mapped?.screenedLandedUsd!=null?+(mapped.screenedLandedUsd-best.screenedLandedUsd).toFixed(2):null;
  const verifiedRoutes=[];const seen=new Set();
  for(const route of [mappedRoute,...ranked]){
    if(!route?.stockVerified||!route?.freightVerified||route?.screeningEconomicsPass!==true||!route?.productId||!route?.variantId)continue;
    const key=routeKey(route);if(seen.has(key))continue;seen.add(key);verifiedRoutes.push(route);
  }
  const verifiedRouteCount=verifiedRoutes.length;
  const routeDeficit=Math.max(0,TARGET_VERIFIED_ROUTES-verifiedRouteCount);
  const routePromotionCandidates=ranked.filter(x=>x.screeningEconomicsPass===true).slice(0,Math.max(0,TARGET_VERIFIED_ROUTES-1));
  return {
    slug:candidate.slug,
    mapped:mappedRoute,
    challengers:ranked,
    verifiedRoutes,
    verifiedRouteCount,
    targetVerifiedRoutes:TARGET_VERIFIED_ROUTES,
    routeDeficit,
    supplierConcentrationRisk:concentrationBand(verifiedRouteCount),
    routePromotionCandidates,
    recommendedRemapCandidate:best&&improvement!=null&&improvement>=0.5&&best.screeningEconomicsPass===true?best:null,
    screenedLandedImprovementUsd:improvement,
    replacementSourcingRequired:routeDeficit>0,
    automaticRemapAllowed:false,
    exactBuyerZipStillRequired:true
  };
}

export async function main(){
  const apiKey=String(process.env.CJ_API_KEY||'').trim();if(!apiKey)throw new Error('CJ_API_KEY required');
  const client=createCJReadOnlyClient();
  const auth=await client(BASE+'/authentication/getAccessToken',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'PrismBay-Supplier-Challenger/1.1'},body:JSON.stringify({apiKey})});
  const token=String(auth?.data?.accessToken||'');if(!token)throw new Error('CJ access token missing');console.log('::add-mask::'+token);
  const supplier=JSON.parse(await fs.readFile('paperclip/prismbay-global-commerce/research/supplier-candidates.json','utf8'));
  const live=JSON.parse(await fs.readFile('services/physical-orders/live-catalog-candidates.json','utf8'));
  const retail=new Map((live.candidates||[]).map(x=>[x.slug,x.retailPriceUsd]));
  const mappedCandidates=(supplier.candidates||[]).filter(x=>x.liveStoreProduct&&x.exactSupplierSku).sort((a,b)=>(a.slug==='crevice'?-1:b.slug==='crevice'?1:Number(b.researchScore||0)-Number(a.researchScore||0))).slice(0,5);
  const results=[];
  for(const candidate of mappedCandidates){
    const mp=await mappedProduct(client,token,candidate);if(!mp){results.push({slug:candidate.slug,status:'mapped_supplier_lookup_failed',verifiedRouteCount:0,targetVerifiedRoutes:TARGET_VERIFIED_ROUTES,routeDeficit:TARGET_VERIFIED_ROUTES,supplierConcentrationRisk:'critical',replacementSourcingRequired:true,automaticRemapAllowed:false});continue;}
    const mapped=await inspectRoute({client,token,candidate,product:mp,lockExactVariant:true});
    const alternatives=await challengerProducts(client,token,candidate,mapped.productId);
    const inspected=[];for(const p of alternatives)inspected.push(await inspectRoute({client,token,candidate,product:p,lockExactVariant:false}));
    results.push({...compareMappedToChallengers({candidate,mapped,challengers:inspected,retailPriceUsd:retail.get(candidate.slug)}),status:'challenger_review_complete'});
  }
  const board={schemaVersion:2,checkedAt:new Date().toISOString(),mode:'read_only_supplier_diversification_swarm',candidateCount:results.length,targetVerifiedRoutesPerSku:TARGET_VERIFIED_ROUTES,routeDeficitProductCount:results.filter(x=>Number(x.routeDeficit||0)>0).length,criticalConcentrationCount:results.filter(x=>x.supplierConcentrationRisk==='critical').length,remapProposalCount:results.filter(x=>x.recommendedRemapCandidate).length,routePromotionCandidateCount:results.reduce((n,x)=>n+(x.routePromotionCandidates?.length||0),0),automaticRemapAllowed:false,ordersEnabled:false,paymentsEnabled:false,results};
  await fs.mkdir('growth-reports',{recursive:true});await fs.writeFile('growth-reports/supplier-challenger-board.json',JSON.stringify(board,null,2)+'\n');
  console.log(JSON.stringify({candidateCount:board.candidateCount,routeDeficitProductCount:board.routeDeficitProductCount,criticalConcentrationCount:board.criticalConcentrationCount,routePromotionCandidateCount:board.routePromotionCandidateCount,results:results.map(x=>({slug:x.slug,verifiedRoutes:x.verifiedRouteCount,routeDeficit:x.routeDeficit,risk:x.supplierConcentrationRisk,challengers:x.challengers?.length||0,recommended:Boolean(x.recommendedRemapCandidate)}))},null,2));
  return board;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
