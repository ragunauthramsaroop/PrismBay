import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {verifyProviderProducts,apiVerified} from "./alternate-supplier-readiness.mjs";

const vendors=JSON.parse(fs.readFileSync(new URL("../config/alternate-supplier-evidence.json",import.meta.url)));
const shortlist=JSON.parse(fs.readFileSync(new URL("../config/top15-merchandising.json",import.meta.url)));
const now=Date.parse("2026-10-27T11:00:00.000Z");
// Synthetic GitHub-run references below test format only, never authenticated supplier connectivity.
function sample(){
 return {schemaVersion:1,
  providers:{hypersku:{basePlanUsdMonthly:0,apiStatus:"api_active",approvedApiDocumentation:true,authenticatedApiVerified:true,supplierConnected:true,
   apiConnectivityProof:{method:"authenticated_read_only_api_request",result:"success",
    merchantAccountMatched:true,reviewer:"merchant-auditor",auditRef:"gh-run:999999999999",
    checkedAt:"2026-10-27T10:55:00Z"}}},
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
 assert.equal(vendors.providers.hypersku.apiStatus,"open_api_not_available_low_volume");
 assert.equal(vendors.providers.hypersku.manualCsvOrderSubmissionAuthorized,false);
 assert.equal(vendors.providers.hypersku.supplierConnected,false);
 assert.equal(vendors.providers.hypersku.supplierReplyIdentityConfirmed,false);
 assert.equal(vendors.providers.hypersku.manualCsvRouteIndependentlyConfirmed,false);
 assert.equal(verifyProviderProducts(vendors,shortlist,now).approved.length,0);
});
test("synthetic complete API fixture needs trusted runtime attestation and still forbids checkout",()=>{
 const out=verifyProviderProducts(sample(),shortlist,now,new Set(["hypersku:api"]));
 assert.equal(out.approved.length,1);
 assert.equal(out.rejected.length,0);
 assert.equal(out.approved[0].physicalCheckoutAuthorized,false);
 assert.equal(out.approved[0].automaticSupplierOrdering,false);
});
test("declared API status without authenticated connection never approves source products",()=>{
 const data=sample();
 const provider=data.providers.hypersku;
 provider.authenticatedApiVerified=false;
 assert.equal(apiVerified(provider,now),false);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 assert.ok(verifyProviderProducts(data,shortlist,now).rejected[0].reasons.includes("provider_api_not_active"));
 provider.authenticatedApiVerified=true;
 provider.supplierConnected=false;
 assert.equal(apiVerified(provider,now),false);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 provider.supplierConnected=true;
 provider.approvedApiDocumentation=false;
 assert.equal(apiVerified(provider,now),false);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 provider.approvedApiDocumentation=true;
 assert.equal(apiVerified(provider,now),false,"A self-declared audit pointer is insufficient");
 assert.equal(apiVerified(provider,now,true),true);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 assert.equal(verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"])).approved.length,1);
});

test("repository connection flags without audited authenticated API proof remain blocked",()=>{
 const data=sample();const provider=data.providers.hypersku;
 delete provider.apiConnectivityProof;
 assert.equal(apiVerified(provider,now),false);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 provider.apiConnectivityProof={method:"authenticated_read_only_api_request",result:"success",
  merchantAccountMatched:true,reviewer:"merchant-auditor",auditRef:"gh-run:999999999999",
  checkedAt:"2026-10-25T10:55:00Z"};
 assert.equal(apiVerified(provider,now),false,"Stale API evidence must expire");
 provider.apiConnectivityProof.checkedAt="2026-10-27T10:55:00Z";
 provider.apiConnectivityProof.merchantAccountMatched=false;
 assert.equal(apiVerified(provider,now),false,"Another merchant's account is insufficient");
 provider.apiConnectivityProof.merchantAccountMatched=true;
 provider.apiConnectivityProof.auditRef="https://attacker.example/secret?token=abc";
 assert.equal(apiVerified(provider,now),false,"No arbitrary URL or secret-bearing audit ref");
 provider.apiConnectivityProof.auditRef="gh-run:999999999999";
 provider.apiConnectivityProof.method="configured_key_only";
 assert.equal(apiVerified(provider,now),false,"Configured credentials are not authenticated requests");
 provider.apiConnectivityProof.method="authenticated_read_only_api_request";
 assert.equal(apiVerified(provider,now),false,"Even a well-formed GitHub run ID does not authenticate a supplier");
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 assert.equal(apiVerified(provider,now,true),true);
 assert.equal(verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"])).approved.length,1);
});

test("provider status, documents and a secret without authenticated API proof are insufficient",()=>{
 assert.equal(apiVerified({apiStatus:"api_active",approvedApiDocumentation:true,apiKeyConfigured:true}),false);
 assert.equal(apiVerified({apiStatus:"api_active",approvedApiDocumentation:true,authenticatedApiVerified:true}),false);
 assert.equal(apiVerified({apiStatus:"api_active",approvedApiDocumentation:true,supplierConnected:true}),false);
});

test("self-declared supplier evidence never qualifies without an independent runtime attestation",()=>{
 const data=sample();
 assert.equal(apiVerified(data.providers.hypersku,now),false);
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
 assert.ok(verifyProviderProducts(data,shortlist,now).rejected[0].reasons.includes("provider_api_not_active"));
 assert.equal(verifyProviderProducts(data,shortlist,now,new Set(["eprolo:api"])).approved.length,0);
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

test("commercial media URL rejects private networks and internal hosts",()=>{
 const disallowed=[
  "https://172.16.1.20/product.jpg",
  "https://169.254.169.254/latest/meta-data/",
  "https://0.0.0.0/product.jpg",
  "https://[::1]/product.jpg",
  "https://[fd00::1]/product.jpg",
  "https://localhost/product.jpg",
  "https://assets.internal/product.jpg",
  "https://assets.local/product.jpg",
  "https://assets.internal./product.jpg",
  "https://localhost./product.jpg",
  "https://cdn.example.com./product.jpg"
 ];
 for(const url of disallowed){
  const data=sample();
  data.candidates[0].media.url=url;
  const out=verifyProviderProducts(data,shortlist,now);
  assert.equal(out.approved.length,0,url);
  assert.ok(out.rejected[0].reasons.includes("commercial_image_rights_not_proven"),url);
 }
 const valid=verifyProviderProducts(sample(),shortlist,now,new Set(["hypersku:api"]));
 assert.equal(valid.approved.length,1,"Public HTTPS CDN fixture must remain eligible");
});

test("verified manual HyperSKU sourcing can qualify for a quote-only product without Open API",()=>{
 const data=sample();
 data.providers.hypersku={
  basePlanUsdMonthly:0,apiStatus:"open_api_not_available_low_volume",
  customStoreRoute:"manual_csv_batch_upload_only",
  manualCsvRouteIndependentlyConfirmed:true,
  manualCsvOrderSubmissionAvailable:true
 };
 data.candidates[0].fulfillment.mode="manual";
 data.candidates[0].manualSourcingQuoteFromAuthenticatedDashboard=true;
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0,"Manual dashboard flags alone are not proof");
 const out=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:manual"]));
 assert.equal(out.approved.length,1);
 assert.equal(out.approved[0].sourcingRoute,"merchant_verified_manual");
 assert.equal(out.approved[0].physicalCheckoutAuthorized,false);
 assert.equal(out.approved[0].automaticSupplierOrdering,false);
});
test("supplier email claims alone never enable manual sourcing publication",()=>{
 const data=sample();
 data.providers.hypersku={
  basePlanUsdMonthly:0,apiStatus:"open_api_not_available_low_volume",
  customStoreRoute:"manual_csv_batch_upload_only",
  manualCsvRouteIndependentlyConfirmed:false,
  manualCsvOrderSubmissionAvailable:false
 };
 data.candidates[0].fulfillment.mode="manual";
 data.candidates[0].manualSourcingQuoteFromAuthenticatedDashboard=true;
 const rejected=verifyProviderProducts(data,shortlist,now).rejected;
 assert.equal(rejected.length,1);
 assert.ok(rejected[0].reasons.includes("provider_api_not_active"));
 data.providers.hypersku.manualCsvRouteIndependentlyConfirmed=true;
 data.providers.hypersku.manualCsvOrderSubmissionAvailable=true;
 data.candidates[0].manualSourcingQuoteFromAuthenticatedDashboard=false;
 assert.equal(verifyProviderProducts(data,shortlist,now).approved.length,0);
});


test("malformed supplier timestamps and audit proof fail closed without throwing",()=>{
 const hostile={toString:null,valueOf:null};
 const data=sample();
 data.providers.hypersku.apiConnectivityProof.checkedAt=hostile;
 assert.equal(apiVerified(data.providers.hypersku,now,true),false);
 assert.equal(verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"])).approved.length,0);
 data.providers.hypersku.apiConnectivityProof.checkedAt="2026-10-27T10:55:00Z";
 data.candidates[0].stock.checkedAt=hostile;
 const stock=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"]));
 assert.equal(stock.approved.length,0);
 assert.ok(stock.rejected[0].reasons.includes("current_physical_stock_unverified"));
 data.candidates[0].stock.checkedAt="2026-10-27T10:55:00Z";
 data.candidates[0].usFreight.checkedAt=hostile;
 const freight=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"]));
 assert.equal(freight.approved.length,0);
 assert.ok(freight.rejected[0].reasons.includes("us_shipping_quote_missing_or_stale"));
 data.candidates[0].usFreight.checkedAt="2026-10-27T10:55:00Z";
 data.candidates[0].approvedAt=hostile;
 assert.equal(verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"])).approved.length,0);
});

test("malformed candidate and shortlist records never approve supplier products",()=>{
 const hostile={toString:null,valueOf:null};
 for(const bad of [null,hostile,{slug:hostile,provider:"hypersku"},{slug:"pethair",provider:hostile}]){
  const data=sample();
  data.candidates=[bad];
  const out=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"]));
  assert.equal(out.approved.length,0);
 }
 for(const bad of [null,hostile,{slug:hostile},{slug:""}]){
  const data=sample();
  const out=verifyProviderProducts(data,{candidates:[bad]},now,new Set(["hypersku:api"]));
  assert.equal(out.approved.length,0);
  assert.deepEqual(out.rejected,[{reason:"invalid_registry"}]);
 }
});

test("ZIP evidence requires a literal five-digit string and canonical UTC dates",()=>{
 const hostile={toString:null,valueOf:null};
 for(const bad of [hostile,10001,"1000","100001"]){
  const data=sample();
  data.candidates[0].usFreight.exampleZip=bad;
  const out=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"]));
  assert.equal(out.approved.length,0);
  assert.ok(out.rejected[0].reasons.includes("us_shipping_quote_missing_or_stale"));
 }
 for(const bad of ["2026-02-30T10:55:00Z","2026-10-27T10:55:00+00:00",
                   "2026-10-27T10:55:00","2026-10-27T10:55:00.1Z"]){
  const data=sample();
  data.candidates[0].stock.checkedAt=bad;
  const out=verifyProviderProducts(data,shortlist,now,new Set(["hypersku:api"]));
  assert.equal(out.approved.length,0,bad);
  assert.ok(out.rejected[0].reasons.includes("current_physical_stock_unverified"),bad);
 }
});
