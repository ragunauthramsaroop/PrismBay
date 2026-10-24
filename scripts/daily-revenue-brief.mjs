import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

/* Guyana observes UTC-04:00 year-round. Align reporting to 00:00-24:00 Guyana time. */
const GUYANA_OFFSET_MS = 4*60*60*1000;
const DAY_MS = 24*60*60*1000;
const ASSESSMENT = 'https://clean.prismbayai.com/learn/board-briefing-readiness-checklist.html';
const BUYER_HUB = 'https://clean.prismbayai.com/learn/';
const STORE = 'https://clean.prismbayai.com/digital/';
const REPO = 'ragunauthramsaroop/PrismBay';

export function previousGuyanaDay(now=new Date()){
 const shifted=new Date(now.getTime()-GUYANA_OFFSET_MS);
 shifted.setUTCHours(0,0,0,0);
 const endUtc=shifted.getTime()+GUYANA_OFFSET_MS;
 const startUtc=endUtc-DAY_MS;
 return {day:new Date(startUtc-GUYANA_OFFSET_MS).toISOString().slice(0,10),
   start:Math.floor(startUtc/1000),end:Math.floor(endUtc/1000)};
}
export function summarizeCharges(charges){
 if(!Array.isArray(charges))throw new TypeError('Stripe charge array required');
 const totals={};
 let successCount=0;
 for(const c of charges){
  if(!c || c.livemode!==true || c.status!=='succeeded' || c.paid!==true)continue;
  if(!Number.isSafeInteger(c.amount) || c.amount<0 || !Number.isSafeInteger(c.amount_refunded)||c.amount_refunded<0||c.amount_refunded>c.amount)continue;
  const cur=String(c.currency||'').toUpperCase();
  if(!/^[A-Z]{3}$/.test(cur))continue;
  if(!totals[cur])totals[cur]={grossMinor:0,refundedMinor:0,netAfterRefundsMinor:0,successfulCharges:0};
  totals[cur].grossMinor+=c.amount;
  totals[cur].refundedMinor+=c.amount_refunded;
  totals[cur].netAfterRefundsMinor+=c.amount-c.amount_refunded;
  totals[cur].successfulCharges++;
  successCount++;
 }
 return {successfulCharges:successCount,totals};
}
function validChargeKey(secret){
 return typeof secret==='string' && (/^(sk_live_|rk_live_)/).test(secret) && secret.length>20;
}
export async function readStripe(window,{apiKey,fetchImpl=fetch,maxPages=15}={}){
 if(!validChargeKey(apiKey))return {state:'NOT_CONNECTED',reason:'Missing configured live Stripe read credential. No payment totals inferred.'};
 const entries=[];
 let startingAfter='';
 try{
  for(let page=0;page<maxPages;page++){
   const u=new URL('https://api.stripe.com/v1/charges');
   u.searchParams.set('created[gte]',String(window.start));
   u.searchParams.set('created[lt]',String(window.end));
   u.searchParams.set('limit','100');
   if(startingAfter)u.searchParams.set('starting_after',startingAfter);
   const response=await fetchImpl(u.toString(),{
    headers:{authorization:'Bearer '+apiKey,accept:'application/json'},
    redirect:'error',signal:AbortSignal.timeout(15000)
   });
   if(!response.ok)return {state:'UNAVAILABLE',reason:'Stripe returned HTTP '+response.status+'; payment totals not established.'};
   const data=await response.json();
   if(!Array.isArray(data.data)||typeof data.has_more!=='boolean')return {state:'UNAVAILABLE',reason:'Invalid Stripe response; no totals reported.'};
   entries.push(...data.data);
   if(!data.has_more)return {state:'VERIFIED',...summarizeCharges(entries),scanned:entries.length};
   const id=data.data.at(-1)?.id;
   if(!id || typeof id!=='string' || id===startingAfter)return {state:'INCOMPLETE',reason:'Pagination cannot continue. Omitted payment totals.'};
   startingAfter=id;
  }
  return {state:'INCOMPLETE',reason:'More Stripe payment records than safe report pagination allows. No total claimed.'};
 }catch{return {state:'UNAVAILABLE',reason:'Stripe could not be reached. No totals claimed.'};}
}
export async function checkPublicPage(url,{fetchImpl=fetch}={}){
 try{
  const response=await fetchImpl(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(14000),
   headers:{'user-agent':'PrismBay-Daily-Revenue-Brief/1.0'}});
  return {state:response.ok?'ONLINE':'ERROR',httpStatus:response.status};
 }catch{return {state:'UNKNOWN',httpStatus:null};}
}
export async function latestBuyerWorkflow({token,fetchImpl=fetch}={}){
 if(!token)return {state:'NOT_CONNECTED'};
 try{
  const u='https://api.github.com/repos/'+REPO+'/actions/workflows/buyer-acquisition.yml/runs?branch=main&per_page=12';
  const response=await fetchImpl(u,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{
   authorization:'Bearer '+token,accept:'application/vnd.github+json','user-agent':'PrismBay-Daily-Brief'
  }});
  if(!response.ok)return {state:'UNKNOWN',httpStatus:response.status};
  const data=await response.json();
  const relevant=(data.workflow_runs||[]).find(x=>['schedule','workflow_dispatch','push'].includes(x.event));
  if(!relevant)return {state:'NO_RUN'};
  if(relevant.status!=='completed')return {state:'IN_PROGRESS',createdAt:relevant.created_at};
  return {state:relevant.conclusion==='success'?'PASS':'FAIL',createdAt:relevant.created_at,
   result:relevant.conclusion||'unknown',url:relevant.html_url};
 }catch{return {state:'UNKNOWN'};}
}
function money(minor,currency){
 return (minor/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+currency;
}
export function buildDailyBrief({window,stripe,pages,workflow}){
 const status=stripe.state;
 const lines=[
  '<!-- prismbay-daily:'+window.day+' -->',
  '# PrismBay Daily Revenue Brief: '+window.day,
  '',
  'Report period: '+new Date(window.start*1000).toISOString()+' to '+new Date(window.end*1000).toISOString()+' (midnight-to-midnight Guyana time).',
  '',
  '## Financial verification',
  'Stripe reporting: **'+status+'**'
 ];
 if(status==='VERIFIED'){
  lines.push('Successful live charges: **'+stripe.successfulCharges+'**');
  if(Object.keys(stripe.totals).length===0)lines.push('No successful live charges were returned for this reporting period.');
  for(const [currency,t] of Object.entries(stripe.totals)){
   lines.push('- '+currency+': gross '+money(t.grossMinor,currency)+', refunds '+money(t.refundedMinor,currency)+', after refunds '+money(t.netAfterRefundsMinor,currency)+', charges '+t.successfulCharges+'.');
  }
  lines.push('After-refunds totals exclude processing fees, expenses and other adjustments. They are not net profit.');
 }else{
  lines.push('Confirmed revenue and customer count: **UNMEASURED**, not zero.');
  lines.push(stripe.reason||'No verified payment access.');
 }
 lines.push('','## Sales path and jobs');
 for(const [label,url] of [['Free assessment',ASSESSMENT],['Buyer guide hub',BUYER_HUB],['Digital store',STORE]]){
  const p=pages[url]||{state:'UNKNOWN'};
  lines.push('- '+label+': '+p.state+(p.httpStatus?' (HTTP '+p.httpStatus+')':'')+' | '+url);
 }
 lines.push('- GitHub buyer-acquisition job: '+workflow.state+(workflow.result?' ('+workflow.result+')':'')+(workflow.url?' | '+workflow.url:''));
 lines.push('','## Commercial controls',
  '- Unique external visitors: **UNMEASURED** unless an authorized analytics source supplies distinct human sessions.',
  '- Order-bound digital delivery: **NOT VERIFIED**; retain issue #421 as the fulfillment gate.',
  '- Failed or expired checkout sessions are not sales.',
  '- This report does not send marketing messages, alter prices, charge cards or access buyers personal data.',
  '',
  '## Single next action');
 let action='Review the assessment page and distribute one useful educational post through an already authorized channel.';
 if(stripe.state!=='VERIFIED')action='Add a restricted live Stripe read-only key as the GitHub repository secret PRISMBAY_STRIPE_REPORTING_KEY so this scheduled report can verify genuine paid charges.';
 else if(Object.values(pages).some(p=>p.state!=='ONLINE'))action='Repair the failing public buyer page before promotion.';
 else if(workflow.state==='FAIL')action='Review the failing buyer-acquisition workflow and fix its root cause.';
 else if(stripe.successfulCharges>0)action='Verify each paid order was fulfilled through an order-specific protected download, and reconcile refunds and support.';
 lines.push(action);
 lines.push('','Source: GitHub Actions daily scheduled check. Financial figures appear only if the live Stripe API returned complete verified data.');
 return lines.join('\n')+'\n';
}
/** Public repo: publish only categorical evidence, no Stripe revenue, IDs or customer information. */
export function buildPublicBrief({window,stripe,pages,workflow}){
 const paid=stripe.state==='VERIFIED'?(stripe.successfulCharges>0?'PAID_ACTIVITY_DETECTED':'NO_PAID_ACTIVITY_IN_PERIOD'):'NOT_VERIFIED';
 const links=Object.entries(pages).map(([url,p])=>'- '+url+': '+p.state+(p.httpStatus?' (HTTP '+p.httpStatus+')':''));
 return [
  '<!-- prismbay-daily:'+window.day+' -->',
  '# PrismBay Daily Sales Status: '+window.day,
  '',
  'Public-safe operational report; confidential payment amounts and buyer records are never placed in this issue.',
  '',
  '- Live Stripe verification: **'+stripe.state+'**',
  '- Paid activity during the reporting period: **'+paid+'**',
  '- Buyer-acquisition workflow: **'+workflow.state+'**',
  '- Independent human traffic measurement: **NOT_CONNECTED**',
  '- Order-bound delivery verification: **NOT_VERIFIED**',
  '',
  '## Public buyer pages',
  ...links,
  '',
  '## Next step',
  stripe.state==='NOT_CONNECTED'?'Configure a restricted Stripe live read key as the repository secret PRISMBAY_STRIPE_REPORTING_KEY. Without the secret, payment status is unknown.':
   paid==='PAID_ACTIVITY_DETECTED'?'Review the private Stripe dashboard, validate refunds and verify secure order-specific delivery.':'Improve qualified educational distribution and measure real buyer traffic without paid spend.',
  '',
  'Dashboard run details: https://github.com/'+REPO+'/actions/workflows/prismbay-daily-sales-brief.yml',
  'A successful workflow is not evidence of sales. This public issue intentionally omits financial totals.'
 ].join('\n')+'\n';
}
export async function run({now=new Date(),env=process.env,fetchImpl=fetch}={}){
 const window=previousGuyanaDay(now);
 const stripe=await readStripe(window,{apiKey:env.PRISMBAY_STRIPE_REPORTING_KEY,fetchImpl});
 const pageEntries=await Promise.all([ASSESSMENT,BUYER_HUB,STORE].map(async url=>[url,await checkPublicPage(url,{fetchImpl})]));
 const pages=Object.fromEntries(pageEntries);
 const workflow=await latestBuyerWorkflow({token:env.GITHUB_TOKEN,fetchImpl});
 const markdown=buildDailyBrief({window,stripe,pages,workflow});
 await fs.mkdir('growth-reports',{recursive:true});
 await fs.writeFile('growth-reports/daily-revenue-brief.md',markdown);
 await fs.writeFile('growth-reports/daily-revenue-public.md',buildPublicBrief({window,stripe,pages,workflow}));
 await fs.writeFile('growth-reports/daily-revenue-brief.json',JSON.stringify({
  day:window.day,period:{start:window.start,end:window.end},stripe,pages,workflow
 },null,2)+'\n');
 console.log(JSON.stringify({status:'REPORT_CREATED',day:window.day,stripeStatus:stripe.state,acquisitionWorkflow:workflow.state,
  assessment:pages[ASSESSMENT]?.state}));
 return {window,stripe,pages,workflow,markdown};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
