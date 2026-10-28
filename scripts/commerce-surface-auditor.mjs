import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function auditProductsPayload(payload) {
  const products=Array.isArray(payload)?payload:Array.isArray(payload?.products)?payload.products:[];
  const issues=[];
  if(!products.length) issues.push('products_feed_empty_or_unrecognized');
  const normalized=products.map((p,index)=>{
    const id=String(p?.id??p?.slug??p?.sku??'').trim();
    const title=String(p?.title??p?.name??'').trim();
    const link=String(p?.link??p?.url??p?.productUrl??'').trim();
    const rawPrice=p?.price?.value??p?.price??p?.amount;
    // Do not turn negative or malformed text prices into apparently valid offers.
    const priceText=typeof rawPrice==='string'?rawPrice.trim():null;
    const price=priceText===null?Number(rawPrice):
      (/^(?:USD\s*)?\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?(?:\s*USD)?$/i.test(priceText)
        ? Number(priceText.replace(/USD|\$|,/gi,'').trim()) : NaN);
    const availability=String(p?.availability??p?.stockStatus??'').trim();
    const rowIssues=[];
    if(!id) rowIssues.push('missing_id');
    if(!title) rowIssues.push('missing_title');
    if(!link) rowIssues.push('missing_link');
    else if(!/^https:\/\//i.test(link)) rowIssues.push('non_https_link');
    if(!Number.isFinite(price)||price<=0) rowIssues.push('missing_or_invalid_price');
    return {index,id:id||null,title:title||null,link:link||null,price:Number.isFinite(price)?price:null,availability:availability||null,issues:rowIssues};
  });
  const duplicateIds=normalized.filter((row,i,arr)=>row.id&&arr.findIndex(x=>x.id===row.id)!==i).map(x=>x.id);
  if(duplicateIds.length) issues.push('duplicate_product_ids');
  const invalid=normalized.filter(x=>x.issues.length);
  return {recognized:true,productCount:normalized.length,validProductCount:normalized.length-invalid.length,invalidProductCount:invalid.length,duplicateIds:[...new Set(duplicateIds)],issues,products:normalized};
}

export function auditMerchantXml(text='') {
  const value=String(text);
  const rss=/<rss\b/i.test(value)||/<feed\b/i.test(value);
  const itemCount=(value.match(/<(item|entry)\b/gi)||[]).length;
  const titleCount=(value.match(/<g:title\b|<title\b/gi)||[]).length;
  const priceCount=(value.match(/<g:price\b|<price\b/gi)||[]).length;
  const linkCount=(value.match(/<g:link\b|<link\b/gi)||[]).length;
  const issues=[];
  if(!rss) issues.push('merchant_feed_not_rss_or_atom');
  if(itemCount<1) issues.push('merchant_feed_has_no_items');
  if(itemCount>0&&titleCount<itemCount) issues.push('merchant_feed_missing_titles');
  if(itemCount>0&&priceCount<itemCount) issues.push('merchant_feed_missing_prices');
  if(itemCount>0&&linkCount<itemCount) issues.push('merchant_feed_missing_links');
  return {itemCount,titleCount,priceCount,linkCount,issues,valid:issues.length===0};
}

export function auditSitemapXml(text='') {
  const value=String(text);
  const locs=[...value.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim());
  const issues=[];
  if(!/<urlset\b|<sitemapindex\b/i.test(value)) issues.push('sitemap_missing_root');
  if(!locs.length) issues.push('sitemap_has_no_urls');
  if(locs.some(x=>!/^https:\/\//i.test(x))) issues.push('sitemap_contains_non_https_url');
  return {urlCount:locs.length,issues,valid:issues.length===0,urls:locs.slice(0,50)};
}

export function auditRobots(text='') {
  const value=String(text);
  const issues=[];
  if(!/user-agent\s*:/i.test(value)) issues.push('robots_missing_user_agent');
  if(/disallow\s*:\s*\/\s*(?:\r?\n|$)/i.test(value)) issues.push('robots_blocks_entire_site');
  const sitemap=[...value.matchAll(/sitemap\s*:\s*(https:\/\/\S+)/gi)].map(m=>m[1]);
  if(!sitemap.length) issues.push('robots_missing_sitemap_reference');
  return {sitemapReferences:sitemap,issues,valid:issues.length===0};
}


// Read-only legacy storefront inspection. An HTML/merchant feed that loads
// successfully is not evidence of an approved supplier route or permission to
// take payment. Only aggregate counts enter the public GitHub report.
export function auditLegacySnapshot({pages=[],feed={}}={}) {
  const checkoutLinks=new Set();
  const saleSchemaPages=[];
  const thirdPartyMediaPages=[];
  const unknownPaths=[];
  // An empty scan is missing evidence, not proof that the storefront is safe.
  if(!pages.length) unknownPaths.push('legacy_pages_not_inspected');
  for(const page of pages) {
    if(!page?.ok) {
      if(![404,410].includes(page?.status)) unknownPaths.push(page?.path||'unknown');
      continue;
    }
    if(!/text\/html/i.test(page.contentType||'')) {
      unknownPaths.push(page.path||'unknown_content_type');
      continue;
    }
    const html=String(page.text||'');
    for(const link of html.match(/https:\/\/(?:buy|checkout)\.stripe\.com\/[A-Za-z0-9]+/gi)||[]) checkoutLinks.add(link);
    const jsonLd=[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
    if(jsonLd.some(([,value])=>/"@type"\s*:\s*"(?:Product|Offer|AggregateOffer)"/i.test(value))) saleSchemaPages.push(page.path);
    // Supplier images also appear in CSS backgrounds, srcset, lazy-load attributes,
    // video posters and escaped JSON-LD, not only img/source/meta elements.
    // An observed supplier-media URL is a rights-review blocker, never permission.
    const mediaRefs = html.replace(/\\\//g, '/');
    if (/(?:https?:)?\/\/(?:shopifyfile\.oss-us-west-1\.aliyuncs\.com|oss-cf\.cjdropshipping\.com|cc-west-usa\.oss-us-west-1\.aliyuncs\.com)(?=[\/?#"'\s]|$)/i.test(mediaRefs)) thirdPartyMediaPages.push(page.path);
  }
  let inStockRows=0;
  let thirdPartyFeedImageRows=0;
  if(feed?.ok) {
    const lines=String(feed.text||'').trim().split(/\r?\n/);
    const header=(lines.shift()||'').split('\t').map(x=>x.trim().toLowerCase());
    const availabilityColumn=header.indexOf('availability');
    const imageColumn=header.indexOf('image_link');
    if(availabilityColumn<0) unknownPaths.push('/merchant-feed.tsv:availability_column_missing');
    for(const line of lines) {
      if(!line.trim()) continue;
      const cells=line.split('\t');
      if(availabilityColumn>=0&&/^(?:in_stock|in stock)$/i.test((cells[availabilityColumn]||'').trim())) inStockRows++;
      if(imageColumn>=0&&/(?:aliyuncs\.com|cjdropshipping\.com)/i.test(cells[imageColumn]||'')) thirdPartyFeedImageRows++;
    }
  } else if(![404,410].includes(feed?.status)) {
    unknownPaths.push('/merchant-feed.tsv');
  }
  const issues=[];
  if(checkoutLinks.size) issues.push('legacy_direct_physical_checkout_exposed');
  if(saleSchemaPages.length) issues.push('legacy_unverified_product_offer_schema');
  if(inStockRows) issues.push('legacy_unsupported_in_stock_feed_claims');
  if(thirdPartyMediaPages.length||thirdPartyFeedImageRows) issues.push('legacy_third_party_media_rights_unverified');
  if(unknownPaths.length) issues.push('legacy_surface_inspection_incomplete');
  return {
    safe:issues.length===0,
    decommissioned:pages.length>0&&pages.every(p=>[404,410].includes(p.status))&&[404,410].includes(feed?.status),
    directCheckoutLinkCount:checkoutLinks.size,
    saleSchemaPageCount:saleSchemaPages.length,
    thirdPartyMediaPageCount:thirdPartyMediaPages.length,
    inStockFeedRowCount:inStockRows,
    thirdPartyFeedImageRowCount:thirdPartyFeedImageRows,
    unknownPathCount:unknownPaths.length,
    issues,
    rule:'No Stripe changes, external publication, supplier ordering, or claims of live commercial approval. A clean audit does not authorize physical checkout.'
  };
}

export async function auditLegacyStorefront(origin,fetcher=fetch) {
  const paths=['/','/scrubber.html','/pethair.html','/crevice.html','/merchant-feed.tsv'];
  const responses=await Promise.all(paths.map(async path=>{
    try {
      const response=await fetcher(origin+path,{
        redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{'user-agent':'PrismBay-Commerce-Surface-Auditor/1.0'}
      });
      return {path,ok:response.ok,status:response.status,
        contentType:response.headers.get('content-type')||'',text:await response.text()};
    } catch {
      return {path,ok:false,status:null,contentType:'',text:''};
    }
  }));
  return {
    origin,checkedAt:new Date().toISOString(),
    ...auditLegacySnapshot({pages:responses.filter(x=>x.path!=='/merchant-feed.tsv'),
      feed:responses.find(x=>x.path==='/merchant-feed.tsv')})
  };
}

async function fetchText(origin,path){
  const response=await fetch(origin+path,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'PrismBay-Commerce-Surface-Auditor/1.0'}});
  const text=await response.text();
  return {path,status:response.status,ok:response.ok,contentType:response.headers.get('content-type'),text};
}

export async function auditCommerceSurfaces(origin){
  const [productsRes,merchantRes,sitemapRes,robotsRes]=await Promise.all(['/products.json','/merchant-feed.xml','/sitemap.xml','/robots.txt'].map(path=>fetchText(origin,path)));
  let productsPayload=null; try{productsPayload=JSON.parse(productsRes.text);}catch{}
  const products=productsRes.ok&&productsPayload!==null?auditProductsPayload(productsPayload):{recognized:false,productCount:0,validProductCount:0,invalidProductCount:0,issues:[productsRes.ok?'products_json_parse_failed':`products_http_${productsRes.status}`],products:[]};
  const merchant=merchantRes.ok?auditMerchantXml(merchantRes.text):{itemCount:0,issues:[`merchant_http_${merchantRes.status}`],valid:false};
  const sitemap=sitemapRes.ok?auditSitemapXml(sitemapRes.text):{urlCount:0,issues:[`sitemap_http_${sitemapRes.status}`],valid:false,urls:[]};
  const robots=robotsRes.ok?auditRobots(robotsRes.text):{issues:[`robots_http_${robotsRes.status}`],valid:false,sitemapReferences:[]};
  const issues=[...products.issues,...products.products.flatMap(x=>x.issues.map(issue=>`product:${x.id||x.index}:${issue}`)),...merchant.issues,...sitemap.issues,...robots.issues];
  return {
    schemaVersion:1,
    checkedAt:new Date().toISOString(),
    origin,
    products,
    merchant,
    sitemap,
    robots,
    issueCount:issues.length,
    issues,
    technicalSurfaceReady:products.productCount>0&&products.invalidProductCount===0&&products.issues.length===0&&merchant.valid&&sitemap.valid&&robots.valid,
    freeDistributionAccountApprovalKnown:false,
    freeDistributionReady:false,
    rule:'Technical feed readiness does not prove Google, Pinterest, TikTok, eBay or any other platform account approval. External activation remains separately gated.',
  };
}


// Read-only inspection of the canonical Clean storefront and its media manifests.
export function auditCanonicalRetailSnapshot({pages=[],manifest=null,queue=null,physicalApproved=false}={}){
 const issues=[];
 const valid=path=>{const p=pages.find(x=>x?.path===path);if(!p?.ok||!/<html/i.test(String(p.text||''))){issues.push(`canonical_uninspected:${path}`);return null;}return String(p.text);};
 const home=valid('/'),shipping=valid('/shipping.html'),top=valid('/top-15/');
 if(!physicalApproved){
  if(home&&/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"Product"/i.test(home))issues.push('canonical_unapproved_physical_product_schema');
  if(home&&/(?:https?:)?\/\/(?:oss-cf\.cjdropshipping\.com|shopifyfile\.oss-us-west-1\.aliyuncs\.com|cc-west-usa\.oss-us-west-1\.aliyuncs\.com)\//i.test(home.replace(/\\\//g,'/')))issues.push('canonical_supplier_media_rights_unverified');
  if(shipping&&/Supplier stock and delivery timing are confirmed after payment/i.test(shipping))issues.push('canonical_postpayment_stock_verification_claim');
  if(shipping&&/currently accepts checkout and delivery only for eligible addresses/i.test(shipping))issues.push('canonical_unapproved_physical_checkout_claim');
  if(top&&/"numberOfItems"\s*:\s*0/.test(top)&&/Exact supplier identity and stock were checked/i.test(top))issues.push('canonical_zero_stock_misleading_verification_copy');
 }
 if(!manifest||!Array.isArray(manifest.products))issues.push('canonical_retail_manifest_uninspected');
 else if(!physicalApproved&&manifest.products.length>0)issues.push('canonical_unapproved_physical_media_manifest');
 if(!queue||!Array.isArray(queue.items))issues.push('canonical_social_queue_uninspected');
 else if(!physicalApproved&&queue.items.some(item=>item?.offerType==='physical'&&/ready|publish|schedule/i.test(String(item.status||''))))issues.push('canonical_unapproved_physical_social_queue');
 // Retail queue records must never target the educational YouTube channel, even
 // through aliases, a destination URL, or an alternate routing field.
 const educationalYoutubeRoute=item=>{
  const destinations=[item?.channel,item?.platform,item?.destinationPlatform,
   item?.targetChannel,item?.channelId,item?.destinationUrl];
  return destinations.some(value=>{
   const route=String(value??'').trim().toLowerCase();
   const alias=route.replaceAll('_','-').replaceAll(' ','-').replaceAll('/','-');
   if(['youtube','youtube-shorts','youtube-channel','yt','youtube.com',
    'www.youtube.com','m.youtube.com','music.youtube.com','youtu.be',
    'youtube-nocookie.com','www.youtube-nocookie.com','@prismbayai',
    'ucw2hs85tzipdkwjtg-bsxzq'].includes(alias))return true;
   try{
    const url=new URL(route);
    return ['http:','https:'].includes(url.protocol)&&
     (['youtube.com','youtu.be','youtube-nocookie.com'].includes(url.hostname)||
      url.hostname.endsWith('.youtube.com')||
      url.hostname.endsWith('.youtube-nocookie.com'));
   }catch{return false;}
  });
 };
 if(queue?.items?.some(educationalYoutubeRoute))issues.push('canonical_educational_youtube_retail_contamination');
 return {safe:issues.length===0,issues,physicalManifestCount:Array.isArray(manifest?.products)?manifest.products.length:null,physicalQueuedCount:Array.isArray(queue?.items)?queue.items.filter(x=>x?.offerType==='physical').length:null,rule:'Read-only evidence check. A passing audit does not authorize physical checkout, supplier orders, media use, or publication.'};
}

export async function auditCanonicalRetailStorefront(origin='https://clean.prismbayai.com'){
 const paths=['/','/shipping.html','/top-15/','/media/retail-shorts/manifest.json','/media/social/distribution-queue.json'];
 const pages=await Promise.all(paths.map(async path=>{try{return await fetchText(origin,path);}catch{return {path,ok:false,status:null,text:''};}}));
 const parse=path=>{const p=pages.find(x=>x.path===path);if(!p?.ok)return null;try{return JSON.parse(p.text);}catch{return null;}};
 return {origin,checkedAt:new Date().toISOString(),...auditCanonicalRetailSnapshot({pages:pages.filter(p=>p.path.endsWith('/')||p.path==='/shipping.html'),manifest:parse('/media/retail-shorts/manifest.json'),queue:parse('/media/social/distribution-queue.json')})};
}

export async function main(){
  const manifest=JSON.parse(await fs.readFile('config/store-backend-swarm.json','utf8'));
  const report=await auditCommerceSurfaces(manifest.storeOrigin);
  report.legacyExposure=manifest.legacyStoreOrigin
    ? await auditLegacyStorefront(manifest.legacyStoreOrigin)
    : {safe:false,issues:['legacy_origin_not_configured']};
  report.canonicalRetailExposure=await auditCanonicalRetailStorefront();
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/commerce-surface-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({technicalSurfaceReady:report.technicalSurfaceReady,productCount:report.products.productCount,merchantItems:report.merchant.itemCount,sitemapUrls:report.sitemap.urlCount,issueCount:report.issueCount,legacyCheckoutLinks:report.legacyExposure.directCheckoutLinkCount??null,legacyInStockRows:report.legacyExposure.inStockFeedRowCount??null,legacySafe:report.legacyExposure.safe},null,2));
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
