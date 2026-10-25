import {makeSlide,sanitizeDeck,short,clamp,safeTheme,AUDIENCES} from "./core.js";

function normalizedText(value){
  return String(value??"").replace(/\r\n?/g,"\n").replace(/[\t\u00a0]+/g," ").replace(/[ ]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
export function sentences(value){
  return normalizedText(value).split(/(?<=[.!?])\s+|\n+/g)
    .map(s=>s.replace(/^[\d.)*\s-]+/,"").trim())
    .filter(s=>s.length>=22&&s.length<=320);
}
export function sourceSummary(doc,max=7){
  const result=[],seen=new Set();
  for(const line of sentences(doc.text||"")){
    const key=line.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,80);
    if(seen.has(key))continue;
    seen.add(key);result.push(line);
    if(result.length===max)break;
  }
  if(!result.length&&doc.text)result.push(short(doc.text,180));
  return result;
}
export function extractQuantifiedFacts(doc,max=3){
  const re=/((?:USD|US\$|GYD|€|£|\$)\s*[\d,.]+(?:\s?(?:million|billion|m|bn))?|\b[\d,.]+\s?(?:%|percent|MWp?|MWh|kWh|tonnes|tons|litres|liters|employees|participants|years|months|km|oz)\b)/i;
  return sourceSummary(doc,70).filter(x=>re.test(x)).slice(0,max).map(x=>({
    value:short(x.match(re)?.[0]||"Source data",22),
    label:short(x.replace(re,"").replace(/^[\s:.,-]+/,"").trim()||"Verified source context",64),
    evidence:x
  }));
}
function makeSourceSlide(doc,part,index){
  const summary=sourceSummary(doc,18),start=part*4,items=summary.slice(start,start+4);
  const name=short(doc.name?.replace(/\.[^.]+$/,"").replace(/[_-]+/g," "),100)||"Source material";
  return makeSlide("bullets",{
    eyebrow:"SOURCE "+String(index+1).padStart(2,"0"),
    title:part?name+" | continued":name,
    subtitle:"Main points extracted from the supplied source. Review for context.",
    body:(items.length?items:["No extractable body text available. Review the original file."]).join("\n"),
    notes:"Source: "+doc.name+"\nSource type: "+doc.kind+"\n"+(doc.note||"")+"\nExtracted content, not independent fact verification."
  });
}
function sourceList(slides,docs){
  return makeSlide("bullets",{eyebrow:"SOURCE REGISTER",title:"Sources and verification",subtitle:"Confirm quotations, figures, and source permissions before publishing.",body:docs.slice(0,9).map(d=>d.name+" ["+d.kind+"]").join("\n"),notes:"Uploaded files processed locally in the browser where supported. The source register is a provenance aid, not external verification."});
}
export function buildSourceDeck(documents,options={}){
  const docs=(Array.isArray(documents)?documents:[]).filter(d=>d&&typeof d.text==="string"&&d.text.trim().length>0).slice(0,20);
  if(!docs.length)throw new Error("No readable source content. Add a text-based source, captions, or a completed transcription.");
  const theme=safeTheme(options.theme),audience=AUDIENCES.includes(options.audience)?options.audience:"Executive board";
  const title=short(options.title||docs[0].name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," "),140);
  const count=clamp(Math.round(options.count||8),4,14);
  const lead=docs.flatMap(d=>sourceSummary(d,2).map(t=>({text:t,name:d.name}))).slice(0,4);
  const slides=[
    makeSlide("cover",{eyebrow:"SOURCE-BASED / "+audience.toUpperCase(),title,subtitle:"Developed from "+docs.length+" supplied source"+(docs.length===1?"":"s")+". Verify claims and figures before distribution.",notes:"Source filenames:\n"+docs.map(d=>d.name).join("\n")}),
    makeSlide("bullets",{eyebrow:"EXECUTIVE OVERVIEW",title:"Key findings from the material",subtitle:"Direct summaries of source content, not independently corroborated.",body:lead.map(x=>x.text).join("\n"),notes:lead.map(x=>x.name+": "+x.text).join("\n")})
  ];
  for(const [i,d] of docs.entries()){
    const items=sourceSummary(d,22);
    for(let p=0;p<Math.max(1,Math.min(3,Math.ceil(items.length/4)));p++)slides.push(makeSourceSlide(d,p,i));
  }
  const facts=docs.flatMap(d=>extractQuantifiedFacts(d,3).map(f=>({...f,name:d.name}))).slice(0,3);
  if(facts.length>=2){
    slides.push(makeSlide("stats",{eyebrow:"SOURCE METRICS",title:"Quantified evidence",subtitle:"Values copied from supplied content. Confirm definitions and context.",metrics:Array.from({length:3},(_,i)=>facts[i]?{value:facts[i].value,label:facts[i].label}:{value:"[Not given]",label:"Not stated in source"}),notes:facts.map(x=>x.name+": "+x.evidence).join("\n")}));
  }
  const sheet=docs.find(d=>Array.isArray(d.numericSeries)&&d.numericSeries.length>=2);
  if(sheet){
    const series=sheet.numericSeries.slice(0,8);
    slides.push(makeSlide("chart",{eyebrow:"SOURCED DATA",title:"Data extracted from "+short(sheet.name,68),subtitle:"Numeric values obtained from the uploaded spreadsheet. Review labels and units.",chartLabels:series.map(x=>short(x.label,28)),chartValues:series.map(x=>clamp(x.value,0,1000000)),notes:"Source: "+sheet.name+"\nValues are derived from spreadsheet content. No demo values were used."}));
  }
  slides.push(makeSlide("split",{eyebrow:"INTERPRETATION",title:"Questions for the decision",subtitle:"Use the evidence to identify gaps and next actions.",body:"Which claims need further verification?\nWhich metrics need business context?\nWhich decisions require approval?",notes:"Editorial decision prompts only. Not source-derived recommendations."}));
  slides.push(sourceList(slides,docs));
  const closing=makeSlide("closing",{eyebrow:"DISCUSSION",title:"Decisions and next steps",subtitle:"Confirm the interpretation of source material before publication.",body:"Validate source accuracy\nAssign next actions\nAgree on the review date"});
  const reserve=slides.slice(2,-2),desiredMiddle=count-4;
  const arranged=[slides[0],slides[1],...reserve.slice(0,desiredMiddle)];
  while(arranged.length<count-2){
    const i=arranged.length-2,d=docs[i%docs.length],part=Math.floor(i/docs.length)+3;
    const summary=sentences(d.text).slice(part*3,part*3+4);
    arranged.push(makeSlide("bullets",{eyebrow:"ADDITIONAL SOURCE DETAILS",title:short(d.name,90)+" | detail "+(part+1),subtitle:"Supporting excerpts from uploaded material.",body:summary.length?summary.join("\n"):"Add further verified evidence or commentary.",notes:"Source: "+d.name}));
  }
  arranged.push(sourceList(slides,docs),closing);
  return sanitizeDeck({title,theme,audience,slides:arranged.slice(0,count)});
}
