import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://clean.prismbayai.com';
const ASSETS = ['catalog-data.js', 'catalog-ui.js', 'catalog-store.css'];

// Fetch only the known public storefront. Never execute downloaded JavaScript.
async function probe(url, fetcher) {
  try {
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    return { ok: response.ok, status: response.status, type: response.headers.get('content-type') || '', text };
  } catch {
    return { ok: false, status: null, type: '', text: '' };
  }
}

export async function observeStorefront(fetcher = fetch) {
  const checks = [];
  const home = await probe(ORIGIN + '/', fetcher);
  checks.push({ resource: '/', ok: home.ok && /text\/html/i.test(home.type) && /id=["']catalog["']/i.test(home.text), status: home.status });
  const refs = [...home.text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  for (const asset of ASSETS) {
    const url = refs.map(ref => { try { return new URL(ref, ORIGIN); } catch { return null; } })
      .find(url => url?.origin === ORIGIN && url.pathname === `/assets/${asset}` && !url.username && !url.password);
    if (!url) {
      checks.push({ resource: asset, ok: false, status: null, reason: 'missing_same_origin_reference' });
      continue;
    }
    const result = await probe(url.href, fetcher);
    const expectedType = asset.endsWith('.css') ? /text\/css/i : /(?:javascript|ecmascript)/i;
    checks.push({ resource: asset, ok: result.ok && expectedType.test(result.type) && result.text.trim().length > 0,
      status: result.status, url: url.href });
  }
  return { schemaVersion: 1, checkedAt: new Date().toISOString(), origin: ORIGIN,
    healthy: checks.every(check => check.ok), checks,
    scope: 'Homepage and catalog asset delivery only; browser rendering, images, remote feed, worker execution, checkout and sales are not verified.' };
}

export async function main() {
  const report = await observeStorefront();
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/clean-storefront-observation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  // Delivery failures become controller tasks. They must not stop allocation.
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
