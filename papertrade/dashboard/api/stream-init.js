/* Gold-only source, historical five-minute bar signals and indicative spot quotes. */
'use strict';
const {loadSpot,loadChart,latestSession,STEP,SYMBOL}=require('../gold-data.cjs');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=15');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{
    const [quote,bars]=await Promise.all([loadSpot(),loadChart()]);
    const session=latestSession(bars).slice(-150);
    const age=bars.length?Math.max(0,(Date.now()-bars[bars.length-1].time)/60000):null;
    const historyFresh=session.length>=25&&age!==null&&age<=15;
    const ready=Boolean(quote.priceFresh&&historyFresh);
    return res.status(200).json({
      mode:'PAPER_ONLY',symbol:SYMBOL,unit:'USD per troy ounce',
      source:'XAUS indicative gold spot and chart proxy, both non-executable',
      quote,priceFresh:quote.priceFresh,
      completedMinutes:session,completedBars:session,granularitySeconds:300,
      historyFresh:ready,historyAgeMinutes:age,historyCount:session.length,
      readiness:ready?'PAPER_SIGNALS_READY':quote.priceFresh?'WAITING_FOR_GOLD_5MIN_HISTORY':'GOLD_MARKET_CLOSED_OR_STALE',
      noLiveOrders:true,noAccountConnection:true
    });
  }catch(e){return res.status(503).json({error:'Gold market bootstrap unavailable',reason:String(e.message||e),noLiveOrders:true});}
};
