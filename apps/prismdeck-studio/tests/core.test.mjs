import test from "node:test";
import assert from "node:assert/strict";
import {starterDeck,generateDeck,parseOutline,sanitizeDeck,THEMES,LAYOUTS,safeFileName,bulletLines,markdownExport} from "../src/core.js";
test("starter deck is editable and has all preview layout varieties",()=>{
  const deck=starterDeck();
  assert.equal(deck.slides.length,8);
  assert.equal(new Set(deck.slides.map(s=>s.layout)).size,8);
  assert.equal(sanitizeDeck(deck).slides.length,8);
});
test("generates presentation with requested length without invented facts",()=>{
  for(const count of [4,5,6,7,8,10,12,14]){
    const deck=generateDeck("Renewable energy investment",{count,theme:"cobalt",audience:"Investors"});
    assert.equal(deck.slides.length,count);
    assert.equal(deck.theme,"cobalt");
    assert.equal(deck.audience,"Investors");
    assert.match(deck.slides[0].title,/Renewable energy/);
    assert.equal(deck.slides.at(-1).layout,"closing");
  }
});
test("rejects underspecified prompts",()=>assert.throws(()=>generateDeck("hi"),/at least five/));
test("imports markdown outlines and supports export",()=>{
  const result=parseOutline("# Project\n\n## Opening\nIntro\n\n## Case\n- First\n- Second");
  assert.equal(result.slides.length,2);
  assert.equal(result.slides[1].body,"First\nSecond");
  assert.match(markdownExport(result),/## Case/);
});
test("normalizes unsafe input and duplicate ids",()=>{
  const raw={title:"Example",theme:"bad",slides:[{layout:"bad",id:"same",title:"A"},{layout:"bullets",id:"same",title:"B"}]};
  const d=sanitizeDeck(raw);
  assert.equal(d.theme,"midnight");
  assert.equal(d.slides[0].layout,"bullets");
  assert.notEqual(d.slides[0].id,d.slides[1].id);
  assert.throws(()=>sanitizeDeck({slides:[]}),/requires/);
});
test("guards filenames, bullets and theme lookup",()=>{
  assert.equal(safeFileName("Board: 2026 / Decision?"),"board-2026-decision");
  assert.deepEqual(bulletLines({body:"A\n\nB"}),["A","B"]);
  assert.equal(Object.keys(THEMES).length,4);
  assert.ok(LAYOUTS.includes("chart"));
});
