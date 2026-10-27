import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {verifyProviderProducts} from "./alternate-supplier-readiness.mjs";

const vendors=JSON.parse(fs.readFileSync(new URL("../config/alternate-supplier-evidence.json",import.meta.url)));
const shortlist=JSON.parse(fs.readFileSync(new URL("../config/top15-merchandising.json",import.meta.url)));
const now=Date.parse("2026-10-27T11:00:00.000Z");
function sample(){
 return {schemaVersion:1,
  providers:{hypersku:{basePlanUsdMonthly:0,apiStatus:"api_active"}},
  candidates:[{slug:"pethair",provider:"hypersku",supplierProductId:"hyper-1234",supplierVariantId:"hyper-1234-medium",
   supplierTitle:"Genuine Reusable Pet Hair Remover Brush",
   catalogMatchVerified:true,independentIdentityReviewed:true,
   listingEvidenceUrl:"https://www.hypersku.com/products/real-1234",
   stock:{units:47,warehouseCountry:"US",checkedAt:"2026-10-27T10:55:00Z"},
   usFreight:{destinationCountry:"US",exampleZip:"10001",costUsd:3.80,tracked:true,checkedAt:"2026-10-27T10:55:00Z"},
   unitCostUsd:3.20,targetRetailUsd:19.95,
   fulfillment:{fulfillmentConfirmed:true,mode:"api",trackedShippingConfirmed:true,returnTermsAccepted:true,termsUrl:"https://www.hypersku.com/returns/"},
   media:{commercialReuseApproved:true,exactVariantPhotoReviewed:true,url:"https://cdn.example.com/actual-exact-product-1234.jpg",rightsEvidenceUrl:"https://www.hypersku.com/rights/"},
   approvedAt:"2026-10-27T10:55:00Z"}]};
}
test("real production registry is empty rather than invented",()=>{
 assert.equal(vendors.providers.hypersku.basePlanUsdMonthly,0);
 assert.equal(vendors.providers.eprolo.basePlanUsdMonthly,0);
 assert.equal(vendors.providers.hypersku.apiStatus,"account_and_open_api_access_pending");
 assert.equal(verifyProviderProducts(vendors,shortlist,now).approved.length,0);
});
test("strict complete provider evidence allows a real product source, but not checkout",()=>{
 const out=verifyProviderProducts(sample(),shortlist,now);
 assert.equal(out.approved.length,1);
 assert.equal(out.rejected.length,0);
 assert.equal(out.approved[0].physicalCheckoutAuthorized,false);
 assert.equal(out.approved[0].automaticSupplierOrdering,false);
});
test("provisional provider credentials never authorize source evidence",()=>{
 const data=sample();data.providers.hypersku.apiStatus="pending";
 assert.deepEqual(verifyProviderProducts(data,shortlist,now).rejected[0].reasons,["provider_api_not_active"]);
});
test("invented SKU / stale physical stock / missing vendor rights are rejected",()=>{
 const data=sample();const c=data.candidates[0];
 c.supplierVariantId="TBD";c.stock.checkedAt="2026-10-20T05:00:00Z";
 c.media.commercialReuseApproved=false;
 const reason=verifyProviderProducts(data,shortlist,now).rejected[0].reasons;
 for(const key of ["missing_exact_product_variant_id","current_physical_stock_unverified","commercial_image_rights_not_proven"])assert.ok(reason.includes(key),key);
});
test("unprofitable prices, missing returns and duplicate supplier rows cannot go live",()=>{
 const data=sample();const c=data.candidates[0];c.unitCostUsd=17.4;
 c.fulfillment.returnTermsAccepted=false;
 data.candidates.push({...c,supplierProductId:"hyper-duplicate-11"});
 const {approved,rejected}=verifyProviderProducts(data,shortlist,now);
 assert.equal(approved.length,0);
 assert.equal(rejected.length,2);
 assert.ok(rejected[0].reasons.includes("insufficient_margin_after_representative_freight_and_reserves"));
 assert.ok(rejected[1].reasons.includes("ambiguous_duplicate_supplier_for_slug"));
});
test("unreviewed safety evidence blocks electric items even if supplier quotes exist",()=>{
 const data=sample();data.candidates[0].slug="garment-steamer";
 const out=verifyProviderProducts(data,shortlist,now);
 assert.equal(out.approved.length,0);
 assert.ok(out.rejected[0].reasons.includes("product_safety_evidence_missing"));
});
test("do not accept non-official rights references, unlicensed media or private hosts",()=>{
 const data=sample();data.candidates[0].media.rightsEvidenceUrl="https://attacker.tld/hypersku-license";
 data.candidates[0].media.url="http://192.168.1.2/sku.jpg";
 const {rejected}=verifyProviderProducts(data,shortlist,now);
 assert.ok(rejected[0].reasons.includes("commercial_image_rights_not_proven"));
});
