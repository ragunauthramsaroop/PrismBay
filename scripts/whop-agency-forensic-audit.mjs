/**
 * Four-role deterministic Whop forensic preflight.
 * Role definitions: .github/agents/whop-*.agent.md (MIT-inspired agency-agents).
 * Not an LLM runtime. No real purchases, Whop writes, files or PII.
 */
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {inspectLaunch} from './whop-sales-readiness.mjs';
import {runFromEnvironment,RESULT} from './whop-public-access-audit.mjs';

const BASE='https://api.whop.com/api/v1';
const VERSION='2026-10-29-8';
const TITLE='PrismBay Quote, Margin & Cash Studio';
const ALLOWED=hostname=>hostname==='whop.com'||hostname.endsWith('.whop.com');

export function assessReleaseEvidence({seller,anonymous,checkout,storefront}){
 const checkoutMetadata= seller?.productMetadataVerified===true&&seller?.checkoutUrlVerified===true;
 const payout=seller?.merchantPayoutVerified===true;
 const anon=anonymous?.outcome===RESULT.ANONYMOUS_DENIED;
 // These two values MUST come from a real independently evidenced buyer/free-member session.
 // No session-checker currently exists. Do not infer from admin Preview as Public.
 const buyer=false,freeMemberDenied=false;
 const exposed=anonymous?.outcome===RESULT.EXPOSED;
 return {
  status:exposed?'CRITICAL_ZIP_EXPOSURE':'LAUNCH_BLOCKED',
  launchApproved:false,
  roles:{
   payments:{checkoutMetadataVerified:checkoutMetadata,payoutVerified:payout,
    status:checkoutMetadata&&payout?'METADATA_ONLY':'BLOCKED'},
   security:{anonymousDownloadDenied:anon,paidBuyerDownloadVerified:buyer,freeMemberDenied,
    status:exposed?'CRITICAL':anon?'PARTIAL':'BLOCKED'},
   sre:{checkoutPageReachable:checkout==='REACHABLE',storefrontReachable:storefront==='REACHABLE',
    status:checkout==='REACHABLE'&&storefront==='REACHABLE'?'REACHABLE_ONLY':'INCOMPLETE'},
   releaseReviewer:{status:'BLOCKED',reason:'No independent real paid-buyer or free-member entitlement confirmation'}
  },
  issues:[
   ...(!checkoutMetadata?['CHECKOUT_METADATA_NOT_VERIFIED']:[]),
   ...(!payout?['WHOP_PAYOUT_ELIGIBILITY_NOT_VERIFIED']:[]),
   ...(!anon?['ANONYMOUS_ZIP_DENIAL_NOT_VERIFIED']:[]),
   'PAID_BUYER_FILE_DELIVERY_NOT_VERIFIED',
   'FREE_MEMBER_FILE_DENIAL_NOT_VERIFIED',
   ...(exposed?['POSSIBLE_PUBLIC_ZIP_LEAK']:[])
  ],
  evidenceQuality:'READ_ONLY_INCOMPLETE'
 };
}
async function readWhopCheckout({env,fetchImpl}){
 if(!env.WHOP_COMPANY_API_KEY||!/^biz_[A-Za-z0-9]+$/.test(env.WHOP_COMPANY_ID||''))return 'NOT_CONFIGURED';
 try{
  const scoped=endpoint=>BASE+'/'+endpoint+'?account_id='+encodeURIComponent(env.WHOP_COMPANY_ID)+'&first=100';
  const getScoped=async(endpoint)=>{
   const response=await fetchImpl(scoped(endpoint),{method:'GET',redirect:'manual',
    signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+env.WHOP_COMPANY_API_KEY,Accept:'application/json','Api-Version-Date':VERSION}});
   if(!response.ok)throw Error('Whop scoped read denied');
   const data=await response.json();
   if(!Array.isArray(data?.data)||data.page_info?.has_next_page)throw Error('Whop pagination incomplete');
   return data.data;
  };
  const [products,variants]=await Promise.all([getScoped('products'),getScoped('variants')]);
  const productIds=products.filter(p=>p?.title===TITLE).map(p=>p.id);
  if(productIds.length!==1)return 'INCOMPLETE';
  const targets=variants.filter(x=>(x?.product?.id===productIds[0]||x?.product_id===productIds[0])&&
    x?.currency?.toLowerCase()==='usd'&&Number(x?.initial_price)===19&&x?.billing_type==='one_time');
  if(targets.length!==1)return 'INCOMPLETE';
  const u=new URL(targets[0].purchase_url);
  if(u.protocol!=='https:'||!ALLOWED(u.hostname)||u.username||u.password)return 'BAD_CHECKOUT_URL';
  // Separate UNAUTHENTICATED GET. Do not follow unexpected redirects or submit payments.
  const checkout=await fetchImpl(u.toString(),{method:'GET',redirect:'manual',
   signal:AbortSignal.timeout(12000),
   headers:{Accept:'text/html'}});
  if(checkout.status===200)return 'REACHABLE';
  if([301,302,303,307,308].includes(checkout.status))return 'REDIRECT_REQUIRES_REVIEW';
  return 'NOT_REACHABLE';
 }catch{return 'ERROR'}
}
async function readStorefront(fetchImpl){
 try{
  const r=await fetchImpl('https://clean.prismbayai.com/digital/quote-margin-studio/',{
   method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html'}});
  return r.status===200?'REACHABLE':'NOT_REACHABLE';
 }catch{return 'ERROR'}
}
export async function runForensicAgency({env=process.env,fetchImpl=fetch}={}){
 const [seller,anonymous,checkout,storefront]=await Promise.all([
  inspectLaunch({env,fetchImpl}),
  runFromEnvironment(env,{fetchImpl}),
  readWhopCheckout({env,fetchImpl}),
  readStorefront(fetchImpl)
 ]);
 return assessReleaseEvidence({seller,anonymous,checkout,storefront});
}
const fmt=s=>String(s).replace(/[|<>\r\n]/g,' ');
export function summaryMarkdown(report){
 const row=(role,r)=>'| '+role+' | '+fmt(r.status)+' |';
 return [
  '# PrismBay Whop forensic release audit',
  '',
  'Target: Clean business, USD 19 one-time Quote, Margin & Cash Studio.',
  '',
  '| Agency role | Evidence result |',
  '|---|---|',
  ...Object.entries(report.roles).map(([role,r])=>row(role,r)),
  '',
  'Release: **BLOCKED**. No purchase, publication, account mutation or ZIP download was performed.',
  '',
  ...report.issues.map(x=>'- '+fmt(x)),
  '',
  'The Whop admin preview is not an independent authorization test. A real paid customer and a free member must be tested separately.'
 ].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await runForensicAgency();
 const safe={...result}; // Only whitelisted statuses, no URLs or API response data.
 console.log(JSON.stringify(safe));
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summaryMarkdown(safe)+'\n');
 // Critical exposure is a genuine security CI failure. Unknown keeps product Hidden.
 if(result.status==='CRITICAL_ZIP_EXPOSURE')process.exitCode=1;
}
