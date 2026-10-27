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
