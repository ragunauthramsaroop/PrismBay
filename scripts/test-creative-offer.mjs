import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePack, markdown, landingHtml, escapeHtml } from '../src/lib/creative-offer.ts';

const brief={brand:'Example Company',offer:'Business campaign service',audience:'independent shops',outcome:'clearer brand messaging',proof:'',channel:'LinkedIn'};

test('generates connected deliverables',()=>{
 const p=makePack(brief);
 assert.equal(p.headlines.length,3);
 assert.equal(p.shots.length,4);
 assert.equal(p.slides.length,6);
 assert.equal(p.tasks.length,7);
 assert.match(markdown(p),/Presentation/);
 assert.match(landingHtml(p),/<!doctype html>/);
});
test('requires real input',()=>{
 assert.throws(()=>makePack({...brief,brand:'x'}),/complete/);
 assert.throws(()=>makePack({...brief,audience:''}),/complete/);
 assert.throws(()=>makePack({...brief,channel:'Unknown'}),/valid channel/);
});
test('evidence is never labelled verified',()=>{
 assert.match(makePack({...brief,proof:'200% growth'}).slides[3].bullets[0],/not verified/);
 assert.match(makePack(brief).slides[3].bullets[0],/No evidence supplied/);
});
test('HTML-escapes malicious user fields',()=>{
 const p=makePack({...brief,brand:'<img src=x onerror=alert(1)>',offer:'<script>alert(1)</script> service'});
 const h=landingHtml(p);
 assert.doesNotMatch(h,/<script>/);
 assert.doesNotMatch(h,/<img src=x/);
 assert.match(h,/&lt;script&gt;/);
 assert.match(h,/%3Cimg%20src/);
 assert.equal(escapeHtml("'&<>"),'&#39;&amp;&lt;&gt;');
});
test('truncates long input and strips control chars',()=>{
 const p=makePack({...brief,brand:'  Name\nHere ',offer:'a'.repeat(900)});
 assert.match(p.title,/Name Here/);
 assert.ok(p.landing.sections[1].body.length<=180);
});
test('no false media or payment claims',()=>{
 const p=makePack(brief);
 assert.match(p.warning,/No video, PowerPoint, screenshot reconstruction, publication or payment/);
});
