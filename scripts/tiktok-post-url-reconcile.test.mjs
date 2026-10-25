import test from 'node:test';
import assert from 'node:assert/strict';
import {publicTikTokUrl,eligibleEntries,updateFromProvider,reconcile} from './tiktok-post-url-reconcile.mjs';
const id='6ade25692568cd6f5d497b7a';
const ledger=()=>({schemaVersion:1,entries:{example:{id:'pb-stakeholder-toolkit-202610',
  status:'submitted_unverified',account:'prismbayclean',providerPostId:id,publicPostUrl:null}}});
test('only verified handle + video numeric identifiers are accepted',()=>{
  assert.equal(publicTikTokUrl('https://www.tiktok.com/@prismbayclean/video/7612345678901234567?share=1'),
    'https://www.tiktok.com/@prismbayclean/video/7612345678901234567');
  assert.equal(publicTikTokUrl('https://evil.example/@prismbayclean/video/7612345678901234567'),null);
  assert.equal(publicTikTokUrl('https://www.tiktok.com/@other/video/7612345678901234567'),null);
  assert.equal(publicTikTokUrl('https://www.tiktok.com/@prismbayclean/video/abc'),null);
});
test('only exact previously submitted creative and provider ID are checked',()=>{
  const l=ledger(); assert.equal(eligibleEntries(l).length,1);
  l.entries.example.status='reserved_before_provider_call';
  assert.equal(eligibleEntries(l).length,0);
});
test('does not confuse provider published status with public URL resolved',()=>{
  const l=ledger();
  const noUrl={post:{_id:id,status:'published',platforms:[{platform:'tiktok',status:'published',platformPostUrl:null}]}};
  assert.equal(updateFromProvider(l,id,noUrl),null);
  assert.equal(l.entries.example.publicPostUrl,null);
});
test('Zernio reported URL is saved, but no posting is attempted',async()=>{
  const l=ledger();let count=0;
  const fetchImpl=async(url,opts)=>{
    assert.equal(opts.method,'GET');
    assert.equal(url,'https://zernio.com/api/v1/posts/'+id);
    count++;
    return {ok:true,json:async()=>({post:{_id:id,status:'published',platforms:[{
      platform:'tiktok',accountId:'6ac41ebe5450b4ad42dec37e',
      status:'published',platformPostUrl:'https://www.tiktok.com/@prismbayclean/video/7612345678901234567'}]}})};
  };
  const r=await reconcile(l,{env:{ZERNIO_API_KEY:'dummy'},fetchImpl});
  assert.equal(count,1);
  assert.equal(r.resolved.length,1);
  assert.equal(r.submissionAttempted,false);
  assert.equal(l.entries.example.publicPostUrl,'https://www.tiktok.com/@prismbayclean/video/7612345678901234567');
});
test('missing account key prevents provider requests',async()=>{
  let called=false;
  const r=await reconcile(ledger(),{env:{},fetchImpl:async()=>{called=true;}});
  assert.equal(called,false);
  assert.equal(r.errorCodes[0],'missing_ZERNIO_API_KEY');
});
