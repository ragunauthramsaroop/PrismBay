import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateSnapshot,guyanaDate,filterNotices,categoryForTitle,readinessScore} from "./rules.mjs";
const root=JSON.parse(fs.readFileSync(new URL("./notices.json",import.meta.url),"utf8"));
test("official snapshot matches verifiable provenance and six records",()=>{
 const result=validateSnapshot(root);
 assert.equal(result.status,"PASS");
 assert.equal(result.count,6);
 assert.equal(result.source,"https://eprocure.gov.gy/");
 assert.equal(root.status,"manual_public_snapshot_not_live");
});
test("old notices do not appear after their closing date",()=>{
 assert.equal(filterNotices(root,{asOf:"2026-11-05"}).length,6);
 const later=filterNotices(root,{asOf:"2026-12-01"});
 assert.equal(later.length,1);
 assert.match(later[0].title,/Overwinning/);
 assert.equal(filterNotices(root,{asOf:"2027-01-07"}).length,0);
});
test("sector and search filters support genuine buyer questions",()=>{
 const v=filterNotices(root,{asOf:"2026-11-05",sector:"Vehicles",query:"Ambulances"});
 assert.equal(v.length,1);
 assert.match(v[0].title,/Road Ambulances/);
 assert.equal(categoryForTitle("Supply of five road ambulances"),"Vehicles");
 assert.equal(categoryForTitle("Bridge construction project"),"Construction");
 assert.equal(categoryForTitle("Supply of IT Equipment"),"Technology");
 assert.equal(categoryForTitle("Provision of security services"),"Services");
});
test("source spoofing, fabricated values, invalid dates and duplicates are refused",()=>{
 const bad=fn=>{const d=structuredClone(root);fn(d);assert.throws(()=>validateSnapshot(d));};
 bad(d=>d.source="https://example.org");
 bad(d=>d.notices[0].source="https://lookalike-eprocure.gov.gy.example.org");
 bad(d=>d.notices[0].title="<script>alert(1)</script>");
 bad(d=>d.notices[0].deadline="2026-02-30");
 bad(d=>d.notices.push({...d.notices[0],id:"NEW-ID-222"}));
 bad(d=>d.notices[0].id=d.notices[1].id);
});
test("time zones and readiness counts never imply a guaranteed award",()=>{
 assert.equal(guyanaDate(new Date("2026-11-06T02:00:00Z")),"2026-11-05");
 assert.deepEqual(readinessScore([true,true,false,false,false,true,true]),{completed:4,remaining:3});
 assert.throws(()=>readinessScore([true,true]));
});
