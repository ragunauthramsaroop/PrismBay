/**
 * Read-only Whop Files app-to-product association audit.
 * Uses official Whop GET /experiences?account_id&product_id.
 * Never assumes metadata proves private ZIP delivery or buyer entitlement.
 */
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const API='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const PAID='PrismBay Quote, Margin & Cash Studio';
const FREE='PrismBay Clean';
const FILES_APP='app_5UWRrs7haZZeiQ'; // Whop's official Files app.
const fail=(status,reason)=>({status,releaseApproved:false,
  productAssociationVerified:false,unpaidDownloadDenied:false,paidBuyerDeliveryVerified:false,
  reason});
const companyId=id=>typeof id==='string'&&/^biz_[A-Za-z0-9]+$/.test(id);
export function assessExperienceGating({products,paidExperiences,freeExperiences}){
 const paid=products.filter(p=>p?.title===PAID);
 const free=products.filter(p=>p?.title===FREE);
 if(paid.length!==1||free.length!==1||paid[0].id===free[0].id)
  return fail('PRODUCTS_UNVERIFIED','Expected one separate paid and one separate free product');
 const isFiles=x=>x?.app?.id===FILES_APP||x?.app?.name==='Files';
 const paidFiles=paidExperiences.filter(isFiles);
 const freeFiles=freeExperiences.filter(isFiles);
 if(freeFiles.length>0)return {...fail('FREE_PRODUCT_FILES_ACCESS','Files app appears in free-product experience list'),freeProductFilesAccess:true};
 if(paidFiles.length!==1)return fail('PAID_PRODUCT_FILES_UNVERIFIED','Expected exactly one Files app experience attached to the paid product');
 if(paidFiles[0]?.app?.id&&paidFiles[0].app.id!==FILES_APP)
  return fail('AMBIGUOUS_FILES_APP','Files-named app does not match the official Whop Files app');
 return {
  status:'PRODUCT_GATE_VERIFIED',releaseApproved:false,
  productAssociationVerified:true,freeProductFilesAccess:false,
  unpaidDownloadDenied:false,paidBuyerDeliveryVerified:false,
  filesExperienceCount:1,
  reason:'Whop associates its Files experience with the paid product but not the free product. Actual signed-out file download and paying-member delivery still require independent tests.'
 };
}
export async function inspectFiles({env=process.env,fetchImpl=fetch}={}){
 const token=env.WHOP_COMPANY_API_KEY,account=env.WHOP_COMPANY_ID;
 if(!token||!companyId(account))return fail('CONFIG_NEEDED','Whop account-scoped API connection is missing');
 const get=async(path)=>{
  const r=await fetchImpl(API+path,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Bearer '+token,'Api-Version-Date':VERSION,Accept:'application/json'}});
  if(!r.ok)throw Object.assign(Error('Whop read failed'),{httpStatus:r.status});
  const body=await r.json();
  if(!Array.isArray(body?.data)||body?.page_info?.has_next_page)throw Error('Missing or incomplete Whop data');
  return body.data;
 };
 try{
  const products=await get('/products?account_id='+encodeURIComponent(account)+'&first=100');
  const paid=products.filter(p=>p?.title===PAID),free=products.filter(p=>p?.title===FREE);
  if(paid.length!==1||free.length!==1)return fail('PRODUCTS_UNVERIFIED','Paid or free product missing from Whop list');
  const path=id=>'/experiences?account_id='+encodeURIComponent(account)+'&product_id='+encodeURIComponent(id)+'&first=100';
  const [paidExperiences,freeExperiences]=await Promise.all([get(path(paid[0].id)),get(path(free[0].id))]);
  const verdict=assessExperienceGating({products,paidExperiences,freeExperiences});
  if(verdict.status==='PRODUCT_GATE_VERIFIED'||verdict.status==='FREE_PRODUCT_FILES_ACCESS')return verdict;
  // Drill into account-wide records only when the filtered query yielded no Files app.
  // Report response structure and counts only, not confidential Whop account data.
  const allExperiences=await get('/experiences?account_id='+encodeURIComponent(account)+'&first=100');
  const sample=allExperiences[0]||{};
  const files=allExperiences.filter(x=>x?.app?.id===FILES_APP||x?.app?.name==='Files');
  const productRefs=files.map(x=>Array.isArray(x.products)?x.products:
      Array.isArray(x.products?.data)?x.products.data:[]).flat();
  return {...verdict,diagnostics:{
   paidExperienceCount:paidExperiences.length,
   freeExperienceCount:freeExperiences.length,
   companyExperienceCount:allExperiences.length,
   recognizedFilesExperienceCount:files.length,
   filesExperiencePaidProductLinked:productRefs.some(p=>p?.id===paid[0].id),
   filesExperienceFreeProductLinked:productRefs.some(p=>p?.id===free[0].id),
   experienceFieldNames:Object.keys(sample).sort().slice(0,30),
   appFieldNames:Object.keys(sample?.app||{}).sort().slice(0,15),
   observedAppIdentities:allExperiences.slice(0,10).map(x=>({appId:x?.app?.id||'UNKNOWN',appName:x?.app?.name||'UNKNOWN',isPublic:typeof x?.is_public==='boolean'?x.is_public:null})),
   paidAppIdentities:paidExperiences.slice(0,10).map(x=>({appId:x?.app?.id||'UNKNOWN',appName:x?.app?.name||'UNKNOWN',isPublic:typeof x?.is_public==='boolean'?x.is_public:null}))
  }};
 }catch(err){
  const status=Number(err?.httpStatus)||0;
  return {...fail(status===403?'EXPERIENCE_READ_FORBIDDEN':'API_INCONCLUSIVE',
   status===403?'Whop denied read-only experience access; account key needs experience read permission, or owner dashboard inspection.':
   'Whop experience metadata could not be verified.'),httpStatus:status||undefined};
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=await inspectFiles();
 console.log(JSON.stringify(report));
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n## Files app product association\n\n- Status: **'+report.status+'**\n- Release approved: **NO**\n- '+report.reason+'\n');
 if(report.status==='FREE_PRODUCT_FILES_ACCESS')process.exitCode=1;
}
