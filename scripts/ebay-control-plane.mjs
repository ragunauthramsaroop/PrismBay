import fs from 'node:fs/promises';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const manifestPath = 'marketplaces/ebay/garment-steamer.json';
const outDir = 'growth-reports/ebay';

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let payload = {};
  try { payload = JSON.parse(text); } catch { throw new Error(`non_json_${response.status}`); }
  if (!response.ok || payload?.result === false || payload?.success === false) {
    throw new Error(`cj_${response.status}_${payload?.code ?? 'unknown'}_${payload?.message ?? 'error'}`);
  }
  return payload;
}

function clean(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function boolAuthorizedStatus(status) {
  return Number(status) === 1;
}

function candidateWarehouseIds(row = {}) {
  return [...new Set([
    row.storageId,
    row.warehouseId,
    row.storehouseId,
    row.storage,
    row.warehouse,
  ].map(v => clean(v, 100)).filter(Boolean))];
}

function sanitizeShop(shop) {
  return {
    id: clean(shop?.id, 80),
    name: clean(shop?.name, 160),
    type: clean(shop?.type, 80).toLowerCase(),
    status: Number(shop?.status ?? -1),
    authorized: boolAuthorizedStatus(shop?.status),
    marketplace: clean(shop?.marketplace, 80),
    countryCode: clean(shop?.countryCode, 20).toUpperCase(),
    storeCountry: clean(shop?.storeCountry, 100),
    currencyCode: clean(shop?.currencyCode, 20).toUpperCase(),
  };
}

async function main() {
  const apiKey = clean(process.env.CJ_API_KEY, 500);
  if (!apiKey) throw new Error('CJ_API_KEY missing');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  const auth = await jsonFetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: {'content-type':'application/json','user-agent':'PrismBay-eBay-Control/1.0'},
    body: JSON.stringify({ apiKey }),
  });
  const token = clean(auth?.data?.accessToken, 1000);
  if (!token) throw new Error('CJ token missing');
  console.log(`::add-mask::${token}`);
  const headers = {'CJ-Access-Token':token,'user-agent':'PrismBay-eBay-Control/1.0'};

  await new Promise(r => setTimeout(r, 1100));
  const shopsPayload = await jsonFetch(`${CJ_BASE}/shop/getShops`, { headers });
  const shops = (Array.isArray(shopsPayload?.data) ? shopsPayload.data : []).map(sanitizeShop);
  const ebayShops = shops.filter(s => /ebay/.test(s.type) || /ebay/.test(s.marketplace.toLowerCase()));
  const authorizedEbay = ebayShops.find(s => s.authorized) || null;

  await new Promise(r => setTimeout(r, 1100));
  const stockUrl = new URL(`${CJ_BASE}/product/stock/queryByVid`);
  stockUrl.searchParams.set('vid', manifest.product.supplier.variantId);
  const stockPayload = await jsonFetch(stockUrl, { headers });
  const stockRows = Array.isArray(stockPayload?.data) ? stockPayload.data : [];
  const pinnedOrigin = clean(manifest.product.supplier.originCountryCode, 10).toUpperCase();
  const route = stockRows.find(row =>
    clean(row?.vid, 100) === clean(manifest.product.supplier.variantId, 100) &&
    clean(row?.countryCode, 10).toUpperCase() === pinnedOrigin &&
    Number(row?.cjInventoryNum ?? row?.totalInventoryNum ?? 0) >= 1
  ) || null;

  let warehouse = null;
  let warehouseDiscovery = { attempted: false, candidateIds: [], errors: [] };
  if (route) {
    warehouseDiscovery.candidateIds = candidateWarehouseIds(route);
    for (const id of warehouseDiscovery.candidateIds) {
      warehouseDiscovery.attempted = true;
      try {
        await new Promise(r => setTimeout(r, 1100));
        const w = await jsonFetch(`${CJ_BASE}/warehouse/detail?id=${encodeURIComponent(id)}`, { headers });
        if (w?.data) {
          warehouse = {
            id: clean(w.data.id, 100),
            name: clean(w.data.name, 160),
            countryCode: clean(w.data.areaCountryCode ?? w.data.countryCode, 10).toUpperCase(),
            city: clean(w.data.city, 100),
            province: clean(w.data.province ?? w.data.state, 100),
            postalCode: clean(w.data.zipCode ?? w.data.postalCode ?? w.data.zip, 40),
            address1: clean(w.data.address1, 200),
          };
          break;
        }
      } catch (error) {
        warehouseDiscovery.errors.push({ id, error: clean(error?.message, 220) });
      }
    }
  }

  const dispatchLocationVerified = Boolean(
    warehouse && warehouse.countryCode && warehouse.city && warehouse.postalCode
  );
  const liveStockVerified = Boolean(route);

  const report = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    product: {
      slug: manifest.product.slug,
      variantId: manifest.product.supplier.variantId,
      variantSku: manifest.product.supplier.variantSku,
      originCountryCode: pinnedOrigin,
      listingPriceUsd: manifest.offer.price,
    },
    cj: {
      authenticated: true,
      shopCount: shops.length,
      shops,
      ebayShopCount: ebayShops.length,
      ebaySellerAuthenticated: Boolean(authorizedEbay),
      authorizedEbayShop: authorizedEbay,
      liveStockVerified,
      routeSummary: route ? {
        countryCode: clean(route.countryCode, 10).toUpperCase(),
        inventory: Number(route.cjInventoryNum ?? route.totalInventoryNum ?? 0),
        warehouseCandidateIds: warehouseDiscovery.candidateIds,
      } : null,
      warehouse,
      warehouseDiscovery,
      dispatchLocationVerified,
    },
    gates: {
      ebaySellerAuthenticated: Boolean(authorizedEbay),
      liveStockVerified,
      dispatchLocationVerified,
      directStripeAbsent: true,
      automaticSupplierOrderingDisabled: manifest.safety.automaticSupplierOrdering === false,
    },
  };
  report.readyForBrowserPublish = Object.values(report.gates).every(Boolean);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(`${outDir}/control-plane.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ebaySellerAuthenticated: report.gates.ebaySellerAuthenticated,
    liveStockVerified: report.gates.liveStockVerified,
    dispatchLocationVerified: report.gates.dispatchLocationVerified,
    readyForBrowserPublish: report.readyForBrowserPublish,
    ebayShopCount: report.cj.ebayShopCount,
    warehouse: report.cj.warehouse,
  }));
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
