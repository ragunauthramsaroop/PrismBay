import fs from 'node:fs/promises';
import path from 'node:path';
import { validatePublishableCandidate } from './catalog-scale-gate.mjs';

const DEFAULT_LEGACY = 'config/legacy-live-catalog.json';
const DEFAULT_CONFIG = 'config/catalog-scale-500.json';

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

export function buildCatalog({ legacyProducts = [], candidates = [], categories = [] } = {}) {
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

  publicProducts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const counts = {};
  for (const product of publicProducts) counts[product.category] = (counts[product.category] || 0) + 1;

  const catalog = {
    generatedAt: new Date().toISOString(),
    sourceOfTruth: 'Stripe paid transaction for sales; fail-closed catalog gate for publishability',
    productCount: publicProducts.length,
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

  return { catalog, searchIndex, rejected };
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
  configPath = DEFAULT_CONFIG
} = {}) {
  const [legacyRaw, candidates, config] = await Promise.all([
    readJson(legacyPath, { products: [] }),
    readJson(candidatePath, []),
    readJson(configPath, { categories: [] })
  ]);
  if (!Array.isArray(candidates)) throw new Error('candidate_dataset_must_be_array');
  const result = buildCatalog({ legacyProducts: legacyRaw.products || [], candidates, categories: config.categories || [] });
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'catalog.json'), JSON.stringify(result.catalog, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'search-index.json'), JSON.stringify(result.searchIndex, null, 2) + '\n'),
    fs.writeFile(path.join(outDir, 'rejected.json'), JSON.stringify(result.rejected, null, 2) + '\n')
  ]);
  process.stdout.write(JSON.stringify({
    published: result.catalog.productCount,
    rejected: result.rejected.length,
    categories: result.catalog.categoryCounts
  }, null, 2) + '\n');
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
