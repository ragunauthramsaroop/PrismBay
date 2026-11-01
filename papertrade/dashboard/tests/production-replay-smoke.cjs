/* Production historical replay smoke. No transaction APIs or exchange accounts. */
'use strict';
const assert=require('node:assert/strict');
const Replay=require('../replay-core.js');
const URL='https://papertrade-research-live.vercel.app/api/replay?hours=6';
(async()=>{
  const res=await fetch(URL,{signal:AbortSignal.timeout(20000)});
  assert.equal(res.status,200,'Historical price endpoint must respond');
  const data=await res.json();
  assert.equal(data.mode,'HISTORICAL_REPLAY_ONLY');
  assert.equal(data.noRealOrders,true);
  assert.equal(data.symbol,'BTC-USD');
  assert.ok(data.candleCount>=340);
  assert.ok(data.coveragePct>=97);
  const s=Replay.create(data.bars,{source:data.source});
  while(!s.finished)Replay.advance(s,100);
  const m=Replay.metrics(s);
  assert.equal(m.steps,m.totalSteps);
  assert.ok(Number.isFinite(m.equity));
  assert.ok(m.equity>0);
  assert.ok(s.fills.every(e=>e.price>0&&e.at===data.bars[e.index].time+1000));
  console.log('VERIFIED_REAL_HISTORICAL_REPLAY='+JSON.stringify({
    mode:m.mode,source:data.source,start:data.start,end:data.end,
    candles:data.candleCount,coveragePct:data.coveragePct,
    simulatedEquity:Number(m.equity.toFixed(2)),simulatedProfit:Number(m.pnl.toFixed(2)),
    simulatedFees:Number(m.fees.toFixed(2)),buyEvents:m.buys,sellEvents:m.sells,
    riskHalted:s.halted,finished:m.finished,virtualOrdersOnly:true
  }));
})().catch(e=>{console.error('HISTORICAL_REPLAY_SMOKE_FAILED',e);process.exitCode=1;});
