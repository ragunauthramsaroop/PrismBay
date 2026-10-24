import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const PAGE='board-briefing-readiness-checklist.html';
export const URL='https://clean.prismbayai.com/learn/'+PAGE;
export const GUIDE='https://clean.prismbayai.com/board-briefing-white-paper-template.html';
export const CHECKOUT='https://buy.stripe.com/bJe7sMgq25hNcCe6SAgnK0s?client_reference_id=free_board_audit';
export const CRITERIA=Object.freeze([
 ['Decision clearly requested','State precisely what decision, approval, or endorsement is sought.'],
 ['Verifiable source register','Record each material claim with its source, date, responsible person and document reference.'],
 ['Facts separated from assumptions','Distinguish verified evidence from projections, estimates, judgements and unknowns.'],
 ['Alternatives and tradeoffs','Present viable options and the reasoning supporting the recommendation.'],
 ['Risk owners and mitigations','Describe the key risks, mitigations, residual exposure and owner.'],
 ['Cost and execution assumptions','Document budget, resource needs, dependencies and delivery timeline.'],
 ['Actions and accountability','State the decision authority, next step, accountable owner and deadline.']
]);
const e=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function buildAssessment(){
 const items=CRITERIA.map((x,i)=>'<label class="item"><input type="checkbox" data-item value="'+i+'"><span><strong>'+e(x[0])+'</strong><small>'+e(x[1])+'</small></span></label>').join('\n');
 const script= [
 '(function(){"use strict";',
 'const items='+JSON.stringify(CRITERIA)+';',
 'const boxes=Array.from(document.querySelectorAll("input[data-item]"));',
 'const output=document.getElementById("out");',
 'function picked(){return boxes.filter(x=>x.checked).map(x=>Number(x.value));}',
 'function update(){const ids=picked();const missing=items.filter((_,i)=>!ids.includes(i));',
 'document.getElementById("score").textContent=ids.length+" / "+items.length;',
 'document.getElementById("bar").style.width=(ids.length/items.length*100)+"%";',
 'output.replaceChildren();let p=document.createElement("p");p.textContent=missing.length?("Review "+missing.length+" missing area"+(missing.length===1?"":"s")+" before submission."):"All seven items marked present. Confirm their accuracy and quality.";output.appendChild(p);',
 'const ul=document.createElement("ul");missing.forEach(x=>{const li=document.createElement("li");li.textContent=x[1];ul.appendChild(li);});output.appendChild(ul);}',
 'document.getElementById("audit").addEventListener("submit",ev=>{ev.preventDefault();update();});',
 'document.getElementById("audit").addEventListener("reset",()=>requestAnimationFrame(update));',
 'boxes.forEach(b=>b.addEventListener("change",update));',
 'document.getElementById("download").addEventListener("click",()=>{const ids=picked();',
 'const lines=["BOARD PAPER READINESS REVIEW","","Checklist items present: "+ids.length+" / "+items.length,"Self-review aid, not independent certification.","","IMPROVEMENT ACTIONS"];',
 'items.forEach((x,i)=>{if(!ids.includes(i))lines.push("- "+x[0]+": "+x[1]);});',
 'lines.push("","ITEMS MARKED PRESENT");items.forEach((x,i)=>{if(ids.includes(i))lines.push("- "+x[0]);});',
 'lines.push("","Confirm all evidence and approvals with the responsible reviewer.","Free guide: '+GUIDE+'","Optional editable templates: '+CHECKOUT+'");',
 'const blob=new Blob([lines.join("\\n")],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);',
 'const link=document.createElement("a");link.href=url;link.download="board-briefing-readiness-action-plan.txt";document.body.appendChild(link);link.click();link.remove();',
 'setTimeout(()=>URL.revokeObjectURL(url),500);});update();',
 '})();'
 ].join('\n');
 const html=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>Free Board Briefing Checklist and Decision Paper Assessment | PrismBay</title>',
 '<meta name="description" content="Free seven-point board paper checklist. Assess decision readiness, identify missing evidence and download an action plan. No registration required.">',
 '<meta name="robots" content="index,follow"><link rel="canonical" href="'+URL+'">',
 '<meta property="og:type" content="website"><meta property="og:title" content="Free Board Briefing Readiness Checklist">',
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'WebApplication',name:'Board Briefing Readiness Checklist',operatingSystem:'Any browser',applicationCategory:'BusinessApplication',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},url:URL})+'</script>',
 '<style>',
 '*{box-sizing:border-box}body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f2f6f6;color:#132f36}a{color:#077d6c}.wrap{width:min(1040px,calc(100% - 36px));margin:0 auto}.skip{position:absolute;left:-9999px}.skip:focus{left:10px;top:10px;background:white;padding:10px}',
 'nav{background:#0b2733;color:white;padding:17px 0}nav .wrap{display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap}nav a{color:white;text-decoration:none}nav strong{font-size:19px}.hero{padding:60px 0;background:linear-gradient(110deg,#0b2733,#16675f);color:white}h1{max-width:770px;font-size:clamp(35px,5.2vw,60px);line-height:1.08;letter-spacing:-.045em;margin:10px 0 20px}.hero p{max-width:720px;color:#e4f0ee;font-size:18px}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:800;color:#92e6cb}',
 '.pills{display:flex;gap:8px;flex-wrap:wrap}.pills span{border:1px solid #80cbb1;border-radius:80px;padding:6px 12px;font-size:12px}.layout{padding:34px 0;display:grid;grid-template-columns:1.18fr .82fr;gap:23px;align-items:start}.panel{background:white;border:1px solid #d8e6e5;border-radius:17px;padding:26px;box-shadow:0 12px 30px #062d2d0b}h2{font-size:25px;line-height:1.25;margin:0 0 13px}p{margin:0 0 17px}.muted{font-size:13px;color:#53696e}',
 '.item{display:flex;gap:13px;align-items:start;padding:15px 0;border-bottom:1px solid #e4eded;cursor:pointer}.item input{width:21px;height:21px;flex-shrink:0;accent-color:#0b8273;margin-top:5px}.item strong{display:block;font-size:15px}.item small{display:block;font-size:13px;color:#53696e;margin-top:4px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:21px}.btn{font:700 14px system-ui,sans-serif;display:inline-block;border:0;border-radius:9px;padding:13px 17px;cursor:pointer;text-decoration:none}.main{background:#0b8273;color:white}.ghost{background:#f0f7f5;color:#0d5a53;border:1px solid #cfe1dd}',
 '#score{font-size:40px;font-weight:900}.meter{height:12px;background:#e4f0ee;border-radius:30px;overflow:hidden;margin:17px 0}.meter div{height:100%;width:0;background:#0b8273;transition:width .2s}#out{padding:12px 0;border-top:1px solid #e4eded}#out li{margin:10px 0;font-size:13px}.offer{margin-top:25px;border-top:1px solid #d8e6e5;padding-top:21px}.price{font-size:27px;font-weight:900}.offer h3{font-size:19px}.explain{margin-bottom:45px}.explain p{max-width:800px}.disclose{font-size:12px;color:#53696e;margin-top:15px}footer{border-top:1px solid #d8e6e5;padding:23px 0;font-size:13px;color:#53696e}',
 '@media(max-width:730px){.layout{grid-template-columns:1fr}.panel{padding:20px}.hero{padding:45px 0}}',
 '</style></head><body>',
 '<a class="skip" href="#main">Skip to assessment</a><nav><div class="wrap"><a href="https://clean.prismbayai.com/"><strong>PrismBay Digital</strong></a><a href="https://clean.prismbayai.com/learn/">Free buyer guides</a></div></nav>',
 '<header class="hero"><div class="wrap"><div class="eyebrow">Free decision quality tool</div><h1>Would your board paper pass seven essential checks?</h1>',
 '<p>Before your next management or board submission, assess your evidence, recommendations, risks and ownership. Download a tailored action checklist in seconds.</p>',
 '<div class="pills"><span>No sign-up</span><span>No payment</span><span>Inputs stay on this device</span><span>Downloadable plan</span></div></div></header>',
 '<main class="wrap" id="main"><div class="layout"><section class="panel"><h2>Review your draft</h2><p class="muted">Check the elements already present. This is a self-review aid, not an independent audit or professional certification.</p>',
 '<form id="audit">'+items+'<div class="actions"><button class="btn main" type="submit">Show missing elements</button><button class="btn ghost" type="reset">Clear selections</button></div></form></section>',
 '<aside class="panel"><h2>Your readiness checklist</h2><p class="muted">Number of required elements marked present</p><div id="score" aria-live="polite">0 / 7</div><div class="meter"><div id="bar"></div></div><div id="out" aria-live="polite"></div>',
 '<button type="button" class="btn ghost" id="download">Download free action plan</button>',
 '<div class="offer"><div class="eyebrow">Optional editable files</div><h3>Executive White Paper &amp; Board Briefing System</h3><div class="price">$79 USD</div>',
 '<p class="muted">One-time document package with PDF guide, Excel claims ledger and two editable Word templates. No subscription or custom consulting.</p>',
 '<a class="btn main" href="'+CHECKOUT+'" rel="noopener noreferrer">Review the $79 toolkit on Stripe</a>',
 '<p class="disclose">Start with the <a href="'+GUIDE+'">free board briefing guide</a>. Review the <a href="https://www.prismbayai.com/refunds">refund policy</a> before purchase. Delivery uses the existing PrismBay digital fulfillment route.</p></div></aside></div>',
 '<section class="panel explain"><h2>Why evidence comes before formatting</h2><p>A polished presentation cannot resolve missing source evidence, unclear decisions or incomplete mitigation plans. Use this checklist to establish the decision, compare alternatives, document assumptions and assign accountability before preparing final board materials.</p><p>The optional paid toolkit supplies editable records and templates for repeated use. The free assessment remains available without purchase.</p></section></main>',
 '<footer><div class="wrap">PrismBay Digital · <a href="https://www.prismbayai.com/contact">Support</a> · <a href="https://www.prismbayai.com/privacy">Privacy</a> · No input is sent to a server</div></footer>',
 '<script>'+script+'</script></body></html>'
 ].join('\n');
 return html;
}
export async function writeAssessment(dir='growth-reports/owned-sales-pages'){
 await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,PAGE),buildAssessment());
 return URL;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await writeAssessment(process.argv[2]);
