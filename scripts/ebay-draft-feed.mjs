import fs from 'node:fs/promises';
import path from 'node:path';

const MANIFEST = new URL('../marketplaces/ebay/garment-steamer.json', import.meta.url);

function csv(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"','""')}"` : s;
}

export function buildDraftRows(manifest) {
  return {
    headers: ['Action','Custom label (SKU)','Category ID','Title'],
    row: [
      'Draft',
      manifest.product.supplier.variantSku,
      manifest.product.categoryId,
      manifest.product.title,
    ],
  };
}

export function buildDraftCsv(manifest) {
  const { headers, row } = buildDraftRows(manifest);
  return `${headers.map(csv).join(',')}\n${row.map(csv).join(',')}\n`;
}

export function buildManualPacketCsv(manifest) {
  const fields = [
    ['Field','Value'],
    ['Title', manifest.product.title],
    ['Custom label (SKU)', manifest.product.supplier.variantSku],
    ['Category ID', manifest.product.categoryId],
    ['Category', manifest.product.categoryName],
    ['Condition', manifest.product.condition],
    ['Brand', manifest.product.brand],
    ['Price USD', Number(manifest.offer.price).toFixed(2)],
    ['Best Offer floor USD', Number(manifest.offer.bestOffer?.autoDeclineBelowUsd ?? manifest.offer.price).toFixed(2)],
    ['Handling days', manifest.offer.handlingDays],
    ['Shipping charge USD', Number(manifest.offer.shippingChargeToBuyerUsd).toFixed(2)],
    ['Description', manifest.product.description],
    ['Supplier product', manifest.sources.supplierProductUrl],
    ...Object.entries(manifest.product.itemSpecifics || {}).map(([k,v]) => [`Item specific: ${k}`, v]),
  ];
  return fields.map(row => row.map(csv).join(',')).join('\n') + '\n';
}

export async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  const outDir = path.resolve('growth-reports/ebay');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'garment-steamer-ebay-draft.csv'), buildDraftCsv(manifest));
  await fs.writeFile(path.join(outDir, 'garment-steamer-manual-packet.csv'), buildManualPacketCsv(manifest));
  await fs.writeFile(path.join(outDir, 'garment-steamer-draft-readme.txt'), [
    'PrismBay eBay draft feed',
    '',
    'The draft CSV uses eBay Seller Hub Reports documented draft fields: Action, Custom label (SKU), Category ID, Title.',
    'It creates a draft only. It does not publish a live listing.',
    'If Seller Hub Reports is unavailable on the seller account, use the manual-packet CSV and the PrismBay eBay Launch Console instead.',
    'Do not complete/publish the listing until CJ eBay authorization and exact dispatch/item location are verified.',
    'Do not claim U.S. domestic item location unless CJ supplies verified U.S. dispatch evidence.',
    'Keep payment inside eBay and automatic supplier ordering disabled.',
    '',
  ].join('\n'));
  console.log(JSON.stringify({generated:true, draftRows:1, categoryId:manifest.product.categoryId, sku:manifest.product.supplier.variantSku}));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
