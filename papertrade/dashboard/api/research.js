/* Read-only gold-only research API. No automated strategy promotion or live trades. */
'use strict';
const {loadChart}=require('../gold-data.cjs');
const {analyze}=require('../strategy-research.cjs');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=180');
  try{
    const bars=await loadChart();
    const report=analyze(bars);
    return res.status(200).json({research:report,liveOrders:0,tradingMode:'RESEARCH_ONLY',
      livePromotion:'DISABLED',executionAccess:false});
  }catch(e){
    return res.status(503).json({error:'Gold-only strategy research unavailable',
      detail:String(e.message||e),liveOrders:0,livePromotion:'DISABLED'});
  }
};
