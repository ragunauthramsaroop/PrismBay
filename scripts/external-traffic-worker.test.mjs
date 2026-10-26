import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';
import { deterministicSalesPlan } from './freellm-sales-worker.mjs';
import { VERIFIED_PHYSICAL_OFFERS, trackedUrl, scenesForOffer, buildQueue, verifyProbe } from './external-traffic-worker.mjs';

const UNVERIFIED_STEAMER={
  kind:'physical',slug:'garment-steamer',name:'Portable Garment Steamer',
  priceUsd:29.95,destinationUrl:'https://example.com/garment-steamer/',
};

test('external traffic queue contains only digital offers and excludes injected physical candidates',()=>{
  const plans={};
  for(const offer of ACTIVE_DIGITAL_OFFERS)
    plans[offer.slug]=deterministicSalesPlan(offer,{guideUrl:offer.guide,checkoutUrl:offer.checkout});
  const q=buildQueue({offers:[...ACTIVE_DIGITAL_OFFERS,UNVERIFIED_STEAMER],plans,generatedAt:'2026-10-26T00:00:00.000Z'});
  assert.equal(VERIFIED_PHYSICAL_OFFERS.length,0);
  assert.equal(q.blockedPhysicalCount,1);
  assert.equal(q.items.length,ACTIVE_DIGITAL_OFFERS.length*2);
  assert.deepEqual([...new Set(q.items.map(x=>x.channel))].sort(),['tiktok','youtube']);
  assert.deepEqual([...new Set(q.items.map(x=>x.offer))].sort(),ACTIVE_DIGITAL_OFFERS.map(x=>x.slug).sort());
  for(const item of q.items){
    assert.equal(item.offerType,'digital');
    assert.equal(item.status,'ready_for_authorized_scheduler');
    assert.match(item.mediaUrl,/ragunauthramsaroop\\.github\\.io\\/PrismBay\\/media\\/social\\/.+\\.mp4$/);
    assert.doesNotMatch(JSON.stringify(item),/garment-steamer|prismbay_clean_steamer|buyer.zip/i);
    assert.ok(!/guaranteed|best seller|limited stock|verified customer/i.test(item.caption));
    assert.doesNotMatch(item.destinationUrl,/undefined/);
  }
});

test('physical retail cannot enter tracking, video scenes or public channel queues',()=>{
  assert.throws(()=>trackedUrl(UNVERIFIED_STEAMER,'youtube'),/physical_retail_promotion_locked/);
  assert.throws(()=>trackedUrl(UNVERIFIED_STEAMER,'tiktok'),/physical_retail_promotion_locked/);
  assert.throws(()=>scenesForOffer(UNVERIFIED_STEAMER,{}),/physical_retail_promotion_locked/);
  const q=buildQueue({offers:[UNVERIFIED_STEAMER],plans:{}});
  assert.equal(q.items.length,0);
  assert.equal(q.blockedPhysicalCount,1);
});

test('tracking separates educational digital YouTube and digital TikTok routes',()=>{
  const digital=ACTIVE_DIGITAL_OFFERS[0];
  const y=new URL(trackedUrl(digital,'youtube'));
  const t=new URL(trackedUrl(digital,'tiktok'));
  assert.equal(y.searchParams.get('utm_source'),'youtube');
  assert.equal(y.searchParams.get('utm_medium'),'shorts');
  assert.equal(t.searchParams.get('utm_source'),'tiktok');
  assert.equal(t.searchParams.get('utm_medium'),'organic_video');
  assert.equal(y.searchParams.get('utm_campaign'),'prismbay_external_traffic_oct2026');
  assert.equal(t.searchParams.get('utm_campaign'),'prismbay_external_traffic_oct2026');
});

test('bundle traffic maps to the existing digital comparison page',()=>{
  const bundle=ACTIVE_DIGITAL_OFFERS.find(x=>x.slug==='bundle');
  assert.ok(bundle);
  const u=new URL(trackedUrl(bundle,'youtube'));
  assert.match(u.pathname,/\\/PrismBay\\/toolkits\\.html$/);
});

test('digital video scenes use exact offer price and educational copy',()=>{
  const offer=ACTIVE_DIGITAL_OFFERS[1];
  const plan=deterministicSalesPlan(offer,{guideUrl:offer.guide,checkoutUrl:offer.checkout});
  const scenes=scenesForOffer(offer,plan);
  assert.equal(scenes.length,4);
  assert.match(JSON.stringify(scenes),/\\$99 USD one time/);
  assert.doesNotMatch(JSON.stringify(scenes),/guaranteed|customer testimonial|limited time/i);
});

test('media QA enforces vertical silent H264 output',()=>{
  const good={streams:[{codec_type:'video',width:1080,height:1920,codec_name:'h264',pix_fmt:'yuv420p'}],format:{duration:20,size:500000}};
  assert.equal(verifyProbe(good).durationSeconds,20);
  assert.throws(()=>verifyProbe({...good,streams:[{...good.streams[0],width:720}]}));
  assert.throws(()=>verifyProbe({...good,streams:[...good.streams,{codec_type:'audio'}]}));
});
