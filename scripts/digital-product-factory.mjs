// Builds original, review-only digital starter products from a versioned catalog.
// Generated files are deliberately not published, sold or sent to buyers.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'data/global-digital-products-2026.json');
const DEFAULT_OUT = path.join(ROOT, 'growth-reports/digital-prototypes');
const KINDS = new Set(['csv', 'html', 'svg']);
const slugOk = /^[a-z][a-z0-9-]{2,50}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const escapeHtml = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const csvCell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
export function toCsv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }

export function validateCatalog(input) {
  if (!input || input.version !== 1 || input.publication !== 'prototype_only' || !Array.isArray(input.products) || input.products.length !== 10)
    throw new Error('Expected ten unpublished original product specifications');
  const seen = new Set();
  for (const p of input.products) {
    if (!slugOk.test(p.id) || seen.has(p.id) || !KINDS.has(p.format))
      throw new Error('Invalid or duplicate product identifier / format');
    seen.add(p.id);
    if (!p.name || !p.category || !p.audience || !p.benefit || !p.problem || !p.hook || !p.claim ||
        !Array.isArray(p.steps) || p.steps.length < 3 || !Number.isFinite(p.priceUsd) || p.priceUsd <= 0 || p.priceUsd > 50)
      throw new Error('Incomplete or unreasonable product specification: ' + p.id);
    if (p.format === 'csv' && (!Array.isArray(p.headers) || p.headers.length < 2 || !Array.isArray(p.rows) ||
        !p.rows.length || p.rows.some(row => !Array.isArray(row) || row.length !== p.headers.length)))
      throw new Error('CSV rows must match headers: ' + p.id);
  }
  return input;
}

function startPage(p) {
  const h = escapeHtml;
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + h(p.name) + ' | Editable prototype</title>',
    '<meta name="robots" content="noindex,nofollow">',
    '<style>:root{font-family:system-ui,Arial,sans-serif;color:#132d2a;background:#f7faf8}*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:960px;margin:auto;padding:40px 24px}header{background:#133d36;color:#fff;max-width:none;text-align:center}h1{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1.05}p{line-height:1.7}a.button{display:inline-block;padding:15px 26px;background:#246c54;color:white;border-radius:9px;text-decoration:none}section{padding:28px 0;border-bottom:1px solid #ddd}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px}.tile{background:#fff;padding:18px;border:1px solid #dbe8e0;border-radius:13px}footer{font-size:13px;color:#52645b}</style></head>',
    '<body><header><small>REPLACE WITH YOUR OWN BRAND</small><h1>What do you need help with?</h1><p>' + h(p.benefit) + '</p></header><main>',
    '<section><h2>The problem we solve</h2><p>' + h(p.problem) + '</p><a class="button" href="mailto:replace-with-your-email@example.com?subject=Service%20enquiry">Ask a question</a></section>',
    '<section><h2>How our service works</h2><div class="grid">',
    ...p.steps.map((s,i)=>'<div class="tile"><strong>Step '+(i+1)+'</strong><p>'+h(s)+'</p></div>'),
    '</div></section><section><h2>Who we help</h2><p>' + h(p.audience) + '</p><p>Replace these examples with verifiable descriptions of your business.</p></section>',
    '</main><footer>Prototype only. Replace all sample text, email addresses and business disclosures before deployment.</footer></body></html>'
  ].join('\n');
}
const icons = {
  check:'<path d="M5 12l4 4L19 6"/>',
  chart:'<path d="M4 19V5M4 19h16M8 15v-3M12 15V8M16 15V5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  document:'<path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5M10 16h5"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 19c0-4 2-6 6-6s6 2 6 6"/><path d="M16 6a3 3 0 0 1 0 6M18 13c2 1 3 3 3 6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
function iconSvg(shape){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#165c4a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-label="Original ' + shape + ' icon">' + icons[shape] + '</svg>\n';}

function guide(p) {
  const lines = [
    '# ' + p.name,
    '',
    'Version 0.1 | Original PrismBay review prototype | October 2026',
    '',
    '## Purpose',
    p.benefit + '.',
    '',
    '## Intended buyer',
    p.audience + '.',
    '',
    '## Problem addressed',
    p.problem + '.',
    '',
    '## First setup',
    ...p.steps.map((step,i) => (i+1)+'. '+step),
    '',
    '## Example workflow',
    '1. Duplicate the starter files. Keep a clean original.',
    '2. Replace fictional or blank examples with your own verified information.',
    '3. Review every calculation, input, statement and hyperlink before publishing or making a business decision.',
    '4. Export a final copy. Keep an editable source for later updates.',
    '',
    '## Acceptance checks',
    '- [ ] File opens in its intended application.',
    '- [ ] The sample shows the intended use without promising outcomes.',
    '- [ ] Every formula and link has been checked on realistic sample values.',
    '- [ ] The buyer understands which components are included.',
    '- [ ] Usage rights, support and refund terms are ready.',
    '',
    '## Scope and limits',
    p.claim,
    'This starter is for evaluation. There is no new payment link or confirmed paid delivery for this product.',
    '',
    '## Feedback questions',
    '- Which part took the most time?',
    '- Which feature or example is missing?',
    '- Would you use this once or repeatedly?',
    '- What would you expect at a paid price of $' + p.priceUsd.toFixed(2) + '?',
    ''
  ];
  return lines.join('\n');
}
function socialBrief(p) {
  return {
    productId:p.id,
    status:'draft_awaiting_rights_review_and_channel_authorization',
    platform:'short-form vertical video draft, platform unspecified',
    seconds:24,
    size:'1080x1920',
    priceProposedUsd:p.priceUsd,
    doNotClaimAvailable:true,
    disclosure:'PrismBay own-product development preview',
    hook:p.hook,
    scenes:[
      {start:0,end:5,scene:'Real problem',message:p.problem},
      {start:5,end:12,scene:'Original product demonstration',message:p.benefit},
      {start:12,end:19,scene:'How to use',message:p.steps[0]},
      {start:19,end:24,scene:'Audience research invitation',message:'See the free PrismBay digital resources. New starter in development.'}
    ],
    landingPage:'https://clean.prismbayai.com/digital/',
    caption:p.hook+' Demonstration of a PrismBay original starter concept. Not yet offered for checkout. Browse existing digital resources: https://clean.prismbayai.com/digital/',
    rights:{visuals:'Use actual original worksheets and interface demonstration only',audio:'Record original narration or license audio explicitly',footage:'No borrowed stock footage without a documented commercial license'},
    approvals:['product QA','factual and licensing QA','channel permission','OAuth connectivity','publication deduplication'],
    published:false
  };
}
async function save(dir, name, data, manifest) {
  const file = path.join(dir,name);
  await fs.mkdir(path.dirname(file), {recursive:true});
  await fs.writeFile(file,data,'utf8');
  manifest.files.push({name,sha256:sha256(data),bytes:Buffer.byteLength(data)});
}
export async function build(out=DEFAULT_OUT, source=CATALOG) {
  const catalog = validateCatalog(JSON.parse(await fs.readFile(source,'utf8')));
  const root = path.resolve(out);
  const manifests = [];
  await fs.mkdir(root,{recursive:true});
  for(const p of catalog.products){
    const dir=path.join(root,p.id);
    await fs.mkdir(dir,{recursive:true});
    const manifest={id:p.id,title:p.name,priceProposedUsd:p.priceUsd,status:'prototype_not_for_sale',files:[],shopUrl:null,salesVerified:false,published:false};
    await save(dir,'README.md',guide(p),manifest);
    await save(dir,'LICENSE-AND-SCOPE.txt',
      'PrismBay original review prototype. No external templates, brand marks, photographs, video footage, fonts or proprietary third-party material are included.\n'+
      'No end-user commercial license has been granted for these review prototypes. Set final customer license and refund policy before sale.\n'+p.claim+'\n',manifest);
    await save(dir,'marketing/short-video-brief.json',JSON.stringify(socialBrief(p),null,2)+'\n',manifest);
    if(p.format==='csv'){
      await save(dir,'templates/'+p.id+'.csv',toCsv([p.headers,...p.rows]),manifest);
      if(p.id==='proposal-toolkit'){
        await save(dir,'templates/offer-outline.md',
          '# Client proposal outline\n\n1. Client objective and evidence\n2. Expected deliverables\n3. In scope\n4. Out of scope\n5. Client inputs and dependencies\n6. Timeline and acceptance tests\n7. Fees, assumptions and payment milestones\n8. Change control\n9. Contacts and signature process\n\nReplace every field with agreed client-specific facts. Seek qualified legal review for binding terms.\n',manifest);
      }
      if(p.id==='ai-workflow-pack'){
        await save(dir,'templates/review-prompt.md',
          '# Source-constrained draft prompt\n\nRole: Draft assistant with no publishing authority.\nInput: Only the approved material placed below.\nTask: Produce one concise draft and cite the supplied source line for every factual statement.\nConstraints: No invented evidence, promises or third-party claims. Separate uncertainties.\nOutput: Draft, source ledger, unresolved questions, reviewer checklist.\nGate: A responsible person must review before release.\n',manifest);
      }
      if(p.id==='career-application-kit'){
        await save(dir,'templates/achievement-guide.md',
          '# Evidence-based CV improvement\n\nAction + scope + measurable result + timeframe + evidence.\n\nExample format: Led [scope] to improve [measure] by [verified amount] over [period].\n\nDo not invent percentages, dates, promotions, credentials or references. Confirm location eligibility before applying.\n',manifest);
      }
    }
    if(p.format==='html') await save(dir,'templates/index.html',startPage(p),manifest);
    if(p.format==='svg') for(const s of Object.keys(icons)) await save(dir,'assets/'+s+'.svg',iconSvg(s),manifest);
    await save(dir,'manifest.json',JSON.stringify(manifest,null,2)+'\n',{files:[]});
    manifests.push({id:p.id,title:p.name,proposedUsd:p.priceUsd,files:manifest.files.length,status:manifest.status});
  }
  await fs.writeFile(path.join(root,'catalog-manifest.json'),JSON.stringify({
    generatedOn:'2026-10-24',status:'review_prototypes_only',count:manifests.length,
    approvalRequiredBeforeSale:true,firstSaleVerified:false,postsPublished:false,
    products:manifests
  },null,2)+'\n');
  return {count:manifests.length,out:root,products:manifests};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const idx=process.argv.indexOf('--out');
  const target=idx>=0 ? process.argv[idx+1] : DEFAULT_OUT;
  if(!target) throw new Error('--out requires a directory');
  console.log(JSON.stringify(await build(target)));
}
