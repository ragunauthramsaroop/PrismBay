/* Read-only gold-only research API. No automated strategy promotion or live trades. */
'use strict';
const {loadChart,loadDailyChart}=require('../gold-data.cjs');
const {walkForward}=require('../gold-swing-research.cjs');
const {analyze,modelTrain,probability,signal,CONFIGS}=require('../strategy-research.cjs');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=180');
  try{
    const outcomes=await Promise.allSettled([loadChart(),loadDailyChart()]);
    if(outcomes[0].status!=='fulfilled')throw outcomes[0].reason;
    const bars=outcomes[0].value;
    const report=analyze(bars);
    let longHorizon=null,longHorizonError=null;
    if(outcomes[1].status==='fulfilled'){
      try{longHorizon=walkForward(outcomes[1].value);}
      catch(e){longHorizonError=String(e.message||e);}
    }else longHorizonError=String(outcomes[1].reason?.message||outcomes[1].reason);
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
    return res.status(200).json({research:report,longHorizon,longHorizonError,shadow,liveOrders:0,tradingMode:'RESEARCH_ONLY',
      livePromotion:'DISABLED',executionAccess:false});
  }catch(e){
    return res.status(503).json({error:'Gold-only strategy research unavailable',
      detail:String(e.message||e),liveOrders:0,livePromotion:'DISABLED'});
  }
};
