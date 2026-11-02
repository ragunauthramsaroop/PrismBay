const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../live-core.cjs');
const clock=Date.UTC(2026,10,2,19,30);
const STEP=300000;
const bars=Array.from({length:35},(_,i)=>{
  const p=3800+i*3;
  return {time:clock-(35-i)*STEP,open:p,close:p,high:p+4,low:p-4};
});
function quote(price=3910,at=clock){return {price,at,bid:price-.15,ask:price+.15};}
test('gold-only virtual cash and no real-money orders',()=>{
 const s=Engine.create(clock);
 assert.equal(s.mode,'PAPER_ONLY');assert.equal(s.instrument,'XAU/USD');
 assert.equal(s.cash,10000);assert.equal(s.units,0);assert.equal(s.ordersPlaced,0);
 assert.equal(Engine.readState({...s,instrument:'BTC-USD'}),null);
});
test('five-minute trend may buy virtual ounces, not BTC tokens',()=>{
 const s=Engine.create(clock);
 const r=Engine.process(s,quote(),bars,clock);
 assert.deepEqual(r.executed,['BUY']);
 assert.ok(s.units>0&&s.units<.5);
 assert.ok(s.cash<10000&&s.cash>8990);
 assert.equal(s.events[0].type,'BUY');
 assert.match(s.events[0].reason,/GOLD/);
});
test('same completed gold bar cannot duplicate an entry',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 const orders=s.ordersPlaced;
 Engine.process(s,quote(3910.05,clock+1000),bars,clock+1000);
 assert.equal(s.ordersPlaced,orders);
});
test('virtual equity responds to gold price changes',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 assert.ok(Engine.mark(s,quote(3950)).equity>Engine.mark(s,quote(3880)).equity);
});
test('simulated stop loss exits the gold ounces',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 const out=Engine.process(s,quote(3840,clock+1000),bars,clock+1000);
 assert.ok(out.executed.includes('SELL'));
 assert.equal(s.units,0);assert.equal(s.completedPaperTrades,1);
 assert.ok(s.realizedPnl<0);
});
test('stale gold quote blocks virtual trading',()=>{
 const s=Engine.create(clock);
 assert.equal(Engine.process(s,quote(3910,clock-300000),bars,clock).status,'STALE');
 assert.equal(s.ordersPlaced,0);
});
test('paused or interrupted gold session stays safe',()=>{
 for(const prop of ['paused','interruption']){
   const s=Engine.create(clock);s[prop]=true;
   const r=Engine.process(s,quote(),bars,clock);
   assert.equal(r.executed.length,0);
 }
});
test('risk drawdown halts and exits virtual gold',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 s.peakEquity=20000;
 Engine.process(s,quote(3890,clock+1000),bars,clock+1000);
 assert.equal(s.halted,true);assert.equal(s.units,0);
});
test('state round trip and expense-aware P&L',()=>{
 const s=Engine.create(clock);Engine.process(s,quote(),bars,clock);
 assert.ok(Engine.readState(JSON.parse(JSON.stringify(s))));
 assert.ok(Engine.mark(s,quote()).equity<10000);
 assert.ok(s.fees>0);
 assert.equal(Engine.readState({...s,mode:'LIVE_TRADING'}),null);
});
