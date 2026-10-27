import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {currentPublicProducts,refresh,publicRules} from "./top15-real-source-sync.mjs";

const html=fs.readFileSync(new URL("../storefront/top-15/index.html",import.meta.url),"utf8");
const review=JSON.parse(fs.readFileSync(new URL("../growth-reports/cj-worker-review.json",import.meta.url),"utf8"));
const research=JSON.parse(fs.readFileSync(new URL("../config/top15-merchandising.json",import.meta.url),"utf8"));
const alternative=JSON.parse(fs.readFileSync(new URL("../config/alternate-supplier-evidence.json",import.meta.url),"utf8"));
const real=currentPublicProducts(review,alternative,research);
const count=(html.match(/<article class="product" data-category=/g)||[]).length;

test("public page is synchronized to authenticated CJ inventory, not a product-idea board",()=>{
 assert.equal(research.candidates.length,15,"The unreleased 15-item research set may remain internal");
 assert.equal(count,real.length,"Never publish a product without direct supplier variant evidence");
 assert.ok(count<=publicRules.length+alternative.candidates.length);
 assert.equal(html,refresh(html,review,alternative,research).html,"New supplier evidence must not silently leave stale listings on the public page");
 assert.doesNotMatch(html,/Illustrative symbol|<div class="product-art"|class="art-[1-5]"/);
 assert.doesNotMatch(html,/See all 15 picks|Showing 15 products|Explore the Top 15 picks/);
 assert.match(html,/No physical-product orders or payments are accepted on this page/);
 assert.match(html,/Supplier screening last recorded:/);
 assert.match(html,/Product photographs are intentionally omitted until legitimate rights/i);
});
test("every visible physical item has an authentic supplier variant and its true source description",()=>{
 for(const item of real){
  assert.ok(html.includes(item.name),item.slug+" is missing");
  assert.ok(html.includes(item.sku),item.slug+" has no authentic supplier SKU");
  assert.ok(html.includes(item.variant),item.slug+" has no physically stocked variant SKU");
  assert.ok(html.includes(item.originalName.replace(/&/g,"&amp;")),item.slug+" supplier listing missing");
  assert.ok(html.includes("quote?product="+item.slug+"&amp;utm_source=verified-catalog"),item.slug+" does not open the correct inquiry");
 }
 assert.equal((html.match(/class="quote"/g)||[]).length,count);
 assert.equal((html.match(/quote\?product=/g)||[]).length,count);
});
test("unapproved physical purchases are impossible through the catalog; four digital payments stay live",()=>{
 assert.equal((html.match(/class="ready-buy"/g)||[]).length,4);
 assert.equal((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length,4);
 for(const link of [
  "4gM8wQ1v8dOj45Ib8QgnK0q","bJe7sMgq25hNcCe6SAgnK0s",
  "4gMeVe8XA5hNfOq2CkgnK0r","eVqfZi5Lo7pV31Ea4MgnK0t"
 ])assert.ok(html.includes(link));
 assert.doesNotMatch(html,/World.s lowest price guaranteed|Most sold products in the world/);
});


test("CJ public records require authenticated fresh evidence and matching supplier variants",()=>{
 const iso=offset=>new Date(Date.now()+offset).toISOString();
 const candidate={
  slug:"screen-protector",observedProduct:"Mobile Phone Tempered Glass Screen Protector",
  observedSupplierSku:"CJPB2377299",observedVariantSku:"CJPB237729905EV",
  independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,observedAt:iso(0)
 };
 const evidence={checkedAt:iso(0),authenticationVerified:true,candidates:[candidate]};
 assert.deepEqual(currentPublicProducts(evidence).map(x=>x.slug),["screen-protector"]);
 assert.deepEqual(currentPublicProducts({...evidence,authenticationVerified:false}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,authenticationVerified:undefined}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,checkedAt:iso(10*60000)}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,checkedAt:iso(-37*3600000)}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,candidates:[{...candidate,observedAt:null}]}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,candidates:[{...candidate,observedAt:iso(-31*3600000)}]}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,candidates:[{...candidate,observedVariantSku:"CJYD245844002BY"}]}),[]);
 assert.deepEqual(currentPublicProducts({...evidence,candidates:[{...candidate,observedProduct:"Camera Lens Replacement Adhesive"}]}),[]);
});
test("an authenticated CJ report with zero verified variants publishes zero CJ physical cards",()=>{
 assert.equal(review.authenticationVerified,true);
 assert.equal(review.verifiedVariantCount,0);
 assert.equal(currentPublicProducts(review).length,0);
 assert.equal((html.match(/<article class="product" data-category=/g)||[]).length,0);
});

test("empty physical catalog presents truthful zero-stock and digital-delivery disclosures",()=>{
 if(count!==0)return;
 assert.match(html,/A zero count means no current records meet the display criteria\./);
 assert.match(html,/No physical checkout is available\./);
 assert.match(html,/Order-specific delivery verification is still in progress\./);
 assert.doesNotMatch(html,/Exact supplier identity and stock were checked|These records match supplier-product identity/);
 assert.equal((html.match(/class="ready-buy"/g)||[]).length,4);
});
