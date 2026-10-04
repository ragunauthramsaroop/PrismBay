(() => {
  'use strict';

  const registry = window.PRISMBAY_CATALOG;
  if (!registry || !Array.isArray(registry.products)) return;

  const products = registry.products;
  const live = products.filter((product) => product.status === 'checkout-live');
  const verification = products.filter((product) => product.status === 'verification');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const money = (product) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD'
  }).format(product.price);

  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  function card(product) {
    const isLive = product.status === 'checkout-live';
    const tags = (product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const media = product.image
      ? `<div class="pb-product-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="700" height="700"${product.sku === 'pethair' ? ' referrerpolicy="no-referrer"' : ''}></div>`
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

  apply();
})();
