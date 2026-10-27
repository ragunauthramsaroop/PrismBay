import fs from "node:fs/promises";
import {verifyProviderProducts} from "./alternate-supplier-readiness.mjs";
import {matchesIntendedProduct} from "./cj-match-policy.mjs";

// Only genuine, exact source-matched supplier SKUs appear in the public
// physical catalog. Descriptions and labels deliberately reflect the
// actual observed CJ title, not speculative earlier marketing promises.
// Media is intentionally omitted until written re-use rights are secured.
export const publicRules=[
 {slug:"pethair",name:"Pet Grooming & Hair-Removal Comb",category:"Pet",sourceRegex:/\b(pet|pets|cat|dog)\b.*\b(comb|brush)\b.*\bhair\b/i,desc:"Supplier-listed pet grooming comb. Designed for brushing loose hair from pets; not a fabric lint-roller or upholstery scraper.",spec:"Confirm animal suitability and exact grooming-comb size before accepting an order."},
 {slug:"garment-steamer",name:"Standing Garment Steamer",category:"Travel",sourceRegex:/\bstanding\s+garment\s+steamer\b/i,desc:"Supplier-listed standing garment steamer. This is a standing appliance, not a pocket-sized travel steamer.",spec:"Verify voltage, plug type, safety documentation and buyer-specific delivery before payment."},
 {slug:"screen-protector",name:"Tempered-Glass Phone Screen Protector",category:"Tech",sourceRegex:/\bmobile phone tempered glass screen protector\b/i,desc:"Supplier-listed tempered-glass screen protector; its compatibility depends on the exact phone model and selected variant.",spec:"The buyer must confirm the supported phone model and pack contents before any final quote."}
];

const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

export function currentPublicProducts(review, alternateRegistry=null, shortlist=null){
 // CJ records are not trustworthy without a current authenticated report.
 // Keep independently verified alternative-provider evidence available.
 const now=Date.parse(review?.checkedAt||"");
 const reportAge=Date.now()-now;
 const cjFresh=review?.authenticationVerified===true &&
  Number.isFinite(now) && reportAge>=-5*60000 && reportAge<=36*3600000;
 const cj=cjFresh?publicRules.flatMap(rule=>{
  // Duplicate or malformed candidate records are ambiguous and fail closed.
  const records=Array.isArray(review.candidates)
   ?review.candidates.filter(row=>row?.slug===rule.slug):[];
  if(records.length!==1)return [];
  const p=records[0];
  if(!p||p.independentIdentityMatch!==true||p.variantStockVerified!==true||
     p.freightEstimateVerified!==true||!rule.sourceRegex.test(String(p.observedProduct||""))||
     !matchesIntendedProduct({slug:rule.slug},p.observedProduct)||
     !/^CJ[A-Z0-9]{6,35}$/.test(p.observedSupplierSku||"")||
     !/^CJ[A-Z0-9]{6,35}$/.test(p.observedVariantSku||"")||
     !String(p.observedVariantSku||"").startsWith(String(p.observedSupplierSku||"")))return [];
  // Report refreshes never renew a missing or expired individual stock check.
  const observed=Date.parse(p.observedAt||"");
  const age=now-observed;
  const absoluteAge=Date.now()-observed;
  // A fresh report never extends the lifetime of an older stock observation.
  if(!Number.isFinite(observed)||age< -5*60000||age>30*3600000||
     absoluteAge< -5*60000||absoluteAge>30*3600000)return [];
  // All permissions other than original graphics remain unresolved.
  return [{...rule,originalName:p.observedProduct,sku:p.observedSupplierSku,variant:p.observedVariantSku,provider:"CJ",source:"CJ"}];
 }):[];
 if(!alternateRegistry||!shortlist)return cj;
 const alternative=verifyProviderProducts(alternateRegistry,shortlist,Date.now()).approved.map(p=>({
   slug:p.slug,name:p.name,category:p.category,originalName:p.supplierTitle,
   sku:p.supplierProductId,variant:p.supplierVariantId,
   source:p.providerName,provider:p.provider,photoUrl:p.imageUrl,
   desc:"Source-verified "+p.providerName+" product. Confirm the exact option and delivered quote before purchase.",
   spec:"Recorded supplier stock: "+p.stockUnits+" units at last check; sample ZIP shipping is not final customer freight."
 }));
 const unique=new Map(cj.map(p=>[p.slug,p]));
 // Authenticated, licensed partner evidence can supersede CJ for the same SKU.
 for(const p of alternative)unique.set(p.slug,p);
 return [...unique.values()];
}

export function renderCards(products){
 return products.map((p,i)=>{
  const link="https://prismbay-clean-global.floot.app/quote?product="+encodeURIComponent(p.slug)+"&amp;utm_source=verified-catalog&amp;variantSku="+encodeURIComponent(p.variant);
  const provider=esc(p.source||"CJ");
  const licensedPhoto=p.photoUrl?'<img class="verified-photo" src="'+esc(p.photoUrl)+'" alt="'+esc(p.name)+' — exact supplier-approved product variant" loading="lazy" decoding="async" referrerpolicy="no-referrer">':"";
  return '<article class="product" data-category="'+esc(p.category)+'" data-search="'+esc((p.name+" "+p.originalName+" "+p.sku+" "+p.category).toLowerCase())+'">\n'+
   licensedPhoto+'<div class="product-content"><div class="tag-row"><span class="tag">'+esc(p.category)+' · '+provider+' supplier record</span><span class="state">Checkout not yet approved</span></div>\n'+
   '<p class="supplier-label">EXACT SOURCE-MATCHED PRODUCT '+String(i+1).padStart(2,"0")+'</p>\n'+
   '<h3>'+esc(p.name)+'</h3><p>'+esc(p.desc)+'</p>\n'+
   '<p class="product-reason">'+esc(p.spec)+'</p>\n'+
   '<div class="evidence"><div><span>Authenticated '+provider+' supplier SKU</span><strong>'+esc(p.sku)+'</strong></div><div><span>Physical stock-checked variant</span><strong>'+esc(p.variant)+'</strong></div></div>\n'+
   '<p class="source-name"><strong>Supplier listing:</strong> '+esc(p.originalName)+'</p>\n'+
   '<div class="product-footer"><span><b>Final delivered price</b><small>Requires buyer ZIP and supplier sign-off</small></span><a class="quote" href="'+link+'" aria-label="Request a supplier-verified price for '+esc(p.name)+'">Request exact quote</a></div>\n'+
   '</div></article>';
 }).join("\n");
}

function replaceBetween(source,before,after,body){
 const i=source.indexOf(before),j=source.indexOf(after,i+before.length);
 if(i<0||j<0||j<i)throw Error("Missing expected storefront template anchors: "+before);
 return source.slice(0,i+before.length)+"\n"+body+"\n"+source.slice(j);
}

export function refresh(html,review,alternateRegistry=null,shortlist=null){
 const products=currentPublicProducts(review,alternateRegistry,shortlist),count=products.length;
 html=replaceBetween(html,"<!-- REAL_SUPPLIER_CARDS_START -->","<!-- REAL_SUPPLIER_CARDS_END -->",renderCards(products));
 const json={
  "@context":"https://schema.org","@type":"ItemList",
  name:"PrismBay Clean authenticated supplier-matched product records",
  numberOfItems:count,
  itemListElement:products.map((p,i)=>({"@type":"ListItem",position:i+1,name:p.name,description:p.desc}))
 };
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'<script type="application/ld+json">'+JSON.stringify(json)+'</script>');
 html=html.replace(/(<div class="panel-stat"><strong>)[0-9]+(<\/strong>)/,"$1"+count+"$2");
 html=html.replace(/Showing \d+ of \d+ products/,"Showing "+count+" of "+count+" products");
 html=html.replace(/(<div class="filters" role="group" aria-label="Filter supplier-matched products">)[\s\S]*?(<\/div>)/,
  '$1<button type="button" data-filter="All" aria-pressed="true">All verified records</button>'+
  [...new Set(products.map(p=>p.category))].map(c=>'<button type="button" data-filter="'+esc(c)+'" aria-pressed="false">'+esc(c)+'</button>').join("")+'$2');
 html=html.replace(/Supplier screening last recorded: [^<]+ \(UTC\)/,
  "Supplier screening last recorded: "+esc(review.checkedAt||"unavailable")+" (UTC)");
 if(html.includes('Illustrative symbol')||html.includes('<div class="product-art"'))throw Error("Illustrative product imagery must not be published");
 if((html.match(/<article class="product" data-category=/g)||[]).length!==count)throw Error("Physical cards do not match verified evidence");
 if((html.match(/class="ready-buy"/g)||[]).length!==4)throw Error("Required live digital offers disappeared");
 if((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length!==4)throw Error("Digital payment routes were altered");
 return {html,count,slugs:products.map(p=>p.slug)};
}

export async function sync({
 page="storefront/top-15/index.html",
 report="growth-reports/cj-worker-review.json",
 alternate="config/alternate-supplier-evidence.json",
 shortlistPath="config/top15-merchandising.json"
}={}){
 const current=await fs.readFile(page,"utf8");
 const data=JSON.parse(await fs.readFile(report,"utf8"));
 const alternateRegistry=JSON.parse(await fs.readFile(alternate,"utf8"));
 const shortlist=JSON.parse(await fs.readFile(shortlistPath,"utf8"));
 const result=refresh(current,data,alternateRegistry,shortlist);
 if(result.html!==current)await fs.writeFile(page,result.html);
 console.log(JSON.stringify({source:report,checkedAt:data.checkedAt,displayedRealProducts:result.count,slugs:result.slugs,sourceChanged:result.html!==current,placeholderProducts:0,physicalCheckout:false}));
 return result;
}
if(process.argv[1]&&/top15-real-source-sync\.mjs$/.test(process.argv[1]))await sync();
