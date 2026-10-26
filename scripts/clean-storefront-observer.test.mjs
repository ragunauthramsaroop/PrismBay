import test from 'node:test';
import assert from 'node:assert/strict';
import { observeStorefront, ORIGIN } from './clean-storefront-observer.mjs';

const home = '<html><head><style>body{color:#173a2f;background:#f6f8f6;font-family:Arial,sans-serif;min-height:100vh;}</style></head><body><div>PrismBay <b>Clean</b></div><a href="/garment-steamer/">Product</a><a href="/shipping.html">Shipping</a></body></html>';
const buyer = '<html><body><h1>Garment Care Device Under Review</h1><p>Research estimate only, not an offer to sell. No physical checkout.</p><p>Steaming function, electrical specifications and fabric suitability have not been independently verified.</p><p>No payment during ZIP check</p><a href="/shipping.html">Request shipping review</a></body></html>';
const policy = '<html><head><link rel="stylesheet" href="/assets/store.css?v=3"></head><h1>Shipping Policy</h1><p>Physical-product checkout remains unavailable until supplier approval before any physical-product payment.</p></html>';

function fetcher(overrides = {}) {
  const pages = {
    [ORIGIN + '/']: { body: home, type: 'text/html' },
    [ORIGIN + '/assets/store.css?v=3']: { body: 'body{color:green}', type: 'text/css' },
    [ORIGIN + '/garment-steamer/']: { body: buyer, type: 'text/html' },
    [ORIGIN + '/shipping.html']: { body: policy, type: 'text/html' },
    ...overrides
  };
  return async url => {
    const page = pages[url];
    if (!page) throw new Error('unexpected fetch: ' + url);
    if (page.throw) throw new Error('network down');
    return new Response(page.body, { status: page.status || 200, headers: { 'content-type': page.type } });
  };
}

test('verifies the current canonical buyer journey and versioned stylesheet', async () => {
  const report = await observeStorefront(fetcher());
  assert.equal(report.healthy, true);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.checks.length, 5);
  assert.equal(report.checks[1].resource, 'homepage_inline_style');
  assert.equal(report.checks[4].url, ORIGIN + '/assets/store.css?v=3');
});

test('fails closed when shipping policy claims supplier stock is checked only after payment', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/shipping.html']: { body: '<h1>Shipping Policy</h1><p>Supplier stock and delivery timing are confirmed after payment.</p>', type: 'text/html' }
  }));
  assert.equal(report.healthy, false);
  assert.equal(report.checks[3].reason, 'physical_policy_not_prepayment_gated');
});

test('rejects direct physical checkout on the gated buyer route', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: buyer + '<a href="https://buy.stripe.com/example">Pay</a>', type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('reports buyer-route outage without losing other observations', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { throw: true }
  }));
  assert.equal(report.healthy, false);
  assert.equal(report.checks[2].status, null);
  assert.equal(report.checks.length, 5);
});

test('HTML fallback cannot masquerade as CSS', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/assets/store.css?v=3']: { body: home, type: 'text/html' }
  }));
  assert.equal(report.checks[4].ok, false);
});

test('foreign stylesheet URLs are never fetched', async () => {
  const seen = [];
  const foreignPolicy = policy.replace('/assets/store.css?v=3', 'https://untrusted.invalid/assets/store.css?v=3');
  const inner = fetcher({ [ORIGIN + '/shipping.html']: { body: foreignPolicy, type: 'text/html' } });
  const report = await observeStorefront(async url => { seen.push(url); return inner(url); });
  assert.equal(report.healthy, false);
  assert.equal(report.checks[4].reason, 'missing_same_origin_reference');
  assert.ok(seen.every(url => url.startsWith(ORIGIN + '/')));
  assert.equal(seen.length, 3);
});

test('homepage outage does not fabricate healthy storefront', async () => {
  const report = await observeStorefront(async () => { throw new Error('timeout'); });
  assert.equal(report.healthy, false);
  assert.ok(report.checks.every(check => !check.ok));
});

test('fails closed when canonical homepage embeds unlicensed supplier imagery', async () => {
  const supplierHome = home.replace('</body>', '<img src="https://oss-cf.cjdropshipping.com/product/example.jpg" alt="supplier"></body>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/']: { body: supplierHome, type: 'text/html' }
  }));
  assert.equal(report.healthy, false);
  assert.equal(report.checks[0].reason, 'supplier_media_rights_unverified');
  assert.equal(report.checks[2].ok, true);
});

test('fails closed on supplier Open Graph image without blocking unrelated links', async () => {
  const supplierBuyer = buyer.replace('</html>', '<meta property="og:image" content="https://oss-cf.cjdropshipping.com/media/example.jpg"></html>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: supplierBuyer, type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
  assert.equal(report.checks[2].reason, 'supplier_media_rights_unverified');
  const harmless = buyer.replace('</html>', '<a href="https://www.cjdropshipping.com/">Supplier</a></html>');
  const noMedia = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: harmless, type: 'text/html' }
  }));
  assert.equal(noMedia.healthy, true);
});

const researchBuyer = buyer;

test('accepts the truthful research-stage buyer title only with visible non-offer disclosures', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: researchBuyer, type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, true);
  assert.equal(report.healthy, true);
});

test('fails closed when a research-stage buyer page omits the functionality disclosure', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: researchBuyer.replace(/<p>Steaming function[^<]*<\/p>/i, ''), type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('fails closed when a research-stage buyer page implies a sellable offer', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: researchBuyer.replace('Research estimate only, not an offer to sell.', 'Available for immediate purchase.'), type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('research-stage title never permits direct Stripe checkout', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: researchBuyer + '<a href="https://checkout.stripe.com/test">Pay now</a>', type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('research disclaimers in metadata alone never count as visible buyer disclosures', async () => {
  const noVisibleDisclosures = researchBuyer
    .replace(/<p>Research estimate only[^<]*<\/p>/i, '')
    .replace(/<p>Steaming function[^<]*<\/p>/i, '')
    .replace('<body>', '<head><meta name="description" content="Research estimate only, not an offer to sell. Steaming function, electrical specifications and fabric suitability have not been independently verified."></head><body>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: noVisibleDisclosures, type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
});

test('legacy unverified garment-steamer title is not accepted despite research disclosures', async () => {
  const legacy = buyer.replace('Garment Care Device Under Review', 'Portable Garment Steamer');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: legacy, type: 'text/html' }
  }));
  assert.equal(report.checks[2].ok, false);
  assert.equal(report.checks[2].reason, 'unverified_product_title');
});

test('unverified Product and Offer structured data fail closed on research route', async () => {
  for (const type of ['Product', 'Offer', 'AggregateOffer']) {
    const withSaleSchema = buyer.replace('</body>', '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"' + type + '"}]}</script></body>');
    const report = await observeStorefront(fetcher({
      [ORIGIN + '/garment-steamer/']: { body: withSaleSchema, type: 'text/html' }
    }));
    assert.equal(report.checks[2].ok, false);
    assert.equal(report.checks[2].reason, 'unverified_sale_schema');
  }
});

test('homepage Product schema blocks retail trust readiness', async () => {
  const withSaleSchema = home.replace('</body>', '<script type="application/ld+json">{"@type":"Product"}</script></body>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/']: { body: withSaleSchema, type: 'text/html' }
  }));
  assert.equal(report.checks[0].ok, false);
  assert.equal(report.checks[0].reason, 'unverified_sale_schema');
});

test('malformed JSON-LD fails closed, neutral WebPage schema remains acceptable', async () => {
  const malformed = buyer.replace('</body>', '<script type="application/ld+json">{bad</script></body>');
  const bad = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: malformed, type: 'text/html' }
  }));
  assert.equal(bad.checks[2].ok, false);
  const neutral = buyer.replace('</body>', '<script type="application/ld+json">{"@type":"WebPage"}</script></body>');
  const good = await observeStorefront(fetcher({
    [ORIGIN + '/garment-steamer/']: { body: neutral, type: 'text/html' }
  }));
  assert.equal(good.checks[2].ok, true);
});


test('responsive and lazy-loaded supplier images block storefront readiness', async () => {
  for (const fragment of [
    '<img srcset="https://oss-cf.cjdropshipping.com/sku.jpg 2x, /safe.jpg 1x">',
    '<img data-src="https://oss-cf.cjdropshipping.com/sku.jpg">',
    '<picture><source data-srcset="https://oss-cf.cjdropshipping.com/sku.jpg 800w"></picture>',
    '<link rel="preload" as="image" href="https://oss-cf.cjdropshipping.com/sku.jpg">'
  ]) {
    const report = await observeStorefront(fetcher({
      [ORIGIN + '/']: { body: home.replace('</body>', fragment + '</body>'), type: 'text/html' }
    }));
    assert.equal(report.checks[0].reason, 'supplier_media_rights_unverified', fragment);
  }
});

test('supplier imagery in CSS backgrounds and style attributes blocks readiness', async () => {
  for (const fragment of [
    '<style>.hero{background-image:url("https://oss-cf.cjdropshipping.com/sku.jpg")}</style>',
    '<div style="background:url(https://oss-cf.cjdropshipping.com/sku.jpg)"></div>'
  ]) {
    const report = await observeStorefront(fetcher({
      [ORIGIN + '/']: { body: home.replace('</body>', fragment + '</body>'), type: 'text/html' }
    }));
    assert.equal(report.checks[0].reason, 'supplier_media_rights_unverified', fragment);
  }
});

test('supplier image references in neutral JSON-LD block readiness', async () => {
  const withImage = home.replace('</body>',
    '<script type="application/ld+json">{"@type":"WebPage","image":"https://oss-cf.cjdropshipping.com/sku.jpg"}</script></body>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/']: { body: withImage, type: 'text/html' }
  }));
  assert.equal(report.checks[0].reason, 'supplier_media_rights_unverified');
});

test('supplier imagery in the fetched policy stylesheet blocks readiness', async () => {
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/assets/store.css?v=3']: {
      body: '.hero{background-image:url(https://oss-cf.cjdropshipping.com/sku.jpg)}', type: 'text/css'
    }
  }));
  assert.equal(report.checks[4].ok, false);
  assert.equal(report.checks[4].reason, 'supplier_media_rights_unverified');
});

test('ordinary supplier links and rights-safe styles do not create false media alarms', async () => {
  const harmless = home.replace('</body>',
    '<a href="https://www.cjdropshipping.com/">Supplier site</a><div style="background:url(/assets/original.svg)"></div></body>');
  const report = await observeStorefront(fetcher({
    [ORIGIN + '/']: { body: harmless, type: 'text/html' }
  }));
  assert.equal(report.healthy, true);
});
