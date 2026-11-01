// Public Coinbase Exchange data only. Read-only bootstrap for browser WebSocket simulator.
'use strict';
const BASE='https://api.exchange.coinbase.com';
async function json(url){
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'PaperTradeOS-Realtime-Research/1.0'},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw Error('Upstream market feed '+r.status);
  return await r.json();
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=10, stale-while-revalidate=15');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{
    const [rows,quote]=await Promise.all([
      json(BASE+'/products/BTC-USD/candles?granularity=60'),
      json(BASE+'/products/BTC-USD/ticker')
    ]);
    if(!Array.isArray(rows))throw Error('Minute candles unavailable');
    const now=Date.now(),minute=Math.floor(now/60000)*60000;
    const bars=rows.filter(x=>Array.isArray(x)&&x.length>=6).map(x=>({
      time:Number(x[0])*1000,
      close:Number(x[4]),
      high:Number(x[2]),low:Number(x[1]),open:Number(x[3])
    })).filter(x=>x.time<minute && x.time>=minute-300*60000 &&
      [x.close,x.high,x.low,x.open].every(Number.isFinite) &&
      x.close>0&&x.low>0&&x.high>=x.low).sort((a,b)=>a.time-b.time);
    const unique=[...new Map(bars.map(x=>[x.time,x])).values()];
    if(unique.length<40 || unique[unique.length-1].time<minute-180000)throw Error('Completed minute candles are stale');
    const price=Number(quote.price),bid=Number(quote.bid),ask=Number(quote.ask),at=Date.parse(quote.time);
    if(![price,bid,ask,at].every(Number.isFinite)||price<=0||bid<=0||ask<bid||now-at>25000)throw Error('Quote invalid or stale');
    return res.status(200).json({mode:'PAPER_ONLY',provider:'Coinbase Exchange public',symbol:'BTC-USD',serverTime:new Date(now).toISOString(),
      quote:{price,bid,ask,at},completedMinutes:unique.slice(-150),
      noLiveOrders:true,noAccountConnection:true});
  }catch(e){
    return res.status(503).json({error:'Live market bootstrap unavailable',reason:String(e.message||e),noLiveOrders:true});
  }
};
