import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';
import { deterministicSalesPlan } from './freellm-sales-worker.mjs';
import { VERIFIED_PHYSICAL_OFFERS, trackedUrl, scenesForOffer, buildQueue, verifyProbe } from './external-traffic-worker.mjs';

test('external traffic queue covers verified digital offers and guarded steamer on YouTube and TikTok',()=>{
  const plans={};
  for(const offer of ACTIVE_DIGITAL_OFFERS) plans[offer.slug]=deterministicSalesPlan(offer,{guideUrl:offer.guide,checkoutUrl:offer.checkout});
  plans['garment-steamer']={llmStrategy:'guarded_physical_preflight'};
  const offers=[...ACTIVE_DIGITAL_OFFERS,...VERIFIED_PHYSICAL_OFFERS];
  const q=buildQueue({offers,plans,generatedAt:'2026-10-01T00:00:00.000Z'});
  assert.equal(q.items.length,offers.length*2);
  assert.deepEqual([...new Set(q.items.map(x=>x.channel))].sort(),['tiktok','youtube']);
  assert.deepEqual([...new Set(q.items.filter(x=>x.offerType==='digital').map(x=>x.offer))].sort(),ACTIVE_DIGITAL_OFFERS.map(x=>x.slug).sort());
  for(const item of q.items){
    assert.equal(item.status,'ready_for_authorized_scheduler');
    assert.match(item.mediaUrl,/ragunauthramsaroop\.github\.io\/PrismBay\/media\/social\/.+\.mp4$/);
    assert.ok(!/guaranteed|best seller|limited stock|verified customer/i.test(item.caption));
    assert.doesNotMatch(item.destinationUrl,/undefined/);
  }
  const physical=q.items.filter(x=>x.offer==='garment-steamer');
  assert.equal(physical.length,2);
  for(const item of physical){
    assert.equal(item.offerType,'physical');
    assert.match(item.destinationUrl,new RegExp('browser-worker-production-f5b4\\.up\\.railway\\.app/garment-steamer/'+item.channel+'/'));
    assert.match(item.destinationUrl,/utm_campaign=prismbay_clean_steamer_oct2026/);
    assert.doesNotMatch(item.destinationUrl,/buy\.stripe\.com/);
    assert.equal(item.guardrails.directStripe,false);
    assert.equal(item.guardrails.zipPreflightRequired,true);
    assert.equal(item.guardrails.exactPriceUsd,29.95);
  }
});
test('tracking separates YouTube and TikTok traffic for digital and physical campaigns',()=>{
  const digital=ACTIVE_DIGITAL_OFFERS[0];
  const physical=VERIFIED_PHYSICAL_OFFERS[0];
  const y=new URL(trackedUrl(digital,'youtube'));
  const py=new URL(trackedUrl(physical,'youtube'));
  const t=new URL(trackedUrl(physical,'tiktok'));
  assert.equal(y.searchParams.get('utm_source'),'youtube');
  assert.equal(y.searchParams.get('utm_medium'),'shorts');
  assert.equal(py.pathname,'/garment-steamer/youtube/');
  assert.equal(py.searchParams.get('utm_source'),'youtube');
  assert.equal(t.pathname,'/garment-steamer/tiktok/');
  assert.equal(t.searchParams.get('utm_source'),'tiktok');
  assert.equal(t.searchParams.get('utm_medium'),'organic_video');
  assert.equal(t.searchParams.get('utm_campaign'),'prismbay_clean_steamer_oct2026');
});
test('bundle traffic maps to a real comparison page',()=>{
  const bundle=ACTIVE_DIGITAL_OFFERS.find(x=>x.slug==='bundle');
  assert.ok(bundle);
  const u=new URL(trackedUrl(bundle,'youtube'));
  assert.match(u.pathname,/\/PrismBay\/toolkits\.html$/);
});
test('digital video scenes use exact offer price and safe educational copy',()=>{
  const offer=ACTIVE_DIGITAL_OFFERS[1];
  const plan=deterministicSalesPlan(offer,{guideUrl:offer.guide,checkoutUrl:offer.checkout});
  const scenes=scenesForOffer(offer,plan);
  assert.equal(scenes.length,4);
  assert.match(JSON.stringify(scenes),/\$99 USD one time/);
  assert.doesNotMatch(JSON.stringify(scenes),/guaranteed|customer testimonial|limited time/i);
});
test('steamer video scenes require ZIP preflight and never promise availability',()=>{
  const offer=VERIFIED_PHYSICAL_OFFERS[0];
  const scenes=scenesForOffer(offer,{});
  const text=JSON.stringify(scenes);
  assert.equal(scenes.length,4);
  assert.match(text,/USD 29\.95/);
  assert.match(text,/5-digit U\.S\. ZIP/);
  assert.match(text,/stock and destination shipping are checked live/);
  assert.doesNotMatch(text,/guaranteed|in stock now|fast delivery|best seller|customer testimonial/i);
});
test('media QA enforces vertical silent H264 output',()=>{
  const good={streams:[{codec_type:'video',width:1080,height:1920,codec_name:'h264',pix_fmt:'yuv420p'}],format:{duration:20,size:500000}};
  assert.equal(verifyProbe(good).durationSeconds,20);
  assert.throws(()=>verifyProbe({...good,streams:[{...good.streams[0],width:720}]}));
  assert.throws(()=>verifyProbe({...good,streams:[...good.streams,{codec_type:'audio'}]}));
});
