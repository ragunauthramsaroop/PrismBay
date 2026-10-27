import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const site='https://clean.prismbayai.com/top-15/';
const intake='https://prismbay-clean-global.floot.app';
async function request(url,options={}){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});
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
import {currentPublicProducts} from './top15-real-source-sync.mjs';

const merch=JSON.parse(await fs.readFile('config/top15-merchandising.json','utf8'));
const review=JSON.parse(await fs.readFile('growth-reports/cj-worker-review.json','utf8'));
const alternate=JSON.parse(await fs.readFile('config/alternate-supplier-evidence.json','utf8'));
const approved=currentPublicProducts(review,alternate,merch);
assert.equal(merch.candidates.length,15);
const page=await request(site);
assert.equal(page.status,200,'Top 15 storefront must respond 200');
assert.match(page.headers.get('content-type')||'',/text\/html/);
const html=await page.text();
const visibleCount=(html.match(/class="product" data-category=/g)||[]).length;
assert.equal(visibleCount,approved.length,'Visible physical cards must match current supplier-verified records; zero is a valid safe state');
assert.equal((html.match(/class="ready-buy"/g)||[]).length,4,'Four digital purchase CTAs must remain available');
assert.equal((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length,4,'No unapproved physical Stripe checkout links');
assert.equal((html.match(/class="quote"/g)||[]).length,visibleCount,'Only approved supplier records may offer product inquiries');
assert.equal((html.match(/quote\?product=/g)||[]).length,visibleCount,'No stale physical inquiry links');
assert.equal((html.match(/href="mailto:support@prismbayai\.com\?subject=/g)||[]).length,0,'No mailto-only lead capture');
for(const item of approved){
  assert.ok(html.includes(item.sku),'Missing supplier SKU for '+item.slug);
  assert.ok(html.includes(item.variant),'Missing verified variant for '+item.slug);
  assert.ok(html.includes('quote?product='+item.slug+'&amp;utm_source=verified-catalog&amp;variantSku='+encodeURIComponent(item.variant)),
    'Missing evidence-linked inquiry route for '+item.slug);
}
assert.doesNotMatch(html,/World.s lowest price guaranteed|Most sold products in the world/,'No unsupported cheapest or sales ranking claims');
assert.match(html,/No physical-product orders or payments are accepted on this page/);
const quote=await request(intake+'/quote?product=crevice&utm_source=top15');
assert.equal(quote.status,200,'Product-specific inquiry route must respond 200');
const inbox=await request(intake+'/_api/quote-inbox');
assert.equal(inbox.status,401,'Anonymous access to private lead inbox must be denied');
const download=await request(intake+'/_api/digital-download?key=invalid');
assert.equal(download.status,403,'Invalid paid-download key must be rejected');
const invalid=await request(intake+'/_api/quote-interest',{
 method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({email:'invalid',zip:'invalid',productSlug:'unknown',agreedToContact:false})
});
assert.equal(invalid.status,400,'Invalid or nonconsensual leads must not be stored');
const report={checkedAt:new Date().toISOString(),storefront:'ok',productCount:visibleCount,supplierEvidenceCount:approved.length,consentBasedProductLinks:visibleCount,
 digitalPurchaseLinks:4,privateLeadInbox:'protected',invalidDigitalDownloads:'rejected',
 invalidInquiries:'rejected',realPaymentVerification:'not_executed',physicalCheckoutVerification:'blocked_by_supplier_gates'};
console.log(JSON.stringify(report,null,2));
