// Original PrismBay adapter inspired by Meilisearch Community Edition concepts.
// Upstream: https://github.com/meilisearch/meilisearch
// License boundary: MIT Community Edition concepts only. No EE/BUSL code is copied.

function text(value) {
  return String(value ?? '').trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toMeilisearchDocuments(products = []) {
  if (!Array.isArray(products)) throw new Error('products_must_be_array');
  return products.map((product) => {
    const sku = text(product.sku);
    if (!sku) throw new Error('search_document_missing_sku');
    if (Object.prototype.hasOwnProperty.call(product, 'checkoutUrl')) {
      // Checkout is deliberately omitted from the public search surface.
    }
    const priceUsd = number(product.priceUsd);
    if (!(priceUsd > 0)) throw new Error(`search_document_invalid_price:${sku}`);
    return {
      id: sku,
      sku,
      slug: text(product.slug),
      name: text(product.name),
      category: text(product.category),
      description: text(product.description),
      priceUsd,
      imageUrl: text(product.imageUrl),
      productUrl: text(product.productUrl),
      source: text(product.source),
      searchText: `${text(product.name)} ${text(product.category)} ${text(product.description)} ${sku}`.toLowerCase()
    };
  });
}

export function getMeilisearchIndexSettings() {
  return {
    provenance: {
      upstream: 'https://github.com/meilisearch/meilisearch',
      edition: 'Community Edition',
      license: 'MIT',
      adaptation: 'PrismBay original adapter using public CE search concepts; no upstream source copied',
      enterpriseFeaturesUsed: false
    },
    primaryKey: 'id',
    searchableAttributes: ['name', 'description', 'category', 'sku', 'slug'],
    filterableAttributes: ['category', 'priceUsd', 'source'],
    sortableAttributes: ['priceUsd', 'name'],
    displayedAttributes: ['id', 'sku', 'slug', 'name', 'category', 'description', 'priceUsd', 'imageUrl', 'productUrl', 'source']
  };
}

function normalizeQuery(value) {
  return text(value).toLowerCase().replace(/\s+/g, ' ');
}

function compareString(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'en', { sensitivity: 'base' });
}

export function searchOffline(documents = [], options = {}) {
  if (!Array.isArray(documents)) throw new Error('documents_must_be_array');
  const query = normalizeQuery(options.query);
  const filters = options.filters && typeof options.filters === 'object' ? options.filters : {};
  const minPrice = number(filters.minPriceUsd);
  const maxPrice = number(filters.maxPriceUsd);
  const category = text(filters.category);
  const source = text(filters.source);

  let rows = documents.filter((doc) => {
    if (category && doc.category !== category) return false;
    if (source && doc.source !== source) return false;
    if (minPrice !== null && Number(doc.priceUsd) < minPrice) return false;
    if (maxPrice !== null && Number(doc.priceUsd) > maxPrice) return false;
    if (!query) return true;
    const haystack = normalizeQuery(doc.searchText || `${doc.name} ${doc.category} ${doc.description} ${doc.sku}`);
    return query.split(' ').every((term) => haystack.includes(term));
  });

  const [sortField, sortDirection = 'asc'] = text(options.sort || '').split(':');
  if (sortField === 'priceUsd') {
    rows = [...rows].sort((a, b) => Number(a.priceUsd) - Number(b.priceUsd));
  } else if (sortField === 'name') {
    rows = [...rows].sort((a, b) => compareString(a.name, b.name));
  } else if (query) {
    rows = [...rows].sort((a, b) => {
      const aq = normalizeQuery(a.name).startsWith(query) ? 0 : 1;
      const bq = normalizeQuery(b.name).startsWith(query) ? 0 : 1;
      return aq - bq || compareString(a.name, b.name);
    });
  }
  if (sortDirection === 'desc' && ['priceUsd', 'name'].includes(sortField)) rows.reverse();

  return rows;
}
