import test from 'node:test';
import assert from 'node:assert/strict';
import {assessMethods,checkPayoutDestination} from './whop-payout-destination-audit.mjs';
const env={WHOP_COMPANY_ID:'biz_WHz0YQ6YMckpMO',WHOP_COMPANY_API_KEY:'apik_mock_read_key'};
const method={id:'potk_secret',company:{id:env.WHOP_COMPANY_ID},account_reference:'****1234',
 destination:{name:'private bank details'},currency:'USD',is_default:true};
test('payout destination exists without claiming KYC approved',()=>{
 const r=assessMethods([method]);
 assert.equal(r.status,'PAYOUT_DESTINATION_PRESENT');
 assert.equal(r.destinationVerified,true);
 assert.equal(r.payoutEligible,false);
 assert.equal(r.payoutKycApproved,false);
 assert.equal(r.defaultDestinationCount,1);
 assert.ok(!JSON.stringify(r).includes('****1234'));
 assert.ok(!JSON.stringify(r).includes('private bank'));
});
test('no destination does not mean KYC rejected',()=>{
 const r=assessMethods([]);
 assert.equal(r.status,'NO_DESTINATION_LISTED');
 assert.equal(r.payoutKycApproved,false);
});
test('403 requires scope, never invents payout status',async()=>{
 const r=await checkPayoutDestination({env,fetchImpl:async(_url,o)=>{
  assert.equal(o.method,'GET');return {status:403,ok:false};
 }});
 assert.equal(r.status,'PAYOUT_READ_PERMISSION_REQUIRED');
 assert.equal(r.destinationVerified,false);
 assert.equal(r.payoutEligible,false);
});
test('company mismatch fails closed',async()=>{
 const r=await checkPayoutDestination({env,fetchImpl:async()=>({
  status:200,ok:true,json:async()=>({data:[{...method,company:{id:'biz_other'}}],page_info:{has_next_page:false}})
 })});
 assert.equal(r.status,'PAYOUT_ACCOUNT_MISMATCH');
});
test('authorized read counts destination without emitting sensitive details',async()=>{
 const requests=[];
 const r=await checkPayoutDestination({env,fetchImpl:async(url,o)=>{
  requests.push({url,method:o.method,redirect:o.redirect});
  return {status:200,ok:true,json:async()=>({data:[method],page_info:{has_next_page:false}})};
 }});
 assert.equal(r.status,'PAYOUT_DESTINATION_PRESENT');
 assert.equal(requests.length,1);
 assert.ok(requests[0].url.includes('account_id=biz_WHz0YQ6YMckpMO'));
 assert.equal(requests[0].method,'GET');
 assert.equal(requests[0].redirect,'manual');
 assert.ok(!JSON.stringify(r).includes(env.WHOP_COMPANY_API_KEY));
});
test('incomplete pagination does not guess destination state',async()=>{
 const r=await checkPayoutDestination({env,fetchImpl:async()=>({
  status:200,ok:true,json:async()=>({data:[method],page_info:{has_next_page:true}})
 })});
 assert.equal(r.status,'PAYOUT_API_INCONCLUSIVE');
});
test('no credentials never makes a network request',async()=>{
 const r=await checkPayoutDestination({env:{},fetchImpl:async()=>{throw Error('unexpected fetch')}});
 assert.equal(r.status,'CONFIG_NEEDED');
});