import fs from 'node:fs/promises';

async function readJson(path) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); }
  catch { return null; }
}

const buyer = await readJson('growth-reports/buyer-acquisition-latest.json');
const sales = await readJson('growth-reports/freellm-sales-worker-latest.json');

const guideStatus = Number(buyer?.liveProof?.guide?.httpStatus || 0);
const checkoutStatus = Number(buyer?.liveProof?.checkout?.httpStatus || 0);
const guideHealthy = guideStatus >= 200 && guideStatus < 400;
const checkoutHealthy = checkoutStatus >= 200 && checkoutStatus < 400;
const conversionReady = sales?.workers?.conversionWriter?.state === 'ready';
const demandReady = sales?.workers?.demandMiner?.state === 'ready';
const loopHealthy = Boolean(guideHealthy && checkoutHealthy && conversionReady && demandReady);

const state = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  priority: 'paid_sales_from_verified_existing_offers',
  activeOffer: {
    slug: sales?.offer?.slug ?? buyer?.campaign?.offer?.slug ?? null,
    title: sales?.offer?.title ?? buyer?.campaign?.offer?.title ?? buyer?.campaign?.offer?.name ?? null,
    priceUsd: sales?.offer?.priceUsd ?? buyer?.campaign?.offer?.priceUsd ?? null,
    guideUrl: sales?.offer?.guideUrl ?? buyer?.campaign?.guideUrl ?? null,
    checkoutUrl: sales?.offer?.checkoutUrl ?? buyer?.campaign?.checkoutUrl ?? null,
  },
  positioning: sales?.freeLLM?.strategy ?? 'baseline',
  freeLLM: {
    status: sales?.freeLLM?.status ?? 'unknown',
    workerMode: sales?.freeLLM?.workerMode ?? null,
    requestedModel: sales?.freeLLM?.requestedModel ?? null,
  },
  funnelHealth: {
    guideHttpStatus: guideStatus || null,
    guideHealthy,
    checkoutHttpStatus: checkoutStatus || null,
    checkoutHealthy,
    demandMinerReady: demandReady,
    conversionWriterReady: conversionReady,
    loopHealthy,
  },
  distribution: {
    ownedSearchPages: sales?.distribution?.ownedSearchPages ?? null,
    indexNow: sales?.distribution?.indexNow ?? null,
    social: sales?.distribution?.social ?? 'draft_only',
    coldEmail: false,
  },
  commercialTruth: {
    paidSaleObserved: false,
    revenueClaimed: false,
    note: 'This GitHub control plane can verify acquisition and checkout readiness, but a real paid Stripe event is required before a sale or revenue is reported.'
  },
  nextAction: loopHealthy
    ? 'Keep the 30-minute acquisition loop active, refresh owned buyer pages when strategy changes, and drive qualified organic traffic to the verified Stripe checkout.'
    : 'Repair the buyer path immediately before increasing distribution. Do not claim or promote a broken checkout path.'
};

await fs.mkdir('growth-reports', { recursive: true });
await fs.writeFile('growth-reports/sales-revenue-control.json', JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({
  status: loopHealthy ? 'PASS' : 'BLOCKED',
  offer: state.activeOffer.slug,
  strategy: state.positioning,
  guide: state.funnelHealth.guideHttpStatus,
  checkout: state.funnelHealth.checkoutHttpStatus,
  loopHealthy
}));

if (!loopHealthy) process.exitCode = 1;
