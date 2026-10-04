import { validateAutomationEmailJob } from './automation-email-delivery-contract.mjs';
import { openRecipientEnvelope, validateRecipientEnvelopeSecret } from './automation-recipient-envelope.mjs';

const TOKEN_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function token(value, max = 220) {
  const text = String(value || '').trim();
  return text && text.length <= max && TOKEN_PATTERN.test(text) ? text : null;
}

function normalizeBaseUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('valid_worker_base_url_required'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('worker_base_url_must_be_origin_only');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('worker_base_url_requires_https');
  }
  if (!['/', ''].includes(url.pathname)) throw new Error('worker_base_url_must_be_origin_only');
  return `${url.protocol}//${url.host}`;
}

function validateWorkerToken(value) {
  const workerToken = String(value || '');
  if (workerToken.length < 32 || workerToken.length > 512) throw new Error('valid_automation_worker_token_required');
  return workerToken;
}

function validateLeasedJob(job) {
  const validation = validateAutomationEmailJob(job);
  if (!validation.ok) throw new Error(`invalid_leased_job:${validation.reasons[0]}`);
  if (job.state !== 'running') throw new Error('leased_job_must_be_running');
  const leaseId = token(job?.lease?.id, 160);
  const expiresMs = Date.parse(String(job?.lease?.expiresAt || ''));
  if (!leaseId || !Number.isFinite(expiresMs)) throw new Error('valid_job_lease_required');
  return { ...job, lease: { ...job.lease, id: leaseId, expiresAt: new Date(expiresMs).toISOString() } };
}

function structuredFailure(errorCode, { httpStatus = null, outcomeKnown = true } = {}) {
  return { ok: false, errorCode, httpStatus, outcomeKnown };
}

export function createAutomationEmailWorkerClient({
  baseUrl,
  workerToken,
  envelopeKey,
  fetchImpl = globalThis.fetch,
  leaseMs = 60_000,
  limit = 10
} = {}) {
  const origin = normalizeBaseUrl(baseUrl);
  const tokenValue = validateWorkerToken(workerToken);
  validateRecipientEnvelopeSecret(envelopeKey);
  if (typeof fetchImpl !== 'function') throw new Error('worker_fetch_required');
  const safeLeaseMs = Number(leaseMs);
  if (!Number.isInteger(safeLeaseMs) || safeLeaseMs < 5_000 || safeLeaseMs > 300_000) throw new Error('invalid_worker_lease_duration');
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 25));

  async function post(path, body) {
    let response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-automation-worker-token': tokenValue
        },
        body: JSON.stringify(body),
        redirect: 'error'
      });
    } catch {
      throw Object.assign(new Error('automation_worker_transport_unavailable'), { httpStatus: 503, outcomeKnown: true });
    }
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const status = Number(response.status) || 500;
      const code = token(data?.error || data?.reason, 120) || `automation_worker_http_${status}`;
      throw Object.assign(new Error(code), { httpStatus: status, outcomeKnown: true });
    }
    return data;
  }

  return Object.freeze({
    async lease() {
      const result = await post('/internal/automation/jobs/lease', { limit: safeLimit, leaseMs: safeLeaseMs });
      if (!Array.isArray(result?.jobs)) throw new Error('invalid_worker_lease_response');
      return {
        recoveredExpiredLeases: Number(result.recoveredExpiredLeases || 0),
        jobs: result.jobs.map(validateLeasedJob)
      };
    },

    async recipientState(job) {
      const leased = validateLeasedJob(job);
      const result = await post('/internal/automation/jobs/recipient-envelope', {
        jobId: leased.id,
        leaseId: leased.lease.id
      });
      if (result?.jobId !== leased.id || result?.leaseId !== leased.lease.id || !result?.envelope) {
        throw new Error('recipient_envelope_identity_mismatch');
      }
      const state = openRecipientEnvelope({
        jobId: leased.id,
        leaseId: leased.lease.id,
        envelope: result.envelope,
        secret: envelopeKey
      });
      if (state.recipientRef !== leased.payload.recipientRef) throw new Error('recipient_envelope_reference_mismatch');
      return state;
    },

    async acknowledge(job, outcome) {
      const leased = validateLeasedJob(job);
      const normalizedOutcome = outcome?.ok === true
        ? { ok: true }
        : {
            ok: false,
            errorCode: token(outcome?.errorCode, 120) || 'automation_email_worker_failed',
            outcomeKnown: outcome?.outcomeKnown !== false,
            httpStatus: Number.isInteger(Number(outcome?.httpStatus)) ? Number(outcome.httpStatus) : null
          };
      return post('/internal/automation/jobs/ack', {
        jobId: leased.id,
        leaseId: leased.lease.id,
        outcome: normalizedOutcome
      });
    }
  });
}

export async function runAutomationEmailWorkerBatch({ client, execute } = {}) {
  if (!client?.lease || !client?.recipientState || !client?.acknowledge) throw new Error('automation_worker_client_required');
  if (typeof execute !== 'function') throw new Error('automation_worker_executor_required');
  const leased = await client.lease();
  const results = [];

  for (const job of leased.jobs) {
    let recipientState;
    try {
      recipientState = await client.recipientState(job);
    } catch (error) {
      const failure = structuredFailure('recipient_handoff_unavailable', {
        httpStatus: error?.httpStatus ?? 503,
        outcomeKnown: true
      });
      try {
        const ack = await client.acknowledge(job, failure);
        results.push({ jobId: job.id, status: ack?.state || 'failed', phase: 'recipient', acknowledged: true });
      } catch {
        results.push({ jobId: job.id, status: 'lease_unacknowledged', phase: 'recipient', acknowledged: false });
      }
      continue;
    }

    let outcome;
    try {
      outcome = await execute(structuredClone(job), structuredClone(recipientState));
      if (!outcome || typeof outcome.ok !== 'boolean') outcome = structuredFailure('automation_email_worker_invalid_outcome', { outcomeKnown: false });
    } catch {
      outcome = structuredFailure('automation_email_worker_exception', { outcomeKnown: false });
    }

    try {
      const ack = await client.acknowledge(job, outcome);
      results.push({
        jobId: job.id,
        status: ack?.state || (outcome.ok ? 'completed' : 'failed'),
        phase: 'execution',
        acknowledged: true
      });
    } catch {
      results.push({ jobId: job.id, status: 'lease_unacknowledged', phase: 'execution', acknowledged: false });
    }
  }

  return {
    leased: leased.jobs.length,
    recoveredExpiredLeases: leased.recoveredExpiredLeases,
    results
  };
}
