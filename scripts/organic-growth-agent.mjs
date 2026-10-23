import fs from 'node:fs/promises';
import { campaignForSlot, currentSixHourSlot } from './digital-conversion-campaign.mjs';

const role = process.argv[2] || 'Storefront CRO Auditor';
const SHOP = process.env.PRISMBAY_SHOP_URL || 'https://clean.prismbayai.com/';
const LIVE_PREFLIGHT = process.env.PRISMBAY_LIVE_PREFLIGHT_URL || 'https://browser-worker-production-f5b4.up.railway.app/garment-steamer/';
const SITE = process.env.PRISMBAY_SITE_URL || 'https://clean.prismbayai.com';
const VERIFY = process.env.TIKTOK_VERIFY_URL || SITE + '/tiktokioWxniaZWfubplFsge1pzgPGhS04LORJ.txt';
const FETCH_ATTEMPTS = Math.max(1, Math.min(5, Number(process.env.PRISMBAY_FETCH_ATTEMPTS || 3)));
const FETCH_TIMEOUT_MS = Math.max(250, Math.min(30000, Number(process.env.PRISMBAY_FETCH_TIMEOUT_MS || 8000)));
const products = [
  'Portable Garment Steamer','3-in-1 Crevice Cleaning Brush','Hanging Closet Organizer',
  'Sink Drain Catcher 2-Pack','Cordless Handheld Vacuum','5-in-1 Electric Spin Scrubber',
  'Mattress Vacuum','Portable Home Caddy','Reusable Pet Hair Remover','Self-Squeeze Mini Mop'
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, options = {}) {
  const attempts = options.attempts ?? FETCH_ATTEMPTS;
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const extraHeaders = options.headers || {};
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'PrismBay-Growth-Agent/3.0', ...extraHeaders },
        signal: controller.signal,
      });
      const text = await r.text();
      clearTimeout(timer);

      if (r.status >= 500 && attempt < attempts) {
        lastError = `HTTP ${r.status}`;
        await sleep(250 * (2 ** (attempt - 1)));
        continue;
      }

      return { ok: r.ok, status: r.status, url: r.url, text, error: null, attempts: attempt };
    } catch (error) {
      clearTimeout(timer);
      lastError = error?.cause?.code || error?.name || error?.message || String(error);
      if (attempt < attempts) await sleep(250 * (2 ** (attempt - 1)));
    }
  }

  return { ok: false, status: 0, url, text: '', error: lastError || 'fetch_failed', attempts };
}

const match = (html, re) => (html.match(re)?.[1] || '').trim();
const count = (html, re) => [...html.matchAll(re)].length;
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function inspectStorefront(target) {
  const r = await fetchText(target);
  const html = r.text;
  return { target, status: r.status, finalUrl: r.url,
    reachable: r.ok, error: r.error, attempts: r.attempts,
    title: strip(match(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    description: match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),
    canonical: match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i),
    h1: strip(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
    ctaCount: count(html, /<(?:a|button)\b[^>]*>[\s\S]*?(?:buy|shop|checkout|order|view|see|get|check|open)[\s\S]*?<\/(?:a|button)>/gi),
    hasProductSchema: /"@type"\s*:\s*"(?:Product|ItemList)"/i.test(html),
    hasDirectStripeLink: /https:\/\/buy\.stripe\.com\//i.test(html),
    hasRailwayPreflight: /browser-worker-production-f5b4\.up\.railway\.app\/garment-steamer/i.test(html),
    hasExpiredAugustCopy: /August\s+27|Aug\.?\s*27/i.test(html)
  };
}

async function croAudit() {
  const activeStorefront = await inspectStorefront(SHOP);
  const livePreflight = await inspectStorefront(LIVE_PREFLIGHT);
  return {
    activeStorefront,
    livePreflight,
    routePolicy: {
      appDeployRequired: false,
      directStripeOnPublicStorefrontAllowed: false,
      buyerZipPreflightRequired: true,
    }
  };
}

async function publisherReadiness() {
  const urls = [SITE + '/terms.html', SITE + '/privacy.html', VERIFY];
  const results = [];
  for (const url of urls) {
    const r = await fetchText(url);
    results.push({ url, status: r.status, ok: r.ok, finalUrl: r.url, error: r.error, attempts: r.attempts, bodyPreview: strip(r.text).slice(0, 160) });
  }
  const verification = results.find(x => x.url === VERIFY);
  return {
    checks: results,
    degraded: results.some(x => !x.ok),
    tiktokVerificationReady: Boolean(verification?.ok && /tiktok-developers-site-verification=/i.test(verification.bodyPreview)),
    retailLandingPage: LIVE_PREFLIGHT,
    rule: 'TikTok publication stays blocked until the exact provider verification file and all channel-specific authorization gates pass.'
  };
}

function hookWriter() {
  const campaignId = 'garment_steamer_preflight_' + Math.floor(Date.now() / 21600000);
  const cta = LIVE_PREFLIGHT + '?utm_source=github_cloud&utm_medium=organic_draft&utm_campaign=' + campaignId;
  const hooks = [
    'Travel steamer shopping? Check the delivered route before paying.',
    'A garment steamer price is only part of the order. Destination shipping matters too.',
    'Before buying a portable garment steamer, verify stock, U.S. ZIP shipping and the exact checkout route.'
  ];
  return {
    product: 'Portable Garment Steamer',
    hooks,
    cta,
    draftOnly: true,
    physicalProductAvailabilityClaim: false,
    publicationAuthorized: false,
    guardedPreflightPromotion: true,
    directStripePromotion: false,
    note: 'Editorial promotion draft points only to the live buyer-ZIP preflight. It does not claim universal availability, a sale, or guaranteed delivery.',
    originalMediaBrief: {
      format: 'vertical short-form',
      thirdPartyMediaRequired: false,
      scenes: [
        'Original text hook about checking total delivered route before payment.',
        'Simple original garment-care iconography or typography, no copied product footage.',
        'Explain: enter U.S. ZIP, live stock and freight check, then secure checkout only if approved.',
        'CTA: check live availability. Do not show a direct Stripe link.'
      ]
    },
    digitalCampaign: campaignForSlot(currentSixHourSlot()),
  };
}

function trendScout() {
  return {
    commercialPriority: 'Portable Garment Steamer',
    priorityProducts: products.slice(0, 5),
    liveResearchQueries: [
      'portable garment steamer US buyer demand',
      'travel garment steamer buyer questions',
      'garment steamer clothing wrinkle care shopping trends',
      'portable steamer U.S. shipping buyer intent'
    ],
    instruction: 'Keep the garment steamer first while it is the only product with a verified guarded preflight route. Research other products without promoting them until their route exists.'
  };
}

function creatorScout() {
  return {
    product: 'Portable Garment Steamer',
    landingPage: LIVE_PREFLIGHT,
    segments: ['garment care','travel packing','workwear and office style','small-space living','home care'],
    qualification: ['recent relevant content','real engagement','clear contact route','commission/revenue-share fit','no paid-upfront requirement'],
    outreachRule: 'Research only until owner-approved contact. Do not bulk-spam. Any future outreach must link to the guarded preflight page, not Stripe.'
  };
}

async function analyticsReviewer() {
  const statusUrl = 'https://prismbay-sales-control-plane-production.up.railway.app/status';
  const r = await fetchText(statusUrl);
  let parsed = null;
  try { parsed = JSON.parse(r.text); } catch {}
  return {
    statusEndpoint: statusUrl,
    httpStatus: r.status,
    live: r.ok,
    error: r.error,
    attempts: r.attempts,
    reported: parsed,
    buyerFunnel: LIVE_PREFLIGHT,
    rule: 'Internal/test traffic, availability probes and workflow activity are not counted as demand or revenue. Only verified non-test customer payments count.'
  };
}

async function offerOptimizer() {
  const r = await fetchText(LIVE_PREFLIGHT);
  const html = r.text;
  const countdown = strip(match(html, /<div[^>]+id=["']timer["'][^>]*>([\s\S]*?)<\/div>/i));
  const saleEnd = match(html, /Ends\s+([A-Z][a-z]{2}\s+\d{1,2})/i);
  return {
    shopStatus: r.status,
    reachable: r.ok,
    error: r.error,
    attempts: r.attempts,
    target: LIVE_PREFLIGHT,
    countdownText: countdown || null,
    saleEndText: saleEnd || null,
    staleAugustCopy: /August\s+27|Aug\.?\s*27/i.test(html),
    recommendation: 'Keep the $29.95 page and checkout route aligned. Optimize copy around live ZIP verification rather than urgency or unsupported discount claims.'
  };
}

async function githubSupport() {
  const repos = ['puppeteer/puppeteer','browser-use/browser-use','microsoft/playwright','honojs/hono'];
  const out = [];
  for (const repo of repos) {
    const r = await fetchText('https://api.github.com/repos/' + repo, {
      headers: { accept: 'application/vnd.github+json' },
    });
    let j = {};
    try { j = r.ok ? JSON.parse(r.text) : {}; } catch {}
    out.push({ repo, status: r.status, error: r.error, attempts: r.attempts, updatedAt: j.updated_at || null, pushedAt: j.pushed_at || null, stars: j.stargazers_count ?? null, license: j.license?.spdx_id || null });
  }
  return { repos: out, degraded: out.some(x => x.status !== 200), use: 'Reference only; adopt code only after license and fit review.' };
}

const runners = {
  'Trend Scout': trendScout,
  'Hook/Creative Writer': hookWriter,
  'Storefront CRO Auditor': croAudit,
  'Creator/Partner Scout': creatorScout,
  'Publisher': publisherReadiness,
  'Analytics Reviewer': analyticsReviewer,
  'Offer Optimizer': offerOptimizer,
  'GitHub Support Scout': githubSupport
};

if (!runners[role]) {
  console.error('Unknown role:', role);
  process.exit(2);
}

const startedAt = new Date().toISOString();
const result = await runners[role]();
const report = { role, startedAt, finishedAt: new Date().toISOString(), result };
const safe = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
await fs.mkdir('growth-reports', { recursive: true });
await fs.writeFile('growth-reports/' + safe + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) {
  const lines = [
    '## ' + role,
    '',
    'Started: ' + startedAt,
    '',
    '```json',
    JSON.stringify(result, null, 2).slice(0, 12000),
    '```',
    ''
  ];
  await fs.appendFile(summary, lines.join('\n'));
}
