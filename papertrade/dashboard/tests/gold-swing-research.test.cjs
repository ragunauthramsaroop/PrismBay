'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const R=require('../gold-swing-research.cjs');
const DAY=86400000,start=Date.UTC(2021,0,1);
function series(n=1290){
 return Array.from({length:n},(_,i)=>{
  const price=1600+i*.5+80*Math.sin(i/67)+12*Math.sin(i/9);
  return {time:start+i*DAY,open:price,close:price+Math.sin(i/5)*3,
   high:price+12,low:price-12,volume:0};
 });
}
test('multi-year XAU research reports chronological, withheld fold outcomes',()=>{
 const r=R.walkForward(series());
 a.equal(r.symbol,'XAU/USD');a.equal(r.timeframe,'1d');
 a.equal(r.mode,'RESEARCH_ONLY');
 a.ok(r.outOfSample.folds>=6);
 a.equal(r.promotion.status,'NOT_APPROVED');
 a.equal(r.promotion.realOrders,0);
 a.ok(r.folds.every(f=>f.trainEnd<f.testStart&&f.modelTrainingEnd<=f.trainEnd));
 for(let i=1;i<r.folds.length;i++)a.ok(r.folds[i-1].testEnd<r.folds[i].testStart);
});
test('future daily prices cannot affect earlier trained model weights',()=>{
 const before=series(1000),after=series(1000);
 for(let i=505;i<after.length;i++){
  after[i]={...after[i],open:after[i].open+300,close:after[i].close+300,
   high:after[i].high+300,low:after[i].low+300};
 }
 const x=R.train(before,0,504),y=R.train(after,0,504);
 a.ok(x&&y);a.deepEqual(x.weights,y.weights);a.deepEqual(x.means,y.means);
});
test('unseen test-period edits cannot rewrite a previously chosen candidate',()=>{
 const first=series(900),mutated=series(900);
 for(let i=650;i<900;i++){
  mutated[i]={...mutated[i],open:mutated[i].open+600,close:mutated[i].close+600,
   high:mutated[i].high+600,low:mutated[i].low+600};
 }
 const x=R.walkForward(first),y=R.walkForward(mutated);
 a.equal(x.folds[0].selection,y.folds[0].selection);
 a.equal(x.folds[0].trainingScore,y.folds[0].trainingScore);
});
test('cash alternative remains a no-trade zero-return control',()=>{
 const cfg=R.STRATEGIES.find(s=>s.id==='CASH');
 const s=R.evaluate(series(),504,567,cfg,null);
 a.equal(s.buys,0);a.equal(s.sells,0);a.equal(s.returnPct,0);
 a.equal(s.equity,10000);
});
test('gold daily swing model accounts for buying costs, downside and virtual allocation',()=>{
 const data=series(850),s=R.STRATEGIES[0],p=R.evaluate(data,504,850,s,null);
 a.ok(Number.isFinite(p.returnPct)&&Number.isFinite(p.maxDrawdownPct));
 a.ok(p.equity>0);a.ok(p.fees>=0);
 a.ok(R.CFG.allocation<=.1);
 const doubled=R.evaluate(data,504,850,s,null,2);
 a.ok(Number.isFinite(doubled.returnPct));
});
test('invalid gold data is rejected rather than silently replaced',()=>{
 const b=series(860);b[100].low=-1;
 a.throws(()=>R.walkForward(b),/Invalid/);
 a.throws(()=>R.walkForward(series(220)),/Not enough/);
 const c=series(860);c[800].time=c[799].time;
 a.throws(()=>R.walkForward(c),/Invalid/);
});
