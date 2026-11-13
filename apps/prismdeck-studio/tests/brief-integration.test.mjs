import test from "node:test";
import assert from "node:assert/strict";
import {buildSourceDeck,sourceSummary} from "../src/source-deck.js";
import {parseBrief} from "../src/brief.js";
const doc={name:"energy.txt",kind:"article",text:"The organization completed workforce training for site operations and achieved a strong attendance rate. Solar equipment installations reduced fuel demand at the facilities during the reporting period. Carbon emissions reporting was introduced to quantify climate outcomes across several operational units. Diesel savings require additional verification from financial records and equipment meters. Finance approvals will determine the next investment phases."};
test("focus directives prioritize matching source sentences without inventing facts",()=>{
 const options=parseBrief("Prepare 8 board slides and focus on carbon emissions and diesel savings. Keep text concise.");
 const deck=buildSourceDeck([doc],{...options,title:"Operations briefing"});
 assert.equal(deck.slides.length,8);
 assert.equal(deck.slides[0].title,"Operations briefing");
 assert.ok(deck.slides[0].notes.includes("carbon emissions"));
 assert.match(deck.slides[1].body,/Carbon emissions|Diesel savings/i);
 assert.match(deck.slides[1].notes,/energy.txt/);
});
test("source focus ranking retains only statements from uploaded material",()=>{
 const first=sourceSummary(doc,1,["diesel savings"]);
 assert.match(first[0],/Diesel savings/);
 assert.ok(doc.text.includes(first[0]));
});
test("no-charts user instruction excludes sheet graphs",()=>{
 const sheet={name:"costs.xlsx",kind:"spreadsheet",text:"Financial expense by department is recorded in the attached workbook. Cost figures need approval.",numericSeries:[{label:"First",value:20},{label:"Second",value:45}]};
 const d=buildSourceDeck([sheet],{count:8,omitCharts:true});
 assert.equal(d.slides.some(s=>s.layout==="chart"),false);
});
