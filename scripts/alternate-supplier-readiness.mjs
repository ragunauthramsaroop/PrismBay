import {pathToFileURL} from "node:url";
import fs from "node:fs/promises";

const supported=new Set(["hypersku","eprolo"]);
const baseDomains={hypersku:["hypersku.com","www.hypersku.com","support.hypersku.com"],eprolo:["eprolo.com","www.eprolo.com"]};
const thresholdMs=36*60*60*1000;

function fresh(date,now,limit=thresholdMs){
 const epoch=Date.parse(String(date||""));
 return Number.isFinite(epoch)&&epoch<=now+120000&&now-epoch<=limit;
}
function officialEvidence(url,provider){
 if(typeof url!=="string")return false;
 try{
  const parsed=new URL(url);
  return parsed.protocol==="https:"&&
   baseDomains[provider]?.some(host=>parsed.hostname===host||parsed.hostname.endsWith("."+host))===true&&
   !parsed.username&&!parsed.password;
 }catch{return false;}
}
function httpsUrl(url){
 if(typeof url!=="string")return false;
 try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password&&
  !/^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname)&&!u.hostname.endsWith(".local");}
 catch{return false;}
}
function nonEmptyId(v){return typeof v==="string"&&/^[A-Za-z0-9][A-Za-z0-9._:-]{3,100}$/.test(v);}
function num(v){return typeof v==="number"&&Number.isFinite(v)&&v>0;}

export function verifyProviderProducts(data,catalog,now=Date.now()){
 if(data?.schemaVersion!==1||!Array.isArray(data.candidates)||!catalog?.candidates)return {approved:[],rejected:[{reason:"invalid_registry"}]};
 const allowed=new Map(catalog.candidates.map(p=>[p.slug,p]));
 const approved=[],rejected=[],seen=new Set();
 for(const row of data.candidates){
  const reasons=[];
  const origin=String(row?.provider||"");
  const code=String(row?.slug||"");
  const original=allowed.get(code);
  const provider=data?.providers?.[origin];
  if(!supported.has(origin)||!provider||provider.basePlanUsdMonthly!==0||
    provider.apiStatus!=="api_active")reasons.push("provider_api_not_active");
  if(!original||!code)reasons.push("not_on_approved_research_shortlist");
  if(seen.has(code))reasons.push("ambiguous_duplicate_supplier_for_slug");seen.add(code);
  if(!nonEmptyId(row?.supplierProductId)||!nonEmptyId(row?.supplierVariantId))
   reasons.push("missing_exact_product_variant_id");
  if(!row?.catalogMatchVerified||!row?.independentIdentityReviewed||
    typeof row?.supplierTitle!=="string"||row.supplierTitle.trim().length<8||
    !officialEvidence(row?.listingEvidenceUrl,origin))reasons.push("product_identity_evidence_missing");
  if(!row?.stock||!Number.isInteger(row.stock.units)||row.stock.units<1||
    !fresh(row.stock.checkedAt,now)||!row.stock.warehouseCountry)
    reasons.push("current_physical_stock_unverified");
  if(!row?.usFreight||!num(row.usFreight.costUsd)||row.usFreight.destinationCountry!=="US"||
    !/^\d{5}$/.test(String(row.usFreight.exampleZip||""))||row.usFreight.tracked!==true||
    !fresh(row.usFreight.checkedAt,now,24*3600000))
    reasons.push("us_shipping_quote_missing_or_stale");
  if(!num(row?.unitCostUsd)||!num(row?.targetRetailUsd))reasons.push("no_verified_unit_or_retail_price");
  if(num(row?.unitCostUsd)&&num(row?.targetRetailUsd)&&num(row?.usFreight?.costUsd)){
   const remaining=row.targetRetailUsd-row.unitCostUsd-row.usFreight.costUsd-
    row.targetRetailUsd*.035-row.targetRetailUsd*.05;
   if(remaining<3||remaining/row.targetRetailUsd<.25)reasons.push("insufficient_margin_after_representative_freight_and_reserves");
  }
  const f=row?.fulfillment;
  if(!f||f.fulfillmentConfirmed!==true||!["manual","api"].includes(f.mode)||
     f.trackedShippingConfirmed!==true||f.returnTermsAccepted!==true||
     !officialEvidence(f.termsUrl,origin))reasons.push("fulfillment_acceptance_missing");
  const media=row?.media;
  // We never infer image rights from an image URL's existence.
  if(media?.commercialReuseApproved!==true||media?.exactVariantPhotoReviewed!==true||
    !httpsUrl(media?.url)||!officialEvidence(media?.rightsEvidenceUrl,origin))
    reasons.push("commercial_image_rights_not_proven");
  if(["garment-steamer","multiport-charger","scrubber","cordless-handheld-vacuum","mattress-vacuum","motion-sensor-cabinet-lights"].includes(code)&&
    row?.safetyComplianceReviewed!==true)reasons.push("product_safety_evidence_missing");
  if(code==="screen-protector"&&!row?.variantCompatibilityVerified)reasons.push("model_compatibility_missing");
  if(!fresh(row?.approvedAt,now,30*86400000))reasons.push("independent_merchant_approval_not_current");
  if(reasons.length){rejected.push({slug:code,provider:origin,reasons});continue;}
  approved.push({slug:code,provider:origin,providerName:origin==="hypersku"?"HyperSKU":"EPROLO",
   supplierProductId:row.supplierProductId,supplierVariantId:row.supplierVariantId,
   supplierTitle:row.supplierTitle,name:original.name,category:original.category,
   imageUrl:media.url,photoLicenseUrl:media.rightsEvidenceUrl,
   stockCheckedAt:row.stock.checkedAt,stockUnits:row.stock.units,productCostUsd:row.unitCostUsd,
   indicativeShippingUsd:row.usFreight.costUsd,exampleZip:row.usFreight.exampleZip,
   indicativeRetailUsd:row.targetRetailUsd,approvedAt:row.approvedAt,
   // Source verification is not authorization to settle a buyer order.
   physicalCheckoutAuthorized:false,automaticSupplierOrdering:false});
 }
 return {approved,rejected};
}

export async function writeReport(
 registry="config/alternate-supplier-evidence.json",
 shortlist="config/top15-merchandising.json",
 destination="growth-reports/alternate-supplier-readiness.json"
){
 const [data,catalog]=await Promise.all([fs.readFile(registry,"utf8").then(JSON.parse),fs.readFile(shortlist,"utf8").then(JSON.parse)]);
 const {approved,rejected}=verifyProviderProducts(data,catalog);
 const output={schemaVersion:1,asOf:new Date().toISOString(),
  liveSupplierAPIs:Object.entries(data.providers||{}).filter(([,v])=>v.apiStatus==="api_active").map(([k])=>k),
  verifiedSourceProducts:approved,blockedCandidateReasons:rejected,
  publicAlternateSourceCount:approved.length,customerCheckoutEnabled:false,
  automaticOrdersEnabled:false,monthlySubscriptionCommitmentUsd:0,
  note:"Supplier-linked public media appears only with explicit reuse rights; checkout also requires buyer-specific final delivery, refundable order-routing terms, and separately authorized funding."};
 await fs.mkdir("growth-reports",{recursive:true});
 await fs.writeFile(destination,JSON.stringify(output,null,2)+"\n");
 console.log(JSON.stringify({liveAPIs:output.liveSupplierAPIs,sourceApproved:approved.length,rejected:rejected.length,checkoutEnabled:false}));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await writeReport();
