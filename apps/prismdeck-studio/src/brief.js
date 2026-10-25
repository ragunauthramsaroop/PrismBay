// Local rule-based reading of a user's instructions. No external model claims.
import {clamp,short,AUDIENCES,THEMES} from "./core.js";
export function parseBrief(instructions="", defaults={}){
 const raw=String(instructions??"").trim().slice(0,4000);
 const text=raw.toLowerCase();
 const nums=raw.match(/\b(\d{1,2})(?:[\s-]+(?:investor|board|executive|presentation|powerpoint|pitch|training|client)){0,3}[\s-]+(?:slides?|pages?)\b/i);
 const count=nums?clamp(Number(nums[1]),4,14):clamp(defaults.count||8,4,14);
 let audience=defaults.audience||"Executive board";
 if(/\b(investors?|funders?|shareholders?|pitch\s+deck)\b/i.test(raw))audience="Investors";
 else if(/\b(customers?|clients?|sales\s+team)\b/i.test(raw))audience="Clients";
 else if(/\b(board|directors?|executives?|leadership|management)\b/i.test(raw))audience="Executive board";
 else if(/\b(classroom|students?|teacher|lecture)\b/i.test(raw))audience="Classroom";
 else if(/\b(staff|employees?|internal\s+team|training)\b/i.test(raw))audience="Internal team";
 if(!AUDIENCES.includes(audience))audience="Executive board";
 let theme=THEMES[defaults.theme]?defaults.theme:"midnight";
 if(/\b(white|light|clean|blue|cobalt)\b/i.test(raw))theme="cobalt";
 if(/\b(cream|beige|warm|sand|earth|atelier)\b/i.test(raw))theme="sand";
 if(/\b(green|emerald|nature)\b/i.test(raw))theme="emerald";
 if(/\b(dark|night|midnight|navy|black)\b/i.test(raw))theme="midnight";
 const focus=[];
 const re=/\b(?:focus(?:\s+on)?|emphasi[sz]e|highlight|prioriti[sz]e|concentrate\s+on)\s+([^.\n;!?]{3,120})/gi;
 for(const match of raw.matchAll(re)){
  let words=match[1].replace(/^\s*(?:on|the|key|main|especially|about)\s+/i,"").replace(/\b(?:with|and)\s+(?:no|without)\s+.*$/i,"").trim();
  words=words.replace(/\b(?:in|for|with)\s+\d+\s+slides?\b.*$/i,"").trim();
  if(words.length>=3&&focus.length<4)focus.push(short(words,90));
 }
 const titleMatch=raw.match(/\b(?:title|call\s+(?:the\s+deck|it)|name\s+the\s+presentation)\s*(?:is|:|as)?\s*["“]?([^"”\n.!?]{5,110})/i);
 const title=titleMatch?short(titleMatch[1].trim(),110):null;
 return {
  instructions:raw,
  count:Math.round(count),
  audience,
  theme,
  title,
  focus,
  concise:/\b(concise|short\s+(?:bullets?|slides?|text)|minimal\s+text|few\s+words|brief\s+bullets?)\b/i.test(raw),
  omitCharts:/\b(?:no|without|exclude|avoid)\s+(?:any\s+)?(?:charts?|graphs?)\b/i.test(raw)
 };
}
export function keywordsOf(focus=[]){
 const stop=new Set(["a","an","and","are","for","from","into","is","its","of","on","or","the","to","with","about","their","this","these","those","that","versus","focus","key","main","specifically","data","results"]);
 const tokens=focus.join(" ").toLowerCase().match(/[a-z0-9]{3,}/g)||[];
 return [...new Set(tokens.filter(x=>!stop.has(x)))].slice(0,18);
}
