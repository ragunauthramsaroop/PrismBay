#!/usr/bin/env node
/* Rebuild scene-bounded P-A-C-E-R captions from original text and measured Kokoro speech.
   Technical scaffold only. Scene durations are measured; individual word timings are NOT forced-aligned.
   Never publish from this generator without independent listening and editorial signoff. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const base=path.join(root,"youtube-growth/production");
const read=n=>fs.readFileSync(path.join(base,n),"utf8");
const measured=JSON.parse(read("2026-11-02-pacer-measured-kokoro-605s-retiming.json"));
const source=JSON.parse(read("2026-11-02-pacer-sentence-aligned-voiceover-cues.json"));
const oldSrt=read("2026-11-02-pacer-provisional-captions.srt");
const norm=s=>s.replace(/\s+/g," ").trim();
function millis(t){const x=t.split(/[:,]/).map(Number);return (((x[0]*60+x[1])*60+x[2])*1000+x[3]);}
function stamp(ms){const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,mm=ms%1000;return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":")+","+String(mm).padStart(3,"0");}
const cues=oldSrt.trim().split(/\r?\n\r?\n/).map(b=>{const a=b.split(/\r?\n/),t=a[1].split(" --> ");return {id:Number(a[0]),a:millis(t[0]),b:millis(t[1]),lines:a.slice(2)};});
if(measured.channel_id!=="UCw2hs85TzIpdKwJtG-BSxzQ"||measured.handle!=="@PrismBayAI"||String(measured.metricool_brand_id)!=="6945443"||source.channel_id!==measured.channel_id||measured.release_gates.public_upload_permitted!==false)throw Error("Channel or publication gate mismatch");
const out=[],seen=[],scenes=[];let maxCps=0,minDuration=Infinity,lastSceneEnd=0;
for(let i=0;i<22;i++){
 const old=source.scenes[i],sc=measured.scenes[i];
 if(old.scene!==i+1||sc.scene!==i+1||sc.start_s*1000!==lastSceneEnd)throw Error("Scene continuity "+(i+1));
 const own=cues.filter(c=>c.a>=old.start_s*1000&&c.b<=old.end_s*1000);
 if(!own.length||norm(own.map(c=>c.lines.join(" ")).join(" "))!==norm(old.original_text))throw Error("Transcript mismatch "+(i+1));
 let first=null,last=null;
 for(const c of own){
  const a=Math.round(sc.start_s*1000+(c.a-old.start_s*1000)/(old.duration_s*1000)*(sc.measured_speech_s*1000));
  const b=Math.round(sc.start_s*1000+(c.b-old.start_s*1000)/(old.duration_s*1000)*(sc.measured_speech_s*1000));
  if(first===null)first=a;
  if(last!==null&&a!==last)throw Error("Cue gap within scene "+(i+1));
  const duration=b-a,txt=c.lines.join(" "),cps=txt.length/(duration/1000);
  if(duration<1200||cps>22||c.lines.length>2||c.lines.some(l=>l.length>40)||b>sc.end_s*1000)throw Error("Readability or timing failure at cue "+c.id);
  maxCps=Math.max(maxCps,cps);minDuration=Math.min(minDuration,duration);
  out.push(c.id+"\n"+stamp(a)+" --> "+stamp(b)+"\n"+c.lines.join("\n")+"\n");
  seen.push(txt);last=b;
 }
 if(first!==sc.start_s*1000||Math.abs(last-(sc.start_s*1000+sc.measured_speech_s*1000))>1)throw Error("Speech end mismatch "+(i+1));
 scenes.push({scene:i+1,caption_cues:own.length,start_ms:first,speech_end_ms:last,scene_end_ms:sc.end_s*1000,post_speech_pause_ms:sc.end_s*1000-last});
 lastSceneEnd=sc.end_s*1000;
}
if(out.length!==155||cues.length!==155||lastSceneEnd!==605000||norm(seen.join(" "))!==norm(source.scenes.map(x=>x.original_text).join(" ")))throw Error("Caption count or word coverage mismatch");
const srt=out.join("\n")+"\n";
const qa={schema:"prismbay-pacer-measured-scene-caption-qa-v1",channel_id:measured.channel_id,handle:measured.handle,metricool_brand_id:"6945443",episode_id:measured.episode_id,source_narration_sha256:measured.narration_source_sha256,measured_timeline:"youtube-growth/production/2026-11-02-pacer-measured-kokoro-605s-retiming.json",source_captions:"youtube-growth/production/2026-11-02-pacer-provisional-captions.srt",caption_cues:out.length,scenes:22,original_words:1246,video_duration_s:605,measured_speech_total_s:561.02,caption_first_ms:0,caption_last_ms:scenes.at(-1).speech_end_ms,max_cps:Number(maxCps.toFixed(2)),min_cue_duration_s:Number((minDuration/1000).toFixed(3)),scene_stats:scenes,caption_method:"Per-scene proportional retiming to measured synthesized speech duration. Word-level phoneme timing has NOT been verified. No publication authorization.",word_level_synchronized:false,full_narration_listening:false,rights_review:false,editorial_approval:false,public_upload_permitted:false,paid_spend_usd:0};
const files=[["2026-11-02-pacer-measured-scene-captions.srt",srt],["2026-11-02-pacer-measured-scene-caption-qa.json",JSON.stringify(qa,null,2)+"\n"]];
if(process.argv.includes("--write")){for(const [n,v] of files)fs.writeFileSync(path.join(base,n),v,"utf8");}
else if(process.argv.includes("--check")){for(const [n,v] of files)if(read(n)!==v)throw Error("Caption output mismatch "+n);}
else throw Error("Pass --write or --check");
console.log("PASS: 155 scene-bounded provisional cues, 22 scenes, 1246 original words, 605 seconds. Not word-level aligned. No publication.");
