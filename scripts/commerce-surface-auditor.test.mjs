import test from 'node:test';
import assert from 'node:assert/strict';
import {auditProductsPayload,auditMerchantXml,auditSitemapXml,auditRobots,auditLegacySnapshot} from './commerce-surface-auditor.mjs';

test('valid product feed requires identity title and positive price',()=>{
 const audit=auditProductsPayload({products:[{id:'p1',title:'Brush',price:12.99,link:'https://example.com/p1',availability:'in_stock'}]});
 assert.equal(audit.productCount,1);
 assert.equal(audit.invalidProductCount,0);
});

test('invalid product feed records missing commercial fields',()=>{
 const audit=auditProductsPayload([{id:'p1',title:'Brush',price:0,link:'http://example.com/p1'}]);
 assert.equal(audit.invalidProductCount,1);
 assert.ok(audit.products[0].issues.includes('missing_or_invalid_price'));
 assert.ok(audit.products[0].issues.includes('non_https_link'));
});

test('merchant feed requires items with title price and link',()=>{
 const good=auditMerchantXml('<rss><channel><item><g:title>Brush</g:title><g:price>12.99 USD</g:price><g:link>https://x</g:link></item></channel></rss>');
 assert.equal(good.valid,true);
 const bad=auditMerchantXml('<rss><channel><item><g:title>Brush</g:title></item></channel></rss>');
 assert.equal(bad.valid,false);
 assert.ok(bad.issues.includes('merchant_feed_missing_prices'));
});

test('sitemap and robots fail closed on discoverability defects',()=>{
 const sitemap=auditSitemapXml('<urlset><url><loc>https://example.com/</loc></url></urlset>');
 assert.equal(sitemap.valid,true);
 const robots=auditRobots('User-agent: *\nDisallow: /\n');
 assert.equal(robots.valid,false);
 assert.ok(robots.issues.includes('robots_blocks_entire_site'));
});

test('legacy storefront audit flags direct checkout, sale schema, supplier imagery and unsupported stock feed',()=>{
 const html='<html><img src="https://shopifyfile.oss-us-west-1.aliyuncs.com/unsafe.jpg"><a href="https://buy.stripe.com/abc123">Pay</a><script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer"}}</script></html>';
 const result=auditLegacySnapshot({
  pages:[{path:'/',ok:true,status:200,contentType:'text/html',text:html}],
  feed:{ok:true,status:200,text:'id\tavailability\timage_link\nsku1\tin_stock\thttps://shopifyfile.oss-us-west-1.aliyuncs.com/a.jpg'}
 });
 assert.equal(result.safe,false);
 assert.equal(result.directCheckoutLinkCount,1);
 assert.equal(result.saleSchemaPageCount,1);
 assert.equal(result.inStockFeedRowCount,1);
 assert.equal(result.thirdPartyFeedImageRowCount,1);
 assert.ok(result.issues.includes('legacy_direct_physical_checkout_exposed'));
 assert.ok(result.issues.includes('legacy_unsupported_in_stock_feed_claims'));
});

test('legacy audit accepts explicit 404 or 410 decommissioning without inventing checkout clearance',()=>{
 const result=auditLegacySnapshot({
  pages:[{path:'/',ok:false,status:410},{path:'/scrubber.html',ok:false,status:404}],
  feed:{ok:false,status:404}
 });
 assert.equal(result.safe,true);
 assert.equal(result.decommissioned,true);
 assert.equal(result.directCheckoutLinkCount,0);
});

test('legacy audit treats network errors and unreadable media feed as unknown, not safe',()=>{
 const result=auditLegacySnapshot({
  pages:[{path:'/',ok:false,status:null}],
  feed:{ok:false,status:null}
 });
 assert.equal(result.safe,false);
 assert.ok(result.issues.includes('legacy_surface_inspection_incomplete'));
});

test('legacy audit fails closed when no pages were inspected',()=>{
 const result=auditLegacySnapshot({pages:[],feed:{ok:false,status:404}});
 assert.equal(result.safe,false);
 assert.equal(result.decommissioned,false);
 assert.ok(result.issues.includes('legacy_surface_inspection_incomplete'));
 assert.ok(result.unknownPathCount>0);
});
