/* Read-only model research visualization, no broker controls or live order actions. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const format=v=>Number.isFinite(v)?(v>0?'+':'')+v.toFixed(4)+'%':'—';
const clamp=v=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):null;
function text(id,s){const el=$(id);if(el)el.textContent=String(s);}
function cell(row,value,css){
 const td=document.createElement('td');td.textContent=String(value);
 if(css)td.className=css;row.append(td);
}
function metric(id,v){
 const el=$(id);if(!el)return;
 el.textContent=format(v);el.classList.toggle('positive',v>0);el.classList.toggle('negative',v<0);
}
function renderSwing(d,error){
 const node=$('swingRows');if(!node)return;node.replaceChildren();
 if(!d||d.symbol!=='XAU/USD'||d.promotion?.status!=='NOT_APPROVED'){
  text('swingBars','Unavailable');text('swingFolds','—');
  text('swingStatus','Multi-year research is unavailable: '+(error||'Invalid research response')+
    '. No model is approved. No synthetic history is substituted.');
  const r=document.createElement('tr');cell(r,'No verified multi-year gold test results');cell(r,'—');cell(r,'—');cell(r,'—');node.append(r);
  return;
 }
 text('swingBars',d.data.bars);
 text('swingFolds',d.outOfSample.folds);
 metric('swingReturn',d.outOfSample.meanReturnPct);
 metric('swingBaseline',d.outOfSample.meanFixedTrendPct);
 metric('swingStress',d.outOfSample.meanDoubleCostPct);
 text('swingPositive',d.outOfSample.positiveFolds+' / '+d.outOfSample.folds);
 text('swingStatus','XAU/USD · '+d.data.calendarYears+' years of reported DAILY CLOSES · '+
  d.outOfSample.totalVirtualOrders+' hypothetical entries/exits across held-out periods · strategy not approved.');
 const names={'TREND_20_60':'20/60-day trend','TREND_50_200':'50/200-day trend',
   'BREAKOUT_55_20':'55-day breakout','LEARNED_LOGIT':'Trained logistic','CASH':'Cash'};
 for(const f of d.folds){
  const r=document.createElement('tr');
  cell(r,'#'+f.fold+' · '+new Date(f.testStart).toISOString().slice(0,10)+' UTC');
  cell(r,names[f.selection]||f.selection);
  cell(r,format(f.testReturnPct),f.testReturnPct>0?'positive':f.testReturnPct<0?'negative':'');
  cell(r,format(f.doubleCostReturnPct),f.doubleCostReturnPct>0?'positive':f.doubleCostReturnPct<0?'negative':'');
  node.append(r);
 }
}

async function refreshAgentStatus(){
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),13000);
  let response;
  try{response=await fetch('/api/agents',{cache:'no-store',signal:controller.signal});}
  finally{clearTimeout(timeout);}
  const data=await response.json();
  if(!response.ok||data.symbol!=='XAU/USD'||data.liveBrokerOrders!==false||
     !Array.isArray(data.agents)||data.agents.length!==7)
    throw Error(data.detail||'Unexpected backend research state');
  const last=data.latest;
  if(!last){text('agentOverall','No completed research run yet');text('agentLastRun','First GitHub Actions run not available');return;}
  const result=data.status==='LAST_RUN_PASSED'?'Last run passed':
    data.status==='RUN_IN_PROGRESS'?'Research jobs in progress':'Last run needs review';
  text('agentOverall',result);
  text('agentLastRun','Started '+new Date(last.at).toLocaleString('en-US',
   {timeZone:'America/Guyana',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+
   ' Guyana time · '+String(last.result||last.state||'pending').toUpperCase());
  const link=$('agentWorkflowLink');
  if(link&&typeof last.url==='string'&&last.url.startsWith('https://github.com/ragunauthramsaroop/PrismBay/actions/runs/')){
   link.href=last.url;link.textContent='View latest agent run ↗';
  }
 }catch(e){text('agentOverall','Status temporarily unavailable');
   text('agentLastRun','GitHub run metadata unavailable. The schedule and paper-only controls remain unchanged.');}
}

let busy=false;
async function refresh(){
 if(busy)return;busy=true;
 try{
   const controller=new AbortController();
   const stop=setTimeout(()=>controller.abort(),24000);
   let result;
   try{result=await fetch('/api/research',{cache:'no-store',signal:controller.signal});}
   finally{clearTimeout(stop);}
   const body=await result.json();
   if(!result.ok||body.tradingMode!=='RESEARCH_ONLY'||body.liveOrders!==0||
      body.livePromotion!=='DISABLED'||body.research?.symbol!=='XAU/USD')
     throw Error(body.detail||body.error||'Invalid gold-only research response');
   renderSwing(body.longHorizon,body.longHorizonError);
   const d=body.research,stats=d.outOfSample;
   text('researchFolds',stats.folds);
   metric('researchReturn',stats.meanFoldReturnPct);
   metric('researchStress',stats.meanFoldDoubleCostPct);
   text('researchPositive',stats.positiveFolds+' / '+stats.folds);
   text('researchStatus','XAU/USD only · '+d.data.bars+' five-minute bars across '+d.data.elapsedDays+
     ' calendar days · historical gold chart proxy · not enough market regimes for real-money use');
   const foldBody=$('researchFoldRows');foldBody.replaceChildren();
   const name=Object.fromEntries([
    ['SMA_8_21','8/21 trend'],['SMA_12_36','12/36 trend'],
    ['BREAKOUT_18_8','18-bar breakout'],['LEARNED_LOGIT','Trained model'],['CASH','Cash / no trade']]);
   for(const f of d.folds){
     const tr=document.createElement('tr');
     cell(tr,'#'+f.fold+' · '+new Date(f.testStart).toISOString().slice(0,16).replace('T',' ')+' UTC');
     cell(tr,name[f.selection]||f.selection);
     cell(tr,format(f.oos),f.oos>0?'positive':f.oos<0?'negative':'');
     cell(tr,format(f.doubleCostOos),f.doubleCostOos>0?'positive':f.doubleCostOos<0?'negative':'');
     cell(tr,f.oosBuys+' buy / '+f.oosSells+' sell');
     foldBody.append(tr);
   }
   const shadow=body.shadow;
   const p=shadow?.probabilityUpNextBar;
   text('researchShadowProbability',Number.isFinite(p)?clamp(p*100).toFixed(1)+'%':'Insufficient continuous data');
   text('researchShadowTrend',shadow?.marketDataFresh?
     (shadow.trend8x21==='UPTREND_RULE'?'Uptrend rule observed':'No trend entry'):'Stale · market data delayed');
   text('researchShadowTime',shadow?.asOf?new Date(shadow.asOf).toISOString().slice(0,16).replace('T',' ')+' UTC':'—');
 }catch(e){
   text('researchStatus','Research unavailable: '+String(e.message||e)+'. No strategy approved for live trading.');
   text('researchFolds','Unavailable');
   renderSwing(null,'Short-term research endpoint unavailable');
   text('researchShadowProbability','Unavailable');
   const body=$('researchFoldRows');if(body){body.replaceChildren();const r=document.createElement('tr'),c=document.createElement('td');c.colSpan=5;c.className='no-data';c.textContent='Gold research data unavailable. Retry when the historical feed recovers.';r.append(c);body.append(r);}
 }finally{busy=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
 refresh();refreshAgentStatus();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();refreshAgentStatus();}});
 setInterval(()=>{if(!document.hidden){refresh();refreshAgentStatus();}},600000);
});
})();
