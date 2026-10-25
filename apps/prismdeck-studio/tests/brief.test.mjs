import test from "node:test";
import assert from "node:assert/strict";
import {parseBrief,keywordsOf} from "../src/brief.js";
test("instructions override slide number, audience and dark design",()=>{
 const spec=parseBrief("Make 10 slides for the board. Focus on diesel savings and carbon emissions. Keep text concise. Dark theme.",{count:8,audience:"Clients",theme:"cobalt"});
 assert.equal(spec.count,10);assert.equal(spec.audience,"Executive board");assert.equal(spec.theme,"midnight");
 assert.deepEqual(keywordsOf(spec.focus).slice(0,2),["diesel","savings"]);assert.equal(spec.concise,true);
});
test("respects explicit no-charts condition",()=>{
 const b=parseBrief("Please highlight workforce engagement. Do not use charts. Make 5 slides for investors.");
 assert.equal(b.count,5);assert.equal(b.audience,"Investors");assert.equal(b.omitCharts,true);
});
test("rejects unsafe slide numbers by clamping",()=>{
 assert.equal(parseBrief("I need 99 slides").count,14);
 assert.equal(parseBrief("Only 2 slides").count,4);
});
test("allows clean defaults",()=>{
 const b=parseBrief("Write a presentation",{theme:"sand",audience:"Classroom",count:6});
 assert.equal(b.count,6);assert.equal(b.audience,"Classroom");assert.equal(b.theme,"sand");assert.deepEqual(b.focus,[]);
});
test("extracts short requested title",()=>{
 assert.equal(parseBrief('Title: Investment strategy. Make 8 slides.').title,"Investment strategy");
});
