/* Real-time, browser-owned paper session. Not a 24/7 worker, no live trades. */
(function(){
'use strict';
const Core=window.PaperSim;
if(!Core)throw Error('Paper simulation core missing');
const KEY='papertrade-os-live-paper-v2';
let sim=null,bars=[],currentMinute=null,latestQuote=null,ws=null,stream='CONNECTING',
  socketSince=0,retryTimer=null,retryDelay=1500,renderAt=0,lastSave=0,lastBootstrap=0,
  quoteHistory=[],initialized=false,booting=false,missedSession=false,closedExplicitly=false;
const $=id=>document.getElementById(id);
const money=(v)=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v):'—';
const decimals=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
const fmtTime=t=>new Date(t).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Guyana'})+' GYT';
function loaded(){
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');return Core.readState(saved);}
  catch{return null;}
}
function save(force=false){
  if(!sim||(!force&&Date.now()-lastSave<2000))return;
  try{localStorage.setItem(KEY,JSON.stringify(sim));lastSave=Date.now();}
  catch{showMessage('Browser storage unavailable. Export results regularly.');}
}
function showMessage(text){
  for(const id of ['liveStateDetail','liveWarning']){
    const node=$(id);if(node)node.textContent=text;
  }
}
function safeQuote(x){
  const q={
    price:Number(x.price),bid:Number(x.bid ?? x.best_bid),ask:Number(x.ask ?? x.best_ask),
    at:typeof x.at==='number'?x.at:Date.parse(x.time)
  };
  return Core.fresh(q,Date.now())?q:null;
}
function consumeQuote(data,channel){
  const q=safeQuote(data);
  if(!q)return;
  latestQuote=q;
  stream=channel;
  const candleTime=Math.floor(q.at/60000)*60000;
  if(!currentMinute||currentMinute.time!==candleTime){
    if(currentMinute && currentMinute.time<candleTime){
      if(candleTime-currentMinute.time>120000) {
        if(sim){sim.interruption=true;sim.lastDecision='Feed interrupted. Resume after reviewing the gap.';}
        missedSession=true;
      }
      bars.push(currentMinute);
      if(bars.length>180)bars=bars.slice(-180);
    }
    currentMinute={time:candleTime,open:q.price,high:q.price,low:q.price,close:q.price};
  }else{
    currentMinute.close=q.price;
    currentMinute.high=Math.max(currentMinute.high,q.price);
    currentMinute.low=Math.min(currentMinute.low,q.price);
  }
  quoteHistory.push({at:q.at,price:q.price});
  if(quoteHistory.length>140)quoteHistory.shift();
  if(!sim){sim=Core.create(q.at);}
  // Do not execute after disconnected periods until a fresh market bootstrap succeeds.
  if(!sim.paused){
    const result=Core.process(sim,q,bars,Date.now());
    sim=result.state;
    if(result.executed.length)save(true);
    else save(false);
  }else{
    sim.updatedAt=Date.now();sim.lastQuoteAt=q.at;
  }
  if(Date.now()-renderAt>550)renderAll();
}
async function getJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(url,{cache:'no-store',signal:controller.signal});
    if(!r.ok)throw Error('Market source HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(timer);}
}
async function bootstrap(reason='initial'){
  if(booting)return;
  booting=true;stream='SYNCING';renderAll();
  try{
    const data=await getJson('/api/stream-init');
    if(data.mode!=='PAPER_ONLY'||!Array.isArray(data.completedMinutes)||data.completedMinutes.length<40)throw Error('Insufficient 1-minute price history');
    let clean=data.completedMinutes.filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close)&&b.close>0).sort((a,b)=>a.time-b.time);
    bars=[...new Map(clean.map(b=>[b.time,b])).values()].slice(-150);
    currentMinute=null;lastBootstrap=Date.now();
    if(!sim){sim=loaded()||Core.create(Date.now());}
    // No replay/backfilled trading during a browser-closed or disconnected interval.
    if(reason==='resume'){
      sim.lastBar=bars[bars.length-1].time;
      sim.interruption=false;
      sim.lastDecision='Resumed from fresh public candles; no missed trades backfilled';
      missedSession=false;
    }else if(reason==='reconnect'){
      const gap=Date.now()-sim.updatedAt>180000;
      // Ignore candles missed while disconnected. Never backfill fictitious fills.
      sim.lastBar=bars[bars.length-1].time;
      if(gap){
        sim.interruption=true;missedSession=true;
        sim.lastDecision='Long price-feed interruption. Review and resume; missed trades were not backfilled.';
      }
    }else if(reason==='initial'){
      const last=sim.updatedAt;
      if(sim.events.length>0 && Date.now()-last>180000){
        sim.interruption=true;missedSession=true;
        sim.lastBar=bars[bars.length-1].time;
        sim.lastDecision='Browser was closed or inactive. Review gap, then resume.';
      }
    }
    initialized=true;
    const q=safeQuote(data.quote||{});
    if(q)consumeQuote(q,'HTTP BOOTSTRAP');
    openSocket();
    renderAll();
  }catch(e){
    stream='UNAVAILABLE';
    showMessage('Market history unavailable: '+String(e.message||e));
    planReconnect();
  }finally{booting=false;}
}
function openSocket(){
  if(ws&&(ws.readyState===0||ws.readyState===1))return;
  if(typeof WebSocket!=='function'){stream='HTTP FALLBACK';renderAll();return;}
  try{
    const socket=new WebSocket('wss://ws-feed.exchange.coinbase.com');
    ws=socket;
    socketSince=Date.now();
    socket.onopen=()=>{
      retryDelay=1500;stream='SUBSCRIBING';
      socket.send(JSON.stringify({type:'subscribe',product_ids:['BTC-USD'],channels:['ticker','heartbeat']}));
      renderAll();
    };
    socket.onmessage=e=>{
      if(ws!==socket)return;
      let m;
      try{m=JSON.parse(e.data);}catch{return;}
      if(m.type==='ticker'&&m.product_id==='BTC-USD'){
        consumeQuote(m,'WEBSOCKET');
      }else if(m.type==='error'){
        stream='SOURCE ERROR';renderAll();
      }
    };
    socket.onerror=()=>{if(ws===socket){stream='HTTP FALLBACK';renderAll();}};
    socket.onclose=()=>{
      if(ws!==socket)return;
      ws=null;
      if(!closedExplicitly){stream='RECONNECTING';planReconnect();renderAll();}
    };
  }catch{stream='HTTP FALLBACK';planReconnect();}
}
function planReconnect(){
  if(retryTimer)return;
  retryTimer=setTimeout(()=>{
    retryTimer=null;
    if(document.visibilityState==='visible'){
      if(!initialized||Date.now()-lastBootstrap>180000)bootstrap('reconnect');
      else openSocket();
    }
    retryDelay=Math.min(retryDelay*1.8,30000);
  },retryDelay);
}
async function fallbackTick(){
  const activeSocket=ws&&ws.readyState===1;
  const lastAge=latestQuote?Date.now()-latestQuote.at:Infinity;
  if(activeSocket&&lastAge<10000)return;
  if(lastAge>30000&&sim&&!sim.paused){sim.interruption=true;missedSession=true;}
  if(document.visibilityState==='hidden')return;
  try{const data=await getJson('/api/spot');if(data.mode==='PAPER_ONLY')consumeQuote(data.quote,'HTTP FALLBACK');}
  catch{if(lastAge>20000){stream='STALE';renderAll();}}
  if(!activeSocket)openSocket();
}
function shade(v){return v<0?'negative':v>0?'positive':'';}
function chart(points){
  const node=$('liveSpark');if(!node)return;
  if(points.length<2){node.textContent='Streaming points will appear here once the market feed starts.';return;}
  const seq=points.slice(-120),values=seq.map(p=>p.equity),mn=Math.min(...values),mx=Math.max(...values),
    span=Math.max(mx-mn,4),lo=mn-span*.3,hi=mx+span*.3,W=780,H=176;
  const xy=seq.map((p,i)=>[10+(W-20)*i/(seq.length-1),12+(H-25)*(hi-p.equity)/(hi-lo)]);
  const path=xy.map((v,i)=>(i?'L':'M')+v[0].toFixed(1)+' '+v[1].toFixed(1)).join(' ');
  const last=xy[xy.length-1];
  node.innerHTML='<svg viewBox="0 0 780 176" preserveAspectRatio="none" aria-label="Live simulated equity history" role="img"><path d="'+path+'" stroke="#50dec1" stroke-width="3" stroke-linejoin="round" fill="none"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="4.5" fill="#a5fae5"/></svg>';
}
function set(id,text){const node=$(id);if(node)node.textContent=text;}
function renderAll(){
  if(!document.getElementById('view-live'))return;
  renderAt=Date.now();
  const now=Date.now();
  const connected=!!latestQuote && now-latestQuote.at<15000;
  const mk=sim&&connected?Core.mark(sim,latestQuote):null;
  const paperEquity=mk?.equity;
  const profit=Number.isFinite(paperEquity)?paperEquity-sim.startingCash:null;
  const risk=sim?(sim.halted?'HALTED':sim.paused?'PAUSED':sim.interruption?'FEED GAP':connected?'SIMULATION ACTIVE':'WAITING FOR QUOTE'):'INITIALIZING';
  const source=connected?(stream==='WEBSOCKET'?'LIVE TICKS':stream):'NO FRESH QUOTE';
  set('liveConnection',source);
  set('liveStatus',risk);
  set('liveBalance',money(paperEquity));
  set('liveProfit',profit==null?'—':money(profit));
  set('liveProfitPercent',profit==null?'—':((profit<0?'':'+' )+(profit/sim.startingCash*100).toFixed(3)+'%'));
  set('liveCash',sim?money(sim.cash):'—');
  set('liveQty',sim?sim.units.toFixed(8)+' BTC':'—');
  set('liveMarkPrice',connected?money(latestQuote.price):'Waiting for stream');
  set('liveMarketBid',connected?money(latestQuote.bid):'—');
  set('liveMarketAsk',connected?money(latestQuote.ask):'—');
  set('livePosition',mk?money(mk.exposure):'—');
  set('liveUnrealized',mk?money(mk.unrealized):'—');
  set('liveRealized',sim?money(sim.realizedPnl):'—');
  set('liveFees',sim?money(sim.fees):'—');
  set('liveTrades',sim?String(sim.completedPaperTrades):'—');
  set('liveTicks',String(quoteHistory.length));
  set('liveLastSignal',sim?.lastSignal==null?'Pending one-minute close':sim.lastSignal.toFixed(4)+'%');
  set('liveLastDecision',sim?.lastDecision||'Waiting for data');
  set('liveUpdated',connected?fmtTime(latestQuote.at):'Market feed disconnected');
  const note=sim?.interruption?'Price-feed gap detected. No missed transactions were fabricated. Select Resume after reviewing.':
    sim?.halted?'Risk threshold reached. Paper trading halted until reset.':
    sim?.paused?'Session paused, prices continue updating.':
    !connected?'Waiting for a fresh public exchange quote. Automated paper orders are blocked.':
    'Trading signals use completed one-minute market bars. Trades are simulated using bid/ask quotes plus fees and slippage.';
  set('liveStateDetail',note);
  set('liveWarning',note);
  const badge=$('liveConnection');if(badge)badge.className='realtime-pill '+(connected?'ok':'bad');
  for(const id of ['liveProfit','liveProfitPercent','liveMiniPnl']){
    const node=$(id);if(node){node.classList.remove('negative','positive');if(profit!=null)node.classList.add(shade(profit));}
  }
  set('liveMiniEquity',money(paperEquity));
  set('liveMiniPnl',profit==null?'Waiting for market data':money(profit)+' simulated P/L');
  set('liveMiniSource',connected?'Connected to '+(stream==='WEBSOCKET'?'real-time WebSocket':'public ticker fallback'): 'Stream reconnecting');
  if(sim)chart(sim.curve);
  const tbody=$('liveTransactions');
  if(tbody){
    tbody.replaceChildren();
    if(!sim||sim.events.length===0){
      const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;
      td.className='no-data';td.textContent='No simulated trades yet. Signals are evaluated on completed one-minute candles.';tr.append(td);tbody.append(tr);
    }else{
      sim.events.slice(0,25).forEach(tx=>{
        const tr=document.createElement('tr');
        [fmtTime(tx.at),tx.type,tx.qty.toFixed(7),money(tx.price),tx.reason].forEach((v,i)=>{
          const td=document.createElement('td');td.textContent=v;if(i===1)td.className=tx.type==='BUY'?'positive':'negative';tr.append(td);
        });tbody.append(tr);
      });
    }
  }
  const button=$('livePause');
  if(button)button.textContent=sim?.paused?'Resume session':'Pause session';
  if($('liveResumeGap'))$('liveResumeGap').disabled=!sim?.interruption;
}
function exportSession(){
  if(!sim)return;
  const payload={type:'PAPER_ONLY_LOCAL_BROWSER_SESSION',exportedAt:new Date().toISOString(),
    limitations:['Not actual fills','Browser must remain open','This state is not a server-side audited ledger'],session:sim};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);
  link.download='papertrade-simulation-'+new Date().toISOString().slice(0,10)+'.json';
  link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
window.addEventListener('beforeunload',()=>{save(true);if(ws){closedExplicitly=true;ws.close();}});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&(!latestQuote||Date.now()-latestQuote.at>90000)){
    if(sim){sim.interruption=true;missedSession=true;}
    bootstrap('resume').then(()=>{if(sim){sim.interruption=true;sim.lastDecision='Market gap reviewed? Select Resume after gap to start again.';save(true);renderAll();}});
  }
});
document.addEventListener('DOMContentLoaded',()=>{
  $('livePause')?.addEventListener('click',()=>{
    if(!sim)return;
    sim.paused=!sim.paused;
    if(!sim.paused && bars.length)sim.lastBar=bars[bars.length-1].time;
    sim.lastDecision=sim.paused?'Session manually paused':'Session resumed without backfilled trades';
    save(true);renderAll();
  });
  $('liveResumeGap')?.addEventListener('click',()=>bootstrap('resume').then(()=>{save(true);renderAll();}));
  $('liveReset')?.addEventListener('click',()=>{
    if(!window.confirm('Reset all browser-local simulated trades and restart at $10,000? Export first if you need the history.'))return;
    sim=Core.create(Date.now());save(true);renderAll();
  });
  $('liveExport')?.addEventListener('click',exportSession);
  sim=loaded()||Core.create(Date.now());renderAll();bootstrap('initial');
  setInterval(fallbackTick,9000);
  setInterval(()=>{if(sim&&latestQuote){renderAll();save(false);}},2500);
});
})();
