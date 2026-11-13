import test from "node:test";
import assert from "node:assert/strict";
import {sentences,sourceSummary,extractQuantifiedFacts,buildSourceDeck} from "../src/source-deck.js";
const report={name:"industrial-performance.pdf",kind:"pdf",text:"Solar generation rose during the reporting period. The first operating phase installed 46 MW of solar generation.\n\nDiesel consumption declined by 17 million liters per year in the operating plan. Further construction requires verified cost estimates and approvals. The next reporting period will include workforce outcomes."};
test("source decks support controlled slide count",()=>{
 for(const n of [4,5,8,14]){
  const d=buildSourceDeck([report],{count:n,theme:"cobalt",audience:"Investors"});
  assert.equal(d.slides.length,n);assert.equal(d.theme,"cobalt");
  assert.ok(d.slides.some(s=>s.notes.includes("industrial-performance.pdf")));
 }
});
test("facts remain traceable to their source, not guessed",()=>{
 const x=extractQuantifiedFacts(report);
 assert.ok(x.length>=2);
 assert.ok(x.some(y=>y.evidence.includes("46 MW")));
});
test("chart uses uploaded spreadsheet values",()=>{
 const sheet={name:"metrics.xlsx",kind:"spreadsheet",text:"A department comparison reveals measurable performance across three regions. Values are drawn from the workbook.",numericSeries:[{label:"North",value:15},{label:"South",value:36},{label:"East",value:48}]};
 const d=buildSourceDeck([sheet],{count:8});
 const c=d.slides.find(s=>s.layout==="chart");
 assert.deepEqual(c.chartValues,[15,36,48]);
});
test("no source text blocks deck generation",()=>assert.throws(()=>buildSourceDeck([{name:"x",text:""}]),/No readable source/));
test("normalizes source text and maintains usable summaries",()=>{
 assert.ok(sentences(report.text).length>=3);
 assert.ok(sourceSummary(report).length>=3);
});
