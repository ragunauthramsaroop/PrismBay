import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("public/digital/cashflow-studio");
const read = (name) => readFileSync(path.join(root,name),"utf8");
const product = read("index.html");
const receipt = read("thank-you.html");
const terms = read("purchase-information.html");
const css = read("style.css");
const parent = readFileSync("public/digital/index.html","utf8");
const checkout = "https://buy.stripe.com/eVqaEYddQ6lRgSu1yggnK0v";
const canonical = "https://clean.prismbayai.com/digital/cashflow-studio/";
const endpoint = "https://prismbay-clean-global.floot.app/_api/digital-paid-download";
test("premium product page is complete, accurate and accessible",()=>{
  for(const phrase of ["PrismBay Cashflow Studio v1","$5.99","12-month","300","One-time","STUDYSMARTZ LLC","support@prismbayai.com","fictional","Stripe-hosted","purchase-information.html","viewport","lang=\"en\"","application/ld+json","class=\"skip\""]){
    assert.ok(product.includes(phrase),"missing "+phrase);
  }
  assert.equal(product.split(checkout).length-1,3,"expect three checkout CTAs including schema offer");
  assert.ok(product.includes('<link rel="canonical" href="'+canonical+'">'));
  assert.ok(parent.includes('href="/digital/cashflow-studio/"'));
  assert.ok(product.includes("not a live spreadsheet screenshot"));
  assert.ok(!/<script\b(?![^>]*application\/ld\+json)[^>]*src=/i.test(product));
  for(const i of ["index.html","thank-you.html","purchase-information.html","style.css"])assert.ok(existsSync(path.join(root,i)));
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
});
test("receipt page does not treat query string as payment proof",()=>{
  assert.match(receipt,/noindex,nofollow/);
  assert.match(receipt,/referrer" content="no-referrer/);
  assert.ok(receipt.includes("const valid = /^cs_live_"));
  assert.ok(receipt.includes("This page does not confirm a successful charge"));
  assert.ok(receipt.includes(endpoint));
  assert.ok(receipt.includes("session_id="));
  assert.ok(receipt.includes("window.history.replaceState"));
  assert.ok(!receipt.includes('alert("Payment successful'));
});
test("purchase and privacy disclosures exist with no fabricated assurance",()=>{
  for(const s of ["STUDYSMARTZ LLC","refund","Stripe","support@prismbayai.com","consumer protection","one-time","No blanket promise"])assert.match(terms,new RegExp(s,"i"));
  for(const page of [product,terms,receipt]){
    assert.doesNotMatch(page,/sk_live_|rk_live_|whsec_|Bearer\s+\S+/);
    assert.doesNotMatch(page,/guaranteed results|10,000\+ happy customers|five-star rating|verified buyer review|best selling in the world/i);
  }
});
test("no paid files in the GitHub Pages public tree",()=>{
 for(const paid of ["PrismBay_Cashflow_Studio_v1.xlsx","PrismBay_Cashflow_Studio_v1.zip","LICENSE.txt"])assert.ok(!existsSync(path.join(root,paid)));
});
