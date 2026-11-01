// Public read-only Coinbase market data; stale candles block simulated entries.
'use strict';
const BASE='https://api.exchange.coinbase.com';
async function json(url){
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'PaperTradeOS-Realtime-Research/1.1'},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw Error('Upstream market feed '+r.status);
  return await r.json();
}
function normalize(rows, minute){
  if(!Array.isArray(rows))return [];
  const bars=rows.filter(x=>Array.isArray(x)&&x.length>=6).map(x=>({
    time:Number(x[0])*1000,
    close:Number(x[4]),
    high:Number(x[2]),low:Number(x[1]),open:Number(x[3])
  })).filter(x=>x.time<minute && x.time>=minute-300*60000 &&
    [x.close,x.high,x.low,x.open,x.time].every(Number.isFinite) &&
    x.close>0&&x.low>0&&x.high>=x.low).sort((a,b)=>a.time-b.time);
  return [...new Map(bars.map(x=>[x.time,x])).values()].slice(-150);
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=8, stale-while-revalidate=8');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{
    const now=Date.now(),minute=Math.floor(now/60000)*60000;
    const [initial,quote]=await Promise.all([
      json(BASE+'/products/BTC-USD/candles?granularity=60'),
      json(BASE+'/products/BTC-USD/ticker')
    ]);
    let bars=normalize(initial,minute);
    if(!bars.length || bars[bars.length-1].time<minute-120000){
      const start=new Date(now-180*60000).toISOString();
      const end=new Date(now).toISOString();
      try{
        const explicit=await json(BASE+'/products/BTC-USD/candles?granularity=60&start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end));
        const second=normalize(explicit,minute);
        if(second.length && (!bars.length || second[second.length-1].time>bars[bars.length-1].time))bars=second;
      }catch{/* fail closed if explicit source is unavailable */}
    }
    const price=Number(quote.price),bid=Number(quote.bid),ask=Number(quote.ask),at=Date.parse(quote.time);
    if(![price,bid,ask,at].every(Number.isFinite)||price<=0||bid<=0||ask<bid||now-at>25000||now-at< -5000)throw Error('Quote invalid or stale');
    const age=bars.length?Math.max(0,Math.round((minute-bars[bars.length-1].time)/60000)):null;
    const historyFresh=bars.length>=40 && age!==null && age<=2;
    return res.status(200).json({mode:'PAPER_ONLY',provider:'Coinbase Exchange public',symbol:'BTC-USD',
      serverTime:new Date(now).toISOString(),quote:{price,bid,ask,at},
      completedMinutes:bars,historyFresh,historyAgeMinutes:age,historyCount:bars.length,
      readiness:historyFresh?'PAPER_SIGNALS_READY':'WAITING_FOR_FRESH_MINUTE_HISTORY',
      noLiveOrders:true,noAccountConnection:true});
  }catch(e){
    return res.status(503).json({error:'Live market bootstrap unavailable',reason:String(e.message||e),noLiveOrders:true});
  }
};
