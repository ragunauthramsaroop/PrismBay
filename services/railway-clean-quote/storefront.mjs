import http from 'node:http';
import { createServer as createCoreServer } from './server.mjs';

export const PRODUCT_IMAGE = 'https://oss-cf.cjdropshipping.com/product/2024/10/02/08/9b378db0-cb12-4b24-85d4-d3bd42e2649d.jpg';
export const CANONICAL = 'https://clean.prismbayai.com/garment-steamer/';
export const ATTRIBUTION_SOURCES = new Set(['direct', 'github', 'canonical', 'guide']);

export function buyerSourceFromPath(pathname) {
  if (pathname === '/' || pathname === '/garment-steamer' || pathname === '/garment-steamer/') return 'direct';
  const match = pathname.match(/^\/garment-steamer\/(github|canonical|guide|direct)\/?$/);
  return match ? match[1] : null;
}

export function quoteSourceFromPath(pathname) {
  const match = pathname.match(/^\/v1\/quote\/(github|canonical|guide|direct)\/?$/);
  return match ? match[1] : null;
}

export function isBuyerPath(pathname) {
  return buyerSourceFromPath(pathname) !== null;
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

export function buyerPage(source = 'direct') {
  const safeSource = ATTRIBUTION_SOURCES.has(source) ? source : 'direct';
  const quotePath = `/v1/quote/${safeSource}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Portable Garment Steamer | PrismBay Clean</title>
<meta name="description" content="Check current supplier stock and U.S. ZIP shipping for the PrismBay Clean Portable Garment Steamer before payment.">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${CANONICAL}">
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15241e;background:#f6f8f6}*{box-sizing:border-box}body{margin:0}.notice{background:#173a2f;color:#fff;font-size:13px}.notice>div{max-width:1100px;margin:auto;padding:10px 22px;display:flex;justify-content:center;gap:28px;flex-wrap:wrap}.shell{max-width:1100px;margin:auto;padding:24px 22px 70px}.nav{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:30px}.brand{font-size:21px;font-weight:900;color:#173a2f;text-decoration:none}.navlinks{display:flex;gap:18px}.navlinks a{color:#52675f;text-decoration:none;font-size:14px;font-weight:700}.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,.8fr);gap:34px;align-items:start}.visual,.panel{background:#fff;border:1px solid #dce5df;border-radius:25px;box-shadow:0 16px 45px rgba(23,58,47,.07)}.visual{overflow:hidden}.visual img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#f1eee6}.fallback{display:none;aspect-ratio:1/1;place-items:center;font-size:90px;background:linear-gradient(145deg,#f1eee6,#e6f0e9)}.details{padding:30px}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.13em;color:#4c7565;text-transform:uppercase}.details h1{font-size:clamp(38px,5vw,56px);line-height:1.01;letter-spacing:-.05em;margin:12px 0 14px}.price{font-size:32px;font-weight:900;margin:0 0 18px}.lead{font-size:17px;line-height:1.65;color:#52675f}.benefits{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:11px}.benefits li{padding-left:27px;position:relative;color:#334a41}.benefits li:before{content:'✓';position:absolute;left:0;color:#17704d;font-weight:900}.panel{padding:28px;position:sticky;top:18px}.panel h2{font-size:28px;letter-spacing:-.035em;margin:0 0 8px}.muted{color:#667a71;line-height:1.55;margin-top:0}label{display:block;font-weight:850;margin:22px 0 8px}.row{display:grid;grid-template-columns:1fr auto;gap:10px}input{width:100%;min-width:0;border:1px solid #afc0b7;border-radius:12px;padding:14px 15px;font:inherit;font-size:17px;outline:none}input:focus{border-color:#174b38;box-shadow:0 0 0 3px rgba(23,75,56,.12)}button,.button{border:0;border-radius:12px;padding:14px 18px;background:#174b38;color:#fff;font:inherit;font-weight:850;cursor:pointer;text-decoration:none;display:inline-block}button:disabled{opacity:.55;cursor:wait}.fine{font-size:12px;line-height:1.5;color:#73847d}.status{display:none;margin-top:16px;padding:16px;border-radius:13px;line-height:1.5}.status.ok{display:block;background:#edf8f2;border:1px solid #b8dfc8;color:#155d3d}.status.bad{display:block;background:#fff7ed;border:1px solid #efd1a5;color:#8c4b12}.checkout{width:100%;margin-top:12px}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:13px}.fact{padding:11px;border-radius:11px;background:#f4f7f5}.fact b{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#73847d}.fact span{font-size:13px}.trust{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.trust>div{background:#fff;border:1px solid #dce5df;border-radius:16px;padding:19px}.trust h3{font-size:16px;margin:0 0 7px}.trust p{font-size:13px;line-height:1.55;color:#667a71;margin:0}.policy{margin-top:26px;padding:18px 20px;background:#eef4f0;border-radius:14px;color:#52675f;font-size:13px;line-height:1.6}.policy a{color:#174b38;font-weight:800}.direct{margin-top:15px;text-align:center}.direct a{color:#52675f;font-size:13px;font-weight:750}@media(max-width:820px){.hero{grid-template-columns:1fr}.panel{position:static}.trust{grid-template-columns:1fr}.row{grid-template-columns:1fr}.row button{width:100%}.navlinks{display:none}}
</style>
</head>
<body>
<div class="notice"><div><span>U.S. launch</span><span>Live stock + ZIP shipping check</span><span>Secure Stripe checkout after approval</span></div></div>
<main class="shell">
<header class="nav"><a class="brand" href="https://clean.prismbayai.com/">PrismBay Clean</a><nav class="navlinks"><a href="https://clean.prismbayai.com/guides/portable-garment-steamer.html">Buyer guide</a><a href="https://clean.prismbayai.com/shipping.html">Shipping</a><a href="https://clean.prismbayai.com/returns.html">Returns</a></nav></header>
<section class="hero">
<div class="visual"><img src="${PRODUCT_IMAGE}" alt="Portable Garment Steamer" width="900" height="900" decoding="async" fetchpriority="high" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="fallback" aria-hidden="true">♨️</div><div class="details"><div class="eyebrow">Fabric care</div><h1>Portable Garment Steamer</h1><div class="price">USD 29.95</div><p class="lead">Compact handheld steam care for quick clothing touch-ups, travel and suitable household fabrics.</p><ul class="benefits"><li>Current supplier stock checked before checkout</li><li>Shipping calculated for your 5-digit U.S. ZIP</li><li>Order economics checked before payment opens</li><li>Fresh stock and freight recheck before Stripe</li></ul></div></div>
<aside class="panel">
<div class="eyebrow">Live availability</div><h2>Check delivery to your ZIP</h2><p class="muted">Enter a U.S. ZIP. This check does not charge a card.</p>
<form id="quote-form"><label for="zip">U.S. ZIP code</label><div class="row"><input id="zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" placeholder="e.g. 10001" required><button id="check" type="submit">Check my ZIP</button></div><p class="fine">We check the mapped supplier variant, current stock and destination freight. No automatic supplier order starts here.</p></form>
<div id="result" class="status" role="status" aria-live="polite"></div>
<div class="policy"><strong>How fulfillment works:</strong> current route eligibility, supplier stock and destination freight are checked before Stripe opens. Final fulfillment and delivery timing are reviewed after payment before supplier dispatch. If fulfillment cannot proceed, the order is refunded. <a href="https://clean.prismbayai.com/guides/portable-garment-steamer.html">Read the buyer guide</a>.</div>
<div class="direct"><a href="https://clean.prismbayai.com/contact.html">Questions before ordering? Contact PrismBay Clean</a></div>
</aside>
</section>
<section class="trust"><div><h3>No payment during ZIP check</h3><p>The first check verifies eligibility only. Stripe appears only after a second successful live recheck.</p></div><div><h3>Eligible U.S. addresses</h3><p>Launch physical orders are limited to U.S. destinations that pass the live supplier and shipping route.</p></div><div><h3>Fulfillment reviewed after payment</h3><p>The preflight checks the current route before checkout. A paid order is still reviewed before supplier dispatch, with refund protection if fulfillment cannot proceed.</p></div></section>
</main>
<script>
(()=>{const API='${quotePath}',form=document.getElementById('quote-form'),zip=document.getElementById('zip'),check=document.getElementById('check'),result=document.getElementById('result');let token='',quotedZip='';function show(kind,title,text,checkout){result.className='status '+kind;result.replaceChildren();const b=document.createElement('strong');b.textContent=title;result.appendChild(b);const d=document.createElement('div');d.textContent=text;result.appendChild(d);if(checkout){const x=document.createElement('button');x.type='button';x.className='checkout';x.textContent='Recheck and continue to secure checkout';x.addEventListener('click',authorize);result.appendChild(x)}}async function post(payload){const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});let data={};try{data=await r.json()}catch{}return{r,data}}form.addEventListener('submit',async e=>{e.preventDefault();const value=String(zip.value||'').replace(/\D/g,'').slice(0,5);zip.value=value;if(!/^\d{5}$/.test(value))return show('bad','Enter a valid ZIP','Use a 5-digit U.S. ZIP code.',false);token='';quotedZip='';check.disabled=true;check.textContent='Checking live data…';try{const{r,data}=await post({zip:value});if(!r.ok||!data.success||data.stage!=='quoted'||!data.quoteToken)return show('bad','Not available for this ZIP',data.error||'This route is not approved right now. No payment was taken.',false);token=data.quoteToken;quotedZip=value;const ship=typeof data.shippingUsd==='number'?' Shipping: USD '+data.shippingUsd.toFixed(2)+'.':'';const eta=data.estimatedDelivery?' Estimated transit: '+data.estimatedDelivery+'.':'';show('ok','Available for this ZIP','Live stock and commercial checks passed.'+ship+eta,true)}catch{show('bad','Live check unavailable','Supplier verification is temporarily unavailable. No payment was taken.',false)}finally{check.disabled=false;check.textContent='Check my ZIP'}});async function authorize(e){const btn=e.currentTarget;if(!token||!quotedZip)return;btn.disabled=true;btn.textContent='Final recheck…';try{let final=null;for(let i=0;i<3;i++){const out=await post({zip:quotedZip,quoteToken:token});final=out;if(out.r.status!==502&&out.r.status!==503)break;if(i<2)await new Promise(r=>setTimeout(r,900*(i+1)))}if(!final.r.ok||!final.data.success||final.data.stage!=='checkout_authorized'||!final.data.checkoutUrl){token='';return show('bad','Checkout not released',final.data.error||'Stock or shipping changed. Check your ZIP again.',false)}location.assign(final.data.checkoutUrl)}catch{show('bad','Checkout unavailable','Final verification could not be completed. No payment was taken.',false)}}})();
</script>
</body></html>`;
}

export function createStorefrontServer({ coreServer = createCoreServer() } = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const buyerSource = buyerSourceFromPath(url.pathname);
    if ((req.method === 'GET' || req.method === 'HEAD') && buyerSource) {
      res.writeHead(200, pageHeaders());
      if (req.method === 'HEAD') return res.end();
      return res.end(buyerPage(buyerSource));
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/favicon.ico') {
      res.writeHead(204, { 'cache-control': 'public, max-age=86400' });
      return res.end();
    }
    const quoteSource = quoteSourceFromPath(url.pathname);
    if (quoteSource) {
      req.url = '/v1/quote' + url.search;
      return coreServer.emit('request', req, res);
    }
    return coreServer.emit('request', req, res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  createStorefrontServer().listen(port, '0.0.0.0', () => console.log('prismbay_clean_storefront_ready'));
}
