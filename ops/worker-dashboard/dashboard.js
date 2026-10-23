/* PrismBay Mission Control: public read-only telemetry.
 * Operational data updates on GitHub Actions completion; browser polling is not
 * an always-on worker, authenticated sales ledger or remote action controller.
 */
'use strict';
const REPO='ragunauthramsaroop/PrismBay';
const RUNS_ENDPOINT='https://api.github.com/repos/'+REPO+'/actions/runs?branch=main&per_page=100';
const SNAPSHOT_INTERVAL=60000;
const ACTIVITY_INTERVAL=120000; // 30 requests/hour in a single open browser tab (GitHub anonymous limit is typically 60/hour)
const state={snapshot:null,events:[],eventsAt:null,activityError:null,workerFilter:'all',activityFilter:'operational',loading:false};
const byId=id=>document.getElementById(id);
const safeTime=value=>{
  const time=Date.parse(value||'');
  return Number.isFinite(time)?time:null;
};
const relative=value=>{
  const time=safeTime(value);
  if(time===null)return 'Unknown';
  const delta=Math.max(0,Date.now()-time);
  if(delta<60000)return 'Just now';
  const minutes=Math.floor(delta/60000);
  if(minutes<60)return minutes+'m ago';
  const hours=Math.floor(minutes/60);
  if(hours<24)return hours+'h ago';
  return Math.floor(hours/24)+'d ago';
};
const fullTime=value=>{
  const date=safeTime(value);
  return date===null?'No timestamp':new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date);
};
const runLink=run=>{
  const id=Number(run?.id);
  if(!Number.isSafeInteger(id)||id<1)return null;
  return 'https://github.com/'+REPO+'/actions/runs/'+id;
};
const capital=value=>String(value||'unknown').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const displayReasons={
  'fresh_success_with_evidence':'Successful run with a retained output artifact',
  'operational_run_in_progress':'Processing work; evidence awaits completion',
  'worker_stale':'Latest operational result exceeded its freshness window',
  'run_failure':'Run failed; inspect the execution log',
  'run_cancelled':'Run was cancelled',
  'run_skipped':'Workflow did not execute worker tasks',
  'no_output_evidence':'Run finished without a retained output artifact',
  'no_current_evidence':'No verified operational evidence published',
  'workflow_api_unavailable':'GitHub operational data could not be checked',
  'run_stuck':'Run exceeded its allowed execution grace period',
  'no_operational_runs':'No production run found',
  'completed_awaiting_artifact_audit':'Run finished successfully; output artifact verification is pending',
  'published_audit_stale':'The published audit is overdue; cannot mark this worker as passing',
};
const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const link=(text,url,className='')=>{
  const a=el('a',className,text);
  if(url&&/^https:\/\/(github\.com|clean\.prismbayai\.com|prismbay-clean-global\.floot\.app)\//.test(url)){
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  }else{a.textContent=text+' (unavailable)';}
  return a;
};
const placeholder=(message,cls='empty-worker')=>el('div',cls,message);

function renderSnapshot(){
  const source=state.snapshot;
  const snap=source&&globalThis.PrismBayRunHealth?.reconcile(source,state.events,state.eventsAt,Date.now());
  const parent=byId('workers-list');
  parent.replaceChildren();
  if(!snap||!Array.isArray(snap.workers)){
    for(const id of ['kpi-pass','kpi-running','kpi-fail'])byId(id).textContent='—';
    byId('snapshot-updated').textContent='No operational evidence has been published';
    byId('data-pill').textContent='AUDIT UNAVAILABLE';
    byId('api-pill').textContent=state.eventsAt?'GitHub runs checked '+relative(state.eventsAt):'GitHub runs: unavailable';
    byId('data-pill').className='data-pill stale';
    parent.append(placeholder('Published worker evidence is unavailable. Open the accountability issue or refresh after the next GitHub run.'));
    return;
  }
  const {passing,running,attention,warnings,total}=snap.summary||{};
  byId('kpi-pass').textContent=Number.isInteger(passing)?passing:'—';
  byId('kpi-running').textContent=Number.isInteger(running)?running:'—';
  byId('kpi-fail').textContent=Number.isInteger(attention)?attention:'—';
  byId('warning-count').textContent=Number.isInteger(warnings)?warnings:'—';
  byId('fleet-count').textContent=Number.isInteger(total)?total:snap.workers.length;
  const updated=relative(snap.checkedAt);
  const age=Date.now()-(safeTime(snap.checkedAt)||0);
  const stale=age>75*60000;
  byId('data-pill').className='data-pill '+(stale?'stale':'fresh');
  byId('data-pill').textContent='INDEPENDENT AUDIT · '+updated.toUpperCase();
  byId('api-pill').textContent=snap.liveFresh?'GITHUB RUNS · '+relative(state.eventsAt).toUpperCase():state.activityError?'GITHUB RUNS · API LIMITED':'GITHUB RUNS · WAITING';
  byId('api-pill').className='data-pill '+(snap.liveFresh?'fresh':'stale');
  byId('snapshot-updated').textContent='Last accountability audit: '+fullTime(snap.checkedAt)+' · '+updated;
  byId('health-note').textContent=snap.liveFresh
    ? 'Latest GitHub run check: '+fullTime(state.eventsAt)+'. Last independent evidence audit: '+fullTime(snap.checkedAt)+'. A successful run without audited output is shown as proof pending.'
    : (stale?'The independent audit is overdue and live GitHub run data is unavailable; results are not confirmed current.':'Independent evidence last audited '+fullTime(snap.checkedAt)+'. Checking GitHub for newer runs.');
  const ordered=[...snap.workers].sort((a,b)=>({fail:0,unknown:0,running:1,pending:1,pass:2}[a.status]??3)-({fail:0,unknown:0,running:1,pending:1,pass:2}[b.status]??3));
  const filtered=state.workerFilter==='all'?ordered:ordered.filter(w=>state.workerFilter==='running'?['running','pending'].includes(w.status):state.workerFilter==='fail'?['fail','unknown'].includes(w.status):w.status===state.workerFilter);
  if(filtered.length===0){parent.append(placeholder('No workers match this filter.'));return;}
  for(const worker of filtered)parent.append(workerCard(worker));
}
function workerCard(w){
  const article=el('article','worker');
  const top=el('div','worker-top'),left=el('div');
  left.append(el('div','worker-group',w.group||'Automation'),el('div','worker-name',w.title||w.id));
  const status=['pass','fail','running','pending','unknown'].includes(w.status)?w.status:'unknown';
  const chip=el('span','status-chip '+status,status==='pass'?'Passing · audited':status==='running'?'Running now':status==='pending'?'Proof pending':status==='unknown'?'Audit overdue':'Needs attention');
  top.append(left,chip);article.append(top);
  article.append(el('div','worker-purpose',w.purpose||'Workflow'));
  const details=el('div','worker-details');
  for(const [name,value] of [
    ['Run age',w.runAgeMinutes===null?'Unknown':w.runAgeMinutes+' min'],
    ['Expected frequency',w.cadence||'Scheduled'],
    ['Consecutive bad checks',w.failureStreak??0],
    ['Last audited artifact',w.artifactName?(w.artifactBytes?Number(w.artifactBytes).toLocaleString()+' bytes':'Retained artifact'):'Awaiting proof']
  ]){
    const d=el('div');d.append(el('span','detail-label',name),el('span','detail-value',value));details.append(d);
  }
  article.append(details);
  const bottom=el('div','worker-bottom');
  if(w.runUrl&&runLink({id:w.runId})===w.runUrl)bottom.append(link('View actual run ↗',w.runUrl));
  else bottom.append(link('Open workflow ↗','https://github.com/'+REPO+'/actions/workflows/'+encodeURIComponent(w.workflow)));
  const consequence=w.consequence==='none'?'No warnings':capital(w.consequence);
  bottom.append(el('span','worker-consequence'+(w.consequence!=='none'?' alert':''),consequence));article.append(bottom);
  article.append(el('div','worker-description',(w.source==='github_live'?'Live GitHub run: ':'Audited status: ')+(w.statusText||displayReasons[w.reason]||capital(w.reason))+(w.remediation?' · Recovery: '+w.remediation:'')));
  return article;
}
function activityType(run){
  if(run.status!=='completed')return 'running';
  return ['success','failure','skipped','cancelled'].includes(run.conclusion)?run.conclusion:'failure';
}
function recentRuns(){
  let rows=state.events;
  if(state.activityFilter==='operational'){
    rows=rows.filter(x=>x.head_branch==='main'&&['push','schedule','workflow_run','workflow_dispatch'].includes(x.event)&&x.conclusion!=='skipped');
  }else if(state.activityFilter==='fail'){
    rows=rows.filter(x=>x.status==='completed'&&['failure','timed_out','action_required','startup_failure'].includes(x.conclusion));
  }
  return rows.slice(0,16);
}
function renderActivity(){
  const parent=byId('activity-list');parent.replaceChildren();
  if(!state.eventsAt){
    byId('activity-source').className='source-badge error';byId('activity-source').textContent='API unavailable';
    parent.append(placeholder('GitHub activity could not be loaded. The evidence-backed worker cards above can still be used.','activity-empty'));
    return;
  }
  byId('activity-source').className='source-badge '+(state.activityError?'error':'ok');
  byId('activity-source').textContent=state.activityError?'GitHub delayed':'GitHub API';
  byId('activity-fetched').textContent='Fetched '+relative(state.eventsAt);
  const rows=recentRuns();
  if(!rows.length){parent.append(placeholder('No recent runs match this filter.','activity-empty'));return;}
  for(const run of rows){
    const status=activityType(run);
    const node=el('article','activity'),icon=el('span','activity-dot '+status,status==='success'?'✓':status==='failure'?'!':status==='running'?'•':'−');
    const content=el('div','activity-main'),head=el('div','activity-head');
    head.append(el('div','activity-name',run.name||'Unnamed workflow'),el('div','activity-time',relative(run.created_at)));
    content.append(head);
    const meta=el('div','activity-meta');
    meta.append(el('span','',capital(status)),el('span','','·'),el('span','',capital(run.event)));
    if(run.head_branch&&run.head_branch!=='main')meta.append(el('span','','· '+run.head_branch.slice(0,45)));
    const url=runLink(run);
    if(url)meta.append(link('Open run ↗',url));
    content.append(meta);node.append(icon,content);parent.append(node);
  }
}
async function getJson(url,timeout=13000){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
async function updateSnapshot(){
  try {
    const json=await getJson('status.json?ts='+Date.now());
    if(json?.schemaVersion!==1||!Array.isArray(json.workers))throw Error('Invalid published snapshot');
    state.snapshot=json;
  }catch(err){if(!state.snapshot)state.snapshot=null;}
  renderSnapshot();
}
async function updateActivity(){
  try{
    const data=await getJson(RUNS_ENDPOINT,15000);
    if(!Array.isArray(data.workflow_runs))throw Error('Invalid GitHub response');
    state.events=data.workflow_runs;state.eventsAt=new Date().toISOString();state.activityError=null;
    byId('live-mode').innerHTML='<span class="live-dot"></span> GITHUB SYNC · ~2 MIN';
  }catch(err){
    state.activityError=err instanceof Error?err.message:'Github API unavailable';
    if(!state.eventsAt)state.events=[];
    byId('activity-source').className='source-badge error';
    byId('activity-source').textContent='GitHub limited';
    byId('live-mode').textContent='GITHUB API DELAYED';
  }
  renderActivity();
  renderSnapshot();
}
async function updateCommerce(){
  const [digital,physical]=await Promise.allSettled([
    getJson('/sales/revenue-control.json?ts='+Date.now()),
    getJson('/marketplace/ebay/control-plane.json?ts='+Date.now())
  ]);
  const digitalText=byId('digital-gate'),digitalBadge=byId('digital-badge');
  const physicalText=byId('physical-gate'),physicalBadge=byId('physical-badge');
  if(digital.status==='fulfilled'){
    const doc=digital.value,healthy=doc?.funnelHealth?.guideHealthy===true&&doc?.funnelHealth?.checkoutHealthy===true;
    const checked=safeTime(doc.checkedAt),stale=checked===null||Date.now()-checked>48*3600000;
    digitalText.textContent=healthy&&!stale?'Buyer guide and payment-link HTTP checks passed '+relative(doc.checkedAt)+'. This does not verify fulfillment.':
      'Recent buyer path verification is unavailable or overdue.';
    digitalBadge.textContent=healthy&&!stale?'Links checked':'Review';
    digitalBadge.className='gate-tag '+(healthy&&!stale?'good':'blocked');
  }else{
    digitalText.textContent='Buyer-path report not reachable. Check GitHub Pages publisher.';
    digitalBadge.textContent='Unknown';digitalBadge.className='gate-tag blocked';
  }
  if(physical.status==='fulfilled'){
    const doc=physical.value,ready=doc?.readyForBrowserPublish===true;
    const checked=safeTime(doc.checkedAt),stale=checked===null||Date.now()-checked>48*3600000;
    if(ready&&!stale){
      physicalText.textContent='Marketplace report indicates listing readiness; final payment and fulfillment remain separate checks.';
      physicalBadge.textContent='Listing gates pass';physicalBadge.className='gate-tag good';
    }else{
      const reasons=[];
      if(doc?.gates?.ebaySellerAuthenticated===false)reasons.push('eBay seller authorization');
      if(doc?.gates?.liveStockVerified===false)reasons.push('live stock');
      if(doc?.gates?.dispatchLocationVerified===false)reasons.push('dispatch route');
      physicalText.textContent=(reasons.length?'Missing: '+reasons.join(', ')+'. ':'')+
        (stale?'Supplier evidence is stale. ':'')+'Physical checkout is not authorized by this dashboard.';
      physicalBadge.textContent='Blocked';physicalBadge.className='gate-tag blocked';
    }
  }else{
    physicalText.textContent='Cannot read marketplace readiness evidence. Do not treat physical sales as authorized.';
    physicalBadge.textContent='Unknown';physicalBadge.className='gate-tag blocked';
  }
}
async function refreshAll(manual=false){
  if(state.loading)return;
  state.loading=true;byId('refresh').disabled=true;byId('refresh').textContent='Refreshing…';
  await Promise.allSettled([updateSnapshot(),updateActivity(),updateCommerce()]);
  state.loading=false;byId('refresh').disabled=false;byId('refresh').textContent='↻ Refresh now';
}
function tick(){
  byId('clock').textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date());
  if(state.snapshot)renderSnapshot();
  if(state.eventsAt)byId('activity-fetched').textContent='Fetched '+relative(state.eventsAt);
}
function init(){
  for(const button of document.querySelectorAll('.filter')){
    button.addEventListener('click',()=>{
      state.workerFilter=button.dataset.filter||'all';
      for(const item of document.querySelectorAll('.filter')){
        const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));
      }
      renderSnapshot();
    });
  }
  byId('activity-filter').addEventListener('change',event=>{state.activityFilter=event.target.value;renderActivity();});
  byId('refresh').addEventListener('click',()=>{void refreshAll(true);});
  const nav=[...document.querySelectorAll('.side-nav .nav-item[href^="#"]')];
  nav.forEach(item=>item.addEventListener('click',()=>nav.forEach(link=>link.classList.toggle('active',link===item))));
  tick();
  void refreshAll();
  setInterval(()=>{void updateSnapshot();void updateCommerce();},SNAPSHOT_INTERVAL);
  setInterval(()=>{void updateActivity();},ACTIVITY_INTERVAL);
  setInterval(tick,30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
