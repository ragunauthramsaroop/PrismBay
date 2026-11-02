/* Five-year XAU/USD daily swing learning report, GitHub Actions research artifact. */
'use strict';
const fs=require('node:fs');
const {loadDailyChart}=require('./gold-data.cjs');
const {walkForward}=require('./gold-swing-research.cjs');
(async()=>{
 const daily=await loadDailyChart();
 const report=walkForward(daily);
 fs.mkdirSync('artifacts/gold-research',{recursive:true});
 fs.writeFileSync('artifacts/gold-research/daily-swing-walkforward.json',JSON.stringify(report,null,2)+'\n');
 console.log('GOLD_SWING_WALKFORWARD='+JSON.stringify({
  symbol:report.symbol,years:report.data.calendarYears,bars:report.data.bars,
  folds:report.outOfSample.folds,
  meanReturnPct:report.outOfSample.meanReturnPct,
  doubleCostPct:report.outOfSample.meanDoubleCostPct,
  fixedTrendPct:report.outOfSample.meanFixedTrendPct,
  positiveFolds:report.outOfSample.positiveFolds,
  virtualOrders:report.outOfSample.totalVirtualOrders,
  selections:report.selectionCounts,promotion:report.promotion.status,
  realOrders:0
 }));
 if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n## Multi-year daily gold swing research\n\n'+
    'Indicative XAU/USD OHLCV chart proxy, not broker fills.\n\n'+
    '| Research dimension | Historic result |\n|---|---|\n'+
    '| Source span | '+report.data.calendarYears+' calendar years |\n'+
    '| Held-out quarter-sized windows | '+report.outOfSample.folds+' |\n'+
    '| Mean return / test window | '+report.outOfSample.meanReturnPct.toFixed(4)+'% |\n'+
    '| Double transaction costs | '+report.outOfSample.meanDoubleCostPct.toFixed(4)+'% |\n'+
    '| Positive test windows | '+report.outOfSample.positiveFolds+' |\n'+
    '| Model status | NOT APPROVED |\n\nNo real orders. No auto-promotion.\n');
 }
})().catch(e=>{console.error('GOLD_SWING_RESEARCH_FAILED',e.message);process.exitCode=1;});
