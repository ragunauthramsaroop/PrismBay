import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function validateSourcingQueue(data,shortlist) {
 const errors=[],ids=new Set(),links=new Set();
 const allowed=new Set((shortlist?.candidates||[]).map(x=>x.slug));
 const counts=new Map(),weeks=[];
 if(data?.schemaVersion!==1||!Array.isArray(data.requests))
  return {valid:false,errors:['invalid_queue_schema'],submitted:0,readyToSubmit:0};
 for(const row of data.requests){
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
   const day=String(row.submittedAt||'').slice(0,10);
   const date=Date.parse(String(row.submittedAt||''));
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(date))
    errors.push('missing_valid_submission_timestamp');
   else {counts.set(day,(counts.get(day)||0)+1);weeks.push(date);}
  }else if(row.submittedAt)errors.push('unsubmitted_request_must_not_claim_submission');
 }
 for(const [day,n] of counts)if(n>3)errors.push('free_daily_sourcing_limit_exceeded:'+day);
 for(const t of weeks)if(weeks.filter(u=>u>=t&&u<t+7*86400000).length>10)
  {errors.push('free_weekly_sourcing_limit_exceeded');break;}
 return {valid:errors.length===0,errors:[...new Set(errors)],
  submitted:weeks.length,readyToSubmit:data.requests.filter(x=>x.status==='ready_to_submit').length,
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
