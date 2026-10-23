import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ownedSalesUrls } from './owned-sales-page-worker.mjs';

export function mergeSitemap(xml, date = new Date().toISOString().slice(0,10)) {
  const text = String(xml || '').trim();
  if (!text.includes('<urlset') || !text.includes('</urlset>')) throw new Error('invalid_sitemap');
  // Remove old GitHub Pages buyer URLs: the branded storefront is canonical.
  // Keeping both in the public sitemap splits indexing and weakens buyer traffic.
  const withoutLegacyBuyers = text.replace(/\s*<url>\s*<loc>https:\/\/ragunauthramsaroop\.github\.io\/PrismBay\/learn\/(?:[^<]*)<\/loc>[\s\S]*?<\/url>/g, '');
  let body = withoutLegacyBuyers.replace(/\s*<\/urlset>\s*$/, '');
  for (const url of ownedSalesUrls()) {
    if (body.includes('<loc>' + url + '</loc>')) continue;
    body += '\n  <url><loc>' + url + '</loc><lastmod>' + date + '</lastmod><changefreq>weekly</changefreq></url>';
  }
  return body + '\n</urlset>\n';
}

export async function main(target = process.argv[2]) {
  if (!target) throw new Error('sitemap_path_required');
  const current = await fs.readFile(target, 'utf8');
  const merged = mergeSitemap(current);
  await fs.writeFile(target, merged);
  console.log(JSON.stringify({status:'PASS',target,urls:ownedSalesUrls().length}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
