#!/usr/bin/env node
// PrismBay GitHub-only TikTok autoposter. A locked/unsigned queue never posts.
// One exact creative, one durable reservation, one Zernio submission. Never auto-retry uncertain outcomes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ACTIVE_DIGITAL_OFFERS} from './digital-conversion-campaign.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'build','tiktok-autopost');
const QUEUE=path.join(ROOT,'config','tiktok-approved-autopost.json');
const LOCK=path.join(ROOT,'config','tiktok-publish-lock.json');
const ZERNIO_ACCOUNT_CONFIG=path.join(ROOT,'config','tiktok-publish.json');
const MEDIA_ROOT='https://clean.prismbayai.com/media/tiktok/approved/';
const PROVIDER='https://zernio.com/api/v1';
const STATE_FILE='automation/tiktok-ledger.json';
const RIGHTS_KEYS=['ownerApproved','rightsVerified','destinationVerified','accountAudienceFitApproved','contentPreviewConfirmed','expressConsentGiven'];
const formatHash=/^[a-f0-9]{64}$/i;
const isRef=s=>typeof s==='string' && /^https:\/\/github\.com\/ragunauthramsaroop\/PrismBay\/(?:pull|issues)\/\d+$/.test(s);
const sha=data=>createHash('sha256').update(data).digest('hex');
const time=()=>new Date().toISOString();
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const basename=s=>typeof s==='string' && /^[a-z0-9][a-z0-9-]{2,60}\.mp4$/.test(s);
const expectedProducts={
  'pricing-calculator':{price:null,landing:'/digital/free-pricing-calculator.html'},
  'stakeholder-toolkit':{price:49,landing:'/digital/guides/stakeholder-commitments-checklist.html',offer:'stakeholder'},
  'esg-reporting':{price:99,landing:'/digital/guides/esg-monthly-reporting-checklist.html',offer:'esg'}
};
const ensure=(assertion,reason)=>{if(!assertion)throw Error(reason)};
export function mediaUrl(item){return MEDIA_ROOT+item.mediaFilename}
export function documentHash(item){return sha([item.id,item.expectedSha256,sha(item.caption),item.landingUrl,item.priceUsd].join('|'))}
export function validateQueue(queue,lock,baseConfig,now=new Date()){
  ensure(queue?.schemaVersion===1 && Array.isArray(queue.items) && queue.items.length<=10,'invalid_queue');
  ensure(queue.account?.id===baseConfig.account.id && queue.account?.username===baseConfig.account.username,'unauthorized_account_change');
  ensure(queue.account.username==='prismbayclean' && baseConfig.account.platform==='tiktok','wrong_tiktok_channel');
  if(lock?.locked!==false)return {status:'blocked',reason:'existing_creative_publication_lock',candidate:null,checks:[]};
  if(queue.enabled!==true)return {status:'blocked',reason:'queue_not_enabled_by_owner',candidate:null,checks:[]};
  const list=[],ids=new Set();
  for(const item of queue.items){
    ensure(typeof item.id==='string' && /^pb-[a-z0-9-]+-20\d\d[a-z0-9-]*$/.test(item.id) && !ids.has(item.id),'invalid_duplicate_item_id');
    ids.add(item.id);
    const spec=expectedProducts[item.creativeSlug];
    ensure(spec && basename(item.mediaFilename) && item.mediaFilename===item.creativeSlug+'.mp4','unapproved_video_identity');
    ensure(formatHash.test(item.expectedSha256) && typeof item.caption==='string' && item.caption.length>30 && item.caption.length<=2200,'invalid_media_or_caption');
    ensure(item.priceUsd===spec.price && item.landingUrl==='https://clean.prismbayai.com'+spec.landing,'unverified_price_or_destination');
    if(spec.offer){
      const offer=ACTIVE_DIGITAL_OFFERS.find(o=>o.slug===spec.offer);
      ensure(offer && offer.priceUsd===item.priceUsd,'existing_stripe_price_changed');
    }
    ensure(!/guaranteed income|guaranteed sales|limited time only|verified review|5.star|best.seller/i.test(item.caption),'unsupported_viral_claim');
    ensure(item.caption.startsWith('Ad |') && item.caption.includes(item.landingUrl),'disclosure_or_destination_missing');
    const a=item.approval||{};
    const flags=RIGHTS_KEYS.every(k=>a[k]===true);
    const created=Date.parse(a.approvedAt);
    const expires=Date.parse(a.expiresAt);
    const fresh=Number.isFinite(created)&&Number.isFinite(expires)&&created<=now.getTime()&&
      now.getTime()<expires&&expires-created<=14*24*60*60*1000&&now.getTime()-created<=14*24*60*60*1000;
    const exact=a.approvedMediaSha256===item.expectedSha256&&a.approvedCaptionSha256===sha(item.caption);
    const approved=flags&&fresh&&exact&&isRef(a.approvalRecordUrl);
    list.push({id:item.id,approved,hash:documentHash(item),captionSha256:sha(item.caption),media:item.mediaFilename});
  }
  const chosen=queue.items.find(item=>list.find(c=>c.id===item.id)?.approved);
  return {status:chosen?'candidate':'blocked',reason:chosen?'approved_creative_available':'no_exact_approved_creative',
          candidate:chosen||null,checks:list};
}
export function chooseCandidate(plan,ledger){
  ensure(ledger?.schemaVersion===1 && ledger.entries && typeof ledger.entries==='object','invalid_durable_ledger');
  if(plan.status!=='candidate')return {...plan,status:'blocked'};
  const unseen=plan.checks.filter(x=>x.approved && !Object.hasOwn(ledger.entries,x.id));
  const first=unseen[0];
  if(!first)return {...plan,status:'blocked',reason:'approved_creatives_already_reserved_or_sent',candidate:null};
  return {...plan,candidate:plan.candidate.id===first.id?plan.candidate:plan.items?.find(x=>x.id===first.id),candidateId:first.id};
}
export function createPlan(queue,lock,base,ledger,now=new Date()){
  const check=validateQueue(queue,lock,base,now);
  if(check.status!=='candidate')return check;
  const available=check.checks.find(entry=>entry.approved && !Object.hasOwn(ledger.entries,entry.id));
  if(!available)return {...check,status:'blocked',reason:'no_unsubmitted_approved_creative',candidate:null};
  const item=queue.items.find(x=>x.id===available.id);
  return {status:'ready',reason:'preapproved_unposted_video',generatedAt:now.toISOString(),
    candidate:{...item,approval:{...item.approval}},
    captionSha256:sha(item.caption),documentHash:documentHash(item),expectedMediaSha256:item.expectedSha256,
    expectedMediaUrl:mediaUrl(item),account:queue.account,ledgerEntryId:item.id};
}
export function payloadFor(plan){
  ensure(plan?.status==='ready' && plan.candidate && plan.account.username==='prismbayclean','unapproved_plan');
  const item=plan.candidate;
  ensure(documentHash(item)===plan.documentHash,'plan_content_modified');
  return {title:item.creativeSlug.replaceAll('-',' ')+' | PrismBay',
    content:item.caption,
    mediaItems:[{type:'video',url:mediaUrl(item),mimeType:'video/mp4'}],
    platforms:[{platform:'tiktok',accountId:plan.account.id}],
    publishNow:true,isDraft:false,
    tiktokSettings:{
      privacyLevel:'PUBLIC_TO_EVERYONE',allowComment:true,allowDuet:false,allowStitch:false,
      videoMadeWithAi:true,commercialContentType:'brand_organic',
      contentPreviewConfirmed:true,expressConsentGiven:true,mediaType:'VIDEO'
    },
    metadata:{source:'prismbay-github-actions',prismbayAutoPostId:item.id,
              mediaSha256:item.expectedSha256,contentSha256:plan.captionSha256}
  };
}
export function reserve(ledger,plan,now=time()){
  ensure(plan?.status==='ready' && plan?.ledgerEntryId===plan.candidate?.id,'no_approved_candidate');
  ensure(ledger?.schemaVersion===1 && ledger.entries && typeof ledger.entries==='object','invalid_durable_ledger');
  ensure(!Object.hasOwn(ledger.entries,plan.ledgerEntryId),'already_reserved_or_published');
  ledger.entries[plan.ledgerEntryId]={
    id:plan.ledgerEntryId,
    status:'reserved_before_provider_call',reservedAt:now,
    account:plan.account.username,documentHash:plan.documentHash,
    mediaSha256:plan.expectedMediaSha256,
    providerPostId:null,providerStatus:null,publicPostUrl:null,
    note:'Never automatically retry even if the provider response is lost.'
  };
  return ledger;
}
export function settle(ledger,plan,receipt,now=time()){
  const entry=ledger.entries[plan?.ledgerEntryId];
  ensure(entry && entry.status==='reserved_before_provider_call' && entry.documentHash===plan.documentHash,'missing_exact_reservation');
  entry.status=receipt?.result==='provider_accepted'?'submitted_unverified':'manual_reconciliation_required';
  entry.providerPostId=receipt?.providerPostId||null;
  entry.providerStatus=receipt?.providerStatus||null;
  entry.publicPostUrl=receipt?.publicPostUrl||null;
  entry.updatedAt=now;
  return ledger;
}
async function req(endpoint,key,{method='GET',body,fetchImpl=fetch,timeout=25000,headers={}}={}){
  const u=PROVIDER+endpoint;
  const response=await fetchImpl(u,{method,redirect:'error',headers:{
    Authorization:'Bearer '+key,Accept:'application/json',
    ...(body?{'Content-Type':'application/json'}:{}),...headers
  },body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout)});
  let data;
  try{data=await response.json()}catch{throw Error('provider_unparseable_response')}
  return {status:response.status,ok:response.ok,data};
}
export function inspectCreator(data){
  const info=data?.data??data;
  const levels=info?.privacyLevels;
  const valid=Array.isArray(levels)&&levels.some(x=>(x.value??x)==='PUBLIC_TO_EVERYONE');
  const commercial=Array.isArray(info?.commercialContentTypes) &&
    info.commercialContentTypes.some(x=>x.value==='brand_organic');
  const creatorOk=info?.creator?.canPostMore!==false;
  const max=info?.postingLimits?.maxVideoDurationSec;
  return {ready:valid&&commercial&&creatorOk&&(max===undefined||Number(max)>=18),privacyAllowed:valid,
    ownBrandAllowed:commercial,creatorCanPost:creatorOk};
}
export async function remotePreflight(plan,{env=process.env,fetchImpl=fetch}={}){
  ensure(plan.status==='ready','no_approved_post');
  const key=env.ZERNIO_API_KEY;
  ensure(typeof key==='string'&&key.length>4,'missing_ZERNIO_API_KEY');
  // GET provider account + creator permission, never POST until durable reservation exists.
  const [accounts,creator]=await Promise.all([
    req('/accounts',key,{fetchImpl}),
    req('/accounts/'+encodeURIComponent(plan.account.id)+'/tiktok/creator-info?mediaType=video',key,{fetchImpl})
  ]);
  ensure(accounts.ok && creator.ok,'provider_account_or_creator_info_unavailable');
  const found=(()=>{const scan=(v,depth=0)=>{if(depth>8||!v||typeof v!=='object')return false;
    if((v._id??v.id??v.accountId)===plan.account.id &&
      String(v.platform).toLowerCase()==='tiktok'&&
      (!v.username||String(v.username).toLowerCase()===plan.account.username))return true;
    return Object.values(v).some(x=>scan(x,depth+1));};
    return scan(accounts.data);})();
  ensure(found,'configured_tiktok_account_not_connected');
  const permission=inspectCreator(creator.data);
  ensure(permission.ready,'creator_direct_publish_settings_unavailable');
  const url=plan.expectedMediaUrl;
  ensure(url.startsWith(MEDIA_ROOT)&&url.endsWith('.mp4'),'untrusted_video_url');
  const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(25000)});
  ensure(response.ok && response.status===200,'public_video_unavailable');
  const ct=(response.headers?.get('content-type')??'').toLowerCase();
  ensure(ct.includes('video/mp4')||ct.includes('application/octet-stream'),'video_content_type_invalid');
  const data=Buffer.from(await response.arrayBuffer());
  ensure(data.length>60000&&data.length<30_000_000,'unreasonable_video_bytes');
  ensure(sha(data)===plan.expectedMediaSha256,'public_video_digest_mismatch');
  return {ready:true,verifiedAt:time(),account:plan.account.username,videoBytes:data.length,
    mediaSha256:sha(data),creatorPrivacyReady:true,commercialDisclosureReady:true,
    note:'No TikTok post attempted'};
}
function stableUUID(hex){
  const s=sha(hex).slice(0,32).split('');
  s[12]='4';s[16]='8';
  const h=s.join('');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
export async function providerPublish(plan,ledger,{env=process.env,fetchImpl=fetch}={}){
  const entry=ledger?.entries?.[plan?.ledgerEntryId];
  ensure(entry?.status==='reserved_before_provider_call' && entry.documentHash===plan.documentHash,'durable_reservation_required');
  const key=env.ZERNIO_API_KEY;
  ensure(typeof key==='string'&&key.length>4,'missing_ZERNIO_API_KEY');
  const p=payloadFor(plan);
  const idempotency=stableUUID(plan.documentHash+plan.account.id);
  let result;
  try{
    result=await req('/posts',key,{method:'POST',body:p,fetchImpl,timeout:100000,
      headers:{'Idempotency-Key':idempotency,'X-Request-Id':idempotency}});
  }catch{
    return {schemaVersion:1,result:'uncertain_manual_reconciliation',reason:'provider_response_missing',
      recordedAt:time(),creativeId:plan.ledgerEntryId,providerPostId:null,publicPostUrl:null};
  }
  const data=result.data;
  const post=data?.post??data?.data?.post;
  const platform=post?.platforms?.find(x=>x.platform==='tiktok');
  const accepted=(result.status===200||result.status===201) &&
    Boolean(post?._id??post?.id) &&
    ['published','publishing','scheduled','processing','pending'].includes(String(post.status||'').toLowerCase()) &&
    !['failed','partial'].includes(String(platform?.status||'').toLowerCase());
  return {schemaVersion:1,result:accepted?'provider_accepted':'manual_review_required',
    httpStatus:result.status,providerStatus:String(post?.status||'unknown'),
    platformStatus:String(platform?.status||'unknown'),
    reason:accepted?'zernio_reported_submission':'zernio_response_requires_manual_review',
    providerPostId:post?._id??post?.id??null,
    publicPostUrl:typeof platform?.platformPostUrl==='string' && platform.platformPostUrl.startsWith('https://www.tiktok.com/')?platform.platformPostUrl:null,
    recordedAt:time(),creativeId:plan.ledgerEntryId};
}
async function save(name,data){await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,name),JSON.stringify(data,null,2)+'\n')}
async function loadPlan(){return read(path.join(OUT,'plan.json'))}
async function ledgerAt(){
  const dir=process.env.PRISMBAY_LEDGER_WORKTREE;
  ensure(dir && path.isAbsolute(dir),'ledger_worktree_required');
  return path.join(dir,STATE_FILE);
}
async function main(){
  const mode=process.argv[2]??'plan';
  const [queue,lock,base]=await Promise.all([read(QUEUE),read(LOCK),read(ZERNIO_ACCOUNT_CONFIG)]);
  if(mode==='hashes'){
    console.log(JSON.stringify(queue.items.map(i=>({id:i.id,expectedCaptionSha256:sha(i.caption),
      expectedMediaSha256:i.expectedSha256})),null,2));return;
  }
  if(mode==='test-plan'){
    const state={schemaVersion:1,entries:{}};
    const plan=createPlan(queue,lock,base,state);
    await save('plan.json',plan);
    console.log(JSON.stringify({status:plan.status,reason:plan.reason,candidate:plan.candidate?.id??null}));
    return;
  }
  const statePath=await ledgerAt();
  const state=await read(statePath);
  if(mode==='plan'){
    const plan=createPlan(queue,lock,base,state);
    await save('plan.json',plan);
    if(process.env.GITHUB_OUTPUT){
      await fs.appendFile(process.env.GITHUB_OUTPUT,'ready='+(plan.status==='ready'?'true':'false')+'\n');
    }
    console.log(JSON.stringify({status:plan.status,reason:plan.reason,candidate:plan.candidate?.id??null}));
    return;
  }
  const plan=await loadPlan();
  ensure(plan.status==='ready','no_approved_plan');
  // Re-evaluate current lock and manifest. Stale state or approvals must never publish.
  const current=validateQueue(queue,lock,base);
  const currentCandidate=queue.items.find(item=>item.id===plan.ledgerEntryId);
  ensure(current.status==='candidate' && currentCandidate &&
    current.checks.find(c=>c.id===plan.ledgerEntryId)?.approved===true &&
    documentHash(currentCandidate)===plan.documentHash &&
    plan.expectedMediaSha256===currentCandidate.expectedSha256,
    'approval_drift_or_publication_lock');
  if(mode==='preflight'||mode==='reserve'){
    ensure(!Object.hasOwn(state.entries,plan.ledgerEntryId),'already_reserved_or_published');
  }
  if(mode==='preflight'){
    const result=await remotePreflight(plan);
    await save('preflight.json',result);
    console.log(JSON.stringify({status:'verified',creativeId:plan.ledgerEntryId,mediaSha256:result.mediaSha256}));
  }else if(mode==='reserve'){
    const pre=await read(path.join(OUT,'preflight.json'));
    ensure(pre.ready===true && pre.mediaSha256===plan.expectedMediaSha256,'media_preflight_missing');
    reserve(state,plan);
    await fs.writeFile(statePath,JSON.stringify(state,null,2)+'\n');
    console.log(JSON.stringify({status:'reserved',id:plan.ledgerEntryId}));
  }else if(mode==='publish'){
    const receipt=await providerPublish(plan,state);
    await save('receipt.json',receipt);
    console.log(JSON.stringify({result:receipt.result,creativeId:receipt.creativeId,
      providerStatus:receipt.providerStatus??null,publicPostUrl:receipt.publicPostUrl??null}));
    if(receipt.result!=='provider_accepted')process.exitCode=1;
  }else if(mode==='settle'){
    const receipt=await read(path.join(OUT,'receipt.json'));
    settle(state,plan,receipt);
    await fs.writeFile(statePath,JSON.stringify(state,null,2)+'\n');
    console.log(JSON.stringify({status:state.entries[plan.ledgerEntryId].status,id:plan.ledgerEntryId}));
  }else{throw Error('unsupported_mode')}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('TikTok autopost blocked: '+e.message);process.exitCode=1});
