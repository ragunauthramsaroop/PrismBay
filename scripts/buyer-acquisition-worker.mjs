import fs from 'node:fs/promises';
import { campaignForSlot, currentSixHourSlot, ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

const now = Date.now();
const campaign = campaignForSlot(currentSixHourSlot(now));
const timeout = ms => AbortSignal.timeout(ms);

async function inspect(url) {
  const r = await fetch(url, {redirect:'follow',signal:timeout(12000),headers:{'user-agent':'PrismBay-Buyer-Acquisition/1.0'}});
  const body = await r.text();
  return {ok:r.ok,status:r.status,finalUrl:r.url,body};
}
const offer = ACTIVE_DIGITAL_OFFERS.find(x=>x.slug===campaign.offer.slug);
if(!offer) throw new Error('campaign_offer_not_found');
const guide = await inspect(offer.guide);
if(!guide.ok) throw new Error('guide_http_'+guide.status);
for(const required of [offer.checkout.split('/').at(-1),'$'+offer.priceUsd,'www.prismbayai.com/refunds','<h1>']){
  if(!guide.body.includes(required)) throw new Error('guide_missing_'+required);
}
const checkout = await inspect(offer.checkout);
if(!checkout.ok) throw new Error('checkout_http_'+checkout.status);
const report = {
  schemaVersion:1,
  generatedAt:new Date(now).toISOString(),
  priority:'buyer_acquisition_to_existing_checkout',
  campaign,
  liveProof:{
    guide:{url:offer.guide,httpStatus:guide.status,containsMatchingCheckout:true,containsExactPrice:true},
    checkout:{url:offer.checkout,httpStatus:checkout.status,finalUrl:checkout.finalUrl}
  },
  nextDistributionAssets:{
    retailChannelDraft: campaign.editorialDraft + '\n\nFree guide: ' + campaign.guideUrl + '\nCheckout: ' + campaign.checkoutUrl,
    originalVideoBrief: campaign.videoBrief,
    educationalYouTubeAllowed: false,
    personalLinkedInAllowed: false,
    retailPublishingApprovalRequired: true
  },
  commercialTruth:{
    paymentObserved:false,
    claim:'This run validates a live buyer path and creates truthful distribution assets. It does not prove a customer, sale, payment, delivery or profit.'
  }
};
await fs.mkdir('growth-reports',{recursive:true});
await fs.writeFile('growth-reports/buyer-acquisition-latest.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('growth-reports/buyer-acquisition-latest.md',[
  '# PrismBay buyer acquisition run','',
  '**Offer:** '+campaign.offer.title+' — $'+campaign.offer.priceUsd+' USD, one time',
  '',
  '**Free guide:** '+campaign.guideUrl,
  '',
  '**Checkout:** '+campaign.checkoutUrl,
  '',
  '## Distribution draft','',
  report.nextDistributionAssets.retailChannelDraft,
  '',
  '> '+report.commercialTruth.claim,''
].join('\n'));
console.log(JSON.stringify({status:'PASS',offer:campaign.offer.slug,guide:guide.status,checkout:checkout.status,campaign:campaign.campaign}));
