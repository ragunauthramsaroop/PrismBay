import test from 'node:test';
import assert from 'node:assert/strict';
import {assessExperienceGating,inspectFiles} from './whop-files-experience-audit.mjs';
const paid={id:'prod_paid',title:'PrismBay Quote, Margin & Cash Studio'};
const free={id:'prod_free',title:'PrismBay Clean'};
const files={id:'exp_files',app:{id:'app_5UWRrs7haZZeiQ',name:'Files'}};
test('one paid Files association with zero free association is metadata only',()=>{
 const r=assessExperienceGating({products:[paid,free],paidExperiences:[files],freeExperiences:[]});
 assert.equal(r.status,'PRODUCT_GATE_VERIFIED');
 assert.equal(r.releaseApproved,false);
 assert.equal(r.unpaidDownloadDenied,false);
 assert.equal(r.paidBuyerDeliveryVerified,false);
});
test('Files access on free product is a security violation',()=>{
 const r=assessExperienceGating({products:[paid,free],paidExperiences:[files],freeExperiences:[files]});
 assert.equal(r.status,'FREE_PRODUCT_FILES_ACCESS');
 assert.equal(r.releaseApproved,false);
});
test('missing Files association on paid product is unverified',()=>{
 const r=assessExperienceGating({products:[paid,free],paidExperiences:[],freeExperiences:[]});
 assert.equal(r.status,'PAID_PRODUCT_FILES_UNVERIFIED');
});
test('duplicate or missing products block approval',()=>{
 for(const products of [[paid],[paid,free,free],[paid,paid,free]]){
  assert.equal(assessExperienceGating({products,paidExperiences:[files],freeExperiences:[]}).status,'PRODUCTS_UNVERIFIED');
 }
});
test('different Files app id is ambiguous',()=>{
 const r=assessExperienceGating({products:[paid,free],
  paidExperiences:[{app:{id:'app_other',name:'Files'}}],freeExperiences:[]});
 assert.equal(r.status,'AMBIGUOUS_FILES_APP');
});
test('read only experience requests select each specific product ID',async()=>{
 const visited=[];
 const json=(data,status=200)=>({ok:status===200,status,json:async()=>({data,page_info:{has_next_page:false}})});
 const env={WHOP_COMPANY_API_KEY:'apik_test_restricted',WHOP_COMPANY_ID:'biz_test'};
 const f=async(url,opts)=>{
  visited.push({url,opts});
  if(url.includes('/products?'))return json([paid,free]);
  if(url.includes('product_id=prod_paid'))return json([files]);
  if(url.includes('product_id=prod_free'))return json([]);
  throw Error('unexpected endpoint');
 };
 const result=await inspectFiles({env,fetchImpl:f});
 assert.equal(result.status,'PRODUCT_GATE_VERIFIED');
 assert.equal(visited.length,3);
 assert.ok(visited.every(x=>x.opts.method==='GET'&&x.opts.redirect==='manual'));
 assert.ok(visited.every(x=>x.url.startsWith('https://api.whop.com/api/v1/')));
 assert.ok(!JSON.stringify(result).includes(env.WHOP_COMPANY_API_KEY));
});
test('403 is reported as missing experience permission, never as proof of gating',async()=>{
 const r=await inspectFiles({
  env:{WHOP_COMPANY_API_KEY:'apik_test_restricted',WHOP_COMPANY_ID:'biz_test'},
  fetchImpl:async url=>url.includes('/products?')?
   {ok:true,status:200,json:async()=>({data:[paid,free],page_info:{has_next_page:false}})}:
   {ok:false,status:403}
 });
 assert.equal(r.status,'EXPERIENCE_READ_FORBIDDEN');
 assert.equal(r.releaseApproved,false);
});
test('incomplete pagination cannot prove product association',async()=>{
 const r=await inspectFiles({env:{WHOP_COMPANY_API_KEY:'apik_test_restricted',WHOP_COMPANY_ID:'biz_test'},
 fetchImpl:async()=>({ok:true,status:200,json:async()=>({data:[paid,free],page_info:{has_next_page:true}})})});
 assert.equal(r.status,'API_INCONCLUSIVE');
});

test('unmatched product filter reports only safe account experience diagnostics',async()=>{
 const responses=url=>{
  if(url.includes('/products?'))return [paid,free];
  if(url.includes('product_id='))return [];
  if(url.includes('/experiences?'))return [{id:'exp_1',app:{id:'app_5UWRrs7haZZeiQ',name:'Files'},products:[paid]}];
  throw Error('unexpected URL');
 };
 const r=await inspectFiles({env:{WHOP_COMPANY_API_KEY:'apik_test_restricted',WHOP_COMPANY_ID:'biz_test'},
 fetchImpl:async url=>({ok:true,status:200,json:async()=>({data:responses(url),page_info:{has_next_page:false}})})});
 assert.equal(r.status,'PAID_PRODUCT_FILES_UNVERIFIED');
 assert.equal(r.diagnostics.companyExperienceCount,1);
 assert.equal(r.diagnostics.recognizedFilesExperienceCount,1);
 assert.equal(r.diagnostics.filesExperiencePaidProductLinked,true);
 assert.equal(r.releaseApproved,false);
 assert.ok(!JSON.stringify(r).includes('apik_test_restricted'));
});
