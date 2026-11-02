/* GitHub daily read-only gold strategy report. No external access except public XAU chart. */
'use strict';
const fs=require('node:fs');
const {loadChart}=require('./gold-data.cjs');
const {analyze}=require('./strategy-research.cjs');
(async()=>{
 const bars=await loadChart();
 const report=analyze(bars);
 const dir='artifacts/gold-research';
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(dir+'/strategy-walkforward.json',JSON.stringify(report,null,2)+'\n');
 console.log('GOLD_WALKFORWARD='+JSON.stringify({
  symbol:report.symbol,dataBars:report.data.bars,spanDays:report.data.elapsedDays,
  folds:report.outOfSample.folds,meanOosReturnPct:report.outOfSample.meanFoldReturnPct,
  doubleCostPct:report.outOfSample.meanFoldDoubleCostPct,
  benchmarkPct:report.outOfSample.meanBaselinePct,
  positiveFolds:report.outOfSample.positiveFolds,
  trades:report.outOfSample.observedOrders,
  selection:report.selections,promotion:report.promotion.status,
  liveOrders:0
 }));
 if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n## Independent gold strategy walk-forward\n\n'+
    'Gold XAU/USD five-minute indicative chart, not broker fills. Holdout bars are never used for training.\n\n'+
    '| Result | Value |\n|---|---|\n'+
    '| Historical coverage | '+report.data.elapsedDays+' days ('+report.data.bars+' bars) |\n'+
    '| Held-out test windows | '+report.outOfSample.folds+' |\n'+
    '| Mean holdout return per window | '+report.outOfSample.meanFoldReturnPct.toFixed(4)+'% |\n'+
    '| Double transaction cost holdout | '+report.outOfSample.meanFoldDoubleCostPct.toFixed(4)+'% |\n'+
    '| Positive holdout windows | '+report.outOfSample.positiveFolds+' |\n'+
    '| Model promotion | NOT APPROVED |\n'+
    '\nResearch is insufficient for real-money use. No broker orders.\n');
 }
})().catch(e=>{console.error('GOLD_WALKFORWARD_FAILED',e.message);process.exitCode=1;});
