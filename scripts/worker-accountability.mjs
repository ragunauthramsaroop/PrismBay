// Evidence-based accountability for scheduled GitHub Actions workers.
// "Replacement" means safely routing the task to a deterministic fallback,
// never modifying employment, charging buyers, purchasing supplies, or deleting code.
export const WORKERS = Object.freeze([
  { id: 'buyer-acquisition', workflow: 'buyer-acquisition.yml', maxAgeMinutes: 105, artifactPrefix: 'buyer-acquisition-' },
  { id: 'external-traffic', workflow: 'external-traffic-factory.yml', maxAgeMinutes: 1650, artifactPrefix: 'prismbay-external-traffic-', replacement: 'buyer-acquisition.yml' },
  { id: 'ceo-recovery', workflow: 'ceo-autonomous-recovery.yml', maxAgeMinutes: 90, artifactPrefix: 'prismbay-ceo-recovery-', replacement: 'buyer-acquisition.yml' },
  { id: 'paperclip-revenue', workflow: 'paperclip-revenue-ops.yml', maxAgeMinutes: 250, artifactPrefix: 'prismbay-paperclip-revenue-', replacement: 'buyer-acquisition.yml' },
  { id: 'commerce-control', workflow: 'paperclip-commerce-group.yml', maxAgeMinutes: 105, artifactPrefix: 'prismbay-commerce-group-', replacement: 'buyer-acquisition.yml' }
]);
const VALID_EVENTS = new Set(['schedule', 'workflow_dispatch', 'push', 'workflow_run']);
const TIMEOUT_MINUTES = 35;
const MAX_WORKER_HISTORY = 50;

export function checkWorker({ worker, runs = [], artifacts = [], fetchError = null, nowMs = Date.now() }) {
  if (fetchError) return { id: worker.id, status: 'fail', reason: 'workflow_api_unavailable', evidence: fetchError.slice(0,100) };
  const selected = runs.filter(r => VALID_EVENTS.has(r.event)).slice(0, MAX_WORKER_HISTORY);
  const latest = selected[0];
  if (!latest) return { id: worker.id, status: 'fail', reason: 'no_operational_runs', evidence: 'no scheduled/manual/production runs found' };
  const started = Date.parse(latest.created_at);
  const ageMinutes = Number.isFinite(started) ? Math.max(0,(nowMs-started)/60000) : Infinity;
  const meta = {id:worker.id, runId:latest.id, runUrl:latest.html_url || null,ageMinutes:Math.round(ageMinutes)};
  if (latest.status !== 'completed' && ageMinutes <= TIMEOUT_MINUTES) {
    return {...meta,status:'running',reason:'operational_run_in_progress',evidence:'running; awaiting completion and proof'};
  }
  if (latest.status !== 'completed') return {...meta,status:'fail',reason:'run_stuck',evidence:'run exceeded watchdog running grace'};
  if (latest.conclusion !== 'success') {
    return {...meta,status:'fail',reason:'run_'+String(latest.conclusion || 'unknown'),evidence:'operational workflow did not pass'};
  }
  if (ageMinutes > worker.maxAgeMinutes) {
    return {...meta,status:'fail',reason:'worker_stale',evidence:'last successful run older than schedule allowance'};
  }
  const proof = artifacts.find(a => a.name?.startsWith(worker.artifactPrefix) && a.expired !== true && a.size_in_bytes > 0);
  if (!proof) {
    return {...meta,status:'fail',reason:'no_output_evidence',evidence:'successful run had no retained, nonempty evidence artifact'};
  }
  return {...meta,status:'pass',reason:'fresh_success_with_evidence',artifactName:proof.name,artifactBytes:proof.size_in_bytes,evidence:'completed workflow plus retained output; NOT proof of buyer acquisition or revenue'};
}

export function applyConsequence(check, previous = {}, nowMs = Date.now()) {
  const prevStreak = Number.isInteger(previous.failureStreak) ? Math.max(0,Math.min(previous.failureStreak,100)) : 0;
  if (check.status === 'running') {
    return {...check,consequence:prevStreak>=3?'replacement_pending':prevStreak>=2?'probation':prevStreak===1?'warning':'none',
      failureStreak:prevStreak,lastFallbackAt:previous.lastFallbackAt||null,lastFallbackRunId:previous.lastFallbackRunId||null};
  }
  if (check.status === 'pass') {
    return {...check,consequence:'none',failureStreak:0,lastFallbackAt:previous.lastFallbackAt||null,lastFallbackRunId:previous.lastFallbackRunId||null};
  }
  const failures = Math.min(prevStreak+1,100);
  return {...check,consequence: failures>=3?'replace_route':failures===2?'probation':'warning',
    failureStreak:failures,lastFallbackAt:previous.lastFallbackAt||null,lastFallbackRunId:previous.lastFallbackRunId||null};
}

export function shouldDispatchFallback(worker, record, nowMs = Date.now()) {
  if (!worker.replacement || record.consequence !== 'replace_route' || record.status !== 'fail') return false;
  const last = Date.parse(record.lastFallbackAt || '');
  return !Number.isFinite(last) || nowMs-last >= 6*60*60*1000;
}

export function reportSummary(state) {
  const workers = Object.values(state.workers || {});
  return {checkedAt:state.checkedAt, operationalPass:workers.filter(x=>x.status==='pass').length,
    failures:workers.filter(x=>x.status==='fail').length,running:workers.filter(x=>x.status==='running').length,
    replacements:workers.filter(x=>x.consequence==='replace_route').length,
    noRevenueGuarantee:true,
    note:'A green worker proves a completed workflow with an artifact, not traffic, orders or revenue.'};
}
