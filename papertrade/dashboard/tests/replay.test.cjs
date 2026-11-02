const {test}=require('node:test');
const assert=require('node:assert/strict');
const Replay=require('../replay-core.js');
const BASE=Date.UTC(2026,9,31,0);
const STEP=300000;
function bars(n=200){
 return Array.from({length:n},(_,i)=>{
   const p=3880+Math.sin(i/14)*35+Math.sin(i/5)*9+i*.05;
   return {time:BASE+i*STEP,open:p,close:p+Math.sin(i/4)*1.5,
     high:p+4,low:p-4,volume:0};
 });
}
test('historic gold replays ONLY virtual XAU/USD positions',()=>{
 const s=Replay.create(bars(100));
 assert.equal(s.mode,'HISTORICAL_REPLAY_ONLY');assert.equal(s.state.instrument,'XAU/USD');
 assert.equal(s.state.startingCash,10000);assert.equal(s.fills.length,0);
});
test('future changes cannot affect earlier gold simulated decisions',()=>{
 const a=bars(150),b=bars(150);
 for(let i=100;i<b.length;i++)b[i]={...b[i],open:b[i].open+500,close:b[i].close+500,high:b[i].high+510,low:b[i].low+490};
 const x=Replay.create(a),y=Replay.create(b);
 Replay.advance(x,50);Replay.advance(y,50);
 assert.deepEqual(x.fills,y.fills);assert.equal(Replay.metrics(x).equity,Replay.metrics(y).equity);
});
test('virtual gold fills occur at next recorded 5-minute open',()=>{
 const a=bars(300),s=Replay.create(a);Replay.advance(s,2000);
 assert.ok(s.fills.length>0);
 for(const f of s.fills){
   assert.equal(f.at,a[f.index].time+1000);
   assert.ok(Math.abs(f.price-a[f.index].open)/a[f.index].open<.004);
 }
 assert.ok(s.state.fees>0);
});
test('gold replay completes with accounting and benchmark',()=>{
 const s=Replay.create(bars(300));Replay.advance(s,2000);const x=Replay.metrics(s);
 assert.equal(x.finished,true);assert.equal(x.steps,x.totalSteps);
 assert.ok(x.equity>0&&Number.isFinite(x.pnl));
 assert.ok(x.cash>=0&&x.goldOunces>=0);assert.ok(x.goldBenchmark>0);
 assert.ok(Math.abs((x.equity-10000)-x.pnl)<1e-6);
});
test('market breaks are represented as missing time without invented candles',()=>{
 const b=bars(150);for(let i=70;i<b.length;i++)b[i].time+=3*86400000;
 const s=Replay.create(b);Replay.advance(s,2000);
 assert.equal(s.history.length,s.stepCount);
 assert.ok(s.segmentStart>=70);
 assert.equal(s.history.some(x=>x.time===b[70].time+1000),true);
});
test('reject invalid, duplicated or nonchronological gold candles',()=>{
 assert.throws(()=>Replay.create(bars(30)),/Need 60/);
 const b=bars(90);b[20].time=b[19].time;assert.throws(()=>Replay.create(b),/Invalid or out-of-order/);
 const q=bars(90);q[30].close=-1;assert.throws(()=>Replay.create(q),/Invalid or out-of-order/);
});
test('one-step and bulk replay are deterministic',()=>{
 const a=Replay.create(bars(130)),b=Replay.create(bars(130));
 Replay.advance(a,100);for(let i=0;i<100;i++)Replay.advance(b,1);
 assert.deepEqual(Replay.metrics(a),Replay.metrics(b));
 assert.deepEqual(a.fills,b.fills);
});
test('virtual transaction-cost assumptions are explicit',()=>{
 const s=Replay.create(bars(300));Replay.advance(s,2000);
 assert.match(Replay.metrics(s).feeModel,/15bps/);
 assert.equal(Replay.metrics(s).mode,'HISTORICAL_REPLAY_ONLY');
 assert.ok(s.fills.every(x=>x.price>0));
});
