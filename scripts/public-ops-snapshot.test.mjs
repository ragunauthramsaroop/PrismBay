import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshot,WORKER_DESCRIPTIONS} from './public-ops-snapshot.mjs';

const report=()=>({
  schemaVersion:1,checkedAt:'2026-10-23T21:20:00Z',
  workers:{
    'buyer-acquisition':{status:'pass',reason:'fresh_success_with_evidence',failureStreak:0,consequence:'none',runId:12345,runUrl:'https://github.com/ragunauthramsaroop/PrismBay/actions/runs/12345',ageMinutes:5,artifactName:'buyer-acquisition-12345',artifactBytes:8172,email:'private@example.com',apiKey:'secret-value'},
    'external-traffic':{status:'running',reason:'operational_run_in_progress',failureStreak:0},
    'ceo-recovery':{status:'fail',reason:'worker_stale',failureStreak:2,consequence:'probation',remediation:'repair_worker'},
    'paperclip-revenue':{status:'pass',reason:'fresh_success_with_evidence',failureStreak:0},
    'commerce-control':{status:'pass',reason:'fresh_success_with_evidence',failureStreak:0},
  },
  leads:[{email:'private@example.com',phone:'+15551234567'}]
});
test('public status contains every official worker and only approved operational fields',()=>{
  const output=publicSnapshot(report());
  assert.equal(output.workers.length,Object.keys(WORKER_DESCRIPTIONS).length);
  assert.deepEqual(output.summary,{passing:3,running:1,attention:1,warnings:1,total:5});
  assert.equal(output.workers[0].runUrl,'https://github.com/ragunauthramsaroop/PrismBay/actions/runs/12345');
  assert.equal(output.workers[2].consequence,'probation');
  assert.equal(output.commercial.verifiedPaidSale,false);
  const serialized=JSON.stringify(output);
  assert.doesNotMatch(serialized,/private@example|phone|apiKey|secret-value|leads/);
});
test('malicious links, unverified status values and oversized fields fail closed',()=>{
  const source=report();
  source.workers['buyer-acquisition'].runUrl='javascript:alert(1)';
  source.workers['buyer-acquisition'].status='super_success';
  source.workers['buyer-acquisition'].reason='<img onerror=alert(1)>';
  source.workers['buyer-acquisition'].remediation='a'.repeat(300);
  const result=publicSnapshot(source).workers[0];
  assert.equal(result.status,'fail');
  assert.equal(result.runUrl,null);
  assert.equal(result.reason,'no_current_evidence');
  assert.equal(result.remediation.length,110);
});
test('missing worker reports never look green',()=>{
  const source={schemaVersion:1,checkedAt:'2026-10-23T21:20:00Z',workers:{}};
  const result=publicSnapshot(source);
  assert.equal(result.summary.attention,5);
  assert.ok(result.workers.every(worker=>worker.reason==='no_current_evidence'));
});
test('invalid report timestamps and schema are rejected',()=>{
  assert.throws(()=>publicSnapshot({schemaVersion:2,checkedAt:'no',workers:{}}),/invalid_operational_report/);
  assert.throws(()=>publicSnapshot({schemaVersion:1,checkedAt:'no',workers:{}}),/invalid_checked_at/);
});
