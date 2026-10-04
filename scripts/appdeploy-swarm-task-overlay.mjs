import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
}

function verificationTask(input = {}) {
  const report = input && typeof input === 'object' ? input : {};
  const reasons = Array.isArray(report.reasons) && report.reasons.length ? report.reasons : ['verification_missing'];
  return {
    id: `commerce-control:${slug('Restore verifiable backend swarm execution')}`,
    companyId: 'commerce-control',
    priority: 1,
    status: 'active',
    title: 'Restore verifiable backend swarm execution',
    evidenceRequired: [
      'fresh application/json response from /api/swarm-status',
      'all six expected worker IDs present',
      'recent persisted lastRunAt and positive run count for every worker',
      'positive inspection or action evidence for every worker',
      ...reasons.map(reason => `current_failure:${reason}`),
    ],
    doneWhen: 'A fresh independent verification records executionVerified=true and healthy=true for all six AppDeploy workers. Cron invocation status alone is not completion evidence.',
    context: {
      checkedAt: report.checkedAt || null,
      verificationUrl: report.url || null,
      executionVerified: report.executionVerified === true,
      healthy: report.healthy === true,
      reasons,
      observedWorkers: Number(report.observedWorkers || 0),
      expectedWorkers: Number(report.expectedWorkers || 6),
      productionChangeRequiresApproval: true,
    },
    prohibitedShortcuts: [
      'treating cron invocation success as worker completion',
      'fabricated worker receipts or metrics',
      'unapproved paid spend',
      'automatic supplier ordering',
      'unauthorized external publishing',
      'bypassing platform, payment, identity or security controls',
    ],
  };
}

export function applySwarmVerification(board, report) {
  const next = structuredClone(board || {});
  if (!Array.isArray(next.tasks)) next.tasks = [];
  if (!next.companies || typeof next.companies !== 'object') next.companies = {};
  if (!Array.isArray(next.companies['commerce-control'])) next.companies['commerce-control'] = [];

  const summary = {
    checkedAt: report?.checkedAt || null,
    healthy: report?.healthy === true,
    executionVerified: report?.executionVerified === true,
    observedWorkers: Number(report?.observedWorkers || 0),
    expectedWorkers: Number(report?.expectedWorkers || 6),
    reasons: Array.isArray(report?.reasons) ? report.reasons : ['verification_missing'],
  };
  next.backendSwarmVerification = summary;

  const existingId = 'commerce-control:restore-verifiable-backend-swarm-execution';
  next.tasks = next.tasks.filter(row => row?.id !== existingId);
  next.companies['commerce-control'] = next.companies['commerce-control'].filter(row => row?.id !== existingId);

  if (!summary.healthy || !summary.executionVerified) {
    const task = verificationTask(report);
    next.tasks.unshift(task);
    next.companies['commerce-control'].unshift(task);
  }

  next.totalTasks = next.tasks.length;
  if (next.recoveryCoverage?.['commerce-control']) {
    next.recoveryCoverage['commerce-control'].taskCount = next.companies['commerce-control'].length;
  }
  return next;
}

async function readJson(path, fallback = {}) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); }
  catch { return fallback; }
}

export async function main() {
  const [board, report] = await Promise.all([
    readJson('growth-reports/autonomous-company-taskboard.json'),
    readJson('growth-reports/appdeploy-swarm-verification.json'),
  ]);
  const next = applySwarmVerification(board, report);
  await fs.writeFile('growth-reports/autonomous-company-taskboard.json', JSON.stringify(next, null, 2) + '\n');
  console.log(JSON.stringify({
    totalTasks: next.totalTasks,
    backendSwarmVerification: next.backendSwarmVerification,
    recoveryTaskActive: next.tasks.some(row => row.id === 'commerce-control:restore-verifiable-backend-swarm-execution'),
  }, null, 2));
  return next;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
