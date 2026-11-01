/**
 * GitHub Actions read-only verification after Whop POST /experiences/{id}/attach.
 * Reports only product association booleans, counts and response statuses.
 * Never logs credentials, buyer files, customer data or complete API responses.
 */
import {pathToFileURL} from 'node:url';
const ROOT='https://api.whop.com/api/v1';
const EXP='exp_Y0vSteSLF9Bdu6';
const APP='app_5UWRrs7haZZeiQ';
const PAID='PrismBay Quote, Margin & Cash Studio';
const FREE='PrismBay Clean';
export async function inspect({env=process.env,fetchImpl=fetch}={}){
 const account=env.WHOP_COMPANY_ID,token=env.WHOP_COMPANY_API_KEY;
 if(!/^biz_[A-Za-z0-9]+$/.test(account||'')||!token)return {status:'CONFIG_NEEDED',associationVerified:false};
 const get=async(path)=>{
  const resp=await fetchImpl(ROOT+path,{
   method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Bearer '+token,'Api-Version-Date':'2026-10-29-8',Accept:'application/json'}
  });
  if(!resp.ok)return {httpStatus:resp.status,data:null};
  try{return {httpStatus:resp.status,data:await resp.json()}}catch{return {httpStatus:resp.status,data:null}}
 };
 const [pr,er]=await Promise.all([
  get('/products?account_id='+encodeURIComponent(account)+'&first=100'),
  get('/experiences/'+encodeURIComponent(EXP))
 ]);
 const p=Array.isArray(pr.data?.data)&&pr.data?.page_info?.has_next_page!==true?pr.data.data:[];
 const paid=p.filter(x=>x?.title===PAID),free=p.filter(x=>x?.title===FREE);
 if(paid.length!==1||free.length!==1||er.httpStatus!==200)
  return {status:'PREREQUISITE_READ_FAILED',associationVerified:false,productLookupStatus:pr.httpStatus,experienceLookupStatus:er.httpStatus};
 const id=paid[0].id,freeid=free[0].id,x=er.data;
 const [productFiltered,freeFiltered]=await Promise.all([
  get('/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(id)+'&first=100'),
  get('/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(freeid)+'&first=100')
 ]);
 const pc=Array.isArray(productFiltered.data?.data)?productFiltered.data.data:null;
 const fc=Array.isArray(freeFiltered.data?.data)?freeFiltered.data.data:null;
 const directArray=Array.isArray(x?.products)?x.products:null;
 const linked=directArray?.some(z=>z?.id===id)??false;
 const freeLinked=directArray?.some(z=>z?.id===freeid)??false;
 const paidFiltered=pc?.some(y=>y?.id===EXP)??false;
 const freeFilteredHasFiles=fc?.some(y=>y?.id===EXP)??false;
 const expected=x?.id===EXP&&x?.company?.id===account&&x?.app?.id===APP&&x?.is_public===false&&paid[0]?.visibility==='hidden';
 return {
  status:expected&&linked&&paidFiltered&&!freeLinked&&!freeFilteredHasFiles?'ASSOCIATION_VERIFIED':'ASSOCIATION_NOT_VERIFIED',
  associationVerified:!!(expected&&linked&&paidFiltered&&!freeLinked&&!freeFilteredHasFiles),
  releaseApproved:false, // genuine buyer ZIP, anonymous denial and Whop payout remain outstanding
  exactExperience: x?.id===EXP,
  officialFilesApp: x?.app?.id===APP,
  private: x?.is_public===false,
  paidProductHidden:paid[0]?.visibility==='hidden',
  directProductsPresent:directArray!==null,
  directProductCount:directArray?.length??null,
  directPaidLinked:linked,
  directFreeLinked:freeLinked,
  paidFilterStatus:productFiltered.httpStatus,
  paidFilterFilesListed:paidFiltered,
  paidFilteredExperienceCount:pc?.length??null,
  freeFilterStatus:freeFiltered.httpStatus,
  freeFilterFilesListed:freeFilteredHasFiles,
  freeFilteredExperienceCount:fc?.length??null,
  directExperienceKeys:Object.keys(x||{}).filter(k=>!/(url|secret|token|data|file|image)/i.test(k)).sort()
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await inspect();
 console.log(JSON.stringify(result));
 if(result.status==='PREREQUISITE_READ_FAILED')process.exitCode=1;
}