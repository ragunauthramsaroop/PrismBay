import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {currentPublicProducts,refresh,publicRules} from "./top15-real-source-sync.mjs";

const html=fs.readFileSync(new URL("../storefront/top-15/index.html",import.meta.url),"utf8");
const review=JSON.parse(fs.readFileSync(new URL("../growth-reports/cj-worker-review.json",import.meta.url),"utf8"));
const research=JSON.parse(fs.readFileSync(new URL("../config/top15-merchandising.json",import.meta.url),"utf8"));
const real=currentPublicProducts(review);
const count=(html.match(/<article class="product" data-category=/g)||[]).length;

test("public page is synchronized to authenticated CJ inventory, not a product-idea board",()=>{
 assert.equal(research.candidates.length,15,"The unreleased 15-item research set may remain internal");
 assert.equal(count,real.length,"Never publish a product without direct supplier variant evidence");
 assert.ok(count<=publicRules.length);
 assert.equal(html,refresh(html,review).html,"New supplier evidence must not silently leave stale listings on the public page");
 assert.doesNotMatch(html,/Illustrative symbol|<div class="product-art"|class="art-[1-5]"/);
 assert.doesNotMatch(html,/See all 15 picks|Showing 15 products|Explore the Top 15 picks/);
 assert.match(html,/No physical-product orders or payments are accepted on this page/);
 assert.match(html,/Supplier screening last recorded:/);
 assert.match(html,/Product photographs are intentionally omitted until legitimate rights/i);
});
test("every visible physical item has an authentic CJ variant and its true supplier description",()=>{
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

test("old pet grooming and standing steamer matches do not reappear in public source",()=>{
 const checkedAt=new Date().toISOString();
 const rows=[
  {slug:"pethair",observedProduct:"Pets Comb Brush Massage Cleaning Remove Hair Comb Pet Products",observedSupplierSku:"CJYD2247348",observedVariantSku:"CJYD224734802BY",independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,observedAt:checkedAt},
  {slug:"garment-steamer",observedProduct:"Standing Garment Steamer",observedSupplierSku:"CJFU2319140",observedVariantSku:"CJFU231914001AZ",independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,observedAt:checkedAt},
  {slug:"screen-protector",observedProduct:"Mobile Phone Tempered Glass Screen Protector",observedSupplierSku:"CJPB2377299",observedVariantSku:"CJPB237729905EV",independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,observedAt:checkedAt}
 ];
 assert.deepEqual(currentPublicProducts({checkedAt,authenticationVerified:true,candidates:rows}).map(x=>x.slug),["screen-protector"]);
 assert.ok(publicRules.every(x=>x.slug!=="pethair"));
});

test("public supplier cards fail closed without authenticated, fresh, dated evidence",()=>{
 const now=Date.now();
 const iso=offset=>new Date(now+offset).toISOString();
 const candidate={
  slug:"garment-steamer",
  observedProduct:"USB Handheld Garment Steamer Household Portable Electric Iron Small Fabulous Clothes Ironing Equipment",
  observedSupplierSku:"CJYD2458440",
  observedVariantSku:"CJYD245844002BY",
  independentIdentityMatch:true,
  variantStockVerified:true,
  freightEstimateVerified:true,
  observedAt:iso(0)
 };
 const report={checkedAt:iso(0),authenticationVerified:true,candidates:[candidate]};
 assert.deepEqual(currentPublicProducts(report).map(x=>x.slug),["garment-steamer"]);
 assert.deepEqual(currentPublicProducts({...report,authenticationVerified:false}),[]);
 assert.deepEqual(currentPublicProducts({...report,authenticationVerified:undefined}),[]);
 assert.deepEqual(currentPublicProducts({...report,checkedAt:iso(10*60000)}),[]);
 assert.deepEqual(currentPublicProducts({...report,checkedAt:iso(-37*3600000)}),[]);
 assert.deepEqual(currentPublicProducts({...report,candidates:[{...candidate,observedAt:undefined}]}),[]);
 assert.deepEqual(currentPublicProducts({...report,candidates:[{...candidate,observedAt:iso(10*60000)}]}),[]);
 assert.deepEqual(currentPublicProducts({...report,candidates:[{...candidate,observedAt:iso(-31*3600000)}]}),[]);
});
