#!/usr/bin/env node
/* PrismBay AI private caption timing scaffold. Estimates only, never audio-synced. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function wrap(t){if(t.length<=40)return t;let w=t.split(" "),best=null;for(let i=1;i<w.length;i++){let a=w.slice(0,i).join(" "),b=w.slice(i).join(" ");if(a.length>40||b.length>40)continue;let score=Math.abs(a.length-b.length);if(!best||score<best.score)best={score,a,b};}if(!best)throw Error("No 40-character wrap: "+t);return best.a+"\n"+best.b;}
function groups(text){
 const words=text.trim().split(/\s+/), out=[];let cur=[];
 for(const w of words){if(cur.length&&[...cur,w].join(" ").length>61){out.push(cur.join(" "));cur=[w];}else cur.push(w);if(cur.join(" ").length>=43&&/[.!?]$/.test(w)){out.push(cur.join(" "));cur=[];}}
 if(cur.length)out.push(cur.join(" "));
 for(let i=out.length-1;i>=1;i--){if(out[i].length>=24)continue;let ws=(out[i-1]+" "+out[i]).split(" "),best=null;for(let k=1;k<ws.length;k++){let a=ws.slice(0,k).join(" "),b=ws.slice(k).join(" ");if(a.length>65||b.length>65||a.length<20||b.length<20)continue;try{wrap(a);wrap(b);}catch{continue;}let score=Math.abs(a.length-b.length);if(!best||score<best.score)best={score,a,b};}if(best){out[i-1]=best.a;out[i]=best.b;}}
 return out;
}
function timestamp(ms){const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,mm=ms%1000;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":")+","+String(mm).padStart(3,"0");}
function makeSrt(data){
 if(data.channel_id!=="UCw2hs85TzIpdKwJtG-BSxzQ"||data.handle!=="@PrismBayAI"||data.scenes.length!==22)throw Error("Wrong channel or scene count");
 if(data.release_gates.public_upload_permitted!==false||data.release_gates.measured_audio_sync!==false)throw Error("Source not marked provisional");
 const out=[],report=[],seen=[];let last=0,idx=0;
 for(const sc of data.scenes){
  if(sc.start_s*1000!==last)throw Error("Scene gap at "+sc.scene);
  const gs=groups(sc.original_text);
  if(gs.join(" ").replace(/\s+/g," ")!==sc.original_text.replace(/\s+/g," "))throw Error("Text lost at scene "+sc.scene);
  const duration=(sc.end_s-sc.start_s)*1000,weights=gs.map(x=>x.length),sum=weights.reduce((a,b)=>a+b,0);let acc=0,starts=[0];
  for(let i=0;i<gs.length;i++){acc+=weights[i];starts.push(Math.round(duration*acc/sum));}
  for(let i=0;i<gs.length;i++){
   const start=sc.start_s*1000+starts[i],end=sc.start_s*1000+starts[i+1],txt=wrap(gs[i]),dur=end-start,cps=gs[i].length/(dur/1000);
   if(start!==last||dur<1200||dur>8500||cps>22||txt.split("\n").length>2||txt.split("\n").some(l=>l.length>40))throw Error("Caption QA failed at scene "+sc.scene+" cue "+i);
   idx++;out.push(`${idx}\n${timestamp(start)} --> ${timestamp(end)}\n${txt}\n`);last=end;seen.push(gs[i]);report.push({scene:sc.scene,duration_ms:dur,cps});
  }
 }
 if(last!==570000||seen.join(" ").replace(/\s+/g," ")!==data.scenes.map(s=>s.original_text).join(" ").replace(/\s+/g," "))throw Error("Timeline or transcript mismatch");
 return {srt:out.join("\n"),stats:{channel_id:data.channel_id,cues:idx,scenes:data.scenes.length,duration_s:last/1000,source_words:data.total_narration_words,max_cps:Number(Math.max(...report.map(x=>x.cps)).toFixed(2)),min_cue_s:Math.min(...report.map(x=>x.duration_ms))/1000,max_cue_s:Math.max(...report.map(x=>x.duration_ms))/1000,caption_status:"PROVISIONAL TIMING ONLY; NOT VERIFIED AGAINST RECORDED NARRATION",publish_permitted:false,paid_spend_usd:0}};
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source = path.join(root,"youtube-growth/production/2026-11-02-pacer-sentence-aligned-voiceover-cues.json");
const output = path.join(root,"youtube-growth/production/2026-11-02-pacer-provisional-captions.srt");
const data = JSON.parse(fs.readFileSync(source,"utf8"));
const built = makeSrt(data);
if(process.argv.includes("--write")) { fs.writeFileSync(output,built.srt,"utf8"); }
else if(process.argv.includes("--check")) { const existing=fs.readFileSync(output,"utf8"); if(existing!==built.srt) throw Error("Provisional captions differ from source cues. Run --write and commit the reviewed change."); }
else throw Error("Pass --check or --write");
process.stdout.write(JSON.stringify(built.stats,null,2)+"\\n");
