import "./styles.css";
import {THEMES,LAYOUTS,AUDIENCES,STORAGE_KEY,starterDeck,generateDeck,parseOutline,sanitizeDeck,makeSlide,bulletLines,markdownExport,safeFileName} from "./core.js";
import {exportPowerpoint} from "./pptx.js";

const app=document.querySelector("#app");
const escapeHtml=(value)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={cover:"Cover",section:"Chapter",bullets:"Editorial",split:"Two-column",stats:"Key figures",chart:"Chart",quote:"Quotation",closing:"Closing"};
const symbols={cover:"◈",section:"≡",bullets:"☷",split:"◫",stats:"▦",chart:"▥",quote:"❝",closing:"◎"};
function load(){
  try {const x=localStorage.getItem(STORAGE_KEY);return x?sanitizeDeck(JSON.parse(x)):starterDeck();}
  catch {return starterDeck();}
}
const state={deck:load(),selected:0,prompt:"The future of clean industrial energy",count:8,audience:"Executive board",importOpen:false,helpOpen:false,exporting:false};
const current=()=>state.deck.slides[Math.min(state.selected,state.deck.slides.length-1)];
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.deck));}catch{}}
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
  state.selected=Math.min(state.selected,state.deck.slides.length-1);
  app.innerHTML=
  '<div class="shell">'+
  '<aside class="brand-rail"><div class="brand-mark">P<span>.</span></div><div class="rail-line"></div><div class="rail-name">STUDIO</div><div class="rail-bottom">PD<br>26</div></aside>'+
  '<div class="workspace">'+
    '<header class="topbar"><div class="breadcrumb"><span class="breadcrumb-home">Workspace</span><span class="chev">/</span><span>Presentation editor</span></div>'+
      '<div class="top-actions"><span class="privacy-dot"></span><span class="private-label">LOCAL-FIRST WORKSPACE</span>'+
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
       '<div class="divider"></div><div class="section-title">03 <span>IMPORT & REUSE</span></div><div class="import-tools"><button data-action="import" class="import-control">↥ <span>Import outline or JSON</span></button><button data-action="download-markdown" class="import-control">↧ <span>Export Markdown outline</span></button></div>'+
       '<div class="create-foot"><span class="foot-indicator"></span> Auto-saved on this device</div></div></aside>'+
      '<main class="center-panel"><div class="deck-topline"><div><div class="content-overline">CURRENT PRESENTATION</div><input class="deck-title-input" aria-label="Presentation title" data-deck-field="title" value="'+escapeHtml(state.deck.title)+'" /><div class="deck-meta">'+state.deck.slides.length+' slides <span>·</span> '+escapeHtml(state.deck.audience)+' <span>·</span> 16:9 widescreen</div></div>'+
      '<div class="deck-controls"><button data-action="move-left" title="Move current slide left">←</button><button data-action="move-right" title="Move current slide right">→</button><button data-action="add" class="add-slide">＋ Add slide</button></div></div>'+
      '<div class="stage-outer"><div class="stage-grid"><div class="preview-header"><span><span class="pulsing-dot"></span> LIVE CANVAS</span><span>POWERPOINT · 16:9</span></div><div id="previewHost" class="slide-stage">'+renderSlide(current())+'</div><div class="preview-bottom"><span>Slide '+(state.selected+1)+' of '+state.deck.slides.length+'</span><span class="preview-note">Native text, shapes & charts on export</span></div></div></div>'+
      '<div class="timeline-heading"><div><span class="section-bullet">◈</span> STORYBOARD <span class="timeline-count">'+state.deck.slides.length+'</span></div><span>SELECT A SLIDE TO EDIT</span></div><div id="thumbnails" class="thumbnail-scroll">'+state.deck.slides.map(thumbnail).join("")+'<button class="thumb-add" data-action="add"><span>+</span><small>New slide</small></button></div>'+
      '</main>'+
      '<aside class="edit-panel"><div class="edit-top"><span>EDITOR</span><span class="status-pill"><i></i> READY</span></div>'+editor()+'<div class="inspector-foot"><div>✦ <strong>DESIGN ASSIST</strong></div><p>Use one message per slide. Replace every demo value with sourced data before sharing.</p></div></aside>'+
    '</div></div></div>'+
    '<div id="toasts" class="toasts" role="status" aria-live="polite"></div>'+
    (state.importOpen?'<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><button class="modal-close" data-action="close-import" aria-label="Close">×</button><div class="panel-kicker">IMPORT</div><h2 id="import-title">Bring your outline.</h2><p>Paste Markdown with ## slide headings, or choose a .md, .txt or PrismDeck .json file.</p><textarea id="importText" rows="10" placeholder="## Opening slide&#10;Core message&#10;&#10;## Supporting case&#10;- Evidence one&#10;- Evidence two"></textarea><input id="fileImport" type="file" accept=".md,.txt,.json,application/json,text/plain" hidden /><div class="modal-row"><button data-action="choose-file" class="top-secondary">Choose file</button><button data-action="confirm-import" class="primary-button">Import deck ↗</button></div></div></div>':"")+
    (state.helpOpen?'<div class="modal-backdrop"><div class="modal help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" data-action="close-help" aria-label="Close">×</button><div class="panel-kicker">WORKSPACE GUIDE</div><h2 id="help-title">A better presentation, faster.</h2><p>Describe a topic, select an audience and build an editable framework. Click a slide to refine its headline, body, statistics, and speaker notes.</p><div class="shortcut">Ctrl / ⌘ + S <span>Save .json project</span></div><div class="shortcut">Ctrl / ⌘ + E <span>Export editable PowerPoint</span></div><p class="help-fine">The outline generator is deterministic and offline. Exported charts are editable PowerPoint objects. No payment or cloud account is required.</p></div></div>':"");
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
async function importFile(file){
  if(!file)return;
  if(file.size>2*1024*1024){toast("Import files must be below 2 MB.",true);return;}
  try {
    const str=await file.text();const d=file.name.toLowerCase().endsWith(".json")?sanitizeDeck(JSON.parse(str)):parseOutline(str);
    state.deck=d;state.selected=0;state.importOpen=false;render();toast("Deck imported.");
  }catch(err){toast(err.message||"File import failed.",true);}
}
async function action(name,target){
  const slide=current();
  switch(name){
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
    const text=document.getElementById("importText")?.value;
    try{const d=text.trim().startsWith("{")?sanitizeDeck(JSON.parse(text)):parseOutline(text);state.deck=d;state.selected=0;state.importOpen=false;render();toast("Outline imported.");}
    catch(err){toast(err.message,true);}break;}
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
  if(x.dataset.prompt!==undefined){state.prompt=x.value;return;}
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
  if(x.dataset.audience!==undefined){state.audience=x.value;return;}
  if(x.dataset.count!==undefined){state.count=Number(x.value);return;}
  if(x.dataset.slideField==="layout"){current().layout=x.value;render();return;}
  if(x.id==="fileImport")importFile(x.files?.[0]);
});
window.addEventListener("keydown",(event)=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="s"){event.preventDefault();action("download-json",{});}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="e"){event.preventDefault();action("pptx",{});}
  if(event.key==="Escape"&&(state.importOpen||state.helpOpen)){state.importOpen=false;state.helpOpen=false;render();}
});
render();
