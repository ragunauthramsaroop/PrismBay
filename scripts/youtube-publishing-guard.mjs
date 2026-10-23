import { createHash } from 'node:crypto';
export const CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ';
export const BRAND = '6945443';
export const TIMEZONE = 'America/Guyana';
export const MIN_SPACING_MS = 4 * 60 * 60 * 1000;
export const MAX_SHORTS_PER_DAY = 2;
const RETAIL = [/prismbay\s*clean/i, /spin\s*scrubber/i, /cordless\s*pressure\s*washer/i, /garment\s*steamer/i, /home\s*cleaning/i, /utm_campaign=prismbay_clean/i, /\/scrubber\//i];
const AI = /\bAI\b|artificial intelligence|automation|agent|LLM|vendor risk|procurement|machine learning/i;
const STOP = new Set(['the','a','an','you','your','before','another','buy','buying','for','with','and','shorts','prismbay','of','in','to','on','is','this']);
function youtube(p) { return p?.providers?.some(x => x.network === 'youtube') === true; }
function status(p) { return p?.providers?.find(x => x.network === 'youtube')?.status || 'PENDING'; }
function live(p) { return youtube(p) && (status(p) === 'PUBLISHED' || (p.autoPublish === true && p.draft === false)); }
function title(p) { return String(p?.youtubeData?.title || ''); }
function body(p) { return [title(p),p?.text || '',...(p?.youtubeData?.tags || [])].join(' '); }
function isShort(p) { return String(p?.youtubeData?.type || '').toLowerCase() === 'short'; }
function localDay(p) { return String(p?.publicationDate?.dateTime || '').slice(0,10); }
function tokens(t) { return new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x => x && !STOP.has(x))); }
export function titleSimilarity(a,b) {
  const x=tokens(title(a)), y=tokens(title(b));
  const common=[...x].filter(t=>y.has(t)).length;
  return common >= 4 ? common / new Set([...x,...y]).size : 0;
}
export function fingerprint(p) {
  const data=String(p?.sha256 || p?.mediaHash || p?.media?.[0] || '');
  return createHash('sha256').update(data + '|' + title(p).trim().toLowerCase()).digest('hex');
}
export function classify(p) {
  if (!youtube(p)) return {ok:true,reason:'not-youtube'};
  if (RETAIL.some(re => re.test(body(p)))) return {ok:false,reason:'retail-content-in-ai-channel'};
  if (!AI.test(body(p))) return {ok:false,reason:'unverified-editorial-fit'};
  if (!title(p).trim() || !p.media?.length) return {ok:false,reason:'missing-title-or-media'};
  if (p.providers.length !== 1) return {ok:false,reason:'mixed-provider-requires-separate-review'};
  return {ok:true,reason:'ai-editorial-fit'};
}
export function when(p) {
  const q=p?.publicationDate;
  if (q?.timezone !== TIMEZONE || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(q?.dateTime || '')) throw Error('Invalid or non-Guyana schedule');
  const n=Date.parse(q.dateTime + '-04:00');
  if (!Number.isFinite(n)) throw Error('Invalid scheduled datetime');
  return n;
}
function mediaKey(p) { return String(p?.sha256 || p?.mediaHash || p?.media?.[0] || ''); }
function sameCreative(a,b) { return Boolean(mediaKey(a) && mediaKey(a)===mediaKey(b)) || titleSimilarity(a,b)>=0.8; }
function sameCandidateRecord(existing,candidate) {
  return Boolean((candidate?.uuid && existing?.uuid===candidate.uuid && sameCreative(existing,candidate)) ||
    (candidate?.id && existing?.id===candidate.id && sameCreative(existing,candidate)));
}
function shortLimitIssues(posts) {
  const issues=[];
  const groups=new Map();
  for(const p of posts.filter(isShort)) {
    const day=localDay(p);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const group=groups.get(day)||[];
    group.push(p);groups.set(day,group);
  }
  for(const [day,group] of groups) {
    group.sort((a,b)=>{try{return when(a)-when(b);}catch{return 0;}});
    for(const p of group.slice(MAX_SHORTS_PER_DAY))issues.push({id:p.id,day,reason:'daily-short-limit-reached'});
  }
  return issues;
}
export function audit(posts,channel=CHANNEL) {
  const issues=[];
  if(channel!==CHANNEL)issues.push({reason:'wrong-channel',channel});
  const active=posts.filter(live);
  for(const p of active) {
    const c=classify(p); if(!c.ok)issues.push({id:p.id,reason:c.reason});
    try { when(p); } catch { issues.push({id:p.id,reason:'invalid-schedule'}); }
  }
  issues.push(...shortLimitIssues(active));
  const ordered=active.filter(p=>{try {when(p);return true;}catch{return false;}}).sort((a,b)=>when(a)-when(b));
  for(let i=0;i<ordered.length;i++) for(let j=0;j<i;j++) {
    const a=ordered[j],b=ordered[i];
    if(when(b)-when(a)<MIN_SPACING_MS)issues.push({id:b.id,previous:a.id,reason:'spacing-under-four-hours'});
    if(sameCreative(a,b))issues.push({id:b.id,previous:a.id,reason:'duplicate-creative'});
  }
  return {channel,count:active.length,issues};
}
export function reviewCandidate({candidate,queue,brandSettings,fetchedAt,now=Date.now(),published=[]}) {
  const issues=[];
  const c=candidate||{};
  const connected=brandSettings?.networksData?.youtubeData;
  if(String(brandSettings?.id)!==BRAND || connected!==CHANNEL)issues.push('metricool-brand-or-channel-mismatch');
  if(c.channelId!==CHANNEL || !youtube(c))issues.push('candidate-channel-mismatch');
  if(!Number.isFinite(Date.parse(fetchedAt)) || Math.abs(now-Date.parse(fetchedAt))>120000)issues.push('stale-or-missing-queue-snapshot');
  const editorial=classify(c);if(!editorial.ok)issues.push(editorial.reason);
  let moment=NaN;try {moment=when(c);if(moment<now-60000)issues.push('candidate-time-in-past');}catch{issues.push('invalid-schedule');}
  if(!Array.isArray(queue)||!Array.isArray(published))issues.push('queue-or-published-evidence-missing');
  const others=[...(Array.isArray(queue)?queue:[]),...(Array.isArray(published)?published:[])].filter(live);
  if(isShort(c) && /^\d{4}-\d{2}-\d{2}$/.test(localDay(c))) {
    const sameDayShorts=others.filter(p=>isShort(p)&&localDay(p)===localDay(c)&&!sameCandidateRecord(p,c));
    if(sameDayShorts.length>=MAX_SHORTS_PER_DAY)issues.push('daily-short-limit-reached');
  }
  for(const p of others) {
    if(c.uuid && p.uuid===c.uuid && !sameCreative(p,c))issues.push('uuid-reused-with-new-creative');
    if(sameCandidateRecord(p,c))continue;
    if(sameCreative(p,c))issues.push('duplicate-creative');
    try {if(Math.abs(when(p)-moment)<MIN_SPACING_MS)issues.push('spacing-under-four-hours');}catch{issues.push('invalid-existing-schedule');}
  }
  return {ok:issues.length===0,issues:[...new Set(issues)],channel:CHANNEL,brandId:BRAND};
}
