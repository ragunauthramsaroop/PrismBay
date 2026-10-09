import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateSearches,uniqueEligibleProducts,selectBestInspection} from './cj-search-strategy.mjs';

test('priority live categories receive up to four bounded alternate searches',()=>{
 const research=candidateSearches({slug:'cordless-handheld-vacuum',query:'cordless handheld vacuum'});
 assert.equal(research.length,5);
 assert.match(research[1],/portable/);
 assert.match(research[2],/mini/);
 assert.match(research[3],/rechargeable/);
 assert.match(research[4],/car vacuum/);
 const live=candidateSearches({slug:'pressure-washer',query:'cordless pressure washer'});
 assert.equal(live.length,5);
 assert.match(live[1],/battery/);
 assert.match(live[2],/car/);
 assert.match(live[3],/water gun/);
 assert.match(live[4],/rechargeable/);
 assert.equal(candidateSearches({slug:'unapproved',query:'unknown'}).length,1);
 assert.deepEqual(candidateSearches({slug:'unapproved'}),[]);
});

test('current supplier-search blockers receive broader synonym coverage',()=>{
 for (const [slug,query] of [
  ['scrubber','electric spin scrubber'],
  ['mattress-vacuum','mattress bed vacuum cleaner'],
  ['mini-mop','mini self squeeze mop'],
  ['home-caddy','portable cleaning supply caddy'],
  ['roll-up-dish-rack','roll up dish rack'],
 ]) {
  const searches=candidateSearches({slug,query});
  assert.ok(searches.length>=4,`${slug} should have broader bounded search coverage`);
  assert.ok(searches.length<=5,`${slug} search count must remain bounded`);
 }
});

test('duplicate search phrases are removed and input stays bounded',()=>{
 const searches=candidateSearches({slug:'pressure-washer',query:'battery portable pressure washer'});
 assert.equal(new Set(searches.map(x=>x.toLowerCase())).size,searches.length);
 assert.ok(searches.length<=5);
 assert.deepEqual(candidateSearches({slug:'pressure-washer',query:'x'.repeat(101)}),[]);
});

test('one duplicate CJ PID is inspected once and at most three alternatives are probed',()=>{
 const first=[{id:'p1',nameEn:'Cordless Handheld Vacuum'}];
 const second=[{id:'p1'},{id:'p2'},{id:'p3'},{id:'p4'}];
 assert.deepEqual(uniqueEligibleProducts([first,second]).map(x=>x.id),['p1','p2','p3']);
 assert.throws(()=>uniqueEligibleProducts([first,second],99),/limit/);
});

test('choose positive freight after inspecting a later matched candidate',()=>{
 const zero={supplierVerified:true,variantInventoryVerified:true,freightVerified:false,status:'supplier_matched_freight_pending'};
 const quoted={supplierVerified:true,variantInventoryVerified:true,freightVerified:true,status:'supplier_matched_us_freight_estimate'};
 assert.equal(selectBestInspection([zero,quoted]),quoted);
});

test('keep verified variant if another alternate lacks physical stock',()=>{
 const stock={supplierVerified:true,variantInventoryVerified:true,freightVerified:false};
 const noStock={supplierVerified:true,variantInventoryVerified:false,freightVerified:false};
 assert.equal(selectBestInspection([stock,noStock]),stock);
 assert.equal(selectBestInspection([]),null);
});
