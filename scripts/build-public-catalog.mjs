import fs from 'node:fs/promises';
import path from 'node:path';
import { validatePublishableCandidate } from './catalog-scale-gate.mjs';
import { getMeilisearchIndexSettings, toMeilisearchDocuments } from './search-index-adapter.mjs';

const DEFAULT_LEGACY = 'config/legacy-live-catalog.json';
const DEFAULT_CONFIG = 'config/catalog-scale-500.json';
const DEFAULT_PROMOTIONS = 'config/retail-promotions.json';

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid_${field}`);
  return value.trim();
}

function normalizePublicProduct(product, source) {
  return {
    sku: assertString(product.sku, 'sku'),
    slug: assertString(product.slug, 'slug'),
    name: assertString(product.name, 'name'),
    category: assertString(product.category, 'category'),
    description: assertString(product.description || '', 'description'),
    priceUsd: Number(product.priceUsd),
    checkoutUrl: assertString(product.checkoutUrl, 'checkoutUrl'),
    imageUrl: assertString(product.imageUrl, 'imageUrl'),
    source,
    productUrl: `/products/${encodeURIComponent(product.slug)}/`
  };
}

function validateLegacy(product) {
  if (product.legacyLive !== true) throw new Error(`legacy_not_explicit:${product.sku || 'unknown'}`);
  if (!(Number(product.priceUsd) > 0)) throw new Error(`legacy_invalid_price:${product.sku || 'unknown'}`);
  if (!String(product.checkoutUrl || '').startsWith('https://buy.stripe.com/')) {
    throw new Error(`legacy_invalid_checkout:${product.sku || 'unknown'}`);
  }
  if (!/^https:\/\//.test(String(product.imageUrl || ''))) throw new Error(`legacy_invalid_image:${product.sku || 'unknown'}`);
  return normalizePublicProduct(product, 'legacy-live-migration');
}

function validateNewCandidate(candidate) {
  const gate = validatePublishableCandidate(candidate);
  if (!gate.ok) return { ok: false, gate };
  if (candidate.status !== 'SALE_READY') return { ok: false, gate: { ...gate, reasons: ['declared_status_not_sale_ready'] } };
  return { ok: true, product: normalizePublicProduct(candidate, 'sale-ready-gate') };
}

function validatePromotion(promotion, product, now = Date.now()) {
  const reasons = [];
  if (!promotion || typeof promotion !== 'object') return { ok: false, reasons: ['promotion_invalid'] };
  const regularPriceUsd = Number(promotion.regularPriceUsd);
  const salePriceUsd = Number(promotion.salePriceUsd);
  const startsAtMs = Date.parse(String(promotion.startsAt || ''));
  const endsAtMs = Date.parse(String(promotion.endsAt || ''));
  if (String(promotion.sku || '') !== product.sku) reasons.push('sku_mismatch');
  if (promotion.authorized !== true) reasons.push('authorization_missing');
  if (promotion.regularPriceVerified !== true) reasons.push('regular_price_unverified');
  if (promotion.marginVerified !== true) reasons.push('margin_unverified');
  if (promotion.checkoutPriceVerified !== true) reasons.push('checkout_price_unverified');
  if (!(regularPriceUsd > salePriceUsd && salePriceUsd > 0)) reasons.push('invalid_sale_prices');
  if (Math.abs(salePriceUsd - Number(product.priceUsd)) > 0.001) reasons.push('sale_price_not_checkout_price');
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || startsAtMs >= endsAtMs) reasons.push('invalid_promotion_window');
  if (Number.isFinite(startsAtMs) && now < startsAtMs) reasons.push('promotion_not_started');
  if (Number.isFinite(endsAtMs) && now >= endsAtMs) reasons.push('promotion_expired');
  if (!Array.isArray(promotion.evidenceRefs) || promotion.evidenceRefs.length < 1) reasons.push('promotion_evidence_missing');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    promotion: {
      campaignId: assertString(promotion.campaignId, 'campaignId'),
      regularPriceUsd,
      salePriceUsd,
      startsAt: new Date(startsAtMs).toISOString(),
      endsAt: new Date(endsAtMs).toISOString(),
      authorized: true,
      regularPriceVerified: true,
      marginVerified: true,
      checkoutPriceVerified: true
    }
  };
}

export function buildCatalog({ legacyProducts = [], candidates = [], categories = [], promotions = [], now = Date.now() } = {}) {
  const publicProducts = legacyProducts.map(validateLegacy);
  const rejected = [];
  for (const candidate of candidates) {
    const result = validateNewCandidate(candidate);
    if (result.ok) publicProducts.push(result.product);
    else rejected.push({ sku: candidate?.sku || null, reasons: result.gate?.reasons || ['not_publishable'] });
  }

  const seenSku = new Set();
  const seenSlug = new Set();
  for (const product of publicProducts) {
    if (seenSku.has(product.sku)) throw new Error(`duplicate_sku:${product.sku}`);
    if (seenSlug.has(product.slug)) throw new Error(`duplicate_slug:${product.slug}`);
    seenSku.add(product.sku);
    seenSlug.add(product.slug);
  }

  const allowedCategories = new Set(categories.map((x) => x.id));
  for (const product of publicProducts) {
    if (allowedCategories.size && !allowedCategories.has(product.category)) {
      throw new Error(`unknown_category:${product.category}:${product.sku}`);
    }
  }

  const promotionRejections = [];
  const promotionBySku = new Map();
  for (const promotion of promotions) {
    const sku = String(promotion?.sku || '');
    const product = publicProducts.find(row => row.sku === sku);
    if (!product) {
      promotionRejections.push({ sku: sku || null, reasons: ['product_not_public'] });
      continue;
    }
    if (promotionBySku.has(sku)) throw new Error(`duplicate_promotion:${sku}`);
    const result = validatePromotion(promotion, product, now);
    if (result.ok) promotionBySku.set(sku, result.promotion);
    else promotionRejections.push({ sku, reasons: result.reasons });
  }
  for (const product of publicProducts) {
    const promotion = promotionBySku.get(product.sku);
    if (promotion) product.promotion = promotion;
  }

  publicProducts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const counts = {};
  for (const product of publicProducts) counts[product.category] = (counts[product.category] || 0) + 1;

  const catalog = {
    generatedAt: new Date(now).toISOString(),
    sourceOfTruth: 'Stripe paid transaction for sales; fail-closed catalog and promotion gates for publishability',
    productCount: publicProducts.length,
    promotionCount: publicProducts.filter(product => product.promotion).length,
    categoryCounts: counts,
    products: publicProducts
  };

  const searchIndex = {
    generatedAt: catalog.generatedAt,
    documents: publicProducts.map(({ sku, slug, name, category, description, priceUsd, imageUrl, productUrl }) => ({
      sku, slug, name, category, description, priceUsd, imageUrl, productUrl,
      searchText: `${name} ${category} ${description}`.toLowerCase()
    }))
  };

  const meilisearchDocuments = {
    generatedAt: catalog.generatedAt,
    source: 'gated-public-catalog',
    documents: toMeilisearchDocuments(publicProducts)
  };
  const meilisearchSettings = getMeilisearchIndexSettings();

  return { catalog, searchIndex, meilisearchDocuments, meilisearchSettings, rejected, promotionRejections };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function main({
  candidatePath = process.argv[2] || 'growth-reports/catalog-sale-ready-candidates.json',
  outDir = process.argv[3] || 'build/catalog',
  legacyPath = DEFAULT_LEGACY,
  configPath = DEFAULT_CONFIG,
  promotionsPath = DEFAULT_PROMOTIONS
} = {}) {
  const [legacyRaw, candidates, config, promotionsRaw] = await Promise.all([
    readJson(legacyPath, { products: [] }),
    readJson(candidatePath, []),
    readJson(configPath, { categories: [] }),
    readJson(promotionsPath, { promotions: [] })
  ]);
  if (!Array.isArray(candidates)) throw new Error('candidate_dataset_must_be_array');
  if (!Array.isArray(promotionsRaw?.promotions)) throw new Error('promotion_dataset_must_be_array');
  const result = buildCatalog({
    legacyProducts: legacyRaw.products || [],
    candidates,
    categories: config.categories || [],
    promotions: promotionsRaw.promotions
  });
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'catalog.json'), JSON.stringify(result.catalog, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'search-index.json'), JSON.stringify(result.searchIndex, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'meilisearch-documents.json'), JSON.stringify(result.meilisearchDocuments, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'meilisearch-settings.json'), JSON.stringify(result.meilisearchSettings, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'rejected.json'), JSON.stringify(result.rejected, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'promotion-rejections.json'), JSON.stringify(result.promotionRejections, null, 2) + '\n')
  ]);
  process.stdout.write(JSON.stringify({
    published: result.catalog.productCount,
    activePromotions: result.catalog.promotionCount,
    rejected: result.rejected.length,
    promotionRejections: result.promotionRejections.length,
    categories: result.catalog.categoryCounts,
    searchDocuments: result.meilisearchDocuments.documents.length
  }, null, 2) + '\n');
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
