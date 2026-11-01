import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReleaseEvidence,runForensicAgency,summaryMarkdown} from './whop-agency-forensic-audit.mjs';
import {RESULT} from './whop-public-access-audit.mjs';
const seller={productMetadataVerified:true,checkoutUrlVerified:true,merchantPayoutVerified:false};
test('admin preview or checkout URL alone never approves a sale',()=>{
 const r=assessReleaseEvidence({seller,anonymous:{outcome:RESULT.NOT_CONFIGURED},
 checkout:'REACHABLE',storefront:'REACHABLE'});
 assert.equal(r.status,'LAUNCH_BLOCKED');
 assert.equal(r.launchApproved,false);
 assert.equal(r.roles.security.paidBuyerDownloadVerified,false);
 assert.equal(r.roles.security.freeMemberDenied,false);
 assert.equal(r.roles.payments.payoutVerified,false);
});
test('even valid anonymous denial is insufficient without real buyers and payouts',()=>{
 const r=assessReleaseEvidence({seller:{...seller,merchantPayoutVerified:true},
 anonymous:{outcome:RESULT.ANONYMOUS_DENIED},checkout:'REACHABLE',storefront:'REACHABLE'});
 assert.equal(r.status,'LAUNCH_BLOCKED');
 assert.ok(r.issues.includes('PAID_BUYER_FILE_DELIVERY_NOT_VERIFIED'));
 assert.ok(r.issues.includes('FREE_MEMBER_FILE_DENIAL_NOT_VERIFIED'));
});
test('publicly downloadable ZIP causes explicit critical release hold',()=>{
 const r=assessReleaseEvidence({seller,anonymous:{outcome:RESULT.EXPOSED},
 checkout:'REACHABLE',storefront:'REACHABLE'});
 assert.equal(r.status,'CRITICAL_ZIP_EXPOSURE');
 assert.equal(r.roles.security.status,'CRITICAL');
 assert.equal(r.launchApproved,false);
});
test('lack of payout status is always reported, never guessed from Stripe',()=>{
 const r=assessReleaseEvidence({seller,anonymous:{outcome:RESULT.NOT_FOUND},
 checkout:'REACHABLE',storefront:'REACHABLE'});
 assert.ok(r.issues.includes('WHOP_PAYOUT_ELIGIBILITY_NOT_VERIFIED'));
});
test('live read-only agent audit checks Whop and checkout without posting or exposing key',async()=>{
 const seen=[];
 const product={id:'prod_test',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
 const variant={id:'var_test',product:{id:'prod_test',title:product.title},billing_type:'one_time',currency:'usd',
  initial_price:19,purchase_url:'https://whop.com/clean/checkout/plan_test'};
 const response=(json,status=200)=>({status,ok:status===200,json:async()=>json,
  headers:new Headers(),body:{cancel:async()=>{}}});
 const fetchImpl=async(url,opts)=>{
  seen.push({url,opts});
  if(url.includes('/api/v1/products?'))return response({data:[product],page_info:{has_next_page:false}});
  if(url.includes('/api/v1/variants?'))return response({data:[variant],page_info:{has_next_page:false}});
  if(url.includes('/api/v1/accounts/'))return response({},403);
  if(url.startsWith('https://whop.com/clean/checkout/'))return response({},200);
  if(url.startsWith('https://clean.prismbayai.com/'))return response({},200);
  throw Error('unrecognized URL');
 };
 const env={WHOP_COMPANY_API_KEY:'apik_SAMPLE_SECRET123456',WHOP_COMPANY_ID:'biz_WHz0YQ6YMckpMO'};
 const r=await runForensicAgency({env,fetchImpl});
 assert.equal(r.status,'LAUNCH_BLOCKED');
 assert.equal(r.roles.sre.status,'REACHABLE_ONLY');
 assert.equal(r.roles.payments.checkoutMetadataVerified,true);
 assert.equal(r.roles.payments.payoutVerified,false);
 assert.equal(r.launchApproved,false);
 assert.ok(!JSON.stringify(r).includes('SAMPLE_SECRET'));
 assert.ok(!JSON.stringify(r).includes('whop.com/clean/checkout'));
 assert.ok(seen.every(x=>x.opts.method==='GET'&&x.opts.redirect==='manual'));
 const publicGets=seen.filter(x=>!x.url.includes('api.whop.com'));
 assert.ok(publicGets.every(x=>!x.opts.headers?.Authorization));
});
test('summary does not print private URLs or customer data',()=>{
 const r=assessReleaseEvidence({seller,anonymous:{outcome:RESULT.NOT_CONFIGURED},
 checkout:'INCOMPLETE',storefront:'ERROR'});
 const s=summaryMarkdown(r);
 assert.match(s,/Release: \*\*BLOCKED\*\*/);
 assert.ok(!s.includes('https://'));
 assert.match(s,/PAID_BUYER_FILE_DELIVERY_NOT_VERIFIED/);
});
