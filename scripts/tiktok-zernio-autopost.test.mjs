import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {createPlan,validateQueue,mediaUrl,documentHash,payloadFor,reserve,settle,inspectCreator,
  remotePreflight,providerPublish} from './tiktok-zernio-autopost.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const account={id:'6ac41ebe5450b4ad42dec37e',username:'prismbayclean',platform:'tiktok'};
const state=()=>({schemaVersion:1,entries:{}});
const copy=x=>JSON.parse(JSON.stringify(x));
const paths={queue:'config/tiktok-approved-autopost.json',lock:'config/tiktok-publish-lock.json'};
const queue=JSON.parse(await fs.readFile(paths.queue,'utf8'));
const lock={locked:true}; // Locked fixture; real activation may legitimately unlock main.
const base={account};
const t=new Date('2026-10-25T10:00:00Z');
function enabled(){
  const q=copy(queue);
  q.enabled=true;
  const a=q.items[0].approval;
  for(const key of ['ownerApproved','rightsVerified','destinationVerified','accountAudienceFitApproved','contentPreviewConfirmed','expressConsentGiven'])a[key]=true;
  a.approvedMediaSha256=q.items[0].expectedSha256;
  a.approvedCaptionSha256=sha(q.items[0].caption);
  a.approvedAt='2026-10-25T09:00:00Z';
  a.expiresAt='2026-11-01T09:00:00Z';
  a.approvalRecordUrl='https://github.com/ragunauthramsaroop/PrismBay/pull/456';
  return q;
}
const unlocked={locked:false};

test('disabled queue and locked policy always block posting',()=>{
  const disabled=copy(queue); disabled.enabled=false;
  assert.equal(lock.locked,true);
  assert.equal(validateQueue(disabled,lock,base,t).reason,'existing_creative_publication_lock');
  assert.equal(createPlan(disabled,lock,base,state(),t).status,'blocked');
  assert.equal(createPlan(disabled,unlocked,base,state(),t).status,'blocked');
});
test('lock cannot be overridden by queue enabled and owner flags',()=>{
  const q=enabled();
  assert.equal(createPlan(q,lock,base,state(),t).status,'blocked');
  assert.equal(createPlan({...q,enabled:false},unlocked,base,state(),t).status,'blocked');
});
test('exact video/hash/caption, rights, identity and time approval are mandatory',()=>{
  const q=enabled();
  const p=createPlan(q,unlocked,base,state(),t);
  assert.equal(p.status,'ready');
  assert.equal(p.ledgerEntryId,q.items[0].id);
  for(const key of ['ownerApproved','rightsVerified','destinationVerified','accountAudienceFitApproved','contentPreviewConfirmed','expressConsentGiven']){
    const broken=copy(q);broken.items[0].approval[key]=false;
    assert.equal(createPlan(broken,unlocked,base,state(),t).status,'blocked',key);
  }
  for(const key of ['approvedMediaSha256','approvedCaptionSha256','expiresAt','approvedAt','approvalRecordUrl']){
    const broken=copy(q);broken.items[0].approval[key]='bad';
    assert.equal(createPlan(broken,unlocked,base,state(),t).status,'blocked',key);
  }
  const future=copy(q);future.items[0].approval.approvedAt='2026-10-26T00:00:00Z';
  assert.equal(createPlan(future,unlocked,base,state(),t).status,'blocked');
});
test('product source price, caption disclaimer and protected account cannot be swapped',()=>{
  const q=enabled();
  const changed=copy(q);changed.items[1].priceUsd=42;
  assert.throws(()=>createPlan(changed,unlocked,base,state(),t),/unverified_price/);
  const caption=copy(q);caption.items[0].caption='Make guaranteed income with this tool '+caption.items[0].landingUrl;
  assert.throws(()=>createPlan(caption,unlocked,base,state(),t),/unsupported_viral_claim/);
  assert.throws(()=>createPlan(q,unlocked,{account:{...account,id:'wrong'}},state(),t),/unauthorized_account/);
  assert.match(mediaUrl(q.items[0]),/^https:\/\/clean\.prismbayai\.com\/media\/tiktok\/approved\//);
});
test('an approved creative is atomically reserved in the long-lived ledger and never automatically retried',()=>{
  const q=enabled();
  const led=state();
  const plan=createPlan(q,unlocked,base,led,t);
  reserve(led,plan,'2026-10-25T10:00:00.000Z');
  assert.equal(led.entries[plan.ledgerEntryId].status,'reserved_before_provider_call');
  assert.equal(createPlan(q,unlocked,base,led,t).status,'blocked');
  assert.throws(()=>reserve(led,plan),/already_reserved_or_published/);
  settle(led,plan,{result:'provider_accepted',providerPostId:'post123',providerStatus:'publishing'},'2026-10-25T10:05:00Z');
  assert.equal(led.entries[plan.ledgerEntryId].status,'submitted_unverified');
  assert.equal(createPlan(q,unlocked,base,led,t).status,'blocked');
});
test('provider uncertainty is never reported as a verified TikTok post',()=>{
  const plan=createPlan(enabled(),unlocked,base,state(),t);
  const led=reserve(state(),plan);
  settle(led,plan,{result:'uncertain_manual_reconciliation'});
  assert.equal(led.entries[plan.ledgerEntryId].status,'manual_reconciliation_required');
  assert.equal(led.entries[plan.ledgerEntryId].publicPostUrl,null);
});
test('only one TikTok own-brand video is addressed in exact provider payload',()=>{
  const plan=createPlan(enabled(),unlocked,base,state(),t);
  const p=payloadFor(plan);
  assert.equal(p.platforms.length,1);
  assert.equal(p.platforms[0].platform,'tiktok');
  assert.equal(p.platforms[0].accountId,account.id);
  assert.equal(p.isDraft,false);
  assert.equal(p.publishNow,true);
  assert.equal(p.tiktokSettings.commercialContentType,'brand_organic');
  assert.equal(p.tiktokSettings.expressConsentGiven,true);
  assert.equal(p.tiktokSettings.contentPreviewConfirmed,true);
  assert.equal(p.mediaItems[0].url,mediaUrl(plan.candidate));
  assert.equal(p.metadata.prismbayAutoPostId,plan.ledgerEntryId);
});
test('creator info must permit public TikTok posting and own-brand commercial disclosure',()=>{
  const info={creator:{canPostMore:true},privacyLevels:[{value:'PUBLIC_TO_EVERYONE'}],
    commercialContentTypes:[{value:'brand_organic'}],postingLimits:{maxVideoDurationSec:600}};
  assert.equal(inspectCreator(info).ready,true);
  assert.equal(inspectCreator({...info,creator:{canPostMore:false}}).ready,false);
  assert.equal(inspectCreator({...info,commercialContentTypes:[]}).ready,false);
  assert.equal(inspectCreator({...info,privacyLevels:[{value:'SELF_ONLY'}]}).ready,false);
});
test('remote preflight verifies exact public MP4 SHA256 with read-only requests',async()=>{
  const q=enabled();
  const bytes=Buffer.alloc(90000,11);
  q.items[0].expectedSha256=sha(bytes);
  q.items[0].approval.approvedMediaSha256=sha(bytes);
  const p=createPlan(q,unlocked,base,state(),t);
  const calls=[];
  const readOnly=async(url,options)=>{
    calls.push({url,method:options.method});
    assert.equal(options.method,'GET');
    if(url.endsWith('/accounts'))return {ok:true,json:async()=>({data:{accounts:[account]}})};
    if(url.includes('/creator-info'))return {ok:true,json:async()=>({data:{creator:{canPostMore:true},privacyLevels:[{value:'PUBLIC_TO_EVERYONE'}],
      commercialContentTypes:[{value:'brand_organic'}],postingLimits:{maxVideoDurationSec:600}}})};
    if(url===p.expectedMediaUrl)return {ok:true,status:200,headers:{get:()=> 'video/mp4'},arrayBuffer:async()=>bytes};
    throw Error('unexpected_fetch');
  };
  const res=await remotePreflight(p,{env:{ZERNIO_API_KEY:'fixture-key'},fetchImpl:readOnly});
  assert.equal(res.ready,true);
  assert.equal(calls.length,3);
  assert.equal(res.mediaSha256,sha(bytes));
  const bad=async(url,opts)=>{
    if(url===p.expectedMediaUrl)return {ok:true,status:200,headers:{get:()=> 'video/mp4'},arrayBuffer:async()=>Buffer.alloc(90000,12)};
    return readOnly(url,opts);
  };
  await assert.rejects(()=>remotePreflight(p,{env:{ZERNIO_API_KEY:'fixture-key'},fetchImpl:bad}),/digest_mismatch/);
});
test('one provider request requires durable exact reservation, uses idempotency and fails closed',async()=>{
  const plan=createPlan(enabled(),unlocked,base,state(),t);
  await assert.rejects(()=>providerPublish(plan,state(),{env:{ZERNIO_API_KEY:'fixture-key'},fetchImpl:async()=>{throw Error('should not call')}}),/durable_reservation/);
  const led=reserve(state(),plan);
  let sends=0;
  const fetchImpl=async(url,opts)=>{
    assert.equal(url,'https://zernio.com/api/v1/posts');
    assert.equal(opts.method,'POST');
    assert.ok(opts.headers['Idempotency-Key']);
    assert.ok(opts.headers['X-Request-Id']);
    sends++;
    const data=JSON.parse(opts.body);
    assert.equal(data.metadata.prismbayAutoPostId,plan.ledgerEntryId);
    return {status:201,ok:true,json:async()=>({post:{_id:'provider-item',status:'publishing',
      platforms:[{platform:'tiktok',status:'pending',platformPostUrl:null}]}})};
  };
  const result=await providerPublish(plan,led,{env:{ZERNIO_API_KEY:'fixture-key'},fetchImpl});
  assert.equal(sends,1);
  assert.equal(result.result,'provider_accepted');
  assert.equal(result.publicPostUrl,null);
  const fail=await providerPublish(plan,led,{env:{ZERNIO_API_KEY:'fixture-key'},fetchImpl:async()=>{throw Error('network timeout')}});
  assert.equal(fail.result,'uncertain_manual_reconciliation');
});

// Daily audit must never trigger a provider submission.
test('daily audit is not an automatic publish event', async () => {
  const workflow=await fs.readFile('.github/workflows/prismbay-tiktok-autopost.yml','utf8');
  assert.ok(workflow.includes("cron: '45 13 * * *'"));
  assert.ok(workflow.includes("cron: '13 14 * * 1,3,5'"));
  assert.ok(workflow.includes("github.event_name == 'schedule' && github.event.schedule == '13 14 * * 1,3,5'"));
  assert.ok(!workflow.includes("github.event_name == 'schedule' ||"));
});
