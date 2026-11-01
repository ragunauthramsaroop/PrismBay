/**
 * Whop payout destination existence check only.
 * Never emits destination names, account or routing numbers, addresses, IDs,
 * customer information, credentials or payout instrument data.
 * KYC approval is NOT inferred from the presence of a payout method.
 */
import {pathToFileURL} from 'node:url';
const API='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const base=()=>({payoutKycApproved:false,payoutEligible:false,destinationVerified:false});
export function assessMethods(methods){
 if(!Array.isArray(methods))return {...base(),status:'INCONCLUSIVE'};
 const scoped=methods.filter(x=>x&&typeof x==='object');
 const usd=scoped.filter(x=>String(x.currency||'').toUpperCase()==='USD');
 const defaults=scoped.filter(x=>x.is_default===true);
 return {...base(),status:scoped.length>0?'PAYOUT_DESTINATION_PRESENT':'NO_DESTINATION_LISTED',
  destinationVerified:scoped.length>0,destinationCount:scoped.length,
  usdDestinationCount:usd.length,defaultDestinationCount:defaults.length,
  reason:scoped.length>0?
   'At least one payout destination exists. Business verification and actual payout authorization still require Whop approval.':
   'No payout destination listed. Whop may require adding an eligible withdrawal method after identity review.'};
}
export async function checkPayoutDestination({env=process.env,fetchImpl=fetch}={}){
 const key=env.WHOP_COMPANY_API_KEY,id=env.WHOP_COMPANY_ID;
 if(!key||!/^biz_[A-Za-z0-9]+$/.test(id||''))return {...base(),status:'CONFIG_NEEDED'};
 let response;
 try{
  const url=API+'/payout_methods?account_id='+encodeURIComponent(id)+'&first=50';
  response=await fetchImpl(url,{
   method:'GET',redirect:'manual',
   signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Bearer '+key,'Api-Version-Date':VERSION,Accept:'application/json'}
  });
  if(response.status===401||response.status===403){
   return {...base(),status:'PAYOUT_READ_PERMISSION_REQUIRED',
    httpStatus:response.status,reason:'Payout destination access requires payout:destination:read. Existing read-only key may lack this scope.'};
  }
  if(!response.ok)return {...base(),status:'PAYOUT_API_INCONCLUSIVE',httpStatus:response.status};
  const raw=await response.json();
  if(!Array.isArray(raw?.data)||raw?.page_info?.has_next_page!==false)
   return {...base(),status:'PAYOUT_API_INCONCLUSIVE'};
  // Fail closed when a Whop response includes another company's destination.
  if(raw.data.some(x=>x?.company?.id!==id))
   return {...base(),status:'PAYOUT_ACCOUNT_MISMATCH'};
  return assessMethods(raw.data);
 }catch{
  return {...base(),status:'PAYOUT_API_INCONCLUSIVE'};
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=await checkPayoutDestination();
 console.log(JSON.stringify(r));
 if(r.status==='PAYOUT_ACCOUNT_MISMATCH')process.exitCode=1;
}