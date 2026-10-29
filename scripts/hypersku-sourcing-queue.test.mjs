import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSourcingQueue} from './hypersku-sourcing-queue.mjs';
const short={candidates:[{slug:'pethair'},{slug:'drain-catcher'},{slug:'crevice'},{slug:'mini-mop'}]};
const link=n=>'https://www.aliexpress.com/item/'+(1000000000000+n)+'.html';
test('empty research queue is valid with no product or sourcing claim',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requests:[]},short);
 assert.equal(x.valid,true);assert.equal(x.submitted,0);
 assert.equal(x.automaticallySubmitted,0);assert.equal(x.physicalCheckoutEnabled,false);
});
test('direct exact AliExpress URLs may be queued but never automatically submitted',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requests:[{slug:'pethair',aliExpressUrl:link(1),status:'ready_to_submit'}]},short);
 assert.equal(x.valid,true);assert.equal(x.readyToSubmit,1);assert.equal(x.automaticallySubmitted,0);
});
test('shortened or affiliate URLs and duplicates are rejected',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requests:[
  {slug:'pethair',aliExpressUrl:'https://s.click.aliexpress.com/e/invalid',status:'candidate'},
  {slug:'pethair',aliExpressUrl:'https://www.aliexpress.com/item/1000000000001.html?affiliate=1',status:'candidate'}
 ]},short);
 assert.equal(x.valid,false);
 assert.ok(x.errors.includes('invalid_direct_aliexpress_item_url'));
 assert.ok(x.errors.includes('duplicate_product_slug'));
});
test('four submitted sourcing requests in same day violate no-cost cap',()=>{
 const r=['pethair','crevice','mini-mop','drain-catcher'].map((slug,i)=>({slug,aliExpressUrl:link(i+1),status:'submitted',submittedAt:'2026-10-28T11:00:00Z'}));
 const x=validateSourcingQueue({schemaVersion:1,requests:r},short);
 assert.equal(x.valid,false);
 assert.ok(x.errors.some(s=>s.startsWith('free_daily_sourcing_limit_exceeded')));
});
test('quote received never equates to website sale',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requests:[{slug:'pethair',aliExpressUrl:link(1),status:'quote_received',submittedAt:'2026-10-27T11:00:00Z'}]},short);
 assert.equal(x.valid,true);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.orderImportAuthorized,false);
});

test('a second day cannot exceed stricter published three-free-per-48-hours cap',()=>{
 const r=[
  {slug:'pethair',aliExpressUrl:link(1),status:'submitted',submittedAt:'2026-10-27T09:00:00Z'},
  {slug:'crevice',aliExpressUrl:link(2),status:'submitted',submittedAt:'2026-10-27T11:00:00Z'},
  {slug:'mini-mop',aliExpressUrl:link(3),status:'submitted',submittedAt:'2026-10-28T09:00:00Z'},
  {slug:'drain-catcher',aliExpressUrl:link(4),status:'submitted',submittedAt:'2026-10-28T11:00:00Z'}
 ];
 const x=validateSourcingQueue({schemaVersion:1,requests:r},short);
 assert.equal(x.valid,false);
 assert.ok(x.errors.includes('free_48hour_sourcing_limit_exceeded'));
});
