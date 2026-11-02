/* XAU/USD multi-year daily swing research. Read-only, not a trading adapter.
 * Chronological holdouts, end-of-training selection, prior-close to later-close observations.
 * Indicative XAUS daily gold closes WITHOUT daily opening prices or dealer fills.
 */
'use strict';
const SYMBOL='XAU/USD',DAY=86400000;
const CFG=Object.freeze({initial:10000,allocation:.10,fee:.0015,slippage:.001,
 halfSpread:.00005,stopPct:.07,equityHalt:.10,minTrain:504,testBars:63,lookback:756});
const STRATEGIES=Object.freeze([
 {id:'TREND_20_60',label:'20/60-day trend',type:'sma',fast:20,slow:60,threshold:.002},
 {id:'TREND_50_200',label:'50/200-day trend',type:'sma',fast:50,slow:200,threshold:.002},
 {id:'BREAKOUT_55_20',label:'55-day high breakout',type:'breakout',entry:55,exit:20},
 {id:'LEARNED_LOGIT',label:'Daily train-only logistic',type:'ml',entry:.61,exit:.47},
 {id:'CASH',label:'No-trade safety control',type:'cash'}
]);
const finite=Number.isFinite;
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
function validate(records){
 if(!Array.isArray(records)||records.length<CFG.minTrain+CFG.testBars*2)
  throw Error('Not enough multi-year XAU/USD daily candles for held-out research');
 const bars=records.map(r=>({time:Number(r.time),close:Number(r.close),
  high:Number(r.high),low:Number(r.low)}));
 for(let i=0;i<bars.length;i++){
  const b=bars[i],p=bars[i-1];
  if(!Object.values(b).every(finite)||b.low<=0||b.close<=0||
    b.high<Math.max(b.close,b.low)||b.low>b.close||
    (p&&b.time<=p.time))throw Error('Invalid or unsorted daily XAU chart');
 }
 return bars;
}
function gap(bars,i){return i>0&&bars[i].time-bars[i-1].time>7*DAY;}
function closeAvg(bars,i,n){
 if(i<n-1)return null;
 let sum=0;for(let k=i-n+1;k<=i;k++)sum+=bars[k].close;
 return sum/n;
}
function features(bars,i){
 if(i<200)return null;
 const c=bars[i].close;
 const ret=n=>Math.log(c/bars[i-n].close);
 const vals=Array.from({length:20},(_,k)=>Math.log(bars[i-k].close/bars[i-k-1].close));
 const vol=Math.sqrt(avg(vals.map(z=>z*z)));
 return [ret(1)*10,ret(20)*3,ret(60)*2,
  (closeAvg(bars,i,20)/closeAvg(bars,i,60)-1)*5,
  vol*10,(bars[i].high-bars[i].low)/c*10];
}
const sigma=z=>1/(1+Math.exp(-Math.max(-25,Math.min(25,z))));
function train(bars,start,end){
 const observations=[];
 for(let i=Math.max(start+200,200);i<end-1;i++){
  const f=features(bars,i);
  if(f&&!gap(bars,i+1))observations.push({f,y:bars[i+1].close>bars[i].close?1:0});
 }
 if(observations.length<180)return null;
 const width=observations[0].f.length;
 const means=Array.from({length:width},(_,k)=>avg(observations.map(v=>v.f[k])));
 const std=means.map((m,k)=>Math.max(.0001,Math.sqrt(avg(observations.map(v=>(v.f[k]-m)**2)))));
 const X=observations.map(v=>[1,...v.f.map((x,k)=>Math.max(-5,Math.min(5,(x-means[k])/std[k])))]);
 let w=Array(width+1).fill(0);
 for(let epoch=0;epoch<110;epoch++){
  const g=Array(w.length).fill(0);
  for(let i=0;i<X.length;i++){
   const p=sigma(X[i].reduce((sum,v,k)=>sum+v*w[k],0)),err=p-observations[i].y;
   for(let j=0;j<g.length;j++)g[j]+=err*X[i][j];
  }
  for(let j=0;j<w.length;j++)w[j]-=.07*(g[j]/X.length+(j===0?0:.06*w[j]));
 }
 return {weights:w,means,std,samples:observations.length,lastLabelEnd:bars[end-1].time};
}
function prob(model,bars,i){
 if(!model)return null;
 const f=features(bars,i);if(!f)return null;
 const x=[1,...f.map((v,k)=>Math.max(-5,Math.min(5,(v-model.means[k])/model.std[k])))];
 return sigma(x.reduce((sum,v,k)=>sum+v*model.weights[k],0));
}
function desired(strategy,bars,index,held,model){
 if(strategy.id==='CASH')return false;
 if(strategy.type==='ml'){
  const p=prob(model,bars,index);
  return p===null?held:(held?p>=strategy.exit:p>=strategy.entry);
 }
 if(strategy.type==='sma'){
  const f=closeAvg(bars,index,strategy.fast),s=closeAvg(bars,index,strategy.slow);
  if(f===null||s===null)return false;
  const diff=f/s-1;
  return held?diff>-strategy.threshold:diff>strategy.threshold;
 }
 if(strategy.type==='breakout'){
  if(index<strategy.entry+1)return false;
  if(held){
   let min=Infinity;for(let j=index-strategy.exit;j<index;j++)min=Math.min(min,bars[j].low);
   return bars[index].close>=min;
  }
  let max=-Infinity;for(let j=index-strategy.entry;j<index;j++)max=Math.max(max,bars[j].high);
  return bars[index].close>max;
 }
 throw Error('Unknown research candidate');
}
function evaluate(bars,start,end,strategy,model,extraCost=1){
 if(!STRATEGIES.some(s=>s.id===strategy.id))throw Error('Unknown strategy');
 if(start<200||start>=end||end>bars.length||![1,2,3].includes(extraCost))
  throw Error('Invalid test window');
 const fee=CFG.fee*extraCost,slip=CFG.slippage*extraCost,spread=CFG.halfSpread*extraCost;
 let cash=CFG.initial,units=0,paid=0,entry=0,peak=CFG.initial,maxDD=0,dayAnchor=CFG.initial,
  closed=0,winners=0,buyCount=0,sellCount=0,halted=false,fees=0;
 function exit(price){
  if(units<=0)return;
  const proceeds=units*price*(1-spread-slip),charge=proceeds*fee;
  const result=proceeds-charge-paid;
  cash+=proceeds-charge;fees+=charge;closed++;sellCount++;if(result>0)winners++;
  units=0;paid=0;entry=0;
 }
 for(let i=start;i<end;i++){
  const b=bars[i],bid=b.close*(1-spread);
  const equity=cash+units*bid;
  peak=Math.max(peak,equity);maxDD=Math.max(maxDD,(peak-equity)/peak);
  if((peak-equity)/peak>=CFG.equityHalt){
   exit(b.close);halted=true;
  }
  if(units&&bid<entry*(1-CFG.stopPct))exit(b.close);
  // No new order across an extended market-data gap.
  const wants=!halted&&!gap(bars,i)&&desired(strategy,bars,i-1,units>0,model);
  if(units&&!wants&&!gap(bars,i))exit(b.close);
  else if(!units&&wants&&!halted){
   const budget=Math.min(cash,equity*CFG.allocation);
   const price=b.close*(1+spread+slip);
   const qty=budget/(price*(1+fee));
   if(qty>0&&qty*price*(1+fee)<=cash+1e-7){
    const charge=qty*price*fee;cash-=qty*price+charge;
    units=qty;entry=price;paid=qty*price+charge;fees+=charge;buyCount++;
   }
  }
  if(halted)break;
 }
 const last=bars[Math.min(end,bars.length)-1];
 const liquidation=units*last.close*(1-spread-slip)*(1-fee);
 const equity=cash+liquidation;
 return {returnPct:100*(equity/CFG.initial-1),equity,maxDrawdownPct:maxDD*100,
  buys:buyCount,sells:sellCount,closed,winners,fees,halted};
}
function walkForward(input){
 const bars=validate(input),folds=[];
 for(let trainEnd=CFG.minTrain;trainEnd+CFG.testBars<=bars.length;trainEnd+=CFG.testBars){
  const start=Math.max(0,trainEnd-CFG.lookback),model=train(bars,start,trainEnd);
  const candidates=STRATEGIES.filter(s=>s.id!=='CASH').map(s=>{
   const p=evaluate(bars,Math.max(start+200,200),trainEnd,s,model,1);
   return {id:s.id,...p,score:p.returnPct-.35*p.maxDrawdownPct-.012*p.buys};
  }).filter(p=>p.closed>0).sort((a,b)=>b.score-a.score);
  const win=candidates[0]?.score>0?STRATEGIES.find(s=>s.id===candidates[0].id):
   STRATEGIES.find(s=>s.id==='CASH');
  const oos=evaluate(bars,trainEnd,trainEnd+CFG.testBars,win,model,1);
  const doubled=evaluate(bars,trainEnd,trainEnd+CFG.testBars,win,model,2);
  const trend=evaluate(bars,trainEnd,trainEnd+CFG.testBars,STRATEGIES[0],null);
  folds.push({fold:folds.length+1,trainStart:bars[start].time,trainEnd:bars[trainEnd-1].time,
   testStart:bars[trainEnd].time,testEnd:bars[trainEnd+CFG.testBars-1].time,
   modelTrainingEnd:model?.lastLabelEnd??null,
   selection:win.id,trainingScore:candidates[0]?.score??null,
   testReturnPct:oos.returnPct,doubleCostReturnPct:doubled.returnPct,
   trendBenchmarkReturnPct:trend.returnPct,testOrders:oos.buys+oos.sells,
   maxDrawdownPct:oos.maxDrawdownPct});
 }
 if(folds.length<3)throw Error('Not enough unseen gold daily windows');
 const mean=key=>avg(folds.map(f=>f[key]));
 const testOrders=folds.reduce((n,f)=>n+f.testOrders,0);
 const selected=Object.fromEntries(STRATEGIES.map(c=>[c.id,folds.filter(f=>f.selection===c.id).length]));
 return {
  symbol:SYMBOL,mode:'RESEARCH_ONLY',timeframe:'1d',
  source:'XAUS public five-year daily gold close/range history, no open or dealer quotes',
  generatedAt:new Date().toISOString(),
  data:{bars:bars.length,first:new Date(bars[0].time).toISOString(),
    last:new Date(bars[bars.length-1].time).toISOString(),
    calendarYears:Number(((bars.at(-1).time-bars[0].time)/DAY/365.25).toFixed(2))},
  methods:{trainBars:CFG.minTrain,testBars:CFG.testBars,trainingDaysApprox:2*252,
    candidates:STRATEGIES.map(x=>x.id),maxAllocationPct:CFG.allocation*100,
    estimatedCostBpsPerSide:(CFG.fee+CFG.slippage+CFG.halfSpread)*10000,
    execution:'Hypothetical next-daily-close proxy, NOT next open or executable close',
    doubleCostStress:true,noLookahead:true,leverage:0},
  outOfSample:{folds:folds.length,meanReturnPct:mean('testReturnPct'),
    meanDoubleCostPct:mean('doubleCostReturnPct'),
    meanFixedTrendPct:mean('trendBenchmarkReturnPct'),
    positiveFolds:folds.filter(f=>f.testReturnPct>0).length,
    totalVirtualOrders:testOrders,maxFoldDrawdownPct:Math.max(...folds.map(x=>x.maxDrawdownPct)),
    note:'Prior-close signal, hypothetical following daily-close valuation only. No actual daily open or executable closing quote. Each held-out 63-bar test resets $10,000. Do not compound mean returns.'},
  selectionCounts:selected,folds,
  promotion:{status:'NOT_APPROVED',reason:'Five-year daily close-to-close proxy is not executable. Missing daily open, dealer bid/ask and financing. Needs independent forward evidence and explicit owner authorization.',realOrders:0}
 };
}
module.exports={CFG,STRATEGIES,validate,features,train,prob,desired,evaluate,walkForward};
