import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {chromium} from "playwright";
import {categoryForTitle,guyanaDate,validateSnapshot} from "./rules.mjs";

const PORTAL="https://eprocure.gov.gy/";
const OUTPUT=new URL("./output/",import.meta.url);
const health={source:PORTAL,checkedAt:new Date().toISOString(),status:"NOT_CHECKED",recordCount:0,publicationStatus:"CANDIDATES_ONLY"};
const clean=(value,max=220)=>String(value||"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const asDate=(value)=>{
 const text=clean(value,60);
 const numeric=text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
 if(numeric) return numeric[1]+"-"+numeric[2]+"-"+numeric[3];
 const d=new Date(text);
 if(!Number.isNaN(d.getTime()) && /\b20\d{2}\b/.test(text)) return d.toISOString().slice(0,10);
 return null;
};
function mapRows(rows) {
 const found=[];
 let currentAgency="";
 for(const row of rows){
  const cells=row.cells.map(x=>clean(x,240)).filter(Boolean);
  const agencyHeading=cells.find(x=>/^(?:\\d+\\s*[-–]\\s*)?(?:ministry|department|national procurement|guyana|office of|commission|authority)\\b/i.test(x));
  if(cells.length<3){
   if(agencyHeading)currentAgency=clean(agencyHeading.replace(/^\\d+\\s*[-–]\\s*/,""),120);
   continue;
  }
  const dateCells=cells.map(c=>asDate(c));
  const index=dateCells.findIndex(Boolean);
  if(index<0)continue;
  const deadline=dateCells[index];
  const title=cells.filter((_,i)=>i!==index).find(x=>x.length>15 && !/^(ministry|department|national procurement|closing|deadline|open|active|published)/i.test(x));
  if(!title)continue;
  const agency=cells.filter((_,i)=>i!==index).find(x=>/\b(ministry|department|commission|authority|government|agency|office|corporation)\b/i.test(x))||currentAgency||"Issuing public body";
  if(agency==="Issuing public body") continue;
  const id="GY-SCOUT-"+createHash("sha256").update([title,agency,deadline].join("|").toLowerCase()).digest("hex").slice(0,20);
  found.push({id,title,agency,sector:categoryForTitle(title),deadline,source:PORTAL});
 }
 const seen=new Set();
 return found.filter(n=>{const key=[n.title,n.agency,n.deadline].join("|").toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,100);
}
async function verifyRobots(page){
 const result=await page.request.get(PORTAL+"robots.txt",{timeout:12000});
 if(!result.ok())return;
 const body=await result.text();
 let applies=false;
 for(const raw of body.split(/\r?\n/)){
  const line=raw.split("#")[0].trim();
  if(/^user-agent:/i.test(line))applies=/^user-agent:\s*\*\s*$/i.test(line);
  if(applies && /^disallow:\s*\/\s*$/i.test(line))throw new Error("SOURCE_DISALLOWS_AUTOMATED_ACCESS");
 }
}
async function main(){
 await fs.mkdir(OUTPUT,{recursive:true});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({userAgent:"CaribContractAtlas-SourceScout/0.1 (+public tender link-only research)",locale:"en-US"});
  const page=await context.newPage();
  await verifyRobots(page);
  const response=await page.goto(PORTAL,{waitUntil:"domcontentloaded",timeout:45000});
  if(!response || !response.ok())throw new Error("SOURCE_HTTP_"+(response?.status()??"NO_RESPONSE"));
  await page.waitForTimeout(4500);
  const rows=await page.locator("table tr, [role='row']").evaluateAll(nodes=>nodes.map(node=>({cells:Array.from(node.querySelectorAll("th,td,[role='cell']"),x=>x.textContent||"")})));
  const candidates=mapRows(rows);
  if(candidates.length===0)throw new Error("NO_STRUCTURED_CANDIDATES_FOUND");
  const snapshot={schemaVersion:1,asOf:guyanaDate(),source:PORTAL,status:"unreviewed_public_source_candidates",notices:candidates};
  validateSnapshot(snapshot);
  health.status="CANDIDATES_EXTRACTED_NEEDS_HUMAN_REVIEW";
  health.recordCount=candidates.length;
  await fs.writeFile(new URL("latest-candidates.json",OUTPUT),JSON.stringify(snapshot,null,2)+"\n");
  console.log(JSON.stringify({status:health.status,count:candidates.length,note:"No public catalogue, customer alert or paid offer updated."}));
 }catch(error){
  health.status="SOURCE_CHECK_BLOCKED";
  health.reason=clean(error?.message||String(error),140);
  console.error(JSON.stringify(health));
  process.exitCode=1;
 }finally{
  await browser?.close();
  await fs.writeFile(new URL("source-health.json",OUTPUT),JSON.stringify(health,null,2)+"\n");
 }
}
await main();
