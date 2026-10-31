import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {currentPublicProducts} from './top15-real-source-sync.mjs';

const site='https://clean.prismbayai.com/top-15/';
const home='https://clean.prismbayai.com/';
const intake='https://prismbay-clean-global.floot.app';
const load=async(path)=>JSON.parse(await fs.readFile(path,'utf8'));
async function request(url,options={}){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{...options,headers:{'Cache-Control':'no-cache',...(options.headers||{})},signal:AbortSignal.timeout(25000)});
   if(response.status>=500&&attempt<2)throw new Error('temporary upstream '+response.status);
   return response;
  }catch(error){
   lastError=error;
   if(attempt===2)throw error;
   await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));
  }
 }
 throw lastError;
}
const [merch,review,alt]=await Promise.all([
 load('config/top15-merchandising.json'),
 load('growth-reports/cj-worker-review.json'),
 load('config/alternate-supplier-evidence.json')
]);
assert.equal(merch.candidates.length,15,'Internal research shortlist still contains 15 ideas');
// Public listing count can shrink to ZERO when all stock evidence expires.
// Never substitute fifteen speculative goods merely to hit a quota.
const permitted=currentPublicProducts(review,alt,merch);
const permittedBySlug=new Map(permitted.map(x=>[x.slug,x]));
const page=await request(site);
assert.equal(page.status,200,'Storefront must respond 200');
assert.match(page.headers.get('content-type')||'',/text\/html/);
const html=await page.text();
const cards=(html.match(/<article class="product" data-category=/g)||[]).length;
assert.ok(cards<=permitted.length,'Public catalog includes more products than currently verified source permits');
assert.equal((html.match(/class="quote"/g)||[]).length,cards,'Every actual physical listing has its own quote CTA');
assert.equal((html.match(/class="ready-buy"/g)||[]).length,4,'Preserve four digital purchase CTAs');
assert.equal((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length,4,'Exactly four hosted digital checkout links');
assert.doesNotMatch(html,/Illustrative symbol|class="product-art"|See all 15 picks|Showing 15 products|Explore the Top 15 picks/,'No fake physical cards allowed');
assert.doesNotMatch(html,/<article[^>]+class="product"[^>]*>[\s\S]*?<img[^>]+src="https:\/\/oss-cf\.cjdropshipping\.com/i,'Do not embed unlicensed supplier photographs');
assert.match(html,/No physical-product orders or payments are accepted on this page/);
const publicLinks=[...html.matchAll(/href="https:\/\/prismbay-clean-global\.floot\.app\/quote\?product=([^&"]+)/g)].map(x=>x[1]);
assert.equal(publicLinks.length,cards,'All public physical product links must route through quote capture');
for(const slug of publicLinks){
 const proof=permittedBySlug.get(slug);
 assert.ok(proof,'Unexpected unsupported physical SKU '+slug);
 assert.ok(html.includes(proof.sku),'Authentic supplier SKU not displayed for '+slug);
 assert.ok(html.includes(proof.variant),'Exact supplier variant SKU not displayed for '+slug);
}
for(const url of [
 'https://buy.stripe.com/4gM8wQ1v8dOj45Ib8QgnK0q',
 'https://buy.stripe.com/bJe7sMgq25hNcCe6SAgnK0s',
 'https://buy.stripe.com/4gMeVe8XA5hNfOq2CkgnK0r',
 'https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t'
])assert.ok(html.includes(url),'Existing hosted checkout link removed: '+url);
const homepage=await request(home);
assert.equal(homepage.status,200,'Storefront homepage must respond 200');
const homeHtml=await homepage.text();
assert.doesNotMatch(homeHtml,/oss-cf\.cjdropshipping\.com\/product/,'Homepage has no rights-cleared supplier image');
assert.doesNotMatch(homeHtml,/"@type":"Product","name":"Portable Garment Steamer"/,'No outdated physical Product structured data');
assert.ok(homeHtml.includes('https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t'),'Featured purchasable digital bundle remains available');
// Historical product links and guide prices also require withdrawal. Checking only
// the legacy product route misses misleading links retained in indexed guides.
const oldPhysicalRoute=/href\\s*=\\s*["'][^"']*\\/garment-steamer\\/(?:\\?[^"']*)?["']/i;
assert.doesNotMatch(homeHtml,oldPhysicalRoute,'Homepage must not link to withdrawn physical listing');
const legacyGuidePaths=[
 'guides/garment-steamer-vs-iron.html',
 'guides/how-to-use-a-garment-steamer.html',
 'guides/portable-garment-steamer.html',
 'guides/travel-garment-steamer-guide.html'
];
const legacyGuideResponses=await Promise.all(legacyGuidePaths.map(path=>request(home+path)));
for(let i=0;i<legacyGuidePaths.length;i++){
 const path=legacyGuidePaths[i],response=legacyGuideResponses[i];
 assert.equal(response.status,200,'Historical buyer guide must respond 200: '+path);
 const guideHtml=await response.text();
 assert.doesNotMatch(guideHtml,oldPhysicalRoute,'Historical guide links to withdrawn physical offer: '+path);
 assert.doesNotMatch(guideHtml,/\\b(?:USD|US\\$)\\s*\\d+(?:\\.\\d{2})?\\b|(?:listed\\s+(?:price|at)|priced\\s+at)\\s*[:\\-]?\\s*\\$\\s*\\d+(?:\\.\\d{2})?/i,
  'Historical guide retains unsupported product price: '+path);
}
// Legacy routes and catalog feeds require independent trust checks. A clean
// /top-15/ page alone does not prove old product offers were withdrawn.
const legacy=await request(home+'garment-steamer/');
assert.ok([200,404,410].includes(legacy.status),'Unexpected legacy product route status');
if(legacy.status===200){
 const legacyHtml=await legacy.text();
 assert.match(legacyHtml,/<meta[^>]*name=["']robots["'][^>]*content=["']noindex,nofollow["']/i,
  'Legacy product route must be excluded from indexing');
 assert.match(legacyHtml,/not currently offered/i,'Legacy product route must show an unavailable notice');
 // A changed price or a different image host must not evade the withdrawal gate.
 assert.doesNotMatch(legacyHtml,/(?:\b(?:USD|US\$)\s*\d+(?:\.\d{2})?|\$\s*\d+(?:\.\d{2})?|\bpriceUsd\b|product:price|<img\b|<picture\b|<form\b|<video\b|<script\b[^>]*type=["']application\/ld\+json["']|schema\.org\/Product|buy\.stripe\.com|add to cart|buy now)/i,
  'Legacy route must not contain any physical offer price, supplier image, form, video, Product schema or checkout');
}
const legacyCatalog=await request(home+'products.json');
assert.equal(legacyCatalog.status,200,'Legacy physical catalog JSON must remain accessible');
const legacyCatalogJson=await legacyCatalog.json();
assert.ok(Array.isArray(legacyCatalogJson.products),'Legacy physical catalog must contain a products array');
assert.equal(legacyCatalogJson.products.length,0,'Legacy physical catalog must not advertise unverified products');
const publicSitemap=await request(home+'sitemap.xml');
assert.equal(publicSitemap.status,200,'Public sitemap must respond 200');
assert.doesNotMatch(await publicSitemap.text(),/<loc>https:\/\/clean\.prismbayai\.com\/garment-steamer\/<\/loc>/i,
 'Legacy unverified physical product route must not remain in the sitemap');
const quote=await request(intake+'/quote?product=screen-protector&utm_source=verified-catalog');
assert.equal(quote.status,200,'Consent-backed product inquiry route');
const inbox=await request(intake+'/_api/quote-inbox');
assert.equal(inbox.status,401,'Private customer inquiry inbox must remain anonymous-protected');
const invalidDownload=await request(intake+'/_api/digital-download?key=invalid');
assert.equal(invalidDownload.status,403,'Invalid download secret must be rejected');
const malformedLead=await request(intake+'/_api/quote-interest',{
 method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({email:'invalid',zip:'invalid',productSlug:'unknown',agreedToContact:false})
});
assert.equal(malformedLead.status,400,'Invalid lead should not be saved');
console.log(JSON.stringify({
 checkedAt:new Date().toISOString(),storefront:'ok',homepage:'ok',
 realPhysicalProductsShown:cards,eligibleSupplierRecords:permitted.length,placeholderProducts:0,
 consentBasedQuoteLinks:publicLinks.length,digitalPurchaseLinks:4,
 leadPrivacy:'anonymous access denied',invalidDownloads:'rejected',malformedInquiries:'rejected',
 authenticatedSupplierPaymentAndFulfillment:'not yet approved',
 realSales:'not asserted; Stripe account verification required'
},null,2));
