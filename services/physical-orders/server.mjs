import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';
import { FileJobStore } from '../../scripts/commerce-job-file-store.mjs';
import { createJobLeaseBroker, automationWorkerTokenAuthorized } from '../../scripts/commerce-job-lease-broker.mjs';
import { sealRecipientEnvelope, validateRecipientEnvelopeSecret } from '../../scripts/automation-recipient-envelope.mjs';
import { loadCatalog } from './catalog.mjs';
import { openLedger } from './ledger.mjs';
import { ingest } from './orders.mjs';
import { createQuoteService } from './shipping-quote.mjs';
import { createLedgerQuoteConsumer } from './quote-replay.mjs';
import { createCommercialSignalRecorder, signalTokenAuthorized } from './commercial-signals.mjs';
import { openContactVault } from './contact-vault.mjs';
import { createPhysicalAutomationBridge } from './automation-bridge.mjs';
import { createFulfillmentStatusAutomation, createPhysicalRecipientResolver, statusTokenAuthorized } from './fulfillment-status.mjs';

const SAFE_LOG_CODES = new Set([
  'accepted',
  'rejected',
  'storage_error',
  'started',
  'quote_ok',
  'quote_rejected',
  'checkout_authorized',
  'checkout_rejected',
  'rate_limited',
  'fulfillment_status_ok',
  'fulfillment_status_rejected',
  'automation_job_lease_ok',
  'automation_job_lease_rejected',
  'automation_job_ack_ok',
  'automation_job_ack_rejected',
  'automation_recipient_envelope_ok',
  'automation_recipient_envelope_rejected'
]);
const SAFE_FULFILLMENT_ERRORS = new Set([
  'physical_order_not_fulfillment_ready',
  'fulfillment_event_replay_mismatch',
  'stale_fulfillment_evidence'
]);
const SAFE_HANDOFF_ERRORS = new Set([
  'invalid_lease_duration',
  'valid_job_and_lease_required',
  'job_not_found',
  'email_job_required',
  'stale_or_mismatched_lease',
  'lease_expired',
  'recipient_state_unavailable',
  'recipient_reference_mismatch'
]);

// Logging is an allowlist: never serialize event bodies, errors, URLs, ZIPs, tokens, or customer data.
export function safeLog(sink, code) {
  sink(JSON.stringify({ service: 'physical-orders', code: SAFE_LOG_CODES.has(code) ? code : 'redacted' }));
}

export function validateStorage(env, mountinfo) {
  if (env.PROD !== 'true') return;
  if (!env.DATA_DIR || !posix.isAbsolute(env.DATA_DIR) || env.PERSISTENT_STORAGE_CONFIRMED !== 'true' || !env.PERSISTENT_VOLUME_PATH || !posix.isAbsolute(env.PERSISTENT_VOLUME_PATH)) throw Error('Production requires explicit persistent Linux volume');
  const directory = posix.resolve(env.DATA_DIR);
  const mount = posix.resolve(env.PERSISTENT_VOLUME_PATH);
  if (mount === '/' || (directory !== mount && !directory.startsWith(mount + '/'))) throw Error('DATA_DIR must be on persistent volume');
  const lines = (mountinfo ?? readFileSync('/proc/self/mountinfo', 'utf8')).split('\n');
  const found = lines.some(line => {
    const [fields, fs] = line.split(' - ');
    const point = fields.split(' ')[4]?.replace(/\\040/g, ' ');
    return point === mount && fs && !['tmpfs', 'ramfs', 'overlay'].includes(fs.split(' ')[0]);
  });
  if (!found) throw Error('Persistent mount not found');
}

async function readJson(req, maxBytes) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) { req.resume(); throw Object.assign(new Error('body_too_large'), { status: 413 }); }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

function createMinuteLimiter({ max = 8, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return key => {
    const minute = Math.floor(now() / 60_000);
    const current = buckets.get(key);
    const next = !current || current.minute !== minute ? { minute, count: 1 } : { minute, count: current.count + 1 };
    buckets.set(key, next);
    if (buckets.size > 2000) for (const [k, v] of buckets) if (v.minute < minute - 2) buckets.delete(k);
    return next.count <= max;
  };
}

function clientKey(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
}

async function recordFailure(signalRecorder, stage, sku, code) {
  try { await signalRecorder?.record({ stage, sku, code }); } catch {}
}

function fulfillmentErrorResponse(error) {
  const message = String(error?.message || '');
  if (SAFE_FULFILLMENT_ERRORS.has(message)) return { status: 409, error: message };
  if (message.startsWith('illegal_fulfillment_transition:')) return { status: 409, error: 'illegal_fulfillment_transition' };
  if (error?.status === 400 || error?.status === 413) return { status: error.status, error: message || 'invalid_request' };
  return { status: 500, error: 'fulfillment_status_processing_failed' };
}

function publicLeasedJob(job) {
  return {
    id: job.id,
    jobClass: job.jobClass,
    operation: job.operation,
    idempotencyKey: job.idempotencyKey,
    state: job.state,
    attempt: Number(job.attempt || 0),
    maxAttempts: Number(job.maxAttempts || 0),
    payload: job.payload,
    lease: {
      id: job.lease?.id || null,
      expiresAt: job.lease?.expiresAt || null
    }
  };
}

function handoffErrorResponse(error) {
  const message = String(error?.message || '');
  if (SAFE_HANDOFF_ERRORS.has(message)) return { status: 409, error: message };
  if (error?.status === 400 || error?.status === 413) return { status: error.status, error: message || 'invalid_request' };
  return { status: 500, error: 'automation_job_handoff_failed' };
}

export function createServer({
  secret,
  ledger,
  catalog,
  quoteService = null,
  signalRecorder = null,
  signalReadToken = '',
  automationBridge = null,
  fulfillmentAutomation = null,
  fulfillmentStatusWriteToken = '',
  jobLeaseBroker = null,
  automationWorkerToken = '',
  automationRecipientResolver = null,
  automationWorkerEnvelopeKey = '',
  live = true,
  logger = console.log,
  now = () => Date.now()
}) {
  if (!secret?.startsWith('whsec_')) throw Error('Signing secret required');
  const allowQuote = createMinuteLimiter({ max: 8, now });
  const allowCheckout = createMinuteLimiter({ max: 12, now });
  const allowFulfillment = createMinuteLimiter({ max: 30, now });
  const allowWorker = createMinuteLimiter({ max: 60, now });
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/health') return send(200, {
      service: 'physical-orders',
      status: 'ok',
      quoteEnabled: Boolean(quoteService?.configuredSkus?.length),
      commercialSignalsEnabled: Boolean(signalRecorder && String(signalReadToken).length >= 32),
      automationProjectionEnabled: Boolean(automationBridge),
      fulfillmentStatusAutomationEnabled: Boolean(fulfillmentAutomation && String(fulfillmentStatusWriteToken).length >= 32),
      automationJobHandoffEnabled: Boolean(jobLeaseBroker && String(automationWorkerToken).length >= 32),
      automationRecipientHandoffEnabled: Boolean(jobLeaseBroker && automationRecipientResolver && automationWorkerEnvelopeKey)
    });
    if (req.method === 'GET' && req.url === '/commercial-signals') {
      if (!signalRecorder || !signalTokenAuthorized(signalReadToken, req.headers['x-commercial-signal-token'])) return send(404, { error: 'not_found' });
      return send(200, signalRecorder.summary());
    }

    if (req.method === 'POST' && req.url === '/internal/automation/jobs/lease') {
      if (!jobLeaseBroker || !automationWorkerTokenAuthorized(automationWorkerToken, req.headers['x-automation-worker-token'])) {
        return send(404, { error: 'not_found' });
      }
      if (!allowWorker(clientKey(req))) { safeLog(logger, 'rate_limited'); return send(429, { error: 'rate_limited' }); }
      try {
        const body = await readJson(req, 4 * 1024);
        const result = await jobLeaseBroker.leaseDue({ limit: body.limit, leaseMs: body.leaseMs });
        safeLog(logger, 'automation_job_lease_ok');
        return send(200, {
          recoveredExpiredLeases: Number(result.recoveredExpiredLeases || 0),
          jobs: result.jobs.map(publicLeasedJob)
        });
      } catch (error) {
        const safe = handoffErrorResponse(error);
        safeLog(logger, 'automation_job_lease_rejected');
        return send(safe.status, { error: safe.error });
      }
    }

    if (req.method === 'POST' && req.url === '/internal/automation/jobs/recipient-envelope') {
      if (!jobLeaseBroker || !automationRecipientResolver || !automationWorkerEnvelopeKey || !automationWorkerTokenAuthorized(automationWorkerToken, req.headers['x-automation-worker-token'])) {
        return send(404, { error: 'not_found' });
      }
      if (!allowWorker(clientKey(req))) { safeLog(logger, 'rate_limited'); return send(429, { error: 'rate_limited' }); }
      try {
        const body = await readJson(req, 4 * 1024);
        const result = await jobLeaseBroker.withActiveLease({ jobId: body.jobId, leaseId: body.leaseId }, async (job) => {
          const recipientState = await automationRecipientResolver({
            recipientRef: job.payload?.recipientRef || null,
            orderRef: job.payload?.orderRef || null,
            eventId: job.payload?.eventId || null,
            templateKind: job.payload?.templateKind || null
          });
          if (!recipientState) throw new Error('recipient_state_unavailable');
          if (recipientState.recipientRef !== job.payload?.recipientRef) throw new Error('recipient_reference_mismatch');
          return sealRecipientEnvelope({
            jobId: job.id,
            leaseId: job.lease.id,
            recipientState,
            secret: automationWorkerEnvelopeKey
          });
        });
        if (!result.ok) {
          safeLog(logger, 'automation_recipient_envelope_rejected');
          return send(409, result);
        }
        safeLog(logger, 'automation_recipient_envelope_ok');
        return send(200, { jobId: body.jobId, leaseId: body.leaseId, envelope: result.value });
      } catch (error) {
        const safe = handoffErrorResponse(error);
        safeLog(logger, 'automation_recipient_envelope_rejected');
        return send(safe.status, { error: safe.error });
      }
    }

    if (req.method === 'POST' && req.url === '/internal/automation/jobs/ack') {
      if (!jobLeaseBroker || !automationWorkerTokenAuthorized(automationWorkerToken, req.headers['x-automation-worker-token'])) {
        return send(404, { error: 'not_found' });
      }
      if (!allowWorker(clientKey(req))) { safeLog(logger, 'rate_limited'); return send(429, { error: 'rate_limited' }); }
      try {
        const body = await readJson(req, 4 * 1024);
        const result = await jobLeaseBroker.acknowledge({ jobId: body.jobId, leaseId: body.leaseId, outcome: body.outcome || {} });
        safeLog(logger, result.ok ? 'automation_job_ack_ok' : 'automation_job_ack_rejected');
        return send(result.ok ? 200 : 409, result);
      } catch (error) {
        const safe = handoffErrorResponse(error);
        safeLog(logger, 'automation_job_ack_rejected');
        return send(safe.status, { error: safe.error });
      }
    }

    if (req.method === 'POST' && req.url === '/internal/fulfillment/status') {
      if (!fulfillmentAutomation || !statusTokenAuthorized(fulfillmentStatusWriteToken, req.headers['x-fulfillment-status-token'])) {
        return send(404, { error: 'not_found' });
      }
      if (!allowFulfillment(clientKey(req))) {
        safeLog(logger, 'rate_limited');
        return send(429, { error: 'rate_limited' });
      }
      try {
        const body = await readJson(req, 12 * 1024);
        const result = await fulfillmentAutomation.record(body);
        safeLog(logger, result.ok ? 'fulfillment_status_ok' : 'fulfillment_status_rejected');
        return send(result.status || (result.ok ? 200 : 409), {
          ok: result.ok === true,
          replay: result.replay === true,
          state: result.state || null,
          insertedJobs: Number(result.insertedJobs || 0),
          duplicateJobs: Number(result.duplicateJobs || 0),
          error: result.error || null
        });
      } catch (error) {
        const safe = fulfillmentErrorResponse(error);
        safeLog(logger, 'fulfillment_status_rejected');
        return send(safe.status, { error: safe.error });
      }
    }

    if (req.method === 'POST' && req.url === '/shipping/quote') {
      if (!quoteService?.configuredSkus?.length) return send(503, { error: 'shipping_quotes_not_configured' });
      if (!allowQuote(clientKey(req))) { safeLog(logger, 'rate_limited'); return send(429, { error: 'rate_limited' }); }
      let body = {};
      try {
        body = await readJson(req, 8 * 1024);
        const result = await quoteService.quote(body);
        if (!result.ok) await recordFailure(signalRecorder, 'quote', body.sku, result.error);
        safeLog(logger, result.ok ? 'quote_ok' : 'quote_rejected');
        return send(result.status || (result.ok ? 200 : 400), result);
      } catch (error) {
        await recordFailure(signalRecorder, 'quote', body.sku, error?.status ? error.message : 'quote_upstream_unavailable');
        safeLog(logger, 'quote_rejected');
        return send(error?.status || 502, { error: error?.status ? error.message : 'quote_upstream_unavailable' });
      }
    }

    if (req.method === 'POST' && req.url === '/checkout/authorize') {
      if (!quoteService?.configuredSkus?.length) return send(503, { error: 'checkout_authorization_not_configured' });
      if (!allowCheckout(clientKey(req))) { safeLog(logger, 'rate_limited'); return send(429, { error: 'rate_limited' }); }
      try {
        const body = await readJson(req, 8 * 1024);
        const result = await quoteService.authorizeCheckout(body);
        if (!result.ok) await recordFailure(signalRecorder, 'checkout', result.sku, result.error);
        safeLog(logger, result.ok ? 'checkout_authorized' : 'checkout_rejected');
        return send(result.status || (result.ok ? 200 : 403), result);
      } catch {
        await recordFailure(signalRecorder, 'checkout', null, 'invalid_checkout_authorization_request');
        safeLog(logger, 'checkout_rejected');
        return send(400, { error: 'invalid_checkout_authorization_request' });
      }
    }

    if (req.method !== 'POST' || req.url !== '/webhooks/stripe') return send(404, { error: 'not_found' });
    let event;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) { send(413, { error: 'body_too_large' }); req.resume(); return; }
        chunks.push(chunk);
      }
      event = Stripe.webhooks.constructEvent(Buffer.concat(chunks), req.headers['stripe-signature'], secret, 300);
      if (event.livemode !== live || (event.account && event.account !== catalog.accountId)) throw Error('Scope');
    } catch {
      safeLog(logger, 'rejected'); return send(400, { error: 'invalid_webhook' });
    }
    try {
      const result = await ingest(event, ledger, catalog, live);
      let automation = null;
      if (automationBridge && ['recorded', 'replay'].includes(result)) {
        automation = await automationBridge.projectStripeEvent(event, ledger.snapshot());
      }
      safeLog(logger, 'accepted');
      send(200, {
        received: true,
        result,
        automation: automation ? {
          projected: automation.projected === true,
          reason: automation.reason || null,
          insertedJobs: Number(automation.insertedJobs || 0),
          duplicateJobs: Number(automation.duplicateJobs || 0)
        } : null
      });
    } catch {
      safeLog(logger, 'storage_error'); send(500, { error: 'processing_failed' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

export async function start(env = process.env) {
  validateStorage(env);
  if (env.PROD === 'true' && env.STRIPE_LIVE_MODE !== 'true') throw Error('Production requires live mode');
  if (!['true', 'false'].includes(env.STRIPE_LIVE_MODE)) throw Error('Explicit Stripe mode required');
  if (!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) throw Error('Signing secret required');
  if (env.PHYSICAL_ORDER_AUTOMATION_ENABLED && !['true', 'false'].includes(env.PHYSICAL_ORDER_AUTOMATION_ENABLED)) throw Error('PHYSICAL_ORDER_AUTOMATION_ENABLED must be true or false');
  if (env.FULFILLMENT_STATUS_AUTOMATION_ENABLED && !['true', 'false'].includes(env.FULFILLMENT_STATUS_AUTOMATION_ENABLED)) throw Error('FULFILLMENT_STATUS_AUTOMATION_ENABLED must be true or false');
  if (env.AUTOMATION_JOB_HANDOFF_ENABLED && !['true', 'false'].includes(env.AUTOMATION_JOB_HANDOFF_ENABLED)) throw Error('AUTOMATION_JOB_HANDOFF_ENABLED must be true or false');
  if (env.AUTOMATION_RECIPIENT_HANDOFF_ENABLED && !['true', 'false'].includes(env.AUTOMATION_RECIPIENT_HANDOFF_ENABLED)) throw Error('AUTOMATION_RECIPIENT_HANDOFF_ENABLED must be true or false');
  if (env.FULFILLMENT_STATUS_AUTOMATION_ENABLED === 'true' && env.PHYSICAL_ORDER_AUTOMATION_ENABLED !== 'true') throw Error('Fulfillment status automation requires physical-order automation');
  if (env.AUTOMATION_JOB_HANDOFF_ENABLED === 'true' && env.PHYSICAL_ORDER_AUTOMATION_ENABLED !== 'true') throw Error('Automation job handoff requires physical-order automation');
  if (env.AUTOMATION_RECIPIENT_HANDOFF_ENABLED === 'true' && env.AUTOMATION_JOB_HANDOFF_ENABLED !== 'true') throw Error('Recipient handoff requires automation job handoff');
  const catalog = loadCatalog(env.PHYSICAL_CATALOG_PATH);
  if (env.PROD === 'true' && !catalog.mappings.length) throw Error('Physical catalog import required');
  const dataDirectory = resolve(env.DATA_DIR || 'data');
  const ledger = await openLedger(dataDirectory);
  const consumeQuoteOnce = createLedgerQuoteConsumer(ledger);
  const quoteService = createQuoteService({ env, consumeQuoteOnce });
  const signalRecorder = createCommercialSignalRecorder({ ledger });

  let automationBridge = null;
  let fulfillmentAutomation = null;
  let jobLeaseBroker = null;
  let automationRecipientResolver = null;
  let jobStore = null;
  if (env.PHYSICAL_ORDER_AUTOMATION_ENABLED === 'true') {
    if (!env.AUTOMATION_CONTACT_VAULT_KEY || !env.AUTOMATION_RECIPIENT_REF_KEY) throw Error('Physical-order automation requires encrypted contact-vault and recipient-reference keys');
    const contactVault = await openContactVault({
      directory: resolve(dataDirectory, 'automation-contacts'),
      encryptionSecret: env.AUTOMATION_CONTACT_VAULT_KEY,
      recipientRefSecret: env.AUTOMATION_RECIPIENT_REF_KEY
    });
    jobStore = await new FileJobStore(resolve(dataDirectory, 'automation-jobs.json')).load();
    automationBridge = createPhysicalAutomationBridge({ contactVault, jobStore });
    if (env.FULFILLMENT_STATUS_AUTOMATION_ENABLED === 'true') {
      if (String(env.FULFILLMENT_STATUS_WRITE_TOKEN || '').length < 32) throw Error('Fulfillment status automation requires a dedicated write token of at least 32 characters');
      fulfillmentAutomation = createFulfillmentStatusAutomation({ ledger, contactVault, jobStore });
    }
    if (env.AUTOMATION_JOB_HANDOFF_ENABLED === 'true') {
      if (String(env.AUTOMATION_WORKER_TOKEN || '').length < 32) throw Error('Automation job handoff requires a dedicated worker token of at least 32 characters');
      jobLeaseBroker = createJobLeaseBroker({ store: jobStore });
      if (env.AUTOMATION_RECIPIENT_HANDOFF_ENABLED === 'true') {
        validateRecipientEnvelopeSecret(env.AUTOMATION_WORKER_ENVELOPE_KEY);
        automationRecipientResolver = createPhysicalRecipientResolver({ contactVault, ledger });
      }
    }
  }

  const server = createServer({
    secret: env.STRIPE_WEBHOOK_SECRET,
    ledger,
    catalog,
    quoteService,
    signalRecorder,
    signalReadToken: env.COMMERCIAL_SIGNAL_READ_TOKEN || '',
    automationBridge,
    fulfillmentAutomation,
    fulfillmentStatusWriteToken: env.FULFILLMENT_STATUS_WRITE_TOKEN || '',
    jobLeaseBroker,
    automationWorkerToken: env.AUTOMATION_WORKER_TOKEN || '',
    automationRecipientResolver,
    automationWorkerEnvelopeKey: env.AUTOMATION_RECIPIENT_HANDOFF_ENABLED === 'true' ? env.AUTOMATION_WORKER_ENVELOPE_KEY || '' : '',
    live: env.STRIPE_LIVE_MODE === 'true'
  });
  server.listen(Number(env.PORT || 3001), '0.0.0.0', () => safeLog(console.log, 'started'));
  const shutdown = () => server.close(async () => {
    await jobStore?.waitForWrites?.();
    await ledger.close();
    process.exit(0);
  });
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  start().catch(() => { console.error('physical-orders startup failed; check configuration and storage'); process.exitCode = 1; });
}
