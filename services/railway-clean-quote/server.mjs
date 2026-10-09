import http from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createQuoteService } from '../physical-orders/shipping-quote.mjs';

const CJ_AUTH_URL = 'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken';
const CONFIG = JSON.parse(readFileSync(new URL('../../config/clean-live-quote.json', import.meta.url), 'utf8'));
const ALLOWED_ORIGINS = new Set([
  'https://ragunauth123456-maker.github.io',
  'https://www.prismbayai.com',
  'https://prismbayai.com',
]);
const MAX_BODY_BYTES = 4096;
const BOOTSTRAP_WINDOW_MS = 5 * 60 * 1000;
const QUOTE_LIMIT_PER_MINUTE = 8;
const BOOTSTRAP_LIMIT_PER_MINUTE = 3;

let activeApiKey = '';
let primedAt = null;
const rateBuckets = new Map();

function json(res, status, value, origin = '') {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(value));
}

function clientKey(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
}

function allowedRate(kind, key, now = Date.now()) {
  const max = kind === 'bootstrap' ? BOOTSTRAP_LIMIT_PER_MINUTE : QUOTE_LIMIT_PER_MINUTE;
  const minute = Math.floor(now / 60000);
  const id = `${kind}:${key}`;
  const current = rateBuckets.get(id);
  const next = !current || current.minute !== minute ? { minute, count: 1 } : { minute, count: current.count + 1 };
  rateBuckets.set(id, next);
  if (rateBuckets.size > 2000) {
    for (const [bucket, value] of rateBuckets) if (value.minute < minute - 2) rateBuckets.delete(bucket);
  }
  return next.count <= max;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('body_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validZip(value) {
  return /^\d{5}$/.test(String(value || '').trim());
}

export function makeBootstrapProof(apiKey, timestamp) {
  return createHmac('sha256', String(apiKey || '')).update(`${timestamp}:prismbay-clean-quote-bootstrap`).digest('hex');
}

export function validBootstrapEnvelope(input, now = Date.now()) {
  const apiKey = String(input?.apiKey || '').trim();
  const timestamp = Number(input?.timestamp);
  const proof = String(input?.proof || '').trim();
  if (apiKey.length < 16 || apiKey.length > 500 || !Number.isInteger(timestamp)) return false;
  if (Math.abs(now - timestamp) > BOOTSTRAP_WINDOW_MS) return false;
  return safeEqual(proof, makeBootstrapProof(apiKey, timestamp));
}

async function validateCjKey(apiKey, fetchImpl = fetch) {
  const response = await fetchImpl(CJ_AUTH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'PrismBay-Railway-Quote/1.0' },
    body: JSON.stringify({ apiKey }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => null);
  return Boolean(payload?.data?.accessToken);
}

function quoteCatalog() {
  return {
    products: [{
      sku: CONFIG.sku,
      retailUsd: CONFIG.retailUsd,
      feeRatePct: CONFIG.feeRatePct,
      returnReservePct: CONFIG.returnReservePct,
      stripePaymentUrl: CONFIG.stripePaymentUrl,
      routes: CONFIG.routes.map(route => ({
        routeId: route.routeId,
        cjVariantId: route.cjVariantId,
        supplierCostUsd: route.supplierCostUsd,
        originCountryCode: route.originCountryCode,
      })),
    }],
  };
}

function createLiveQuoteService(apiKey) {
  const quoteSecret = createHash('sha256').update(`prismbay-clean-live-quote-v1:${apiKey}`).digest('hex');
  return createQuoteService({
    env: {
      CJ_API_KEY: apiKey,
      QUOTE_SIGNING_SECRET: quoteSecret,
      QUOTE_TTL_SECONDS: '300',
      CJ_QUOTE_PRODUCTS_JSON: JSON.stringify(quoteCatalog()),
    },
  });
}

export function createServer({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const origin = String(req.headers.origin || '');

    if (req.method === 'OPTIONS' && url.pathname === '/v1/quote') {
      if (!ALLOWED_ORIGINS.has(origin)) return json(res, 403, { error: 'origin_not_allowed' });
      res.writeHead(204, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '600',
        'vary': 'Origin',
      });
      return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        service: 'prismbay-clean-live-quote',
        ready: Boolean(activeApiKey),
        product: CONFIG.sku,
        automaticSupplierOrdering: false,
        primedAt,
      }, origin);
    }

    if (req.method === 'POST' && url.pathname === '/internal/bootstrap') {
      if (!allowedRate('bootstrap', clientKey(req), now())) return json(res, 429, { error: 'rate_limited' });
      try {
        const input = await readJson(req);
        if (!validBootstrapEnvelope(input, now())) return json(res, 401, { error: 'invalid_bootstrap_envelope' });
        const apiKey = String(input.apiKey).trim();
        if (!(await validateCjKey(apiKey, fetchImpl))) return json(res, 401, { error: 'supplier_credential_rejected' });
        activeApiKey = apiKey;
        primedAt = new Date(now()).toISOString();
        return json(res, 202, { accepted: true, ready: true, primedAt });
      } catch (error) {
        return json(res, error?.status === 413 ? 413 : 503, { error: error?.status === 413 ? 'body_too_large' : 'supplier_validation_unavailable' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/v1/quote') {
      if (!ALLOWED_ORIGINS.has(origin)) return json(res, 403, { success: false, error: 'origin_not_allowed' });
      if (!allowedRate('quote', clientKey(req), now())) return json(res, 429, { success: false, error: 'rate_limited' }, origin);
      if (!activeApiKey) return json(res, 503, { success: false, error: 'live_quote_temporarily_unavailable' }, origin);
      try {
        const input = await readJson(req);
        const zip = String(input?.zip || '').trim();
        if (!validZip(zip) || Object.keys(input || {}).some(key => key !== 'zip')) {
          return json(res, 400, { success: false, error: 'Enter a valid 5-digit U.S. ZIP code.' }, origin);
        }

        const service = createLiveQuoteService(activeApiKey);
        const quote = await service.quote({ sku: CONFIG.sku, zip, quantity: CONFIG.rules.quantity });
        if (!quote?.ok || quote.checkoutAllowed !== true || typeof quote.quoteToken !== 'string') {
          return json(res, Number(quote?.status) || 409, { success: false, error: 'This item is not available for that ZIP code right now.' }, origin);
        }
        const authorization = await service.authorizeCheckout({ quoteToken: quote.quoteToken, zip });
        if (!authorization?.ok || authorization.checkoutAllowed !== true || typeof authorization.paymentUrl !== 'string') {
          return json(res, Number(authorization?.status) || 409, { success: false, error: 'Checkout is not available for that ZIP code right now.' }, origin);
        }
        return json(res, 200, {
          success: true,
          productSlug: CONFIG.sku,
          productName: CONFIG.displayName,
          priceUsd: CONFIG.retailUsd,
          zip,
          stockVerified: authorization.stockRevalidatedAtCheckout === true,
          destinationShippingVerified: authorization.shippingRevalidatedAtCheckout === true,
          economicsVerified: authorization.economicsRevalidatedAtCheckout === true,
          estimatedDelivery: quote.shipping?.aging || null,
          checkoutUrl: authorization.paymentUrl,
          supplierOrderingEnabled: false,
        }, origin);
      } catch {
        return json(res, 503, { success: false, error: 'Live availability checking is temporarily unavailable.' }, origin);
      }
    }

    return json(res, 404, { error: 'not_found' }, origin);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () => console.log('prismbay_clean_quote_ready'));
}
