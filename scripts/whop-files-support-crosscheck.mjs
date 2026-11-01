/**
 * Read-only support-claim cross-check for a missing Whop Files experience.
 * Do not trust unverified experience IDs sent by email. No mutations.
 */
import {pathToFileURL} from 'node:url';
const ROOT='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const FILES_APP='app_5UWRrs7haZZeiQ';
const PAID='PrismBay Quote, Margin & Cash Studio';
const FREE='PrismBay Clean';
const SRC_CANDIDATES=['expY0vSteSLF9Bdu6','exp_Y0vSteSLF9Bdu6']; // Untrusted email ID forms: verify, never attach on hint alone.

export async function probe({env=process.env,fetchImpl=fetch}={}){
 const account=env.WHOP_COMPANY_ID,key=env.WHOP_COMPANY_API_KEY;
 const blocked={status:'UNVERIFIED',readyToAttach:false,releaseApproved:false};
 if(!/^biz_[A-Za-z0-9]+$/.test(account||'')||!key)return {...blocked,reason:'Whop account ID or read key not configured'};
 async function get(path){
  const r=await fetchImpl(ROOT+path,{method:'GET',redirect:'manual',
   headers:{Authorization:'Bearer '+key,'Api-Version-Date':VERSION,Accept:'application/json'},
   signal:AbortSignal.timeout(12000)});
  if(!r.ok)return {httpStatus:r.status,body:null};
  try{return {httpStatus:r.status,body:await r.json()}}catch{return {httpStatus:r.status,body:null}}
 }
 function collection(x){
  return x.httpStatus===200&&Array.isArray(x.body?.data)&&x.body?.page_info?.has_next_page!==true
   ?x.body.data:null;
 }
 function isFiles(x){return x?.app?.id===FILES_APP&&x?.app?.name==='Files'}
 const acct=encodeURIComponent(account);
 const [all,filtered,products]=await Promise.all([
  get('/experiences?account_id='+acct+'&first=100'),
  get('/experiences?account_id='+acct+'&app_id='+FILES_APP+'&first=100'),
  get('/products?account_id='+acct+'&first=100')]);
 const a=collection(all),f=collection(filtered),p=collection(products);
 if(!a||!f||!p)return {...blocked,reason:'Whop read response incomplete or denied',
  checks:{allStatus:all.httpStatus,filterStatus:filtered.httpStatus,productsStatus:products.httpStatus}};
 const paid=p.filter(x=>x?.title===PAID),free=p.filter(x=>x?.title===FREE);
 const hints=[];
 for(const id of SRC_CANDIDATES){
  const response=await get('/experiences/'+encodeURIComponent(id));
  const b=response.body;
  hints.push({httpStatus:response.httpStatus,foundExactFiles:response.httpStatus===200&&isFiles(b)&&b?.company?.id===account,
   private:response.httpStatus===200&&b?.is_public===false,
   linkedPaid:response.httpStatus===200&&paid.length===1&&(b?.products||[]).some(x=>x?.id===paid[0].id),
   linkedFree:response.httpStatus===200&&free.length===1&&(b?.products||[]).some(x=>x?.id===free[0].id)});
 }
 const exactFiltered=f.filter(x=>isFiles(x)&&x?.company?.id===account);
 const exactAll=a.filter(x=>isFiles(x)&&x?.company?.id===account);
 const matches=[...exactFiltered,...exactAll];
 const unsafe=matches.some(x=>x.is_public===true||
  (Array.isArray(x.products)&&x.products.some(pr=>free.some(z=>z.id===pr.id))));
 return {
  ...blocked,status:unsafe?'POTENTIAL_ACCESS_RISK':exactFiltered.length>0?'FILES_FOUND_READ_ONLY':'FILES_NOT_VISIBLE',
  checks:{accountExperienceCount:a.length,accountFilesCount:exactAll.length,filteredFilesCount:exactFiltered.length,
   paidProductFound:paid.length===1,freeProductFound:free.length===1,
   hintDirectLookups:hints},
  reason:'Read-only diagnostic. Even if a Files experience is located, confirm exact existing ZIP instance and explicit write permission before attachment.'
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await probe();console.log(JSON.stringify(result));
 if(result.status==='POTENTIAL_ACCESS_RISK')process.exitCode=1;
}