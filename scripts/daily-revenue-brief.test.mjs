import test from 'node:test';
import assert from 'node:assert/strict';
import {previousGuyanaDay,summarizeCharges,readStripe,buildDailyBrief,checkPublicPage,latestBuyerWorkflow} from './daily-revenue-brief.mjs';
const KEY='rk_live_restricted_test_12345678987654321';
const fake=(obj,status=200)=>({ok:status>=200&&status<300,status,json:async()=>obj});

test('previous day honors Guyana midnight UTC-4 boundary',()=>{
 const w=previousGuyanaDay(new Date('2026-10-24T16:00:00.000Z'));
 assert.equal(w.day,'2026-10-23');
 assert.equal(new Date(w.start*1000).toISOString(),'2026-10-23T04:00:00.000Z');
 assert.equal(new Date(w.end*1000).toISOString(),'2026-10-24T04:00:00.000Z');
});
test('charge summaries include only real live succeeded paid charges',()=>{
 const sample=[
  {livemode:true,status:'succeeded',paid:true,currency:'usd',amount:7900,amount_refunded:0},
  {livemode:true,status:'succeeded',paid:true,currency:'usd',amount:9900,amount_refunded:2000},
  {livemode:false,status:'succeeded',paid:true,currency:'usd',amount:17900,amount_refunded:0},
  {livemode:true,status:'pending',paid:false,currency:'usd',amount:1000,amount_refunded:0},
  {livemode:true,status:'succeeded',paid:true,currency:'usd',amount:-2,amount_refunded:0}
 ];
 const result=summarizeCharges(sample);
 assert.equal(result.successfulCharges,2);
 assert.deepEqual(result.totals.USD,{grossMinor:17800,refundedMinor:2000,netAfterRefundsMinor:15800,successfulCharges:2});
});
test('unconfigured Stripe never asserts zero revenue',async()=>{
 const w=previousGuyanaDay();
 const state=await readStripe(w,{apiKey:''});
 assert.equal(state.state,'NOT_CONNECTED');
 const brief=buildDailyBrief({window:w,stripe:state,pages:{},workflow:{state:'NO_RUN'}});
 assert.match(brief,/UNMEASURED/);
 assert.doesNotMatch(brief,/Successful live charges: \*\*0\*\*/);
});
test('Stripe reads only the prior-day time window and paginates',async()=>{
 const calls=[];
 const mock=async(url,opts)=>{
  calls.push({url,opts});
  if(calls.length===1)return fake({has_more:true,data:[{id:'ch_1',livemode:true,status:'succeeded',paid:true,amount:4900,amount_refunded:0,currency:'usd'}]});
  return fake({has_more:false,data:[{id:'ch_2',livemode:true,status:'succeeded',paid:true,amount:7900,amount_refunded:0,currency:'usd'}]});
 };
 const window=previousGuyanaDay(new Date('2026-10-24T13:00:00Z'));
 const state=await readStripe(window,{apiKey:KEY,fetchImpl:mock});
 assert.equal(state.state,'VERIFIED');
 assert.equal(state.successfulCharges,2);
 assert.equal(state.totals.USD.grossMinor,12800);
 assert.equal(new URL(calls[0].url).searchParams.get('created[gte]'),String(window.start));
 assert.equal(new URL(calls[0].url).searchParams.get('created[lt]'),String(window.end));
 assert.equal(new URL(calls[1].url).searchParams.get('starting_after'),'ch_1');
 assert.equal(calls[0].opts.headers.authorization,'Bearer '+KEY);
});
test('truncated Stripe pagination avoids claiming incomplete sales',async()=>{
 const r=await readStripe(previousGuyanaDay(),{
  apiKey:KEY,maxPages:1,fetchImpl:async()=>fake({has_more:true,data:[{id:'ch_1',livemode:true,status:'succeeded',paid:true,amount:7900,amount_refunded:0,currency:'usd'}]})
 });
 assert.equal(r.state,'INCOMPLETE');
 assert.equal(r.totals,undefined);
});
test('Stripe errors do not leak credentials or claim zero',async()=>{
 const r=await readStripe(previousGuyanaDay(),{apiKey:KEY,fetchImpl:async()=>fake({},403)});
 assert.equal(r.state,'UNAVAILABLE');
 assert.equal(JSON.stringify(r).includes(KEY),false);
 assert.equal(r.successfulCharges,undefined);
});
test('web checks distinguish HTTP failures',async()=>{
 assert.deepEqual(await checkPublicPage('https://example.org',{fetchImpl:async()=>fake({},404)}),{state:'ERROR',httpStatus:404});
});
test('GitHub runs are labeled independent of actual revenue',async()=>{
 const result=await latestBuyerWorkflow({token:'token-for-ci',fetchImpl:async()=>fake({workflow_runs:[{event:'schedule',status:'completed',conclusion:'success',created_at:'2026-10-24T00:00:00Z',html_url:'https://github.com/example/run'}]})});
 assert.equal(result.state,'PASS');
 const txt=buildDailyBrief({window:previousGuyanaDay(),stripe:{state:'VERIFIED',...summarizeCharges([])},pages:{},workflow:result});
 assert.match(txt,/not sales|not a sale|notifies|not verified|not sales/i);
 assert.match(txt,/0/);
});
