import fs from 'node:fs/promises';
import { evaluateEconomics } from './ebay-listing-worker.mjs';

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

function normalizeWarehouseId(value) {
  return clean(value, 100).replace(/^\{+|\}+$/g, '');
}

function boolAuthorizedStatus(status) {
  return Number(status) === 1;
}

function nestedStockIds(row = {}) {
  const stocks = Array.isArray(row?.stock) ? row.stock : [];
  return stocks.map(s => normalizeWarehouseId(s?.stockId)).filter(Boolean);
}

function candidateWarehouseIds(row = {}) {
  return [...new Set([
    row.storageId,
    row.warehouseId,
    row.storehouseId,
    row.storage,
    row.warehouse,
    ...nestedStockIds(row),
  ].map(normalizeWarehouseId).filter(Boolean))];
}

function candidateIdsFromPidInventory(payload, variantId, originCountryCode) {
  const variantRows = Array.isArray(payload?.data?.variantInventories) ? payload.data.variantInventories : [];
  const match = variantRows.find(v => clean(v?.vid, 100) === clean(variantId, 100));
  if (!match) return [];
  const inventories = Array.isArray(match?.inventory) ? match.inventory : [];
  const ids = [];
  for (const row of inventories) {
    if (clean(row?.countryCode, 10).toUpperCase() !== originCountryCode) continue;
    if (Number(row?.totalInventory ?? row?.cjInventory ?? row?.factoryInventory ?? 0) < 1) continue;
    ids.push(...nestedStockIds(row));
  }
  return [...new Set(ids.filter(Boolean))];
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

function sanitizeWarehouse(data = {}) {
  return {
    id: normalizeWarehouseId(data.id),
    name: clean(data.name, 160),
    countryCode: clean(data.areaCountryCode ?? data.countryCode, 10).toUpperCase(),
    city: clean(data.city, 100),
    province: clean(data.province ?? data.state, 100),
    postalCode: clean(data.zipCode ?? data.postalCode ?? data.zip, 40),
    address1: clean(data.address1, 200),
  };
}

function sanitizeConfirmationWarehouse(data = {}) {
  return {
    id: normalizeWarehouseId(data.storageId ?? data.id),
    name: clean(data.displayName ?? data.name, 160),
    countryCode: clean(data.countryCode ?? data.areaCountryCode, 10).toUpperCase(),
    city: '',
    province: '',
    postalCode: clean(data.zipCode ?? data.postalCode ?? data.zip, 40),
    address1: clean(data.addresses ?? data.address ?? data.address1, 300),
  };
}

function dispatchEvidence(warehouse) {
  if (!warehouse?.countryCode) return { verified: false, mode: null };
  if (warehouse.postalCode) return { verified: true, mode: 'postal_country' };
  if (warehouse.city && warehouse.province) return { verified: true, mode: 'city_region_country' };
  return { verified: false, mode: null };
}

async function main() {
  const apiKey = clean(process.env.CJ_API_KEY, 500);
  if (!apiKey) throw new Error('CJ_API_KEY missing');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const listEconomics = evaluateEconomics(manifest);
  const offerFloor = Number(manifest?.offer?.bestOffer?.autoDeclineBelowUsd ?? manifest.offer.price);
  const floorEconomics = evaluateEconomics(manifest, offerFloor);

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
  let partialWarehouse = null;
  let warehouseDiscovery = {
    attempted: false,
    source: 'queryByVid',
    candidateIds: route ? candidateWarehouseIds(route) : [],
    pidInventoryFallbackAttempted: false,
    candidatesChecked: [],
    errors: [],
  };
  const confirmationDiscovery = {
    attempted: false,
    endpoint: '/shopping/privateInventory/getConfirmation',
    readOnly: true,
    quantity: 1,
    candidates: [],
    error: null,
  };

  if (route && warehouseDiscovery.candidateIds.length === 0) {
    try {
      warehouseDiscovery.pidInventoryFallbackAttempted = true;
      await new Promise(r => setTimeout(r, 1100));
      const pidUrl = new URL(`${CJ_BASE}/product/stock/getInventoryByPid`);
      pidUrl.searchParams.set('pid', manifest.product.supplier.productId);
      const pidInventory = await jsonFetch(pidUrl, { headers });
      const fallbackIds = candidateIdsFromPidInventory(
        pidInventory,
        manifest.product.supplier.variantId,
        pinnedOrigin,
      );
      if (fallbackIds.length) {
        warehouseDiscovery.source = 'getInventoryByPid';
        warehouseDiscovery.candidateIds = fallbackIds;
      }
    } catch (error) {
      warehouseDiscovery.errors.push({ stage: 'getInventoryByPid', error: clean(error?.message, 220) });
    }
  }

  if (route) {
    for (const id of warehouseDiscovery.candidateIds) {
      warehouseDiscovery.attempted = true;
      try {
        await new Promise(r => setTimeout(r, 1100));
        const w = await jsonFetch(`${CJ_BASE}/warehouse/detail?id=${encodeURIComponent(id)}`, { headers });
        if (w?.data) {
          const candidate = sanitizeWarehouse(w.data);
          const evidence = dispatchEvidence(candidate);
          warehouseDiscovery.candidatesChecked.push({ ...candidate, evidenceVerified: evidence.verified, evidenceMode: evidence.mode });
          if (candidate.countryCode === pinnedOrigin) {
            if (!partialWarehouse) partialWarehouse = candidate;
            if (evidence.verified) {
              warehouse = candidate;
              break;
            }
          }
        }
      } catch (error) {
        warehouseDiscovery.errors.push({ stage: 'warehouse/detail', id, error: clean(error?.message, 220) });
      }
    }
  }

  if (!warehouse && partialWarehouse) warehouse = partialWarehouse;

  if (route && !dispatchEvidence(warehouse).verified) {
    confirmationDiscovery.attempted = true;
    try {
      await new Promise(r => setTimeout(r, 1100));
      const confirmation = await jsonFetch(`${CJ_BASE}/shopping/privateInventory/getConfirmation`, {
        method: 'POST',
        headers: { ...headers, 'content-type':'application/json' },
        body: JSON.stringify({
          variants: [{
            variantId: manifest.product.supplier.variantId,
            productId: manifest.product.supplier.productId,
            quantity: 1,
          }],
        }),
      });
      const rows = Array.isArray(confirmation?.data?.availableStorehouseList)
        ? confirmation.data.availableStorehouseList
        : [];
      for (const row of rows) {
        const candidate = sanitizeConfirmationWarehouse(row);
        const evidence = dispatchEvidence(candidate);
        confirmationDiscovery.candidates.push({ ...candidate, evidenceVerified: evidence.verified, evidenceMode: evidence.mode });
        if (candidate.countryCode === pinnedOrigin && evidence.verified) {
          warehouse = candidate;
          break;
        }
      }
    } catch (error) {
      confirmationDiscovery.error = clean(error?.message, 260);
    }
  }

  const dispatch = dispatchEvidence(warehouse);
  const dispatchLocationVerified = dispatch.verified;
  const liveStockVerified = Boolean(route);
  const verification = manifest.verification || {};

  const report = {
    schemaVersion: 5,
    checkedAt: new Date().toISOString(),
    product: {
      slug: manifest.product.slug,
      variantId: manifest.product.supplier.variantId,
      variantSku: manifest.product.supplier.variantSku,
      originCountryCode: pinnedOrigin,
      listingPriceUsd: manifest.offer.price,
      bestOfferFloorUsd: offerFloor,
      categoryId: manifest.product.categoryId,
      categoryName: manifest.product.categoryName,
    },
    economics: {
      listPrice: listEconomics,
      bestOfferFloor: floorEconomics,
    },
    verification: {
      supplierSpecsVerified: verification.supplierSpecsVerified === true,
      ebayCategoryVerified: verification.ebayCategoryVerified === true,
      marketplacePolicyReviewed: verification.marketplacePolicyReviewed === true,
      checkedAt: clean(verification.checkedAt, 40),
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
        nestedStockIds: nestedStockIds(route),
        warehouseCandidateIds: warehouseDiscovery.candidateIds,
      } : null,
      warehouse,
      warehouseDiscovery,
      confirmationDiscovery,
      dispatchLocationVerified,
      dispatchEvidenceMode: dispatch.mode,
    },
    gates: {
      economicsPass: listEconomics.pass,
      offerFloorEconomicsPass: floorEconomics.pass,
      supplierSpecsVerified: verification.supplierSpecsVerified === true,
      ebayCategoryVerified: verification.ebayCategoryVerified === true,
      marketplacePolicyReviewed: verification.marketplacePolicyReviewed === true,
      wholesaleSupplierConfigured: manifest.product?.supplier?.relationshipMode === 'wholesale_dropshipping_supplier',
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
    dispatchEvidenceMode: report.cj.dispatchEvidenceMode,
    confirmationAttempted: report.cj.confirmationDiscovery.attempted,
    confirmationCandidates: report.cj.confirmationDiscovery.candidates,
    confirmationError: report.cj.confirmationDiscovery.error,
    offerFloorEconomicsPass: report.gates.offerFloorEconomicsPass,
    listingDataVerified: report.gates.supplierSpecsVerified && report.gates.ebayCategoryVerified && report.gates.marketplacePolicyReviewed,
    readyForBrowserPublish: report.readyForBrowserPublish,
    ebayShopCount: report.cj.ebayShopCount,
    warehouseCandidateIds: report.cj.warehouseDiscovery.candidateIds,
    candidatesChecked: report.cj.warehouseDiscovery.candidatesChecked,
    warehouse: report.cj.warehouse,
  }));
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
