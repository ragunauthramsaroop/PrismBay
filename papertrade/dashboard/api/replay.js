/* Public Coinbase BTC-USD historical minute candles. No accounts, keys or orders. */
'use strict';
const BASE='https://api.exchange.coinbase.com/products/BTC-USD/candles';
async function page(start,end) {
  const p = new URLSearchParams({granularity:'60',start:new Date(start).toISOString(),end:new Date(end).toISOString()});
  const url=BASE+'?'+p.toString();
  let last;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'PaperTradeOS-HistoricalSimulator/1.0'},signal:AbortSignal.timeout(11000),cache:'no-store'});
      if(!res.ok){if(res.status===429||res.status>=500){last=Error('Coinbase history HTTP '+res.status);continue;}throw Error('Coinbase history HTTP '+res.status);}
      const rows=await res.json();if(!Array.isArray(rows))throw Error('Coinbase returned malformed market data');
      return rows;
    }catch(e){last=e;}
  }
  throw last||Error('Market history unavailable');
}
function decode(r){
  if(!Array.isArray(r)||r.length<6)return null;
  const b={time:Number(r[0])*1000,low:Number(r[1]),high:Number(r[2]),
    open:Number(r[3]),close:Number(r[4]),volume:Number(r[5])};
  if(!Object.values(b).every(Number.isFinite)||b.time<=0||b.low<=0||
    b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close)||b.volume<0)return null;
  return b;
}
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, s-maxage=45, stale-while-revalidate=90');
  const hours=Number(req.query?.hours??6);
  if(![6,12,24].includes(hours))return res.status(400).json({error:'Choose six, twelve or twenty-four hours'});
  try{
    const minute=Math.floor(Date.now()/60000)*60000;
    const start=minute-hours*3600000;
    const windows=[];
    for(let from=start;from<minute;from+=180*60000)windows.push([from,Math.min(minute,from+180*60000)]);
    // At most eight simultaneous public calls. The API caps each response at 300 candles.
    const raw=await Promise.all(windows.map(([a,b])=>page(a,b)));
    const byMinute=new Map();
    for(const record of raw.flat()){
      const bar=decode(record);
      if(!bar||bar.time<start||bar.time>=minute)continue;
      const prior=byMinute.get(bar.time);
      if(prior&&JSON.stringify(prior)!==JSON.stringify(bar))throw Error('Inconsistent duplicated BTC candle');
      byMinute.set(bar.time,bar);
    }
    const bars=[...byMinute.values()].sort((a,b)=>a.time-b.time);
    const coverage=bars.length/(hours*60);
    if(coverage<.97||bars.length<60)throw Error('Insufficient historical minute coverage');
    for(let i=1;i<bars.length;i++)if(bars[i].time-bars[i-1].time>120000)throw Error('Historical minute gap is too large');
    if(minute-bars[bars.length-1].time>180000)throw Error('Latest historical minute is too old');
    return res.status(200).json({
      mode:'HISTORICAL_REPLAY_ONLY',symbol:'BTC-USD',granularitySeconds:60,
      source:'Coinbase Exchange public historical OHLCV',retrievedAt:new Date().toISOString(),
      pricesAsReported:true,realBidAsk:false,
      assumptions:{spreadBps:1,feePerSideBps:15,slippagePerSideBps:10,
        fill:'next one-minute bar OPEN with estimated spread, fee and slippage',
        caveat:'Bid/ask history is unavailable. Intrabar stops, exact fills, delays and latency are not modeled.'},
      candleCount:bars.length,coveragePct:Number((coverage*100).toFixed(2)),
      start:new Date(bars[0].time).toISOString(),end:new Date(bars[bars.length-1].time).toISOString(),
      bars,noRealOrders:true
    });
  }catch(e){
    return res.status(503).json({error:'Historical simulation data unavailable',
      detail:String(e.message||e),noRealOrders:true});
  }
};
