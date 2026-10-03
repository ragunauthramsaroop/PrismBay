import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';
import { loadCatalog } from './catalog.mjs';
import { openLedger } from './ledger.mjs';
import { ingest } from './orders.mjs';
import { createQuoteService } from './shipping-quote.mjs';
import { createLedgerQuoteConsumer } from './quote-replay.mjs';
import { createCommercialSignalRecorder, signalTokenAuthorized } from './commercial-signals.mjs';

// Logging is an allowlist: never serialize event bodies, errors, URLs, ZIPs, tokens, or customer data.
export function safeLog(sink, code) {
  sink(JSON.stringify({ service: 'physical-orders', code: ['accepted', 'rejected', 'storage_error', 'started', 'quote_ok', 'quote_rejected', 'checkout_authorized', 'checkout_rejected', 'rate_limited'].includes(code) ? code : 'redacted' }));
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

export function createServer({ secret, ledger, catalog, quoteService = null, signalRecorder = null, signalReadToken = '', live = true, logger = console.log, now = () => Date.now() }) {
  if (!secret?.startsWith('whsec_')) throw Error('Signing secret required');
  const allowQuote = createMinuteLimiter({ max: 8, now });
  const allowCheckout = createMinuteLimiter({ max: 12, now });
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/health') return send(200, { service: 'physical-orders', status: 'ok', quoteEnabled: Boolean(quoteService?.configuredSkus?.length), commercialSignalsEnabled: Boolean(signalRecorder && String(signalReadToken).length >= 32) });
    if (req.method === 'GET' && req.url === '/commercial-signals') {
      if (!signalRecorder || !signalTokenAuthorized(signalReadToken, req.headers['x-commercial-signal-token'])) return send(404, { error: 'not_found' });
      return send(200, signalRecorder.summary());
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
      safeLog(logger, 'accepted'); send(200, { received: true, result });
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
  const catalog = loadCatalog(env.PHYSICAL_CATALOG_PATH);
  if (env.PROD === 'true' && !catalog.mappings.length) throw Error('Physical catalog import required');
  const ledger = await openLedger(resolve(env.DATA_DIR || 'data'));
  const consumeQuoteOnce = createLedgerQuoteConsumer(ledger);
  const quoteService = createQuoteService({ env, consumeQuoteOnce });
  const signalRecorder = createCommercialSignalRecorder({ ledger });
  const server = createServer({ secret: env.STRIPE_WEBHOOK_SECRET, ledger, catalog, quoteService, signalRecorder, signalReadToken: env.COMMERCIAL_SIGNAL_READ_TOKEN || '', live: env.STRIPE_LIVE_MODE === 'true' });
  server.listen(Number(env.PORT || 3001), '0.0.0.0', () => safeLog(console.log, 'started'));
  const shutdown = () => server.close(async () => { await ledger.close(); process.exit(0); });
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  start().catch(() => { console.error('physical-orders startup failed; check configuration and storage'); process.exitCode = 1; });
}
