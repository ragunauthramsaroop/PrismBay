/**
 * PrismBay Whop read-only anonymous download audit.
 * A Public admin preview is not a signed-out visitor test.
 * This audit NEVER approves a product release or validates a paying customer.
 * Set PRISMBAY_WHOP_ANON_FILE_URL in private workflow secrets.
 * Signed file URLs, content bytes and cookies must not be logged.
 */
import { pathToFileURL } from 'node:url';

export const RESULT=Object.freeze({
 EXPOSED:'EXPOSED', ANONYMOUS_DENIED:'ANONYMOUS_DENIED',
 NOT_FOUND:'NOT_FOUND', INCONCLUSIVE:'INCONCLUSIVE',
 NOT_CONFIGURED:'NOT_CONFIGURED', ERROR:'ERROR'
});

const isWhopHost=host=>host==='whop.com'||host.endsWith('.whop.com');
export function validateWhopUrl(value){
 if(typeof value!=='string'||!value.trim())throw new Error('missing Whop file URL');
 let url;
 try{url=new URL(value)}catch{throw new Error('invalid Whop file URL')}
 if(url.protocol!=='https:'||!isWhopHost(url.hostname.toLowerCase())||url.username||url.password){
  throw new Error('Whop file URL must use HTTPS on whop.com or a Whop subdomain');
 }
 return url;
}
export function classifyObservation({status,contentType='',contentDisposition='',firstBytes=[],location=''}){
 const ct=String(contentType).toLowerCase();
 const disposition=String(contentDisposition).toLowerCase();
 const bytes=firstBytes instanceof Uint8Array?firstBytes:Uint8Array.from(firstBytes);
 const zipMagic=bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&
  ((bytes[2]===3&&bytes[3]===4)||(bytes[2]===5&&bytes[3]===6)||(bytes[2]===7&&bytes[3]===8));
 const downloadable=zipMagic||
  (/application\/(?:zip|x-zip-compressed)/.test(ct)&&[200,206].includes(status))||
  (disposition.includes('attachment')&&/\.zip(?:["';\s]|$)/.test(disposition)&&[200,206].includes(status));
 if([200,206].includes(status)&&downloadable)return RESULT.EXPOSED;
 if([401,403].includes(status))return RESULT.ANONYMOUS_DENIED;
 if([301,302,303,307,308].includes(status)){
  try{
   const target=new URL(location,'https://whop.com');
   if(isWhopHost(target.hostname)&&/(?:login|sign-in|signin|register)/.test(target.pathname.toLowerCase())){
    return RESULT.ANONYMOUS_DENIED;
   }
  }catch{/* inconclusive */}
  return RESULT.INCONCLUSIVE;
 }
 if([404,410].includes(status))return RESULT.NOT_FOUND;
 return RESULT.INCONCLUSIVE;
}
export async function probeAnonymousDownload(value,{fetchImpl=fetch,timeoutMs=15000}={}){
 validateWhopUrl(value);
 let response;
 try{
  response=await fetchImpl(value,{
   method:'GET',redirect:'manual',
   headers:{Range:'bytes=0-31','Cache-Control':'no-cache','Accept':'application/zip,application/octet-stream,*/*'},
   signal:AbortSignal.timeout(timeoutMs)
  });
  // Read only the first chunk, never stream a full product ZIP to an Action.
  let buf=new Uint8Array();
  if([200,206].includes(response.status)&&response.body?.getReader){
   const reader=response.body.getReader();
   try{
    const {value}=await reader.read();
    if(value)buf=new Uint8Array(value).slice(0,32);
   }finally{await reader.cancel().catch(()=>{})}
  }else if([200,206].includes(response.status)&&response.arrayBuffer){
   // Fallback for small synthetic tests.
   buf=new Uint8Array(await response.arrayBuffer()).slice(0,32);
  }
  const outcome=classifyObservation({
   status:response.status,firstBytes:buf,
   contentType:response.headers.get('content-type')||'',
   contentDisposition:response.headers.get('content-disposition')||'',
   location:response.headers.get('location')||''
  });
  return {
   outcome,httpStatus:response.status,
   anonymousDownloadProven:outcome===RESULT.EXPOSED,
   releaseApproved:false,
   reason:outcome===RESULT.EXPOSED?
    'Unauthenticated request obtained downloadable ZIP content; restrict access immediately.':
    outcome===RESULT.ANONYMOUS_DENIED?
    'Anonymous access denied for this URL only; paid-member and payout checks remain pending.':
    'Inconclusive public link result; signed-out browser and buyer test still required.'
  };
 }catch(error){
  return {outcome:RESULT.ERROR,releaseApproved:false,
   reason:'Read-only probe failed; Whop paid-access verification remains pending.',
   errorType:error?.name||'Error'};
 }finally{try{await response?.body?.cancel()}catch{/* consumed */}}
}
export async function runFromEnvironment(env=process.env,{fetchImpl=fetch}={}){
 const link=env.PRISMBAY_WHOP_ANON_FILE_URL;
 if(!link)return {outcome:RESULT.NOT_CONFIGURED,releaseApproved:false,
  reason:'Private Whop file URL is not configured. Anonymous access has NOT been tested.'};
 try{return await probeAnonymousDownload(link,{fetchImpl})}
 catch{return {outcome:RESULT.ERROR,releaseApproved:false,reason:'Invalid Whop test URL.'}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await runFromEnvironment();
 console.log(JSON.stringify(result));
 if([RESULT.EXPOSED,RESULT.ERROR].includes(result.outcome))process.exitCode=1;
}