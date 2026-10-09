import fs from 'node:fs/promises';

export function commercialReadinessScore(c={},economics={}){
  const economicsAdjustment=economics.screeningEconomicsPass===true ? 64 :
    economics.screeningEconomicsPass===false ? -96 : 0;
  const routeAdjustment=Math.min(Math.max(Number(economics.verifiedRouteCount)||0,0),3)*8;
  return Number(c.independentIdentityMatch===true)*64 +
    Number(c.variantStockVerified===true)*16 +
    Number(c.freightEstimateVerified===true)*16 +
    Number(c.finalZipFreightVerified===true)*32 +
    Number(c.mediaRightsVerified===true)*4 +
    Number(c.checkoutInfrastructureVerified===true)*24 +
    Number(c.checkoutAllowed===true)*32 +
    Number(c.automaticPromotionAllowed===true)*4 +
    Number(c.liveStoreProduct===true)*8 +
    economicsAdjustment + routeAdjustment;
}

export function supplierEconomicsBySlug(board={}){
  const rows=Array.isArray(board?.results)?board.results:[];
  return Object.fromEntries(rows.map(row=>[
    String(row?.slug||''),
    {
      screeningEconomicsPass:row?.mapped?.screeningEconomicsPass ?? null,
      screeningFreightHeadroomUsd:row?.mapped?.screeningFreightHeadroomUsd ?? null,
      verifiedRouteCount:Number(row?.verifiedRouteCount)||0,
    },
  ]).filter(([slug])=>slug));
}

export function prioritizeCandidates(report,economicsBySlug={}){
  if(!report||!Array.isArray(report.candidates)) throw new Error('candidate_report_missing');
  return {...report,candidates:[...report.candidates].sort((a,b)=>{
    const ae=economicsBySlug[String(a?.slug||'')]||{};
    const be=economicsBySlug[String(b?.slug||'')]||{};
    return commercialReadinessScore(b,be)-commercialReadinessScore(a,ae) || String(a.slug||'').localeCompare(String(b.slug||''));
  })};
}

export async function main(path='growth-reports/cj-worker-review.json',economicsPath='growth-reports/supplier-challenger-board.json'){
  const report=JSON.parse(await fs.readFile(path,'utf8'));
  let economicsBySlug={};
  try{
    economicsBySlug=supplierEconomicsBySlug(JSON.parse(await fs.readFile(economicsPath,'utf8')));
  }catch(error){
    if(error?.code!=='ENOENT') throw error;
  }
  const prioritized=prioritizeCandidates(report,economicsBySlug);
  await fs.writeFile(path,JSON.stringify(prioritized,null,2)+'\n');
  console.log(JSON.stringify({primary:prioritized.candidates[0]?.slug||null,score:commercialReadinessScore(prioritized.candidates[0]||{},economicsBySlug[prioritized.candidates[0]?.slug]||{}),top:prioritized.candidates.slice(0,3).map(c=>({slug:c.slug,score:commercialReadinessScore(c,economicsBySlug[c.slug]||{}),screeningEconomicsPass:economicsBySlug[c.slug]?.screeningEconomicsPass ?? null,verifiedRouteCount:economicsBySlug[c.slug]?.verifiedRouteCount ?? 0,checkoutInfrastructureVerified:c.checkoutInfrastructureVerified===true}))},null,2));
  return prioritized;
}

if(import.meta.url===`file://${process.argv[1]}`) await main();
