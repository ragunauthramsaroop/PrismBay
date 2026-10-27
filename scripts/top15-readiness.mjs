import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {hasApprovedProductClass,matchesIntendedProduct} from './cj-match-policy.mjs';

export function assessTop15(shortlist, supplierReview = {}, nowMs = Date.now()) {
  // Only authenticated, timely supplier observations support a positive
  // screening status. A refreshed report never refreshes older stock evidence.
  const reportMs = Date.parse(supplierReview.checkedAt || '');
  const reportFresh = supplierReview.authenticationVerified === true &&
    Number.isFinite(reportMs) && Number.isFinite(nowMs) &&
    reportMs <= nowMs + 5 * 60_000 && nowMs - reportMs <= 36 * 3_600_000;
  const products=shortlist?.candidates;
  if (!Array.isArray(products) || products.length !== 15) throw Error('Exactly 15 product candidates are required');
  const ids=new Set(); const reviews=new Map();
  for(const item of supplierReview.candidates||[]){
    if(!item?.slug)continue;
    const old=reviews.get(item.slug);
    const stamp=Date.parse(item.observedAt||supplierReview.checkedAt||'');
    const prev=Date.parse(old?.observedAt||'');
    if(!old || (Number.isFinite(stamp)&&(!Number.isFinite(prev)||stamp>prev))) reviews.set(item.slug,item);
  }
  const rows=products.map(item=>{
    if(typeof item.slug!=='string'||!item.slug||ids.has(item.slug)) throw Error('Missing or duplicate product slug');
    ids.add(item.slug);
    if(!hasApprovedProductClass(item.slug)) throw Error('Missing strict supplier identity rule for '+item.slug);
    const row=reviews.get(item.slug)||{};
    const observedMs = Date.parse(row.observedAt || '');
    const evidenceFresh = reportFresh && Number.isFinite(observedMs) &&
      observedMs <= reportMs + 5 * 60_000 &&
      observedMs <= nowMs + 5 * 60_000 &&
      nowMs - observedMs <= 30 * 3_600_000;
    const supplierSkuValid = /^CJ[A-Z0-9]{6,35}$/.test(String(row.observedSupplierSku || ''));
    // A valid-looking variant from another supplier product is not stock proof.
    const variantSkuValid = /^CJ[A-Z0-9]{6,35}$/.test(String(row.observedVariantSku || '')) &&
      supplierSkuValid && String(row.observedVariantSku).startsWith(String(row.observedSupplierSku));
    const checks={
      independentSupplierMatch:evidenceFresh && supplierSkuValid && row.independentIdentityMatch===true && matchesIntendedProduct(item,row.observedProduct),
      variantStock:evidenceFresh && variantSkuValid && row.variantStockVerified===true,
      screeningFreight:evidenceFresh && row.freightEstimateVerified===true,
      destinationQuotePerBuyer:evidenceFresh && row.finalZipFreightVerified===true,
      mediaRights:evidenceFresh && row.mediaRightsVerified===true,
      checkoutInfrastructure:evidenceFresh && row.checkoutInfrastructureVerified===true,
      fulfillmentRoute:evidenceFresh && row.fulfillmentRouteVerified===true,
      commercialPromotionApproval:evidenceFresh && row.automaticPromotionAllowed===true
    };
    // Rights to publish original graphics are not rights to republish supplier
    // product photography or videos. Preserve the exact authorization scope.
    const mediaRightsScope = checks.mediaRights && typeof row.promotionMediaPolicy === 'string'
      ? row.promotionMediaPolicy : 'unverified';
    const supplierPhotoVideoRightsVerified = checks.mediaRights &&
      mediaRightsScope !== 'original_graphics_and_original_copy_only' &&
      row.supplierPhotoVideoRightsVerified === true;
    // No global physical checkout. Destination quote and final price must
    // be independently verified for each buyer, even after a supplier pass.
    return {
      slug:item.slug,name:item.name,priority:item.priority,
      supplierEvidenceFresh:evidenceFresh,
      reviewObservedAt:row.observedAt||null,
      observedSupplierProduct:typeof row.observedProduct==='string'?row.observedProduct:null,
      observedSupplierSku:typeof row.observedSupplierSku==='string'?row.observedSupplierSku:null,
      observedVariantSku:typeof row.observedVariantSku==='string'?row.observedVariantSku:null,
      mediaRightsScope,supplierPhotoVideoRightsVerified,
      verifiedChecks:checks,
      missingChecks:Object.entries(checks).filter(([,pass])=>!pass).map(([name])=>name),
      supplierScreeningPassed:checks.independentSupplierMatch&&checks.variantStock&&checks.screeningFreight,
      checkoutAction:'price_request_only',
      globallySaleReady:false
    };
  });
  return {
    schemaVersion:1,source:'Read-only CJ evidence. No estimated freight grants a sale.',
    supplierReviewCheckedAt:supplierReview.checkedAt||null,
    supplierReportAuthenticatedAndFresh:reportFresh,
    candidateCount:rows.length,
    supplierScreeningPassedCount:rows.filter(x=>x.supplierScreeningPassed).length,
    globalPhysicalCheckoutEnabled:false,
    anyClaimOfCheapestAuthorized:false,
    revenueProofRequired:'Verified live non-test Stripe paid transaction. Fulfillment is a separate evidence gate.',
    fulfillmentProofRequired:'Independent order-specific dispatch, tracking and delivery evidence',
    products:rows
  };
}
async function main() {
  const load=async(path,fallback)=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch(error){if(error?.code==='ENOENT')return fallback;throw error;}};
  const shortlist=await load('config/top15-merchandising.json',null);
  const review=await load('growth-reports/cj-worker-review.json',{});
  const data=assessTop15(shortlist,review);
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/top15-readiness.json',JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({candidates:data.candidateCount,screened:data.supplierScreeningPassedCount,checkoutEnabled:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
