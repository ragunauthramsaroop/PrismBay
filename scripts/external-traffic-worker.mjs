import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';
import { requestFreeLLM, deterministicSalesPlan } from './freellm-sales-worker.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'growth-reports','external-social');
const PUBLIC_ROOT='https://ragunauthramsaroop.github.io/PrismBay/';
const STEAMER_PREFLIGHT='https://browser-worker-production-f5b4.up.railway.app/garment-steamer/github/';
const forbidden=/guaranteed|best[- ]?seller|limited stock|only\s+\d+\s+left|thousands of customers|verified customer|proven results|instant results|make money fast|risk[- ]free/i;
const pageBySlug={
  stakeholder:'learn/stakeholder-mapping-toolkit.html',
  esg:'learn/esg-reporting-toolkit.html',
  whitepaper:'learn/board-briefing-white-paper-system.html',
  bundle:'toolkits.html'
};
export const VERIFIED_PHYSICAL_OFFERS=[{
  kind:'physical',
  slug:'garment-steamer',
  name:'Portable Garment Steamer',
  priceUsd:29.95,
  problem:'Need a compact way to handle everyday clothing wrinkles and travel touch-ups?',
  actionableTip:'Check your 5-digit U.S. ZIP before payment so current supplier stock and destination shipping are verified first.',
  destinationUrl:STEAMER_PREFLIGHT
}];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const isPhysical=offer=>offer?.kind==='physical';

function cmd(bin,args,cwd=OUT){
  const p=spawnSync(bin,args,{cwd,encoding:'utf8',maxBuffer:12e6});
  if(p.error||p.status!==0) throw new Error((p.error?.message||p.stderr||bin+' failed').slice(-5000));
  return p.stdout;
}
function clean(s,max=180){
  const x=String(s??'').replace(/\s+/g,' ').trim();
  if(!x||x.length>max||forbidden.test(x)) return null;
  return x;
}
function wrap(s,max=34){
  const out=[''];
  for(const word of String(s).split(/\s+/)){
    const i=out.length-1;
    if((out[i]+' '+word).trim().length>max) out.push(word);
    else out[i]=(out[i]+' '+word).trim();
  }
  return out.join('\n');
}
function campaignForOffer(offer){
  if(isPhysical(offer)) return {guideUrl:offer.destinationUrl,checkoutUrl:null};
  return {
    guideUrl:PUBLIC_ROOT+pageBySlug[offer.slug],
    checkoutUrl:offer.checkout
  };
}
export function trackedUrl(offer,channel,variant='short_01'){
  const relative=isPhysical(offer)?null:pageBySlug[offer.slug];
  if(!isPhysical(offer)&&!relative) throw new Error('external_offer_page_missing_'+offer.slug);
  const u=new URL(isPhysical(offer)?offer.destinationUrl:PUBLIC_ROOT+relative);
  if(isPhysical(offer)&&['youtube','tiktok'].includes(channel)) u.pathname='/garment-steamer/'+channel+'/';
  u.searchParams.set('utm_source',channel);
  u.searchParams.set('utm_medium',channel==='youtube'?'shorts':'organic_video');
  u.searchParams.set('utm_campaign',isPhysical(offer)?'prismbay_clean_steamer_oct2026':'prismbay_external_traffic_oct2026');
  u.searchParams.set('utm_content',offer.slug+'_'+variant);
  return u.toString();
}
export function scenesForOffer(offer,plan){
  if(isPhysical(offer)){
    return [
      {label:'QUICK FABRIC CARE',title:'Wrinkles before work, travel or an event?',body:'A compact steamer is designed for quick clothing touch-ups.'},
      {label:'CHECK BEFORE PAYMENT',title:'Enter your 5-digit U.S. ZIP first',body:'Current supplier stock and destination shipping are checked live.'},
      {label:'LIVE SAFEGUARDS',title:'Payment opens only after a fresh recheck',body:'Stock, freight and order economics must pass before Stripe opens.'},
      {label:'PRISMBAY CLEAN',title:'Portable Garment Steamer — USD 29.95',body:'Check your ZIP. No card is charged during the availability check.'}
    ];
  }
  const hook=clean(plan?.shortVideoHooks?.[0],130)||clean(offer.problem,130);
  const headline=clean(plan?.landingPageHeadline,130)||offer.name;
  return [
    {label:'THE PROBLEM',title:hook,body:'A useful system makes the next action and evidence visible.'},
    {label:'THE CONTROL',title:clean(offer.actionableTip,150)||offer.problem,body:'Keep the workflow practical, traceable and owned.'},
    {label:'THE TOOLKIT',title:headline,body:offer.deliverables.slice(0,2).join(' + ')},
    {label:'START FREE',title:'Start with the free guide',body:'Optional editable package: $'+offer.priceUsd+' USD one time.'}
  ];
}
export function buildQueue({offers,plans,generatedAt=new Date().toISOString()}){
  const items=[];
  for(const offer of offers){
    const plan=plans[offer.slug]||(isPhysical(offer)?{}:deterministicSalesPlan(offer,campaignForOffer(offer)));
    const media=PUBLIC_ROOT+'media/social/'+offer.slug+'.mp4';
    for(const channel of ['youtube','tiktok']){
      const destination=trackedUrl(offer,channel);
      const physical=isPhysical(offer);
      const title=physical
        ? 'Portable Garment Steamer: check U.S. ZIP before payment'
        : (plan.shortVideoHooks?.[0]||offer.problem).replace(/[.!?]+$/,'').slice(0,88);
      const baseCaption=physical
        ? ('Portable Garment Steamer — $'+offer.priceUsd.toFixed(2)+' USD. Check your 5-digit U.S. ZIP before payment. '+
          'PrismBay Clean checks current supplier stock and destination shipping first. Availability varies by ZIP. '+destination).slice(0,1800)
        : (offer.problem+' '+offer.actionableTip+' Start with the free guide: '+destination+
          ' Optional editable document toolkit: $'+offer.priceUsd+' USD one time.').slice(0,1800);
      items.push({
        id:offer.slug+'-'+channel,
        offer:offer.slug,
        offerType:physical?'physical':'digital',
        channel,
        status:'ready_for_authorized_scheduler',
        mediaUrl:media,
        destinationUrl:destination,
        title: channel==='youtube' ? title+' #Shorts' : title,
        caption:baseCaption,
        commercialContentOwnBrand:true,
        madeForKids:false,
        aiAssisted:!physical,
        strategy:physical?'guarded_physical_preflight':(plan.llmStrategy||'deterministic_fallback'),
        guardrails:{
          noInventedTestimonials:true,
          noGuaranteedResults:true,
          exactPriceUsd:offer.priceUsd,
          originalTypographyVideoOnly:true,
          paidAds:false,
          ...(physical?{directStripe:false,zipPreflightRequired:true,availabilityClaim:'live_check_required'}:{})
        }
      });
    }
  }
  return {schemaVersion:2,generatedAt,priority:'external_traffic_to_verified_guarded_offers',items};
}
export function verifyProbe(probe){
  const v=probe.streams?.find(x=>x.codec_type==='video');
  const duration=Number(probe.format?.duration);
  const size=Number(probe.format?.size);
  if(!v||v.width!==1080||v.height!==1920||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||
     !Number.isFinite(duration)||duration<19||duration>21||size<40000||size>12000000||
     probe.streams.some(x=>x.codec_type==='audio')) throw new Error('external_video_qa_failed');
  return {durationSeconds:duration,bytes:size};
}
async function copyFonts(){
  const normal=process.env.PRISMBAY_FONT||'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const bold=process.env.PRISMBAY_FONT_BOLD||'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  await fs.copyFile(normal,path.join(OUT,'font.ttf'));
  await fs.copyFile(bold,path.join(OUT,'bold.ttf'));
}
async function renderOffer(offer,plan){
  const scenes=scenesForOffer(offer,plan);
  const slug=offer.slug;
  const physical=isPhysical(offer);
  const dir=path.join(OUT,slug);
  await fs.mkdir(dir,{recursive:true});
  const filters=[
    'drawbox=x=0:y=0:w=1080:h=1920:color=0x0b1325:t=fill',
    'drawbox=x=72:y=190:w=8:h=1370:color=0x67e8ce:t=fill'
  ];
  let fileNo=0;
  async function textFile(text,x,y,size,color,enable,bold=false){
    const name='txt-'+String(fileNo++).padStart(3,'0')+'.txt';
    await fs.writeFile(path.join(dir,name),text,'utf8');
    const font=bold?'../bold.ttf':'../font.ttf';
    filters.push('drawtext=fontfile='+font+':textfile='+name+':expansion=none:fontsize='+size+
      ':fontcolor='+color+':x='+x+':y='+y+':line_spacing=18'+(enable?":enable='"+enable+"'":''));
  }
  await textFile(physical?'PRISMBAY CLEAN  /  GARMENT CARE':'PRISMBAY  /  PROFESSIONAL TOOLKITS',112,138,27,'0x67e8ce','',true);
  await textFile(physical?'CHECK U.S. ZIP  /  NO PAYMENT DURING CHECK':'FREE GUIDE  /  OPTIONAL EDITABLE FILES',112,1610,25,'0xc9dbe9','');
  for(let i=0;i<scenes.length;i++){
    const start=i*5,end=start+5,enable='gte(t,'+start+')*lt(t,'+end+')';
    await textFile(String(i+1).padStart(2,'0')+' / '+scenes[i].label,112,278,25,'0x67e8ce',enable);
    await textFile(wrap(scenes[i].title,27),112,390,58,'0xffffff',enable,true);
    filters.push("drawbox=x=111:y=855:w=840:h=310:color=0x183047:t=fill:enable='"+enable+"'");
    await textFile(wrap(scenes[i].body,39),145,920,32,'0xe9f4fa',enable);
    filters.push("drawbox=x=112:y=1490:w="+Math.round(840*(i+1)/scenes.length)+":h=9:color=0x67e8ce:t=fill:enable='"+enable+"'");
  }
  await fs.writeFile(path.join(dir,'filter.txt'),filters.join(','));
  cmd('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x0b1325:s=1080x1920:r=30:d=20',
    '-filter_script:v','filter.txt','-an','-c:v','libx264','-preset','fast','-crf','23',
    '-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-movflags','+faststart',slug+'.mp4'],dir);
  const probe=JSON.parse(cmd('ffprobe',['-v','error','-show_streams','-show_format','-of','json',slug+'.mp4'],dir));
  const verified=verifyProbe(probe);
  const bytes=await fs.readFile(path.join(dir,slug+'.mp4'));
  return {slug,file:path.join(dir,slug+'.mp4'),sha256:sha256(bytes),...verified};
}
export async function main({render=process.argv.includes('--render')}={}){
  await fs.mkdir(OUT,{recursive:true});
  const plans={};
  const intelligence={};
  for(const offer of ACTIVE_DIGITAL_OFFERS){
    const campaign=campaignForOffer(offer);
    const llm=await requestFreeLLM({offer,campaign});
    plans[offer.slug]=llm.plan||deterministicSalesPlan(offer,campaign);
    intelligence[offer.slug]={
      status:llm.status,
      strategy:llm.strategy||plans[offer.slug].llmStrategy||'deterministic_fallback',
      model:llm.requestedModel||null,
      routedVia:llm.routedVia||null,
      routeAttempts:llm.routeAttempts||0
    };
  }
  for(const offer of VERIFIED_PHYSICAL_OFFERS){
    plans[offer.slug]={llmStrategy:'guarded_physical_preflight'};
    intelligence[offer.slug]={status:'deterministic_guarded_physical',strategy:'guarded_physical_preflight',model:null,routedVia:null,routeAttempts:0};
  }
  const offers=[...ACTIVE_DIGITAL_OFFERS,...VERIFIED_PHYSICAL_OFFERS];
  const queue=buildQueue({offers,plans});
  const media=[];
  if(render){
    await copyFonts();
    cmd('ffmpeg',['-version']);
    cmd('ffprobe',['-version']);
    for(const offer of offers) media.push(await renderOffer(offer,plans[offer.slug]));
  }
  const report={...queue,freeLLM:intelligence,media,publication:{
    githubWorker:'renders original media and prepares tracked channel metadata',
    authorizedScheduler:'required for platform publication',
    coldEmail:false,
    paidAds:false,
    physicalPromotion:'garment steamer only; guarded ZIP preflight required before checkout'
  }};
  await fs.writeFile(path.join(OUT,'distribution-queue.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',offers:offers.length,queueItems:queue.items.length,rendered:media.length,freeLLM:Object.values(intelligence).map(x=>x.status)}));
  return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href) await main();
