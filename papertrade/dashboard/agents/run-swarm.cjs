/* Autonomous public XAU/USD researcher on GitHub-hosted runners.
 * No API keys, broker account, payments, signal execution, or model promotion.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadChart,loadDailyChart}=require('../gold-data.cjs');
const {runAgents}=require('./research-swarm.cjs');
async function main(){
 const out=process.env.GOLD_AGENT_OUTPUT||'artifacts/gold-agent-swarm';
 const priorPath=process.env.GOLD_AGENT_PREVIOUS||'.agent-state/memory.json';
 let previous=null;
 try{if(fs.existsSync(priorPath))previous=JSON.parse(fs.readFileSync(priorPath,'utf8'));}
 catch(e){console.error('GOLD_AGENT_MEMORY_UNREADABLE '+String(e.message||e));}
 const [short,long]=await Promise.all([loadChart(),loadDailyChart()]);
 const report=runAgents(short,long,previous);
 fs.mkdirSync(out,{recursive:true});
 const memoryPath=path.join(out,'memory.json'),reportPath=path.join(out,'report.json');
 fs.writeFileSync(memoryPath,JSON.stringify(report.memory,null,2)+'\n');
 fs.writeFileSync(reportPath,JSON.stringify({
  schema:report.schema,symbol:report.symbol,mode:report.mode,
  scheduledCadence:report.scheduledCadence,generatedAt:report.generatedAt,
  agents:report.agents,learningDelta:report.learningDelta,
  supervisoryDecision:report.supervisoryDecision
 },null,2)+'\n');
 const compact={
  runNumber:report.checkedRunNumber,symbol:report.symbol,
  newEvidence:report.learningDelta.newEvidence,
  fresh5mBars:report.agents['Market Data Sentinel'].intradayBars,
  dailyCloses:report.agents['Market Data Sentinel'].dailyCloses,
  meanIntradayOos:report.agents['Independent Evaluator'].fiveMinute.meanOosPct,
  meanDailyOos:report.agents['Independent Evaluator'].daily.meanOosPct,
  dailyTrendOos:report.agents['Independent Evaluator'].daily.fixedTrendPct,
  specialists:Object.keys(report.agents).length,
  status:report.supervisoryDecision.status,
  realOrders:0
 };
 console.log('GOLD_AGENT_SWARM_RESULT='+JSON.stringify(compact));
 if(process.env.GITHUB_STEP_SUMMARY){
  const status=report.learningDelta.newEvidence?
    'New gold market observations incorporated':'No new candles since retained previous run';
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## Gold-only specialist research agents\n\n'+
   '| Dimension | Verified result |\n|---|---|\n'+
   '| Instrument | XAU/USD only |\n'+
   '| Specialist workers | '+Object.keys(report.agents).length+' |\n'+
   '| Retained successful history count | '+report.memory.history.length+' |\n'+
   '| Market evidence change | '+status+' |\n'+
   '| Five-minute mean holdout return | '+compact.meanIntradayOos+'% |\n'+
   '| Daily model-selection mean holdout return | '+compact.meanDailyOos+'% |\n'+
   '| Fixed daily 20/60 trend holdout return | '+compact.dailyTrendOos+'% |\n'+
   '| Approval for funded execution | **DENIED / NOT TESTED** |\n\n'+
   'Pure data-driven software research workers. No standing AI language-model service, '+ 
   'no broker integration, no real orders, and no claim of profitable trading. '+ 
   'Historical proxy prices and hypothetical fills require independent forward testing.\n');
 }
}
main().catch(e=>{console.error('GOLD_AGENT_SWARM_FAILED',String(e.stack||e));process.exitCode=1;});
