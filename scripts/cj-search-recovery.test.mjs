import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedCJQueries,buildCJProductSearchUrl,cjSearchDiagnostic} from './cj-search-recovery.mjs';

test('at most one rotated official search per category and day',()=>{
 const c={slug:'pethair',query:'pet hair remover'};
 const today=boundedCJQueries(c,'2026-10-31T12:00:00Z');
 assert.equal(today.length,1);
 assert.ok(today[0].length > 3);
 assert.deepEqual(today,boundedCJQueries(c,'2026-10-31T20:00:00Z'));
 const week=Array.from({length:6},(_,i)=>boundedCJQueries(c,new Date(Date.UTC(2026,9,31+i)))[0]);
 assert.ok(new Set(week).size >= 4);
 assert.deepEqual(boundedCJQueries({slug:'pethair',query:''}),[]);
});
test('use minimal documented CJ V2 query, with no inventory or category assumptions',()=>{
 const url=buildCJProductSearchUrl('  reusable pet hair remover  ');
 assert.equal(url.host,'developers.cjdropshipping.com');
 assert.equal(url.pathname,'/api2.0/v1/product/listV2');
 assert.equal(url.searchParams.get('keyWord'),'reusable pet hair remover');
 assert.equal(url.searchParams.get('countryCode'),'US');
 assert.equal(url.searchParams.size,4);
 for(const k of ['verifiedWarehouse','startWarehouseInventory','features','orderBy','sort'])assert.equal(url.searchParams.has(k),false);
 const global=buildCJProductSearchUrl('pet hair remover',null);
 assert.equal(global.searchParams.has('countryCode'),false);
 assert.throws(()=>buildCJProductSearchUrl(''),/valid_cj_query/);
 assert.throws(()=>buildCJProductSearchUrl('test','CN'),/unsupported_market/);
});
test('classifies API failure without exposing credentials or arbitrary messages',()=>{
 const examples=[
  ['CJ API points quota exhausted (code 1600201)','quota_exhausted',true,'1600201'],
  ['CJ request failed (HTTP 429, code 1600200)','rate_limited',true,'1600200'],
  ['CJ request failed (HTTP 400, code 1600100)','request_rejected',true,'1600100'],
  ['CJ request failed (HTTP 403, code 403)','authentication_rejected',true,'403'],
  ['CJ network request failed','network_unavailable',false,null],
 ];
 for(const [message,kind,fatal,code] of examples){
  const d=cjSearchDiagnostic(new Error(message+' secret_xxx'));
  assert.deepEqual(d,{code,kind,fatal});
  assert.equal(JSON.stringify(d).includes('secret_xxx'),false);
 }
});
