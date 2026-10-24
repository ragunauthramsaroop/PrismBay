import fs from 'node:fs/promises';
import { classifyRevenueEvidence } from './revenue-evidence-gates.mjs';

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
const evidence = classifyRevenueEvidence({guideHealthy,checkoutHealthy});

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
  commercialEvidence: evidence,
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
    ? 'Technical buyer path is online. Measure genuine external visits and actual Stripe paid events, verify order-bound delivery, then distribute the free buyer tool through approved channels.'
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
  loopHealthy,
  buyerTrafficStatus: evidence.trafficStatus,
  paymentStatus: evidence.paymentStatus,
  fulfillmentStatus: evidence.deliveryStatus
}));

if (!loopHealthy) process.exitCode = 1;
