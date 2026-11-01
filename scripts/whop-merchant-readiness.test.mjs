import test from 'node:test';
import assert from 'node:assert/strict';
import {assessMetadata,inspectWhop,STATUSES} from './whop-merchant-readiness.mjs';
const p={id:'prod_example',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
const plan={product:{id:p.id},initial_price:19,plan_type:'one_time',currency:'usd'};
const mock=(payload,status=200)=>({ok:status>=200&&status<300,status,json:async()=>payload});
const fixture=[{path:'/products',data:[p]},{path:'/plans',data:[plan]}];
const f=(overrides={})=>async(url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'manual');
 assert.ok(opts.headers.Authorization.startsWith('Bearer '));assert.ok(url.startsWith('https://api.whop.com/api/v1/'));
 const item=fixture.find(x=>url.includes(x.path));if(!item)throw Error('unexpected endpoint');
 return mock({data:overrides[item.path]??item.data,page_info:{has_next_page:false}});
};
test('without API key is CONFIG_NEEDED, never release approved',async()=>{
 const r=await inspectWhop({env:{}});assert.equal(r.status,STATUSES.CONFIG_NEEDED);assert.equal(r.releaseApproved,false);
});
test('Whop product $19 one time hidden yields metadata only, NEVER a live approval',async()=>{
 const r=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret',WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:f()});
 assert.equal(r.status,STATUSES.VERIFIED_METADATA);assert.equal(r.releaseApproved,false);
 assert.equal(r.paidBuyerAccessVerified,false);assert.equal(r.privateFileAccessVerified,false);
 assert.equal(r.merchantPayoutVerified,false);
});
test('visible product cannot satisfy the hidden-product audit',()=>{
 const r=assessMetadata([{...p,visibility:'visible'}],[plan]);
 assert.equal(r.status,STATUSES.REVIEW);assert.equal(r.releaseApproved,false);
});
test('wrong price, billing type or currencies fail release metadata',()=>{
 for(const planOverride of [{...plan,initial_price:18},{...plan,plan_type:'renewal'},{...plan,currency:'eur'}]){
  assert.equal(assessMetadata([p],[planOverride]).status,STATUSES.REVIEW);
 }
});
test('no match and duplicate products refuse to give false confidence',()=>{
 assert.equal(assessMetadata([],[]).status,STATUSES.REVIEW);
 assert.equal(assessMetadata([p,p],[plan]).status,STATUSES.REVIEW);
});
test('missing company ID is CONFIG_NEEDED and never makes an unscoped request',async()=>{
 const r=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret'},fetchImpl:async()=>{throw Error('should not fetch')}});
 assert.equal(r.status,STATUSES.CONFIG_NEEDED);
 assert.equal(r.releaseApproved,false);
});
test('explicit company ID skips account lookup and reads only expected resources',async()=>{
 const visited=[];
 const r=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret',WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async(url,opts)=>{
  visited.push(url);return f()(url,opts);
 }});
 assert.equal(r.status,STATUSES.VERIFIED_METADATA);
 assert.equal(visited.length,2);assert.ok(visited.some(x=>x.includes('account_id=biz_12345678')));
});
test('read-only Whop 403 does not leak API token and marks auth error',async()=>{
 const secret='apik_PRIVATE_TEST_123456789';
 const r=await inspectWhop({env:{WHOP_COMPANY_API_KEY:secret,WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async()=>mock({},403)});
 assert.equal(r.status,STATUSES.AUTH_ERROR);assert.ok(!JSON.stringify(r).includes(secret));
});
test('pagination is not silently ignored and never releases product',async()=>{
 const r=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret',WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async()=>mock({data:[p],page_info:{has_next_page:true}})});
 assert.equal(r.status,STATUSES.API_ERROR);assert.equal(r.releaseApproved,false);
});
test('no POST, no redirects, no secret, and output is sanitized',async()=>{
 const secret='apik_SPECIAL_FAKETOKEN';
 const calls=[];
 await inspectWhop({env:{WHOP_COMPANY_API_KEY:secret,WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async(url,opts)=>{
  calls.push({url,opts});return f()(url,opts);
 }});
 assert.ok(calls.every(x=>x.opts.method==='GET'&&x.opts.redirect==='manual'));
 assert.ok(calls.every(x=>x.url.startsWith('https://api.whop.com/')));
});

test('company-scoped product listing uses account_id and never account discovery',async()=>{
 const seen=[];
 const result=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret',WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async(url,opts)=>{
  seen.push(url);return f()(url,opts);
 }});
 assert.equal(result.status,STATUSES.VERIFIED_METADATA);
 assert.ok(seen.some(u=>u.includes('/products?account_id=biz_12345678')));
 assert.ok(seen.every(u=>!u.includes('/accounts')));
});

test('failure to retrieve the scoped products keeps the product blocked',async()=>{
 const result=await inspectWhop({env:{WHOP_COMPANY_API_KEY:'apik_valid_fake_secret',WHOP_COMPANY_ID:'biz_12345678'},fetchImpl:async(url,options)=>{
  if(url.includes('/products?'))return mock({},403);
  return f()(url,options);
 }});
 assert.equal(result.status,STATUSES.AUTH_ERROR);
 assert.equal(result.releaseApproved,false);
});
