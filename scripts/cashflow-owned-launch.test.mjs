import test from 'node:test';
import assert from 'node:assert/strict';
import { CASHFLOW_GUIDE_URL, CASHFLOW_CHECKOUT_URL, CASHFLOW_PRODUCT_URL, CASHFLOW_PRICE_USD, buildCashflowBuyerPage } from './cashflow-owned-launch.mjs';
import {buildHub,ownedSalesUrls} from './owned-sales-page-worker.mjs';
import {mergeSitemap} from './sales-sitemap-sync.mjs';

test('cashflow product landing page has verified $5.99 one-time payment link and canonical',()=>{
 const html=buildCashflowBuyerPage();
 assert.equal(CASHFLOW_PRICE_USD,5.99);
 assert.match(html,/Cash Flow Tracker Excel Template/);
 assert.ok(html.includes('rel="canonical" href="'+CASHFLOW_GUIDE_URL+'"'));
 assert.ok(html.includes(CASHFLOW_CHECKOUT_URL));
 assert.ok(html.includes(CASHFLOW_PRODUCT_URL));
 assert.ok(html.includes('$5.99'));
 assert.ok(html.includes('One-time payment'));
 assert.match(html,/application\/ld\+json/);
 assert.match(html,/schema.org\/Product|schema.org/);
 assert.match(html,/"price":"5.99"/);
 assert.match(html,/300 dated transaction entries/);
 assert.match(html,/\$3,730\.00/);
 assert.match(html,/Not accounting, tax or financial advice/);
 assert.match(html,/fictional figures/i);
 assert.doesNotMatch(html,/guaranteed income|best seller|limited inventory|verified customers|only \d+ left/i);
 assert.doesNotMatch(html,/(sk_live_|rk_live_|whsec_)/);
});
test('buyer guide hub prominently features new affordable offer while preserving executive catalog',()=>{
 const hub=buildHub();
 const starter=hub.indexOf('cash-flow-tracker-spreadsheet.html');
 const exec=hub.indexOf('executive-intelligence-bundle.html');
 assert.ok(starter>=0 && exec>starter);
 assert.ok(hub.includes('Cashflow Studio'));
 assert.ok(hub.includes('stakeholder-mapping-toolkit.html'));
 assert.equal(ownedSalesUrls().filter(x=>x===CASHFLOW_GUIDE_URL).length,1);
 assert.equal(ownedSalesUrls().length,7);
});
test('organic sitemap includes the low-cost buyer page exactly once',()=>{
 const xml='<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://clean.prismbayai.com/</loc></url></urlset>';
 const one=mergeSitemap(xml,'2026-10-31');
 const two=mergeSitemap(one,'2026-11-01');
 for(const x of [one,two])assert.equal(x.split('<loc>'+CASHFLOW_GUIDE_URL+'</loc>').length-1,1);
});
