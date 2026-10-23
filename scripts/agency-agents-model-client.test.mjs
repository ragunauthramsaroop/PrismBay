import test from 'node:test';
import assert from 'node:assert/strict';
import {completeVia9Router, extractChatText} from './agency-agents-model-client.mjs';

const freeModel='oc/muse-spark-1.3-contributor-free';
test('local 9Router transport sends no-tools, non-streaming, bounded free-model request',async()=>{
  let target, request;
  const output=await completeVia9Router({apiKey:'local-test-key',model:freeModel,prompt:'Audit freight evidence',fetchImpl:async(url,opts)=>{
    target=url;request=opts;
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Review buyer ZIP freight first.'}}]})};
  }});
  assert.equal(target,'http://127.0.0.1:20128/v1/chat/completions');
  assert.equal(output,'Review buyer ZIP freight first.');
  const body=JSON.parse(request.body);
  assert.equal(body.stream,false);
  assert.equal(body.model,freeModel);
  assert.equal(body.max_tokens,1400);
  assert.equal('tools' in body,false);
  assert.equal(request.headers.Authorization,'Bearer local-test-key');
});
test('model content-array response is extracted safely',()=>{
  assert.equal(extractChatText({choices:[{message:{content:[{type:'text',text:'Step A'},{type:'text',text:'Step B'}]}}]}),'Step A\nStep B');
});
test('blocks any model without explicit free OpenCode provider identifier',async()=>{
  for(const model of ['cc/claude-opus-4-7','openai/gpt-5','oc/paid-model',null]){
    await assert.rejects(completeVia9Router({apiKey:'x',model,prompt:'x',fetchImpl:()=>{throw Error('Unexpected request');}}),/non_free_9router_model_blocked/);
  }
});
test('rejects nonlocal endpoint and oversized requests before HTTP',async()=>{
  const params={apiKey:'x',model:freeModel,prompt:'x',fetchImpl:()=>{throw Error('unexpected network');}};
  await assert.rejects(completeVia9Router({...params,baseUrl:'https://router.example/v1'}),/9router_endpoint_must_be_loopback/);
  await assert.rejects(completeVia9Router({...params,prompt:'x'.repeat(40000)}),/invalid_or_oversized_agent_prompt/);
});
test('HTTP failures and malformed responses fail without false successful AI output',async()=>{
  const base={apiKey:'local',model:freeModel,prompt:'Review',timeoutMs:15000};
  await assert.rejects(completeVia9Router({...base,fetchImpl:async()=>({ok:false,status:429})}),/9router_chat_http_429/);
  await assert.rejects(completeVia9Router({...base,fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})}),/9router_chat_returned_no_text/);
  await assert.rejects(completeVia9Router({...base,fetchImpl:async()=>({ok:true,json:async()=>{throw Error('private token');}})}),/9router_chat_invalid_json/);
});
test('missing API key and missing prompt are not accepted',async()=>{
  await assert.rejects(completeVia9Router({model:freeModel,prompt:'Review'}),/missing_9router_api_key/);
  await assert.rejects(completeVia9Router({apiKey:'x',model:freeModel,prompt:''}),/invalid_or_oversized_agent_prompt/);
});
