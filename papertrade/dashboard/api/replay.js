/* Real gold-only XAU/USD 5-minute chart PROXY, never executable gold prices. */
'use strict';
const {loadChart,STEP,SYMBOL}=require('../gold-data.cjs');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=60');
  res.setHeader('X-Content-Type-Options','nosniff');
  const hours=Number(req.query?.hours??6);
  if(![6,12,24].includes(hours))return res.status(400).json({error:'Choose 6, 12, or 24 trading hours'});
  try{
    const all=await loadChart();
    const count=Math.round(hours*3600000/STEP)+25;
    const bars=all.slice(-count);
    if(bars.length<count)throw Error('Not enough genuine gold chart points for chosen period');
    const breakCount=bars.reduce((n,b,i)=>n+(i&&b.time-bars[i-1].time>STEP*1.5?1:0),0);
    return res.status(200).json({
      mode:'HISTORICAL_REPLAY_ONLY',symbol:SYMBOL,unit:'USD per troy ounce',
      market:'GOLD_ONLY',granularitySeconds:300,source:'XAUS XAU chart, Yahoo Finance chart proxy (not executable spot quotes)',
      retrievedAt:new Date().toISOString(),pricesAsReported:true,realBidAsk:false,
      requestedMarketHours:hours,containsMarketBreaks:breakCount>0,marketBreakCount:breakCount,
      assumptions:{spreadBps:1,feePerSideBps:15,slippagePerSideBps:10,
        fill:'historical next five-minute bar OPEN, assumed spread, fee and slippage',
        caveat:'Indicative gold chart proxy is not a tradable broker quote. Market breaks are skipped without inventing prices; queue delay and intrabar stops not modeled.'},
      candleCount:bars.length,coveragePct:100,
      start:new Date(bars[0].time).toISOString(),end:new Date(bars[bars.length-1].time).toISOString(),
      bars,noRealOrders:true
    });
  }catch(e){return res.status(503).json({error:'Gold history unavailable',detail:String(e.message||e),noRealOrders:true});}
};
