/**
 * Read-only Whop merchant audit. Never publishes products or asserts buyer access.
 * Secrets: WHOP_COMPANY_API_KEY. Optional WHOP_COMPANY_ID (biz_...).
 * No token or Whop API response bodies are printed.
 */
import {pathToFileURL} from 'node:url';
const BASE='https://api.whop.com/api/v1';
const TARGET='PrismBay Quote, Margin & Cash Studio';
export const STATUSES=Object.freeze({CONFIG_NEEDED:'CONFIG_NEEDED',AUTH_ERROR:'AUTH_ERROR',API_ERROR:'API_ERROR',REVIEW:'REVIEW',VERIFIED_METADATA:'VERIFIED_METADATA'});
function validateCompanyId(id){return typeof id==='string'&&/^biz_[a-zA-Z0-9]+$/.test(id)}
async function apiGet(path,token,fetchImpl){
 const uri=new URL(BASE+path);
 if(uri.origin!=='https://api.whop.com'||!uri.pathname.startsWith('/api/v1/'))throw Error('invalid API endpoint');
 const res=await fetchImpl(uri.toString(),{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+token,Accept:'application/json'}
 });
 if(!res.ok)throw Object.assign(Error('Whop API rejected request'),{httpStatus:res.status});
 if(res.status>=300&&res.status<400)throw Object.assign(Error('Whop redirected'),{httpStatus:res.status});
 return res.json();
}
function extractData(value){if(!Array.isArray(value?.data))throw Error('Unexpected Whop collection');return value.data}
function onlyPage(value){if(value?.page_info?.has_next_page)throw Error('Incomplete Whop pagination');return extractData(value)}
export function assessMetadata(products,plans){
 const matches=products.filter(p=>p?.title===TARGET);
 if(matches.length!==1)return {status:STATUSES.REVIEW,reason:matches.length===0?'Target product missing':'Duplicate target products',releaseApproved:false};
 const product=matches[0];
 const relevant=plans.filter(x=>x?.product?.id===product.id||x?.product_id===product.id);
 const exact=relevant.filter(x=>x?.currency?.toLowerCase()==='usd'&&Number(x?.initial_price)===19&&x?.plan_type==='one_time');
 const visible=product.visibility;
 const result={
  status:STATUSES.REVIEW,
  productFound:true,
  productVisibility:typeof visible==='string'?visible:'unknown',
  matchingOneTimePlans:exact.length,
  releaseApproved:false,
  privateFileAccessVerified:false,
  paidBuyerAccessVerified:false,
  merchantPayoutVerified:false
 };
 if(exact.length===1&&visible==='hidden'){
  result.status=STATUSES.VERIFIED_METADATA;
  result.reason='Product metadata matches $19 one-time Hidden offer; full release remains BLOCKED pending Files, buyer-access and payouts.';
 }else result.reason='Product or pricing metadata needs review; full release remains BLOCKED.';
 return result;
}
export async function inspectWhop({env=process.env,fetchImpl=fetch}={}){
 const token=env.WHOP_COMPANY_API_KEY||'';
 if(!token)return {status:STATUSES.CONFIG_NEEDED,releaseApproved:false,reason:'Add the company-scoped Whop API key in GitHub Actions Secrets.'};
 if(!/^[\x21-\x7E]{10,512}$/.test(token))return {status:STATUSES.CONFIG_NEEDED,releaseApproved:false,reason:'Whop API key format is invalid.'};
 let id=env.WHOP_COMPANY_ID||'';
 if(id&&!validateCompanyId(id))return {status:STATUSES.CONFIG_NEEDED,releaseApproved:false,reason:'Invalid Whop business ID.'};
 try{
  // Whop documents GET /products with an account API key and access_pass:basic:read.
  // GET /accounts/me was returning 403 even with company:basic:read.
  // Product details contain company.id; avoid the account-discovery endpoint entirely.
  const products=onlyPage(await apiGet('/products?first=100',token,fetchImpl));
  const targets=products.filter(p=>p?.title===TARGET);
  if(targets.length!==1)return {status:STATUSES.REVIEW,reason:targets.length?'Duplicate target products':'Target product not found',releaseApproved:false};
  if(!id){
   const detail=await apiGet('/products/'+encodeURIComponent(targets[0].id),token,fetchImpl);
   if(detail?.id!==targets[0].id||!validateCompanyId(detail?.company?.id))
    return {status:STATUSES.CONFIG_NEEDED,reason:'Product detail did not provide verified company ID.',releaseApproved:false};
   id=detail.company.id;
  }
  const plans=onlyPage(await apiGet('/plans?company_id='+encodeURIComponent(id)+'&first=100',token,fetchImpl));
  return assessMetadata(targets,plans);
 }catch(error){
  const code=Number(error?.httpStatus)||0;
  return {status:code===401||code===403?STATUSES.AUTH_ERROR:STATUSES.API_ERROR,releaseApproved:false,
   reason:code===401||code===403?'Whop denied a read-only product or plan request. Verify that access_pass:basic:read and plan:basic:read belong to the same Clean company key.':
   'Whop API request failed or returned an incomplete/unexpected response.',
   httpStatus:code||undefined};
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=await inspectWhop();
 console.log(JSON.stringify(output));
 if([STATUSES.AUTH_ERROR,STATUSES.API_ERROR].includes(output.status))process.exitCode=1;
}
