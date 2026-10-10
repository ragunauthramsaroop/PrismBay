import fs from 'node:fs/promises';

async function readJson(path){ try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return null;} }

function activeState(strategy,{verifiedSales,saleReadyCount}){
  if(verifiedSales>0) return 'post_sale_measure_and_scale';
  if(strategy.id==='primary-product-gate-closure'||strategy.id==='backup-product-race'||strategy.id==='storefront-cro'||strategy.id==='short-form-creative-library'||strategy.id==='offer-bundle-engineering'||strategy.id==='conversion-experiment-backlog') return 'active_internal';
  if(strategy.id==='owned-search-seo') return saleReadyCount>0?'activation_ready':'active_internal_prepare';
  if(['google-free-listings','pinterest-product-pins','tiktok-shop-affiliate','marketplace-listing-packages','creator-affiliate-shortlist'].includes(strategy.id)) return saleReadyCount>0?'account_or_owner_activation_check':'active_internal_prepare';
  return 'active_internal_prepare';
}

export function buildStrategyBoard({portfolio,supplier,firstSale,promotion}){
  if(!portfolio?.strategies?.length) throw new Error('sales_strategy_portfolio_missing');
  const verifiedSales=firstSale?.verifiedFirstSale===true?Math.max(1,Number(firstSale.verifiedSaleCount||1)):Number(firstSale?.verifiedSaleCount||0);
  // Research or guarded-preflight promotion never proves buyer-specific sale readiness.
  const declared = Number.isSafeInteger(supplier?.saleReadyCount) && supplier.saleReadyCount > 0
    ? supplier.saleReadyCount : 0;
  const verified = Array.isArray(supplier?.candidates)
    ? supplier.candidates.filter(c => c.independentIdentityMatch === true &&
        c.variantStockVerified === true && c.freightEstimateVerified === true &&
        c.finalZipFreightVerified === true && c.mediaRightsVerified === true &&
        c.checkoutAllowed === true && c.automaticPromotionAllowed === true).length
    : 0;
  const saleReadyCount = Math.min(declared, verified);
  const candidates=Array.isArray(supplier?.candidates)?supplier.candidates:[];
  const primary=candidates.filter(c=>c.independentIdentityMatch===true).sort((a,b)=>{
    const score=x=>[x.variantStockVerified,x.freightEstimateVerified,x.finalZipFreightVerified,x.mediaRightsVerified,x.checkoutAllowed,x.automaticPromotionAllowed].filter(Boolean).length;
    return score(b)-score(a);
  })[0]||null;
  const strategies=portfolio.strategies.map(s=>({
    ...s,
    state:activeState(s,{verifiedSales,saleReadyCount}),
    blockedBy:saleReadyCount===0 && ['google-free-listings','pinterest-product-pins','tiktok-shop-affiliate','marketplace-listing-packages','creator-affiliate-shortlist'].includes(s.id)?['sale_ready_product']:[],
    nextAction:s.action,
    fallbackRoute:s.fallback
  }));
  const concurrent=strategies.filter(s=>s.state!=='post_sale_measure_and_scale').length;
  if(verifiedSales===0 && concurrent<Number(portfolio.minimumConcurrentPathsBeforeFirstSale||1)) throw new Error(`insufficient_concurrent_sales_paths:${concurrent}`);
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    mode:verifiedSales>0?'post_sale_measure_and_scale':'ceo_multi_path_first_sale',
    verifiedSales,
    saleReadyCount,
    primaryProduct:primary?.slug||null,
    primaryRemainingGates:primary?[
      !primary.variantStockVerified?'variant_stock':null,
      !primary.freightEstimateVerified?'freight_estimate':null,
      !primary.finalZipFreightVerified?'final_zip_freight':null,
      !primary.mediaRightsVerified?'media_rights':null,
      !primary.checkoutAllowed?'checkout':null,
      !primary.automaticPromotionAllowed?'promotion_authorization':null
    ].filter(Boolean):[],
    concurrentStrategyCount:concurrent,
    minimumConcurrentPathsBeforeFirstSale:Number(portfolio.minimumConcurrentPathsBeforeFirstSale||1),
    strategies,
    acquisitionPaths:strategies.filter(s=>['acquisition','marketplace','performance_distribution'].includes(s.class)).map(s=>({id:s.id,state:s.state,blockedBy:s.blockedBy,nextAction:s.nextAction,fallbackRoute:s.fallbackRoute})),
    rules:portfolio.rules
  };
}

export async function main(){
  const [portfolio,supplier,firstSale,promotion]=await Promise.all([
    readJson('config/sales-strategy-portfolio.json'),
    readJson('growth-reports/cj-worker-review.json'),
    readJson('growth-reports/first-sale-verification.json'),
    readJson('growth-reports/retail-promotion-swarm.json')
  ]);
  const board=buildStrategyBoard({portfolio,supplier,firstSale,promotion});
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/sales-strategy-board.json',JSON.stringify(board,null,2)+'\n');
  console.log(JSON.stringify({mode:board.mode,verifiedSales:board.verifiedSales,saleReadyCount:board.saleReadyCount,primaryProduct:board.primaryProduct,concurrentStrategyCount:board.concurrentStrategyCount,acquisitionPaths:board.acquisitionPaths.map(x=>x.id)},null,2));
  return board;
}

if(import.meta.url===`file://${process.argv[1]}`) await main();
