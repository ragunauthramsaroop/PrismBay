import test from 'node:test';
import assert from 'node:assert/strict';
import {probe} from './whop-files-support-crosscheck.mjs';
const env={WHOP_COMPANY_ID:'biz_test123',WHOP_COMPANY_API_KEY:'fake_read_token_123'};
const paid={id:'prod_paid',title:'PrismBay Quote, Margin & Cash Studio'};
const free={id:'prod_free',title:'PrismBay Clean'};
const files={id:'exp_file',is_public:false,app:{id:'app_5UWRrs7haZZeiQ',name:'Files'},
 company:{id:'biz_test123'},products:[]};
function createFetch({account=[],filtered=[],directStatus=404,direct=null}={}){
 const calls=[];
 const fn=async(url,opts)=>{
  calls.push({url,opts});
  const resp=(data,status=200)=>({ok:status===200,status,json:async()=>data});
  if(url.includes('/products?'))return resp({data:[paid,free],page_info:{has_next_page:false}});
  if(url.includes('/experiences?')&&url.includes('app_id='))return resp({data:filtered,page_info:{has_next_page:false}});
  if(url.includes('/experiences?'))return resp({data:account,page_info:{has_next_page:false}});
  if(url.includes('/experiences/'))return directStatus===200?resp(direct):resp({},directStatus);
  throw Error('unexpected URL');
 };
 return {fn,calls};
}
test('no key means no request and remains blocked',async()=>{
 const x=await probe({env:{},fetchImpl:async()=>{throw Error('not called')}});
 assert.equal(x.status,'UNVERIFIED');assert.equal(x.releaseApproved,false);
});
test('one filtered private Files experience is discovered read-only, never attached',async()=>{
 const f=createFetch({account:[files],filtered:[files]});
 const x=await probe({env,fetchImpl:f.fn});
 assert.equal(x.status,'FILES_FOUND_READ_ONLY');assert.equal(x.readyToAttach,false);
 assert.equal(x.checks.filteredFilesCount,1);
 assert.ok(f.calls.every(z=>z.opts.method==='GET'&&z.opts.redirect==='manual'));
 assert.ok(!JSON.stringify(x).includes(env.WHOP_COMPANY_API_KEY));
});
test('missing Files remains blocked even if support guesses are 404',async()=>{
 const f=createFetch();
 const x=await probe({env,fetchImpl:f.fn});
 assert.equal(x.status,'FILES_NOT_VISIBLE');
 assert.deepEqual(x.checks.hintDirectLookups.map(i=>i.httpStatus),[404,404]);
 assert.equal(x.readyToAttach,false);
});
test('direct lookup identifies Files but never authorizes write',async()=>{
 const f=createFetch({directStatus:200,direct:files});
 const x=await probe({env,fetchImpl:f.fn});
 assert.equal(x.status,'FILES_NOT_VISIBLE');
 assert.equal(x.checks.hintDirectLookups[0].foundExactFiles,true);
 assert.equal(x.readyToAttach,false);
});
test('wrong company or app ID fails claimed Files identification',async()=>{
 const f=createFetch({filtered:[{...files,company:{id:'biz_someone_else'}}]});
 const x=await probe({env,fetchImpl:f.fn});
 assert.equal(x.checks.filteredFilesCount,0);
 assert.equal(x.status,'FILES_NOT_VISIBLE');
});
test('public Files or free-linked Files reports access risk',async()=>{
 for(const experience of [{...files,is_public:true},{...files,products:[free]}]){
  const f=createFetch({account:[experience],filtered:[experience]});
  const x=await probe({env,fetchImpl:f.fn});
  assert.equal(x.status,'POTENTIAL_ACCESS_RISK');
  assert.equal(x.releaseApproved,false);
 }
});
test('report never exposes signed ZIP URLs, raw company payloads or tokens',async()=>{
 const f=createFetch({directStatus:200,direct:{...files,private_file_url:'https://whop.com/secret-zip'}});
 const x=await probe({env,fetchImpl:f.fn});
 assert.ok(!JSON.stringify(x).includes('secret-zip'));
 assert.ok(!JSON.stringify(x).includes(env.WHOP_COMPANY_API_KEY));
 assert.equal(x.readyToAttach,false);
});
