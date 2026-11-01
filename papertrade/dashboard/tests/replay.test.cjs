const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../live-core.cjs');
const Replay=require('../replay-core.js');
const base=Date.UTC(2026,9,31,0,0,0);
function example(n=200){
  return Array.from({length:n},(_,i)=>{
    // Zigzag trend is deterministic test input, NOT data served to users.
    const p=90000+Math.sin(i/14)*680+Math.sin(i/5)*160+i*.7;
    return {time:base+i*60000,open:p,close:p+Math.sin(i/4)*11,
      high:p+40,low:p-40,volume:7};
  });
}
test('history is tagged as historical replay, not actual trades',()=>{
  const s=Replay.create(example(100));
  assert.equal(s.mode,'HISTORICAL_REPLAY_ONLY');
  assert.equal(s.state.mode,'PAPER_ONLY');
  assert.equal(s.state.startingCash,10000);
  assert.equal(s.fills.length,0);
  assert.equal(s.history.length,0);
});
test('replay consumes only completed minute bars and does not inspect future price',()=>{
  const original=example(120);
  const first=Replay.create(original);
  const mutated=example(120);
  for(let i=80;i<mutated.length;i++){
    mutated[i]={...mutated[i],open:mutated[i].open+23000,close:mutated[i].close+23000,
      high:mutated[i].high+24000,low:mutated[i].low+22000};
  }
  const second=Replay.create(mutated);
  Replay.advance(first,40);Replay.advance(second,40);
  const a=Replay.metrics(first),b=Replay.metrics(second);
  assert.equal(a.equity,b.equity);
  assert.equal(first.fills.length,second.fills.length);
  assert.deepEqual(first.fills,second.fills);
});
test('replay fills happen only on the next historical minute OPEN',()=>{
  const bars=example(300),s=Replay.create(bars);
  Replay.advance(s,240);
  assert.ok(s.fills.length>0,'zigzag signal should generate virtual transactions');
  for(const x of s.fills){
    assert.equal(x.at,bars[x.index].time+1000);
    assert.ok(x.price>0);
    assert.ok(Math.abs(x.price-bars[x.index].open)/bars[x.index].open<.003);
  }
  assert.ok(s.state.fees>0);
});
test('complete replay produces explicit accounting, positive or negative',()=>{
  const s=Replay.create(example(300));
  Replay.advance(s,2000);
  const x=Replay.metrics(s);
  assert.equal(x.finished,true);
  assert.equal(x.stage,'COMPLETE');
  assert.equal(x.steps,x.totalSteps);
  assert.ok(x.equity>0&&Number.isFinite(x.pnl));
  assert.ok(x.drawdownPct>=0);
  assert.ok(x.cash>=0&&x.btcUnits>=0);
  assert.ok(x.buys>=x.sells);
  assert.ok(Math.abs((x.equity-10000)-x.pnl)<1e-6);
  assert.ok(x.fees>0);
});
test('replay does not pretend to execute real orders and respects allocation',()=>{
  const s=Replay.create(example(100));
  Replay.advance(s,70);
  const x=Replay.metrics(s);
  assert.equal(x.mode,'HISTORICAL_REPLAY_ONLY');
  assert.ok(x.maxAllocationPct===10);
  assert.ok(x.positionValue<=x.equity*.11);
  assert.ok(s.state.ordersPlaced>=0);
});
test('replay cannot reuse duplicated, gapped or invalid historical bars',()=>{
  const bars=example(90);
  assert.throws(()=>Replay.create(bars.slice(0,30)),/Need 60/);
  const duplicate=example(90);duplicate[20].time=duplicate[19].time;
  assert.throws(()=>Replay.create(duplicate),/Invalid or gapped/);
  const gapped=example(90);for(let i=40;i<90;i++)gapped[i].time+=7*60000;
  assert.throws(()=>Replay.create(gapped),/Invalid or gapped/);
  const priceError=example(90);priceError[50].open=-1;
  assert.throws(()=>Replay.create(priceError),/Invalid or gapped/);
});
test('step increment validation is bounded',()=>{
  const s=Replay.create(example(90));
  assert.throws(()=>Replay.advance(s,0),/Invalid playback/);
  assert.throws(()=>Replay.advance(s,2001),/Invalid playback/);
});
test('single-step and bulk simulation are deterministic',()=>{
  const a=Replay.create(example(130)),b=Replay.create(example(130));
  Replay.advance(a,100);
  for(let i=0;i<100;i++)Replay.advance(b,1);
  assert.deepEqual(Replay.metrics(a),Replay.metrics(b));
  assert.deepEqual(a.fills,b.fills);
});
test('virtual P/L includes estimated bid/ask and fees, no fake broker accounts',()=>{
  const s=Replay.create(example(300));Replay.advance(s,1000);
  const x=Replay.metrics(s);
  assert.ok(x.fees>=0);
  assert.match(x.feeModel,/15bps/);
  assert.equal(x.mode,'HISTORICAL_REPLAY_ONLY');
  assert.equal(typeof x.lastPrice,'number');
});
