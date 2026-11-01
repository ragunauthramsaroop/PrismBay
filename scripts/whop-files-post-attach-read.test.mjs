import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from './whop-files-post-attach-read.mjs';
const env={WHOP_COMPANY_ID:'biz_sample123',WHOP_COMPANY_API_KEY:'apik_sample_not_real'};
const paid={id:'prod_paid123',title:'PrismBay Quote, Margin & Cash Studio',visibility:'hidden'};
const free={id:'prod_free123',title:'PrismBay Clean'};
const exp={id:'exp_Y0vSteSLF9Bdu6',company:{id:env.WHOP_COMPANY_ID},app:{id:'app_5UWRrs7haZZeiQ',name:'Files'},is_public:false,products:[paid]};
function mock({direct=exp,paidList=[exp],freeList=[]}={}){
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  const data=url.includes('/products?')?{data:[paid,free],page_info:{has_next_page:false}}:
   url.endsWith('/experiences/exp_Y0vSteSLF9Bdu6')?direct:
   url.includes('product_id=prod_paid123')?{data:paidList,page_info:{has_next_page:false}}:
   url.includes('product_id=prod_free123')?{data:freeList,page_info:{has_next_page:false}}:{error:'unexpected'};
  return {ok:true,status:200,json:async()=>data};
 };
 return {fetchImpl,calls};
}
test('read-only independent direct and filtered association is proof of app mapping but not launch',async()=>{
 const f=mock();const r=await inspect({env,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'ASSOCIATION_VERIFIED');
 assert.equal(r.associationVerified,true);
 assert.equal(r.releaseApproved,false);
 assert.ok(f.calls.every(z=>z.opts.method==='GET'&&z.opts.redirect==='manual'));
 assert.ok(!JSON.stringify(r).includes(env.WHOP_COMPANY_API_KEY));
});
test('Whop 200 with unlinked experience must report no association',async()=>{
 const f=mock({direct:{...exp,products:[]},paidList:[]});
 const r=await inspect({env,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'ASSOCIATION_NOT_VERIFIED');
 assert.equal(r.directPaidLinked,false);
});
test('Whop free-product Files access fails the association verification',async()=>{
 const f=mock({direct:{...exp,products:[paid,free]},freeList:[exp]});
 const r=await inspect({env,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'ASSOCIATION_NOT_VERIFIED');
 assert.equal(r.directFreeLinked,true);
});
test('missing key yields config needed and makes no requests',async()=>{
 const r=await inspect({env:{},fetchImpl:async()=>{throw Error('unexpected fetch')}});
 assert.equal(r.status,'CONFIG_NEEDED');
});
test('filtered view unavailable is inconclusive, not a go-live success',async()=>{
 const f=mock({paidList:[]});const r=await inspect({env,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'ASSOCIATION_NOT_VERIFIED');assert.equal(r.releaseApproved,false);
});
