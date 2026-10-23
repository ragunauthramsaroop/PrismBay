/* Public GitHub run overlay for PrismBay Mission Control.
 * Actual run state is updated from GitHub's public API. A successful Actions
 * run without independent retained output stays "proof pending", never PASS.
 */
(function(root){
'use strict';
const WORKFLOW_NAMES=Object.freeze({
 'buyer-acquisition':'PrismBay Buyer Acquisition Priority',
 'external-traffic':'PrismBay External Traffic Factory',
 'ceo-recovery':'PrismBay CEO Autonomous Recovery Loop',
 'paperclip-revenue':'PrismBay Paperclip Revenue Ops',
 'commerce-control':'PrismBay Paperclip Commerce Group'
});
const OPERATIONAL_EVENTS=new Set(['schedule','push','workflow_dispatch','workflow_run']);
const PROOF_MAX_AGE=65*60*1000, RUN_DATA_MAX_AGE=4*60*1000, RUN_MAX_AGE=35*60*1000;
const parsedTime=s=>{const d=Date.parse(s||'');return Number.isFinite(d)?d:null;};
const validRunId=x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):null;
function latestProductionRuns(runs){
 const result={};
 if(!Array.isArray(runs))return result;
 for(const run of runs){
  if(!run||run.head_branch!=='main'||!OPERATIONAL_EVENTS.has(run.event))continue;
  if(!WORKFLOW_NAMES||!Object.values(WORKFLOW_NAMES).includes(run.name))continue;
  const id=validRunId(run.id);
  if(id===null||parsedTime(run.created_at)===null)continue;
  if(!result[run.name]||id>result[run.name].id)result[run.name]=run;
 }
 return result;
}
function reconcile(snapshot,runs,eventsAt,now=Date.now()){
 if(!snapshot||!Array.isArray(snapshot.workers))return null;
 const checked=parsedTime(snapshot.checkedAt);
 const auditFresh=checked!==null&&now>=checked&&now-checked<=PROOF_MAX_AGE;
 const liveAt=parsedTime(eventsAt);
 const liveFresh=liveAt!==null&&now>=liveAt&&now-liveAt<=RUN_DATA_MAX_AGE;
 const latest=liveFresh?latestProductionRuns(runs):{};
 const workers=snapshot.workers.map(original=>{
  const worker={...original};
  const snapRun=validRunId(original.runId)||0;
  worker.source='published_audit';
  worker.evidenceCheckedAt=snapshot.checkedAt;
  worker.statusText=original.status==='pass'?'Passing · audited proof':
    original.status==='running'?'Running at last audit':'Attention · audited';
  const age=(checked===null?null:Math.max(0,Math.floor((now-checked)/60000)));
  if(age!==null&&Number.isFinite(original.runAgeMinutes))worker.runAgeMinutes=original.runAgeMinutes+age;
  const run=latest[WORKFLOW_NAMES[original.id]];
  // GitHub run IDs increase monotonically. An older API row cannot override
  // newer audited evidence even if the browser receives stale/cached data.
  if(run&&run.id>=snapRun){
   const started=parsedTime(run.created_at);
   const minutes=started===null?null:Math.max(0,Math.floor((now-started)/60000));
   const newer=run.id>snapRun;
   worker.runId=run.id;
   worker.runUrl='https://github.com/ragunauthramsaroop/PrismBay/actions/runs/'+run.id;
   worker.runAgeMinutes=minutes;
   worker.lastEventAt=run.updated_at||run.created_at;
   if(run.status!=='completed'){
    if(started!==null&&now-started>RUN_MAX_AGE){
     worker.status='fail';worker.statusText='Run appears stuck';worker.reason='run_stuck';
    }else{
     worker.status='running';worker.statusText='Live run in progress';worker.reason='operational_run_in_progress';
    }
    worker.source='github_live';return worker;
   }
   if(run.conclusion!=='success'){
    worker.status='fail';worker.statusText='Latest run '+String(run.conclusion||'failed');
    worker.reason='run_'+String(run.conclusion||'unknown').replace(/[^a-z0-9_]/g,'').slice(0,40);
    worker.source='github_live';return worker;
   }
   if(newer||original.status!=='pass'){
    worker.status='pending';worker.statusText='Succeeded · proof pending';
    worker.reason='completed_awaiting_artifact_audit';
    worker.source='github_live';return worker;
   }
   // Audited run and GitHub agree; retain the saved artifact proof.
   worker.source='audited_and_live';
   worker.statusText='Passing · verified output';
  }
  if(!auditFresh&&worker.source==='published_audit'){
    worker.status='unknown';worker.statusText='Audit overdue';
    worker.reason='published_audit_stale';
  }
  return worker;
 });
 const summary={
   passing:workers.filter(w=>w.status==='pass').length,
   running:workers.filter(w=>w.status==='running'||w.status==='pending').length,
   attention:workers.filter(w=>w.status==='fail'||w.status==='unknown').length,
   warnings:workers.filter(w=>(w.failureStreak||0)>0).length,
   total:workers.length
 };
 return {...snapshot,workers,summary,auditFresh,liveFresh,liveAt:liveFresh?eventsAt:null};
}
const api=Object.freeze({WORKFLOW_NAMES,latestProductionRuns,reconcile});
root.PrismBayRunHealth=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
