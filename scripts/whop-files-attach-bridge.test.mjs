import test from 'node:test';
import assert from 'node:assert/strict';
import {planAttachment,execute} from './whop-files-attach-bridge.mjs';
const paid={id:'prod_paid123',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
const free={id:'prod_free123',title:'PrismBay Clean',visibility:'hidden'};
const files={id:'exp_files123',is_public:false,app:{id:'app_5UWRrs7haZZeiQ',name:'Files'},company:{id:'biz_WHz0YQ6YMckpMO'},products:[]};
const env={WHOP_COMPANY_ID:'biz_WHz0YQ6YMckpMO',WHOP_COMPANY_API_KEY:'apik_read_key_mock123'};
const response=(data)=>({ok:true,status:200,json:async()=>({data,page_info:{has_next_page:false}})});
const server=(input={})=>{
 const calls=[];
 let linked=false;
 const get=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/products?'))return response([paid,free]);
  if(url.includes('product_id=prod_paid123'))return response(
   input.filteredPaid??(linked?[{...(input.direct||files),products:[paid]}]:[]));
  if(url.includes('product_id=prod_free123'))return response(input.filteredFree??[]);
  if(url.includes('/experiences?'))return response(input.experiences||[...(linked?[{...files,products:[paid]}]:[files])]);
  if(options.method==='POST'&&url.endsWith('/attach')&&
     (url.includes('exp_files123')||url.includes('exp_Y0vSteSLF9Bdu6'))){
   linked=true;return {ok:true,status:200,json:async()=>({...files,products:[paid]})};
  }
  if(options.method==='GET'&&url.endsWith('/experiences/exp_files123')){
   return {ok:true,status:200,json:async()=>({...files,products:linked?[paid]:files.products})};
  }
  if(options.method==='GET'&&url.endsWith('/experiences/exp_Y0vSteSLF9Bdu6')){
   if(!input.direct)return {ok:false,status:404};
   return {ok:true,status:200,json:async()=>({...input.direct,products:linked?[paid]:input.direct.products})};
  }
  throw Error('unknown URL');
 };
 return {get,calls};
};
test('missing Files experience stops without creating another app',()=>{
 const r=planAttachment([paid,free],[]);
 assert.equal(r.status,'EXISTING_FILES_NOT_FOUND');assert.equal(r.releaseApproved,false);
});
test('one existing private Files experience is eligible only for paid product',()=>{
 const r=planAttachment([paid,free],[files]);assert.equal(r.status,'READY_TO_ATTACH');
 assert.equal(r.paidProductId,paid.id);assert.equal(r.freeProductId,free.id);
});
test('free or other product, public Files, multiple Files all deny attachment',()=>{
 const cases=[
  [{...files,products:[free]},'FILES_LINKED_TO_FREE'],
  [{...files,products:[{id:'prod_other'}]},'FILES_LINKED_ELSEWHERE'],
  [{...files,is_public:true},'FILES_PUBLIC']
 ];
 for(const [exp,status] of cases)assert.equal(planAttachment([paid,free],[exp]).status,status);
 assert.equal(planAttachment([paid,free],[files,{...files,id:'exp_other'}]).status,'FILES_INSTANCE_AMBIGUOUS');
});
test('wrong paid visibility and duplicate products refuse attachment',()=>{
 assert.equal(planAttachment([{...paid,visibility:'visible'},free],[files]).status,'PAID_PRODUCT_NOT_HIDDEN');
 assert.equal(planAttachment([paid,paid,free],[files]).status,'PRODUCTS_NOT_UNIQUE');
});
test('dry-run does not issue any POST with read-only key',async()=>{
 const mock=server();const r=await execute({env,fetchImpl:mock.get});
 assert.equal(r.status,'READY_TO_ATTACH');assert.equal(r.attached,false);
 assert.ok(mock.calls.every(x=>x.options.method==='GET'));
});
test('attach action with no confirmation or dedicated key never writes',async()=>{
 const m=server();const e={...env,WHOP_FILES_ACTION:'attach'};
 const r=await execute({env:e,fetchImpl:m.get});
 assert.equal(r.status,'CONFIRMATION_REQUIRED');assert.ok(m.calls.every(x=>x.options.method==='GET'));
 const x=await execute({env:{...e,WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',WHOP_FILES_EXPECTED_EXPERIENCE_ID:files.id},fetchImpl:m.get});
 assert.equal(x.status,'WRITE_SCOPE_MISSING');assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('expected experience ID must match before any change',async()=>{
 const m=server();const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach',WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',WHOP_FILES_EXPECTED_EXPERIENCE_ID:'exp_wrong',WHOP_FILES_ATTACH_API_KEY:'apik_write'},fetchImpl:m.get});
 assert.equal(r.status,'EXPERIENCE_ID_MISMATCH');assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('post only exact product ID, with separate scoped write key, verify association',async()=>{
 const m=server();const result=await execute({env:{...env,WHOP_FILES_ACTION:'attach',WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',WHOP_FILES_EXPECTED_EXPERIENCE_ID:files.id,WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl:m.get});
 assert.equal(result.status,'ATTACHED_AND_RECHECKED');assert.equal(result.attached,true);assert.equal(result.releaseApproved,false);
 const posts=m.calls.filter(x=>x.options.method==='POST');assert.equal(posts.length,1);
 assert.equal(posts[0].options.headers.Authorization,'Bearer apik_write_mock123');
 assert.equal(posts[0].options.body,JSON.stringify({product_id:paid.id}));
 assert.ok(m.calls.filter(x=>x.options.method==='GET').every(x=>x.options.headers.Authorization==='Bearer apik_read_key_mock123'));
});
test('already attached remains no-op to avoid duplicate operations',async()=>{
 const m=server({experiences:[{...files,products:[paid]}]});
 const result=await execute({env:{...env,WHOP_FILES_ACTION:'attach',WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',WHOP_FILES_EXPECTED_EXPERIENCE_ID:files.id,WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl:m.get});
 assert.equal(result.status,'ALREADY_LINKED');assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('missing account config never fetches',async()=>{
 const r=await execute({env:{},fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}});
 assert.equal(r.status,'CONFIG_NEEDED');
});
test('verified direct Files experience is used when company list omits it',async()=>{
 const direct={...files,id:'exp_Y0vSteSLF9Bdu6',company:{id:env.WHOP_COMPANY_ID}};
 const m=server({experiences:[],direct});
 const r=await execute({env,fetchImpl:m.get});
 assert.equal(r.status,'READY_TO_ATTACH');
 assert.equal(r.source,'VERIFIED_DIRECT_GET');
 assert.equal(r.experienceId,direct.id);
 assert.equal(r.releaseApproved,false);
 assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('direct Files experience still requires separate key and exact manual confirmation',async()=>{
 const direct={...files,id:'exp_Y0vSteSLF9Bdu6',company:{id:env.WHOP_COMPANY_ID}};
 const m=server({experiences:[],direct});
 const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach'},fetchImpl:m.get});
 assert.equal(r.status,'CONFIRMATION_REQUIRED');
 assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('direct Files experience attach rechecks direct GET after approved write',async()=>{
 const direct={...files,id:'exp_Y0vSteSLF9Bdu6',company:{id:env.WHOP_COMPANY_ID}};
 const m=server({experiences:[],direct});
 const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach',
  WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',
  WHOP_FILES_EXPECTED_EXPERIENCE_ID:direct.id,
  WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl:m.get});
 assert.equal(r.status,'ATTACHED_AND_RECHECKED');
 assert.equal(m.calls.filter(x=>x.options.method==='POST').length,1);
 assert.equal(r.releaseApproved,false);
});

test('a paid-filtered Files experience with stale direct products prevents a duplicate write',async()=>{
 const stale={...files,id:'exp_Y0vSteSLF9Bdu6',products:[],company:{id:env.WHOP_COMPANY_ID}};
 const m=server({experiences:[stale],filteredPaid:[stale],filteredFree:[]});
 const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach',
  WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',
  WHOP_FILES_EXPECTED_EXPERIENCE_ID:stale.id,
  WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl:m.get});
 assert.equal(r.status,'ALREADY_LINKED_FILTERED');
 assert.equal(r.productFilterVerified,true);
 assert.equal(r.attached,false);
 assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('filtered experience on free product always blocks mutations',async()=>{
 const e={...files,products:[]};const m=server({experiences:[e],filteredFree:[e]});
 const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach',
 WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',
 WHOP_FILES_EXPECTED_EXPERIENCE_ID:e.id,
 WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl:m.get});
 assert.equal(r.status,'FILES_LINKED_TO_FREE');
 assert.equal(r.releaseApproved,false);
 assert.ok(m.calls.every(x=>x.options.method==='GET'));
});
test('Whop filtered paid association verifies after POST even if direct products is stale',async()=>{
 const e={...files,products:[]};
 const calls=[];let wrote=false;
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  if(url.includes('/products?'))return response([paid,free]);
  if(url.includes('product_id=prod_paid123'))return response(wrote?[e]:[]);
  if(url.includes('product_id=prod_free123'))return response([]);
  if(url.includes('/experiences?'))return response([e]);
  if(url.endsWith('/experiences/exp_files123')&&opts.method==='GET')
   return {ok:true,status:200,json:async()=>e};
  if(url.endsWith('/experiences/exp_files123/attach')&&opts.method==='POST'){
   wrote=true;return {ok:true,status:200};
  }
  throw Error('unexpected endpoint');
 };
 const r=await execute({env:{...env,WHOP_FILES_ACTION:'attach',
 WHOP_FILES_CONFIRM:'ATTACH_EXISTING_PRIVATE_FILES_ONLY',
 WHOP_FILES_EXPECTED_EXPERIENCE_ID:e.id,WHOP_FILES_ATTACH_API_KEY:'apik_write_mock123'},fetchImpl});
 assert.equal(r.status,'ATTACHED_AND_RECHECKED');
 assert.equal(r.productFilterVerified,true);assert.equal(r.directProductsLinked,false);
 assert.equal(calls.filter(x=>x.opts.method==='POST').length,1);
});
