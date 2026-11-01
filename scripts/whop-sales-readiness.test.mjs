import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLaunch,classifyAccount} from './whop-sales-readiness.mjs';

const env={WHOP_COMPANY_API_KEY:'apik_mock_secret_1234567',WHOP_COMPANY_ID:'biz_test123456'};
const product={id:'prod_1',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
const variant={id:'plan_1',product:{id:'prod_1'},billing_type:'one_time',currency:'usd',initial_price:19,purchase_url:'https://whop.com/clean/checkout/plan_1'};
const fixture={'/products':{data:[product],page_info:{has_next_page:false}},
 '/variants':{data:[variant],page_info:{has_next_page:false}},
 '/accounts':{capabilities:{standard_payout:true},required_actions:[]}};
const fetcher=(override={})=>async(url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'manual');
 assert.equal(opts.headers['Api-Version-Date'],'2026-10-29-8');
 assert.match(opts.headers.Authorization,/^Bearer /);
 assert.ok(url.startsWith('https://api.whop.com/api/v1/'));
 const key=Object.keys(fixture).find(x=>url.includes(x));
 if(!key)throw Error('unknown fixture path');
 const f=override[key]??fixture[key];
 return {ok:true,status:200,json:async()=>f};
};
test('missing secret or company ID blocks audit',async()=>{
 assert.equal((await inspectLaunch({env:{}})).status,'CONFIG_NEEDED');
 assert.equal((await inspectLaunch({env:{WHOP_COMPANY_API_KEY:env.WHOP_COMPANY_API_KEY}})).status,'CONFIG_NEEDED');
});
test('valid payout capability still does not establish Files entitlement',async()=>{
 const r=await inspectLaunch({env,fetchImpl:fetcher()});
 assert.equal(r.status,'REVIEW');
 assert.equal(r.checkoutUrlVerified,true);
 assert.equal(r.merchantPayoutVerified,true);
 assert.equal(r.launchApproved,false);
 assert.equal(r.paidBuyerAccessVerified,false);
 assert.equal(r.anonymousAccessVerified,false);
 assert.equal(r.privateFileAccessVerified,false);
});
test('never expose a checkout URL, key or raw Whop account body in report',async()=>{
 const r=await inspectLaunch({env,fetchImpl:fetcher()});
 assert.ok(!JSON.stringify(r).includes('https://whop.com/clean/checkout/'));
 assert.ok(!JSON.stringify(r).includes(env.WHOP_COMPANY_API_KEY));
});
test('missing purchase link does not assert checkout readiness',async()=>{
 const r=await inspectLaunch({env,fetchImpl:fetcher({'/variants':{data:[{...variant,purchase_url:null}],page_info:{has_next_page:false}}})});
 assert.equal(r.checkoutUrlVerified,false);
 assert.equal(r.launchApproved,false);
});
test('foreign checkout domain fails safe',async()=>{
 const r=await inspectLaunch({env,fetchImpl:fetcher({'/variants':{data:[{...variant,purchase_url:'https://whop.com.evil.net/checkout/1'}],page_info:{has_next_page:false}}})});
 assert.equal(r.checkoutUrlVerified,false);
});
test('account verification with required actions is incomplete',()=>{
 assert.deepEqual(classifyAccount({capabilities:{standard_payout:true},required_actions:[{id:'any'}]}),
  {payoutCapability:'ACTIVE',requiredActionCount:1,payoutVerified:false});
});
test('not enough information never falsely approves payouts',()=>{
 assert.equal(classifyAccount({capabilities:{standard_payout:'pending'}}).payoutVerified,false);
 assert.equal(classifyAccount(null).payoutVerified,false);
});
test('403 account access is reported as insufficient scope, not a revenue failure',async()=>{
 const f=async(url,opts)=>url.includes('/accounts/')?
   {ok:false,status:403,json:async()=>({})}:fetcher()(url,opts);
 const r=await inspectLaunch({env,fetchImpl:f});
 assert.equal(r.status,'REVIEW');
 assert.equal(r.accountCheck,'INSUFFICIENT_READ_SCOPE');
 assert.equal(r.merchantPayoutVerified,false);
});
test('missing product cannot be advertised as ready',async()=>{
 const r=await inspectLaunch({env,fetchImpl:fetcher({'/products':{data:[],page_info:{has_next_page:false}}})});
 assert.equal(r.status,'REVIEW');assert.equal(r.launchApproved,false);
});
test('API failure never leaks token or enables sales',async()=>{
 const r=await inspectLaunch({env,fetchImpl:async()=>({ok:false,status:401})});
 assert.equal(r.status,'API_ERROR');assert.equal(r.launchApproved,false);
 assert.ok(!JSON.stringify(r).includes(env.WHOP_COMPANY_API_KEY));
});
