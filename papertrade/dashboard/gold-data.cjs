/* Gold-only public indicative market data. Strictly no BTC, tokens, orders or authentication. */
'use strict';
const BASE='https://xaus.com/api/v1';
const SYMBOL='XAU/USD';
const STEP=300000;
async function get(path,timeout=13000){
  const res=await fetch(BASE+path,{headers:{Accept:'application/json','User-Agent':'GoldPaperTradeResearch/1.0'},signal:AbortSignal.timeout(timeout),cache:'no-store'});
  if(!res.ok)throw Error('Public gold source HTTP '+res.status);
  return await res.json();
}
function spot(data,now=Date.now()){
  const price=Number(data?.spot_usd_oz??data?.xau?.price);
  const at=Date.parse(data?.data_state?.as_of??data?.price_as_of??data?.updated_at);
  const verified=Number.isFinite(price)&&price>100&&Number.isFinite(at)&&at<=now+5000;
  if(!verified)throw Error('Indicative XAU/USD source invalid');
  const sourceFresh=data.data_state?.status==='fresh'&&now-at<=150000;
  // Bid/ask are NOT observed dealer quotes, only a symmetric 1-bp spread assumption.
  const side=price*0.00005;
  return {price,bid:price-side,ask:price+side,at,
    priceFresh:Boolean(sourceFresh),sourceStatus:data.data_state?.status||'unknown',
    instrument:SYMBOL,unit:'USD per troy ounce',indicative:true,estimatedBidAsk:true,
    observedAt:new Date(at).toISOString(),provenance:'XAUS public XAU/USD indicative spot'};
}
function candlePoints(data){
  if(data?.symbol!=='xau'||!Array.isArray(data.points))throw Error('Incorrect gold chart instrument');
  const seen=new Map();
  for(const p of data.points){
    const timestamp=Number(p?.t)*1000;
    const price=Number(p?.c),open=Number(p?.o),high=Number(p?.h),low=Number(p?.l);
    if(![timestamp,price,open,high,low].every(Number.isFinite)||
      timestamp<=0||price<=0||open<=0||low<=0||high<Math.max(open,price,low)||
      low>Math.min(open,price))continue;
    const time=Math.floor(timestamp/STEP)*STEP;
    const bar={time,open,high,low,close:price,volume:Math.max(0,Number(p.v)||0)};
    seen.set(time,bar);
  }
  const now=Date.now(),end=Math.floor(now/STEP)*STEP;
  const bars=[...seen.values()].filter(b=>b.time<end&&b.time>now-10*86400000).sort((a,b)=>a.time-b.time);
  if(bars.length<30)throw Error('Not enough verified gold market history');
  return bars;
}
async function loadSpot(){return spot(await get('/spot?compact=1'));}
async function loadChart(){return candlePoints(await get('/chart?symbol=xau&range=5d&interval=5m'));}
function latestSession(bars){
  const last=bars[bars.length-1];if(!last)return [];
  let start=bars.length-1;
  for(let i=bars.length-1;i>0;i--){
    if(bars[i].time-bars[i-1].time>STEP*1.5)break;
    start=i-1;
  }
  return bars.slice(start);
}
function dailyPoints(data){
  if(data?.symbol!=='xau'||!Array.isArray(data.points))throw Error('Non-gold daily chart source');
  const map=new Map();
  const today=Math.floor(Date.now()/86400000)*86400000;
  for(const p of data.points){
    const time=Math.floor(Number(p?.t)*1000/86400000)*86400000;
    const bar={time,open:Number(p?.o),close:Number(p?.c),
      high:Number(p?.h),low:Number(p?.l),volume:Math.max(0,Number(p?.v)||0)};
    if(!Object.values(bar).every(Number.isFinite)||time<=0||time>=today||
      bar.low<=0||bar.high<Math.max(bar.open,bar.close,bar.low)||
      bar.low>Math.min(bar.open,bar.close))continue;
    map.set(time,bar);
  }
  const history=[...map.values()].sort((a,b)=>a.time-b.time);
  if(history.length<800)throw Error('Less than 800 verified daily gold candles; refuse long-history claims');
  if(history[history.length-1].time<today-10*86400000)throw Error('Gold daily price history too stale for research');
  return history;
}
function recordedDailyCloses(data){
  if(data?.symbol!=='XAUUSD'||data.interval!=='daily'||!Array.isArray(data.points))
    throw Error('Expected XAU/USD daily closes; got another instrument or format');
  const map=new Map(),today=Math.floor(Date.now()/86400000)*86400000;
  for(const row of data.points){
    const time=Date.parse(String(row.d)+'T00:00:00.000Z');
    const close=Number(row.c),high=Number(row.h),low=Number(row.l);
    if(![time,close,high,low].every(Number.isFinite)||time<=0||time>=today||
      close<=0||low<=0||high<Math.max(close,low)||low>close)continue;
    // The upstream history DOES NOT provide an open. Do not fabricate one.
    map.set(time,{time,close,high,low});
  }
  const history=[...map.values()].sort((a,b)=>a.time-b.time);
  if(history.length<800)throw Error('Insufficient recorded XAU daily closes: '+history.length);
  if(history.at(-1).time<today-10*86400000)throw Error('Gold daily history too old');
  return history;
}
async function loadDailyChart(){
  return recordedDailyCloses(await get('/history'));
}
module.exports={BASE,SYMBOL,STEP,get,spot,candlePoints,loadSpot,loadChart,latestSession,
  dailyPoints,recordedDailyCloses,loadDailyChart};
