import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Only deliberately approved operational metadata is published to GitHub Pages.
// Never publish raw report objects: later agents may add private customer data.
export const WORKER_DESCRIPTIONS = Object.freeze({
  'buyer-acquisition': {title:'Buyer Acquisition',group:'Growth',cadence:'Every 30 minutes',purpose:'Produces and publishes digital product buyer pages',workflow:'buyer-acquisition.yml'},
  'external-traffic': {title:'External Traffic Factory',group:'Growth',cadence:'Daily',purpose:'Prepares original organic promotional assets',workflow:'external-traffic-factory.yml'},
  'ceo-recovery': {title:'CEO Recovery',group:'Operations',cadence:'Every 15 minutes',purpose:'Reprioritizes sales blockers and recovery assignments',workflow:'ceo-autonomous-recovery.yml'},
  'paperclip-revenue': {title:'Paperclip Revenue Ops',group:'Revenue',cadence:'Hourly',purpose:'Runs conversion, growth, and first-sale evidence checks',workflow:'paperclip-revenue-ops.yml'},
  'commerce-control': {title:'Commerce Control',group:'Commerce',cadence:'Every 15 minutes',purpose:'Checks supplier, fulfillment and order safeguards',workflow:'paperclip-commerce-group.yml'}
});
const statuses=new Set(['pass','running','fail']);
const consequenceSet=new Set(['none','warning','probation','replace_route','replacement_pending']);
const reasons=/^[a-z0-9_]{1,80}$/;
const clean=(value,max=100)=>typeof value==='string'?value.replace(/[^\w\s.:/-]/g,'').slice(0,max):'';
const safeDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const positive=value=>Number.isFinite(value)&&value>=0?Math.trunc(value):null;
const runHref=(id,url)=>{
  if(!Number.isSafeInteger(id)||id<1)return null;
  const expected='https://github.com/ragunauthramsaroop/PrismBay/actions/runs/'+id;
  return url===expected?expected:null;
};
export function publicSnapshot(report){
  if(!report||report.schemaVersion!==1||!report.workers||typeof report.workers!=='object')throw Error('invalid_operational_report');
  const checkedAt=safeDate(report.checkedAt);
  if(!checkedAt)throw Error('invalid_checked_at');
  const workers=Object.entries(WORKER_DESCRIPTIONS).map(([id,definition])=>{
    const r=report.workers[id]||{};
    const status=statuses.has(r.status)?r.status:'fail';
    const runId=positive(r.runId);
    const reason=typeof r.reason==='string'&&reasons.test(r.reason)?r.reason:'no_current_evidence';
    const artifact=clean(r.artifactName,100);
    return {
      id,title:definition.title,group:definition.group,cadence:definition.cadence,
      purpose:definition.purpose,workflow:definition.workflow,
      status,reason,consequence:consequenceSet.has(r.consequence)?r.consequence:'none',
      failureStreak:Math.min(100,positive(r.failureStreak)??0),
      runId,runUrl:runHref(runId,r.runUrl),runAgeMinutes:positive(r.ageMinutes),
      artifactName:artifact||null,artifactBytes:positive(r.artifactBytes),
      remediation:clean(r.remediation,110)||null
    };
  });
  const summary={
    passing:workers.filter(w=>w.status==='pass').length,
    running:workers.filter(w=>w.status==='running').length,
    attention:workers.filter(w=>w.status==='fail').length,
    warnings:workers.filter(w=>w.failureStreak>0).length,
    total:workers.length
  };
  return {
    schemaVersion:1,checkedAt,source:'GitHub Actions accountability evidence',
    refreshPolicy:'Best-effort GitHub schedules. Static snapshot; refresh does not run agents.',
    summary,workers,
    commercial:{
      verifiedPaidSale:false,
      salesEvidence:'Not verified by this status source',
      note:'Operational success, site visits and Stripe link availability are not proof of payment or profit.'
    }
  };
}
async function main(){
  const [source,destination]=process.argv.slice(2);
  if(!source||!destination)throw Error('Usage: node scripts/public-ops-snapshot.mjs input.json output.json');
  const report=JSON.parse(await fs.readFile(source,'utf8'));
  const snapshot=publicSnapshot(report);
  await fs.mkdir(new URL('.',pathToFileURL(destination)).pathname,{recursive:true}).catch(async()=>{await fs.mkdir('ops/public-status',{recursive:true});});
  await fs.writeFile(destination,JSON.stringify(snapshot,null,2)+'\n');
  console.log(JSON.stringify({checkedAt:snapshot.checkedAt,summary:snapshot.summary,output:destination}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
