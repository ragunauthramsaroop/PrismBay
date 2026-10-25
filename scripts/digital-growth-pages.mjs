// Original, substantive search-entry resources for the four already verified PrismBay digital offers.
// Outputs are served as branded owned-site educational pages; no checkout is created or changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ORIGIN = 'https://clean.prismbayai.com';
export const GUIDES = Object.freeze([
  {
    slug:'stakeholder-commitments-checklist',
    offerSlug:'stakeholder',
    title:'Stakeholder Commitments Tracker: Free Checklist and CSV',
    description:'A practical stakeholder commitment checklist with a downloadable CSV starter. Record each promise, owner, evidence and closure date.',
    eyebrow:'Stakeholder relations / free worksheet',
    h1:'A stakeholder meeting is not a completed commitment.',
    intro:'A defensible stakeholder register connects each engagement to an agreed action, a responsible owner and supporting evidence. Download the free spreadsheet-ready CSV to start your own register.',
    method:[
      ['Write the exact commitment','Record what was agreed in plain language. Avoid broad summaries such as “support the community.”'],
      ['Assign one accountable owner','A named role or person should know the next action. Note an escalation route when the primary owner is unavailable.'],
      ['Record the agreed date','Separate dates promised externally from internal progress milestones.'],
      ['Attach closure evidence','A completed activity needs a verifiable receipt, decision record or accepted output.'],
      ['Review unresolved items','Prioritize overdue and high-impact actions before the next stakeholder meeting.']
    ],
    columns:['Stakeholder group','Commitment','Owner','Due date','Evidence location','Status','Last updated'],
    example:['Example local supplier','Share the published qualification process','Procurement lead','2026-11-30','Example public URL','Open','2026-10-24'],
    questions:[
      ['Is a stakeholder register the same as a contact list?','No. A contact list stores identities. A commitments register also tracks what was promised, by whom, when and how closure was verified.'],
      ['Should I put sensitive stakeholder data in this free CSV?','Use only information you are authorized to store. Keep personal, confidential and sensitive details in approved secure systems.'],
      ['What is included in the optional paid toolkit?','The existing $49 toolkit includes an implementation guide, editable Excel stakeholder and commitments workbook, and Word executive briefing template.']
    ]
  },
  {
    slug:'esg-monthly-reporting-checklist',
    offerSlug:'esg',
    title:'Monthly ESG Reporting Checklist: Free KPI Evidence CSV',
    description:'Build a clearer monthly ESG reporting record with KPI definitions, data owners, evidence locations, reporting boundaries and approval status.',
    eyebrow:'Sustainability operations / free worksheet',
    h1:'A reported KPI needs a definition and an evidence trail.',
    intro:'Month-end ESG reporting becomes harder when teams combine inconsistent units, unclear boundaries or unreviewed numbers. This free worksheet helps establish ownership before values enter a report.',
    method:[
      ['Define the metric before collection','Record the exact unit, period, scope and reporting boundary.'],
      ['Document the original source','Keep a reference to the primary record and note changes from previous periods.'],
      ['Name the accountable data owner','Distinguish the source owner from the person approving the published figure.'],
      ['Identify estimates and gaps','Mark unresolved inputs and assumptions instead of treating blanks as zero.'],
      ['Complete review and sign-off','Keep an audit trail of corrections, approvals and open actions before publication.']
    ],
    columns:['KPI name','Unit','Reporting period','Boundary','Evidence location','Data owner','Reviewer','Status'],
    example:['Electricity consumption','kWh','2026-09','Example site boundary','Example meter register','Energy analyst','Sustainability manager','Review pending'],
    questions:[
      ['Should estimated data be excluded?','Estimated figures need clear labeling, documented methods and review. Applicable reporting rules determine whether and how they are included.'],
      ['Does a monthly ESG tracker certify compliance?','No. The worksheet organizes evidence and review responsibilities. It does not provide assurance, legal verification or certification.'],
      ['What is in the optional $99 pack?','The existing pack includes a monthly reporting guide, editable Excel KPI and social-performance registers, and a Word executive brief template.']
    ]
  },
  {
    slug:'board-briefing-evidence-checklist',
    offerSlug:'whitepaper',
    title:'Board Briefing Evidence Checklist: Free Claims Register CSV',
    description:'Download an original board briefing checklist and claims register CSV. Separate evidence, estimates, assumptions and the decision requested.',
    eyebrow:'Executive writing / free worksheet',
    h1:'Separate evidence from the decision you want approved.',
    intro:'A useful board brief states the decision, material options, supporting evidence and unresolved uncertainty. The free claims CSV gives your draft an independent review trail.',
    method:[
      ['State the decision on page one','Describe the specific approval or direction sought and by whom.'],
      ['Group material claims','Identify what is a verified fact, calculation, forecast or management assumption.'],
      ['Preserve the source date and scope','Avoid citing information without its reporting period, context or applicable limitations.'],
      ['Surface counterarguments and risk','Explain alternatives, downside conditions and implementation responsibilities.'],
      ['Review before circulation','Confirm each claim against its source and record who cleared the final document.']
    ],
    columns:['Claim ID','Claim or assumption','Classification','Source or method','Date checked','Reviewer','Verification status'],
    example:['B-001','Illustrative operating cost assumption','Assumption','Internal planning example','2026-10-24','Assigned reviewer','Unverified example'],
    questions:[
      ['Is a board brief the same as a white paper?','No. A board brief supports a defined management decision. A white paper often presents a broader researched position, options or methodology.'],
      ['Is AI-generated evidence acceptable without review?','No. All material facts and citations need verification against accessible primary sources.'],
      ['What do buyers receive with the $79 existing system?','A PDF research guide, editable Excel claims ledger, Word white paper template and Word board brief template.']
    ]
  },
  {
    slug:'consultant-service-pricing-guide',
    offerSlug:'bundle',
    title:'Consulting Service Pricing Guide: Cost, Margin and Quote',
    description:'Use the free PrismBay service pricing calculator with a practical checklist for labor cost, direct expenses, contingency and margin.',
    eyebrow:'Independent consulting / free calculator',
    h1:'Set a project price from the cost of delivering the work.',
    intro:'A sustainable quote starts with realistic delivery time, internal cost, direct expenses and a margin target. The free calculator gives you an initial estimate, which still needs a market and scope review.',
    method:[
      ['Clarify the complete scope','List outputs, review cycles and exclusions before calculating hours.'],
      ['Count direct and indirect delivery time','Include research, revisions, communication, coordination and quality assurance.'],
      ['Estimate real expenses','Include paid tools, suppliers, travel and other costs attributable to the work.'],
      ['Apply contingency and target margin','Stress-test the estimate against extra delivery hours and realistic customer expectations.'],
      ['Confirm acceptance and change control','Use a written approval process for scope changes, milestones and payment terms.']
    ],
    columns:['Task','Hours','Cost per hour USD','Direct expenses USD','Assumptions','Reviewer'],
    example:['Illustrative research brief','8','30','20','One review cycle','Owner'],
    questions:[
      ['Are gross margin and markup the same?','No. Gross margin measures gross profit divided by the selling price. Markup measures gross profit divided by cost.'],
      ['Are transaction fees included in the free calculator?','No. Payment processing, taxes and other financing costs require separate review.'],
      ['Is the existing $179 executive bundle a pricing tool?','No. The bundle contains three existing professional document systems for stakeholder, ESG and board-reporting work.']
    ]
  }
]);

export const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const csv=rows=>rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
const offerBySlug=new Map(ACTIVE_DIGITAL_OFFERS.map(x=>[x.slug,x]));
export const GUIDE_PATHS=Object.freeze(GUIDES.map(x=>'/digital/guides/'+x.slug+'.html'));

export function htmlFor(g) {
  const offer=offerBySlug.get(g.offerSlug);
  if(!offer)throw Error('Unknown verified offer '+g.offerSlug);
  const url=ORIGIN+'/digital/guides/'+g.slug+'.html';
  const guide= new URL(offer.guide);
  guide.searchParams.set('utm_source','prismbay_resources');
  guide.searchParams.set('utm_medium','owned_guide');
  guide.searchParams.set('utm_campaign',g.slug);
  const checkout=new URL(offer.checkout);
  checkout.searchParams.set('client_reference_id', 'resource_'+g.offerSlug);
  const schema={
    '@context':'https://schema.org','@type':'WebPage',
    name:g.title,description:g.description,url,
    isPartOf:{'@type':'WebSite',name:'PrismBay Digital',url:ORIGIN+'/digital/'}
  };
  const other=GUIDES.filter(x=>x.slug!==g.slug).map(x=>'<li><a href="/digital/guides/'+esc(x.slug)+'.html">'+esc(x.title)+'</a></li>').join('');
  const steps=g.method.map((pair,i)=>'<li><span class="number">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+esc(pair[0])+'</h3><p>'+esc(pair[1])+'</p></div></li>').join('');
  const qa=g.questions.map(pair=>'<details><summary>'+esc(pair[0])+'</summary><p>'+esc(pair[1])+'</p></details>').join('');
  const meta=esc(g.description);
  const isPrice=g.slug==='consultant-service-pricing-guide';
  const extras=isPrice?'<a class="btn secondary" href="/digital/free-pricing-calculator.html">Open free pricing calculator</a>':'';
  const content=[
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>'+esc(g.title)+' | PrismBay Digital</title>',
    '<meta name="description" content="'+meta+'"><meta name="robots" content="index,follow,max-image-preview:large">',
    '<link rel="canonical" href="'+url+'">',
    '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(g.title)+'">',
    '<meta property="og:description" content="'+meta+'"><meta property="og:url" content="'+url+'">',
    '<meta name="twitter:card" content="summary">',
    '<script type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>',
    '<style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102c23;background:#f9faf7}*{box-sizing:border-box}body{margin:0;line-height:1.65}a{color:#1b694b}nav{background:#102c23;color:white;padding:17px max(22px,calc((100vw - 1050px)/2))}nav a{color:white;text-decoration:none;font-weight:750}.shell{max-width:1050px;margin:auto;padding:0 24px}.hero{padding:62px 0;background:linear-gradient(135deg,#e9f3eb,#f9faf7)}.eyebrow{text-transform:uppercase;letter-spacing:.13em;font-size:12px;color:#317453;font-weight:850}h1{font-size:clamp(37px,6vw,65px);letter-spacing:-.055em;line-height:1.05;max-width:870px;margin:13px 0 24px}h2{font-size:29px;letter-spacing:-.035em;line-height:1.2}h3{font-size:18px;margin:0}p{max-width:860px}p.lead{font-size:19px;color:#385348}.btn{display:inline-block;background:#195e42;color:white;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:750;margin:10px 10px 0 0}.btn.secondary{color:#195e42;background:white;border:1px solid #b7d3c1}.tag{display:inline-block;border:1px solid #cbded0;padding:5px 11px;border-radius:20px;background:white;font-size:12px;margin-right:7px}.content{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(230px,.8fr);gap:42px;padding-top:42px}.steps{list-style:none;padding:0}.steps li{display:flex;gap:21px;border-bottom:1px solid #dfebe3;padding:21px 0}.steps p{color:#506a5b;margin:7px 0}.number{color:#23805a;font-weight:800;font-size:20px}aside{background:#edf6ee;border:1px solid #d8e8db;padding:25px;border-radius:18px;align-self:start}aside ul{padding-left:18px}aside li{margin:12px 0}.download{background:#fff;border:1px solid #d6e7db;border-radius:15px;padding:25px;margin:28px 0}.mini{color:#587363;font-size:13px}.faq{padding:30px 0}.faq details{padding:16px 0;border-bottom:1px solid #d9e5dd}.faq summary{cursor:pointer;font-weight:750}.faq p{color:#567064}footer{margin-top:44px;background:#102c23;color:#d8e8de;padding:32px 0;font-size:13px}footer a{color:#e0f9e3}@media(max-width:760px){.content{grid-template-columns:1fr}.hero{padding:40px 0}nav{padding:17px 24px}}</style>',
    '</head><body><nav><a href="/digital/">PrismBay Digital</a> · <a href="/digital/">All tools</a></nav>',
    '<header class="hero"><div class="shell"><div class="eyebrow">'+esc(g.eyebrow)+'</div><h1>'+esc(g.h1)+'</h1><p class="lead">'+esc(g.intro)+'</p><span class="tag">Free educational resource</span><span class="tag">No account</span><span class="tag">Original editable CSV</span></div></header>',
    '<div class="shell content"><main><h2>A five-step working checklist</h2><ol class="steps">'+steps+'</ol>',
    '<section class="download" aria-labelledby="download-title"><h2 id="download-title">Download your free starter CSV</h2><p>Open in Excel, Google Sheets or another spreadsheet editor. The file contains headers and one clearly illustrative example. No data is uploaded.</p><button class="btn" id="download" type="button">Download example CSV</button>'+extras+'<p class="mini" id="download-status" role="status">Replace the example row before using your own information.</p></section>',
    '<section><h2>What your output should show</h2><p>After entering your own information, another reviewer should understand the owner, source, status and next action without relying on undocumented explanations. Use appropriate access controls for confidential material.</p></section>',
    '<section class="faq"><h2>Frequently asked questions</h2>'+qa+'</section>',
    '</main><aside><h2>Need more than a free sample?</h2><p>'+esc(offer.name)+'</p><p>'+esc(offer.audience)+'</p><p><strong>$'+offer.priceUsd.toFixed(0)+' USD one-time</strong>. No subscription. This is an editable document package, not hosted software.</p><ul>'+offer.deliverables.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><a class="btn secondary" href="'+esc(guide)+'">See free product guide</a><a class="btn" href="'+esc(checkout)+'">View secure Stripe checkout</a><p class="mini">A paid purchase and delivery test for every new product remains a separate review. This page advertises an existing listed offer only.</p><h3>Other free resources</h3><ul>'+other+'</ul></aside></div>',
    '<footer><div class="shell">PrismBay Digital · Original educational resources, not legal, tax or regulated professional advice. <a href="/digital/">All verified digital offers</a> · <a href="/digital/free-pricing-calculator.html">Free pricing calculator</a> · <a href="/contact.html">Support</a></div></footer>',
    '<script>document.getElementById("download").addEventListener("click",function(){var data='+JSON.stringify(csv([g.columns,g.example]).replaceAll('<','\\u003c'))+';var u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));var a=document.createElement("a");a.href=u;a.download='+JSON.stringify(g.slug+'-prismbay.csv')+';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);document.getElementById("download-status").textContent="CSV downloaded. Replace the illustrative example before use.";});</script>',
    '</body></html>'
  ];
  return content.join('\n');
}
export async function buildGuides(root=path.join(ROOT,'public/digital/guides')) {
  await fs.mkdir(root,{recursive:true});
  const output=[];
  for (const g of GUIDES) {
    const target=path.join(root,g.slug+'.html');
    await fs.writeFile(target,htmlFor(g),'utf8');
    output.push(target);
  }
  return output;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify({pages:await buildGuides()}));
}
