import test from 'node:test';
import assert from 'node:assert/strict';
import {RESULT,validateWhopUrl,classifyObservation,probeAnonymousDownload,runFromEnvironment} from './whop-public-access-audit.mjs';

const headers=o=>new Headers(o);
const mockResponse=(status,bytes=[],h={})=>({
 status,headers:headers(h),
 arrayBuffer:async()=>Uint8Array.from(bytes).buffer,
 body:{cancel:async()=>{}}
});

test('only HTTPS Whop hostnames are accepted; SSRF and credentials are rejected',()=>{
 assert.equal(validateWhopUrl('https://whop.com/files/a').hostname,'whop.com');
 assert.equal(validateWhopUrl('https://media.whop.com/file.zip').hostname,'media.whop.com');
 for(const bad of ['http://whop.com/x','https://whop.com.evil.test/x','https://localhost/x',
  'https://192.168.0.1/x','https://user:pass@whop.com/x','javascript:alert(1)','']){
  assert.throws(()=>validateWhopUrl(bad));
 }
});
test('anonymous ZIP bytes with HTTP 200 or 206 establish exposure',()=>{
 for(const status of [200,206])assert.equal(classifyObservation({status,firstBytes:[80,75,3,4]}),RESULT.EXPOSED);
});
test('ZIP mime type and attachment header also detect public downloads',()=>{
 assert.equal(classifyObservation({status:200,contentType:'application/zip'}),RESULT.EXPOSED);
 assert.equal(classifyObservation({status:206,contentDisposition:'attachment; filename="buyer.zip"'}),RESULT.EXPOSED);
});
test('401/403 and login redirect indicate only an anonymous denial',()=>{
 for(const status of [401,403])assert.equal(classifyObservation({status}),RESULT.ANONYMOUS_DENIED);
 assert.equal(classifyObservation({status:302,location:'https://whop.com/login?next=x'}),RESULT.ANONYMOUS_DENIED);
});
test('admin preview HTML, CDN redirect, 404 and 500 are not paid-access passes',()=>{
 assert.equal(classifyObservation({status:200,contentType:'text/html',firstBytes:[60,104,116,109,108]}),RESULT.INCONCLUSIVE);
 assert.equal(classifyObservation({status:302,location:'https://cdn.example/file.zip'}),RESULT.INCONCLUSIVE);
 assert.equal(classifyObservation({status:404}),RESULT.NOT_FOUND);
 assert.equal(classifyObservation({status:500}),RESULT.INCONCLUSIVE);
});
test('probe uses no cookies, no Authorization, no redirect, and redacts signed URLs',async()=>{
 const calls=[];
 const result=await probeAnonymousDownload('https://whop.com/x?secret=UNPRINTABLE',{fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return mockResponse(206,[80,75,3,4],{'content-type':'application/octet-stream'});
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.redirect,'manual');
 assert.equal(calls[0].options.headers.Range,'bytes=0-31');
 assert.equal(calls[0].options.headers.Authorization,undefined);
 assert.equal(result.outcome,RESULT.EXPOSED);
 assert.equal(result.releaseApproved,false);
 assert.ok(!JSON.stringify(result).includes('UNPRINTABLE'));
});
test('absent Whop file link is NOT_CONFIGURED, never a green release gate',async()=>{
 const result=await runFromEnvironment({}, {fetchImpl:async()=>{throw Error('no fetch')}});
 assert.equal(result.outcome,RESULT.NOT_CONFIGURED);
 assert.equal(result.releaseApproved,false);
});
test('anonymous denial never asserts paid customer delivery',async()=>{
 const result=await probeAnonymousDownload('https://whop.com/file',{fetchImpl:async()=>mockResponse(403)});
 assert.equal(result.outcome,RESULT.ANONYMOUS_DENIED);
 assert.equal(result.releaseApproved,false);
});
test('probe failure does not disclose token or approve the product',async()=>{
 const result=await probeAnonymousDownload('https://whop.com/download?token=REDACT',{fetchImpl:async()=>{throw Error('bad network')}});
 assert.equal(result.outcome,RESULT.ERROR);
 assert.equal(result.releaseApproved,false);
 assert.ok(!JSON.stringify(result).includes('REDACT'));
});