// Generate reviewed, original organic marketing copy; no connected-account publication.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';
import { GUIDES, ORIGIN } from './digital-growth-pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHANNELS = ['linkedin','facebook','pinterest','threads'];
export const CHANNELS_SUPPORTED=Object.freeze(CHANNELS);
export const ONE_CLAIM='Existing digital templates, not hosted software, bespoke consulting or a guaranteed business outcome.';

export function isoWeekDay(value) {
  const d=new Date(value);
  if (!Number.isFinite(d.getTime()))throw Error('invalid_date');
  return d.toISOString().slice(0,10);
}
export function taggedGuide(g, channel, angle, date) {
  if(!CHANNELS.includes(channel))throw Error('invalid_channel');
  const url=new URL(ORIGIN+'/digital/guides/'+g.slug+'.html');
  url.searchParams.set('utm_source',channel);
  url.searchParams.set('utm_medium','organic_social');
  url.searchParams.set('utm_campaign','prismbay_digital_resources_'+date.replaceAll('-',''));
  url.searchParams.set('utm_content',g.offerSlug+'_'+angle);
  return url.toString();
}
function textFor(g,offer,angle,channel,link) {
  const method=g.method;
  const examples=angle==='problem'
    ? g.h1+' '+method[0][1]+' '+method[1][1]
    : 'A practical checklist for '+offer.audience.toLowerCase()+': '+method.slice(0,3).map((step,index)=>(index+1)+'. '+step[0]+'.').join(' ');
  const free='Free original CSV and how-to: '+link;
  const optional='Optional editable '+offer.name+' package: $'+offer.priceUsd+' USD, one time. ';
  const disclaimer='PrismBay own-brand resource. No guaranteed outcomes.';
  if(channel==='pinterest') return (g.title+' | '+examples+' '+free+' '+optional+disclaimer).slice(0,490);
  if(channel==='threads') return (examples+' '+free+' '+optional+'PrismBay own-brand resource.').slice(0,480);
  if(channel==='facebook') return examples+'\n\n'+free+'\n\n'+optional+'\n'+disclaimer;
  return examples+'\n\nUseful fields to verify: '+g.columns.slice(0,4).join(', ')+'.\n\n'+free+'\n\n'+optional+disclaimer;
}
export function buildCampaign(date='2026-10-24'){
  date=isoWeekDay(date);
  const offers=new Map(ACTIVE_DIGITAL_OFFERS.map(x=>[x.slug,x]));
  const posts=[];
  for(const g of GUIDES){
    const offer=offers.get(g.offerSlug);
    if(!offer)throw Error('unverified_promotion_'+g.offerSlug);
    for(const channel of CHANNELS){
      for(const angle of ['problem','checklist']){
        const link=taggedGuide(g,channel,angle,date);
        const caption=textFor(g,offer,angle,channel,link);
        posts.push({
          id:g.offerSlug+'-'+channel+'-'+angle+'-'+date,
          platform:channel,angle,
          status:'draft_requires_channel_approval',
          socialPostPublished:false,
          mediaRendered:false,
          paidAdPurchased:false,
          destinationUrl:link,
          content:caption,
          originalOffer:offer.name,
          priceUsd:offer.priceUsd,
          proposedDistribution:'Own-brand organic social only. Avoid unsolicited private messages and spam.',
          existingMediaCandidate:ORIGIN+'/media/social/'+offer.slug+'.mp4',
          mediaVerified:false,
          licenseReviewRequired:true,
          claims:[ONE_CLAIM],
          safety:{noUnverifiedSale:true,noSyntheticTestimonial:true,noInventedViews:true,noGuaranteedOutcome:true}
        });
      }
    }
  }
  return {
    schemaVersion:1,
    runDate:date,
    campaign:'prismbay_digital_resources_'+date.replaceAll('-',''),
    publisher:'Not connected. No automatic social posting.',
    actualPostsPublished:0,
    actualPaidSalesVerified:0,
    target:'Qualified clicks to free original worksheets and existing licensed paid products',
    productsAdvertised:ACTIVE_DIGITAL_OFFERS.map(o=>({slug:o.slug,priceUsd:o.priceUsd,checkout:'existing_only'})),
    prototypeProductsExcluded:true,
    items:posts
  };
}
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
export function campaignCsv(data){
  return [
    ['id','platform','offer','price_usd','caption','destination_url','status'],
    ...data.items.map(x=>[x.id,x.platform,x.originalOffer,x.priceUsd,x.content,x.destinationUrl,x.status])
  ].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export async function writeCampaign(target=path.join(ROOT,'growth-reports/digital-organic-marketing'),date=new Date().toISOString()) {
  const campaign=buildCampaign(date);
  await fs.mkdir(target,{recursive:true});
  await fs.writeFile(path.join(target,'editorial-queue.json'),JSON.stringify(campaign,null,2)+'\n');
  await fs.writeFile(path.join(target,'editorial-queue.csv'),campaignCsv(campaign));
  await fs.writeFile(path.join(target,'README.md'),[
    '# PrismBay Digital Organic Distribution',
    '',
    'Run date: '+campaign.runDate,
    '',
    'The queue contains '+campaign.items.length+' original social-post drafts for LinkedIn, Facebook, Pinterest and Threads.',
    'Posts promote four existing documented digital offers and link to original free landing-page resources.',
    'All links include source, medium, campaign and content tracking parameters.',
    '',
    'Before publishing:',
    '1. Confirm the destination URL responds successfully and the specific media candidate exists.',
    '2. Read the full post for accuracy, brand suitability, consumer disclosure, current price and platform rules.',
    '3. Confirm account control and business-profile publishing permissions. Reconcile against the existing posting queue to avoid duplicates.',
    '4. Publish through the authorized platform flow only. Record the external post URL and timestamp.',
    '5. Measure validated page visits, qualified checkout starts, verified paid orders, refunds and margin. Never infer sales from drafts.',
    '',
    'This worker never sends messages, triggers paid advertisements, invokes platform APIs, or updates Stripe.',
    'Ten development prototypes remain excluded from all paid promotion.',
    ''
  ].join('\n'));
  return {files:['editorial-queue.json','editorial-queue.csv','README.md'],count:campaign.items.length,path:target};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await writeCampaign()));
}
