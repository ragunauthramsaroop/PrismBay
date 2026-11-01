const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../live-core.cjs');
const clock=Date.UTC(2026,10,1,19,30,0);
const bars=Array.from({length:35},(_,i)=>({time:clock-(35-i)*60000,close:100+i*.3,high:101+i*.3,low:99+i*.3}));
function quote(price=110,at=clock){return {price,at,bid:price-.10,ask:price+.10};}
test('paper starts with exactly $10,000, zero orders and no account auth',()=>{
 const p=Engine.create(clock);
 assert.equal(p.cash,10000);assert.equal(p.ordersPlaced,0);
 assert.equal(p.mode,'PAPER_ONLY');assert.equal(p.units,0);
});
test('momentum signal buys at real quote ask plus simulated fees and slippage',()=>{
 const s=Engine.create(clock);const r=Engine.process(s,quote(110),bars,clock);
 assert.deepEqual(r.executed,['BUY']);
 assert.ok(r.state.units>0);assert.ok(r.state.units*110<1000);
 assert.ok(r.state.cash<10000 && r.state.cash>8990);
 assert.equal(r.state.ordersPlaced,1);
 assert.equal(r.state.events[0].type,'BUY');
});
test('same bar/ticker produces no duplicate BUY',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(110),bars,clock);
 const c=s.ordersPlaced;Engine.process(s,quote(110.01,clock+1000),bars,clock+1000);
 assert.equal(s.ordersPlaced,c);
});
test('real-time equity marks bid prices without an exchange order',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(110),bars,clock);
 const low=Engine.mark(s,quote(105));const high=Engine.mark(s,quote(115));
 assert.ok(high.equity>low.equity);assert.equal(s.ordersPlaced,1);
});
test('downward tick triggers one simulated stop-loss SELL',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(110),bars,clock);
 const r=Engine.process(s,quote(105,clock+1000),bars,clock+1000);
 assert.equal(r.executed[0],'SELL');assert.equal(s.units,0);
 assert.equal(s.completedPaperTrades,1);assert.equal(s.ordersPlaced,2);
 assert.ok(s.realizedPnl<0);
});
test('stale or inconsistent quote does not place paper orders',()=>{
 const s=Engine.create(clock);const q=quote(110,clock-60000);
 assert.equal(Engine.process(s,q,bars,clock).status,'STALE');
 assert.equal(s.ordersPlaced,0);
 assert.equal(Engine.process(s,{price:99,bid:101,ask:99,at:clock},bars,clock).status,'STALE');
});
test('paused browser paper session does not buy',()=>{
 const s=Engine.create(clock);s.paused=true;
 const r=Engine.process(s,quote(),bars,clock);
 assert.equal(r.executed.length,0);assert.equal(s.ordersPlaced,0);
});
test('interruption does not backfill or trade stale signals',()=>{
 const s=Engine.create(clock);s.interruption=true;
 const r=Engine.process(s,quote(),bars,clock);
 assert.equal(r.status,'FEED_GAP');assert.equal(r.executed.length,0);
});
test('maximum drawdown gate halts and liquidates virtual exposure',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(110),bars,clock);
 s.peakEquity=20000;
 const result=Engine.process(s,quote(108,clock+1000),bars,clock+1000);
 assert.equal(result.state.halted,true);
 assert.equal(result.state.units,0);
});
test('session survives serialization and validates state',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 assert.equal(Engine.readState(JSON.parse(JSON.stringify(s))).mode,'PAPER_ONLY');
 assert.equal(Engine.readState({...s,cash:-100}),null);
 assert.equal(Engine.readState({...s,mode:'LIVE_TRADING'}),null);
});
test('net paper P&L includes simulated transaction costs',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(110),bars,clock);
 const mark=Engine.mark(s,quote(110));assert.ok(mark.equity<10000);
 assert.ok(mark.unrealized<0);assert.ok(s.fees>0);
});
