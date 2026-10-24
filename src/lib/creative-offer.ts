/* PrismBay Creative Studio: zero-API, review-first planning engine.
 * Original code. Third-party AI/video/PPT systems are NOT connected.
 */
export type Channel = 'LinkedIn' | 'Instagram' | 'TikTok' | 'Facebook';
export type Brief = { brand:string; offer:string; audience:string; outcome:string; proof:string; channel:Channel };
export type Pack = {
  title:string; headlines:string[]; caption:string;
  shots:{time:string; visual:string; narration:string}[];
  slides:{title:string; bullets:string[]}[];
  landing:{headline:string; intro:string; cta:string; sections:{title:string; body:string}[]};
  tasks:string[]; warning:string;
};
const clean=(s:string,max=180)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function makePack(raw:Brief):Pack {
  const b={brand:clean(raw.brand,72),offer:clean(raw.offer),audience:clean(raw.audience),outcome:clean(raw.outcome),proof:clean(raw.proof,280),channel:raw.channel};
  if(b.brand.length<2||b.offer.length<4||b.audience.length<4||b.outcome.length<4) throw new Error('Please complete the brand, offer, audience and objective.');
  if(!(['LinkedIn','Instagram','TikTok','Facebook'] as string[]).includes(b.channel)) throw new Error('Select a valid channel.');
  const cta='Request a tailored discussion';
  const proof=b.proof?'Client-supplied claim, not verified: '+b.proof:'No evidence supplied; do not publish unsupported performance claims.';
  return {
    title:b.brand+' | Creative launch pack',
    headlines:[b.offer+' for '+b.audience,'A practical approach to '+b.outcome,'Three questions to ask before choosing '+b.offer],
    caption:b.brand+' presents '+b.offer+' for '+b.audience+'. The objective is '+b.outcome+'. Learn about the approach, examine the evidence, and request a tailored discussion.\n\n'+cta+'.',
    shots:[
      {time:'0–5s',visual:'Opening title over original, permission-cleared footage.',narration:'For '+b.audience+', '+b.outcome+' deserves a plan.'},
      {time:'5–12s',visual:'Show the real product or a clearly labelled concept mockup.',narration:'Introducing '+b.offer+' from '+b.brand+'.'},
      {time:'12–21s',visual:'Demonstrate steps using licensed footage without invented results.',narration:'Explore the workflow and decide whether the offering suits your needs.'},
      {time:'21–30s',visual:'Branded end card and buyer next step.',narration:cta+'. Ask for the full details.'}
    ],
    slides:[
      {title:'The opportunity',bullets:['Target audience: '+b.audience,'Desired outcome: '+b.outcome]},
      {title:'The customer challenge',bullets:['Define current pain points','Establish baseline evidence before any impact claims']},
      {title:'The proposed solution',bullets:['Offering: '+b.offer,'Customer journey and deliverable scope']},
      {title:'Evidence review',bullets:[proof,'Show only documented examples']},
      {title:'Implementation and governance',bullets:['Ownership, legal rights and approval gate','Budget approval before paid inference']},
      {title:'Decision and next step',bullets:['Agree scope, pricing and delivery timeline',cta]}
    ],
    landing:{
      headline:b.offer+' for '+b.audience,
      intro:'A focused offering intended to support '+b.outcome+'. Explore the plan and ask for details.',
      cta,
      sections:[
        {title:'Who is this for?',body:b.audience},
        {title:'The proposed offer',body:b.offer},
        {title:'Intended outcome',body:b.outcome},
        {title:'Evidence status',body:proof}
      ]
    },
    tasks:[
      'Review the offer, customer brief and documented evidence.',
      'Approve an accurate headline and audience promise.',
      'Create or source original, rights-cleared visuals.',
      'Prepare campaign artwork, presentation and landing page.',
      'Complete accuracy, brand, consent and rights checks.',
      'Publish only with owner approval and authorized accounts.',
      'Evaluate actual traffic, inquiries and recorded sales.'
    ],
    warning:'Planning draft only. No AI model has run. No video, PowerPoint, screenshot reconstruction, publication or payment has occurred. All claims need approval.'
  };
}
export function markdown(p:Pack):string{
  return ['# '+p.title,'','## Headlines',...p.headlines.map(x=>'- '+x),'','## Social copy',p.caption,'','## 30-second video storyboard',...p.shots.map(x=>'- '+x.time+' | '+x.visual+' | Narration: '+x.narration),'','## Presentation',...p.slides.flatMap((s,i)=>['### Slide '+(i+1)+': '+s.title,...s.bullets.map(x=>'- '+x)]),'','## Landing page',p.landing.headline,p.landing.intro,...p.landing.sections.flatMap(x=>['### '+x.title,x.body]),'','## Seven-day action plan',...p.tasks.map((x,i)=>'- Day '+(i+1)+': '+x),'','## Review status',p.warning].join('\n');
}
export function landingHtml(p:Pack):string {
 const e=escapeHtml;
 const contact='mailto:support@prismbayai.com?subject='+encodeURIComponent('Production inquiry: '+p.title);
 const cards=p.landing.sections.map(x=>'<section class="card"><h2>'+e(x.title)+'</h2><p>'+e(x.body)+'</p></section>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>'+e(p.landing.headline)+'</title><style>*{box-sizing:border-box}body{margin:0;font:16px/1.7 system-ui;background:#f4f7f9;color:#132739}.hero{background:#122739;color:white;padding:80px max(20px,calc((100vw - 920px)/2))}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.15}main{max-width:960px;margin:auto;padding:36px 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.card{background:white;border:1px solid #e0e6ea;border-radius:15px;padding:24px}a.cta{display:inline-block;background:#41c9b7;color:#071d2c;padding:13px 20px;text-decoration:none;font-weight:700;border-radius:9px}footer{padding:20px;text-align:center;font-size:13px;color:#556}</style></head><body><div class="hero"><h1>'+e(p.landing.headline)+'</h1><p>'+e(p.landing.intro)+'</p><a class="cta" href="'+e(contact)+'">'+e(p.landing.cta)+'</a></div><main>'+cards+'</main><footer>Concept draft. Verify claims, ownership and contact details before publishing.</footer></body></html>';
}
