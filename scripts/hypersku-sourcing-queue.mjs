import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function validateSourcingQueue(data,shortlist,nowMs=Date.now()) {
 const errors=[],ids=new Set(),links=new Set();
 const allowed=new Set((shortlist?.candidates||[]).map(x=>x.slug));
 const counts=new Map(),weeks=[];
 if(data?.schemaVersion!==1||!Array.isArray(data.requests))
  return {valid:false,errors:['invalid_queue_schema'],submitted:0,readyToSubmit:0};
 // The research queue must never authorize paid sourcing, automatic uploads or physical checkout.
 // Reject non-boolean and string-encoded authorizations as well as positive flags.
 // Only absent, false, or numeric zero are unambiguously disabled.
 const disabled=value=>value===undefined||value===false||value===0;
 if(!disabled(data?.requestQuota?.paidLinksAuthorized)||!disabled(data?.paidLinksAuthorized))
  errors.push('paid_sourcing_not_authorized');
 const executionKeys=['orderImportAuthorized','physicalCheckoutEnabled',
  'automaticallySubmitted','manualCsvOrdersEnabled',
  'manualCsvOrderSubmissionAuthorized','walletFundingAuthorized',
  'automaticOrdersEnabled'];
 const unsafeExecution=scope=>executionKeys.some(key=>!disabled(scope?.[key]));
 // Quota metadata is not an authority to order, import, charge, or enable checkout.
 if(unsafeExecution(data)||unsafeExecution(data.requestQuota))
  errors.push('unsafe_execution_flag');
 for(const row of data.requests){
  // Malformed entries must produce an auditable rejection, not crash the readiness gate.
  if(!row||typeof row!=='object'||Array.isArray(row)){
   errors.push('invalid_sourcing_request');
   continue;
  }
  // Per-request flags must never override queue-wide no-spend controls.
  if(!disabled(row?.paidLinksAuthorized))errors.push('paid_sourcing_not_authorized');
  if(unsafeExecution(row))errors.push('unsafe_execution_flag');
  if(!allowed.has(row.slug))errors.push('unknown_slug');
  if(ids.has(row.slug))errors.push('duplicate_product_slug');
  ids.add(row.slug);
  const url=String(row.aliExpressUrl||'');
  const good=/^https:\/\/(?:www\.)?aliexpress\.com\/item\/[0-9]{8,25}\.html$/.test(url);
  if(!good)errors.push('invalid_direct_aliexpress_item_url');
  if(links.has(url))errors.push('duplicate_product_link');
  links.add(url);
  const state=String(row.status||'');
  if(!['candidate','ready_to_submit','submitted','quote_received','no_source'].includes(state))
   errors.push('invalid_sourcing_state');
  if(['submitted','quote_received','no_source'].includes(state)){
   const submittedAt=String(row.submittedAt||'');
   const day=submittedAt.slice(0,10);
   const date=Date.parse(submittedAt);
   // Strict UTC ISO dates reject rollover dates and ambiguous local timestamps.
   const isUtc=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(submittedAt);
   const canonical=isUtc&&Number.isFinite(date)&&
    new Date(date).toISOString()===(submittedAt.includes('.')?submittedAt:submittedAt.replace('Z','.000Z'));
   if(!canonical)errors.push('missing_valid_submission_timestamp');
   else if(date>nowMs)errors.push('future_submission_timestamp');
   else {counts.set(day,(counts.get(day)||0)+1);weeks.push(date);}
  }else if(row.submittedAt)errors.push('unsubmitted_request_must_not_claim_submission');
 }
 for(const [day,n] of counts)if(n>3)errors.push('free_daily_sourcing_limit_exceeded:'+day);
 // Public HyperSKU pricing states three free sourcing requests within 48h,
 // which is stricter than the chat-agent's three-per-day wording.
 for(const t of weeks)if(weeks.filter(u=>u>=t&&u<t+48*3600000).length>3)
  {errors.push('free_48hour_sourcing_limit_exceeded');break;}
 for(const t of weeks)if(weeks.filter(u=>u>=t&&u<t+7*86400000).length>10)
  {errors.push('free_weekly_sourcing_limit_exceeded');break;}
 // Never advertise actionable sourcing readiness from an invalid queue.
 // Preserve the diagnostic errors, but fail closed on both activity counters.
 const valid=errors.length===0;
 return {valid,errors:[...new Set(errors)],
  submitted:valid?weeks.length:0,
  readyToSubmit:valid?data.requests.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.status==='ready_to_submit').length:0,
  automaticallySubmitted:0,paidLinksAuthorized:false,
  orderImportAuthorized:false,physicalCheckoutEnabled:false};
}
export async function run(){
 const [q,c]=await Promise.all([
  fs.readFile('config/hypersku-sourcing-queue.json','utf8').then(JSON.parse),
  fs.readFile('config/top15-merchandising.json','utf8').then(JSON.parse)
 ]);
 const r=validateSourcingQueue(q,c);
 console.log(JSON.stringify(r));
 if(!r.valid)process.exitCode=1;
 return r;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
