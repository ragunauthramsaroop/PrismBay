import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, ChevronRight, Clapperboard, Code2, CreditCard, FolderKanban, HelpCircle, LayoutDashboard, Layers3, LifeBuoy, Menu, Megaphone, Palette, Presentation, Search, ShieldCheck, ShoppingBag, Sparkles, WandSparkles, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import StudioDashboard from '~/components/creative-studio/StudioDashboard';
import StudioWorkbench from '~/components/creative-studio/StudioWorkbench';
import { makePack } from '~/lib/creative-offer';
import type { Brief, Pack } from '~/lib/creative-offer';
import { addDraft, newDraft, parseDrafts, STORAGE_KEY, STARTER_TEMPLATES } from '~/lib/creative-workspace';
import type { Palette, StarterTemplate, StudioDraft, StudioTool } from '~/lib/creative-workspace';

export const Route = createFileRoute('/creative-studio')({
 head:()=>({
  meta:[
   {title:'PrismBay Creative Studio | Campaigns, Ads, Websites and Presentations'},
   {name:'description',content:'Your creative workspace: generate campaign copy, video storyboards, presentation outlines, responsive website drafts and original SVG brand graphics. Save local drafts and download files without an account.'},
   {property:'og:title',content:'PrismBay AI Creative Studio'},
   {property:'og:description',content:'One business brief. Campaigns, storyboards, presentations, websites and brand artwork.'},
   {property:'og:type',content:'website'},
   {property:'og:url',content:'https://www.prismbayai.com/creative-studio'}
  ],
  links:[{rel:'canonical',href:'https://www.prismbayai.com/creative-studio'}]
 }),
 component:CreativeStudio
});

type Item={key:StudioTool;label:string;icon:LucideIcon};
const navGroups:{label:string;items:Item[]}[]=[
 {label:'Workspace',items:[
  {key:'dashboard',label:'Dashboard',icon:LayoutDashboard},
  {key:'create',label:'Create Content',icon:WandSparkles},
  {key:'video',label:'Video Ad Studio',icon:Clapperboard},
  {key:'presentations',label:'Presentations',icon:Presentation},
  {key:'website',label:'Website Builder',icon:Code2},
  {key:'campaign',label:'Campaign Planner',icon:Megaphone},
  {key:'brand',label:'Brand Assets',icon:Palette},
  {key:'projects',label:'My Projects',icon:FolderKanban}
 ]},
 {label:'Operations',items:[
  {key:'agents',label:'Automation Agents',icon:Bot},
  {key:'marketplace',label:'Marketplace',icon:ShoppingBag},
  {key:'billing',label:'Billing & Orders',icon:CreditCard},
  {key:'support',label:'Support',icon:LifeBuoy}
 ]}
];
const names:Record<StudioTool,string>={
 dashboard:'Dashboard',create:'Create Content',video:'Video Ad Studio',
 presentations:'Presentations',website:'Website Builder',campaign:'Campaign Planner',
 brand:'Brand Assets',projects:'My Projects',agents:'Automation Agents',
 marketplace:'Marketplace',billing:'Billing & Orders',support:'Support'
};
const starter:Brief={
 brand:'Your company',
 offer:'Professional marketing and communication services',
 audience:'business owners and project teams',
 outcome:'clearer customer engagement',
 proof:'',
 channel:'LinkedIn'
};
function Sidebar({view,open,close,mobile}:{view:StudioTool;open:(v:StudioTool)=>void;close:()=>void;mobile:boolean}){
 return <>
  {mobile?<button className="fixed inset-0 z-[69] bg-slate-950/60 lg:hidden" aria-label="Close navigation" onClick={close}/>:null}
  <aside className={'fixed inset-y-0 left-0 z-[70] flex w-[260px] flex-col bg-[#09192d] text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 '+(mobile?'translate-x-0':'-translate-x-full')}>
   <div className="flex h-[82px] items-center justify-between border-b border-white/10 px-5">
    <Link to="/" onClick={close} className="flex items-center gap-3 no-underline">
     <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-950/30"><Layers3 className="text-white" size={25}/></div>
     <div><span className="block text-xl font-extrabold tracking-tight text-white">PrismBay</span><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300">AI Creative Studio</span></div>
    </Link>
    <button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close sidebar"><X size={20}/></button>
   </div>
   <nav aria-label="Creative Studio navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
    {navGroups.map(group=><div key={group.label}><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-slate-500">{group.label}</p><div className="space-y-1">{group.items.map(item=><button key={item.key} onClick={()=>open(item.key)} aria-current={view===item.key?'page':undefined} className={'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition-colors '+(view===item.key?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-950/25':'text-slate-300 hover:bg-white/10 hover:text-white')}><item.icon size={18} strokeWidth={1.9}/><span className="flex-1">{item.label}</span>{view===item.key?<ChevronRight size={14} className="opacity-70"/>:null}</button>)}</div></div>)}
   </nav>
   <div className="border-t border-white/10 p-4"><div className="rounded-xl border border-white/10 bg-white/[.06] p-4"><div className="flex items-center gap-2 text-amber-300"><Sparkles size={16}/><span className="text-xs font-bold">Professional production</span></div><p className="mt-2 text-xs leading-5 text-slate-300">Turn your draft into a quoted, approved client deliverable.</p><button onClick={()=>open('marketplace')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-400">Explore services <ArrowRight size={14}/></button></div><Link to="/" className="mt-4 flex items-center gap-2 px-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={14}/> Back to PrismBay</Link></div>
  </aside>
 </>;
}
function CreativeStudio(){
 const [view,setView]=useState<StudioTool>('dashboard');
 const [mobile,setMobile]=useState(false);
 const [search,setSearch]=useState('');
 const [brief,setRawBrief]=useState<Brief>(starter);
 const [pack,setPack]=useState<Pack|null>(null);
 const [drafts,setDrafts]=useState<StudioDraft[]>([]);
 const [current,setCurrent]=useState<StudioDraft|null>(null);
 const [palette,setPalette]=useState<Palette>('ocean');
 const [hydrated,setHydrated]=useState(false);
 const [storageError,setStorageError]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  try {setDrafts(parseDrafts(window.localStorage.getItem(STORAGE_KEY)));}
  catch {setStorageError(true);}
  setHydrated(true);
 },[]);
 useEffect(()=>{
  if(!hydrated)return;
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));setStorageError(false);}
  catch{setStorageError(true);}
 },[drafts,hydrated]);
 const open=(next:StudioTool)=>{setView(next);setMobile(false);setError('');window.scrollTo({top:0,behavior:'smooth'});};
 const updateBrief=(next:Brief)=>{
  setRawBrief(next);setPack(null);setCurrent(null);setError('');
 };
 const generate=()=>{
  try{
   const p=makePack(brief);
   const d=newDraft(brief);
   setPack(p);setCurrent(d);setDrafts(prev=>addDraft(prev,d));setError('');
  }catch(e){setError(e instanceof Error?e.message:'Please review your project brief.');}
 };
 const load=(d:StudioDraft)=>{
  try{setRawBrief(d.brief);setPack(makePack(d.brief));setCurrent(d);open('create');}
  catch{setError('This draft has invalid data. Please create a new brief.');}
 };
 const remove=(d:StudioDraft)=>{
  setDrafts(old=>old.filter(x=>x.id!==d.id));
  if(current?.id===d.id){setCurrent(null);setPack(null);}
 };
 const duplicate=(d:StudioDraft)=>{
  const item=newDraft(d.brief);
  setDrafts(old=>addDraft(old,item));
  setRawBrief(item.brief);setCurrent(item);setPack(makePack(item.brief));open('create');
 };
 const template=(t:StarterTemplate)=>{
  updateBrief({...t.brief});
  const route:StudioTool=t.category==='Video'?'video':t.category==='Presentation'?'presentations':t.category==='Website'?'website':t.category==='Brand'?'brand':'campaign';
  open(route);
 };
 const searchInput=(q:string)=>{setSearch(q.slice(0,90));if(q&&view!=='dashboard')setView('dashboard');};
 const [homeTemplatesCount]=useState(STARTER_TEMPLATES.length);
 return <div className="min-h-screen bg-[#f5f7fb] font-sans text-slate-800">
  <Sidebar view={view} open={open} close={()=>setMobile(false)} mobile={mobile}/>
  <div className="min-w-0 lg:pl-[260px]">
   <header className="sticky top-0 z-40 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/95 px-5 py-3 backdrop-blur-xl sm:px-8">
    <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={()=>setMobile(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"><Menu size={23}/></button><div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex"><span>Workspace</span><ChevronRight size={14}/><span className="font-semibold text-slate-900">{names[view]}</span></div><span className="text-sm font-bold text-slate-900 sm:hidden">{names[view]}</span></div>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:flex-none">
     <label className="relative block min-w-0 flex-1 sm:w-[270px] sm:flex-none"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>searchInput(e.target.value)} aria-label="Search templates and projects" placeholder="Search projects, templates..." className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></label>
     <button onClick={()=>open('support')} aria-label="Help and support" title="Help and support" className="hidden rounded-full p-2 text-slate-600 hover:bg-slate-100 sm:inline-flex"><HelpCircle size={20}/></button>
     <button onClick={()=>open('projects')} aria-label="My local drafts" title="My projects" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">P</button>
    </div>
   </header>
   {storageError?<div role="status" className="border-b border-amber-200 bg-amber-50 px-7 py-3 text-xs text-amber-950">Browser storage is unavailable. Generated work remains in this tab only. Download your files before leaving.</div>:null}
   <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-7 sm:py-8 2xl:px-9">
    {view==='dashboard'?<StudioDashboard drafts={drafts} search={search} open={open} choose={template} load={load}/>:<StudioWorkbench view={view} brief={brief} setBrief={updateBrief} pack={pack} drafts={drafts} current={current} palette={palette} setPalette={setPalette} generate={generate} load={load} remove={remove} duplicate={duplicate} open={open} error={error}/>}
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] text-slate-500"><span>© 2026 PrismBay Creative Studio · Free local planning tools · {homeTemplatesCount} starter templates</span><span className="flex items-center gap-1"><ShieldCheck size={13}/> No paid AI models connected or automatic payments</span></footer>
   </div>
  </div>
 </div>;
}
