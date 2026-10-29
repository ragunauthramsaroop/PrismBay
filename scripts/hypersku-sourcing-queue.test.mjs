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

test('future-dated submissions never count as verified sourcing activity',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requests:[
  {slug:'pethair',aliExpressUrl:link(1),status:'submitted',submittedAt:'2026-10-30T11:00:00Z'}
 ]},short,Date.parse('2026-10-29T03:00:00Z'));
 assert.equal(x.valid,false);
 assert.ok(x.errors.includes('future_submission_timestamp'));
 assert.equal(x.submitted,0);
});
test('rollover dates and timezone-ambiguous timestamps fail closed',()=>{
 for(const submittedAt of ['2026-02-30T11:00:00Z','2026-10-28T11:00:00','2026-10-28T11:00:00+00:00']){
  const x=validateSourcingQueue({schemaVersion:1,requests:[
   {slug:'pethair',aliExpressUrl:link(1),status:'submitted',submittedAt}
  ]},short,Date.parse('2026-10-29T03:00:00Z'));
  assert.equal(x.valid,false,submittedAt);
  assert.ok(x.errors.includes('missing_valid_submission_timestamp'),submittedAt);
  assert.equal(x.submitted,0);
 }
});
test('paid sourcing and execution flags are rejected rather than silently ignored',()=>{
 const x=validateSourcingQueue({schemaVersion:1,requestQuota:{paidLinksAuthorized:true},
  automaticallySubmitted:1,orderImportAuthorized:true,physicalCheckoutEnabled:true,requests:[]},short);
 assert.equal(x.valid,false);
 assert.ok(x.errors.includes('paid_sourcing_not_authorized'));
 assert.ok(x.errors.includes('unsafe_execution_flag'));
 assert.equal(x.automaticallySubmitted,0);
 assert.equal(x.physicalCheckoutEnabled,false);
});

test('string-encoded and malformed authorizations cannot bypass the no-spend gate',()=>{
 for(const flag of ['true','0',-1,null,1]){
  const paid=validateSourcingQueue({schemaVersion:1,paidLinksAuthorized:flag,requests:[]},short);
  assert.equal(paid.valid,false,String(flag));
  assert.ok(paid.errors.includes('paid_sourcing_not_authorized'));
  const auto=validateSourcingQueue({schemaVersion:1,automaticallySubmitted:flag,requests:[]},short);
  assert.equal(auto.valid,false,String(flag));
  assert.ok(auto.errors.includes('unsafe_execution_flag'));
 }
});
test('manual order, wallet funding and supplier-order flags remain disabled',()=>{
 for(const key of ['manualCsvOrdersEnabled','manualCsvOrderSubmissionAuthorized',
                    'walletFundingAuthorized','automaticOrdersEnabled']){
  const x=validateSourcingQueue({schemaVersion:1,requests:[],[key]:true},short);
  assert.equal(x.valid,false,key);
  assert.ok(x.errors.includes('unsafe_execution_flag'),key);
 }
});

test('per-request execution flags cannot override queue-wide supplier restrictions',()=>{
 const base={slug:'pethair',aliExpressUrl:link(1),status:'ready_to_submit'};
 for(const key of ['orderImportAuthorized','physicalCheckoutEnabled',
   'automaticallySubmitted','manualCsvOrdersEnabled',
   'manualCsvOrderSubmissionAuthorized','walletFundingAuthorized',
   'automaticOrdersEnabled']){
  for(const flag of [true,'false',1,null]){
   const x=validateSourcingQueue({schemaVersion:1,requests:[{...base,[key]:flag}]},short);
   assert.equal(x.valid,false,key+':'+String(flag));
   assert.ok(x.errors.includes('unsafe_execution_flag'),key);
   assert.equal(x.physicalCheckoutEnabled,false);
  }
 }
 for(const flag of [true,'false',1,null]){
  const x=validateSourcingQueue({schemaVersion:1,requests:[{...base,paidLinksAuthorized:flag}]},short);
  assert.equal(x.valid,false,String(flag));
  assert.ok(x.errors.includes('paid_sourcing_not_authorized'));
 }
});

test('malformed sourcing rows fail closed with a structured error instead of crashing',()=>{
 for(const malformed of [null,false,0,'invalid',[]]){
  const result=validateSourcingQueue({schemaVersion:1,requests:[malformed]},short);
  assert.equal(result.valid,false,String(malformed));
  assert.ok(result.errors.includes('invalid_sourcing_request'),String(malformed));
  assert.equal(result.submitted,0);
  assert.equal(result.readyToSubmit,0);
  assert.equal(result.physicalCheckoutEnabled,false);
 }
});
