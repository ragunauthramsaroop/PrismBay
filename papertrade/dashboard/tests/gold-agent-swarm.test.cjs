'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {runAgents,cleanPrior}=require('../agents/research-swarm.cjs');
const STEP=300000,DAY=86400000;
function intraday(n=950){
 const t=Date.UTC(2026,9,20);
 return Array.from({length:n},(_,i)=>{
  const p=3800+i*.07+Math.sin(i/17)*21+Math.sin(i/5)*3;
  return {time:t+i*STEP,open:p,close:p+.3,high:p+4,low:p-4,volume:1};
 });
}
function daily(n=1100){
 const t=Date.UTC(2023,0,1);
 return Array.from({length:n},(_,i)=>{
  const p=1850+i*1.2+70*Math.sin(i/60);
  return {time:t+i*DAY,close:p,high:p+15,low:p-15};
 });
}
const now=(rows)=>rows.at(-1).time+300000;
test('seven specialist workers stay gold-only, simulated and disallow broker promotion',()=>{
 const five=intraday(),d=daily(),r=runAgents(five,d,null,now(five));
 a.equal(r.symbol,'XAU/USD');a.equal(r.mode,'AUTONOMOUS_RESEARCH_ONLY');
 a.equal(Object.keys(r.agents).length,7);
 a.equal(r.memory.schema,1);a.equal(r.memory.ordersPlaced,0);
 a.equal(r.supervisoryDecision.realMoneyAuthorized,false);
 a.equal(r.supervisoryDecision.noLiveOrders,true);
 a.equal(r.supervisoryDecision.brokerConnections,0);
 a.equal(r.learningDelta.firstRun,true);
 a.equal(r.agents['Market Data Sentinel'].intradayBars,950);
 a.equal(r.agents['Market Data Sentinel'].dailyCloses,1100);
 a.equal(r.agents['Prediction Researcher'].status,'RETRAINED_ON_PAST_DATA');
 a.equal(r.agents['Independent Evaluator'].daily.folds>0,true);
});
test('retained memory recognizes unchanged gold data, no fictitious new learning',()=>{
 const five=intraday(),d=daily();
 const first=runAgents(five,d,null,now(five));
 const second=runAgents(five,d,first.memory,now(five)+3*3600000);
 a.equal(second.learningDelta.firstRun,false);
 a.equal(second.learningDelta.newEvidence,false);
 a.equal(second.learningDelta.marketDataChanged,false);
 a.equal(second.memory.runNumber,2);
 a.equal(second.memory.history.length,2);
 a.match(second.learningDelta.caveat,/No new gold candles/);
});
test('new gold candle is recorded as new evidence without live orders',()=>{
 const five=intraday(),d=daily();
 const one=runAgents(five,d,null,now(five));
 const two=runAgents(intraday(951),d,one.memory,now(five)+5*60000);
 a.equal(two.learningDelta.newEvidence,true);
 a.equal(two.learningDelta.marketDataChanged,true);
 a.equal(two.memory.ordersPlaced,0);
});
test('history is capped and memory malformed state fails closed to a fresh run',()=>{
 a.equal(cleanPrior({schema:1,symbol:'BTC-USD',runNumber:12,history:[]}),null);
 const five=intraday(),d=daily();
 let first=runAgents(five,d,null,now(five));
 first.memory.runNumber=100;
 first.memory.history=Array.from({length:60},(_,i)=>({at:'2026-10-01',newEvidence:false,id:i}));
 const newRun=runAgents(five,d,first.memory,now(five)+1200000);
 a.equal(newRun.memory.history.length,60);
 a.equal(newRun.memory.runNumber,101);
});
test('risk auditor never marks even positive historical returns as funded ready',()=>{
 const five=intraday(),d=daily(),r=runAgents(five,d,null,now(five));
 const x=r.agents['Cost and Risk Auditor'];
 a.equal(x.intraday.modelPromotion,'BLOCKED');
 a.equal(x.daily.modelPromotion,'BLOCKED');
 a.equal(x.realOrders,0);
 a.ok(Object.values(r.agents).every(x=>x.status));
});
test('training models never read the held-out test window for model fitting',()=>{
 const five=intraday(),d=daily(),r=runAgents(five,d,null,now(five));
 const all=[
  ...r.agents['Intraday Trend Analyst'].models,
  ...r.agents['Breakout Analyst'].models,
  ...r.agents['Prediction Researcher'].models,
  ...r.agents['Daily Gold Trend Analyst'].models
 ];
 a.ok(all.every(x=>x.leakageGuard));
 a.ok(all.every(x=>x.observedFolds>0&&Number.isFinite(x.meanReturnPct)));
});
test('stale gold market identifies stale source but does not fabricate price quotes',()=>{
 const five=intraday(),d=daily();
 const r=runAgents(five,d,null,now(five)+5*3600000);
 a.equal(r.agents['Market Data Sentinel'].marketClosedOrStale,true);
 a.equal(r.supervisoryDecision.noLiveOrders,true);
});
test('code contains no external funding, brokerage, or posting capabilities',()=>{
 const code=fs.readFileSync(path.resolve(__dirname,'../agents/research-swarm.cjs'),'utf8');
 for(const term of ['placeOrder','apiSecret','withdrawalKey','brokerClient','sendOrder','creditCard','tokenSecret']){
  a.equal(code.includes(term),false);
 }
});
