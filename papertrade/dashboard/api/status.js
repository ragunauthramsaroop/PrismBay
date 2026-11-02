/* Public gold-only dashboard status. Never mixes legacy BTC research with XAU. */
'use strict';
const {loadSpot,loadChart,SYMBOL}=require('../gold-data.cjs');
const REPO='ragunauthramsaroop/PrismBay';
const GH='https://api.github.com/repos/'+REPO;
async function json(url){
  const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'GoldPaperMonitor/1.0'},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!res.ok)throw Error('Metadata HTTP '+res.status);
  return await res.json();
}
function run(r){return {id:r.id,name:r.name,branch:r.head_branch,status:r.status,conclusion:r.conclusion,
  started_at:r.run_started_at||r.created_at,updated_at:r.updated_at,url:r.html_url,event:r.event,sha:r.head_sha?.slice(0,7)||null};}
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=30');
  res.setHeader('X-Content-Type-Options','nosniff');
  const [spot,chart,jobs]=await Promise.allSettled([
    loadSpot(),loadChart(),json(GH+'/actions/workflows/papertrade-dashboard-ci.yml/runs?branch=experiment%2Fai-paper-trading&per_page=10')
  ]);
  const error={};
  if(spot.status!=='fulfilled')error.gold=String(spot.reason?.message||'unavailable');
  if(chart.status!=='fulfilled')error.chart=String(chart.reason?.message||'unavailable');
  if(jobs.status!=='fulfilled')error.workflow=String(jobs.reason?.message||'unavailable');
  const market=spot.status==='fulfilled'?{
    ...spot.value,source:'XAUS indicative XAU/USD spot, not executable'
  }:null;
  const chartBars=chart.status==='fulfilled'?chart.value:[];
  const runs=jobs.status==='fulfilled'?(jobs.value.workflow_runs||[]).map(run):[];
  const latest=runs[0]||null;
  const healthy=latest?.status==='completed'&&latest.conclusion==='success'&&
    Date.now()-Date.parse(latest.started_at)<72*3600000;
  return res.status(200).json({
    generatedAt:new Date().toISOString(),
    platform:'PERSONAL_GOLD_ONLY_PAPER_RESEARCH',
    tradingMode:'PAPER_ONLY',symbol:SYMBOL,realOrders:0,running24x7:false,
    operations:{
      latest,recent:runs,testRuns:runs.slice(0,5),health:!latest?'UNAVAILABLE':
      latest.status!=='completed'?'RUNNING':latest.conclusion!=='success'?'FAILED':healthy?'HEALTHY':'STALE'
    },
    dailySchedule:'Legacy BTC workflow retired; gold cloud scheduler not configured',
    market,
    priceHistory:chartBars.slice(-300).map(b=>({date:new Date(b.time).toISOString(),close:b.close})),
    portfolio:null,
    research:{
      status:'GOLD_ONLY_FORWARD_RESEARCH_UNVALIDATED',
      verifiedOn:null,folds:0,trainDays:0,testDays:0,
      results:[],
      sourceRun:null
    },
    errors:error
  });
};
