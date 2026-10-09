import { createHmac } from 'node:crypto';

const apiKey = String(process.env.CJ_API_KEY || '').trim();
const target = String(process.env.RAILWAY_CLEAN_QUOTE_URL || 'https://browser-worker-production-f5b4.up.railway.app').replace(/\/$/, '');
const expectedVersion = String(process.env.EXPECTED_SERVICE_VERSION || '2026-10-09-live-checkout-v3');
const maxAttempts = Number(process.env.BOOTSTRAP_MAX_ATTEMPTS || 36);
const waitMs = Number(process.env.BOOTSTRAP_WAIT_MS || 10000);

if (!apiKey) throw new Error('CJ_API_KEY is required');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getHealth() {
  const response = await fetch(`${target}/health`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`health_${response.status}`);
  return response.json();
}

async function bootstrap() {
  const timestamp = Date.now();
  const proof = createHmac('sha256', apiKey)
    .update(`${timestamp}:prismbay-clean-quote-bootstrap`)
    .digest('hex');
  const response = await fetch(`${target}/internal/bootstrap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ apiKey, timestamp, proof }),
    signal: AbortSignal.timeout(20000),
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok || payload?.ready !== true) throw new Error(`bootstrap_${response.status}`);
}

let versionObserved = false;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const health = await getHealth();
    if (health?.version === expectedVersion) {
      versionObserved = true;
      console.log(`Expected live quote service version observed on attempt ${attempt}.`);
      break;
    }
    console.log(`Waiting for live quote deployment (${attempt}/${maxAttempts}).`);
  } catch {
    console.log(`Live quote health not ready yet (${attempt}/${maxAttempts}).`);
  }
  if (attempt < maxAttempts) await sleep(waitMs);
}

if (!versionObserved) throw new Error('Expected Railway quote service version was not observed');

await bootstrap();
const finalHealth = await getHealth();
if (finalHealth?.ready !== true || finalHealth?.version !== expectedVersion) {
  throw new Error('Railway quote service did not remain ready after bootstrap');
}

console.log('Railway quote service is authenticated and ready.');
