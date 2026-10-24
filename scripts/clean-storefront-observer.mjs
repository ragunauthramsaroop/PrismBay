import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://clean.prismbayai.com';
const BUYER_PATH = '/garment-steamer/';
const POLICY_PATH = '/shipping.html';
const STYLE_PATH = '/assets/store.css';

// Read only the public canonical storefront. Never execute fetched scripts or follow redirects.
async function probe(url, fetcher) {
  try {
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    return { ok: response.ok, status: response.status, type: response.headers.get('content-type') || '', text };
  } catch {
    return { ok: false, status: null, type: '', text: '' };
  }
}

function sameOriginReference(html, path) {
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
  for (const ref of refs) {
    try {
      const url = new URL(ref, ORIGIN);
      if (url.origin === ORIGIN && url.pathname === path && !url.username && !url.password) return url.href;
    } catch {
      // Malformed and foreign references do not authorize a fetch.
    }
  }
  return null;
}

const isHtml = response => response.ok && /text\/html/i.test(response.type);

// Commercial rights for third-party supplier media are not yet documented.
// Check actual media-bearing HTML attributes, not incidental text or hyperlinks.
function hasUnverifiedSupplierMedia(html) {
  const tags = html.match(/<(?:img|source|video|meta)\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const refs = [...tag.matchAll(/\b(?:src|poster|content)\s*=\s*["']([^"']+)["']/gi)];
    return refs.some(([, ref]) => {
      try {
        const url = new URL(ref, ORIGIN);
        return /(?:^|\.)cjdropshipping\.com$/i.test(url.hostname);
      } catch {
        return false;
      }
    });
  });
}

export async function observeStorefront(fetcher = fetch) {
  const checks = [];
  const home = await probe(ORIGIN + '/', fetcher);
  const homeSupplierMedia = isHtml(home) && hasUnverifiedSupplierMedia(home.text);
  checks.push({
    resource: '/',
    ok: isHtml(home) && /PrismBay\s*(?:<[^>]+>\s*)?Clean/i.test(home.text) &&
      home.text.includes(BUYER_PATH) && home.text.includes(POLICY_PATH) && !homeSupplierMedia,
    status: home.status,
    reason: homeSupplierMedia ? 'supplier_media_rights_unverified' : undefined
  });

  const inlineStyle = home.text.match(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/i);
  checks.push({
    resource: 'homepage_inline_style',
    ok: isHtml(home) && Boolean(inlineStyle && inlineStyle[1].trim().length > 50),
    status: home.status
  });

  const buyer = await probe(ORIGIN + BUYER_PATH, fetcher);
  const buyerSupplierMedia = isHtml(buyer) && hasUnverifiedSupplierMedia(buyer.text);
  // The reviewed research-stage page uses a truthful title rather than an
  // unverified product identity. Accept it only with visible, explicit
  // non-offer and unverified-functionality disclosures.
  const verifiedTitle = /<h1[^>]*>\s*Portable Garment Steamer\s*<\/h1>/i.test(buyer.text);
  const researchTitle = /<h1[^>]*>\s*Garment Care Device Under Review\s*<\/h1>/i.test(buyer.text);
  const researchDisclosures = /Research estimate only, not an offer to sell/i.test(buyer.text) &&
    /Steaming function[^<]{0,200}have not been independently verified/i.test(buyer.text);
  checks.push({
    resource: BUYER_PATH,
    ok: isHtml(buyer) && (verifiedTitle || (researchTitle && researchDisclosures)) &&
      /Request shipping review/i.test(buyer.text) &&
      /No payment during ZIP check/i.test(buyer.text) &&
      !/https:\/\/(?:buy|checkout)\.stripe\.com\//i.test(buyer.text) && !buyerSupplierMedia,
    status: buyer.status,
    reason: buyerSupplierMedia ? 'supplier_media_rights_unverified' : undefined
  });

  const policy = await probe(ORIGIN + POLICY_PATH, fetcher);
  checks.push({
    resource: POLICY_PATH,
    ok: isHtml(policy) && /Shipping Policy/i.test(policy.text) &&
      /Physical-product checkout remains unavailable/i.test(policy.text) &&
      /before any physical-product payment/i.test(policy.text) &&
      !/Supplier stock and delivery timing are confirmed after payment/i.test(policy.text),
    status: policy.status,
    reason: isHtml(policy) && !/Physical-product checkout remains unavailable/i.test(policy.text)
      ? 'physical_policy_not_prepayment_gated' : undefined
  });

  const stylesheet = sameOriginReference(policy.text, STYLE_PATH);
  if (!stylesheet) {
    checks.push({ resource: STYLE_PATH, ok: false, status: null, reason: 'missing_same_origin_reference' });
  } else {
    const style = await probe(stylesheet, fetcher);
    checks.push({
      resource: STYLE_PATH,
      ok: style.ok && /text\/css/i.test(style.type) && style.text.trim().length > 0,
      status: style.status,
      url: stylesheet
    });
  }

  return {
    schemaVersion: 2,
    checkedAt: new Date().toISOString(),
    origin: ORIGIN,
    healthy: checks.every(check => check.ok),
    checks,
    scope: 'Canonical homepage, known unlicensed supplier-media references in HTML, inline styles, steamer inquiry, physical shipping-policy consistency and same-origin policy stylesheet only. Other media rights, browser rendering, TLS trust, remote inquiry handling, checkout, supplier fulfillment, worker execution and sales are not verified.'
  };
}

export async function main() {
  const report = await observeStorefront();
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/clean-storefront-observation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  // Failed checks create repair tasks without stopping independent allocation.
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
