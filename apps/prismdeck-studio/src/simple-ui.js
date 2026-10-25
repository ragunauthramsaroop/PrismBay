import {SOURCE_ACCEPT,isServerFormat} from "./ingest.js";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bytes=n=>n<1024*1024?(n/1024).toFixed(0)+" KB":(n/1024/1024).toFixed(1)+" MB";
export function renderSimple(state) {
 const files=(state.simpleFiles||[]).map((f,i)=>
  '<li class="s-file"><span class="s-file-icon" aria-hidden="true">▤</span><span class="s-file-name">'+esc(f.name)+'</span><span class="s-file-size">'+bytes(f.size)+'</span><button class="s-remove" data-action="simple-remove" data-index="'+i+'" aria-label="Remove '+esc(f.name)+'">×</button></li>'
 ).join("");
 const warning=state.simpleFiles?.some(f=>isServerFormat(f.name));
 const error=state.simpleError?'<div class="s-alert" role="alert">'+esc(state.simpleError)+'</div>':"";
 return '<main class="s-shell"><header class="s-header"><div class="s-brand"><span class="s-logo">P<span>.</span></span><div><strong>PrismDeck</strong><small>Presentation Studio</small></div></div><button type="button" class="s-advanced" data-action="open-advanced">Advanced editor <span aria-hidden="true">↗</span></button></header>'+
 '<section class="s-hero"><div class="s-kicker"><span class="s-kicker-mark">✦</span> PRESENTATION GENERATOR</div><h1>Upload. Instruct.<br><em>Present.</em></h1><p class="s-intro">Upload your material, describe the presentation you want, then generate editable PowerPoint slides.</p>'+
 '<div class="s-workform"><div class="s-field-row"><span class="s-step">01</span><div><h2>Add your source files</h2><p>Documents, reports, existing slides, and spreadsheets.</p></div></div>'+
 '<div class="s-drop" id="simple-dropzone"><div class="s-drop-icon" aria-hidden="true">↑</div><strong>Drag files here, or choose from your device</strong><span>PDF, DOCX, PPTX, XLSX, CSV, TXT, HTML, captions</span><button type="button" data-action="choose-simple-files" class="s-choose">Choose files</button><input id="simple-upload" type="file" accept="'+SOURCE_ACCEPT+'" multiple hidden aria-label="Upload source files" /></div>'+
 (files?'<div class="s-upload-caption">'+state.simpleFiles.length+' file'+(state.simpleFiles.length===1?"":"s")+' selected</div><ul class="s-files">'+files+'</ul>':'<p class="s-upload-hint">You may also start with instructions only.</p>')+
 (warning?'<p class="s-unsupported">Video, audio, and old .doc/.ppt formats need the private conversion service, which is not connected. Upload a transcript or modern Office file instead.</p>':"")+
 '<div class="s-section-line"></div><div class="s-field-row"><span class="s-step">02</span><div><h2>What should the presentation do?</h2><p>Write your instructions in plain language.</p></div></div>'+
 '<label class="s-sr-only" for="simple-instructions">Presentation instructions</label><textarea id="simple-instructions" class="s-brief" rows="5" maxlength="4000" placeholder="Example: Make 10 slides for the board. Highlight the main findings, performance figures, and recommendations. Keep the text concise. Use a dark theme.">'+esc(state.simpleInstructions||"")+'</textarea>'+
 '<details class="s-options"><summary>Optional settings</summary><div class="s-options-grid"><label>Slides<select data-count>'+[4,5,6,7,8,10,12,14].map(n=>'<option value="'+n+'" '+(state.count===n?"selected":"")+'>'+n+'</option>').join("")+'</select></label><label>Design<select data-simple-theme>'+Object.entries(state.simpleThemes||{}).map(([key,name])=>'<option value="'+key+'" '+(state.deck.theme===key?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label></div></details>'+
 '<button type="button" data-action="simple-generate" class="s-generate" '+(state.simpleBusy?"disabled":"")+'><span>✦</span><strong>'+(state.simpleBusy?"Reading source files...":"Generate presentation")+'</strong><span class="s-generate-arrow" aria-hidden="true">→</span></button>'+
 '<div class="s-feedback" id="simple-progress" role="status" aria-live="polite">'+esc(state.simpleStatus||"Sources are processed on your device when supported. Review all extracted claims before sharing.")+'</div>'+error+'</div>'+
 '<div class="s-mini-footer"><span><b>01</b> Upload files</span><span class="s-small-arrow">→</span><span><b>02</b> Give instructions</span><span class="s-small-arrow">→</span><span><b>03</b> Download PPTX</span></div></section>'+
 '<footer class="s-footer"><span>PRISMDECK STUDIO</span><span>Local-first editing • Editable PowerPoint • No account required</span></footer><div id="toasts" class="toasts" role="status" aria-live="polite"></div></main>';
}
