import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GUIDE_PATHS, GUIDES, ORIGIN, htmlFor, csv, buildGuides } from './digital-growth-pages.mjs';
import { CHANNELS_SUPPORTED, buildCampaign, campaignCsv, taggedGuide, writeCampaign } from './digital-organic-campaign.mjs';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

test('four substantial free pages promote only documented offers',()=>{
  assert.equal(GUIDES.length,4);
  assert.equal(GUIDE_PATHS.length,4);
  assert.equal(new Set(GUIDES.map(x=>x.slug)).size,4);
  const offerIds=new Set(ACTIVE_DIGITAL_OFFERS.map(x=>x.slug));
  for(const g of GUIDES){
    assert.ok(offerIds.has(g.offerSlug));
    assert.equal(g.method.length,5);
    assert.ok(g.questions.length>=3);
    assert.equal(g.columns.length,g.example.length);
    const html=htmlFor(g);
    assert.match(html,/<link rel="canonical"/);
    assert.match(html,/<meta name="description"/);
    assert.match(html,/<meta property="og:title"/);
    assert.match(html,/<meta name="robots" content="index,follow/);
    assert.match(html,/<h1>/);
    assert.match(html,/Download example CSV/);
    assert.match(html,/No data is uploaded/);
    assert.match(html,/https:\/\/buy\.stripe\.com\//);
    assert.match(html,/client_reference_id=resource_/);
    assert.match(html,/Frequently asked questions/);
    assert.doesNotMatch(html,/guaranteed (profit|income|sales)|customer testimonial|only today|limited stock/i);
    assert.ok(html.includes(ORIGIN+GUIDE_PATHS.find(p=>p.includes(g.slug))));
  }
});

test('four free guide pages create as independent static HTML',async()=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'prismbay-marketing-'));
  try{
    const paths=await buildGuides(tmp);
    assert.equal(paths.length,4);
    for(const p of paths){
      const html=await fs.readFile(p,'utf8');
      assert.match(html,/<script type="application\/ld\+json">/);
      assert.match(html,/<details>/);
      assert.match(html,/download-status/);
    }
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
});

test('CSV safely quotes commas, quotes and line breaks',()=>{
  assert.equal(csv([['a,b','a"b'],['line\nbreak','fine']]),'"a,b","a""b"\r\n"line\nbreak","fine"\r\n');
});

test('campaign has 32 unique draft-only posts with trackable links',()=>{
  const c=buildCampaign('2026-10-24');
  assert.equal(c.items.length,32);
  assert.equal(c.prototypeProductsExcluded,true);
  assert.equal(c.actualPostsPublished,0);
  assert.equal(c.actualPaidSalesVerified,0);
  assert.equal(new Set(c.items.map(x=>x.id)).size,32);
  assert.deepEqual([...new Set(c.items.map(x=>x.platform))].sort(),[...CHANNELS_SUPPORTED].sort());
  for(const x of c.items){
    assert.equal(x.status,'draft_requires_channel_approval');
    assert.equal(x.socialPostPublished,false);
    assert.equal(x.paidAdPurchased,false);
    assert.equal(x.mediaVerified,false);
    assert.ok(x.content.length>100);
    assert.ok(x.content.includes(x.destinationUrl));
    assert.match(x.content,/PrismBay/);
    const u=new URL(x.destinationUrl);
    assert.equal(u.hostname,'clean.prismbayai.com');
    assert.equal(u.searchParams.get('utm_source'),x.platform);
    assert.equal(u.searchParams.get('utm_medium'),'organic_social');
    assert.ok(u.searchParams.get('utm_campaign'));
    assert.ok(u.searchParams.get('utm_content'));
    assert.ok(!/guaranteed income|proven customer result|limited time only|sold out soon/i.test(x.content));
  }
  assert.ok(campaignCsv(c).includes('destination_url'));
});

test('external social tracking rejects unsupported channel and date',()=>{
  assert.throws(()=>taggedGuide(GUIDES[0],'spam','problem','2026-10-24'),/invalid_channel/);
  assert.throws(()=>buildCampaign('broken'),/invalid_date/);
});

test('marketing copy packages generate without posting',async()=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'prismbay-editorial-'));
  try{
    const out=await writeCampaign(tmp,'2026-10-24');
    assert.equal(out.count,32);
    const report=JSON.parse(await fs.readFile(path.join(tmp,'editorial-queue.json'),'utf8'));
    assert.equal(report.items.length,32);
    assert.equal(report.actualPostsPublished,0);
    assert.equal(report.publisher,'Not connected. No automatic social posting.');
    assert.ok((await fs.readFile(path.join(tmp,'editorial-queue.csv'),'utf8')).length>5000);
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
