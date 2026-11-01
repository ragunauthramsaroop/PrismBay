/**
 * Whop Clean buyer-entitlement evidence audit. Read-only.
 * Production checkout or admin "Preview as Public" is NOT real buyer evidence.
 * No customer names, email, membership IDs, file links, token, or ZIP content logged.
 */
import {pathToFileURL} from 'node:url';
const API='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const PAID='PrismBay Quote, Margin & Cash Studio';
const FREE='PrismBay Clean';
const FILES='exp_Y0vSteSLF9Bdu6';
const APP='app_5UWRrs7haZZeiQ';
const defaultResult=()=>({
  releaseApproved:false,
  realBuyerDownloadVerified:false,
  anonymousZipDownloadDeniedVerified:false,
  freeMemberZipDownloadDeniedVerified:false
});
const isCompany=id=>typeof id==='string'&&/^biz_[A-Za-z0-9]+$/.test(id);
async function read(path,key,fetchImpl){
 const url=new URL(API+path);
 if(url.origin!=='https://api.whop.com'||!url.pathname.startsWith('/api/v1/'))
  throw Error('Invalid Whop endpoint');
 const r=await fetchImpl(url.href,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+key,Accept:'application/json','Api-Version-Date':VERSION}
 });
 if(!r.ok)return {status:r.status,body:null};
 try{return {status:r.status,body:await r.json()}}
 catch{return {status:r.status,body:null}}
}
function collection(result){
 return result.status===200&&Array.isArray(result.body?.data)&&result.body?.page_info?.has_next_page!==true
  ?result.body.data:null;
}
export function assessBuyerEvidence({
 products,paidExperiences,freeExperiences,memberResponse,direct
}){
 const result=defaultResult();
 const p=products.filter(x=>x?.title===PAID),f=products.filter(x=>x?.title===FREE);
 if(p.length!==1||f.length!==1||p[0].id===f[0].id)
  return {...result,status:'PRODUCTS_NOT_UNIQUE'};
 const paidFiles=paidExperiences.filter(x=>x?.id===FILES&&x?.app?.id===APP&&x.is_public===false);
 const freeFiles=freeExperiences.filter(x=>x?.id===FILES);
 const exact=direct?.id===FILES&&direct?.app?.id===APP&&direct?.is_public===false;
 const linkedPaid=Array.isArray(direct?.products)&&direct.products.some(x=>x.id===p[0].id);
 const linkedFree=Array.isArray(direct?.products)&&direct.products.some(x=>x.id===f[0].id);
 const filesAssociated=exact&&paidFiles.length===1&&linkedPaid&&!linkedFree&&freeFiles.length===0;
 const hidden=p[0].visibility==='hidden';
 const count=memberResponse?.status===200&&Array.isArray(memberResponse.body?.data)&&
  memberResponse.body?.page_info?.has_next_page===false?
  (Number.isInteger(memberResponse.body.total_count)?memberResponse.body.total_count:memberResponse.body.data.length):null;
 const membershipStatus=memberResponse?.status===403?'MEMBERSHIP_PERMISSION_DENIED':
  memberResponse?.status===401?'MEMBERSHIP_AUTH_DENIED':
  count===null?'MEMBERSHIP_DATA_INCOMPLETE':
  count===0?'NO_TEST_BUYER_MEMBERSHIP':'POTENTIAL_BUYER_MEMBERSHIPS';
 return {
  ...result,
  status:freeFiles.length||linkedFree?'FREE_PRODUCT_ACCESS_RISK':!filesAssociated?'FILES_ASSOCIATION_INCOMPLETE':
   membershipStatus==='POTENTIAL_BUYER_MEMBERSHIPS'?'BUYER_SESSION_TEST_REQUIRED':'NO_REAL_BUYER_TEST',
  productHidden:hidden,
  productVisibility:typeof p[0].visibility==='string'?p[0].visibility:'unknown',
  filesExperiencePrivate:exact,
  paidProductFilesAssociated:filesAssociated,
  freeProductFilesAssociated:freeFiles.length>0||linkedFree,
  membershipQueryStatus:memberResponse?.status??null,
  membershipStatus,
  paidMembershipCount:count,
  nextStep:membershipStatus==='MEMBERSHIP_PERMISSION_DENIED'?
    'Whitelist member:basic:read only if necessary, or use a buyer-controlled verification session. No private member data is required.':
    count===0?'No active or historical buyer to verify. Request Whop-supported zero-charge test entitlement and use a separate test member session.':
    'Use a real buyer-controlled test session to download the original ZIP and independently verify unpaid denial.'
 };
}
export async function inspect({env=process.env,fetchImpl=fetch}={}){
 const account=env.WHOP_COMPANY_ID,key=env.WHOP_COMPANY_API_KEY;
 if(!isCompany(account)||!key)return {...defaultResult(),status:'CONFIG_NEEDED'};
 const q=id=>'/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(id)+'&first=100';
 const productData=await read('/products?account_id='+encodeURIComponent(account)+'&first=100',key,fetchImpl);
 const products=collection(productData);
 if(!products)return {...defaultResult(),status:'PRODUCT_READ_FAILED',httpStatus:productData.status};
 const paid=products.filter(x=>x?.title===PAID),free=products.filter(x=>x?.title===FREE);
 if(paid.length!==1||free.length!==1)return {...defaultResult(),status:'PRODUCTS_NOT_UNIQUE'};
 const [pd,fr,direct,members]=await Promise.all([
  read(q(paid[0].id),key,fetchImpl),
  read(q(free[0].id),key,fetchImpl),
  read('/experiences/'+FILES,key,fetchImpl),
  read('/memberships?account_id='+encodeURIComponent(account)+'&product_ids='+encodeURIComponent(paid[0].id)+'&first=100',key,fetchImpl)
 ]);
 const pData=collection(pd),fData=collection(fr);
 if(!pData||!fData||direct.status!==200)
  return {...defaultResult(),status:'EXPERIENCE_READ_INCOMPLETE',
   paidHttpStatus:pd.status,freeHttpStatus:fr.status,directHttpStatus:direct.status};
 return assessBuyerEvidence({products,paidExperiences:pData,freeExperiences:fData,memberResponse:members,direct:direct.body});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=await inspect();
 console.log(JSON.stringify(r));
 if(r.status==='FREE_PRODUCT_ACCESS_RISK')process.exitCode=1;
}