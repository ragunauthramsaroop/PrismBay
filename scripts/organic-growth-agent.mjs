import fs from 'node:fs/promises';
import { campaignForSlot, currentSixHourSlot } from './digital-conversion-campaign.mjs';

const role = process.argv[2] || 'Storefront CRO Auditor';
const SHOP = process.env.PRISMBAY_SHOP_URL || 'https://prismbay-clean-49izhg.v2.appdeploy.ai/tiktok/';
const SHOP_CUSTOM = process.env.PRISMBAY_SHOP_CUSTOM_URL?.trim() || '';
const SITE = process.env.PRISMBAY_SITE_URL || 'https://www.prismbayai.com';
const VERIFY = process.env.TIKTOK_VERIFY_URL || SITE + '/tiktokioWxniaZWfubplFsge1pzgPGhS04LORJ.txt';
const FETCH_ATTEMPTS = Math.max(1, Math.min(5, Number(process.env.PRISMBAY_FETCH_ATTEMPTS || 3)));
const FETCH_TIMEOUT_MS = Math.max(250, Math.min(30000, Number(process.env.PRISMBAY_FETCH_TIMEOUT_MS || 8000)));
const products = [
  'Cordless Pressure Washer','Cordless Handheld Vacuum','5-in-1 Electric Spin Scrubber',
  'Mattress Vacuum','Portable Garment Steamer','Portable Home Caddy',
  'Reusable Pet Hair Remover','Self-Squeeze Mini Mop','3-in-1 Crevice Cleaning Brush',
  'Sink Drain Catcher 2-Pack'
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
        headers: { 'user-agent': 'PrismBay-Growth-Agent/2.0', ...extraHeaders },
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

async function croAudit() {
  async function inspect(target) {
    const r = await fetchText(target);
    const html = r.text;
    return { target, status: r.status, finalUrl: r.url,
      reachable: r.ok, error: r.error, attempts: r.attempts,
      title: strip(match(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      description: match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),
      canonical: match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i),
      h1: strip(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
      ctaCount: count(html, /<(?:a|button)\b[^>]*>[\s\S]*?(?:buy|shop|checkout|order|view|see|get)[\s\S]*?<\/(?:a|button)>/gi),
      hasProductSchema: /"@type"\s*:\s*"(?:Product|ItemList)"/i.test(html),
      hasExpiredAugustCopy: /August\s+27|Aug\.?\s*27/i.test(html)
    };
  }
  const activeStorefront = await inspect(SHOP);
  const customDomain = SHOP_CUSTOM
    ? await inspect(SHOP_CUSTOM)
    : { target: null, status: 'not_configured', publicPromotion: false, note: 'No custom PrismBay Clean storefront hostname is configured; use the verified AppDeploy storefront URL.' };
  return { activeStorefront, customDomain };
}

async function publisherReadiness() {
  const urls = [SITE + '/terms', SITE + '/privacy', VERIFY];
  const results = [];
  for (const url of urls) {
    const r = await fetchText(url);
    results.push({ url, status: r.status, ok: r.ok, finalUrl: r.url, error: r.error, attempts: r.attempts, bodyPreview: strip(r.text).slice(0, 160) });
  }
  const verification = results.find(x => x.url === VERIFY);
  return {
    checks: results,
    degraded: results.some(x => !x.ok),
    tiktokVerificationReady: Boolean(verification?.ok && /tiktok-developers-site-verification=/i.test(verification.bodyPreview))
  };
}

function hookWriter() {
  const hour = new Date().getUTCHours();
  const p = products[hour % products.length];
  const hooks = [
    `What to check before choosing a ${p} for your home.`,
    `Compare key specifications and safety information for ${p} models.`,
    `Three questions to ask a supplier before ordering a ${p}.`,
  ];
  return {
    product: p, hooks, cta: null, draftOnly: true,
    physicalProductAvailabilityClaim: false, publicationAuthorized: false,
    note: 'Editorial research only. Validate SKU, current inventory, final US ZIP freight, product media rights and merchant approval before a promotional CTA.',
    digitalCampaign: campaignForSlot(currentSixHourSlot()),
  };
}

function trendScout() {
  return {
    priorityProducts: products.slice(0, 5),
    liveResearchQueries: [
      'TikTok Shop US cleaning tools current demand',
      'TikTok Shop cordless pressure washer current demand',
      'TikTok Shop electric spin scrubber current demand',
      'TikTok Shop garment steamer current demand'
    ],
    instruction: 'Use connected live-web research to validate demand before changing product priority.'
  };
}

function creatorScout() {
  return {
    segments: ['CleanTok','home organization','car cleaning','pet hair','household tools'],
    qualification: ['recent relevant content','real engagement','clear contact route','commission/revenue-share fit','no paid-upfront requirement'],
    outreachRule: 'Do not bulk-spam. Contact only qualified creators with a relevant product angle.'
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
    rule: 'Internal/test traffic is not counted as demand or revenue.'
  };
}

async function offerOptimizer() {
  const r = await fetchText(SHOP);
  const html = r.text;
  const countdown = strip(match(html, /<div[^>]+id=["']timer["'][^>]*>([\s\S]*?)<\/div>/i));
  const saleEnd = match(html, /Ends\s+([A-Z][a-z]{2}\s+\d{1,2})/i);
  return {
    shopStatus: r.status,
    reachable: r.ok,
    error: r.error,
    attempts: r.attempts,
    countdownText: countdown || null,
    saleEndText: saleEnd || null,
    staleAugustCopy: /August\s+27|Aug\.?\s*27/i.test(html),
    recommendation: 'Keep price/value claims tied to live checkout values; remove expired urgency immediately.'
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
