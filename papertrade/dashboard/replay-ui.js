/* Actual historical BTC data playback. Entirely browser-local virtual trading. */
(function(){
'use strict';
const Replay=window.PaperReplay;
if(!Replay)throw Error('Historical simulation engine not loaded');
const $=id=>document.getElementById(id);
const money=v=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v):'—';
const signed=v=>Number.isFinite(v)?((v>=0?'+':'')+v.toFixed(3)+'%'):'—';
const quant=(n,d=6)=>Number.isFinite(n)?n.toFixed(d):'—';
let session=null,loading=false,timer=null,interval=155,lastDataset=null,eventsRendered=0;
const time=t=>t?new Date(t).toISOString().replace('T',' ').slice(0,16)+' UTC':'—';
function set(id,v){const n=$(id);if(n)n.textContent=String(v);}
function valueTone(id,val){const n=$(id);if(!n)return;n.classList.toggle('positive',Number.isFinite(val)&&val>0);n.classList.toggle('negative',Number.isFinite(val)&&val<0);}
function buttonState(){
  const ready=!!session&&!loading;
  const active=!!timer;
  for(const id of ['simPlay','simStep','simFinish','simReset','simExport'])$(id).disabled=!ready;
  if(ready){
    $('simPlay').disabled=session.finished;
    $('simPlay').textContent=session.finished?'✓ Simulation complete':active?'⏸ Pause replay':'▶ Play replay';
    $('simStep').disabled=active||session.finished;
    $('simFinish').disabled=session.finished;
  }
}
function stop(){if(timer){clearInterval(timer);timer=null;}if(session)session.paused=true;buttonState();}
async function load(){
  stop();loading=true;session=null;lastDataset=null;eventsRendered=0;buttonState();
  const hours=Number($('simPeriod').value);
  set('simDatasetStatus','Retrieving actual Coinbase BTC-USD 1-minute prices...');
  set('simDatasetDetail','Genuine historical prices. Every virtual transaction is hypothetical and includes estimated trading costs.');
  set('simDecision','Waiting for verified price history');
  set('simProgressText','Loading '+hours+' historical hours');
  const controller=new AbortController();
  const watchdog=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch('/api/replay?hours='+hours,{cache:'no-store',signal:controller.signal});
    const data=await r.json();
    if(!r.ok||data.mode!=='HISTORICAL_REPLAY_ONLY'||!data.noRealOrders)
      throw Error(data.detail||data.error||'Historical price service unavailable');
    if(!Array.isArray(data.bars)||data.bars.length<60||data.coveragePct<97)
      throw Error('Insufficient source candle integrity');
    lastDataset=data;
    session=Replay.create(data.bars,{source:data.source});
    set('simDatasetStatus','Real BTC historical candles loaded · '+data.candleCount+' minutes · '+data.coveragePct+'% coverage');
    set('simDatasetDetail','Recorded prices: '+time(data.bars[0].time)+' to '+time(data.bars[data.bars.length-1].time)+'. All fills are estimated, not actual broker executions.');
    render();
    if(new URLSearchParams(location.search).get('tab')==='simulation')play();
  }catch(e){
    set('simDatasetStatus','Historical replay unavailable');
    set('simDatasetDetail',String(e.message||e)+'. Click Restart to retry or try another period.');
    set('simProgressText','No transactions generated');
  }finally{clearTimeout(watchdog);loading=false;buttonState();}
}
function step(count=1){
  if(!session||session.finished)return;
  const before=session.fills.length;
  Replay.advance(session,count);
  session.paused=!timer;
  if(session.finished)stop();
  render();
  if(session.fills.length>before){const el=$('simJournalStatus');if(el)el.classList.add('sim-pulse');}
}
function play(){
  if(!session||session.finished)return;
  if(timer){stop();return;}
  session.paused=false;
  timer=setInterval(()=>{
    if(document.hidden){stop();set('simStage','Replay paused because the browser tab is hidden');return;}
    const batch=Number($('simSpeed').value)||5;
    step(batch);
  },interval);
  buttonState();
}
function complete(){
  if(!session||session.finished)return;
  stop();
  // Strategy rules remain chronological. This loops through each historical minute.
  while(!session.finished)Replay.advance(session,Math.min(120,session.bars.length-session.position));
  render();buttonState();
}
function renderJournal(){
  const body=$('simJournal');body.replaceChildren();
  const fills=session?.fills||[];
  set('simJournalStatus',fills.length+' virtual fills');
  if(!fills.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.className='no-data';td.textContent='No entry or exit signal has occurred yet. Progress the replay to test additional candles.';tr.append(td);body.append(tr);return;}
  fills.slice(-80).reverse().forEach(fill=>{
    const tr=document.createElement('tr');
    const vals=[time(fill.at),fill.side,quant(fill.qty,7),money(fill.price),money(fill.fee),fill.profit==null?'Open virtual position':money(fill.profit),fill.reason];
    vals.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===1)td.className=fill.side==='BUY'?'positive':'negative';if(i===5&&fill.profit!==null)td.className=fill.profit>=0?'positive':'negative';tr.append(td);});body.append(tr);
  });
}
function drawChart(){
  const target=$('simPriceChart');
  if(!session||session.history.length<2){target.replaceChildren();target.append(document.createTextNode('Run the replay to see real BTC price movements and simulated trades.'));return;}
  const points=session.history;
  const vals=points.map(x=>x.price),lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(hi-lo,10),lower=lo-span*.14,upper=hi+span*.14;
  const W=890,H=300,P=22,right=56,top=24,bottom=34;
  const xx=i=>P+(W-right-P)*i/Math.max(1,points.length-1);
  const yy=n=>top+(H-top-bottom)*(upper-n)/(upper-lower);
  const path=points.map((p,i)=>(i?'L':'M')+xx(i).toFixed(2)+' '+yy(p.price).toFixed(2)).join(' ');
  const area=path+' L '+xx(points.length-1).toFixed(2)+' '+(H-bottom)+' L '+P+' '+(H-bottom)+' Z';
  const grid=[0,.33,.67,1].map(fr=>{
    const price=lower+fr*(upper-lower),y=yy(price).toFixed(1);
    return '<line x1="'+P+'" y1="'+y+'" x2="'+(W-right)+'" y2="'+y+'" stroke="#284254" stroke-dasharray="4 7"/><text x="'+(W-right+7)+'" y="'+y+'" fill="#93a9bb" font-size="10">'+(price/1000).toFixed(1)+'k</text>';
  }).join('');
  const markers=session.fills.slice(-70).filter(f=>f.index>=session.firstIndex&&f.index<session.position).map(f=>{
    const idx=f.index-session.firstIndex;
    const x=xx(idx).toFixed(1),y=yy(f.price).toFixed(1);
    const col=f.side==='BUY'?'#5ff2ce':'#ff9caa';
    return '<circle cx="'+x+'" cy="'+y+'" r="10" fill="#101d2a" stroke="'+col+'" stroke-width="2.2"/><text x="'+x+'" y="'+(Number(y)+3.5)+'" font-size="10" text-anchor="middle" fill="'+col+'" font-weight="bold">'+(f.side==='BUY'?'B':'S')+'</text>';
  }).join('');
  const labels=[0,Math.floor(points.length/2),points.length-1].map(i=>{
    const x=xx(i).toFixed(1);
    const str=new Date(points[i].time).toISOString().slice(11,16);
    return '<text x="'+x+'" y="'+(H-8)+'" font-size="11" fill="#8ba1b5" text-anchor="'+(i===0?'start':i===points.length-1?'end':'middle')+'">'+str+' UTC</text>';
  }).join('');
  target.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Price history revealed over time, with virtual buy and sell markers"><defs><linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ee0c0" stop-opacity=".22"/><stop offset="100%" stop-color="#4ee0c0" stop-opacity="0"/></linearGradient></defs>'+grid+'<path d="'+area+'" fill="url(#simGrad)"/><path d="'+path+'" fill="none" stroke="#58e1bf" stroke-width="2.8" stroke-linejoin="round"/>'+markers+labels+'</svg>';
}
function render(){
  if(!session)return;
  const x=Replay.metrics(session);
  set('simEquity',money(x.equity));set('simPnl',money(x.pnl));set('simPnlPct',signed(x.pnlPct)+' against starting virtual cash');
  set('simPrice',money(x.lastPrice));set('simTrades',x.buys+x.sells);
  set('simWinRate',x.sells+' closed trades · '+(x.winRate===null?'No win rate yet':x.winRate.toFixed(1)+'% winning'));
  set('simCash',money(x.cash));set('simUnits',quant(x.btcUnits,8)+' BTC');
  set('simPosition',money(x.positionValue));set('simFees',money(x.fees));set('simRealized',money(x.realizedPnl));
  set('simUnrealized',money(x.unrealizedPnl));set('simDrawdown',x.drawdownPct.toFixed(3)+'%');
  set('simBenchmark',money(x.btcBenchmark)+' ('+signed(x.btcBenchmarkPct)+')');
  set('simLastSignal',session.state.lastSignal==null?'No signal calculated':'Last 8/21 SMA signal '+session.state.lastSignal.toFixed(4)+'%');
  set('simDecision',x.lastAction?x.lastAction.side+' @ '+money(x.lastAction.price)+' · '+x.lastAction.reason:session.state.lastDecision);
  set('simStage',x.finished?x.stage+' · historical replay only':session.paused?'PAUSED · historical replay only':'PLAYING · historical replay only');
  set('simTime',time(x.time));set('simProgressText',x.steps+' of '+x.totalSteps+' completed virtual minutes · '+x.buys+' BUY · '+x.sells+' SELL');
  $('simProgressBar').style.width=(100*x.steps/x.totalSteps).toFixed(2)+'%';
  valueTone('simPnl',x.pnl);valueTone('simPnlPct',x.pnlPct);valueTone('simRealized',x.realizedPnl);valueTone('simUnrealized',x.unrealizedPnl);
  renderJournal();drawChart();buttonState();
}
function exportResults(){
  if(!session)return;
  const report={mode:'HISTORICAL_REPLAY_ONLY',source:lastDataset?.source,
    windowHours:Number($('simPeriod').value),retrievedAt:lastDataset?.retrievedAt,
    assumptions:lastDataset?.assumptions,completed:session.finished,
    performance:Replay.metrics(session),virtualFills:session.fills,
    chart:session.history.map(x=>({utc:new Date(x.time).toISOString(),price:x.price,equity:x.equity,benchmark:x.btcBenchmark}))};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='papertrade-historical-replay-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.addEventListener('DOMContentLoaded',()=>{
  $('simPlay').addEventListener('click',play);
  $('simStep').addEventListener('click',()=>step(1));
  $('simFinish').addEventListener('click',complete);
  $('simReset').addEventListener('click',()=>{if(!lastDataset){load();return;}stop();session=Replay.create(lastDataset.bars,{source:lastDataset.source});render();});
  $('simExport').addEventListener('click',exportResults);
  $('simPeriod').addEventListener('change',load);
  window.addEventListener('beforeunload',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&timer)stop();});
  load();
});
})();
