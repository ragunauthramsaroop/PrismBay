import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const SWARM_STATUS_URL = 'https://prismbay-clean-49izhg.v2.appdeploy.ai/api/swarm-status';
export const REQUIRED_WORKERS = Object.freeze([
  'commerce-controller',
  'product-scout',
  'site-auditor',
  'seo-cro',
  'offer-creative',
  'analytics-experiment',
]);

function ageMinutes(value, now) {
  const parsed = Date.parse(value || '');
  if (!Number.isFinite(parsed)) return null;
  const age = (now - parsed) / 60000;
  return Number.isFinite(age) ? age : null;
}

export function verifySwarmStatus(payload, { now = Date.now(), maxAgeMinutes = 130 } = {}) {
  const reasons = [];
  if (!payload || typeof payload !== 'object') reasons.push('payload_missing');
  if (payload?.status !== 'ok') reasons.push('status_not_ok');
  if (payload?.mode !== 'backend-swarm-24x7') reasons.push('mode_mismatch');
  if (Number(payload?.workerCount) !== REQUIRED_WORKERS.length) reasons.push('worker_count_mismatch');
  if (!Array.isArray(payload?.workers)) reasons.push('workers_missing');

  const overallAge = ageMinutes(payload?.lastUpdatedAt, now);
  if (overallAge === null || overallAge < 0 || overallAge > maxAgeMinutes) reasons.push('swarm_state_stale');

  const workers = [];
  const seen = new Set();
  for (const id of REQUIRED_WORKERS) {
    const row = Array.isArray(payload?.workers) ? payload.workers.find(worker => worker?.id === id) : null;
    if (!row) {
      reasons.push(`worker_missing:${id}`);
      workers.push({ id, present: false, healthy: false, fresh: false, executionEvidence: false });
      continue;
    }
    seen.add(id);
    const runAgeMinutes = ageMinutes(row.lastRunAt, now);
    const fresh = runAgeMinutes !== null && runAgeMinutes >= 0 && runAgeMinutes <= maxAgeMinutes;
    const hasRuns = Number(row.runs) > 0;
    const hasEvidence = Number(row.lastInspectionCount) > 0 || Number(row.lastActionCount) > 0;
    const statusHealthy = row.status === 'ok';
    if (!fresh) reasons.push(`worker_stale:${id}`);
    if (!hasRuns) reasons.push(`worker_never_ran:${id}`);
    if (!hasEvidence) reasons.push(`worker_no_output_evidence:${id}`);
    if (!statusHealthy) reasons.push(`worker_status_${row.status || 'unknown'}:${id}`);
    workers.push({
      id,
      present: true,
      status: row.status || 'unknown',
      runs: Number(row.runs || 0),
      lastRunAt: row.lastRunAt || null,
      runAgeMinutes,
      lastInspectionCount: Number(row.lastInspectionCount || 0),
      lastActionCount: Number(row.lastActionCount || 0),
      kpiScore: Number(row.kpiScore || 0),
      kpiBand: row.kpiBand || 'unknown',
      consecutiveMisses: Number(row.consecutiveMisses || 0),
      interventionRequired: row.interventionRequired === true,
      roleRewriteRequired: row.roleRewriteRequired === true,
      fresh,
      executionEvidence: hasRuns && hasEvidence,
      healthy: fresh && hasRuns && hasEvidence && statusHealthy,
    });
  }

  const executionVerified = workers.length === REQUIRED_WORKERS.length
    && workers.every(worker => worker.present && worker.fresh && worker.runs > 0 && worker.executionEvidence);
  const healthy = executionVerified && reasons.length === 0;

  return {
    healthy,
    executionVerified,
    reasonCount: reasons.length,
    reasons: [...new Set(reasons)],
    expectedWorkers: REQUIRED_WORKERS.length,
    observedWorkers: seen.size,
    activeWorkerCount: Number(payload?.activeWorkerCount || 0),
    totalRuns: Number(payload?.totalRuns || 0),
    verifiedSales: Number(payload?.verifiedSales || 0),
    controllerFocus: payload?.controllerFocus || null,
    lastUpdatedAt: payload?.lastUpdatedAt || null,
    stateAgeMinutes: overallAge,
    workers,
  };
}

export async function observeSwarm(fetcher = fetch, now = Date.now()) {
  const checkedAt = new Date(now).toISOString();
  try {
    const response = await fetcher(SWARM_STATUS_URL, {
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { accept: 'application/json', 'user-agent': 'PrismBay-Commerce-Controller/1.0' },
    });
    const contentType = response.headers?.get?.('content-type') || '';
    const text = await response.text();
    if (!response.ok) {
      return { checkedAt, url: SWARM_STATUS_URL, reachable: false, healthy: false, executionVerified: false, httpStatus: response.status, contentType, reasons: [`http_${response.status}`], workers: [] };
    }
    if (!/application\/json/i.test(contentType)) {
      return { checkedAt, url: SWARM_STATUS_URL, reachable: true, healthy: false, executionVerified: false, httpStatus: response.status, contentType, reasons: ['non_json_response'], workers: [] };
    }
    let payload;
    try { payload = JSON.parse(text); }
    catch {
      return { checkedAt, url: SWARM_STATUS_URL, reachable: true, healthy: false, executionVerified: false, httpStatus: response.status, contentType, reasons: ['invalid_json'], workers: [] };
    }
    return {
      checkedAt,
      url: SWARM_STATUS_URL,
      reachable: true,
      httpStatus: response.status,
      contentType,
      ...verifySwarmStatus(payload, { now }),
    };
  } catch (error) {
    return {
      checkedAt,
      url: SWARM_STATUS_URL,
      reachable: false,
      healthy: false,
      executionVerified: false,
      httpStatus: null,
      contentType: '',
      reasons: [error?.name === 'TimeoutError' ? 'timeout' : 'network_error'],
      workers: [],
    };
  }
}

export async function main() {
  const report = await observeSwarm();
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/appdeploy-swarm-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    healthy: report.healthy,
    executionVerified: report.executionVerified,
    reasonCount: report.reasons?.length || 0,
    totalRuns: report.totalRuns || 0,
    observedWorkers: report.observedWorkers || 0,
  }, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
