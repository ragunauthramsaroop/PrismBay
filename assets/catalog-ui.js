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
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.toString() : null; }
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
    if (!name || !sku || !description || !(price > 0) || !checkout || !image) return null;
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
      tags: product.source === 'sale-ready-gate'
        ? ['SALE_READY', 'Commercial gates passed']
        : ['Live checkout', 'Existing catalog item'],
      source: String(product.source || 'published-catalog')
    });
  }

  async function loadProducts() {
    const products = fallbackRegistry.products.map((product) => ({ ...product, tags: [...(product.tags || [])] }));
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
      for (const row of remote.products) {
        const published = validatePublishedProduct(row);
        if (!published) continue;
        const key = normalizeName(published.name);
        const existingIndex = products.findIndex((candidate) => normalizeName(candidate.name) === key);
        if (existingIndex >= 0) products[existingIndex] = { ...products[existingIndex], ...published };
        else products.push({ ...published });
      }
    } catch {
      // The embedded registry is a complete fail-safe. A feed outage must never invent
      // availability or remove the known checkout routes from the storefront.
    }
    return products;
  }

  const money = (product) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD'
  }).format(product.price);

  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  function card(product) {
    const isLive = product.status === 'checkout-live';
    const tags = (product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const media = product.image
      ? `<div class="pb-product-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="700" height="700"${normalizeName(product.name) === 'reusable-pet-hair-remover' ? ' referrerpolicy="no-referrer"' : ''}></div>`
      : `<div class="pb-product-media pb-product-placeholder" aria-hidden="true"><span>${escapeHtml(initials(product.name))}</span><small>Media verification pending</small></div>`;
    const purchase = isLive
      ? `<div class="pb-price-row"><div><strong>${escapeHtml(money(product))}</strong><span>USD · one-time purchase</span></div><span class="pb-live-dot">Checkout live</span></div><a class="pb-buy" href="${escapeHtml(product.checkout)}" rel="noopener">Checkout with Stripe <span aria-hidden="true">→</span></a><small class="pb-checkout-note">Opens Stripe-hosted checkout. Availability is not implied by this status.</small>`
      : `<div class="pb-verification-box"><strong>Commercial verification in progress</strong><span>Checkout remains withheld until supplier, stock, destination freight, economics, listing-rights and checkout checks pass.</span></div><a class="pb-secondary-action" href="/contact.html">Ask support about this item</a>`;

    return `<article class="pb-product-card" data-sku="${escapeHtml(product.sku)}" data-status="${escapeHtml(product.status)}" data-category="${escapeHtml(product.category)}" data-search="${escapeHtml([product.name, product.category, product.summary, ...(product.tags || [])].join(' ').toLowerCase())}">
      <div class="pb-card-top"><span class="pb-status ${isLive ? 'is-live' : 'is-verification'}">${isLive ? 'Available checkout' : 'Verification queue'}</span><span class="pb-category">${escapeHtml(product.category)}</span></div>
      ${media}
      <div class="pb-product-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="pb-tags">${tags}</div>
        ${purchase}
      </div>
    </article>`;
  }

  async function start() {
    const products = await loadProducts();
    const live = products.filter((product) => product.status === 'checkout-live');
    const verification = products.filter((product) => product.status === 'verification');

    const grid = document.getElementById('catalogGrid');
    const search = document.getElementById('catalogSearch');
    const filterWrap = document.getElementById('catalogFilters');
    const resultCount = document.getElementById('catalogResultCount');
    const noResults = document.getElementById('catalogNoResults');

    const totalMetric = document.querySelector('[data-metric="catalog-total"]');
    const liveMetric = document.querySelector('[data-metric="checkout-live"]');
    const verifyMetric = document.querySelector('[data-metric="verification"]');
    if (totalMetric) totalMetric.textContent = String(products.length);
    if (liveMetric) liveMetric.textContent = String(live.length);
    if (verifyMetric) verifyMetric.textContent = String(verification.length);

    if (!grid || !search || !filterWrap) return;

    grid.innerHTML = products.map(card).join('');

    const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
    const filters = [
      ['all', 'All catalog'],
      ['checkout-live', 'Checkout live'],
      ['verification', 'Verification queue'],
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
          || node.dataset.status === activeFilter
          || (activeFilter.startsWith('category:') && node.dataset.category === activeFilter.slice(9));
        const show = matchesQuery && matchesFilter;
        node.hidden = !show;
        if (show) visible += 1;
      }
      if (resultCount) resultCount.textContent = `${visible} of ${products.length} catalog items`;
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
