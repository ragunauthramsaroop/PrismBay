/* Gold-only XAU/USD public chart replay smoke. No broker connections or trade submission. */
'use strict';
const assert=require('node:assert/strict');
const {loadSpot,loadChart}=require('../gold-data.cjs');
const Replay=require('../replay-core.js');
(async()=>{
 const [spot,bars]=await Promise.all([loadSpot(),loadChart()]);
 assert.equal(spot.instrument,'XAU/USD');
 assert.equal(spot.estimatedBidAsk,true);
 assert.ok(spot.price>100);
 assert.ok(bars.length>=150);
 const selected=bars.slice(-97);
 const session=Replay.create(selected,{source:'XAUS XAU/USD chart proxy'});
 while(!session.finished)Replay.advance(session,200);
 const m=Replay.metrics(session);
 assert.equal(m.mode,'HISTORICAL_REPLAY_ONLY');
 assert.equal(session.state.instrument,'XAU/USD');
 assert.ok(m.equity>0&&Number.isFinite(m.pnl));
 assert.ok(session.fills.every(e=>e.price>0&&e.at===selected[e.index].time+1000));
 console.log('VERIFIED_GOLD_ONLY_REPLAY='+JSON.stringify({
  instrument:'XAU/USD',source:'XAUS public XAU gold chart proxy',
  indicativeSpotUSDPerOunce:spot.price,
  chartBars:selected.length,virtualEquity:Number(m.equity.toFixed(2)),
  virtualProfit:Number(m.pnl.toFixed(2)),estimatedFees:Number(m.fees.toFixed(2)),
  virtualBuys:m.buys,virtualSells:m.sells,marketBreaksPossible:true,
  realOrders:0
 }));
})().catch(e=>{console.error('GOLD_REPLAY_SMOKE_FAILED',e.message);process.exitCode=1;});
