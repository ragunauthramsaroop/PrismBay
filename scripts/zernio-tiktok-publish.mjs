#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_API_BASE = 'https://zernio.com/api';
const CONFIG_PATH = path.join(ROOT, 'config', 'tiktok-publish.json');
const CATALOG_PATH = path.join(ROOT, 'config', 'legacy-live-catalog.json');
const PROMOTIONS_PATH = path.join(ROOT, 'config', 'retail-promotions.json');
const RECEIPT_PATH = path.join(ROOT, 'build', 'tiktok-publish', 'receipt.json');
const CONFIRMATION = 'PUBLISH_PRISMBAY_TIKTOK';

function fail(message) {
  throw new Error(message);
}

export function hasUnverifiedPromotionClaim(text) {
  return /(?:\b(?:sale|discount|save|saving|deal|markdown|was\s+\$|percent\s+off)\b|\d+\s*%\s*off)/i.test(text);
}

export function isPromotionReady(promo, now = new Date()) {
  if (!promo || typeof promo !== 'object') return false;
  const regular = Number(promo.regularPriceUsd ?? promo.regularPrice);
  const sale = Number(promo.salePriceUsd ?? promo.salePrice);
  if (promo.authorized !== true || promo.checkoutPriceVerified !== true || promo.marginVerified !== true || promo.regularPriceVerified !== true) return false;
  if (!(regular > sale && sale > 0)) return false;
  const start = promo.startsAt ? Date.parse(promo.startsAt) : -Infinity;
  const end = promo.endsAt ? Date.parse(promo.endsAt) : Infinity;
  const t = now.getTime();
  if (!(Number.isFinite(start) || start === -Infinity)) return false;
  if (!(Number.isFinite(end) || end === Infinity)) return false;
  return t >= start && t <= end;
}

export function extractAccountCandidates(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) extractAccountCandidates(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const id = value._id ?? value.id ?? value.accountId;
  const platform = value.platform;
  if (typeof id === 'string' && typeof platform === 'string') out.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') extractAccountCandidates(child, out);
  }
  return out;
}

export function validatePublishRequest(request, config, product) {
  if (!request || typeof request !== 'object') fail('publish_request_must_be_object');
  if (request.schemaVersion !== 1) fail('publish_request_schema_version_invalid');
  if (request.approved !== true) fail('publish_request_not_approved');
  if (request.confirmation !== CONFIRMATION) fail('publish_request_confirmation_invalid');
  if (typeof request.requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(request.requestId)) fail('publish_request_id_invalid');
  if (request.sku !== product.sku) fail('publish_request_sku_mismatch');
  if (request.accountId !== config.account.id) fail('publish_request_account_mismatch');
  if (request.videoUrl !== config.product.videoUrl) fail('publish_request_video_mismatch');
  if (request.expectedPriceUsd !== undefined && Number(request.expectedPriceUsd) !== Number(product.priceUsd)) fail('publish_request_price_mismatch');
  return {
    requestId: request.requestId,
    approved: true,
    sku: request.sku,
    accountId: request.accountId,
    videoUrl: request.videoUrl
  };
}

export function findExistingPublishRequest(value, requestId) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findExistingPublishRequest(item, requestId);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  if (value.metadata?.prismbayPublishRequestId === requestId) return value;
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findExistingPublishRequest(child, requestId);
      if (found) return found;
    }
  }
  return null;
}

export function buildPayload({ config, product, dryRun, publishRequestId = null }) {
  const metadata = {
    source: 'prismbay-github-actions',
    sku: product.sku,
    verifiedPriceUsd: product.priceUsd
  };
  if (publishRequestId) metadata.prismbayPublishRequestId = publishRequestId;
  return {
    title: `${product.name} | PrismBay Clean`,
    content: config.product.caption,
    mediaItems: [
      {
        type: 'video',
        url: config.product.videoUrl,
        mimeType: 'video/mp4'
      }
    ],
    platforms: [
      {
        platform: 'tiktok',
        accountId: config.account.id
      }
    ],
    publishNow: true,
    isDraft: false,
    dryRun,
    tiktokSettings: {
      draft: false,
      privacyLevel: config.tiktok.privacyLevel,
      allowComment: config.tiktok.allowComment,
      allowDuet: config.tiktok.allowDuet,
      allowStitch: config.tiktok.allowStitch,
      commercialContentType: config.tiktok.commercialContentType,
      contentPreviewConfirmed: config.tiktok.contentPreviewConfirmed,
      expressConsentGiven: config.tiktok.expressConsentGiven,
      mediaType: 'VIDEO',
      videoMadeWithAi: config.tiktok.videoMadeWithAi
    },
    metadata
  };
}

export function sanitizeForReceipt(value) {
  if (Array.isArray(value)) return value.map(sanitizeForReceipt);
  if (!value || typeof value !== 'object') return value;
  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    if (/(?:token|secret|authorization|credential|api[_-]?key)/i.test(key)) continue;
    clean[key] = sanitizeForReceipt(child);
  }
  return clean;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function validateStaticConfig(config, catalog, promotions) {
  if (config.provider !== 'zernio') fail('provider_must_be_zernio');
  if (config.account?.platform !== 'tiktok') fail('account_platform_must_be_tiktok');
  if (!/^[a-f0-9]{24}$/i.test(config.account?.id ?? '')) fail('invalid_tiktok_account_id');
  if (config.account?.username !== 'prismbayclean') fail('unexpected_tiktok_username');

  const product = catalog.products?.find((row) => row.sku === config.product?.sku);
  if (!product) fail('catalog_product_not_found');
  if (Number(product.priceUsd) !== Number(config.product.expectedPriceUsd)) fail('catalog_price_mismatch');
  const formattedPrice = `$${Number(product.priceUsd).toFixed(2)}`;
  if (!config.product.caption.includes(formattedPrice)) fail('caption_missing_verified_price');

  const media = new URL(config.product.videoUrl);
  if (media.protocol !== 'https:') fail('media_must_use_https');
  if (config.safety?.requirePrismBayHostedMedia && media.hostname !== 'clean.prismbayai.com') fail('media_not_prismbay_hosted');
  if (!media.pathname.endsWith('.mp4')) fail('media_must_be_mp4');

  const activePromotion = (promotions.promotions ?? []).find((promo) => promo.sku === product.sku && isPromotionReady(promo));
  if (!activePromotion && config.safety?.requireNoUnverifiedPromotionClaim && hasUnverifiedPromotionClaim(config.product.caption)) fail('unverified_promotion_claim');

  if (config.tiktok?.privacyLevel !== 'PUBLIC_TO_EVERYONE') fail('privacy_must_be_public');
  if (config.tiktok?.videoMadeWithAi !== true) fail('ai_disclosure_must_be_enabled');
  if (config.tiktok?.commercialContentType !== 'brand_organic') fail('brand_disclosure_must_be_brand_organic');
  if (config.tiktok?.contentPreviewConfirmed !== true || config.tiktok?.expressConsentGiven !== true) fail('tiktok_consent_flags_required');
  return { product, activePromotion: Boolean(activePromotion) };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 1000) };
    }
  }
  return { response, body };
}

async function verifyPublicVideo(videoUrl) {
  const response = await fetch(videoUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-0', 'User-Agent': 'PrismBay-Zernio-Preflight/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok && response.status !== 206) fail(`video_unreachable_${response.status}`);
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  if (type && !type.includes('video') && !type.includes('octet-stream')) fail(`unexpected_video_content_type_${type}`);
  await response.body?.cancel();
  return { status: response.status, contentType: type || null };
}

async function verifyZernioAccount(apiBase, apiKey, config) {
  const { response, body } = await fetchJson(`${apiBase}/v1/accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) fail(`zernio_accounts_${response.status}`);
  const accounts = extractAccountCandidates(body);
  const account = accounts.find((row) => (row._id ?? row.id ?? row.accountId) === config.account.id);
  if (!account) fail('configured_tiktok_account_not_returned_by_zernio');
  if (String(account.platform).toLowerCase() !== 'tiktok') fail('configured_account_is_not_tiktok');
  const returnedUsername = account.username ?? account.metadata?.profileData?.username;
  if (returnedUsername && String(returnedUsername).toLowerCase() !== config.account.username.toLowerCase()) fail('tiktok_username_identity_mismatch');
  return {
    id: config.account.id,
    platform: 'tiktok',
    username: returnedUsername ?? config.account.username
  };
}

async function checkDuplicateRequest(apiBase, apiKey, publishRequestId) {
  if (!publishRequestId) return null;
  const { response, body } = await fetchJson(`${apiBase}/v1/posts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) fail(`zernio_duplicate_precheck_${response.status}`);
  const existing = findExistingPublishRequest(body, publishRequestId);
  if (!existing) return null;
  const status = String(existing.status ?? '').toLowerCase();
  if (status === 'failed' || status === 'cancelled') return null;
  return sanitizeForReceipt(existing);
}

function requestTraceId(mode, publishRequestId) {
  const seed = `${process.env.GITHUB_RUN_ID ?? 'local'}:${process.env.GITHUB_RUN_ATTEMPT ?? '1'}:${mode}:${publishRequestId ?? 'none'}:${Date.now()}`;
  return `prismbay-${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
}

async function createZernioPost(apiBase, apiKey, payload, mode, publishRequestId) {
  const id = requestTraceId(mode, publishRequestId);
  const { response, body } = await fetchJson(`${apiBase}/v1/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-Id': id
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const safeBody = sanitizeForReceipt(body);
    fail(`zernio_${mode}_${response.status}:${JSON.stringify(safeBody).slice(0, 800)}`);
  }
  return {
    requestId: response.headers.get('x-request-id') ?? id,
    statusCode: response.status,
    body: sanitizeForReceipt(body)
  };
}

function parseArgs(argv) {
  const publish = argv.includes('--publish');
  const requestIndex = argv.indexOf('--request');
  const requestPath = requestIndex >= 0 ? argv[requestIndex + 1] : null;
  if (requestIndex >= 0 && (!requestPath || requestPath.startsWith('--'))) fail('publish_request_path_missing');
  return { publish, requestPath };
}

export async function run({ publish = false, requestPath = null, env = process.env } = {}) {
  const [config, catalog, promotions] = await Promise.all([
    readJson(CONFIG_PATH),
    readJson(CATALOG_PATH),
    readJson(PROMOTIONS_PATH)
  ]);
  const { product, activePromotion } = validateStaticConfig(config, catalog, promotions);

  let request = null;
  let publishRequestId = null;
  if (requestPath) {
    const absoluteRequestPath = path.resolve(ROOT, requestPath);
    const allowedRequestRoot = path.join(ROOT, 'publish-requests', 'tiktok') + path.sep;
    if (!absoluteRequestPath.startsWith(allowedRequestRoot)) fail('publish_request_path_not_allowed');
    request = validatePublishRequest(await readJson(absoluteRequestPath), config, product);
    publishRequestId = request.requestId;
  }
  if (publish && !publishRequestId) publishRequestId = env.PRISMBAY_PUBLISH_REQUEST_ID || `manual-${env.GITHUB_RUN_ID || 'local'}`;

  const apiKey = env.ZERNIO_API_KEY;
  if (!apiKey) fail('missing_ZERNIO_API_KEY');
  const apiBase = (env.ZERNIO_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
  const parsedBase = new URL(apiBase);
  if (parsedBase.protocol !== 'https:' || !['zernio.com', 'api.zernio.com'].includes(parsedBase.hostname)) fail('unapproved_zernio_api_base');

  const video = await verifyPublicVideo(config.product.videoUrl);
  const account = await verifyZernioAccount(apiBase, apiKey, config);
  const dryPayload = buildPayload({ config, product, dryRun: true, publishRequestId });
  const dryRun = await createZernioPost(apiBase, apiKey, dryPayload, 'dry-run', publishRequestId);
  if (dryRun.body?.canPublish === false) fail('tiktok_dry_run_cannot_publish');

  let publishResult = null;
  let duplicatePrevented = false;
  let existingPost = null;
  if (publish) {
    existingPost = await checkDuplicateRequest(apiBase, apiKey, publishRequestId);
    if (existingPost) {
      duplicatePrevented = true;
    } else {
      const publishPayload = buildPayload({ config, product, dryRun: false, publishRequestId });
      publishResult = await createZernioPost(apiBase, apiKey, publishPayload, 'publish', publishRequestId);
    }
  }

  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: publish ? 'publish' : 'dry-run',
    provider: 'zernio',
    publishRequestId,
    duplicatePrevented,
    existingPost,
    account,
    product: {
      sku: product.sku,
      name: product.name,
      verifiedPriceUsd: product.priceUsd,
      checkoutUrl: product.checkoutUrl,
      videoUrl: config.product.videoUrl
    },
    promotionActive: activePromotion,
    videoPreflight: video,
    dryRun,
    publish: publishResult
  };

  await fs.mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await fs.writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    mode: receipt.mode,
    publishRequestId,
    duplicatePrevented,
    account: receipt.account.username,
    sku: product.sku,
    priceUsd: product.priceUsd,
    dryRunStatus: dryRun.statusCode,
    publishStatus: publishResult?.statusCode ?? null,
    receipt: path.relative(ROOT, RECEIPT_PATH)
  }));
  return receipt;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const { publish, requestPath } = parseArgs(process.argv.slice(2));
  run({ publish, requestPath }).catch((error) => {
    console.error(`PrismBay TikTok publish failed: ${error.message}`);
    process.exitCode = 1;
  });
}
