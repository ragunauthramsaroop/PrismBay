import fs from 'node:fs/promises';
import path from 'node:path';

const MANIFEST = new URL('../marketplaces/ebay/garment-steamer.json', import.meta.url);

export function evaluateEconomics(manifest, priceOverride = null) {
  const price = Number(priceOverride ?? manifest.offer.price);
  const feeRate = Number(manifest.economics.assumedFinalValueFeeRate);
  const orderFee = Number(manifest.economics.perOrderFeeUsd);
  const reserveRate = Number(manifest.economics.returnReserveRate);
  const supplier = Number(manifest.product.supplier.supplierCostUsd);
  const freight = Number(manifest.product.supplier.maxScreeningFreightUsd);
  const marketplaceFee = price * feeRate + orderFee;
  const returnReserve = price * reserveRate;
  const maxLandedCost = supplier + freight;
  const modeledProfit = price - marketplaceFee - returnReserve - maxLandedCost;
  const modeledMargin = modeledProfit / price;
  return {
    priceUsd: price,
    marketplaceFeeUsd: Number(marketplaceFee.toFixed(2)),
    returnReserveUsd: Number(returnReserve.toFixed(2)),
    maxLandedCostUsd: Number(maxLandedCost.toFixed(2)),
    modeledProfitUsd: Number(modeledProfit.toFixed(2)),
    modeledMarginRate: Number(modeledMargin.toFixed(4)),
    pass: modeledProfit >= Number(manifest.economics.minimumProfitUsd) && modeledMargin >= Number(manifest.economics.minimumMarginRate),
  };
}

export function buildListingPack(manifest, env = process.env) {
  const economics = evaluateEconomics(manifest);
  const offerFloor = Number(manifest?.offer?.bestOffer?.autoDeclineBelowUsd ?? manifest.offer.price);
  const floorEconomics = evaluateEconomics(manifest, offerFloor);
  const dispatch = {
    city: String(env.CJ_DISPATCH_CITY || '').trim(),
    region: String(env.CJ_DISPATCH_REGION || '').trim(),
    postalCode: String(env.CJ_DISPATCH_POSTAL || '').trim(),
    countryCode: String(env.CJ_DISPATCH_COUNTRY || manifest.product.supplier.originCountryCode || '').trim().toUpperCase(),
  };
  const verification = manifest.verification || {};
  const gates = {
    economicsPass: economics.pass,
    offerFloorEconomicsPass: floorEconomics.pass,
    supplierSpecsVerified: verification.supplierSpecsVerified === true,
    ebayCategoryVerified: verification.ebayCategoryVerified === true,
    marketplacePolicyReviewed: verification.marketplacePolicyReviewed === true,
    wholesaleSupplierConfigured: manifest.product?.supplier?.relationshipMode === 'wholesale_dropshipping_supplier',
    liveStockVerified: env.CJ_LIVE_STOCK_VERIFIED === '1',
    ebaySellerAuthenticated: env.EBAY_AUTH_VERIFIED === '1',
    dispatchLocationVerified: Boolean(dispatch.city && dispatch.postalCode && dispatch.countryCode),
    offEbayCheckoutAbsent: !/stripe\.com|buy\.stripe\.com/i.test(JSON.stringify({
      title: manifest.product.title,
      description: manifest.product.description,
      itemSpecifics: manifest.product.itemSpecifics,
    })),
    supplierOrderingDisabled: manifest.safety.automaticSupplierOrdering === false,
  };
  const readyForPublish = Object.values(gates).every(Boolean);
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    marketplace: manifest.marketplace,
    status: readyForPublish ? 'publish_ready' : 'blocked_until_all_gates_pass',
    readyForPublish,
    gates,
    listing: {
      format: manifest.listingMode,
      title: manifest.product.title,
      condition: manifest.product.condition,
      categoryId: manifest.product.categoryId,
      categoryName: manifest.product.categoryName,
      brand: manifest.product.brand,
      itemSpecifics: manifest.product.itemSpecifics,
      specifications: manifest.product.specifications,
      description: manifest.product.description,
      priceUsd: manifest.offer.price,
      quantity: manifest.offer.quantity,
      shippingChargeToBuyerUsd: manifest.offer.shippingChargeToBuyerUsd,
      handlingDays: manifest.offer.handlingDays,
      bestOffer: manifest.offer.bestOffer || null,
      returns: manifest.offer.returns,
      itemLocation: gates.dispatchLocationVerified ? dispatch : null,
      supplierVariantSku: manifest.product.supplier.variantSku,
      supplierProductUrl: manifest.sources.supplierProductUrl,
    },
    economics,
    offerFloorEconomics: floorEconomics,
    verification,
    shipping: manifest.shipping || {},
    safeguards: manifest.safety,
    nextAction: readyForPublish
      ? 'Create the fixed-price eBay listing through the authenticated CJ/eBay connection. Keep payment on eBay, use the verified dispatch location, and keep supplier auto-ordering disabled.'
      : 'Do not publish. Wait for verified eBay seller authorization and the exact CJ dispatch city/postal code. All listing-data and economics gates must remain green.',
  };
}

export async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  const pack = buildListingPack(manifest);
  const outDir = path.resolve('growth-reports/ebay');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'garment-steamer-listing.json'), JSON.stringify(pack, null, 2) + '\n');
  const md = [
    '# PrismBay eBay listing pack',
    '',
    `Status: **${pack.status}**`,
    `Title: ${pack.listing.title}`,
    `Price: USD ${pack.listing.priceUsd.toFixed(2)}`,
    `Best-offer floor: USD ${Number(pack.listing.bestOffer?.autoDeclineBelowUsd ?? pack.listing.priceUsd).toFixed(2)}`,
    `Category: ${pack.listing.categoryName} (${pack.listing.categoryId})`,
    `Supplier SKU: ${pack.listing.supplierVariantSku}`,
    '',
    `Modeled max-landed-cost profit at list price: USD ${pack.economics.modeledProfitUsd.toFixed(2)} (${(pack.economics.modeledMarginRate * 100).toFixed(1)}%)`,
    `Modeled max-landed-cost profit at offer floor: USD ${pack.offerFloorEconomics.modeledProfitUsd.toFixed(2)} (${(pack.offerFloorEconomics.modeledMarginRate * 100).toFixed(1)}%)`,
    '',
    '## Publish gates',
    ...Object.entries(pack.gates).map(([k,v]) => `- ${k}: ${v ? 'PASS' : 'BLOCKED'}`),
    '',
    '## Rule',
    pack.nextAction,
    '',
  ].join('\n');
  await fs.writeFile(path.join(outDir, 'garment-steamer-listing.md'), md);
  console.log(JSON.stringify({status:pack.status, readyForPublish:pack.readyForPublish, gates:pack.gates, economics:pack.economics, offerFloorEconomics:pack.offerFloorEconomics}));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
