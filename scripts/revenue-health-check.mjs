import fs from 'node:fs/promises';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

export const BUYER_GUIDE_OFFERS = Object.freeze(ACTIVE_DIGITAL_OFFERS.filter(offer => offer.slug !== 'bundle'));

export const TARGETS = Object.freeze({
  paidStore: 'https://ragunauthramsaroop.github.io/PrismBay/toolkits.html',
  freeScorecard: 'https://ragunauthramsaroop.github.io/PrismBay/scorecard.html',
  physicalStore: 'https://prismbay-clean-49izhg.v2.appdeploy.ai/tiktok/',
  catalog: 'https://api.github.com/repos/ragunauthramsaroop/PrismBay/contents/public/viral-catalog.json?ref=main',
});

export const DIGITAL_CHECKOUT_TOKENS = Object.freeze([
  '4gM8wQ1v8dOj45Ib8QgnK0q',
  '4gMeVe8XA5hNfOq2CkgnK0r',
  'bJe7sMgq25hNcCe6SAgnK0s',
  'eVqfZi5Lo7pV31Ea4MgnK0t',
]);

export const PHYSICAL_PRODUCTS = Object.freeze([
  '5-in-1 Electric Spin Scrubber',
  'Cordless Pressure Washer',
  'Portable Garment Steamer',
  'Reusable Pet Hair Remover',
  '3-in-1 Crevice Cleaning Brush',
  'Mattress Vacuum',
  'Self-Squeeze Mini Mop',
  'Sink Drain Catcher 2-Pack',
  'Portable Home Caddy',
]);

export function validatePaidStore(html) {
  const missingCheckoutTokens = DIGITAL_CHECKOUT_TOKENS.filter(token => !html.includes(token));
  const missingPolicyLinks = ['www.prismbayai.com/refunds', 'www.prismbayai.com/contact'].filter(x => !html.includes(x));
  if (html.length < 6000 || missingCheckoutTokens.length || missingPolicyLinks.length) {
    throw new Error('paid_store_invalid:' + JSON.stringify({ missingCheckoutTokens, missingPolicyLinks, bytes: html.length }));
  }
  return { bytes: html.length, checkoutLinks: DIGITAL_CHECKOUT_TOKENS.length, policies: 2 };
}

export function validateBuyerGuide(html, offer) {
  if (!offer?.guide || !offer?.checkout || !Number.isInteger(offer.priceUsd)) throw new TypeError('A verified offer is required');
  const expected = [
    '<link rel="canonical" href="' + offer.guide + '"',
    'buyer-guides.css',
    offer.checkout.split('/').at(-1),
    'www.prismbayai.com/refunds',
    '<h1>'
  ];
  const missing = expected.filter(part => !html.includes(part));
  const displayedPrices = [...html.matchAll(/\$\s*([0-9]+)(?:\.([0-9]{2}))?(?![0-9.])/g)].map(match => Number(match[1]) + Number(match[2] ?? 0) / 100);
  if (!displayedPrices.includes(offer.priceUsd)) missing.push('exact_price_usd_' + offer.priceUsd);
  if (html.length < 7000 || missing.length) {
    throw new Error('buyer_guide_invalid:' + JSON.stringify({slug:offer.slug,missing,bytes:html.length}));
  }
  return {slug:offer.slug,priceUsd:offer.priceUsd,bytes:html.length};
}

export function validateScorecard(html) {
  for (const needle of ['Free AI Vendor Evidence Check', 'No login or paywall', 'scorecard-ui.mjs']) {
    if (!html.includes(needle)) throw new Error('scorecard_invalid:' + needle);
  }
  return { bytes: html.length };
}

export function validatePhysicalStore(html) {
  const missing = PHYSICAL_PRODUCTS.filter(name => !html.includes(name));
  if (missing.length) throw new Error('physical_store_invalid:' + JSON.stringify({ missing }));
  if (!html.includes('confirm the exact product, stock, total shipping cost and delivery estimate for your US ZIP code')) {
    throw new Error('physical_store_safety_copy_missing');
  }
  return { productsVisible: PHYSICAL_PRODUCTS.length, bytes: html.length };
}

export function validateCatalog(catalog, nowMs = Date.now()) {
  if (!catalog || !Array.isArray(catalog.products)) throw new Error('catalog_invalid_shape');
  const updated = Date.parse(catalog.updatedAt);
  if (!Number.isFinite(updated)) throw new Error('catalog_invalid_updated_at');
  const ageHours = (nowMs - updated) / 3_600_000;
  if (ageHours < -1 || ageHours > 24) throw new Error('catalog_stale:' + ageHours.toFixed(2));
  if (catalog.products.length < 9) throw new Error('catalog_incomplete:' + catalog.products.length);
  const unique = new Set(catalog.products.map(x => x.slug));
  if (unique.size !== catalog.products.length) throw new Error('catalog_duplicate_slugs');
  return { products: catalog.products.length, ageHours: Number(ageHours.toFixed(2)) };
}

async function get(url, responseType = 'text') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'PrismBay-GitHub-Health/1.0' },
    });
    if (!response.ok) throw new Error('http_' + response.status + ':' + url);
    return responseType === 'json' ? response.json() : response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getCatalog(url) {
  const payload = await get(url, 'json');
  if (Array.isArray(payload?.products)) return payload;
  if (payload?.encoding === 'base64' && typeof payload.content === 'string') {
    const decoded = Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  throw new Error('catalog_api_invalid_shape');
}

export async function runHealth({ nowMs = Date.now() } = {}) {
  const [paidStore, freeScorecard, physicalStore, catalog, ...buyerGuideHtml] = await Promise.all([
    get(TARGETS.paidStore),
    get(TARGETS.freeScorecard),
    get(TARGETS.physicalStore),
    getCatalog(TARGETS.catalog + '&t=' + encodeURIComponent(String(nowMs))),
    ...BUYER_GUIDE_OFFERS.map(offer => get(offer.guide)),
  ]);
  return {
    status: 'PASS',
    checkedAt: new Date(nowMs).toISOString(),
    paidStore: validatePaidStore(paidStore),
    freeScorecard: validateScorecard(freeScorecard),
    buyerGuides: BUYER_GUIDE_OFFERS.map((offer,index) => validateBuyerGuide(buyerGuideHtml[index],offer)),
    physicalStore: validatePhysicalStore(physicalStore),
    catalog: validateCatalog(catalog, nowMs),
    boundaries: {
      revenueVerified: false,
      supplierStockVerified: false,
      message: 'Health checks prove public-path availability only. They do not prove payment, supplier inventory, TikTok ranking, dispatch, delivery, or profit.',
    },
  };
}

async function main() {
  const report = await runHealth();
  const out = process.env.PRISMBAY_HEALTH_OUTPUT || 'growth-reports/revenue-health-latest.json';
  await fs.mkdir(new URL('../growth-reports/', import.meta.url), { recursive: true }).catch(() => undefined);
  await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '## PrismBay revenue-path health',
      '',
      '- Paid digital storefront: **PASS** (' + report.paidStore.checkoutLinks + ' checkout links present)',
      '- Free assessment: **PASS**',
      '- Original paid-product buyer guides: **PASS** (' + report.buyerGuides.length + ' live, linked and price-matched)',
      '- Physical storefront: **PASS** (' + report.physicalStore.productsVisible + ' products visible)',
      '- Public attention catalog: **PASS** (' + report.catalog.products + ' products, ' + report.catalog.ageHours + 'h old)',
      '',
      '> ' + report.boundaries.message,
      '',
    ];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
}

if (process.argv[1] && new URL('file://' + process.argv[1].replaceAll('\\','/')).href === import.meta.url) {
  main().catch(error => {
    console.error('PRISMBAY_HEALTH_FAIL', error?.message || 'unknown_error');
    process.exitCode = 1;
  });
}
