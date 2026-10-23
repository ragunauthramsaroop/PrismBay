import fs from 'node:fs/promises';
import { WORKERS, checkWorker, applyConsequence, shouldDispatchFallback, reportSummary } from './worker-accountability.mjs';

const repository = process.env.GITHUB_REPOSITORY || '';
const token = process.env.GITHUB_TOKEN || '';
const title = '[AUTOMATION] PrismBay Worker Accountability';
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) {
  throw new Error('GitHub repository and scoped Actions token are required');
}
const base = 'https://api.github.com';
const nowMs = Date.now();
const timestamp = new Date(nowMs).toISOString();
const allowedFallback = 'buyer-acquisition.yml';

async function github(path, {method='GET',body=null}={}) {
  const response = await fetch(base+path, {
    method, signal: AbortSignal.timeout(14000),
    headers: {
      'accept':'application/vnd.github+json',
      'authorization':'Bearer '+token,
      'x-github-api-version':'2022-11-28',
      'user-agent':'PrismBay-Worker-Accountability/1.0',
      ...(body===null?{}:{'content-type':'application/json'})
    },
    ...(body===null?{}:{body:JSON.stringify(body)})
  });
  if (!response.ok) throw new Error('github_api_http_'+response.status);
  return response.status===204?null:response.json();
}

async function findDashboardIssue() {
  const query=encodeURIComponent('repo:'+repository+' in:title "PrismBay Worker Accountability"');
  const search=await github('/search/issues?q='+query+'&per_page=30');
  return (search.items||[]).find(item => item.title===title && !item.pull_request) || null;
}

function readPreviousState(body) {
  const match=String(body||'').match(/<!-- prismbay-worker-state:([A-Za-z0-9+/=]+) -->/);
  if(!match)return {workers:{}};
  try{
    const parsed=JSON.parse(Buffer.from(match[1],'base64').toString('utf8'));
    return parsed?.workers && typeof parsed.workers==='object'?parsed:{workers:{}};
  }catch{return {workers:{}};}
}

const existing=await findDashboardIssue();
const prior=readPreviousState(existing?.body);
const state={schemaVersion:1,checkedAt:timestamp,workers:{},fallbackEvents:[]};

for (const worker of WORKERS) {
  let runs=[],artifacts=[],fetchError=null;
  try {
    const route='/repos/'+repository+'/actions/workflows/'+encodeURIComponent(worker.workflow);
    const listing=await github(route+'/runs?branch=main&per_page=50');
    runs=listing.workflow_runs||[];
    const latest=runs.find(r=>['schedule','workflow_dispatch','push','workflow_run'].includes(r.event));
    if(latest?.status==='completed'&&latest?.conclusion==='success'){
      const proof=await github('/repos/'+repository+'/actions/runs/'+latest.id+'/artifacts?per_page=30');
      artifacts=proof.artifacts||[];
    }
  } catch (error) {
    fetchError=error instanceof Error?error.message:'unexpected_github_api_failure';
  }
  const check=checkWorker({worker,runs,artifacts,fetchError,nowMs});
  state.workers[worker.id]=applyConsequence(check,prior.workers?.[worker.id]||{},nowMs);
}

// Recovery route is read-only buyer acquisition using existing published offers;
// it cannot place orders, use paid ads or authorize a payment.
let dispatched=0;
for(const worker of WORKERS){
  const record=state.workers[worker.id];
  if(!shouldDispatchFallback(worker,record,nowMs))continue;
  const target=state.workers['buyer-acquisition'];
  if(worker.replacement!==allowedFallback){
    record.remediation='manual_review_required_unapproved_replacement';
    continue;
  }
  if(target?.status==='pass'||target?.status==='running'){
    record.remediation='reassigned_to_currently_operational_buyer_acquisition';
    continue;
  }
  if(dispatched>=1){
    record.remediation='fallback_request_queued_for_next_watchdog_cycle';
    continue;
  }
  try {
    await github('/repos/'+repository+'/actions/workflows/'+allowedFallback+'/dispatches',{
      method:'POST',body:{ref:'main'}
    });
    record.lastFallbackAt=timestamp;
    record.lastFallbackRunId=record.runId||null;
    record.remediation='dispatched_safe_digital_buyer_acquisition_fallback';
    state.fallbackEvents.push({from:worker.id,to:'buyer-acquisition',at:timestamp});
    dispatched++;
  }catch(error){
    record.remediation='fallback_dispatch_failed_'+(error instanceof Error?error.message:'unknown');
  }
}

const summary=reportSummary(state);
const rows=WORKERS.map(w=>{
  const r=state.workers[w.id];
  const evidence=r.artifactName?'[\`'+r.artifactName+'\`]('+r.runUrl+')':r.evidence||'none';
  const result=r.status==='pass'?'PASS':r.status==='running'?'RUNNING':'FAIL';
  return '| '+w.id+' | '+result+' | '+r.failureStreak+' | '+r.consequence+
    ' | '+r.reason+' | '+evidence.replaceAll('|','/')+' |';
});
const escalations=WORKERS.filter(w=>state.workers[w.id].consequence==='replace_route').map(w=>{
  const r=state.workers[w.id];
  return '- **'+w.id+'**: '+r.reason+'. Alternative: '+(r.remediation||'manual evidence review, fix and reassign')+'.';
});
const body=[
  '# PrismBay Worker Accountability',
  '',
  '**Checked:** '+timestamp,
  '**Scope:** GitHub Actions worker outputs, not staff performance',
  '**Active objective:** qualified traffic and genuine paid sales from verified digital offers',
  '',
  '| Worker | Execution | Consecutive bad checks | Consequence | Reason | Evidence |',
  '| --- | --- | ---: | --- | --- | --- |',
  ...rows,
  '',
  '## Escalation and recovery',
  '1. First bad check: **warning** with specific missing evidence.',
  '2. Second consecutive bad check: **probation** and highest-priority repair.',
  '3. Third bad check: **replace_route**; route work to safe buyer-acquisition fallback when required.',
  '4. A fresh successful run with output resets the warning streak.',
  '',
  ...(escalations.length?escalations:['No worker currently requires route replacement.']),
  '',
  '## Commercial integrity',
  '- A successful Actions run and nonempty artifact do NOT establish impressions, traffic, sales, payout or profit.',
  '- All automated substitution routes remain read-only/marketing-only; no supplier purchases, payment charges, paid ads or invented orders.',
  '- The physical store remains gated until final buyer-specific supplier and freight evidence are confirmed.',
  '- The dashboard is updated rather than creating one issue per failure.',
  '',
  '<!-- prismbay-worker-state:'+Buffer.from(JSON.stringify(state)).toString('base64')+' -->'
].join('\n');

if(existing) {
  await github('/repos/'+repository+'/issues/'+existing.number,{
    method:'PATCH',body:{title,body,state:'open'}
  });
}else{
  await github('/repos/'+repository+'/issues',{
    method:'POST',body:{title,body,labels:[]}
  });
}
await fs.mkdir('growth-reports',{recursive:true});
await fs.writeFile('growth-reports/worker-accountability.json',JSON.stringify({summary,...state},null,2)+'\n');

const lines=[
  '## PrismBay Worker Accountability',
  '',
  '| Worker | Status | Streak | Consequence |',
  '| --- | --- | ---: | --- |',
  ...WORKERS.map(w=>{const r=state.workers[w.id];return '| '+w.id+' | '+r.status+' | '+r.failureStreak+' | '+r.consequence+' |';}),
  '',
  '**Important:** successful automation is not verified revenue.',
  'Detailed evidence and recovery actions are in the permanent GitHub issue.'
];
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
console.log(JSON.stringify(summary));
if(summary.failures>0)process.exitCode=1;
