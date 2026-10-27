import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../storefront/top-15/index.html',import.meta.url),'utf8');
const merch=JSON.parse(fs.readFileSync(new URL('../config/top15-merchandising.json',import.meta.url),'utf8'));
const permitted=new Map([
 ['pethair',{title:'Pet Grooming & Hair-Removal Comb',product:/\b(pet|pets|cat|dog)\b.*\b(comb|brush)\b.*\bhair\b/i}],
 ['garment-steamer',{title:'Standing Garment Steamer',product:/\bstanding\s+garment\s+steamer\b/i}],
 ['screen-protector',{title:'Tempered-Glass Phone Screen Protector',product:/\bmobile phone tempered glass screen protector\b/i}],
]);
const review=JSON.parse(fs.readFileSync(new URL('../growth-reports/cj-worker-review.json',import.meta.url),'utf8'));
const cards=[...html.matchAll(/<article class="product" data-category=/g)];

test('physical catalog excludes all speculative products and illustrative media',()=>{
 assert.equal(merch.candidates.length,15,'Private research shortlist may continue to hold 15 candidates');
 assert.equal(cards.length,3,'Only the three separately reviewed exact real CJ products may appear');
 assert.doesNotMatch(html,/Illustrative symbol|<div class="product-art"|PRODUCT 0\d|class="art-[1-5]"/,'Fake/placeholder imagery is not acceptable');
 assert.doesNotMatch(html,/See all 15 picks|Showing 15 products|Explore the Top 15 picks/);
 assert.match(html,/No physical-product orders or payments are accepted on this page/);
 assert.match(html,/Supplier screening last recorded:/);
 assert.match(html,/Photographs are intentionally omitted|photographs are intentionally omitted/i);
 assert.equal((html.match(/class="ready-buy"/g)||[]).length,4,'Four real digital purchase links preserved');
});
test('every public physical record must match real physically stocked CJ supplier variants',()=>{
 const seen=new Set();
 for(const [slug,rule] of permitted){
  const p=review.candidates.find(item=>item.slug===slug);
  assert.ok(p && p.independentIdentityMatch===true && p.variantStockVerified===true && p.freightEstimateVerified===true,slug+' lacks authentic supplier evidence');
  assert.match(p.observedProduct,rule.product,slug+' wrong type');
  assert.match(p.observedSupplierSku,/^CJ[A-Z0-9]{6,35}$/);
  assert.match(p.observedVariantSku,/^CJ[A-Z0-9]{6,35}$/);
  assert.ok(html.includes(rule.title),slug+' marketing title missing');
  assert.ok(html.includes(p.observedSupplierSku),slug+' exact supplier ID missing');
  assert.ok(html.includes(p.observedVariantSku),slug+' exact stock-verified variant missing');
  assert.ok(html.includes('quote?product='+slug+'&amp;utm_source=verified-catalog'),slug+' buyer routing missing');
  seen.add(slug);
 }
 assert.equal(seen.size,cards.length,'No additional undocumented public products permitted');
 assert.equal((html.match(/class="quote"/g)||[]).length,cards.length);
});
test('no unapproved physical checkout; existing digital payments preserved',()=>{
 assert.equal((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length,4);
 for(const link of ['4gM8wQ1v8dOj45Ib8QgnK0q','bJe7sMgq25hNcCe6SAgnK0s','4gMeVe8XA5hNfOq2CkgnK0r','eVqfZi5Lo7pV31Ea4MgnK0t'])assert.ok(html.includes(link));
 assert.equal((html.match(/quote\?product=/g)||[]).length,3);
 assert.doesNotMatch(html,/World.s lowest price guaranteed|Most sold products in the world/);
});
