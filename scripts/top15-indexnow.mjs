import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const domain='https://clean.prismbayai.com';
const key=(await fs.readFile('config/indexnow-key.txt','utf8')).trim();
assert.match(key,/^[a-zA-Z0-9-]{8,128}$/,'IndexNow key must conform to the protocol');
const keyLocation=domain+'/'+key+'.txt';
const verification=await fetch(keyLocation,{signal:AbortSignal.timeout(25000)});
assert.equal(verification.status,200,'Public IndexNow key must be reachable before submission');
assert.equal((await verification.text()).trim(),key,'Public IndexNow key must match source of truth');

const urlList=[domain+'/top-15/',domain+'/'];
for(const url of urlList){
 const parsed=new URL(url);
 assert.equal(parsed.host,'clean.prismbayai.com');
 assert.equal(parsed.protocol,'https:');
}
const response=await fetch('https://api.indexnow.org/indexnow',{
 method:'POST',
 headers:{'content-type':'application/json; charset=utf-8'},
 body:JSON.stringify({host:'clean.prismbayai.com',key,keyLocation,urlList}),
 signal:AbortSignal.timeout(30000)
});
const body=(await response.text()).slice(0,400);
console.log(JSON.stringify({
 status:response.status,submittedUrls:urlList,
 googleIndexingClaim:false,
 acceptanceMeaning:'Search engine receipt only; indexing and rankings not guaranteed',
 body:body||null
}));
if(![200,202].includes(response.status))throw Error('IndexNow submission refused: HTTP '+response.status);
