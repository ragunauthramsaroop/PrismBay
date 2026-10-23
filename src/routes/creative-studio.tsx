import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import Navbar from '~/components/Navbar';
import Footer from '~/components/Footer';
import { makePack, markdown, landingHtml } from '~/lib/creative-offer';
import type { Brief, Pack, Channel } from '~/lib/creative-offer';

export const Route=createFileRoute('/creative-studio')({
  head:()=>({
    meta:[
      {title:'Free Creative Studio: Campaign, Video & Presentation Planner | PrismBay'},
      {name:'description',content:'Generate and download campaign copy, a 30-second ad storyboard, a presentation outline and a responsive landing-page draft.'}
    ],
    links:[{rel:'canonical',href:'https://www.prismbayai.com/creative-studio'}]
  }),
  component:Studio
});
const channels:Channel[]=['LinkedIn','Instagram','TikTok','Facebook'];
const initial:Brief={brand:'Your company',offer:'Business growth consulting',audience:'small business owners',outcome:'clearer customer communication',proof:'',channel:'LinkedIn'};
type Tab='Campaign'|'Video'|'Slides'|'Landing';
function save(name:string,content:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type:type+';charset=utf-8'}));
 const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function Studio(){
 const [brief,setBrief]=useState<Brief>(initial);
 const [pack,setPack]=useState<Pack|null>(null);
 const [tab,setTab]=useState<Tab>('Campaign');
 const [error,setError]=useState('');
 const field=(key:keyof Brief,value:string)=>setBrief(old=>({...old,[key]:value}));
 const submit=(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  try {setPack(makePack(brief));setError('');setTab('Campaign');}
  catch(x){setPack(null);setError(x instanceof Error?x.message:'Invalid brief');}
 };
 const fields:{key:'brand'|'offer'|'audience'|'outcome'|'proof';label:string}[]=[
  {key:'brand',label:'Your brand or company'}, {key:'offer',label:'Product or service'},
  {key:'audience',label:'Ideal customer'}, {key:'outcome',label:'Desired customer outcome'},
  {key:'proof',label:'Optional evidence to verify (not published as fact)'}
 ];
 const name=(brief.brand.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,48)||'creative')+'-launch';
 const inquiry='mailto:support@prismbayai.com?subject='+encodeURIComponent('Creative Studio quote: '+brief.brand)+'&body='+encodeURIComponent('Hello PrismBay,\nPlease quote production services for:\nBrand: '+brief.brand+'\nOffer: '+brief.offer+'\nAudience: '+brief.audience+'\nChannel: '+brief.channel+'\nPlease confirm scope, price, turnaround and content rights before any charge.');
 return <div className="min-h-screen bg-slate-50"><Navbar/>
  <section className="bg-slate-950 px-6 py-16 text-white">
   <div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">PrismBay AI / Creative Studio</p>
    <div className="mt-5 grid gap-8 md:grid-cols-[2fr_1fr] md:items-end">
     <div><h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">One business brief. Four connected creative assets.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Prepare campaign copy, an advertising storyboard, a slide outline and a downloadable landing page. Use the free planner, then request a quote for professional production.</p></div>
     <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm leading-7 text-slate-300"><strong className="block text-teal-300">Free, no account required.</strong>This first release runs entirely in the browser without paid model calls. Outputs are planning templates, not generated media files.</div>
    </div>
   </div>
  </section>
  <main className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr]">
   <form onSubmit={submit} className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">01. Your input</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Build your brief</h2><p className="mt-2 text-sm text-slate-600">Avoid confidential details and unsupported performance claims.</p></div>
    {fields.map(f=><div key={f.key}><label htmlFor={'creative-'+f.key} className="mb-1.5 block text-sm font-semibold text-slate-800">{f.label}</label>
     <input id={'creative-'+f.key} value={brief[f.key]} maxLength={f.key==='proof'?280:180} onChange={e=>field(f.key,e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"/></div>)}
    <div><label htmlFor="creative-channel" className="mb-1.5 block text-sm font-semibold text-slate-800">Primary channel</label>
     <select id="creative-channel" value={brief.channel} onChange={e=>field('channel',e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">{channels.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
    <button type="submit" className="w-full rounded-lg bg-teal-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-teal-700">Generate my creative pack</button>
    <p className="text-xs leading-5 text-slate-500">No form data is sent to a server. Sharing a quote request is a separate, voluntary action.</p>
   </form>
   <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100 p-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">02. Your output</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Production desk</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">{pack?'Draft: review needed':'Waiting for your brief'}</span></div>
    {pack?<>
      <div role="tablist" aria-label="Creative output" className="mb-5 flex flex-wrap gap-2">{(['Campaign','Video','Slides','Landing'] as Tab[]).map(t=><button type="button" role="tab" key={t} aria-selected={tab===t} onClick={()=>setTab(t)} className={tab===t?'rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white':'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700'}>{t}</button>)}</div>
      {tab==='Campaign'?<div className="space-y-4"><h3 className="text-lg font-bold text-slate-900">Headline options</h3>{pack.headlines.map((h,i)=><p key={h} className="rounded-xl bg-white p-4 text-sm text-slate-800"><span className="mr-2 font-bold text-teal-700">0{i+1}</span>{h}</p>)}<h3 className="pt-3 text-lg font-bold text-slate-900">Ready-to-edit caption</h3><p className="whitespace-pre-line rounded-xl bg-white p-5 text-sm leading-7 text-slate-700">{pack.caption}</p><h3 className="pt-3 text-lg font-bold text-slate-900">Seven-day rollout</h3>{pack.tasks.map((t,i)=><p key={t} className="text-sm text-slate-700"><strong>Day {i+1}:</strong> {t}</p>)}</div>:null}
      {tab==='Video'?<div className="space-y-4"><p className="text-sm text-slate-600">30-second shot list. No video has been rendered.</p>{pack.shots.map(s=><div className="rounded-xl bg-white p-5" key={s.time}><p className="text-sm font-bold text-teal-700">{s.time}</p><p className="mt-2 text-sm text-slate-700">Visual: {s.visual}</p><p className="mt-2 text-sm text-slate-700">Narration: {s.narration}</p></div>)}</div>:null}
      {tab==='Slides'?<div className="space-y-4"><p className="text-sm text-slate-600">Six-slide outline. PPTX rendering is not enabled.</p>{pack.slides.map((s,i)=><div className="rounded-xl bg-white p-5" key={i}><p className="text-xs font-bold uppercase text-teal-700">Slide {i+1}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h3><ul className="mt-2 list-inside list-disc text-sm leading-7 text-slate-700">{s.bullets.map(b=><li key={b}>{b}</li>)}</ul></div>)}</div>:null}
      {tab==='Landing'?<div className="overflow-hidden rounded-xl bg-white"><div className="bg-slate-950 p-8 text-white"><h3 className="text-3xl font-bold text-white">{pack.landing.headline}</h3><p className="mt-4 text-sm text-slate-300">{pack.landing.intro}</p><p className="mt-5 inline-block rounded-lg bg-teal-400 px-4 py-2 font-bold text-slate-950">{pack.landing.cta}</p></div><div className="grid gap-3 p-5 sm:grid-cols-2">{pack.landing.sections.map(s=><div className="rounded-lg bg-slate-50 p-4" key={s.title}><h4 className="font-bold text-slate-900">{s.title}</h4><p className="mt-2 text-sm text-slate-700">{s.body}</p></div>)}</div></div>:null}
      <p className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">{pack.warning}</p>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={()=>save(name+'.md',markdown(pack),'text/markdown')} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white">Download full pack</button><button type="button" onClick={()=>save(name+'.html',landingHtml(pack),'text/html')} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900">Download landing HTML</button></div>
    </>:<div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="text-3xl text-teal-700">✦</p><h3 className="mt-4 text-xl font-bold text-slate-900">Your complete launch plan appears here</h3><p className="mt-3 text-sm leading-7 text-slate-600">Complete the form and select Generate. All outputs are drafts for your review.</p></div>}
   </section>
  </main>
  <section className="bg-white px-6 py-14"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">03. Turn your plan into a paid project</p><h2 className="mt-2 text-3xl font-bold text-slate-900">Want finished marketing deliverables?</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Request a written production quote for design, video or presentations. A quote requires scope, pricing, deadlines and rights approval. No payment is collected on this page.</p><div className="mt-6 flex flex-wrap gap-4"><a href={inquiry} className="rounded-lg bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700">Request custom production quote</a><a href="https://clean.prismbayai.com/toolkits.html" className="rounded-lg border border-slate-300 px-6 py-3 font-bold text-slate-900">Shop existing executive toolkits</a></div></div></section>
  <section className="px-6 py-10"><div className="mx-auto max-w-6xl text-sm leading-7 text-slate-600"><h2 className="mb-2 text-lg font-bold text-slate-900">Integration roadmap</h2>Source candidates: CrewAI, OpenHands Agent Canvas, screenshot-to-code, PPTAgent and Open AI UGC. These projects are not included or connected in this initial free release. Paid AI generation and publishing are disabled.</div></section>
  <Footer/>
 </div>;
}
