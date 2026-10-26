#!/usr/bin/env node
// Read-only confirmation of published TikTok URLs from an authenticated Zernio receipt.
// One GET per previously reserved post; no publishing, retries, comments or outreach.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'build','tiktok-status','receipt.json');
const LEDGER='automation/tiktok-ledger.json';
const PROVIDER='https://zernio.com/api/v1/posts/';
export function publicTikTokUrl(value, username='prismbayclean'){
  if(typeof value!=='string')return null;
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||!['www.tiktok.com','tiktok.com'].includes(u.hostname))return null;
    const base='/@'+username+'/video/';
    if(!u.pathname.startsWith(base))return null;
    const segment=u.pathname.slice(base.length);
    const id=segment.endsWith('/')?segment.slice(0,-1):segment;
    if(!/^[0-9]+$/.test(id))return null;
    return 'https://www.tiktok.com'+base+id;
  }catch{return null;}
}
export function eligibleEntries(ledger){
  if(ledger?.schemaVersion!==1||!ledger.entries||typeof ledger.entries!=='object')throw Error('invalid_ledger');
  return Object.values(ledger.entries).filter(e=>e?.account==='prismbayclean' &&
    /^[a-z0-9-]{8,100}$/.test(e.id||'') && /^[a-f0-9]{24}$/.test(e.providerPostId||'') &&
    !e.publicPostUrl && e.status==='submitted_unverified');
}
export function updateFromProvider(ledger,postId,body,now=new Date().toISOString()){
  const item=Object.values(ledger.entries).find(x=>x.providerPostId===postId);
  if(!item||item.status!=='submitted_unverified'||item.publicPostUrl)return null;
  const post=body?.post??body?.data?.post??body?.data??body;
  if((post?._id??post?.id)!==postId)return null;
  const target=(post.platforms??[]).find(p=>p.platform==='tiktok');
  if(!target||target.accountId&&target.accountId!== '6ac41ebe5450b4ad42dec37e')return null;
  const platformStatus=String(target.status||'').toLowerCase();
  if(platformStatus!=='published')return null;
  const url=publicTikTokUrl(target.platformPostUrl,'prismbayclean');
  if(!url)return null;
  item.publicPostUrl=url;
  item.providerStatus=platformStatus;
  item.providerUrlReportedAt=now;
  item.note='Public TikTok URL reported by authenticated Zernio post detail; independent user-visible website check may still be necessary.';
  return {creativeId:item.id,publicPostUrl:url,providerPostId:postId};
}
export async function reconcile(ledger,{fetchImpl=fetch,env=process.env}={}){
  const entries=eligibleEntries(ledger), key=env.ZERNIO_API_KEY;
  const report={schemaVersion:1,checkedAt:new Date().toISOString(),
    provider:'zernio',account:'prismbayclean',readOnly:true,submissionAttempted:false,
    checked:0,resolved:[],pending:[],errorCodes:[]};
  if(!entries.length)return report;
  if(!key){report.errorCodes.push('missing_ZERNIO_API_KEY');return report;}
  for(const entry of entries){
    let response,body;
    try{
      response=await fetchImpl(PROVIDER+encodeURIComponent(entry.providerPostId),{
        method:'GET',redirect:'error',
        headers:{Authorization:'Bearer '+key,Accept:'application/json'},
        signal:AbortSignal.timeout(18000)});
      if(!response.ok){
        report.errorCodes.push('zernio_get_http_'+response.status);
        report.pending.push(entry.id);continue;
      }
      body=await response.json();
    }catch{
      report.errorCodes.push('zernio_read_or_parse_failure');
      report.pending.push(entry.id);continue;
    }
    report.checked++;
    const found=updateFromProvider(ledger,entry.providerPostId,body);
    if(found)report.resolved.push(found);
    else report.pending.push(entry.id);
  }
  return report;
}
export async function main(){
  const dir=process.env.PRISMBAY_LEDGER_WORKTREE;
  if(!dir||!path.isAbsolute(dir))throw Error('durable_ledger_worktree_missing');
  const target=path.join(dir,LEDGER);
  const ledger=JSON.parse(await fs.readFile(target,'utf8'));
  const report=await reconcile(ledger);
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(report,null,2)+'\n');
  if(report.resolved.length)await fs.writeFile(target,JSON.stringify(ledger,null,2)+'\n');
  console.log(JSON.stringify(report)); // URL and status only; no token or raw third-party fields
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('TikTok status check blocked: '+e.message);process.exitCode=1});
