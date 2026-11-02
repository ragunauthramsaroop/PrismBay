/* Gold-only research laboratory.
 * Research on historic indicative five-minute XAU chart data, never broker fills.
 * Walk-forward model selection: train only on earlier bars, test on later unseen bars.
 * No account APIs, live orders, credential access, leverage, or auto-deployment.
 */
'use strict';
const SOURCE='XAU/USD';
const STEP=300000;
const SETTINGS=Object.freeze({
  virtualCash:10000, maxAllocation:.10, fee:.0015, slippage:.001,
  assumedHalfSpread:.00005, priceStop:.008,
  equityStop:.10, dailyStop:.025,
  minTraining:300, testSize:90, trainLookback:480,
  minimumLookback:60
});
const CONFIGS=[
  {id:'SMA_8_21',label:'8/21-bar trend filter',type:'sma',fast:8,slow:21,threshold:.0007},
  {id:'SMA_12_36',label:'12/36-bar trend filter',type:'sma',fast:12,slow:36,threshold:.0008},
  {id:'BREAKOUT_18_8',label:'18-bar breakout / 8-bar exit',type:'breakout',entry:18,exit:8},
  {id:'LEARNED_LOGIT',label:'Training-only logistic baseline',type:'ml',threshold:.60,exit:.47},
  {id:'CASH',label:'Cash / no-trade baseline',type:'cash'}
];
function mean(xs){return xs.reduce((a,b)=>a+b,0)/xs.length;}
function finite(x){return Number.isFinite(x);}
function validate(rows){
  if(!Array.isArray(rows)||rows.length<SETTINGS.minTraining+SETTINGS.testSize*2)
    throw Error('Insufficient XAU history for a walk-forward research evaluation');
  const bars=rows.map(x=>({time:Number(x.time),open:Number(x.open),high:Number(x.high),
    low:Number(x.low),close:Number(x.close),volume:Number(x.volume??0)}));
  for(let i=0;i<bars.length;i++){
    const b=bars[i],p=bars[i-1];
    if(!Object.values(b).every(finite)||b.time<=0||b.open<=0||b.close<=0||b.low<=0||
      b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close)||
      (p&&b.time<=p.time)||b.volume<0)throw Error('Invalid or nonchronological XAU candles');
  }
  return bars;
}
function consecutive(bars,index,required){
  if(index<required-1)return false;
  for(let i=index-required+2;i<=index;i++){
    if(bars[i].time-bars[i-1].time!==STEP)return false;
  }
  return true;
}
function avgClose(bars,end,n){
  let sum=0;
  for(let i=end-n+1;i<=end;i++)sum+=bars[i].close;
  return sum/n;
}
function features(bars,i){
  if(i<60||!consecutive(bars,i,60))return null;
  const c=bars[i].close,ret=n=>Math.log(c/bars[i-n].close);
  const ratios=[];
  for(let j=i-11;j<=i;j++)ratios.push(Math.log(bars[j].close/bars[j-1].close));
  const vol=Math.sqrt(mean(ratios.map(v=>v*v)));
  return [ret(1)*100,ret(6)*50,ret(24)*20,
    (avgClose(bars,i,8)/avgClose(bars,i,21)-1)*100,
    vol*100,(bars[i].high-bars[i].low)/c*100];
}
function sigmoid(z){return 1/(1+Math.exp(-Math.max(-25,Math.min(25,z))));}
function modelTrain(bars,start,end) {
  // Target uses next bar close. The last target t=end-2 is inside the TRAIN range.
  const samples=[];
  for(let i=Math.max(start+60,60);i<end-1;i++){
    const f=features(bars,i);
    if(f&&bars[i+1].time-bars[i].time===STEP) {
      samples.push({f,label:bars[i+1].close>bars[i].close?1:0});
    }
  }
  if(samples.length<120)return null;
  const count=samples[0].f.length;
  const meanX=Array.from({length:count},(_,k)=>mean(samples.map(v=>v.f[k])));
  const stdX=meanX.map((v,k)=>Math.max(.001,Math.sqrt(mean(samples.map(s=>(s.f[k]-v)**2)))));
  const vec=s=>[1,...s.f.map((v,k)=>Math.max(-5,Math.min(5,(v-meanX[k])/stdX[k])))];
  const X=samples.map(vec),y=samples.map(s=>s.label);
  let weights=Array(count+1).fill(0);
  // Batch gradient descent, deterministic and trained exclusively on historical bars.
  for(let epoch=0;epoch<100;epoch++){
    const grad=Array(weights.length).fill(0);
    for(let i=0;i<X.length;i++){
      const p=sigmoid(X[i].reduce((s,v,k)=>s+v*weights[k],0));
      for(let k=0;k<grad.length;k++)grad[k]+=(p-y[i])*X[i][k];
    }
    for(let k=0;k<weights.length;k++){
      const regularize=k===0?0:.05*weights[k];
      weights[k]-=.08*(grad[k]/X.length+regularize);
    }
  }
  return {weights,means:meanX,stds:stdX,samples:samples.length,lastTrainBarTime:bars[end-1].time};
}
function probability(model,bars,i){
  if(!model)return null;
  const f=features(bars,i);if(!f)return null;
  const v=[1,...f.map((n,k)=>Math.max(-5,Math.min(5,(n-model.means[k])/model.stds[k])))];
  return sigmoid(v.reduce((s,n,k)=>s+n*model.weights[k],0));
}
function signal(config,bars,index,isLong,model){
  if(config.type==='cash')return false;
  if(config.type==='ml'){
    const p=probability(model,bars,index);
    if(p===null)return isLong;
    return isLong?p>=config.exit:p>=config.threshold;
  }
  if(config.type==='sma'){
    if(!consecutive(bars,index,config.slow))return isLong;
    const ratio=avgClose(bars,index,config.fast)/avgClose(bars,index,config.slow)-1;
    return isLong?ratio>-config.threshold:ratio>config.threshold;
  }
  if(config.type==='breakout'){
    const needed=Math.max(config.entry,config.exit)+1;
    if(!consecutive(bars,index,needed))return isLong;
    if(isLong){
      const lows=bars.slice(index-config.exit,index).map(b=>b.low);
      return bars[index].close>=Math.min(...lows);
    }
    const highs=bars.slice(index-config.entry,index).map(b=>b.high);
    return bars[index].close>Math.max(...highs);
  }
  throw Error('Unknown gold strategy');
}
function simulate(bars,start,end,config,model,options={}){
  if(!config||!CONFIGS.some(x=>x.id===config.id))throw Error('Invalid strategy');
  if(start<60||end>bars.length||start>=end)throw Error('Invalid historical evaluation range');
  const costMultiplier=Number(options.costMultiplier??1);
  if(!finite(costMultiplier)||costMultiplier<1||costMultiplier>4)throw Error('Invalid cost scenario');
  const fee=SETTINGS.fee*costMultiplier;
  const slip=SETTINGS.slippage*costMultiplier;
  const halfSpread=SETTINGS.assumedHalfSpread*costMultiplier;
  let cash=SETTINGS.virtualCash,units=0,paid=0,entry=0,peak=cash,peakDd=0,
    dayAnchor=cash,day='',closed=0,wins=0,buys=0,sells=0,halted=false,events=[];
  const sell=(b,reason)=>{
    if(units<=0)return;
    const price=b.open*(1-halfSpread-slip);
    const gross=units*price,charge=gross*fee,realized=gross-charge-paid;
    cash+=gross-charge;
    events.push({side:'SELL',time:b.time,price,qty:units,fee:charge,realized,reason});
    if(realized>0)wins++;closed++;sells++;units=0;paid=0;entry=0;
  };
  for(let i=start;i<end;i++){
    const b=bars[i],bid=b.open*(1-halfSpread);
    const utcDay=new Date(b.time).toISOString().slice(0,10);
    if(day!==utcDay){day=utcDay;dayAnchor=cash+units*bid;}
    const equity=cash+units*bid;
    peak=Math.max(peak,equity);
    peakDd=Math.max(peakDd,1-equity/peak);
    const riskStop=(peak-equity)/peak>=SETTINGS.equityStop||
      (dayAnchor-equity)/dayAnchor>=SETTINGS.dailyStop;
    if(riskStop) {
      sell(b,'risk_halt');
      halted=true;
    }
    const stopped=units>0 && bid<=entry*(1-SETTINGS.priceStop);
    if(stopped)sell(b,'price_stop_next_open');
    const gap=i>0&&bars[i].time-bars[i-1].time!==STEP;
    const desired=!halted&&!gap&&signal(config,bars,i-1,units>0,model);
    if(units>0&&!desired&&!gap)sell(b,'signal_exit');
    else if(units===0&&!halted&&!stopped&&desired){
      const budget=Math.min(cash,(cash+units*bid)*SETTINGS.maxAllocation);
      const buyPrice=b.open*(1+halfSpread+slip);
      const qty=budget/(buyPrice*(1+fee));
      const charge=qty*buyPrice*fee;
      if(qty>0&&qty*buyPrice+charge<=cash+1e-7){
        cash-=qty*buyPrice+charge;units=qty;paid=qty*buyPrice+charge;entry=buyPrice;
        buys++;events.push({side:'BUY',time:b.time,price:buyPrice,qty,fee:charge,reason:'prev_bar_signal'});
      }
    }
    if(halted)break;
  }
  const final=bars[Math.min(end,bars.length)-1];
  // Conservative mark-to-liquidation at last observed CLOSE, includes estimated exit costs.
  const liquidation=units>0?units*final.close*(1-halfSpread-slip)*(1-fee):0;
  const equity=cash+liquidation;
  const pnl=equity-SETTINGS.virtualCash;
  return {pnl,returnPct:100*pnl/SETTINGS.virtualCash,maxDrawdownPct:100*peakDd,
    buys,sells,closed,wins,feesEstimated:events.reduce((s,e)=>s+e.fee,0),
    finalEquity:equity,halted,events};
}
function folds(bars){
  const result=[];
  for(let endTrain=SETTINGS.minTraining;endTrain+SETTINGS.testSize<=bars.length;endTrain+=SETTINGS.testSize){
    result.push({trainStart:Math.max(0,endTrain-SETTINGS.trainLookback),
      trainEnd:endTrain,testStart:endTrain,testEnd:endTrain+SETTINGS.testSize});
  }
  return result;
}
function analyze(input,opts={}){
  const bars=validate(input);
  const splits=folds(bars);
  if(splits.length<2)throw Error('Too few held-out gold validation windows');
  const evaluated=splits.map((fold,n)=>{
    const model=modelTrain(bars,fold.trainStart,fold.trainEnd);
    const training=CONFIGS.filter(c=>c.type!=='cash').map(c=>({
      id:c.id,...simulate(bars,Math.max(60,fold.trainStart+60),fold.trainEnd,c,model)
    }));
    // CASH always competes; a negative training backtest never forces exposure.
    const sorted=training.filter(t=>t.closed>0)
      .map(t=>({id:t.id,score:t.returnPct-.35*t.maxDrawdownPct-.01*t.buys,performance:t}))
      .sort((a,b)=>b.score-a.score);
    const winner=sorted.length&&sorted[0].score>0?
      CONFIGS.find(c=>c.id===sorted[0].id):CONFIGS.find(c=>c.id==='CASH');
    const test=simulate(bars,fold.testStart,fold.testEnd,winner,model);
    const stressed=simulate(bars,fold.testStart,fold.testEnd,winner,model,{costMultiplier:2});
    const control=simulate(bars,fold.testStart,fold.testEnd,CONFIGS[0],null);
    return {fold:n+1,trainStart:bars[fold.trainStart].time,
      trainEnd:bars[fold.trainEnd-1].time,
      testStart:bars[fold.testStart].time,testEnd:bars[fold.testEnd-1].time,
      trainingSamples:model?.samples||0,trainedThrough:model?.lastTrainBarTime??null,
      selection:winner.id,trainBestScore:sorted.length?sorted[0].score:null,
      oos:test.returnPct,oosPnl:test.pnl,oosBuys:test.buys,oosSells:test.sells,
      oosMaxDrawdown:test.maxDrawdownPct,
      doubleCostOos:stressed.returnPct,baselineOos:control.returnPct,
      status:test.closed>0?'observed_trades':'limited_or_no_executed_trades'};
  });
  const meanField=key=>mean(evaluated.map(f=>f[key]));
  const totalExecuted=evaluated.reduce((n,f)=>n+f.oosBuys+f.oosSells,0);
  const maxOosDD=Math.max(...evaluated.map(f=>f.oosMaxDrawdown));
  const selectionCount=Object.fromEntries(CONFIGS.map(c=>[c.id,evaluated.filter(f=>f.selection===c.id).length]));
  const elapsedDays=(bars[bars.length-1].time-bars[0].time)/86400000;
  return {
    mode:'RESEARCH_ONLY',symbol:SOURCE,dataSource:'XAUS public XAU/USD five-minute chart proxy',
    instrument:'indicative XAU/USD, not executable broker quotes',
    generatedAt:new Date().toISOString(),
    data:{bars:bars.length,elapsedDays:Number(elapsedDays.toFixed(2)),
      first:new Date(bars[0].time).toISOString(),last:new Date(bars[bars.length-1].time).toISOString(),
      hasMarketBreaks:bars.some((b,i)=>i&&b.time-bars[i-1].time>STEP),
      timeframe:'5m',minimumLiveReadinessDays:60,historyInsufficient:true},
    methodology:{
      trainingBars:SETTINGS.minTraining,testBars:SETTINGS.testSize,
      split:'expanding chronological training; held-out non-overlapping 90-bar folds',
      prediction:'train-only logistic regression with lagged price features',
      candidates:CONFIGS.map(c=>c.id),
      costPerSideBps:10000*(SETTINGS.fee+SETTINGS.slippage+SETTINGS.assumedHalfSpread),
      doubledCostScenario:true,virtualNotional:SETTINGS.virtualCash,
      maxNotionalFraction:SETTINGS.maxAllocation,leverage:0,
      noLookahead:true,modelAutoDeployment:false,liveOrders:false
    },
    outOfSample:{
      folds:evaluated.length,meanFoldReturnPct:meanField('oos'),
      meanFoldDoubleCostPct:meanField('doubleCostOos'),
      meanBaselinePct:meanField('baselineOos'),
      positiveFolds:evaluated.filter(f=>f.oos>0).length,
      observedOrders:totalExecuted,maxFoldDrawdownPct:maxOosDD,
      foldRange:'Each fold resets virtual starting equity; mean returns are not compounded.'
    },
    selections:selectionCount,folds:evaluated,
    promotion:{status:'NOT_APPROVED',liveExecution:false,
      reason:'Short and proxy-only price history. No broker ticks, financing, cross-regime sample, or >=60 independently observed forward days. No established net trading edge.'}
  };
}
module.exports={SETTINGS,CONFIGS,validate,consecutive,features,modelTrain,probability,signal,simulate,folds,analyze};
