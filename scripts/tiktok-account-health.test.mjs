import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAccount,findAccount,readOnlyPreflight} from './tiktok-account-health.mjs';
const expected={account:{id:'abc123',username:'prismbayclean'}};
test('only configured exact TikTok account matches in a nested Zernio response',()=>{
  const nested={data:{accounts:[{id:'bad',platform:'tiktok',username:'unrelated'},
    {_id:'abc123',platform:'tiktok',username:'prismbayclean'}]}};
  assert.equal(assessAccount(nested,expected).connected,true);
  assert.equal(findAccount(nested,'abc123').username,'prismbayclean');
});
test('wrong platform or mismatched owner identity fail closed',()=>{
  assert.equal(assessAccount({data:[{id:'abc123',platform:'youtube'}]},expected).connected,false);
  assert.equal(assessAccount({data:[{id:'abc123',platform:'tiktok',username:'different'}]},expected).connected,false);
});
test('missing secret never starts any network request',async()=>{
  let count=0;
  const out=await readOnlyPreflight({env:{},fetchImpl:()=>{count++;throw Error('network forbidden')}});
  assert.equal(count,0);
  assert.equal(out.postAttempted,false);
  assert.equal(out.publishingReady,false);
  assert.equal(out.reason,'missing_github_actions_zernio_api_key');
  assert.equal(out.lockActive,true);
});
test('read-only network request never attempts social publication',async()=>{
  let method=null;
  const result=await readOnlyPreflight({env:{ZERNIO_API_KEY:'fixture'},
    fetchImpl:async(url,opts)=>{method=opts.method;assert.match(url,/\/accounts$/);return {ok:true,json:async()=>({data:{accounts:[{id:'6ac41ebe5450b4ad42dec37e',platform:'tiktok',username:'prismbayclean'}]}})};}});
  assert.equal(method,'GET');
  assert.equal(result.connected,true);
  assert.equal(result.lockActive,true);
  assert.equal(result.postAttempted,false);
  assert.equal(result.publishingReady,false);
});
