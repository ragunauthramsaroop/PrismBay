/* Gold-only indicative XAU/USD paper account, browser-local; never any broker orders. */
(function(){
'use strict';
const Core=window.PaperSim,KEY='papertrade-os-xau-only-v1';
if(!Core)throw Error('Missing XAU paper engine');
const $=id=>document.getElementById(id);
const usd=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'—';
const when=t=>Number.isFinite(t)?new Intl.DateTimeFormat('en-US',{timeZone:'America/Guyana',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(t))+' GYT':'Unavailable';
let state=null,bars=[],quote=null,marketReady=false,sourceStatus='CONNECTING',
  busy=false,lastSave=0,lastPaint=0,lastError='',started=false;
function read(){
  try{return Core.readState(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return null;}
}
function save(force=false){
  if(!state||(!force&&Date.now()-lastSave<10000))return;
  try{localStorage.setItem(KEY,JSON.stringify(state));lastSave=Date.now();}catch{}
}
function set(id,v){const el=$(id);if(el)el.textContent=String(v);}
function tone(id,v){const el=$(id);if(!el)return;el.classList.toggle('positive',Number.isFinite(v)&&v>0);el.classList.toggle('negative',Number.isFinite(v)&&v<0);}
function latestQuote(x){
  const p=Number(x?.price),bid=Number(x?.bid),ask=Number(x?.ask),at=Number(x?.at);
  if(![p,bid,ask,at].every(Number.isFinite)||p<100||bid<=0||ask<bid||at>Date.now()+5000)return null;
  return {price:p,bid,ask,at};
}
async function get(path){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  try{const r=await fetch(path,{cache:'no-store',signal:controller.signal});const j=await r.json();
    if(!r.ok)throw Error(j.reason||j.detail||'Gold source unavailable');
    return j;
  }finally{clearTimeout(timer);}
}
function setupBarData(data){
  bars=(data.completedBars||[]).filter(x=>Number.isFinite(x?.close)&&x.close>0&&Number.isFinite(x.time))
    .sort((a,b)=>a.time-b.time);
  if(bars.length>150)bars=bars.slice(-150);
}
async function update(){
  if(busy)return;busy=true;
  try{
    const data=await get('/api/stream-init');
    if(data.symbol!=='XAU/USD'||data.mode!=='PAPER_ONLY'||!data.noLiveOrders)
      throw Error('Unexpected trading instrument or source');
    setupBarData(data);
    quote=latestQuote(data.quote);
    marketReady=Boolean(data.historyFresh&&data.priceFresh&&quote&&Core.fresh(quote,Date.now()));
    sourceStatus=marketReady?'FRESH INDICATIVE GOLD PRICE':data.priceFresh?'GOLD INDICATOR WARM-UP':'GOLD MARKET CLOSED / STALE';
    lastError='';
    if(!state)state=read()||Core.create();
    if(!marketReady){
      state.interruption=true;
      state.lastDecision='Gold quote or five-minute history is not ready. No virtual order generated.';
    }else if(state.interruption&&state.events.length===0&&state.lastDecision==='Gold quote or five-minute history is not ready. No virtual order generated.'){
      // Initial indicator warm-up is not a trading-session outage.
      state.interruption=false;
      state.lastBar=bars.at(-1)?.time??null;
      state.lastQuoteAt=quote.at;
      state.lastDecision='Gold indicator initialized. First new five-minute bar will be evaluated.';
    }else if(state.events.length&&Date.now()-state.updatedAt>900000){
      state.interruption=true;
      state.lastDecision='Session was inactive. Review missing data before resuming virtual trades.';
    }
    if(marketReady&&!state.paused&&!state.interruption){
      state=Core.process(state,quote,bars,Date.now()).state;
    }else if(quote&&Core.fresh(quote,Date.now())){
      state.lastQuoteAt=quote.at;
    }
    save(true);
  }catch(e){
    marketReady=false;sourceStatus='SOURCE UNAVAILABLE';lastError=String(e.message||e);
    if(state){state.interruption=true;save(true);}
  }finally{busy=false;render();}
}
function curve(){
  const el=$('liveSpark');if(!el)return;
  const points=state?.curve||[];
  if(points.length<2){el.textContent='Historical virtual equity marks appear as fresh gold prices arrive.';return;}
  const seq=points.slice(-150),v=seq.map(x=>x.equity),min=Math.min(...v),max=Math.max(...v),
    spread=Math.max(2,max-min),low=min-spread*.4,high=max+spread*.4,W=780,H=175;
  const xs=i=>10+(W-20)*i/(seq.length-1),ys=n=>12+(H-24)*(high-n)/(high-low);
  const path=seq.map((x,i)=>(i?'L':'M')+xs(i).toFixed(2)+' '+ys(x.equity).toFixed(2)).join(' ');
  el.innerHTML='<svg viewBox="0 0 780 175" preserveAspectRatio="none" role="img" aria-label="Virtual gold account equity over observed prices"><path d="'+path+'" fill="none" stroke="#d6bb72" stroke-width="3"/><circle cx="'+xs(seq.length-1)+'" cy="'+ys(seq.at(-1).equity)+'" r="4.5" fill="#f6dca0"/></svg>';
}
function journal(){
  const table=$('liveTransactions');if(!table)return;
  table.replaceChildren();
  const events=state?.events||[];
  if(!events.length){const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=5;td.className='no-data';td.textContent='No gold paper entries yet. Signals require completed five-minute history and a fresh spot price.';
    tr.append(td);table.append(tr);return;
  }
  for(const e of events.slice(0,25)){
    const tr=document.createElement('tr');
    [when(e.at),e.type,e.qty.toFixed(5)+' oz',usd(e.price),e.reason].forEach((v,i)=>{
      const td=document.createElement('td');td.textContent=v;
      if(i===1)td.className=e.type==='BUY'?'positive':'negative';tr.append(td);
    });table.append(tr);
  }
}
function render(){
  if(!state)return;
  const fresh=quote&&Core.fresh(quote,Date.now());
  const mark=fresh?Core.mark(state,quote):null;
  const pnl=mark?mark.equity-state.startingCash:null;
  const warming=sourceStatus==='GOLD INDICATOR WARM-UP';
  const stateLabel=state.halted?'RISK HALTED':state.paused?'PAUSED':warming?'INDICATOR WARM-UP':state.interruption?'SOURCE GAP':marketReady?'GOLD PAPER ACTIVE':'MARKET WAITING';
  set('liveConnection',sourceStatus);set('liveStatus',stateLabel);
  set('liveBalance',mark?usd(mark.equity):usd(state.cash)+' virtual cash (mark unavailable)');
  set('liveProfit',pnl===null?'—':usd(pnl));
  set('liveProfitPercent',pnl===null?'—':(pnl>=0?'+':'')+(pnl/state.startingCash*100).toFixed(3)+'%');
  set('liveCash',usd(state.cash));set('liveQty',state.units.toFixed(5)+' oz');
  set('liveMarkPrice',quote?usd(quote.price)+'/oz':'Unavailable');
  set('liveUpdated',quote?when(quote.at):'No current gold spot rate');
  set('livePosition',mark?usd(mark.exposure):'Unpriced');
  set('liveUnrealized',mark?usd(mark.unrealized):'Unpriced');
  set('liveRealized',usd(state.realizedPnl));
  set('liveFees',usd(state.fees));set('liveTrades',state.completedPaperTrades);
  set('liveLastSignal',Number.isFinite(state.lastSignal)?state.lastSignal.toFixed(4)+'%':'Five-minute indicator warming');
  set('liveLastDecision',state.lastDecision);
  set('liveMarketBid',quote?usd(quote.bid):'—');set('liveMarketAsk',quote?usd(quote.ask):'—');
  set('liveMiniEquity',mark?usd(mark.equity):usd(state.cash));
  set('liveMiniPnl',pnl===null?'Gold mark unavailable':usd(pnl)+' virtual P/L');
  set('liveMiniSource',sourceStatus);
  set('liveTicks',String(state.curve.length));
  const warning=warming?'Gold spot prices are visible. A fresh 21-bar five-minute signal history is required before virtual trading begins.':
    state.halted?'Paper account halted by a risk limit.':
    state.paused?'Gold simulation paused. No virtual decisions.':
    state.interruption?'Indicative gold feed interruption. Review and resume when fresh, no missed trades backfilled.':
    marketReady?'Gold indicative spot and five-minute signal data available. Virtual fills use ASSUMED spread, not dealer quotes.':
    lastError||'Waiting for live XAU/USD indicative price and enough contiguous five-minute bars.';
  set('liveWarning',warning);set('liveStateDetail',warning);
  set('livePause',state.paused?'Resume session':'Pause session');
  $('liveResumeGap').disabled=!state.interruption||!marketReady;
  const pill=$('liveConnection');pill.className='realtime-pill '+(marketReady?'ok':'bad');
  for(const id of ['liveProfit','liveProfitPercent','liveMiniPnl'])tone(id,pnl);
  curve();journal();lastPaint=Date.now();
}
function exportJournal(){
  const payload={mode:'PAPER_ONLY',instrument:'XAU/USD',unit:'troy ounce',exportedAt:new Date().toISOString(),
    note:'Indicative gold price, assumed spread/fee/slippage, browser-local paper-only activity.',state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='xau-usd-paper-journal-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.addEventListener('DOMContentLoaded',()=>{
  state=read()||Core.create();
  $('livePause')?.addEventListener('click',()=>{
    state.paused=!state.paused;
    if(!state.paused&&bars.length)state.lastBar=bars.at(-1).time;
    state.lastDecision=state.paused?'Gold paper session paused':'Gold session resumed without backfilling missed signals';
    save(true);render();
  });
  $('liveResumeGap')?.addEventListener('click',()=>{
    if(!marketReady||!quote||!Core.fresh(quote,Date.now()))return;
    state.interruption=false;
    state.lastBar=bars.at(-1)?.time??null;
    state.lastQuoteAt=quote.at;
    state.updatedAt=Date.now();
    state.lastDecision='Gold-only simulation resumed; missed sessions skipped';
    save(true);render();
  });
  $('liveReset')?.addEventListener('click',()=>{
    if(!window.confirm('Reset this browser-local GOLD-only virtual account and its transactions? Export first if needed.'))return;
    state=Core.create();save(true);render();
  });
  $('liveExport')?.addEventListener('click',exportJournal);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&Date.now()-(state?.updatedAt||0)>900000){
      state.interruption=true;state.lastDecision='Gold market missed while browser inactive. Resume after reviewing.';
      update();
    }
  });
  window.addEventListener('beforeunload',()=>save(true));
  render();update();
  setInterval(()=>{if(document.visibilityState==='visible')update();},60000);
  setInterval(()=>{if(Date.now()-lastPaint>15000)render();},15000);
});
})();
