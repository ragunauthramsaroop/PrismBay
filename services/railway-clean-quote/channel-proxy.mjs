import http from 'node:http';
import { buyerPage, createStorefrontServer } from './storefront.mjs';

export const SOCIAL_CHANNELS = new Set(['youtube', 'tiktok']);

function safeChannel(value) {
  const source = String(value || '').trim().toLowerCase();
  return SOCIAL_CHANNELS.has(source) ? source : null;
}

export function channelFromBuyerRequest(url) {
  const direct = url.pathname.match(/^\/garment-steamer\/(youtube|tiktok)\/?$/);
  if (direct) return direct[1];
  if (/^\/garment-steamer\/github\/?$/.test(url.pathname)) {
    return safeChannel(url.searchParams.get('utm_source'));
  }
  return null;
}

export function channelFromQuotePath(pathname) {
  const match = pathname.match(/^\/v1\/quote\/(youtube|tiktok)\/?$/);
  return match ? match[1] : null;
}

function pageHeaders() {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https://oss-cf.cjdropshipping.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  };
}

function socialBuyerPage(channel) {
  return buyerPage('github').replaceAll('/v1/quote/github', `/v1/quote/${channel}`);
}

export function createChannelServer({ baseServer = createStorefrontServer() } = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const channel = channelFromBuyerRequest(url);

    if ((req.method === 'GET' || req.method === 'HEAD') && channel) {
      const isLegacyGithubPath = /^\/garment-steamer\/github\/?$/.test(url.pathname);
      if (isLegacyGithubPath) {
        const location = new URL(`/garment-steamer/${channel}/`, 'http://localhost');
        for (const [key, value] of url.searchParams) location.searchParams.append(key, value);
        console.log(`[attribution] buyer_redirect source=${channel}`);
        res.writeHead(302, {
          location: location.pathname + location.search,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        });
        return res.end();
      }

      console.log(`[attribution] buyer_page source=${channel}`);
      res.writeHead(200, pageHeaders());
      if (req.method === 'HEAD') return res.end();
      return res.end(socialBuyerPage(channel));
    }

    const quoteChannel = channelFromQuotePath(url.pathname);
    if (quoteChannel) {
      console.log(`[attribution] quote_request source=${quoteChannel}`);
      req.url = '/v1/quote' + url.search;
      return baseServer.emit('request', req, res);
    }

    return baseServer.emit('request', req, res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  createChannelServer().listen(port, '0.0.0.0', () => console.log('prismbay_channel_storefront_ready'));
}
