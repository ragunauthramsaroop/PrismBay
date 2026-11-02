/* Gold Research Swarm: deterministic, read-only specialist workers.
 * Agents are software research roles, NOT persistent LLMs or order-executing traders.
 * Never places trades, promotes strategies, contacts brokers, or spends money.
 */
'use strict';
const crypto=require('node:crypto');
const intraday=require('../strategy-research.cjs');
const swing=require('../gold-swing-research.cjs');
const SYMBOL='XAU/USD';
const mean=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:null;
const rounded=(x,d=6)=>Number.isFinite(x)?Number(x.toFixed(d)):null;
const MINUTE=60000;
function digest(bars) {
 const last=bars.at(-1);
 return crypto.createHash('sha256').update(JSON.stringify({
  bars:bars.length,first:bars[0]?.time,last:last?.time,
  closes:bars.slice(-16).map(b=>[b.time,b.close])
 })).digest('hex').slice(0,20);
}
function cleanPrior(prior){
 if(!prior||prior.schema!==1||prior.symbol!==SYMBOL||!Array.isArray(prior.history))return null;
 if(!Number.isInteger(prior.runNumber)||prior.runNumber<1)return null;
 if(prior.history.length>60)return null;
 return prior;
}
function quality(bars,daily,now,prior){
 const recent=bars.at(-1),older=daily.at(-1);
 const recentAgeMin=rounded((now-recent.time)/MINUTE,1);
 const dailyAgeDays=rounded((now-older.time)/86400000,2);
 const gaps=bars.reduce((n,b,i)=>n+(i>0&&b.time-bars[i-1].time>300000?1:0),0);
 const checks={symbol:SYMBOL,intradayBars:bars.length,dailyCloses:daily.length,
  intradayLast:new Date(recent.time).toISOString(),
  dailyLast:new Date(older.time).toISOString(),fiveMinuteGaps:gaps,
  intradaySourceAgeMinutes:recentAgeMin,dailySourceAgeDays:dailyAgeDays,
  intradayHash:digest(bars),dailyHash:digest(daily),
  newIntradayBar:prior?recent.time>prior.lastIntradayAt:true,
  newDailyClose:prior?older.time>prior.lastDailyAt:true,
  strictOHLC:true,liveQuoteExecutable:false,
  goldOnly:true,marketClosedOrStale:recentAgeMin>20,
  dataFeeds:['XAUS indicative five-minute gold chart','XAUS five-year daily gold closing history']
 };
 return checks;
}
function fixedIntraday(bars,config) {
 const splits=intraday.folds(bars);
 const tests=splits.map(f=>{
  const train=intraday.modelTrain(bars,f.trainStart,f.trainEnd);
  const plain=intraday.simulate(bars,f.testStart,f.testEnd,config,train);
  const stressed=intraday.simulate(bars,f.testStart,f.testEnd,config,train,{costMultiplier:2});
  return {foldStart:bars[f.testStart].time,returnPct:plain.returnPct,
   doubleCostPct:stressed.returnPct,orders:plain.buys+plain.sells,
   closedTrades:plain.closed,trainingThrough:train?.lastTrainBarTime??null,
   testStart:bars[f.testStart].time};
 });
 return {name:config.id,observedFolds:tests.length,
  meanReturnPct:rounded(mean(tests.map(t=>t.returnPct))),
  meanDoubleCostPct:rounded(mean(tests.map(t=>t.doubleCostPct))),
  positiveFolds:tests.filter(t=>t.returnPct>0).length,
  totalOrders:tests.reduce((n,t)=>n+t.orders,0),
  totalClosedTrades:tests.reduce((n,t)=>n+t.closedTrades,0),
  leakageGuard:tests.every(t=>t.trainingThrough===null||t.trainingThrough<t.testStart),
  folds:tests};
}
function fixedDaily(bars,config){
 const tests=[];
 for(let endTrain=swing.CFG.minTrain;endTrain+swing.CFG.testBars<=bars.length;endTrain+=swing.CFG.testBars){
  const trainStart=Math.max(0,endTrain-swing.CFG.lookback);
  const model=swing.train(bars,trainStart,endTrain);
  const plain=swing.evaluate(bars,endTrain,endTrain+swing.CFG.testBars,config,model,1);
  const stress=swing.evaluate(bars,endTrain,endTrain+swing.CFG.testBars,config,model,2);
  tests.push({testStart:bars[endTrain].time,trainedThrough:model?.lastLabelEnd??null,
    returnPct:plain.returnPct,doubleCostPct:stress.returnPct,
    orders:plain.buys+plain.sells,closedTrades:plain.closed});
 }
 return {name:config.id,observedFolds:tests.length,
  meanReturnPct:rounded(mean(tests.map(x=>x.returnPct))),
  meanDoubleCostPct:rounded(mean(tests.map(x=>x.doubleCostPct))),
  positiveFolds:tests.filter(x=>x.returnPct>0).length,
  totalOrders:tests.reduce((s,x)=>s+x.orders,0),
  totalClosedTrades:tests.reduce((s,x)=>s+x.closedTrades,0),
  leakageGuard:tests.every(t=>t.trainedThrough===null||t.trainedThrough<t.testStart)};
}
function checkModelRisk(results){
 const observed=results.filter(r=>Number.isFinite(r.meanReturnPct));
 const eligible=observed.filter(r=>r.totalClosedTrades>=5&&
   r.meanReturnPct>0&&r.meanDoubleCostPct>0&&r.leakageGuard);
 const sorted=[...eligible].sort((a,b)=>b.meanDoubleCostPct-a.meanDoubleCostPct);
 return {
  evaluatedModels:observed.length,
  hasHypothesisWorthFurtherStudy:sorted.length>0,
  bestResearchHypothesis:sorted[0]?.name??null,
  minCompletedTradesForExploration:5,
  modelPromotion:'BLOCKED',
  realMoneyOrders:'DISABLED',
  reason:'Backtest is indicative, short or proxy-only; no executable broker quotes, financing, or independently collected 60-day forward record.',
  rule:'Never convert research score or model probability into a live order.'
 };
}
function runAgents(rawBars,rawDaily,prev,now=Date.now()){
 const bars=intraday.validate(rawBars);
 const daily=swing.validate(rawDaily);
 if(!Number.isFinite(now)||now<=0)throw Error('Invalid snapshot time');
 const prior=cleanPrior(prev);
 const scout=quality(bars,daily,now,prior);
 if(scout.intradaySourceAgeMinutes< -5||scout.dailySourceAgeDays< -1)
  throw Error('Gold historical source dates lie in the future');
 const report5=intraday.analyze(bars);
 const report1=swing.walkForward(daily);
 const trend5=fixedIntraday(bars,intraday.CONFIGS.find(c=>c.id==='SMA_8_21'));
 const slow5=fixedIntraday(bars,intraday.CONFIGS.find(c=>c.id==='SMA_12_36'));
 const breakout5=fixedIntraday(bars,intraday.CONFIGS.find(c=>c.id==='BREAKOUT_18_8'));
 const ml5=fixedIntraday(bars,intraday.CONFIGS.find(c=>c.id==='LEARNED_LOGIT'));
 const trendDaily=fixedDaily(daily,swing.STRATEGIES.find(c=>c.id==='TREND_20_60'));
 const slowDaily=fixedDaily(daily,swing.STRATEGIES.find(c=>c.id==='TREND_50_200'));
 const breakoutDaily=fixedDaily(daily,swing.STRATEGIES.find(c=>c.id==='BREAKOUT_55_20'));
 const mlDaily=fixedDaily(daily,swing.STRATEGIES.find(c=>c.id==='LEARNED_LOGIT'));
 const fixed=[trend5,slow5,breakout5,ml5,trendDaily,slowDaily,breakoutDaily,mlDaily];
 if(fixed.some(x=>!x.leakageGuard))throw Error('NO-LOOKAHEAD SAFETY FAILURE');
 // All specialist outputs are evidence based; no natural-language oracle or invented edge.
 const specialists={
  'Market Data Sentinel':{status:'CHECKED',...scout},
  'Intraday Trend Analyst':{status:'EVALUATED',models:[trend5,slow5]},
  'Breakout Analyst':{status:'EVALUATED',models:[breakout5,breakoutDaily]},
  'Prediction Researcher':{status:'RETRAINED_ON_PAST_DATA',
    models:[ml5,mlDaily],note:'Simple logistic models. No language model, no auto-promoted weights.'},
  'Daily Gold Trend Analyst':{status:'EVALUATED',models:[trendDaily,slowDaily]},
  'Cost and Risk Auditor':{status:'GATED',intraday:checkModelRisk([trend5,slow5,breakout5,ml5]),
    daily:checkModelRisk([trendDaily,slowDaily,breakoutDaily,mlDaily]),
    doubledCosts:true,realOrders:0},
  'Independent Evaluator':{status:'TESTED',
    fiveMinute:{folds:report5.outOfSample.folds,
      meanOosPct:rounded(report5.outOfSample.meanFoldReturnPct),
      positiveFolds:report5.outOfSample.positiveFolds,
      doubleCostOosPct:rounded(report5.outOfSample.meanFoldDoubleCostPct)},
    daily:{folds:report1.outOfSample.folds,
      meanOosPct:rounded(report1.outOfSample.meanReturnPct),
      positiveFolds:report1.outOfSample.positiveFolds,
      doubleCostOosPct:rounded(report1.outOfSample.meanDoubleCostPct),
      fixedTrendPct:rounded(report1.outOfSample.meanFixedTrendPct)}}
 };
 const newEvidence=!prior||scout.newIntradayBar||scout.newDailyClose;
 const historicalRuns=prior?.history||[];
 const row={at:new Date(now).toISOString(),newEvidence,newIntradayBar:scout.newIntradayBar,
  newDailyClose:scout.newDailyClose,intradayLast:scout.intradayLast,
  dailyLast:scout.dailyLast,shortMean:rounded(report5.outOfSample.meanFoldReturnPct),
  dailyMean:rounded(report1.outOfSample.meanReturnPct),
  dailyTrendMean:rounded(report1.outOfSample.meanFixedTrendPct),
  marketClosedOrStale:scout.marketClosedOrStale};
 const history=[...historicalRuns,row].slice(-60);
 const runNumber=(prior?.runNumber||0)+1;
 const memory={schema:1,symbol:SYMBOL,runNumber,runAt:row.at,
   lastIntradayAt:bars.at(-1).time,lastDailyAt:daily.at(-1).time,
   latestDataHashes:{intraday:scout.intradayHash,daily:scout.dailyHash},
   history,reviewStatus:'UNAPPROVED',ordersPlaced:0};
 return {schema:1,symbol:SYMBOL,mode:'AUTONOMOUS_RESEARCH_ONLY',
  scheduledCadence:'Every three hours via GitHub-hosted workflow',
  generatedAt:new Date(now).toISOString(),
  agents:specialists,memory,
  learningDelta:{newEvidence,
    priorFound:!!prior,
    firstRun:!prior,
    historyRuns:history.length,
    marketDataChanged:prior?scout.intradayHash!==prior.latestDataHashes?.intraday:true,
    dailyDataChanged:prior?scout.dailyHash!==prior.latestDataHashes?.daily:true,
    caveat:newEvidence?'New recorded gold observations available for independent tests.':
      'No new gold candles; models re-evaluated but no new market learning is claimed.'},
  supervisoryDecision:{status:'RESEARCH_ONLY',
    realMoneyAuthorized:false,autoPromotion:false,brokerConnections:0,
    recommendedNextStudy:'Broker-executable bid/ask, financing and an independently timestamped forward paper record.',
    noLiveOrders:true},
  checkedRunNumber:runNumber};
}
module.exports={SYMBOL,cleanPrior,quality,fixedIntraday,fixedDaily,checkModelRisk,runAgents};
