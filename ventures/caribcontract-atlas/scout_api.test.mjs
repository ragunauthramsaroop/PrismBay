import test from "node:test";
import assert from "node:assert/strict";
import {normalizePublicFeed,officialPdfPath,robotsBlock} from "./scout_api.mjs";
const mk=(over={})=>({
 project_id:"PROC-2026-00509",
 project_name:"Supply and Delivery of Road Ambulances",
 agency:"21-Ministry of Health",
 projected_bid_opening_date:"2026-11-26",
 advertisement_documents:[{document_file:"/files/Public Tender Ambulance.pdf"}],
 regions:["Region 04"],
 procurement_nature:"Goods",
 current_state:"Bid Advertised",
 ...over
});
test("reads an explicitly public API record and preserves linked original PDF",()=>{
 const x=normalizePublicFeed([mk()]);
 assert.equal(x.length,1);
 assert.equal(x[0].sector,"Vehicles");
 assert.equal(x[0].agency,"Ministry of Health");
 assert.equal(x[0].deadline,"2026-11-26");
 assert.equal(x[0].advertisedOpeningNotSubmissionCutoff,true);
 assert.equal(x[0].originalDocument,"https://eprocure.gov.gy/files/Public%20Tender%20Ambulance.pdf");
 assert.equal(x[0].source,"https://eprocure.gov.gy/");
});
test("prevents outside domains, unsafe file paths and non-pdf sources",()=>{
 for(const bad of ["//other.example/file.pdf","http://example.test/files/a.pdf","/files/x.csv","/redirect/x.pdf","https://eprocure.gov.gy.evil.test/files/one.pdf"]){
  assert.equal(officialPdfPath(bad),null);
 }
});
test("filters bad identifiers, impossible dates, duplicate adverts and HTML source injection",()=>{
 const x=normalizePublicFeed([mk(),
  mk({project_id:"PROC-2026-00509"}),
  mk({project_id:"PROC-2026-00123",projected_bid_opening_date:"2026-02-30"}),
  mk({project_id:"PROC-2026-00510",project_name:"<script>alert('x')</script> Tender"}),
  mk({project_id:"PROC-2026-00511",agency:"?"}),
  mk({project_id:"PROC-2026-00512",project_name:"Supply and Delivery of IT Equipment",advertisement_documents:[]})]);
 assert.equal(x.length,2);
 assert.equal(x[1].sector,"Technology");
 assert.equal(x[1].originalDocument,null);
 for(const item of x){assert.ok(!JSON.stringify(item).includes("<script>"))}
});
test("respects official robots path restrictions and specific allows",()=>{
 assert.equal(robotsBlock("User-agent: *\nDisallow: /\n","/api/method/x"),true);
 assert.equal(robotsBlock("User-agent: *\nDisallow: /admin\n","/api/method/x"),false);
 assert.equal(robotsBlock("User-agent: *\nDisallow: /api\nAllow: /api/method/doctracker/\n","/api/method/doctracker/x"),false);
 assert.equal(robotsBlock("User-agent: BotA\nDisallow: /\nUser-agent: *\nAllow: /\n","/api/method/x"),false);
});
test("refuses missing, non-array and excessive official feed responses",()=>{
 for(const x of [null,{},[],new Array(501).fill(mk())])assert.throws(()=>normalizePublicFeed(x));
});
