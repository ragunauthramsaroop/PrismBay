/**
 * Private configuration, public-safe evidence: read-only Whop go-live preflight.
 * Never prints checkout URLs, private file links, payout personal data, credentials,
 * customer details, or raw Whop API responses.
 * Does not test Files entitlement, run a payment, or alter seller settings.
 */
import { pathToFileURL } from 'node:url';
import { assessMetadata, STATUSES } from './whop-merchant-readiness.mjs';

const BASE='https://api.whop.com/api/v1';
const API_VERSION='2026-10-29-8';
const BAD='NOT_VERIFIED';
const isId=id=>typeof id==='string'&&/^biz_[A-Za-z0-9]+$/.test(id);
const list=data=>{
 if(!Array.isArray(data?.data)||data?.page_info?.has_next_page)throw new Error('invalid/incomplete collection');
 return data.data;
};
const get=async(path,token,fetchImpl)=>{
 const url=new URL(BASE+path);
 if(url.hostname!=='api.whop.com'||!url.pathname.startsWith('/api/v1/'))throw new Error('invalid host');
 const res=await fetchImpl(url.toString(),{
  method:'GET',redirect:'manual',
  signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+token,Accept:'application/json','Api-Version-Date':API_VERSION}
 });
 if(!res.ok)throw Object.assign(new Error('request failed'),{code:res.status});
 return res.json();
};
const isCheckout=url=>{
 try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='whop.com'||u.hostname.endsWith('.whop.com'))&&
    /(?:checkout|pay)/i.test(u.pathname)}catch{return false}
};
export function classifyAccount(account){
 const cap=account?.capabilities?.standard_payout;
 const active=cap===true||cap==='active'||cap==='enabled';
 const blocked=cap===false||cap==='inactive'||cap==='disabled';
 const required=Array.isArray(account?.required_actions)?account.required_actions.length:null;
 return {payoutCapability:active?'ACTIVE':blocked?'INACTIVE':'UNKNOWN',
   requiredActionCount:required,
   payoutVerified:active&&required===0};
}
export async function inspectLaunch({env=process.env,fetchImpl=fetch}={}){
 const key=env.WHOP_COMPANY_API_KEY, id=env.WHOP_COMPANY_ID;
 const initial={
  launchApproved:false,privateFileAccessVerified:false,paidBuyerAccessVerified:false,
  anonymousAccessVerified:false,merchantPayoutVerified:false
 };
 if(!key||!isId(id))return {...initial,status:'CONFIG_NEEDED',reason:'Whop company key or ID not configured'};
 if(!/^[\x21-\x7E]{10,512}$/.test(key))return {...initial,status:'CONFIG_NEEDED',reason:'Whop key invalid'};
 try{
  const [p,v]=await Promise.all([
   get('/products?account_id='+encodeURIComponent(id)+'&first=100',key,fetchImpl),
   get('/variants?account_id='+encodeURIComponent(id)+'&first=100',key,fetchImpl)
  ]);
  const products=list(p),variants=list(v);
  const metadata=assessMetadata(products,variants);
  if(metadata.status!==STATUSES.VERIFIED_METADATA)return {...initial,status:'REVIEW',reason:'Target product metadata not verified'};
  const product=products.find(x=>x.title==='PrismBay Quote, Margin & Cash Studio');
  const match=variants.filter(x=>(x?.product?.id===product.id||x?.product_id===product.id)&&
    String(x?.currency).toLowerCase()==='usd'&&Number(x.initial_price)===19&&x.billing_type==='one_time');
  const checkoutUrlVerified=match.length===1&&isCheckout(match[0]?.purchase_url);
  let payout={payoutCapability:'UNKNOWN',requiredActionCount:null,payoutVerified:false};
  let accountCheck='UNAVAILABLE';
  try{
   const account=await get('/accounts/'+encodeURIComponent(id),key,fetchImpl);
   payout=classifyAccount(account);accountCheck='READ';
  }catch(e){accountCheck=[401,403].includes(e?.code)?'INSUFFICIENT_READ_SCOPE':'UNAVAILABLE'}
  return {...initial,status:'REVIEW',
   productMetadataVerified:true,productHidden:true,priceUsd:19,oneTimePayment:true,
   checkoutUrlVerified,accountCheck,payoutCapability:payout.payoutCapability,
   requiredActionCount:payout.requiredActionCount,
   merchantPayoutVerified:payout.payoutVerified,
   reason:checkoutUrlVerified?
    'Whop checkout metadata exists. Publication blocked until real Files access and paid-buyer delivery are independently verified.':
    'Whop checkout URL is missing or unusable. Product remains hidden.'};
 }catch(e){
  return {...initial,status:'API_ERROR',httpStatus:Number(e?.code)||undefined,
   reason:'Whop read-only release evidence fetch failed; no go-live action performed'};
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await inspectLaunch();
 console.log(JSON.stringify(result));
 if(result.status==='API_ERROR')process.exitCode=1;
}
