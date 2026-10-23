import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKERS, checkWorker, applyConsequence, shouldDispatchFallback, reportSummary } from './worker-accountability.mjs';

const now=Date.parse('2026-10-23T21:00:00Z');
const worker=WORKERS[0];
const run=(minutes=10,overrides={})=>({
  id:42,created_at:new Date(now-minutes*60000).toISOString(),
  event:'schedule',status:'completed',conclusion:'success',
  html_url:'https://github.com/ragunauthramsaroop/PrismBay/actions/runs/42',...overrides
});
const proof={name:'buyer-acquisition-42',size_in_bytes:421,expired:false};

test('only a recent successful production run with matching output is accepted',()=>{
  const ok=checkWorker({worker,runs:[run()],artifacts:[proof],nowMs:now});
  assert.equal(ok.status,'pass');
  assert.equal(ok.reason,'fresh_success_with_evidence');
});
test('a successful job without output is not accepted',()=>{
  for(const artifacts of [[],[{...proof,size_in_bytes:0}],[{...proof,expired:true}], [{...proof,name:'unrelated-42'}]]){
    const result=checkWorker({worker,runs:[run()],artifacts,nowMs:now});
    assert.equal(result.reason,'no_output_evidence');
  }
});
test('PR-only checks, stale runs, failures and API errors are reported',()=>{
  assert.equal(checkWorker({worker,runs:[run(3,{event:'pull_request'})],nowMs:now}).reason,'no_operational_runs');
  assert.equal(checkWorker({worker,runs:[run(200)],artifacts:[proof],nowMs:now}).reason,'worker_stale');
  assert.equal(checkWorker({worker,runs:[run(5,{conclusion:'failure'})],nowMs:now}).reason,'run_failure');
  assert.equal(checkWorker({worker,runs:[],fetchError:'403 Forbidden',nowMs:now}).reason,'workflow_api_unavailable');
});
test('running jobs receive a bounded grace period',()=>{
  assert.equal(checkWorker({worker,runs:[run(12,{status:'in_progress'})],nowMs:now}).status,'running');
  assert.equal(checkWorker({worker,runs:[run(45,{status:'in_progress'})],nowMs:now}).reason,'run_stuck');
});
test('repeat failures lead to warning, probation and route replacement',()=>{
  const failure=checkWorker({worker,runs:[run(5,{conclusion:'failure'})],nowMs:now});
  const a=applyConsequence(failure,{},now);
  const b=applyConsequence(failure,a,now);
  const c=applyConsequence(failure,b,now);
  assert.deepEqual([a.consequence,b.consequence,c.consequence],['warning','probation','replace_route']);
  assert.deepEqual([a.failureStreak,b.failureStreak,c.failureStreak],[1,2,3]);
  assert.equal(shouldDispatchFallback(WORKERS[1],c,now),true);
  assert.equal(shouldDispatchFallback(worker,c,now),false);
  assert.equal(shouldDispatchFallback(WORKERS[1],{...c,lastFallbackAt:new Date(now-3600000).toISOString()},now),false);
  assert.equal(shouldDispatchFallback(WORKERS[1],{...c,lastFallbackAt:new Date(now-7*3600000).toISOString()},now),true);
  const passing=checkWorker({worker,runs:[run()],artifacts:[proof],nowMs:now});
  assert.equal(applyConsequence(passing,c,now).failureStreak,0);
});
test('an active run retains but does not increase the previous failure count',()=>{
  const running=checkWorker({worker,runs:[run(15,{status:'queued'})],nowMs:now});
  const result=applyConsequence(running,{failureStreak:2,lastFallbackAt:null},now);
  assert.equal(result.failureStreak,2);
  assert.equal(result.consequence,'probation');
});
test('reports distinguish operational checks from revenue',()=>{
  const summary=reportSummary({checkedAt:'2026-10-23T21:00:00Z',workers:{a:{status:'pass'},b:{status:'fail',consequence:'replace_route'},c:{status:'running'}}});
  assert.equal(summary.operationalPass,1);
  assert.equal(summary.replacements,1);
  assert.equal(summary.noRevenueGuarantee,true);
});
