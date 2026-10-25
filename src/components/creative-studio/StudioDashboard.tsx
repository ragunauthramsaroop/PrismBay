import { ArrowRight, ArrowUpRight, Bot, Clapperboard, Code2, FileText, FolderKanban, Layers3, Megaphone, MonitorPlay, Palette, Play, Presentation, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StudioDraft, StudioTool, StarterTemplate } from '~/lib/creative-workspace';
import { STARTER_TEMPLATES } from '~/lib/creative-workspace';

type Props={
 drafts:StudioDraft[];
 search:string;
 open:(tool:StudioTool)=>void;
 choose:(template:StarterTemplate)=>void;
 load:(draft:StudioDraft)=>void;
};

const tools:{tool:StudioTool;name:string;description:string;icon:LucideIcon;gradient:string;iconColor:string;tag:string}[]=[
 {tool:'video',name:'Video Ad Studio',description:'Build a 30-second storyboard and creative brief.',icon:Clapperboard,gradient:'from-pink-100 via-rose-50 to-white',iconColor:'bg-pink-500',tag:'Storyboard'},
 {tool:'presentations',name:'AI Presentations',description:'Prepare six executive slides with key messages.',icon:Presentation,gradient:'from-orange-100 via-amber-50 to-white',iconColor:'bg-orange-500',tag:'Slide outline'},
 {tool:'website',name:'Website Builder',description:'Preview and export responsive landing-page HTML.',icon:Code2,gradient:'from-sky-100 via-blue-50 to-white',iconColor:'bg-sky-500',tag:'HTML export'},
 {tool:'campaign',name:'Campaign Planner',description:'Create social copy, headlines and a rollout plan.',icon:Megaphone,gradient:'from-emerald-100 via-green-50 to-white',iconColor:'bg-emerald-500',tag:'Campaign pack'},
 {tool:'brand',name:'Brand Assets',description:'Generate an original downloadable SVG artwork.',icon:Palette,gradient:'from-violet-100 via-purple-50 to-white',iconColor:'bg-violet-500',tag:'SVG artwork'}
];

function TemplateArt({item}:{item:StarterTemplate}){
 const Icon=item.category==='Video'?Play:item.category==='Presentation'?Presentation:item.category==='Website'?MonitorPlay:item.category==='Campaign'?Megaphone:item.category==='Brand'?Palette:FileText;
 return <div className={'relative flex h-32 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br '+item.tint}>
  <div aria-hidden="true" className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[25px] border-white/35"/>
  <div aria-hidden="true" className="absolute -bottom-14 -left-6 h-36 w-36 rounded-full bg-white/25"/>
  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-lg shadow-slate-300/30"><Icon size={32} className="text-slate-800"/></div>
  <span className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700">{item.category}</span>
 </div>;
}
export default function StudioDashboard({drafts,search,open,choose,load}:Props){
 const visibleTemplates=STARTER_TEMPLATES.filter(t=>[t.title,t.description,t.category].join(' ').toLowerCase().includes(search.toLowerCase()));
 const visibleDrafts=drafts.filter(d=>[d.brief.brand,d.brief.offer,d.brief.audience].join(' ').toLowerCase().includes(search.toLowerCase())).slice(0,4);
 return <div className="space-y-7 pb-14">
  <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-r from-[#081f3d] via-[#103778] to-[#385fe4] p-7 text-white shadow-[0_24px_55px_-30px_rgba(7,35,89,.65)] sm:p-10">
   <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-[-1] h-full w-[60%] opacity-80" viewBox="0 0 740 400" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="pbHeroSky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5597ec"/><stop offset="1" stopColor="#172f7a"/></linearGradient></defs><rect width="740" height="400" fill="url(#pbHeroSky)"/><circle cx="525" cy="115" r="95" fill="#ffffff" opacity=".12"/><path d="M0 275L75 213l62 49 122-144 102 117 98-86 129 120 152-116v247H0Z" fill="#234c87" opacity=".85"/><path d="M0 331l119-93 120 92 114-104 74 61 110-106 203 123v96H0Z" fill="#113e64" opacity=".89"/><path d="M0 358l132-38 95 36 103-48 133 49 106-62 171 70v35H0Z" fill="#082f52"/><path d="M515 265v-101m-14 10h27l-14-16-13 16M482 270h65m-33-12V145" stroke="#bbdefa" strokeWidth="5" opacity=".55"/><path d="M443 273v-44h50v44" stroke="#95cef2" strokeWidth="4" fill="none" opacity=".65"/></svg>
   <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-[#081f3d] via-[#0f2c58]/95 to-transparent"/>
   <div className="relative z-10 max-w-2xl">
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-blue-100"><Sparkles size={13}/> Creative workspace</span>
    <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-[48px]">Turn ideas into<br/><span className="bg-gradient-to-r from-[#7ebaff] via-[#b9b4ff] to-[#eea8d8] bg-clip-text text-transparent">impactful content.</span></h1>
    <p className="mt-5 max-w-lg text-sm leading-7 text-blue-100 sm:text-base">Plan marketing campaigns, videos, presentations, websites and brand visuals in one organized studio. Start free with editable production drafts.</p>
    <div className="mt-7 flex flex-wrap gap-3">
     <button onClick={()=>open('create')} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-blue-50"><WandSparkles size={17}/> Create a project <ArrowRight size={16}/></button>
     <button onClick={()=>open('projects')} className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"><FolderKanban size={16}/> My drafts</button>
    </div>
   </div>
  </section>
  <div className="grid gap-4 md:grid-cols-3">
   <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-semibold text-slate-500">Saved on this device</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{drafts.length}</p><p className="mt-1 text-[11px] text-slate-500">Creative project drafts</p></div><div className="rounded-xl bg-blue-50 p-3"><FolderKanban className="text-blue-600"/></div></div>
   <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-semibold text-slate-500">Live AI providers</p><p className="mt-2 text-3xl font-extrabold text-slate-900">0</p><p className="mt-1 text-[11px] text-slate-500">Rendering not configured</p></div><div className="rounded-xl bg-violet-50 p-3"><Bot className="text-violet-600"/></div></div>
   <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-semibold text-slate-500">Starter templates</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{STARTER_TEMPLATES.length}</p><p className="mt-1 text-[11px] text-slate-500">Editable, available free</p></div><div className="rounded-xl bg-emerald-50 p-3"><Layers3 className="text-emerald-600"/></div></div>
  </div>
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_265px]">
   <div className="min-w-0 space-y-7">
    <section>
     <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Start creating</h2><p className="mt-1 text-sm text-slate-500">Select an output to start your project.</p></div><button className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800" onClick={()=>open('create')}>All tools <ArrowRight size={15}/></button></div>
     <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {tools.map(t=><button key={t.tool} onClick={()=>open(t.tool)} className={'group min-h-48 rounded-2xl border border-slate-200 bg-gradient-to-br p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg '+t.gradient}>
       <div className={'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md '+t.iconColor}><t.icon size={22}/></div>
       <h3 className="mt-5 font-bold text-slate-950">{t.name}</h3>
       <p className="mt-2 min-h-11 text-xs leading-5 text-slate-600">{t.description}</p>
       <div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t.tag}</span><span className="rounded-full bg-white p-2 text-indigo-700 shadow-sm group-hover:bg-indigo-600 group-hover:text-white"><ArrowRight size={16}/></span></div>
      </button>)}
     </div>
    </section>
    <section>
     <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold text-slate-950">Recent projects</h2><p className="mt-1 text-xs text-slate-500">Your saved work, stored in this browser.</p></div><button onClick={()=>open('projects')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">View all <ArrowRight className="inline" size={15}/></button></div>
     {visibleDrafts.length?<div className="grid gap-3 sm:grid-cols-2">{visibleDrafts.map(d=><button key={d.id} onClick={()=>load(d)} className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 hover:shadow-md"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50"><FileText size={21} className="text-indigo-700"/></div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{d.brief.brand}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.brief.offer}</p><p className="mt-2 text-[11px] text-slate-400">Edited {new Date(d.updatedAt).toLocaleDateString()}</p></div><ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-700"/></button>)}</div>:<div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6"><div className="rounded-xl bg-blue-50 p-3"><FolderKanban className="text-blue-600"/></div><div><p className="font-semibold text-slate-800">No saved projects yet</p><p className="mt-1 text-xs text-slate-500">Start a creative brief and your drafts will appear here.</p></div></div>}
    </section>
    <section>
     <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold text-slate-950">Templates and examples</h2><p className="mt-1 text-xs text-slate-500">Original editable starters. No fictional customer work.</p></div><span className="text-xs text-slate-400">{visibleTemplates.length} templates</span></div>
     {visibleTemplates.length?<div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{visibleTemplates.map(t=><button key={t.id} onClick={()=>choose(t)} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"><TemplateArt item={t}/><div className="p-4"><h3 className="text-sm font-bold text-slate-900">{t.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{t.description}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Use template <ArrowRight size={14}/></span></div></button>)}</div>:<div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No templates match your search.</div>}
    </section>
   </div>
   <aside className="space-y-5">
    <div className="rounded-[22px] border border-indigo-100 bg-gradient-to-b from-[#f0f4ff] to-white p-5 shadow-sm">
     <div className="flex items-center gap-2"><Bot size={17} className="text-indigo-700"/><h2 className="text-sm font-bold text-slate-900">Creative assistant</h2></div>
     <div className="relative mx-auto mt-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-indigo-100 to-transparent"><div className="flex h-20 w-20 items-center justify-center rounded-[28px] border-4 border-slate-700 bg-slate-950 shadow-[0_10px_25px_-6px_rgba(57,70,147,.4)]"><span className="text-3xl tracking-widest text-amber-300">◡◡</span></div><span className="absolute right-3 top-1 text-2xl text-orange-500">✦</span></div>
     <h3 className="mt-5 font-bold text-slate-900">What would you like to create?</h3>
     <p className="mt-2 text-xs leading-5 text-slate-600">Choose a guided tool. Live AI chat is not connected.</p>
     <div className="mt-5 space-y-2">
      {[{tool:'video' as StudioTool,label:'Plan a video ad',icon:Play},{tool:'presentations' as StudioTool,label:'Outline a presentation',icon:Presentation},{tool:'website' as StudioTool,label:'Build a landing page',icon:MonitorPlay},{tool:'campaign' as StudioTool,label:'Plan a campaign',icon:Megaphone},{tool:'brand' as StudioTool,label:'Create brand artwork',icon:Palette}].map(a=><button key={a.tool} onClick={()=>open(a.tool)} className="flex w-full items-center gap-2 rounded-lg border border-indigo-100 bg-white/90 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700"><a.icon size={15} className="text-indigo-600"/>{a.label}<ArrowRight size={13} className="ml-auto text-slate-400"/></button>)}
     </div>
    </div>
    <div className="rounded-[22px] bg-[#0d1e38] p-5 text-white shadow-md"><div className="flex items-center gap-2 text-amber-300"><ShieldCheck size={18}/><span className="text-xs font-semibold uppercase tracking-wide">Professional services</span></div><h3 className="mt-3 text-lg font-bold text-white">From concept to delivery</h3><p className="mt-3 text-xs leading-6 text-slate-300">Request a quotation for finished production, with scope, usage rights and pricing confirmed first.</p><button onClick={()=>open('marketplace')} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-400">Explore services <ArrowUpRight size={15}/></button></div>
   </aside>
  </div>
 </div>;
}
