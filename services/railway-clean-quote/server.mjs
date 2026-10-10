import http from 'node:http';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const SERVICE_VERSION = '2026-10-09-live-checkout-v3';
const CONFIG = Object.freeze({
  sku: 'garment-steamer',
  displayName: 'Portable Garment Steamer',
  retailUsd: 29.95,
  feeRatePct: 3.2,
  returnReservePct: 5,
  stripePaymentUrl: 'https://buy.stripe.com/bJe4gA8XAdOjeKmb8QgnK05',
  quantity: 1,
  route: Object.freeze({
    routeId: 'cj-primary-guarded',
    variantId: '2508160953561608700',
    supplierCostUsd: 3.54,
    originCountryCode: 'CN',
  }),
});
const ALLOWED_ORIGINS = new Set([
  'https://ragunauth123456-maker.github.io',
  'https://clean.prismbayai.com',
  'https://www.prismbayai.com',
  'https://prismbayai.com',
]);
const MAX_BODY_BYTES = 4096;
const BOOTSTRAP_WINDOW_MS = 5 * 60 * 1000;
const QUOTE_TTL_MS = 5 * 60 * 1000;
const QUOTE_LIMIT_PER_MINUTE = 8;
const BOOTSTRAP_LIMIT_PER_MINUTE = 3;

let activeApiKey = '';
let activeAccessToken = '';
let activeAccessTokenExpiresAt = 0;
let primedAt = null;
const rateBuckets = new Map();
const consumedQuotes = new Map();

function json(res, status, value, origin = '') {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers.vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(value));
}

function html(res, status, value) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  });
  res.end(value);
}

function sameOriginAllowed(origin, req) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.host === String(req.headers.host || '');
  } catch {
    return false;
  }
}

function buyerPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portable Garment Steamer | PrismBay Clean</title>
<meta name="description" content="Check live U.S. destination availability for the PrismBay Clean Portable Garment Steamer before payment.">
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#173a2f;background:#f7faf8}*{box-sizing:border-box}body{margin:0}.wrap{max-width:980px;margin:0 auto;padding:32px 20px 70px}.brand{font-weight:800;color:#174b38;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:36px;align-items:start;margin-top:28px}.visual{min-height:390px;border-radius:28px;background:linear-gradient(145deg,#f3eadc,#e5f0e9);display:grid;place-items:center;font-size:90px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:1.5px;color:#527467}h1{font-size:clamp(38px,6vw,58px);line-height:1;margin:10px 0 14px}.price{font-size:30px;font-weight:800}.copy{font-size:17px;line-height:1.6;color:#476158}.checks{display:grid;gap:10px;margin:24px 0}.checks div{display:flex;gap:9px;align-items:center}.card{background:#fff;border:1px solid #d8e1dc;border-radius:20px;padding:20px;box-shadow:0 12px 32px rgba(23,58,47,.06)}label{display:block;font-weight:800;margin-bottom:8px}.row{display:flex;gap:10px;flex-wrap:wrap}input{flex:1 1 170px;min-width:0;border:1px solid #b9c9c0;border-radius:12px;padding:14px;font-size:16px}button,a.button{border:0;border-radius:12px;padding:14px 18px;font-size:15px;font-weight:800;background:#174b38;color:#fff;cursor:pointer;text-decoration:none;display:inline-block}button[disabled]{opacity:.55;cursor:not-allowed}.small{font-size:12px;color:#667d74}.result{margin-top:16px;border-radius:15px;padding:17px;display:none}.ok{background:#edf7f1;border:1px solid #b8ddc7}.bad{background:#fff7ed;border:1px solid #f0d5ad}.result strong{display:block;margin-bottom:7px}.checkout{margin-top:12px}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.fact{padding:12px;background:#f4f7f5;border-radius:12px}.fact b{display:block;font-size:13px}.fact span{font-size:12px;color:#667d74}@media(max-width:640px){.facts{grid-template-columns:1fr}.visual{min-height:260px}}
</style>
</head>
<body><main class="wrap">
<a class="brand" href="/">PrismBay Clean</a>
<section class="grid">
<div class="visual" aria-label="Portable garment steamer">♨️</div>
<div>
<div class="eyebrow">FABRIC CARE</div>
<h1>Portable Garment Steamer</h1>
<div class="price">USD 29.95</div>
<p class="copy">Handheld steam care for clothing, travel and everyday household fabric touch-ups.</p>
<div class="checks"><div>✓ Live supplier stock rechecked</div><div>✓ U.S. destination route verified for your ZIP</div><div>✓ Checkout released only after margin and freight checks pass</div></div>
<form id="quote-form" class="card">
<label for="zip">Check availability for your U.S. ZIP</label>
<div class="row"><input id="zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" placeholder="e.g. 10001" required><button id="check" type="submit">Check availability</button></div>
<p class="small">No payment is taken during this check. PrismBay does not enable automatic supplier ordering.</p>
</form>
<div id="result" class="result" role="status" aria-live="polite"></div>
<div class="facts"><div class="fact"><b>Fail-closed checkout</b><span>No verified route means no payment link.</span></div><div class="fact"><b>Fresh recheck</b><span>Stock and shipping are checked again before checkout.</span></div><div class="fact"><b>Secure payment</b><span>Approved buyers continue to Stripe.</span></div></div>
</div></section></main>
<script>
(() => {
  const form = document.getElementById('quote-form');
  const zip = document.getElementById('zip');
  const button = document.getElementById('check');
  const result = document.getElementById('result');
  let quoteToken = '';
  let quotedZip = '';

  function show(kind, title, text, withCheckout) {
    result.className = 'result ' + kind;
    result.style.display = 'block';
    result.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = title;
    result.appendChild(strong);
    const p = document.createElement('div');
    p.textContent = text;
    result.appendChild(p);
    if (withCheckout) {
      const checkout = document.createElement('button');
      checkout.type = 'button';
      checkout.className = 'checkout';
      checkout.textContent = 'Continue to secure checkout';
      checkout.addEventListener('click', authorizeCheckout);
      result.appendChild(checkout);
    }
  }

  async function post(payload) {
    const response = await fetch('/v1/quote', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    let data = {};
    try { data = await response.json(); } catch {}
    return { response, data };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = String(zip.value || '').replace(/\\D/g,'').slice(0,5);
    zip.value = value;
    if (!/^\\d{5}$/.test(value)) return show('bad','ZIP required','Enter a valid 5-digit U.S. ZIP code.',false);
    quoteToken = '';
    quotedZip = '';
    button.disabled = true;
    button.textContent = 'Checking…';
    try {
      const { response, data } = await post({ zip: value });
      if (!response.ok || !data.success || data.stage !== 'quoted' || !data.quoteToken) {
        return show('bad','Not approved',data.error || 'This destination is not approved right now. No payment was taken.',false);
      }
      quoteToken = data.quoteToken;
      quotedZip = value;
      const delivery = data.estimatedDelivery ? ' Estimated transit: ' + data.estimatedDelivery + '.' : '';
      show('ok','Destination approved','Live stock, destination shipping and commercial checks passed.' + delivery + ' Checkout will recheck these conditions once more.',true);
    } catch {
      show('bad','Live check unavailable','The live supplier check is unavailable right now. No payment was taken.',false);
    } finally {
      button.disabled = false;
      button.textContent = 'Check availability';
    }
  });

  async function authorizeCheckout(event) {
    const checkout = event.currentTarget;
    if (!quoteToken || !quotedZip) return;
    checkout.disabled = true;
    checkout.textContent = 'Rechecking…';
    try {
      const { response, data } = await post({ zip: quotedZip, quoteToken });
      if (!response.ok || !data.success || data.stage !== 'checkout_authorized' || !data.checkoutUrl) {
        quoteToken = '';
        return show('bad','Checkout not released',data.error || 'Stock or shipping changed. Please check availability again.',false);
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      show('bad','Checkout unavailable','Final verification could not be completed. No payment was taken.',false);
    }
  }
})();
</script>
</body></html>`;
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
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('invalid_json'), { status: 400 });
  }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
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

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`upstream_${response.status}`);
  return response.json();
}

async function authenticate(apiKey, fetchImpl = fetch) {
  const payload = await requestJson(fetchImpl, `${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'PrismBay-Railway-Quote/3.0' },
    body: JSON.stringify({ apiKey }),
  });
  const token = String(payload?.data?.accessToken || '').trim();
  if (!token) throw new Error('supplier_credential_rejected');
  const parsedExpiry = Date.parse(payload?.data?.accessTokenExpiryDate || '');
  return {
    token,
    expiresAt: Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 60 * 60 * 1000,
  };
}

async function getAccessToken(fetchImpl, now) {
  if (activeAccessToken && now() < activeAccessTokenExpiresAt - 60000) return activeAccessToken;
  if (!activeApiKey) throw new Error('supplier_credential_missing');
  const auth = await authenticate(activeApiKey, fetchImpl);
  activeAccessToken = auth.token;
  activeAccessTokenExpiresAt = auth.expiresAt;
  return activeAccessToken;
}

function cjHeaders(token) {
  return {
    'CJ-Access-Token': token,
    'content-type': 'application/json',
    'user-agent': 'PrismBay-Railway-Quote/3.0',
  };
}

async function verifyStock(fetchImpl, now) {
  const token = await getAccessToken(fetchImpl, now);
  const url = new URL(`${CJ_BASE}/product/stock/queryByVid`);
  url.searchParams.set('vid', CONFIG.route.variantId);
  const payload = await requestJson(fetchImpl, url, { headers: cjHeaders(token) });
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const match = rows.find(row =>
    String(row?.vid || '') === CONFIG.route.variantId &&
    String(row?.countryCode || '').toUpperCase() === CONFIG.route.originCountryCode &&
    Number(row?.cjInventoryNum || 0) >= CONFIG.quantity
  );
  return match ? Number(match.cjInventoryNum || 0) : 0;
}

async function resolveFreight(fetchImpl, now, zip) {
  const token = await getAccessToken(fetchImpl, now);
  const payload = await requestJson(fetchImpl, `${CJ_BASE}/logistic/freightCalculate`, {
    method: 'POST',
    headers: cjHeaders(token),
    body: JSON.stringify({
      startCountryCode: CONFIG.route.originCountryCode,
      endCountryCode: 'US',
      zip,
      products: [{ quantity: CONFIG.quantity, vid: CONFIG.route.variantId }],
    }),
  });
  const methods = (Array.isArray(payload?.data) ? payload.data : [])
    .map(row => ({
      name: String(row?.logisticName || '').trim(),
      usd: positive(row?.logisticPrice),
      aging: String(row?.logisticAging || '').trim() || null,
    }))
    .filter(row => row.name && row.usd)
    .sort((a, b) => a.usd - b.usd);
  return methods[0] || null;
}

export function computeEconomics(freightUsd) {
  const freight = positive(freightUsd);
  if (!freight) return { approved: false, reason: 'freight_unavailable' };
  const merchandiseUsd = CONFIG.route.supplierCostUsd * CONFIG.quantity;
  const revenueUsd = CONFIG.retailUsd * CONFIG.quantity;
  const feesUsd = revenueUsd * CONFIG.feeRatePct / 100;
  const returnsReserveUsd = revenueUsd * CONFIG.returnReservePct / 100;
  const landedUsd = merchandiseUsd + freight;
  const contributionUsd = revenueUsd - landedUsd - feesUsd - returnsReserveUsd;
  const contributionPct = contributionUsd / revenueUsd * 100;
  const landedPctOfRetail = landedUsd / revenueUsd * 100;
  const approved = contributionUsd >= 3 && contributionPct >= 25 && landedPctOfRetail <= 55;
  return {
    approved,
    reason: approved ? 'commercial_thresholds_passed' : 'commercial_thresholds_failed',
    revenueUsd: +revenueUsd.toFixed(2),
    merchandiseUsd: +merchandiseUsd.toFixed(2),
    freightUsd: +freight.toFixed(2),
    landedUsd: +landedUsd.toFixed(2),
    feesUsd: +feesUsd.toFixed(2),
    returnsReserveUsd: +returnsReserveUsd.toFixed(2),
    contributionUsd: +contributionUsd.toFixed(2),
    contributionPct: +contributionPct.toFixed(1),
    landedPctOfRetail: +landedPctOfRetail.toFixed(1),
  };
}

function quoteSecret(apiKey) {
  return createHash('sha256').update(`prismbay-clean-live-quote-v2:${apiKey}`).digest('hex');
}

function issueQuote({ zip, freightUsd, now }) {
  const data = {
    v: 1,
    id: randomBytes(18).toString('base64url'),
    sku: CONFIG.sku,
    zipHash: createHmac('sha256', quoteSecret(activeApiKey)).update(zip).digest('hex'),
    freightUsd: +Number(freightUsd).toFixed(2),
    issuedAt: now,
    expiresAt: now + QUOTE_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
  const signature = createHmac('sha256', quoteSecret(activeApiKey)).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyQuote(token, zip, now) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', quoteSecret(activeApiKey)).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const zipHash = createHmac('sha256', quoteSecret(activeApiKey)).update(zip).digest('hex');
  if (data?.v !== 1 || data?.sku !== CONFIG.sku || data?.zipHash !== zipHash) return null;
  if (!Number.isFinite(data?.issuedAt) || !Number.isFinite(data?.expiresAt) || data.expiresAt <= now || data.issuedAt > now) return null;
  if (data.expiresAt - data.issuedAt > QUOTE_TTL_MS) return null;
  return data;
}

function consumeQuote(id, expiresAt, now) {
  for (const [key, expiry] of consumedQuotes) if (expiry <= now) consumedQuotes.delete(key);
  if (consumedQuotes.has(id)) return false;
  consumedQuotes.set(id, expiresAt);
  return true;
}

async function liveCheck(fetchImpl, now, zip) {
  const inventory = await verifyStock(fetchImpl, now);
  if (inventory < CONFIG.quantity) return { ok: false, status: 409, error: 'stock_unavailable' };
  const shipping = await resolveFreight(fetchImpl, now, zip);
  if (!shipping) return { ok: false, status: 409, error: 'freight_unavailable' };
  const economics = computeEconomics(shipping.usd);
  if (!economics.approved) return { ok: false, status: 409, error: 'commercial_thresholds_failed', shipping, economics };
  return { ok: true, inventory, shipping, economics };
}

export function createServer({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const origin = String(req.headers.origin || '');

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/garment-steamer' || url.pathname === '/garment-steamer/')) {
      return html(res, 200, buyerPage());
    }

    if (req.method === 'OPTIONS' && url.pathname === '/v1/quote') {
      if (!sameOriginAllowed(origin, req)) return json(res, 403, { error: 'origin_not_allowed' });
      res.writeHead(204, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '600',
        vary: 'Origin',
      });
      return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        service: 'prismbay-clean-live-quote',
        version: SERVICE_VERSION,
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
        const auth = await authenticate(apiKey, fetchImpl);
        activeApiKey = apiKey;
        activeAccessToken = auth.token;
        activeAccessTokenExpiresAt = auth.expiresAt;
        primedAt = new Date(now()).toISOString();
        return json(res, 202, { accepted: true, ready: true, primedAt, version: SERVICE_VERSION });
      } catch (error) {
        const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 503;
        return json(res, status, { error: status === 413 ? 'body_too_large' : status === 400 ? 'invalid_json' : 'supplier_validation_unavailable' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/v1/quote') {
      if (!sameOriginAllowed(origin, req)) return json(res, 403, { success: false, error: 'origin_not_allowed' });
      if (!allowedRate('quote', clientKey(req), now())) return json(res, 429, { success: false, error: 'rate_limited' }, origin);
      if (!activeApiKey) return json(res, 503, { success: false, error: 'live_quote_temporarily_unavailable' }, origin);
      try {
        const input = await readJson(req);
        const zip = String(input?.zip || '').trim();
        if (!validZip(zip) || Object.keys(input || {}).some(key => !['zip', 'quoteToken'].includes(key))) {
          return json(res, 400, { success: false, error: 'Enter a valid 5-digit U.S. ZIP code.' }, origin);
        }

        if (!input.quoteToken) {
          const check = await liveCheck(fetchImpl, now, zip);
          if (!check.ok) return json(res, check.status, { success: false, error: 'This item is not available for that ZIP code right now.' }, origin);
          const token = issueQuote({ zip, freightUsd: check.shipping.usd, now: now() });
          return json(res, 200, {
            success: true,
            stage: 'quoted',
            productSlug: CONFIG.sku,
            productName: CONFIG.displayName,
            priceUsd: CONFIG.retailUsd,
            zip,
            stockVerified: true,
            destinationShippingVerified: true,
            economicsVerified: true,
            estimatedDelivery: check.shipping.aging,
            shippingUsd: check.shipping.usd,
            quoteToken: token,
            expiresInSeconds: QUOTE_TTL_MS / 1000,
            supplierOrderingEnabled: false,
          }, origin);
        }

        const quote = verifyQuote(input.quoteToken, zip, now());
        if (!quote) return json(res, 409, { success: false, error: 'Your availability check expired. Please check again.' }, origin);
        const recheck = await liveCheck(fetchImpl, now, zip);
        if (!recheck.ok) return json(res, recheck.status, { success: false, error: 'Checkout is not available for that ZIP code right now.' }, origin);
        if (Math.abs(Number(recheck.shipping.usd) - Number(quote.freightUsd)) > 0.01) {
          return json(res, 409, { success: false, error: 'Shipping changed. Please check availability again.' }, origin);
        }
        if (!consumeQuote(quote.id, quote.expiresAt, now())) {
          return json(res, 409, { success: false, error: 'This checkout authorization has already been used.' }, origin);
        }
        return json(res, 200, {
          success: true,
          stage: 'checkout_authorized',
          productSlug: CONFIG.sku,
          productName: CONFIG.displayName,
          priceUsd: CONFIG.retailUsd,
          zip,
          stockVerified: true,
          destinationShippingVerified: true,
          economicsVerified: true,
          estimatedDelivery: recheck.shipping.aging,
          checkoutUrl: CONFIG.stripePaymentUrl,
          supplierOrderingEnabled: false,
        }, origin);
      } catch (error) {
        const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 503;
        return json(res, status, { success: false, error: status === 413 ? 'Request too large.' : status === 400 ? 'Invalid request.' : 'Live availability checking is temporarily unavailable.' }, origin);
      }
    }

    return json(res, 404, { error: 'not_found' }, origin);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () => console.log('prismbay_clean_quote_ready'));
}
