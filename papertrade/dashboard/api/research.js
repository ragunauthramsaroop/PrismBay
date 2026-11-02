/* Read-only gold-only research API. No automated strategy promotion or live trades. */
'use strict';
const {loadChart}=require('../gold-data.cjs');
const {analyze,modelTrain,probability,signal,CONFIGS}=require('../strategy-research.cjs');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=180');
  try{
    const bars=await loadChart();
    const report=analyze(bars);
    // Shadow-only current observation. Not an approved or deployable strategy.
    // Model is trained only on completed bars with earlier known labels.
    const train=modelTrain(bars,Math.max(0,bars.length-480),bars.length);
    const last=bars.length-1;
    const p=train?probability(train,bars,last):null;
    const trend=signal(CONFIGS[0],bars,last,false,null);
    const shadow={
      asOf:new Date(bars[last].time).toISOString(),
      model:'L2 logistic regression, uncalibrated, observation only',
      probabilityUpNextBar:p,
      trend8x21:trend?'UPTREND_RULE':'NO_TREND_ENTRY',
      marketDataFresh:Date.now()-bars[last].time<=15*60000,
      noOrders:true
    };
    return res.status(200).json({research:report,shadow,liveOrders:0,tradingMode:'RESEARCH_ONLY',
      livePromotion:'DISABLED',executionAccess:false});
  }catch(e){
    return res.status(503).json({error:'Gold-only strategy research unavailable',
      detail:String(e.message||e),liveOrders:0,livePromotion:'DISABLED'});
  }
};
