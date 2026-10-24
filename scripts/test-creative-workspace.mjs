import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePack } from '../src/lib/creative-offer.ts';
import { addDraft, brandCardSvg, MAX_DRAFTS, newDraft, PALETTES, parseDrafts, safeFileName, STARTER_TEMPLATES } from '../src/lib/creative-workspace.ts';

const brief={brand:'Example Client',offer:'Community engagement planning',audience:'local partners',outcome:'clearer project communication',proof:'',channel:'LinkedIn'};

test('every starter template produces a complete usable creative pack',()=>{
 assert.equal(STARTER_TEMPLATES.length,6);
 for(const t of STARTER_TEMPLATES){
  const p=makePack(t.brief);
  assert.equal(p.slides.length,6);
  assert.equal(p.shots.length,4);
 }
});
test('projects survive safe JSON round-trip',()=>{
 const d=newDraft(brief,new Date('2026-10-23T00:00:00Z'),'demo_1234');
 assert.deepEqual(parseDrafts(JSON.stringify([d])),[d]);
 assert.deepEqual(parseDrafts('not-json'),[]);
 assert.deepEqual(parseDrafts('{"wrong":true}'),[]);
});
test('untrusted drafts are rejected',()=>{
 const d=newDraft(brief,new Date('2026-10-23T00:00:00Z'),'demo_1234');
 assert.deepEqual(parseDrafts(JSON.stringify([{...d,id:'../../etc/passwd'}])),[]);
 assert.deepEqual(parseDrafts(JSON.stringify([{...d,brief:{...brief,channel:'invalid'}}])),[]);
 assert.deepEqual(parseDrafts(JSON.stringify([{...d,brief:{...brief,offer:'x'.repeat(500)}}])),[]);
 assert.deepEqual(parseDrafts('x'.repeat(180001)),[]);
});
test('draft creation and retention are capped without deleting latest',()=>{
 let list=[];
 for(let i=0;i<MAX_DRAFTS+5;i++) list=addDraft(list,newDraft(brief,new Date('2026-10-23T00:00:00Z'),'project_'+i));
 assert.equal(list.length,MAX_DRAFTS);
 assert.equal(list[0].id,'project_'+(MAX_DRAFTS+4));
 assert.equal(list.at(-1).id,'project_5');
});
test('SVG art encodes user-provided markup, without embedded code',()=>{
 const svg=brandCardSvg({...brief,brand:'<script>alert(1)</script>',offer:'New <img> service'},'sunset');
 assert.match(svg,/&lt;script&gt;/);
 assert.match(svg,/&lt;img&gt;/);
 assert.doesNotMatch(svg,/<script>/);
 assert.doesNotMatch(svg,/<img>/);
 assert.match(svg,/width="1200" height="675"/);
 assert.equal(Object.keys(PALETTES).length,4);
});
test('file names are normalized and safe',()=>{
 assert.equal(safeFileName('A/B <Test>?'),'a-b-test');
 assert.equal(safeFileName('   '),'prismbay-project');
});
