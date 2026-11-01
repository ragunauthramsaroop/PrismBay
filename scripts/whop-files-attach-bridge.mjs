/**
 * Minimal GitHub Actions bridge for existing Whop Files experience.
 * Dry-run by default. Explicit manual action and scoped write key required.
 * Never creates a duplicate empty Files experience, publishes a product,
 * processes money, uploads ZIP, or claims buyer entitlement.
 */
import { pathToFileURL } from 'node:url';

const API='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const TARGET='PrismBay Quote, Margin & Cash Studio';
const FREE='PrismBay Clean';
const FILES_APP='app_5UWRrs7haZZeiQ';
// Direct GET independently verified this existing private Files experience. The
// account-wide list API omits it, so do not treat list omission as nonexistence.
const VERIFIED_SUPPORT_FILES_EXPERIENCE='exp_Y0vSteSLF9Bdu6';
const mustId=(v,prefix)=>typeof v==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9]+$').test(v);
const safe=(status,reason,more={})=>({status,reason,attached:false,releaseApproved:false,...more});

async function whopGet(path,key,fetchImpl){
 const response=await fetchImpl(API+path,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Bearer '+key,Accept:'application/json','Api-Version-Date':VERSION}
 });
 if(!response.ok)throw Object.assign(Error('Whop read failed'),{status:response.status});
 const out=await response.json();
 if(!Array.isArray(out?.data)||out?.page_info?.has_next_page)throw Error('Whop returned incomplete records');
 return out.data;
}
async function whopGetOneExperience(id,key,fetchImpl){
 if(!mustId(id,'exp'))return null;
 const response=await fetchImpl(API+'/experiences/'+encodeURIComponent(id),{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Bearer '+key,Accept:'application/json','Api-Version-Date':VERSION}
 });
 if(!response.ok)return null;
 const x=await response.json();
 return x?.id===id?x:null;
}
const sameFiles=x=>x?.app?.id===FILES_APP&&x?.is_public===false;
/** Only an already-existing private official Files experience is eligible. */
export function planAttachment(products,experiences){
 const paid=products.filter(x=>x?.title===TARGET);
 const free=products.filter(x=>x?.title===FREE);
 if(paid.length!==1||free.length!==1||!mustId(paid[0].id,'prod')||!mustId(free[0].id,'prod'))
  return safe('PRODUCTS_NOT_UNIQUE','The exact paid and free products were not uniquely identified');
 if(paid[0].visibility!=='hidden')
  return safe('PAID_PRODUCT_NOT_HIDDEN','The product is not Hidden; refuse access change');
 const present=experiences.filter(x=>x?.app?.id===FILES_APP);
 if(present.some(x=>x?.is_public===true))
  return safe('FILES_PUBLIC','An official Files experience is public; do not attach');
 if(present.length===0)
  return safe('EXISTING_FILES_NOT_FOUND',
   'Whop experience API does not list the Files instance holding the ZIP. Do not create an empty replacement.');
 if(present.length!==1||!sameFiles(present[0])||!mustId(present[0]?.id,'exp'))
  return safe('FILES_INSTANCE_AMBIGUOUS','No single verified private Files experience exists');
 const exp=present[0];
 const linkedIds=(Array.isArray(exp.products)?exp.products:[]).map(x=>x?.id);
 if(linkedIds.includes(free[0].id))
  return safe('FILES_LINKED_TO_FREE','The Files experience is also attached to the free product');
 if(linkedIds.some(id=>id!==paid[0].id))
  return safe('FILES_LINKED_ELSEWHERE','The Files experience has other attached products');
 if(linkedIds.includes(paid[0].id))
  return safe('ALREADY_LINKED','Official Files experience is already attached to $19 product; verify ZIP delivery separately');
 return safe('READY_TO_ATTACH','A unique existing private Files experience is safe to attach to the $19 product only',
  {paidProductId:paid[0].id,freeProductId:free[0].id,experienceId:exp.id});
}
export async function execute({env=process.env,fetchImpl=fetch}={}){
 const account=env.WHOP_COMPANY_ID,readKey=env.WHOP_COMPANY_API_KEY;
 if(!mustId(account,'biz')||!readKey)return safe('CONFIG_NEEDED','Read-only Whop account connection missing');
 let plan;
 try{
  const [products,experiences]=await Promise.all([
   whopGet('/products?account_id='+encodeURIComponent(account)+'&first=100',readKey,fetchImpl),
   whopGet('/experiences?account_id='+encodeURIComponent(account)+'&first=100',readKey,fetchImpl)
  ]);
  plan=planAttachment(products,experiences);
  if(plan.status==='EXISTING_FILES_NOT_FOUND'){
   // The vendor-supplied identifier was independently confirmed through a
   // Whop direct GET with the read-only key. Revalidate each run, never trust
   // the email alone. Keep the product Hidden.
   const direct=await whopGetOneExperience(VERIFIED_SUPPORT_FILES_EXPERIENCE,readKey,fetchImpl);
   if(direct?.company?.id===account&&direct?.app?.id===FILES_APP&&
      direct?.is_public===false&&Array.isArray(direct?.products)){
    const verified=planAttachment(products,[direct]);
    plan={...verified,source:'VERIFIED_DIRECT_GET'};
   }
  }
  if(plan.status==='READY_TO_ATTACH'){
   // Whop product-filtered GET shows the Files experience attached to paid
   // customers even when direct GET /experiences/{id}.products remains [].
   // Respect the product-filtered view to avoid repeating a successful POST.
   const filter=id=>'/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(id)+'&first=100';
   const [paidList,freeList]=await Promise.all([
    whopGet(filter(plan.paidProductId),readKey,fetchImpl),
    whopGet(filter(plan.freeProductId),readKey,fetchImpl)
   ]);
   const paidMatch=paidList.filter(x=>x.id===plan.experienceId&&x.app?.id===FILES_APP&&x.is_public===false);
   const freeMatch=freeList.filter(x=>x.id===plan.experienceId);
   if(freeMatch.length)return safe('FILES_LINKED_TO_FREE','The Files experience is attached to the free product');
   if(paidMatch.length===1)return safe('ALREADY_LINKED_FILTERED',
    'The paid product filtered GET lists the existing private Files experience; no duplicate POST needed',
    {productFilterVerified:true});
  }
 }catch(e){return safe('READ_FAILED','Whop read-only preflight failed',{httpStatus:Number(e.status)||undefined})}
 if(env.WHOP_FILES_ACTION!=='attach')return plan;
 if(plan.status!=='READY_TO_ATTACH')return plan;
 if(env.WHOP_FILES_CONFIRM!=='ATTACH_EXISTING_PRIVATE_FILES_ONLY')
  return safe('CONFIRMATION_REQUIRED','Exact attachment confirmation is required');
 if(env.WHOP_FILES_EXPECTED_EXPERIENCE_ID!==plan.experienceId)
  return safe('EXPERIENCE_ID_MISMATCH','Explicit expected Files experience ID does not match');
 const writeKey=env.WHOP_FILES_ATTACH_API_KEY;
 if(!writeKey)return safe('WRITE_SCOPE_MISSING','Dedicated Whop experience:attach key is not configured');
 try{
  const resp=await fetchImpl(API+'/experiences/'+plan.experienceId+'/attach',{
   method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Bearer '+writeKey,'Api-Version-Date':VERSION,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({product_id:plan.paidProductId})
  });
  if(!resp.ok)return safe('ATTACH_REJECTED','Whop refused the product association',{httpStatus:resp.status});
  // Verify the official existing Files experience remains private and free product is excluded.
  const current=await whopGetOneExperience(plan.experienceId,readKey,fetchImpl);
  const linked=Array.isArray(current?.products)?current.products:[];
  const filter=id=>'/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(id)+'&first=100';
  const [paidList,freeList]=await Promise.all([
   whopGet(filter(plan.paidProductId),readKey,fetchImpl),
   whopGet(filter(plan.freeProductId),readKey,fetchImpl)
  ]);
  const filteredPaid=paidList.some(x=>x.id===plan.experienceId&&x.app?.id===FILES_APP&&x.is_public===false);
  const filteredFree=freeList.some(x=>x.id===plan.experienceId);
  if(!current||current.company?.id!==account||current.app?.id!==FILES_APP||
     current.is_public!==false||!filteredPaid||filteredFree||
     linked.some(x=>x.id===plan.freeProductId)||linked.some(x=>x.id!==plan.paidProductId))
   return safe('POST_ATTACH_UNCONFIRMED','Whop accepted request but product-filtered entitlement still not proven');
  return safe('ATTACHED_AND_RECHECKED',
   'Paid product filtered GET confirms private Files and free product excludes it; real buyer ZIP delivery is still untested',
   {attached:true,productFilterVerified:true,directProductsLinked:linked.some(x=>x.id===plan.paidProductId)});
 }catch(e){return safe('ATTACH_UNCONFIRMED','Whop attachment attempt failed or response unavailable; inspect live status before retrying')}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await execute();
 // Never print private file links, keys, buyer IDs or full Whop payload.
 const {paidProductId,freeProductId,experienceId,...publicSafe}=result;
 console.log(JSON.stringify(publicSafe));
 if(['FILES_PUBLIC','FILES_LINKED_TO_FREE','FILES_LINKED_ELSEWHERE','ATTACH_REJECTED','POST_ATTACH_UNCONFIRMED'].includes(result.status))process.exitCode=1;
}