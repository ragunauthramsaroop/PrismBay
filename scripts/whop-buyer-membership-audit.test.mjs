import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBuyerEvidence,inspect} from './whop-buyer-membership-audit.mjs';
const PAID={id:'prod_paid',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
const FREE={id:'prod_free',title:'PrismBay Clean'};
const EXP={id:'exp_Y0vSteSLF9Bdu6',app:{id:'app_5UWRrs7haZZeiQ'},is_public:false,
 company:{id:'biz_test123'},products:[PAID]};
const base={products:[PAID,FREE],paidExperiences:[EXP],freeExperiences:[],direct:EXP,
 memberResponse:{status:200,body:{data:[],total_count:0,page_info:{has_next_page:false}}}};
test('known paid-only Files association with zero buyer members is not delivery verified',()=>{
 const r=assessBuyerEvidence(base);
 assert.equal(r.status,'NO_REAL_BUYER_TEST');
 assert.equal(r.paidMembershipCount,0);
 assert.equal(r.productHidden,true);
 assert.equal(r.paidProductFilesAssociated,true);
 assert.equal(r.realBuyerDownloadVerified,false);
 assert.equal(r.releaseApproved,false);
});
test('member API permission denial is not proof of absence or buyer delivery',()=>{
 const r=assessBuyerEvidence({...base,memberResponse:{status:403,body:null}});
 assert.equal(r.membershipStatus,'MEMBERSHIP_PERMISSION_DENIED');
 assert.equal(r.paidMembershipCount,null);
 assert.equal(r.realBuyerDownloadVerified,false);
});
test('existing buyer membership still needs separate buyer session for real ZIP delivery',()=>{
 const r=assessBuyerEvidence({...base,memberResponse:{status:200,body:{
  data:[{id:'mem_sensitive',status:'active',user:{email:'private@example.com'}}],
  total_count:1,page_info:{has_next_page:false}}}});
 assert.equal(r.status,'BUYER_SESSION_TEST_REQUIRED');
 assert.equal(r.paidMembershipCount,1);
 assert.equal(r.realBuyerDownloadVerified,false);
 assert.ok(!JSON.stringify(r).includes('private@example.com'));
 assert.ok(!JSON.stringify(r).includes('mem_sensitive'));
});
test('free product association flags a security risk',()=>{
 const r=assessBuyerEvidence({...base,freeExperiences:[EXP]});
 assert.equal(r.status,'FREE_PRODUCT_ACCESS_RISK');
 assert.equal(r.freeProductFilesAssociated,true);
 assert.equal(r.releaseApproved,false);
});
test('missing paid association or public Files app refuses to approve',()=>{
 for(const props of [{paidExperiences:[]},{direct:{...EXP,is_public:true}}]){
  const r=assessBuyerEvidence({...base,...props});
  assert.equal(r.status,'FILES_ASSOCIATION_INCOMPLETE');
  assert.equal(r.releaseApproved,false);
 }
});
test('visible product does not become delivery verified',()=>{
 const r=assessBuyerEvidence({...base,products:[{...PAID,visibility:'visible'},FREE]});
 assert.equal(r.productHidden,false);
 assert.equal(r.productVisibility,'visible');
 assert.equal(r.releaseApproved,false);
});
test('full live adapter only issues GET and never logs buyer data or keys',async()=>{
 const calls=[];const env={WHOP_COMPANY_ID:'biz_test123',WHOP_COMPANY_API_KEY:'apik_secret_test_123'};
 const response=data=>({ok:true,status:200,json:async()=>data});
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  if(url.includes('/products?'))return response({data:[PAID,FREE],page_info:{has_next_page:false}});
  if(url.includes('/experiences?')&&url.includes('product_id=prod_paid'))return response({data:[EXP],page_info:{has_next_page:false}});
  if(url.includes('/experiences?')&&url.includes('product_id=prod_free'))return response({data:[],page_info:{has_next_page:false}});
  if(url.endsWith('/experiences/exp_Y0vSteSLF9Bdu6'))return response(EXP);
  if(url.includes('/memberships?'))return response({data:[],total_count:0,page_info:{has_next_page:false}});
  throw Error('unexpected endpoint');
 };
 const r=await inspect({env,fetchImpl});
 assert.equal(r.status,'NO_REAL_BUYER_TEST');
 assert.equal(calls.length,5);
 assert.ok(calls.every(x=>x.opts.method==='GET'&&x.opts.redirect==='manual'));
 assert.ok(calls.every(x=>x.url.startsWith('https://api.whop.com/api/v1/')));
 assert.ok(!JSON.stringify(r).includes(env.WHOP_COMPANY_API_KEY));
 assert.ok(!JSON.stringify(r).includes('PrismBay_Whop_Buyer_File'));
});
test('no config never reads Whop API',async()=>{
 const r=await inspect({env:{},fetchImpl:async()=>{throw Error('unexpected')}});
 assert.equal(r.status,'CONFIG_NEEDED');
 assert.equal(r.releaseApproved,false);
});
test('incomplete pagination does not falsely certify delivery',()=>{
 const r=assessBuyerEvidence({...base,memberResponse:{status:200,body:{data:[],total_count:0,page_info:{has_next_page:true}}}});
 assert.equal(r.paidMembershipCount,null);
 assert.equal(r.realBuyerDownloadVerified,false);
});
