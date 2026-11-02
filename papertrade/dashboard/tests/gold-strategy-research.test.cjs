'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const R=require('../strategy-research.cjs');
const START=Date.UTC(2026,8,1);
const STEP=300000;
function sample(n=940){
 return Array.from({length:n},(_,i)=>{
  const price=3850+i*.05+15*Math.sin(i/23)+3*Math.sin(i/5);
  return {time:START+i*STEP,open:price,close:price+Math.sin(i/4),
   high:price+3,low:price-3,volume:0};
 });
}
test('only gold-only chronological XAU candles are analyzed',()=>{
 const d=R.analyze(sample());
 a.equal(d.symbol,'XAU/USD');a.equal(d.mode,'RESEARCH_ONLY');
 a.equal(d.methodology.noLookahead,true);
 a.equal(d.methodology.liveOrders,false);
 a.equal(d.promotion.status,'NOT_APPROVED');
 a.ok(d.outOfSample.folds>=3);
 a.ok(d.outOfSample.observedOrders>=0);
});
test('fixed fold windows never train on their unseen test range',()=>{
 const d=R.analyze(sample(940));
 for(const f of d.folds){
  a.ok(f.trainEnd<f.testStart);
  a.ok(f.testStart<=f.testEnd);
  if(f.trainedThrough!==null)a.ok(f.trainedThrough<=f.trainEnd);
 }
 for(let j=1;j<d.folds.length;j++){
  a.ok(d.folds[j-1].testEnd<d.folds[j].testStart);
 }
});
test('learned logistic model weights do not depend on future test prices',()=>{
 const before=sample(800),after=sample(800);
 for(let i=400;i<after.length;i++){
  const p=after[i];
  after[i]={...p,open:p.open+100,close:p.close+100,high:p.high+100,low:p.low+100};
 }
 const x=R.modelTrain(before,0,400),y=R.modelTrain(after,0,400);
 a.ok(x&&y);
 a.deepEqual(x.weights,y.weights);
 a.deepEqual(x.means,y.means);
 a.deepEqual(x.stds,y.stds);
 a.equal(x.samples,y.samples);
});
test('test period first virtual decision ignores all later bar prices',()=>{
 const before=sample(650),after=sample(650),cfg=R.CONFIGS[0];
 for(let i=552;i<after.length;i++){
   after[i]={...after[i],open:after[i].open+400,close:after[i].close+400,
     high:after[i].high+400,low:after[i].low+400};
 }
 const first=R.simulate(before,550,552,cfg,null);
 const second=R.simulate(after,550,552,cfg,null);
 a.equal(first.pnl,second.pnl);a.deepEqual(first.events,second.events);
});
test('no negative balance and max 10% notional allocation',()=>{
 const bars=sample(720),s=R.simulate(bars,60,720,R.CONFIGS[0],null);
 a.ok(Number.isFinite(s.pnl));
 a.ok(s.finalEquity>0);
 a.ok(s.events.every(e=>e.qty>0&&e.fee>0&&e.price>0));
 a.ok(s.events.filter(x=>x.side==='BUY').every(x=>x.qty*x.price<1010));
});
test('cash baseline generates no transactions or gains',()=>{
 const s=R.simulate(sample(520),60,520,R.CONFIGS.at(-1),null);
 a.equal(s.pnl,0);
 a.equal(s.buys,0);
 a.equal(s.sells,0);
 a.equal(s.finalEquity,10000);
});
test('twice-cost model always explicitly reports independent stress results',()=>{
 const result=R.analyze(sample(940));
 a.equal(result.methodology.doubledCostScenario,true);
 a.equal(result.methodology.costPerSideBps,25.5);
 a.ok(result.folds.every(f=>Number.isFinite(f.doubleCostOos)&&Number.isFinite(f.oos)));
});
test('strategy learning respects market session breaks',()=>{
 const bars=sample(880);
 for(let i=450;i<bars.length;i++)bars[i].time+=2*86400000;
 const d=R.analyze(bars);
 a.equal(d.data.hasMarketBreaks,true);
 a.equal(R.consecutive(bars,455,60),false);
 const ml=R.modelTrain(bars,330,580);
 a.ok(ml===null||ml.lastTrainBarTime<=bars[579].time);
});
test('malformed and short histories fail instead of inventing prices',()=>{
 const bars=sample(750);
 a.throws(()=>R.analyze(bars.slice(0,300)),/Insufficient/);
 const bad=sample(750);bad[230].close=-100;
 a.throws(()=>R.analyze(bad),/Invalid/);
 const copied=sample(750);copied[130].time=copied[129].time;
 a.throws(()=>R.analyze(copied),/Invalid/);
});
test('research engine contains no broker order, transfer or funding adapter',()=>{
 const fs=require('node:fs'),source=fs.readFileSync(require('node:path').join(__dirname,'../strategy-research.cjs'),'utf8');
 for(const word of ['apiKey','privateKey','withdraw','placeOrder','sendOrder','brokerClient']){
   a.equal(source.includes(word),false,word);
 }
});
