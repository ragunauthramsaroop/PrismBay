(() => {
  'use strict';

  const fallbackRegistry = window.PRISMBAY_CATALOG;
  if (!fallbackRegistry || !Array.isArray(fallbackRegistry.products)) return;

  const PUBLIC_CATALOG_FEED = 'https://raw.githubusercontent.com/ragunauthramsaroop/PrismBay/catalog-live-data/published-catalog.json';
  const CATEGORY_LABELS = Object.freeze({
    'cleaning-tools': 'Cleaning tools',
    'bathroom-accessories': 'Bathroom cleaning',
    'kitchen-cleaning-organization': 'Kitchen & bath',
    'laundry-garment-care': 'Fabric care',
    'home-storage-organization': 'Organization',
    'closet-shoe-organization': 'Closet organization',
    'pet-home-cleanup': 'Pet home',
    'auto-cleaning-organization': 'Auto care',
    'travel-organization': 'Travel organization',
    'desk-cable-organization': 'Desk organization',
    'reusable-household-utility': 'Household utility',
    'small-home-convenience': 'Home convenience'
  });

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const categoryLabel = (value) => CATEGORY_LABELS[value] || String(value || 'Catalog').replaceAll('-', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  const safeHttps = (value) => {
    if (!value) return null;
    try { const url = new URL(String(value)); return url.protocol === 'https:' ? url.toString() : null; }
    catch { return null; }
  };
  const safeCheckout = (value) => {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' ? url.toString() : null; }
    catch { return null; }
  };

  function validatePublishedProduct(product) {
    const name = String(product?.name || '').trim();
    const sku = String(product?.sku || '').trim();
    const description = String(product?.description || '').trim();
    const price = Number(product?.priceUsd);
    const checkout = safeCheckout(product?.checkoutUrl);
    const image = safeHttps(product?.imageUrl);
    if (!name || !sku || !description || !(price > 0) || !checkout) return null;
    return Object.freeze({
      sku,
      name,
      category: categoryLabel(product.category),
      status: 'checkout-live',
      price,
      currency: 'USD',
      image,
      checkout,
      summary: description,
      tags: ['Ready to order', 'Stripe checkout'],
      source: String(product.source || 'published-catalog')
    });
  }

  function validateFallbackProduct(product) {
    if (product?.status !== 'checkout-live') return null;
    const price = Number(product?.price);
    const checkout = safeCheckout(product?.checkout);
    const image = safeHttps(product?.image);
    if (!product?.name || !product?.sku || !(price > 0) || !checkout) return null;
    return Object.freeze({
      ...product,
      status: 'checkout-live',
      price,
      image,
      checkout,
      tags: [...(product.tags || [])]
    });
  }

  async function loadProducts() {
    const fallbackProducts = fallbackRegistry.products.map(validateFallbackProduct).filter(Boolean);
    try {
      const refreshWindow = Math.floor(Date.now() / 300000);
      const response = await fetch(`${PUBLIC_CATALOG_FEED}?v=${refreshWindow}`, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('catalog_feed_unavailable');
      const remote = await response.json();
      if (!remote || !Array.isArray(remote.products)) throw new Error('catalog_feed_invalid');
      const published = remote.products.map(validatePublishedProduct).filter(Boolean);
      if (published.length) return published;
    } catch {
      // Fail safely to the known checkout-ready fallback catalog.
    }
    return fallbackProducts;
  }

  const money = (product) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD'
  }).format(product.price);

  function card(product) {
    const tags = (product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const media = product.image
      ? `<div class="pb-product-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="700" height="700"${normalizeName(product.name) === 'reusable-pet-hair-remover' ? ' referrerpolicy="no-referrer"' : ''}></div>`
      : '';
    return `<article class="pb-product-card" data-sku="${escapeHtml(product.sku)}" data-status="checkout-live" data-category="${escapeHtml(product.category)}" data-search="${escapeHtml([product.name, product.category, product.summary, ...(product.tags || [])].join(' ').toLowerCase())}">
      <div class="pb-card-top"><span class="pb-status is-live">Ready to order</span><span class="pb-category">${escapeHtml(product.category)}</span></div>
      ${media}
      <div class="pb-product-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="pb-tags">${tags}</div>
        <div class="pb-price-row"><div><strong>${escapeHtml(money(product))}</strong><span>USD · one-time purchase</span></div><span class="pb-live-dot">Checkout ready</span></div>
        <a class="pb-buy" href="${escapeHtml(product.checkout)}" rel="noopener">Checkout with Stripe <span aria-hidden="true">→</span></a>
        <small class="pb-checkout-note">Secure payment opens on Stripe. Supplier stock and delivery timing are confirmed during order processing; if fulfillment is unavailable, the order is refunded under the published policy.</small>
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
    if (mobileCount) mobileCount.textContent = `Browse ${products.length} products ready to order`;
    if (!grid || !search || !filterWrap) return;

    grid.innerHTML = products.map(card).join('');

    const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
    const filters = [
      ['all', 'All products'],
      ...categories.map((category) => [`category:${category}`, category])
    ];

    filterWrap.innerHTML = filters.map(([value, label], index) => `<button type="button" class="pb-filter${index === 0 ? ' active' : ''}" data-filter="${escapeHtml(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${escapeHtml(label)}</button>`).join('');

    let activeFilter = 'all';

    function apply() {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const node of grid.querySelectorAll('.pb-product-card')) {
        const matchesQuery = !query || node.dataset.search.includes(query);
        const matchesFilter = activeFilter === 'all'
          || (activeFilter.startsWith('category:') && node.dataset.category === activeFilter.slice(9));
        const show = matchesQuery && matchesFilter;
        node.hidden = !show;
        if (show) visible += 1;
      }
      if (resultCount) resultCount.textContent = `${visible} of ${products.length} products ready to order`;
      if (noResults) noResults.hidden = visible !== 0;
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
