import "./styles.css";
import {THEMES,LAYOUTS,AUDIENCES,STORAGE_KEY,starterDeck,generateDeck,parseOutline,sanitizeDeck,makeSlide,bulletLines,markdownExport,safeFileName} from "./core.js";
import {exportPowerpoint} from "./pptx.js";
import {buildSourceDeck} from "./source-deck.js";
import {ingestFiles,SOURCE_ACCEPT,isServerFormat} from "./ingest.js";
import {parseBrief} from "./brief.js";
import {renderSimple} from "./simple-ui.js";
import {renderAgent} from "./agent-ui.js";
import {prepareAgentPrompt,decodeAgentDeck} from "./agent-core.js";

const app=document.querySelector("#app");
const escapeHtml=(value)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={cover:"Cover",section:"Chapter",bullets:"Editorial",split:"Two-column",stats:"Key figures",chart:"Chart",quote:"Quotation",closing:"Closing"};
const symbols={cover:"◈",section:"≡",bullets:"☷",split:"◫",stats:"▦",chart:"▥",quote:"❝",closing:"◎"};
function load(){
  try {const x=localStorage.getItem(STORAGE_KEY);return x?sanitizeDeck(JSON.parse(x)):starterDeck();}
  catch {return starterDeck();}
}
function loadUI(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY+"-ui")||"{}");}catch{return {};}}
const savedUI=loadUI(),initialDeck=load();
const state={deck:initialDeck,selected:Number(savedUI.selected)||0,prompt:savedUI.prompt||(initialDeck.id==="prismdeck-demo"?"The future of clean industrial energy":initialDeck.title),count:Number(savedUI.count)||8,audience:savedUI.audience||initialDeck.audience,importOpen:false,helpOpen:false,exporting:false,importing:false,documents:[],importErrors:[],agentMode:location.hash!=="#editor"&&location.hash!=="#simple",agentAi:true,agentConsent:false,agentDraft:"",agentFiles:[],agentDocs:[],agentBusy:false,agentStatus:"",agentError:"",agentHasDeck:initialDeck.id!=="prismdeck-demo",agentMessages:[],simpleMode:location.hash==="#simple",simpleFiles:[],simpleInstructions:"",simpleStatus:"",simpleError:"",simpleBusy:false,simpleThemes:Object.fromEntries(Object.entries(THEMES).map(([k,t])=>[k,t.name]))};
const current=()=>state.deck.slides[Math.min(state.selected,state.deck.slides.length-1)];
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.deck));localStorage.setItem(STORAGE_KEY+"-ui",JSON.stringify({selected:state.selected,prompt:state.prompt,count:state.count,audience:state.audience}));}catch{}}
function options(values,chosen){return values.map(v=>'<option value="'+escapeHtml(v)+'" '+(v===chosen?'selected':'')+'>'+escapeHtml(v)+'</option>').join("");}
function toast(message,bad=false) {
  let target=document.getElementById("toasts");
  if(!target)return;
  const el=document.createElement("div");el.className="toast"+(bad?" danger":"");
  el.textContent=message;target.appendChild(el);
  setTimeout(()=>el.remove(),3600);
}
function download(filename,text,mime){
  const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:mime}));
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function getColors(){
  const t=THEMES[state.deck.theme];
  return "--deck-bg:#"+t.canvas+";--deck-ink:#"+t.ink+";--deck-muted:#"+t.muted+";--deck-accent:#"+t.accent+";--deck-panel:#"+t.panel+";--deck-soft:#"+t.soft;
}
function lineItems(slide){
  return bulletLines(slide,6).map((text,i)=>'<div class="deck-point"><span class="point-index">'+String(i+1).padStart(2,"0")+'</span><span>'+escapeHtml(text)+'</span></div>').join("");
}
function renderSlide(slide){
  const eyebrow='<div class="deck-eyebrow"><span class="eyebrow-rule"></span>'+escapeHtml(slide.eyebrow)+'</div>';
  const folio='<div class="deck-footer"><span>PRISMDECK STUDIO</span><span>'+String(state.selected+1).padStart(2,"0")+' / '+String(state.deck.slides.length).padStart(2,"0")+'</span></div>';
  let inner="";
  if(slide.layout==="cover"){
    inner='<div class="cover-orbit orbit-one"></div><div class="cover-orbit orbit-two"></div><div class="deck-main cover-main">'+eyebrow+'<h1>'+escapeHtml(slide.title)+'</h1><p>'+escapeHtml(slide.subtitle)+'</p></div><div class="cover-sigil">P<span>.</span></div>';
  } else if(slide.layout==="section"){
    inner='<div class="section-mark">0'+Math.min(state.selected+1,9)+'</div><div class="deck-main section-main">'+eyebrow+'<h1>'+escapeHtml(slide.title)+'</h1><p>'+escapeHtml(slide.subtitle)+'</p></div>';
  } else if(slide.layout==="bullets"){
    inner='<div class="deck-main standard-main">'+eyebrow+'<h2>'+escapeHtml(slide.title)+'</h2><p class="deck-lead">'+escapeHtml(slide.subtitle)+'</p><div class="bullet-grid">'+(lineItems(slide)||'<span class="placeholder">Add supporting points in the editor.</span>')+'</div></div>';
  } else if(slide.layout==="split"){
    const points=bulletLines(slide,5);
    inner='<div class="deck-main split-main"><div class="split-editorial">'+eyebrow+'<h2>'+escapeHtml(slide.title)+'</h2><p class="deck-lead">'+escapeHtml(slide.subtitle)+'</p></div><div class="split-visual"><div class="split-visual-label">DECISION FRAMEWORK</div>'+points.map((x,i)=>'<div class="split-tile"><small>0'+(i+1)+'</small><span>'+escapeHtml(x)+'</span></div>').join("")+'<div class="split-watermark">◈</div></div></div>';
  } else if(slide.layout==="stats"){
    inner='<div class="deck-main standard-main">'+eyebrow+'<h2>'+escapeHtml(slide.title)+'</h2><p class="deck-lead">'+escapeHtml(slide.subtitle)+'</p><div class="stat-row">'+slide.metrics.map((m,i)=>'<div class="stat-card"><div class="stat-overline">MEASURE 0'+(i+1)+'</div><div class="stat-value">'+escapeHtml(m.value)+'</div><div class="stat-label">'+escapeHtml(m.label)+'</div></div>').join("")+'</div></div>';
  } else if(slide.layout==="chart"){
    const max=Math.max(1,...slide.chartValues.map(Number));
    inner='<div class="deck-main standard-main">'+eyebrow+'<h2>'+escapeHtml(slide.title)+'</h2><p class="deck-lead">'+escapeHtml(slide.subtitle)+'</p><div class="chart-panel"><div class="chart-legend"><span class="legend-dot"></span>VALUE BY CATEGORY <span class="demo-marker">ILLUSTRATIVE WHEN USING DEMO DATA</span></div><div class="chart-bars">'+slide.chartValues.map((v,i)=>'<div class="chart-bar-group"><div class="chart-value">'+escapeHtml(v)+'</div><div class="chart-bar-track"><div class="chart-bar-fill" style="height:'+Math.max(4,Math.min(100,100*Number(v)/max))+'%"></div></div><span class="chart-label">'+escapeHtml(slide.chartLabels[i]||"Item "+(i+1))+'</span></div>').join("")+'</div></div></div>';
  } else if(slide.layout==="quote"){
    inner='<div class="deck-main quote-main">'+eyebrow+'<div class="quote-mark">“</div><h2>'+escapeHtml(slide.title)+'</h2><p>'+escapeHtml(slide.subtitle)+'</p><div class="quote-author"><span></span>'+escapeHtml(slide.quoteAttribution)+'</div></div>';
  } else {
    inner='<div class="deck-main closing-main">'+eyebrow+'<h1>'+escapeHtml(slide.title)+'</h1><p>'+escapeHtml(slide.subtitle)+'</p><div class="closing-actions">'+bulletLines(slide,3).map((x,i)=>'<div><span>0'+(i+1)+'</span>'+escapeHtml(x)+'</div>').join("")+'</div></div><div class="closing-circle"></div>';
  }
  return '<div class="slide-surface layout-'+slide.layout+' theme-'+state.deck.theme+'" style="'+getColors()+'">'+inner+folio+'</div>';
}
function thumbnail(s,i){
  return '<button class="thumb '+(i===state.selected?"active":"")+'" data-action="select" data-index="'+i+'" aria-label="Go to slide '+(i+1)+'">'+
    '<div class="thumb-num">'+String(i+1).padStart(2,"0")+'</div><div class="thumb-preview" style="'+getColors()+'"><div class="thumb-eyebrow">'+escapeHtml(s.eyebrow)+'</div><strong>'+escapeHtml(s.title)+'</strong><div class="thumb-decoration">'+symbols[s.layout]+'</div></div>'+
    '<div class="thumb-name">'+escapeHtml(labels[s.layout])+'</div></button>';
}
function editor(){
  const s=current();
  return '<section class="inspector-card"><div class="inspector-eyebrow">SLIDE '+String(state.selected+1).padStart(2,"0")+'</div>'+
    '<div class="inspector-heading"><h3>Slide properties</h3><span class="round-badge">'+symbols[s.layout]+'</span></div>'+
    '<label class="form-label">Layout<select data-slide-field="layout">'+LAYOUTS.map(l=>'<option value="'+l+'" '+(s.layout===l?"selected":"")+'>'+labels[l]+'</option>').join("")+'</select></label>'+
    '<label class="form-label">Section label<input data-slide-field="eyebrow" maxlength="65" value="'+escapeHtml(s.eyebrow)+'" /></label>'+
    '<label class="form-label">Headline<textarea rows="3" data-slide-field="title">'+escapeHtml(s.title)+'</textarea></label>'+
    '<label class="form-label">Supporting line<textarea rows="3" data-slide-field="subtitle">'+escapeHtml(s.subtitle)+'</textarea></label>'+
    '<label class="form-label">Supporting points <small>One per line</small><textarea rows="5" data-slide-field="body" placeholder="One point per line">'+escapeHtml(s.body)+'</textarea></label>'+
    (s.layout==="stats"?'<div class="separator"></div><div class="field-heading">Metric cards</div>'+s.metrics.map((m,i)=>'<div class="mini-grid"><label>Value<input data-metric="'+i+'" data-metric-field="value" value="'+escapeHtml(m.value)+'" /></label><label>Label<input data-metric="'+i+'" data-metric-field="label" value="'+escapeHtml(m.label)+'" /></label></div>').join(""):"")+
    (s.layout==="chart"?'<div class="separator"></div><div class="field-heading">Editable chart</div><label class="form-label">Categories, comma separated<input data-chart="labels" value="'+escapeHtml(s.chartLabels.join(", "))+'" /></label><label class="form-label">Values, comma separated<input data-chart="values" value="'+escapeHtml(s.chartValues.join(", "))+'" /></label>':"")+
    (s.layout==="quote"?'<label class="form-label">Attribution<input data-slide-field="quoteAttribution" value="'+escapeHtml(s.quoteAttribution)+'" /></label>':"")+
    '<div class="separator"></div><label class="form-label">Speaker notes<textarea rows="4" data-slide-field="notes" placeholder="Private talking points for the presenter">'+escapeHtml(s.notes)+'</textarea></label>'+
    '<div class="inspector-actions"><button data-action="duplicate" class="ghost-control">⊞ Duplicate</button><button data-action="delete" class="ghost-control danger-text">⌫ Delete</button></div></section>';
}
function render(){
  if(state.agentMode){app.innerHTML=renderAgent(state,state.agentHasDeck?renderSlide(current()):"");save();return;}
  if(state.simpleMode){app.innerHTML=renderSimple(state);return;}
  state.selected=Math.min(state.selected,state.deck.slides.length-1);
  app.innerHTML=
  '<div class="shell">'+
  '<aside class="brand-rail"><div class="brand-mark">P<span>.</span></div><div class="rail-line"></div><div class="rail-name">STUDIO</div><div class="rail-bottom">PD<br>26</div></aside>'+
  '<div class="workspace">'+
    '<header class="topbar"><div class="breadcrumb"><span class="breadcrumb-home">Workspace</span><span class="chev">/</span><span>Presentation editor</span></div>'+
      '<div class="top-actions"><button class="top-secondary" data-action="agent-home">AI agent</button><button class="top-secondary" data-action="simple-home">Simple upload</button><span class="privacy-dot"></span><span class="private-label">LOCAL-FIRST WORKSPACE</span>'+
      '<button class="top-secondary" data-action="help" title="Keyboard and feature help">Help</button>'+
      '<button class="top-secondary" data-action="download-json">Save project</button>'+
      '<button class="primary-button export-btn" data-action="pptx">Export PPTX <span>↗</span></button></div></header>'+
    '<div class="work-grid">'+
      '<aside class="create-panel"><div class="create-content"><div class="panel-kicker"><span class="kicker-icon">✦</span> PRESENTATION INTELLIGENCE</div>'+
       '<h1>From idea to <em>impact.</em></h1><p class="side-description">Build executive-ready slides. Keep every headline, diagram and chart editable.</p>'+
       '<div class="generator-section"><div class="section-title">01 <span>DESCRIBE YOUR DECK</span></div>'+
       '<label for="prompt" class="sr-only">What is your presentation about?</label><textarea id="prompt" data-prompt rows="5" placeholder="E.g. A board presentation on our five-year renewable energy strategy...">'+escapeHtml(state.prompt)+'</textarea>'+
       '<div class="micro-note">Your prompt stays in this browser.</div>'+
       '<div class="setting-row"><label>Audience<select data-audience>'+options(AUDIENCES,state.audience)+'</select></label><label>Slides<select data-count>'+[4,5,6,7,8,10,12,14].map(x=>'<option value="'+x+'" '+(x===state.count?"selected":"")+'>'+x+' slides</option>').join("")+'</select></label></div>'+
       '<button data-action="generate" class="generate-button"><span>✦</span> Generate outline <b>↗</b></button><div class="engine-hint">Structured outline engine · no invented statistics</div></div>'+
       '<div class="theme-section"><div class="section-title">02 <span>CHOOSE THE AESTHETIC</span></div><div class="theme-options">'+Object.entries(THEMES).map(([key,t])=>'<button data-theme="'+key+'" class="theme-swatch '+(key===state.deck.theme?"chosen":"")+'" title="'+t.name+'" aria-label="Use '+t.name+' theme" aria-pressed="'+(key===state.deck.theme)+'"><span class="swatch-inner" style="background:#'+t.canvas+';border-color:#'+t.accent+'"><i style="background:#'+t.accent+'"></i></span><small>'+t.name+'</small></button>').join("")+'</div></div>'+
       '<div class="divider"></div><div class="section-title">03 <span>IMPORT & REUSE</span></div><div class="import-tools"><button data-action="import" class="import-control">↥ <span>Upload source files or article</span></button><button data-action="download-markdown" class="import-control">↧ <span>Export Markdown outline</span></button></div>'+
       '<div class="create-foot"><span class="foot-indicator"></span> Auto-saved on this device</div><div class="source-counter">'+(state.documents.length?state.documents.length+" source(s) processed into this deck":"DOC · PPT · PDF · XLS · VIDEO · ARTICLE")+'</div></div></aside>'+
      '<main class="center-panel"><div class="deck-topline"><div><div class="content-overline">CURRENT PRESENTATION</div><input class="deck-title-input" aria-label="Presentation title" data-deck-field="title" value="'+escapeHtml(state.deck.title)+'" /><div class="deck-meta">'+state.deck.slides.length+' slides <span>·</span> '+escapeHtml(state.deck.audience)+' <span>·</span> 16:9 widescreen</div></div>'+
      '<div class="deck-controls"><button data-action="move-left" title="Move current slide left">←</button><button data-action="move-right" title="Move current slide right">→</button><button data-action="add" class="add-slide">＋ Add slide</button></div></div>'+
      '<div class="stage-outer"><div class="stage-grid"><div class="preview-header"><span><span class="pulsing-dot"></span> LIVE CANVAS</span><span>POWERPOINT · 16:9</span></div><div id="previewHost" class="slide-stage">'+renderSlide(current())+'</div><div class="preview-bottom"><span>Slide '+(state.selected+1)+' of '+state.deck.slides.length+'</span><span class="preview-note">Native text, shapes & charts on export</span></div></div></div>'+
      '<div class="timeline-heading"><div><span class="section-bullet">◈</span> STORYBOARD <span class="timeline-count">'+state.deck.slides.length+'</span></div><span>SELECT A SLIDE TO EDIT</span></div><div id="thumbnails" class="thumbnail-scroll">'+state.deck.slides.map(thumbnail).join("")+'<button class="thumb-add" data-action="add"><span>+</span><small>New slide</small></button></div>'+
      '</main>'+
      '<aside class="edit-panel"><div class="edit-top"><span>EDITOR</span><span class="status-pill"><i></i> READY</span></div>'+editor()+'<div class="inspector-foot"><div>✦ <strong>DESIGN ASSIST</strong></div><p>Use one message per slide. Replace every demo value with sourced data before sharing.</p></div></aside>'+
    '</div></div></div>'+
    '<div id="toasts" class="toasts" role="status" aria-live="polite"></div>'+
    (state.importOpen?'<div class="modal-backdrop"><div class="modal source-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><button class="modal-close" data-action="close-import" aria-label="Close">×</button><div class="panel-kicker">SOURCE INTELLIGENCE</div><h2 id="import-title">Turn your material into slides.</h2><p>Upload articles, Word, PDF, PowerPoint, Excel, audio, video or captions. We extract source text, build a slide narrative and preserve citations in speaker notes.</p><div class="supported-formats">ARTICLE · PDF · DOC / DOCX · PPT / PPTX · XLS / XLSX · CSV · VIDEO</div><div class="drop-area" id="dropArea"><span>↥</span><strong>Choose files or drop them here</strong><small>Up to 20 files. PDFs and modern Office files are analyzed in this browser.</small><button class="top-secondary" data-action="choose-file">Choose source files</button></div><input id="fileImport" type="file" accept="'+SOURCE_ACCEPT+'" multiple hidden /><div class="advanced-ingest"><details><summary>Advanced converter for videos and legacy files</summary><p>Video/audio and older .doc/.ppt files require your private converter. Those files are sent to the selected server. Never enter credentials for an untrusted service.</p><label>Converter API endpoint<input id="converterEndpoint" value="/api/ingest" placeholder="https://your-private-server/api/ingest" /></label><label>Converter access token<input id="converterToken" type="password" autocomplete="off" placeholder="Session-only access token" /></label></details></div><div class="import-separator">OR PASTE ARTICLE / OUTLINE</div><textarea id="importText" rows="6" placeholder="Paste article text here or write:\n\n## Executive overview\n- First point\n- Second point"></textarea><div class="modal-row"><button data-action="confirm-import" class="top-secondary">Import Markdown outline</button><button data-action="analyze-paste" class="primary-button">Generate from article ↗</button></div><div id="importStatus" class="import-status" aria-live="polite">Source content stays on your device for supported modern file types.</div></div></div>':"")+(state.helpOpen?'<div class="modal-backdrop"><div class="modal help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" data-action="close-help" aria-label="Close">×</button><div class="panel-kicker">WORKSPACE GUIDE</div><h2 id="help-title">A better presentation, faster.</h2><p>Describe a topic, select an audience and build an editable framework. Click a slide to refine its headline, body, statistics, and speaker notes.</p><div class="shortcut">Ctrl / ⌘ + S <span>Save .json project</span></div><div class="shortcut">Ctrl / ⌘ + E <span>Export editable PowerPoint</span></div><p class="help-fine">The outline generator is deterministic and offline. Exported charts are editable PowerPoint objects. No payment or cloud account is required.</p></div></div>':"");
  save();
}
function redrawSlide(){
  const host=document.getElementById("previewHost");if(host)host.innerHTML=renderSlide(current());
  const thumbs=document.getElementById("thumbnails");if(thumbs)thumbs.innerHTML=state.deck.slides.map(thumbnail).join("")+'<button class="thumb-add" data-action="add"><span>+</span><small>New slide</small></button>';
}
function move(direction){
  const to=state.selected+direction;if(to<0||to>=state.deck.slides.length)return;
  const all=state.deck.slides;[all[state.selected],all[to]]=[all[to],all[state.selected]];state.selected=to;render();
}
async function importSourceFiles(files){
  if(state.importing){toast("Source extraction is already running.");return;}
  state.importing=true;
  const endpoint=document.getElementById("converterEndpoint")?.value.trim()||"/api/ingest";
  const token=document.getElementById("converterToken")?.value.trim()||"";
  const status=document.getElementById("importStatus");
  try{
    const result=await ingestFiles(files,{endpoint,token},({index,total,name})=>{
      if(status)status.textContent="Reading "+index+" of "+total+": "+name;
    });
    state.importErrors=result.errors;
    if(!result.documents.length)throw new Error(result.errors.map(e=>e.name+": "+e.error).join(" | ")||"No source could be extracted.");
    state.documents=result.documents.map(d=>({name:d.name,kind:d.kind,chars:d.text.length}));
    state.deck=buildSourceDeck(result.documents,{theme:state.deck.theme,audience:state.audience,count:state.count});
    state.selected=0;state.importOpen=false;render();
    toast("Created "+state.deck.slides.length+" editable slides from "+result.documents.length+" source(s).");
    if(result.errors.length)toast(result.errors.length+" file(s) need additional conversion: "+result.errors.map(e=>e.name).join(", "),true);
  }catch(err){toast(err.message||"Source import failed.",true);if(status)status.textContent=err.message||"Import failed.";}
  finally{state.importing=false;}
}
function importPastedArticle(value){
  const text=String(value||"").trim();
  if(text.length<40)throw new Error("Paste at least 40 characters of article or source text.");
  state.deck=buildSourceDeck([{name:"Pasted article",kind:"article",text}],{count:state.count,theme:state.deck.theme,audience:state.audience,title:state.prompt.length>6?state.prompt:undefined});
  state.documents=[{name:"Pasted article",kind:"article",chars:text.length}];state.selected=0;state.importOpen=false;render();toast("Source-based presentation generated.");
}
function acceptSimpleFiles(list){
 const incoming=Array.from(list||[]);
 if(!incoming.length)return;
 state.simpleFiles=[...state.simpleFiles,...incoming].filter((f,i,all)=>all.findIndex(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified)===i).slice(0,20);
 state.simpleError="";
 state.simpleStatus=state.simpleFiles.length+" file(s) selected. Add your instructions and generate.";
 render();
}
async function generateFromSimple(){
 if(state.simpleBusy)return;
 const instructions=state.simpleInstructions.trim();
 const files=state.simpleFiles;
 if(!files.length&&instructions.length<5){
  state.simpleError="Add a source file or describe your presentation in the instructions box.";
  render();return;
 }
 const unavailable=files.filter(x=>isServerFormat(x.name));
 if(unavailable.length){
  state.simpleError="A private converter is required for "+unavailable.map(f=>f.name).join(", ")+". Upload a transcript (.srt/.vtt) or convert the file to .docx/.pptx first.";
  render();return;
 }
 const spec=parseBrief(instructions,{count:state.count,audience:state.audience,theme:state.deck.theme});
 state.simpleBusy=true;state.simpleError="";state.simpleStatus="Analyzing uploaded material in your browser...";
 render();
 try {
  let created;
  if(files.length){
   const result=await ingestFiles(files,{},({index,total,name})=>{
    const el=document.getElementById("simple-progress");
    if(el)el.textContent="Reading "+index+" of "+total+": "+name;
   });
   if(result.errors.length){
    throw new Error("Some files were not processed: "+result.errors.map(e=>e.name+" ("+e.error+")").join(" | "));
   }
   if(!result.documents.length)throw new Error("No readable source data found.");
   created=buildSourceDeck(result.documents,spec);
   state.documents=result.documents.map(x=>({name:x.name,kind:x.kind,chars:x.text.length}));
  }else {
   created=generateDeck(spec.title||instructions.slice(0,140),spec);
   created.slides[0].notes="Presentation instructions: "+instructions.slice(0,700)+"\nGenerated as a draft framework. Add verified source material before distributing.";
   state.documents=[];
  }
  state.deck=created;
  state.count=spec.count;state.audience=spec.audience;
  state.selected=0;state.simpleMode=false;
  history.replaceState(null,"",location.pathname+location.search+"#editor");
  render();
  toast("Editable "+created.slides.length+"-slide presentation ready. Review the content and export PowerPoint.");
 }catch(err){
  state.simpleError=String(err.message||"Unable to process the files.");
  state.simpleStatus="Review the error, update your files, then try again.";
  render();
 }finally{
  state.simpleBusy=false;
 }
}

function agentRefresh(){render();const el=document.getElementById("agent-chat");if(el)el.scrollTop=el.scrollHeight;}
function agentSetFiles(files){
 const incoming=Array.from(files||[]);
 if(!incoming.length)return;
 state.agentFiles=[...state.agentFiles,...incoming].filter((f,i,list)=>list.findIndex(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified)===i).slice(0,20);
 state.agentError="";agentRefresh();
}
function connectPuter(){
 if(window.puter?.ai?.chat)return Promise.resolve(window.puter);
 return new Promise((resolve,reject)=>{
  let script=document.getElementById("puter-sdk");
  if(!script){script=document.createElement("script");script.id="puter-sdk";script.src="https://js.puter.com/v2/";script.async=true;document.head.appendChild(script);}
  if(window.puter?.ai?.chat){resolve(window.puter);return;}
  script.addEventListener("load",()=>window.puter?.ai?.chat?resolve(window.puter):reject(Error("AI SDK loaded without an AI client.")),{once:true});
  script.addEventListener("error",()=>reject(Error("Cannot load Puter AI. Check connectivity or use offline mode.")),{once:true});
 });
}
async function agentSend(){
 if(state.agentBusy)return;
 const instruction=state.agentDraft.trim();
 if(instruction.length<5){state.agentError="Describe what the presentation should contain.";agentRefresh();return;}
 if(state.agentAi&&!state.agentConsent){state.agentError="Please authorize sharing extracted content with Puter AI, or choose Offline draft.";agentRefresh();return;}
 const unsupported=state.agentFiles.filter(f=>isServerFormat(f.name)&&!/\. (mp3|wav|m4a)$/i.test(f.name));
 // Video and old Office files remain unsupported without the private converter.
 const unhandled=state.agentFiles.filter(f=>isServerFormat(f.name)&&!/\.(mp3|wav|m4a)$/i.test(f.name));
 if(unhandled.length){state.agentError="These files require conversion: "+unhandled.map(f=>f.name).join(", ")+". For video, upload captions (.srt/.vtt) or a transcript.";agentRefresh();return;}
 const spec=parseBrief(instruction,{count:state.agentHasDeck?state.deck.slides.length:8,audience:state.deck.audience,theme:state.deck.theme});
 state.agentBusy=true;state.agentError="";state.agentStatus="Reading the uploaded sources";state.agentMessages.push({role:"user",text:instruction});agentRefresh();
 try{
  let aiClient=null;
  if(state.agentAi){state.agentStatus="Connecting to Puter AI";agentRefresh();aiClient=await connectPuter();}
  const newFiles=state.agentFiles.filter(f=>!state.agentDocs.some(d=>d.name===f.name&&d.bytes===f.size));
  if(newFiles.length){
   const audio=newFiles.filter(f=>/\.(mp3|wav|m4a)$/i.test(f.name));
   const normal=newFiles.filter(f=>!/\.(mp3|wav|m4a)$/i.test(f.name));
   let docs=[];
   if(normal.length){
    const result=await ingestFiles(normal,{},({index,total,name})=>{
     const status=document.querySelector(".a-thinking");
     if(status)status.textContent="Reading "+index+" of "+total+": "+name;
    });
    if(result.errors.length)throw Error("Unable to extract: "+result.errors.map(x=>x.name+" ("+x.error+")").join("; "));
    docs=result.documents;
   }
   for(const f of audio){
    if(!aiClient?.ai?.speech2txt)throw Error("Audio requires Puter AI speech transcription. Enable AI mode.");
    state.agentStatus="Transcribing "+f.name;agentRefresh();
    const answer=await aiClient.ai.speech2txt(f);
    const transcription=typeof answer==="string"?answer:answer?.text;
    if(!transcription?.trim())throw Error("No transcription returned for "+f.name);
    docs.push({name:f.name,kind:"transcript",text:transcription,bytes:f.size});
   }
   state.agentDocs=[...state.agentDocs,...docs].slice(0,20);
  }
  const prev=state.agentHasDeck?state.deck:null;
  state.agentStatus=state.agentAi?"AI is writing the slides":"Creating a structured offline draft";agentRefresh();
  let output;
  if(state.agentAi){
    const prompt=prepareAgentPrompt({instruction,documents:state.agentDocs,deck:prev,count:spec.count,audience:spec.audience,theme:spec.theme});
    const response=await aiClient.ai.chat(prompt,{model:"gpt-5.4",normalize:true,max_tokens:6500});
    output=decodeAgentDeck(response,{documents:state.agentDocs,fallbackTheme:spec.theme,fallbackAudience:spec.audience});
  }else if(state.agentDocs.length){
    output=buildSourceDeck(state.agentDocs,spec);
  }else output=generateDeck(instruction,spec);
  state.deck=output;state.agentHasDeck=true;state.selected=0;
  state.agentMessages.push({role:"assistant",text:(state.agentAi?"AI completed":"Offline draft completed")+" "+output.slides.length+" editable slides. Preview the result, download PowerPoint, or send another instruction to revise."});
  state.agentDraft="";state.agentFiles=[];save();agentRefresh();
 }catch(err){
  state.agentError=String(err?.message||"Unable to generate your presentation.");
  state.agentMessages.push({role:"assistant",text:"I could not complete this request: "+state.agentError});
  agentRefresh();
 }finally{state.agentBusy=false;state.agentStatus="";agentRefresh();}
}

async function action(name,target){
  const slide=current();
  switch(name){
  case "agent-home":
    state.agentMode=true;state.simpleMode=false;history.replaceState(null,"",location.pathname+location.search);render();break;
  case "agent-remove":state.agentFiles.splice(Number(target.dataset.index),1);state.agentError="";render();break;
  case "agent-new":
    state.agentHasDeck=false;state.agentFiles=[];state.agentDocs=[];state.agentMessages=[];state.agentDraft="";state.agentError="";state.deck=starterDeck();state.selected=0;render();break;
  case "agent-send":await agentSend();break;
  case "agent-prev":state.selected=Math.max(0,state.selected-1);render();break;
  case "agent-next":state.selected=Math.min(state.deck.slides.length-1,state.selected+1);render();break;
  case "agent-slide":state.selected=Number(target.dataset.index);render();break;
  case "agent-export":await action("pptx",target);break;
  case "open-advanced":
    state.agentMode=false;state.simpleMode=false;history.replaceState(null,"",location.pathname+location.search+"#editor");render();break;
  case "simple-home":
    state.agentMode=false;state.simpleMode=true;history.replaceState(null,"",location.pathname+location.search+"#simple");render();break;
  case "choose-simple-files":document.getElementById("simple-upload")?.click();break;
  case "simple-remove":
    state.simpleFiles.splice(Number(target.dataset.index),1);state.simpleError="";render();break;
  case "simple-generate":await generateFromSimple();break;
  case "select":state.selected=Number(target.dataset.index);render();break;
  case "generate":
    try{state.deck=generateDeck(state.prompt,{count:state.count,audience:state.audience,theme:state.deck.theme});state.selected=0;render();toast("Outline generated. Review and personalize each slide.");}
    catch(err){toast(err.message,true);}
    break;
  case "add":state.deck.slides.splice(state.selected+1,0,makeSlide("bullets",{eyebrow:"NEW SLIDE",title:"A clear, decisive headline"}));state.selected++;render();break;
  case "duplicate":state.deck.slides.splice(state.selected+1,0,makeSlide(slide.layout,{...slide,id:undefined}));state.selected++;render();break;
  case "delete":
    if(state.deck.slides.length===1){toast("Keep at least one slide.",true);break;}
    state.deck.slides.splice(state.selected,1);state.selected=Math.min(state.selected,state.deck.slides.length-1);render();break;
  case "move-left":move(-1);break;
  case "move-right":move(1);break;
  case "download-json":download(safeFileName(state.deck.title)+".json",JSON.stringify(state.deck,null,2),"application/json");toast("Editable project saved.");break;
  case "download-markdown":download(safeFileName(state.deck.title)+".md",markdownExport(state.deck),"text/markdown");break;
  case "pptx":
    if(state.exporting)return;
    try{state.exporting=true;toast("Building editable PowerPoint…");await exportPowerpoint(state.deck);toast("PowerPoint file exported.");}
    catch(err){toast("PowerPoint export failed: "+(err.message||"Unknown error"),true);}
    finally{state.exporting=false;}
    break;
  case "import":state.importOpen=true;render();document.getElementById("importText")?.focus();break;
  case "close-import":state.importOpen=false;render();break;
  case "confirm-import":{
    const content=document.getElementById("importText")?.value||"";
    try{const d=content.trim().startsWith("{")?sanitizeDeck(JSON.parse(content)):parseOutline(content);state.deck=d;state.selected=0;state.importOpen=false;render();toast("Editable outline imported.");}
    catch(err){toast(err.message,true);}break;}
  case "analyze-paste":
    try{importPastedArticle(document.getElementById("importText")?.value);}
    catch(err){toast(err.message,true);}break;
  case "choose-file":document.getElementById("fileImport")?.click();break;
  case "help":state.helpOpen=true;render();break;
  case "close-help":state.helpOpen=false;render();break;
  }
}
app.addEventListener("click",(event)=>{
  const button=event.target.closest("[data-action],[data-theme]");
  if(!button)return;
  if(button.dataset.theme){state.deck.theme=button.dataset.theme;render();return;}
  action(button.dataset.action,button);
});
app.addEventListener("input",(event)=>{
  const x=event.target;
  if(x.id==="agent-prompt"){state.agentDraft=x.value;return;}
  if(x.id==="simple-instructions"){state.simpleInstructions=x.value;return;}
  if(x.dataset.prompt!==undefined){state.prompt=x.value;save();return;}
  if(x.dataset.deckField==="title"){state.deck.title=x.value.slice(0,140);save();return;}
  if(x.dataset.slideField!==undefined&&x.dataset.slideField!=="layout"){
    current()[x.dataset.slideField]=x.value;save();redrawSlide();return;
  }
  if(x.dataset.metric!==undefined){const item=current().metrics[Number(x.dataset.metric)];item[x.dataset.metricField]=x.value;save();redrawSlide();return;}
  if(x.dataset.chart){
    const bits=x.value.split(",").slice(0,8).map(q=>q.trim());
    if(x.dataset.chart==="labels")current().chartLabels=bits;
    else current().chartValues=bits.map(v=>Math.max(0,Math.min(1000000,Number(v)||0)));
    save();redrawSlide();
  }
});
app.addEventListener("change",(event)=>{
  const x=event.target;
  if(x.id==="agent-upload"){agentSetFiles(x.files);return;}
  if(x.id==="agent-consent"){state.agentConsent=x.checked;state.agentError="";return;}
  if(x.id==="agent-engine"){state.agentAi=x.value==="ai";state.agentError="";render();return;}
  if(x.id==="simple-upload"){acceptSimpleFiles(x.files);return;}
  if(x.dataset.simpleTheme!==undefined){state.deck.theme=x.value;save();return;}
  if(x.dataset.audience!==undefined){state.audience=x.value;save();return;}
  if(x.dataset.count!==undefined){state.count=Number(x.value);save();return;}
  if(x.dataset.slideField==="layout"){current().layout=x.value;render();return;}
  if(x.id==="fileImport")importSourceFiles(x.files);
});
app.addEventListener("dragover",(event)=>{if((state.importOpen&&event.target.closest("#dropArea"))||(state.simpleMode&&event.target.closest("#simple-dropzone"))||(state.agentMode&&event.target.closest("#agent-drop"))){event.preventDefault();event.dataTransfer.dropEffect="copy";}});
app.addEventListener("drop",(event)=>{if(state.agentMode&&event.target.closest("#agent-drop")){event.preventDefault();agentSetFiles(event.dataTransfer.files);}else if(state.simpleMode&&event.target.closest("#simple-dropzone")){event.preventDefault();acceptSimpleFiles(event.dataTransfer.files);}else if(state.importOpen&&event.target.closest("#dropArea")){event.preventDefault();importSourceFiles(event.dataTransfer.files);}});
app.addEventListener("keydown",(event)=>{if(event.target.id==="agent-prompt"&&event.key==="Enter"&&!event.shiftKey){event.preventDefault();action("agent-send",{});}});
window.addEventListener("keydown",(event)=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="s"){event.preventDefault();action("download-json",{});}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="e"){event.preventDefault();action("pptx",{});}
  if(event.key==="Escape"&&(state.importOpen||state.helpOpen)){state.importOpen=false;state.helpOpen=false;render();}
});
render();
