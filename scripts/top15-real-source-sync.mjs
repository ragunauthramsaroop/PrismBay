import fs from "node:fs/promises";
import {matchesIntendedProduct} from "./cj-match-policy.mjs";

// Only genuine, exact source-matched supplier SKUs appear in the public
// physical catalog. Descriptions and labels deliberately reflect the
// actual observed CJ title, not speculative earlier marketing promises.
// Media is intentionally omitted until written re-use rights are secured.
export const publicRules=[
 {slug:"garment-steamer",name:"USB Handheld Garment Steamer",category:"Fabric care",sourceRegex:/\bgarment\s+steamer\b/i,desc:"Supplier-listed USB handheld garment steamer. Actual steam function, voltage, power and fabric compatibility require independent verification.",spec:"Confirm genuine steam output, safety documentation, exact variant, buyer ZIP freight and returns before accepting payment."},
 {slug:"screen-protector",name:"Tempered-Glass Phone Screen Protector",category:"Tech",sourceRegex:/\bmobile phone tempered glass screen protector\b/i,desc:"Supplier-listed tempered-glass screen protector; its compatibility depends on the exact phone model and selected variant.",spec:"The buyer must confirm the supported phone model and pack contents before any final quote."}
];

const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

export function currentPublicProducts(review){
 // A fresh timestamp alone never authenticates a supplier report.
 if(review?.authenticationVerified!==true)return [];
 const now=Date.parse(review?.checkedAt||"");
 const reportAge=Date.now()-now;
 if(!Number.isFinite(now)||reportAge< -5*60000||reportAge>36*3600000)return [];
 return publicRules.flatMap(rule=>{
  const p=review.candidates?.find(row=>row.slug===rule.slug);
  if(!p||p.independentIdentityMatch!==true||p.variantStockVerified!==true||
     p.freightEstimateVerified!==true||!rule.sourceRegex.test(String(p.observedProduct||""))||
     !matchesIntendedProduct({slug:rule.slug},p.observedProduct)||
     !/^CJ[A-Z0-9]{6,35}$/.test(p.observedSupplierSku||"")||
     !/^CJ[A-Z0-9]{6,35}$/.test(p.observedVariantSku||""))return [];
  // Never refresh an undated or stale candidate by copying the report timestamp.
  const observed=Date.parse(p.observedAt||"");
  const observationAge=now-observed;
  if(!Number.isFinite(observed)||observationAge< -5*60000||observationAge>30*3600000)return [];
  // All permissions other than original graphics remain unresolved.
  const expiresAt=new Date(Math.min(now+36*3600000,observed+30*3600000)).toISOString();
  return [{...rule,originalName:p.observedProduct,sku:p.observedSupplierSku,variant:p.observedVariantSku,expiresAt}];
 });
}

export function renderCards(products){
 return products.map((p,i)=>{
  const link="https://prismbay-clean-global.floot.app/quote?product="+encodeURIComponent(p.slug)+"&amp;utm_source=verified-catalog&amp;variantSku="+encodeURIComponent(p.variant);
  return '<article class="product" data-category="'+esc(p.category)+'" data-evidence-expires-at="'+esc(p.expiresAt)+'" data-search="'+esc((p.name+" "+p.originalName+" "+p.sku+" "+p.category).toLowerCase())+'">\n'+
   '<div class="product-content"><div class="tag-row"><span class="tag">'+esc(p.category)+' · Supplier record</span><span class="state">Checkout not yet approved</span></div>\n'+
   '<p class="supplier-label">EXACT SOURCE-MATCHED PRODUCT '+String(i+1).padStart(2,"0")+'</p>\n'+
   '<h3>'+esc(p.name)+'</h3><p>'+esc(p.desc)+'</p>\n'+
   '<p class="product-reason">'+esc(p.spec)+'</p>\n'+
   '<div class="evidence"><div><span>Authentic CJ supplier SKU</span><strong>'+esc(p.sku)+'</strong></div><div><span>Physical stock-checked variant</span><strong>'+esc(p.variant)+'</strong></div></div>\n'+
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

export function refresh(html,review){
 const products=currentPublicProducts(review),count=products.length;
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
 report="growth-reports/cj-worker-review.json"
}={}){
 const current=await fs.readFile(page,"utf8");
 const data=JSON.parse(await fs.readFile(report,"utf8"));
 const result=refresh(current,data);
 if(result.html!==current)await fs.writeFile(page,result.html);
 console.log(JSON.stringify({source:report,checkedAt:data.checkedAt,displayedRealProducts:result.count,slugs:result.slugs,sourceChanged:result.html!==current,placeholderProducts:0,physicalCheckout:false}));
 return result;
}
if(process.argv[1]&&/top15-real-source-sync\.mjs$/.test(process.argv[1]))await sync();
