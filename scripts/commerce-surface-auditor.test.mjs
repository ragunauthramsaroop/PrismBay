import test from 'node:test';
import assert from 'node:assert/strict';
import {auditProductsPayload,auditMerchantXml,auditSitemapXml,auditRobots,auditLegacySnapshot,auditCanonicalRetailSnapshot,auditCommerceSurfaces} from './commerce-surface-auditor.mjs';

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


test('legacy audit blocks supplier URLs in CSS, srcset, lazy attributes, video posters and JSON-LD',()=>{
 const urls=[
  '<style>.hero{background-image:url(https://oss-cf.cjdropshipping.com/p.jpg)}</style>',
  '<img srcset="https://shopifyfile.oss-us-west-1.aliyuncs.com/p.webp 2x">',
  '<img data-src="https://cc-west-usa.oss-us-west-1.aliyuncs.com/p.jpg">',
  '<video poster="https://oss-cf.cjdropshipping.com/p.jpg"></video>',
  '<script type="application/ld+json">{"image":"https:\\\/\\\/oss-cf.cjdropshipping.com/p.jpg"}</script>',
  '<div style="background:url(//oss-cf.cjdropshipping.com/p.jpg)"></div>'
 ];
 for(const html of urls){
  const audit=auditLegacySnapshot({
   pages:[{path:'/candidate',ok:true,status:200,contentType:'text/html',text:html}],
   feed:{ok:false,status:404}
  });
  assert.equal(audit.safe,false,html);
  assert.equal(audit.thirdPartyMediaPageCount,1,html);
  assert.ok(audit.issues.includes('legacy_third_party_media_rights_unverified'),html);
 }
});

test('legacy audit does not mistake original local artwork or plain supplier-domain text for a media URL',()=>{
 const audit=auditLegacySnapshot({
  pages:[{path:'/',ok:true,status:200,contentType:'text/html',
    text:'<img src="/assets/garment-care-original.svg"><p>Supplier host: oss-cf.cjdropshipping.com</p>'}],
  feed:{ok:false,status:404}
 });
 assert.equal(audit.thirdPartyMediaPageCount,0);
 assert.equal(audit.safe,true);
});

test('product feed rejects missing destinations and malformed or negative prices',()=>{
 const feed=auditProductsPayload([
  {id:'no-url',title:'Missing URL',price:12.99},
  {id:'negative',title:'Negative Price',price:'-12.99',link:'https://example.com/negative'},
  {id:'nonsense',title:'Malformed Price',price:'promo 12.99',link:'https://example.com/nonsense'},
  {id:'valid',title:'Valid USD Price',price:'USD 12.99',link:'https://example.com/valid'},
 ]);
 assert.equal(feed.invalidProductCount,3);
 assert.ok(feed.products[0].issues.includes('missing_link'));
 assert.ok(feed.products[1].issues.includes('missing_or_invalid_price'));
 assert.ok(feed.products[2].issues.includes('missing_or_invalid_price'));
 assert.equal(feed.products[3].price,12.99);
 assert.deepEqual(feed.products[3].issues,[]);
});

test('duplicate product IDs block technical distribution readiness even when rows otherwise validate',async()=>{
 const originalFetch=globalThis.fetch;
 const feed={products:[
  {id:'same',title:'Brush A',price:12,link:'https://example.com/a'},
  {id:'same',title:'Brush B',price:13,link:'https://example.com/b'},
 ]};
 const fixtures={
  '/products.json':JSON.stringify(feed),
  '/merchant-feed.xml':'<rss><channel><item><g:title>Brush</g:title><g:price>12 USD</g:price><g:link>https://example.com/a</g:link></item></channel></rss>',
  '/sitemap.xml':'<urlset><url><loc>https://example.com/a</loc></url></urlset>',
  '/robots.txt':'User-agent: *\\nAllow: /\\nSitemap: https://example.com/sitemap.xml\\n',
 };
 try {
  globalThis.fetch=async url=>{
   const path=new URL(url).pathname;
   return new Response(fixtures[path]??'Not Found',{status:path in fixtures?200:404,headers:{'content-type':'text/plain'}});
  };
  const report=await auditCommerceSurfaces('https://example.com');
  assert.equal(report.products.invalidProductCount,0);
  assert.deepEqual(report.products.duplicateIds,['same']);
  assert.ok(report.issues.includes('duplicate_product_ids'));
  assert.equal(report.technicalSurfaceReady,false);
  assert.equal(report.freeDistributionReady,false);
 } finally {globalThis.fetch=originalFetch;}
});

test('canonical retail audit detects unapproved physical claims and educational YouTube contamination',()=>{
 const report=auditCanonicalRetailSnapshot({
  pages:[
   {path:'/',ok:true,text:'<html><script type="application/ld+json">{"@type":"Product"}</script><img src="https://oss-cf.cjdropshipping.com/p.jpg"></html>'},
   {path:'/shipping.html',ok:true,text:'<html>Supplier stock and delivery timing are confirmed after payment. PrismBay Clean currently accepts checkout and delivery only for eligible addresses.</html>'},
   {path:'/top-15/',ok:true,text:'<html>"numberOfItems":0 Exact supplier identity and stock were checked</html>'}
  ],
  manifest:{products:[{slug:'unverified'}]},
  queue:{items:[{offerType:'physical',channel:'youtube',status:'ready_for_authorized_scheduler'}]}
 });
 assert.equal(report.safe,false);
 assert.equal(report.issues.length,8);
 assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'));
 assert.equal(report.physicalManifestCount,1);
});
test('canonical retail audit preserves digital-only clean releases',()=>{
 const report=auditCanonicalRetailSnapshot({
  pages:[{path:'/',ok:true,text:'<html>Digital tools available</html>'},{path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},{path:'/top-15/',ok:true,text:'<html>No approved physical offers</html>'}],
  manifest:{products:[]},queue:{items:[{offerType:'digital',channel:'tiktok',status:'draft',publishAllowed:false}]}
 });
 assert.equal(report.safe,true);
 assert.equal(report.physicalQueuedCount,0);
});
test('canonical retail audit rejects digital sales entries targeting educational YouTube even as drafts',()=>{
 const report=auditCanonicalRetailSnapshot({
  pages:[{path:'/',ok:true,text:'<html>Digital offers</html>'},{path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},{path:'/top-15/',ok:true,text:'<html>Zero physical offers</html>'}],
  manifest:{products:[]},
  queue:{items:[{offerType:'digital',channel:'youtube',status:'draft',publishAllowed:false}]}
 });
 assert.equal(report.safe,false);
 assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'));
 assert.equal(report.physicalQueuedCount,0);
});
test('canonical retail audit rejects commercial YouTube entries with missing offer classification',()=>{
 const report=auditCanonicalRetailSnapshot({
  pages:[{path:'/',ok:true,text:'<html>Digital offers</html>'},{path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},{path:'/top-15/',ok:true,text:'<html>Zero physical offers</html>'}],
  manifest:{products:[]},
  queue:{items:[{channel:'youtube',commercialContentOwnBrand:true,status:'draft'}]}
 });
 assert.equal(report.safe,false);
 assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'));
});
test('canonical retail audit treats missing pages and media reports as unknown',()=>{
 const report=auditCanonicalRetailSnapshot();
 assert.equal(report.safe,false);
 assert.ok(report.issues.includes('canonical_uninspected:/'));
 assert.ok(report.issues.includes('canonical_retail_manifest_uninspected'));
 assert.ok(report.issues.includes('canonical_social_queue_uninspected'));
});

test('retail queue rejects unclassified YouTube routes even without commercial flags',()=>{
 const report=auditCanonicalRetailSnapshot({
  pages:[{path:'/',ok:true,text:'<html>Digital tools</html>'},{path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},{path:'/top-15/',ok:true,text:'<html>No physical offers</html>'}],
  manifest:{products:[]},
  queue:{items:[{channel:'youtube',status:'draft',publishAllowed:false}]}
 });
 assert.equal(report.safe,false);
 assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'));
});


test('retail queue blocks YouTube aliases and alternate destination fields',()=>{
 const unsafe=[
  {channel:'youtube_shorts'}, {channel:'YouTube Shorts'},
  {channel:'yt'}, {platform:'YouTube'}, {destinationPlatform:'youtube'},
  {targetChannel:'@PrismBayAI'}, {channelId:'UCw2hs85TzIpdKwJtG-BSxzQ'},
  {destinationUrl:'https://www.youtube.com/shorts/example'},
  {destinationUrl:'https://youtu.be/example'}
 ];
 const pages=[{path:'/',ok:true,text:'<html>Digital tools</html>'},
  {path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},
  {path:'/top-15/',ok:true,text:'<html>No physical offers</html>'}];
 for(const entry of unsafe){
  const report=auditCanonicalRetailSnapshot({pages,manifest:{products:[]},
   queue:{items:[{offerType:'digital',status:'draft',publishAllowed:false,...entry}]}});
  assert.equal(report.safe,false,JSON.stringify(entry));
  assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'),JSON.stringify(entry));
 }
 const clean=auditCanonicalRetailSnapshot({pages,manifest:{products:[]},
  queue:{items:[{channel:'tiktok',destinationUrl:'https://clean.prismbayai.com/top-15/',
   offerType:'digital',status:'draft',publishAllowed:false}]}});
 assert.equal(clean.safe,true);
});

test('retail queue rejects YouTube route case and whitespace variants',()=>{
 for(const channel of ['YouTube',' YOUTUBE ','youtube ']){
  const report=auditCanonicalRetailSnapshot({
   pages:[{path:'/',ok:true,text:'<html>Digital tools</html>'},{path:'/shipping.html',ok:true,text:'<html>Physical checkout unavailable</html>'},{path:'/top-15/',ok:true,text:'<html>No physical offers</html>'}],
   manifest:{products:[]},queue:{items:[{channel,offerType:'digital',status:'draft',publishAllowed:false}]}
  });
  assert.equal(report.safe,false,channel);
  assert.ok(report.issues.includes('canonical_educational_youtube_retail_contamination'),channel);
 }
});
