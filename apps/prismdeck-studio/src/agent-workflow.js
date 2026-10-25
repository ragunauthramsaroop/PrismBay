// Replit-inspired transparent presentation workflow. Local, synchronous steps only.
// A task is never marked complete before the corresponding work succeeds.
import {sanitizeDeck,bulletLines} from "./core.js";
export const TASK_DEFS=[
 {id:"read",title:"Inspect source files",detail:"Extract text, document titles and spreadsheet values"},
 {id:"plan",title:"Plan the presentation",detail:"Interpret the brief and assemble a proposed structure"},
 {id:"compose",title:"Compose slide content",detail:"Draft editable slides from the supplied material"},
 {id:"verify",title:"Review evidence and quality",detail:"Check source references, numbers and presentation structure"},
 {id:"approve",title:"Review and approve",detail:"You decide whether to apply this draft"}
];
export function freshTasks(hasFiles=false){
 return TASK_DEFS.map((x,i)=>({...x,status:!hasFiles&&i===0?"skipped":"queued",message:""}));
}
export function setTask(tasks,id,status,message=""){
 if(!["queued","active","complete","failed","ready","skipped"].includes(status))throw Error("Invalid task status");
 return tasks.map(t=>t.id===id?{...t,status,message}:t);
}
export function planDeckJob(instruction,files=[],documents=[],options={}){
 const names=Array.from(files||[]).map(x=>x.name);
 const title=String(instruction||"").trim().slice(0,180);
 const actions=[];
 actions.push("Extract "+(names.length?names.length+" attachment(s)":"the written brief"));
 actions.push("Build "+(options.count||8)+"-slide "+(options.audience||"executive")+" story");
 if(documents.length)actions.push("Use evidence from "+documents.map(x=>x.name).slice(0,4).join(", "));
 actions.push("Check source references and numeric claims");
 actions.push("Stage editable PowerPoint for your approval");
 return {brief:title,files:names,actions,mode:options.mode||"AI",createdAt:new Date().toISOString()};
}
const significantNums=text=>{
 const re=/(?<![\w])(?:US\$|USD|GYD|\$|€|£)?\s*\d[\d,.]*(?:\s*(?:%|percent|MWp?|MWh|kWh|litres|liters|tons|tonnes|million|billion|km|ha|acres|employees|oz|years))?/ig;
 return (String(text||"").match(re)||[]).map(x=>x.trim()).filter(x=>/\d/.test(x)&&!/^0\d/.test(x));
};
const normalizeNumeric=n=>String(n).toLowerCase().replace(/\s+/g,"").replace(/,/g,"");
const numberInSource=(number,all)=>{
 const needle=normalizeNumeric(number);
 return all.includes(needle)||all.includes(needle.replace(/^(usd|us\$|gyd|\$)/,""))||
 /^[1-9]$/.test(needle); // Short list item numbers are not meaningful evidence.
};
export function auditDeck(candidate,documents=[],expectedCount=0){
 const d=sanitizeDeck(candidate);
 const src=(Array.isArray(documents)?documents:[]);
 const raw=src.map(x=>x.text||"").join("\n");
 const normalized=normalizeNumeric(raw);
 const sourceNames=src.map(x=>x.name);
 const issues=[],seen=new Set();
 if(expectedCount&&d.slides.length!==expectedCount)issues.push({severity:"review",slide:0,text:"Deck has "+d.slides.length+" slides; request was "+expectedCount+"."});
 const placeholder=/\[(?:metric|tbd|owner|date|verify|not given)\]|(?:replace this|insert text|lorem ipsum|source data)/i;
 d.slides.forEach((slide,index)=>{
  const label="Slide "+(index+1);
  const title=slide.title.toLowerCase().trim();
  if(seen.has(title))issues.push({severity:"review",slide:index,text:label+": repeated title: "+slide.title});
  seen.add(title);
  if(placeholder.test([slide.title,slide.subtitle,slide.body,...(slide.layout==="stats"?slide.metrics.map(m=>m.value):[])].join(" ")))
   issues.push({severity:"review",slide:index,text:label+": contains placeholder content; replace before publishing."});
  if(src.length&&index>0&&slide.layout!=="closing"&&!sourceNames.some(name=>slide.notes.includes(name))){
   issues.push({severity:"review",slide:index,text:label+": no uploaded filename in speaker notes."});
  }
  if(src.length){
   const numbers=significantNums([slide.title,slide.subtitle,...bulletLines(slide),...(slide.layout==="stats"?slide.metrics.map(m=>m.value):[])].join(" "));
   const unmatched=[...new Set(numbers)].filter(n=>!numberInSource(n,normalized));
   if(unmatched.length)issues.push({severity:"review",slide:index,text:label+": numerical claims need source checks: "+unmatched.slice(0,3).join(", ")});
  }
 });
 const metrics={
  slides:d.slides.length,
  sources:src.length,
  citedSlides:src.length?d.slides.filter(x=>sourceNames.some(n=>x.notes.includes(n))).length:0,
  warnings:issues.length
 };
 return {ok:d.slides.length>0,issues:issues.slice(0,35),metrics,needsReview:issues.length>0};
}
export function snapshot(deck,label){
 const d=sanitizeDeck(deck);
 return {id:"v"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),label:String(label||"Approved presentation").slice(0,120),date:new Date().toISOString(),deck:d};
}
export function diffDeck(before,after){
 if(!after)return {added:0,removed:0,edited:0,themeChanged:false,titleChanged:false};
 if(!before)return {added:after.slides.length,removed:0,edited:0,themeChanged:false,titleChanged:false};
 let edited=0;
 const min=Math.min(before.slides.length,after.slides.length);
 for(let i=0;i<min;i++){
  const a=before.slides[i],b=after.slides[i];
  if(JSON.stringify([a.layout,a.title,a.subtitle,a.body,a.metrics,a.chartLabels,a.chartValues])!==JSON.stringify([b.layout,b.title,b.subtitle,b.body,b.metrics,b.chartLabels,b.chartValues]))edited++;
 }
 return {added:Math.max(0,after.slides.length-before.slides.length),removed:Math.max(0,before.slides.length-after.slides.length),edited,themeChanged:before.theme!==after.theme,titleChanged:before.title!==after.title};
}
export function approveCandidate(existing,candidate,label,history=[]){
 if(!candidate)throw Error("No draft is ready for approval.");
 const original=existing?sanitizeDeck(existing):null;
 const entry=original?snapshot(original,label||"Previous approved version"):null;
 const nextHistory=entry?[...history,entry].slice(-10):history;
 return {deck:sanitizeDeck(candidate),history:nextHistory};
}
