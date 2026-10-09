(() => {
  'use strict';

  const PUBLIC_CATALOG_FEED = 'https://raw.githubusercontent.com/ragunauthramsaroop/PrismBay/catalog-live-data/published-catalog.json';
  const ALLOWED_PREFLIGHT_ORIGIN = 'https://clean.prismbayai.com';
  const CATEGORY_LABELS = Object.freeze({
    'laundry-garment-care': 'Fabric care'
  });

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const categoryLabel = (value) => CATEGORY_LABELS[value] || String(value || 'Catalog').replaceAll('-', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  const safeHttps = (value) => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  };
  const safePreflight = (value) => {
    try {
      const url = new URL(String(value || ''));
      if (url.origin !== ALLOWED_PREFLIGHT_ORIGIN) return null;
      if (url.pathname !== '/garment-steamer/' && url.pathname !== '/garment-steamer') return null;
      return `${ALLOWED_PREFLIGHT_ORIGIN}/garment-steamer/`;
    } catch {
      return null;
    }
  };

  function validateProduct(product) {
    const name = String(product?.name || '').trim();
    const sku = String(product?.sku || '').trim();
    const description = String(product?.description || '').trim();
    const price = Number(product?.priceUsd);
    const preflight = safePreflight(product?.checkoutUrl);
    const image = safeHttps(product?.imageUrl);
    if (!name || !sku || !description || !(price > 0) || !preflight) return null;
    return Object.freeze({
      sku,
      name,
      category: categoryLabel(product.category),
      price,
      currency: 'USD',
      image,
      preflight,
      summary: description,
      tags: ['Live stock check', 'ZIP shipping check', 'Stripe after approval']
    });
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${PUBLIC_CATALOG_FEED}?v=${Math.floor(Date.now() / 60000)}`, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('catalog_unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload?.products)) throw new Error('catalog_invalid');
      return payload.products.map(validateProduct).filter(Boolean);
    } catch {
      return [];
    }
  }

  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  function card(product) {
    const tags = product.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const media = product.image
      ? `<div class="pb-product-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" width="1000" height="1000"></div>`
      : `<div class="pb-product-media pb-product-placeholder" role="img" aria-label="Product image unavailable"><span>PB</span><small>Product image pending</small></div>`;
    return `<article class="pb-product-card" data-sku="${escapeHtml(product.sku)}" data-category="${escapeHtml(product.category)}" data-search="${escapeHtml([product.name, product.category, product.summary, ...product.tags].join(' ').toLowerCase())}">
      <div class="pb-card-top"><span class="pb-status is-live">Live preflight</span><span class="pb-category">${escapeHtml(product.category)}</span></div>
      ${media}
      <div class="pb-product-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="pb-tags">${tags}</div>
        <div class="pb-price-row"><div><strong>${escapeHtml(money(product.price))}</strong><span>USD · one-time purchase</span></div><span class="pb-live-dot">ZIP check first</span></div>
        <a class="pb-buy" href="${escapeHtml(product.preflight)}">Check live availability <span aria-hidden="true">→</span></a>
        <small class="pb-checkout-note">Current supplier stock, destination shipping and order economics are checked before Stripe payment opens.</small>
      </div>
    </article>`;
  }

  async function start() {
    const products = await loadProducts();
    const grid = document.getElementById('catalogGrid');
    const search = document.getElementById('catalogSearch');
    const filterWrap = document.getElementById('catalogFilters');
    const resultCount = document.getElementById('catalogResultCount');
    const noResults = document.getElementById('catalogNoResults');
    const totalMetric = document.querySelector('[data-metric="catalog-total"]');
    const mobileCount = document.getElementById('mobileCatalogCount');

    if (totalMetric) totalMetric.textContent = String(products.length);
    if (mobileCount) mobileCount.textContent = products.length ? `Browse ${products.length} live-checked product${products.length === 1 ? '' : 's'}` : 'No product currently cleared for checkout';
    if (!grid || !search || !filterWrap) return;

    const render = () => {
      grid.innerHTML = products.map(card).join('');
      if (!products.length) {
        grid.innerHTML = '<div class="pb-no-results"><strong>Live checkout is temporarily unavailable.</strong><br>PrismBay Clean is waiting for verified supplier and shipping evidence before accepting payment.</div>';
      }
    };
    render();

    const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
    const filters = [['all', 'All products'], ...categories.map((category) => [`category:${category}`, category])];
    filterWrap.innerHTML = filters.map(([value, label], index) => `<button type="button" class="pb-filter${index === 0 ? ' active' : ''}" data-filter="${escapeHtml(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${escapeHtml(label)}</button>`).join('');

    let activeFilter = 'all';
    function apply() {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const node of grid.querySelectorAll('.pb-product-card')) {
        const matchesQuery = !query || node.dataset.search.includes(query);
        const matchesFilter = activeFilter === 'all' || (activeFilter.startsWith('category:') && node.dataset.category === activeFilter.slice(9));
        const show = matchesQuery && matchesFilter;
        node.hidden = !show;
        if (show) visible += 1;
      }
      if (resultCount) resultCount.textContent = `${visible} of ${products.length} product${products.length === 1 ? '' : 's'} cleared for live preflight`;
      if (noResults) noResults.hidden = visible !== 0 || products.length === 0;
    }

    search.addEventListener('input', apply);
    filterWrap.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      activeFilter = button.dataset.filter;
      for (const candidate of filterWrap.querySelectorAll('[data-filter]')) {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', String(active));
      }
      apply();
    });
    apply();
  }

  const menuButton = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      mobileMenu.classList.toggle('open', !open);
    });
    mobileMenu.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      menuButton.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('open');
    });
  }

  start();
})();
