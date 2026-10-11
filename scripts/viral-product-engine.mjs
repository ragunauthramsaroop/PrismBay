import fs from 'node:fs/promises';
import { buildResearchContentQueue } from './retail-content-brief.mjs';

const products = [
  { slug: 'scrubber', name: '5-in-1 Electric Spin Scrubber', query: 'electric spin scrubber', visualFit: 1.00 },
  { slug: 'pressure-washer', name: 'Cordless Pressure Washer', query: 'cordless pressure washer', visualFit: 0.98 },
  { slug: 'garment-steamer', name: 'Portable Garment Steamer', query: 'portable garment steamer', visualFit: 0.86 },
  { slug: 'pethair', name: 'Reusable Pet Hair Remover', query: 'pet hair remover tool', visualFit: 0.92 },
  { slug: 'crevice', name: '3-in-1 Crevice Cleaning Brush', query: 'crevice cleaning brush', visualFit: 0.90 },
  { slug: 'mattress-vacuum', name: 'Mattress Vacuum', query: 'mattress vacuum', visualFit: 0.94 },
  { slug: 'mini-mop', name: 'Self-Squeeze Mini Mop', query: 'mini mop cleaning', visualFit: 0.80 },
  { slug: 'drain-catcher', name: 'Sink Drain Catcher 2-Pack', query: 'sink drain catcher', visualFit: 0.72 },
  { slug: 'home-caddy', name: 'Portable Home Caddy', query: 'cleaning caddy organizer', visualFit: 0.74 },
];

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

function stripCdata(value = '') {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function decodeXml(value = '') {
  return stripCdata(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
function parseItems(xml) {
  const items = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
    const rawDate = decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '');
    const publishedAt = rawDate ? new Date(rawDate) : null;
    if (title) items.push({ title, link, publishedAt });
  }
  return items;
}

async function fetchFeed(url, source) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'PrismBay-Viral-Product-Engine/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { source, ok: false, status: response.status, items: [] };
    const xml = await response.text();
    return { source, ok: true, status: response.status, items: parseItems(xml) };
  } catch (error) {
    return { source, ok: false, status: 0, error: error instanceof Error ? error.message : String(error), items: [] };
  }
}

function uniqueItems(feeds) {
  const seen = new Set();
  const out = [];
  for (const feed of feeds) {
    for (const item of feed.items) {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ ...item, source: feed.source });
      }
    }
  }
  return out;
}
function calculateScore(items, visualFit) {
  const dated = items.filter(item => item.publishedAt instanceof Date && !Number.isNaN(item.publishedAt.getTime()));
  const last7 = dated.filter(item => now - item.publishedAt <= 7 * DAY).length;
  const last30 = dated.filter(item => now - item.publishedAt <= 30 * DAY).length;
  const volume = Math.min(1, items.length / 30);
  const recency = Math.min(1, (last7 * 2 + last30) / 20);
  const score = Math.round((volume * 45 + recency * 30 + visualFit * 25) * 10) / 10;
  return { score, mentions: items.length, last7, last30 };
}

function signalLabel(score) {
  if (score >= 70) return 'high-attention';
  if (score >= 50) return 'active';
  if (score >= 30) return 'watch';
  return 'baseline';
}

async function scoreProduct(product) {
  const query = encodeURIComponent('"' + product.query + '"');
  const feeds = await Promise.all([
    fetchFeed(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`, 'Google News'),
    fetchFeed(`https://www.bing.com/news/search?q=${query}&format=rss`, 'Bing News'),
  ]);
  const items = uniqueItems(feeds);
  const metrics = calculateScore(items, product.visualFit);
  return {
    slug: product.slug,
    name: product.name,
    signalScore: metrics.score,
    signalLabel: signalLabel(metrics.score),
    evidence: {
      publicMentions: metrics.mentions,
      mentionsLast7Days: metrics.last7,
      mentionsLast30Days: metrics.last30,
      sourcesAvailable: feeds.filter(feed => feed.ok).map(feed => feed.source),
    },
    sampleSignals: items.slice(0, 5).map(item => ({
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt && !Number.isNaN(item.publishedAt.getTime()) ? item.publishedAt.toISOString() : null,
      url: item.link || null,
    })),
  };
}

const scored = [];
for (const product of products) {
  scored.push(await scoreProduct(product));
}
scored.sort((a, b) => b.signalScore - a.signalScore || a.name.localeCompare(b.name));
const ranked = scored.map((product, index) => ({ ...product, rank: index + 1 }));
const catalog = {
  schemaVersion: 1,
  updatedAt: now.toISOString(),
  market: 'US',
  methodology: 'Public-news attention, freshness, and short-form demonstration fit. This is not PrismBay sales data and is not a TikTok, Amazon, Google, or Bing product ranking.',
  refreshTargetHours: 6,
  products: ranked,
};

const queue = buildResearchContentQueue(ranked, now);

await fs.mkdir('public', { recursive: true });
await fs.mkdir('growth-reports', { recursive: true });
await fs.writeFile('public/viral-catalog.json', JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile('growth-reports/viral-content-queue.json', JSON.stringify(queue, null, 2) + '\n');

console.log(JSON.stringify({
  updatedAt: catalog.updatedAt,
  top: ranked.slice(0, 5).map(({ rank, slug, signalScore, signalLabel }) => ({ rank, slug, signalScore, signalLabel })),
  feeds: [...new Set(ranked.flatMap(item => item.evidence.sourcesAvailable))],
}, null, 2));
