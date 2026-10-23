import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({module:{exports:{}},globalThis:{}});
vm.runInContext(fs.readFileSync(new URL('./live-health.js',import.meta.url),'utf8'),context);
const {reconcile,latestProductionRuns}=context.module.exports;
const now=Date.parse('2026-10-23T21:42:00Z');
const audit=()=>({schemaVersion:1,checkedAt:'2026-10-23T21:27:00Z',workers:[
 {id:'buyer-acquisition',status:'pass',runId:100,runAgeMinutes:5,reason:'fresh_success_with_evidence',artifactName:'proof-100',artifactBytes:50,consequence:'none',failureStreak:0},
 {id:'commerce-control',status:'running',runId:90,runAgeMinutes:0,reason:'operational_run_in_progress',artifactName:null,consequence:'none',failureStreak:0},
 {id:'paperclip-revenue',status:'pass',runId:80,runAgeMinutes:2,reason:'fresh_success_with_evidence',artifactName:'revenue-80',artifactBytes:51,consequence:'none',failureStreak:0}
]});
const item=(name,id,status='completed',conclusion='success',created='2026-10-23T21:41:00Z',event='workflow_dispatch',branch='main')=>({
 name,id,status,conclusion,created_at:created,updated_at:created,event,head_branch:branch
});
test('newer successful run remains proof pending, not falsely PASS',()=>{
 const r=reconcile(audit(),[item('PrismBay Buyer Acquisition Priority',101)],'2026-10-23T21:42:00Z',now);
 assert.equal(r.workers[0].status,'pending');
 assert.equal(r.workers[0].statusText,'Succeeded · proof pending');
 assert.equal(r.workers[0].runId,101);
 assert.equal(r.workers[0].artifactName,'proof-100'); // previous proof is preserved and labeled historic
 assert.equal(r.summary.passing,1);
 assert.equal(r.summary.running,2);
});
test('live in-progress and failed runs override stale snapshot',()=>{
 const r=reconcile(audit(),[
  item('PrismBay Buyer Acquisition Priority',102,'in_progress',null),
  item('PrismBay Paperclip Revenue Ops',81,'completed','failure')
 ],'2026-10-23T21:42:00Z',now);
 assert.equal(r.workers[0].status,'running');
 assert.equal(r.workers[2].status,'fail');
 assert.equal(r.workers[2].runId,81);
});
test('old PR and ignored issue comments never masquerade as production',()=>{
 const runs=[
  item('PrismBay Buyer Acquisition Priority',200,'completed','failure','2026-10-23T21:41:00Z','pull_request','feature-x'),
  item('PrismBay Buyer Acquisition Priority',180,'completed','success','2026-10-23T21:40:00Z','issue_comment'),
  item('PrismBay Buyer Acquisition Priority',110,'completed','success')
 ];
 const latest=latestProductionRuns(runs);
 assert.equal(latest['PrismBay Buyer Acquisition Priority'].id,110);
});
test('audited success stays green when API has the same verified run',()=>{
 const r=reconcile(audit(),[item('PrismBay Buyer Acquisition Priority',100)],'2026-10-23T21:42:00Z',now);
 assert.equal(r.workers[0].status,'pass');
 assert.equal(r.workers[0].source,'audited_and_live');
});
test('previous running audit changes to proof pending when run completes',()=>{
 const r=reconcile(audit(),[item('PrismBay Paperclip Commerce Group',90)],'2026-10-23T21:42:00Z',now);
 assert.equal(r.workers[1].status,'pending');
});
test('stale audit never displays a stale PASS indefinitely',()=>{
 const later=now+95*60000;
 const r=reconcile(audit(),[],null,later);
 assert.equal(r.workers[0].status,'unknown');
 assert.equal(r.workers[0].reason,'published_audit_stale');
 assert.equal(r.summary.attention,2);
});
test('stale GitHub API data cannot override fresher audited success',()=>{
 const r=reconcile(audit(),[item('PrismBay Buyer Acquisition Priority',110,'completed','failure')],'2026-10-23T21:30:00Z',now);
 assert.equal(r.workers[0].status,'pass');
 assert.equal(r.liveFresh,false);
});
test('a 35-minute uncompleted run is visibly stuck',()=>{
 const r=reconcile(audit(),[item('PrismBay Buyer Acquisition Priority',110,'in_progress',null,'2026-10-23T21:00:00Z')],'2026-10-23T21:42:00Z',now);
 assert.equal(r.workers[0].reason,'run_stuck');
 assert.equal(r.workers[0].status,'fail');
});
