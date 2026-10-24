import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const dist = resolve(process.cwd(), 'dist');
const assetDir = resolve(dist, 'assets');
const assets = readdirSync(assetDir).filter(name => /\.(js|css|wasm)$/.test(name)).map(name => '/assets/' + name);
const precache = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/nexus-192.png', '/icons/nexus-512.png', ...assets];
const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);
const worker = String.raw`/* Generated service worker. Only public static app assets are cached. Never cache API responses. */
const CURRENT = 'nexus-public-shell-__VERSION__';
const SHELL = __PRECACHE__;
const CACHEABLE = new Set(SHELL);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CURRENT);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('nexus-public-shell-') && name !== CURRENT).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The HTML entry point contains no account data, tokens, or Matrix API replies.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch { return (await caches.match('/index.html')) || Response.error(); }
    })());
    return;
  }
  // Never cache API calls, local credentials, or arbitrary remote data.
  if (!CACHEABLE.has(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(url.pathname);
    return cached || fetch(request);
  })());
});
`;
writeFileSync(resolve(dist, 'sw.js'), worker.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));
console.log('Generated static-only offline shell with '+assets.length+' immutable build assets.');
