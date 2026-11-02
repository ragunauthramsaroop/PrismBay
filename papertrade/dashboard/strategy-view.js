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
   text('researchShadowProbability',Number.isFinite(p)?(100*clamp(p*100)/100).toFixed(1)+'%':'Insufficient continuous data');
   text('researchShadowTrend',shadow?.marketDataFresh?
     (shadow.trend8x21==='UPTREND_RULE'?'Uptrend rule observed':'No trend entry'):'Stale · market data delayed');
   text('researchShadowTime',shadow?.asOf?new Date(shadow.asOf).toISOString().slice(0,16).replace('T',' ')+' UTC':'—');
 }catch(e){
   text('researchStatus','Research unavailable: '+String(e.message||e)+'. No strategy approved for live trading.');
   text('researchFolds','Unavailable');
   text('researchShadowProbability','Unavailable');
   const body=$('researchFoldRows');if(body){body.replaceChildren();const r=document.createElement('tr'),c=document.createElement('td');c.colSpan=5;c.className='no-data';c.textContent='Gold research data unavailable. Retry when the historical feed recovers.';r.append(c);body.append(r);}
 }finally{busy=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
 refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},600000);
});
})();
