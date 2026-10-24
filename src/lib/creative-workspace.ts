import { escapeHtml, makePack } from './creative-offer';
import type { Brief, Channel } from './creative-offer';

/** Local-only user drafts; no account sync or server persistence. */
export type StudioDraft = { id: string; createdAt: string; updatedAt: string; brief: Brief };
export type StudioTool = 'dashboard' | 'create' | 'video' | 'presentations' | 'website' | 'campaign' | 'brand' | 'projects' | 'agents' | 'marketplace' | 'billing' | 'support';
export const STORAGE_KEY = 'prismbay_creative_studio_drafts_v1';
export const MAX_DRAFTS = 18;

export type StarterTemplate = { id: string; title: string; category: string; description: string; brief: Brief; tint: string };
const base = (brand:string,offer:string,audience:string,outcome:string,channel:Channel):Brief=>({brand,offer,audience,outcome,channel,proof:''});
export const STARTER_TEMPLATES:StarterTemplate[] = [
 {id:'product',title:'Product Launch',category:'Video',description:'A clean product reveal with a 30-second ad script.',tint:'from-rose-100 to-orange-50',brief:base('Example Brand','a new everyday product','online shoppers','helping shoppers understand its intended use','Instagram')},
 {id:'leadership',title:'Executive Presentation',category:'Presentation',description:'A six-slide decision-focused business presentation.',tint:'from-sky-100 to-indigo-50',brief:base('Example Organization','a strategic transformation proposal','senior decision makers','a clearer investment decision','LinkedIn')},
 {id:'website',title:'Service Landing Page',category:'Website',description:'A responsive service landing page and launch copy.',tint:'from-emerald-100 to-cyan-50',brief:base('Example Studio','professional website design','small business owners','clearer online service inquiries','Facebook')},
 {id:'community',title:'Community Campaign',category:'Campaign',description:'Communicate a social initiative with evidence-first copy.',tint:'from-amber-100 to-yellow-50',brief:base('Example Community Team','a community development initiative','community stakeholders','clearer understanding of project goals','Facebook')},
 {id:'brand',title:'Brand Announcement',category:'Brand',description:'A reusable announcement visual and promotional narrative.',tint:'from-violet-100 to-fuchsia-50',brief:base('Example Collective','a new brand announcement','prospective business clients','greater awareness of its services','LinkedIn')},
 {id:'social',title:'Social Video Script',category:'Video',description:'Four-shot short-video storyboard with a CTA.',tint:'from-blue-100 to-teal-50',brief:base('Example Creator','a practical service demonstration','interested customers','better product understanding','TikTok')}
];

/** Accept only known shapes and small valid briefs from potentially corrupted local storage. */
export function parseDrafts(raw:string|null):StudioDraft[] {
 if (!raw || raw.length > 180000) return [];
 try {
  const parsed:unknown=JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  const valid:StudioDraft[]=[];
  for (const item of parsed.slice(0,MAX_DRAFTS)) {
   if (!item || typeof item!=='object') continue;
   const x=item as Record<string,unknown>;
   if (typeof x.id!=='string' || !/^[a-zA-Z0-9_-]{3,90}$/.test(x.id)) continue;
   if (!x.brief || typeof x.brief!=='object') continue;
   const b=x.brief as Record<string,unknown>;
   if (!['brand','offer','audience','outcome','proof','channel'].every(k=>typeof b[k]==='string')) continue;
   if ([b.brand,b.offer,b.audience,b.outcome,b.proof].some(v=>(v as string).length>350)) continue;
   try { makePack(b as Brief); } catch { continue; }
   if (typeof x.createdAt!=='string' || typeof x.updatedAt!=='string') continue;
   if (!Number.isFinite(Date.parse(x.createdAt)) || !Number.isFinite(Date.parse(x.updatedAt))) continue;
   valid.push({id:x.id,createdAt:x.createdAt,updatedAt:x.updatedAt,brief:b as Brief});
  }
  return valid;
 } catch { return []; }
}
export function addDraft(existing:StudioDraft[], draft:StudioDraft):StudioDraft[]{
 return [draft,...existing.filter(x=>x.id!==draft.id)].slice(0,MAX_DRAFTS);
}
export function safeFileName(label:string):string{
 return label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'prismbay-project';
}
export type Palette='ocean'|'sunset'|'forest'|'plum';
export const PALETTES:Record<Palette,{first:string;second:string;accent:string}>={
 ocean:{first:'#0d2849',second:'#2153bc',accent:'#8de7f5'},
 sunset:{first:'#46173e',second:'#f05452',accent:'#ffdeb8'},
 forest:{first:'#082f35',second:'#16887b',accent:'#c9f7ca'},
 plum:{first:'#31134e',second:'#9156d9',accent:'#f9d4ff'}
};
const xml=(text:string)=>escapeHtml(text.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,95));
/** Creates an original editable SVG brand card. Browser image previews do not execute SVG scripts. */
export function brandCardSvg(brief:Brief,palette:Palette='ocean'):string {
 const c=PALETTES[palette]??PALETTES.ocean;
 const brand=xml(brief.brand||'Your brand');
 const parts=(brief.offer||'Your message').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,85).split(/\s+/);
 const lines:string[]=[];
 for(const word of parts){
  const last=lines.length-1;
  if(last>=0 && (lines[last]+' '+word).length<=28) lines[last]+=' '+word;
  else if(lines.length<3) lines.push(word.slice(0,28));
 }
 const headings=lines.slice(0,3).map((s,i)=>'<text x="90" y="'+(415+i*72)+'" fill="#ffffff" font-size="57" font-weight="800" font-family="Arial, sans-serif">'+xml(s)+'</text>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="Brand announcement concept"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+c.first+'"/><stop offset="1" stop-color="'+c.second+'"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1050" cy="190" r="270" fill="'+c.accent+'" opacity=".13"/><circle cx="980" cy="510" r="220" fill="#fff" opacity=".06"/><path d="M720 675 L1200 260 L1200 675 Z" fill="#ffffff" opacity=".06"/><rect x="90" y="92" width="54" height="7" rx="3" fill="'+c.accent+'"/><text x="90" y="150" fill="'+c.accent+'" font-size="31" letter-spacing="4" font-family="Arial,sans-serif">'+brand+'</text>'+headings+'<rect x="90" y="606" width="150" height="3" fill="'+c.accent+'"/><text x="260" y="615" fill="#ffffff" opacity=".84" font-size="20" font-family="Arial,sans-serif">CONCEPT • REVIEW BEFORE PUBLISHING</text></svg>';
}
export function newDraft(brief:Brief,now=new Date(),id?:string):StudioDraft{
 const uid=id??(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now())+'_'+String(Math.floor(Math.random()*1000000)));
 return {id:uid,createdAt:now.toISOString(),updatedAt:now.toISOString(),brief};
}
