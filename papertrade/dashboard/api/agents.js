/* Public GitHub research-agent run status. Metadata only, no trading endpoints. */
'use strict';
const URI='https://api.github.com/repos/ragunauthramsaroop/PrismBay';
const WORKERS=[
 'Market Data Sentinel','Intraday Trend Analyst','Breakout Analyst',
 'Prediction Researcher','Daily Gold Trend Analyst','Cost and Risk Auditor',
 'Independent Evaluator'
];
module.exports=async (req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const u=URI+'/actions/workflows/gold-agent-swarm.yml/runs?branch=main&per_page=5';
  const r=await fetch(u,{headers:{'Accept':'application/vnd.github+json',
    'User-Agent':'GoldPaperTradeOS-AgentMonitor/1.0'},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('GitHub research workflow status '+r.status);
  const data=await r.json();
  const latest=Array.isArray(data.workflow_runs)?data.workflow_runs[0]:null;
  const summary=latest?{
   runId:latest.id,
   state:latest.status,
   result:latest.conclusion,
   at:latest.run_started_at||latest.created_at,
   completedAt:latest.updated_at,
   url:latest.html_url,
   branch:latest.head_branch
  }:null;
  return res.status(200).json({
   mode:'GOLD_RESEARCH_ONLY',symbol:'XAU/USD',
   agentImplementation:'scheduled deterministic software workers with trained historical models',
   agents:WORKERS,
   cadence:'Every three hours (GitHub scheduled runs may start late)',
   historicalMemory:'Rolling Actions cache and 30-day report artifacts. Not permanent storage.',
   latest:summary,
   status:!summary?'NOT_STARTED':summary.state==='completed'?
    (summary.result==='success'?'LAST_RUN_PASSED':'LAST_RUN_FAILED'):'RUN_IN_PROGRESS',
   liveBrokerOrders:false,liveCapitalConnected:false,automaticModelPromotion:false
  });
 }catch(e){return res.status(503).json({error:'Gold agent status unavailable',
  detail:String(e.message||e),mode:'GOLD_RESEARCH_ONLY',liveBrokerOrders:false});}
};
