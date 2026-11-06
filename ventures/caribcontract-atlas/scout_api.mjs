/** Low-cost read-only direct public API scout: no browser, paid API, or secrets. */
import fs from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {categoryForTitle, guyanaDate, validateSnapshot} from "./rules.mjs";

export const PORTAL="https://eprocure.gov.gy/";
export const API=PORTAL+"api/method/doctracker.api.powerbi.get_public_bid_opportunities";
const OUT=new URL("./output/",import.meta.url);
const clear=(v,max=240)=>String(v??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const dateOk=v=>typeof v==="string" && /^\d{4}-\d\d-\d\d$/.test(v) && !Number.isNaN(new Date(v+"T00:00:00Z").getTime()) && new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;

export function officialPdfPath(value){
 if(typeof value!=="string"||!value.startsWith("/files/")||!value.toLowerCase().endsWith(".pdf"))return null;
 const url=new URL(value,PORTAL);
 if(url.protocol!=="https:"||url.hostname!=="eprocure.gov.gy"||!url.pathname.startsWith("/files/"))return null;
 return url.href;
}

export function normalizePublicFeed(rows){
 if(!Array.isArray(rows)||rows.length===0||rows.length>500)throw new Error("INVALID_PUBLIC_SOURCE_FEED");
 const unique=new Set(),out=[];
 for(const row of rows){
  if(!row||typeof row!=="object")continue;
  const id=clear(row.project_id,80);
  const title=clear(row.project_name,240);
  const agency=clear(row.agency,135).replace(/^\d{1,3}\s*-\s*/,"");
  const deadline=clear(row.projected_bid_opening_date,10);
  if(!/^PROC-20\d\d-\d{5,}$/.test(id)||!dateOk(deadline)||title.length<12||agency.length<6||agency.length>120||unique.has(id)||/[<>]/.test(title+agency))continue;
  const docs=Array.isArray(row.advertisement_documents)?row.advertisement_documents:[];
  const pdf=docs.map(x=>officialPdfPath(x?.document_file)).find(Boolean)||null;
  out.push({id,title,agency,sector:categoryForTitle(title),deadline,source:PORTAL,
    originalDocument:pdf,advertisedOpeningNotSubmissionCutoff:true,
    region:Array.isArray(row.regions)?row.regions.filter(x=>typeof x==="string").slice(0,3).map(x=>clear(x,50)).join(", "):"",
    procurementNature:clear(row.procurement_nature,60),status:clear(row.current_state,60)});
  unique.add(id);
 }
 if(out.length===0)throw new Error("SOURCE_HAS_NO_VALID_ADVERTISEMENTS");
 return out.sort((a,b)=>a.deadline.localeCompare(b.deadline)||a.id.localeCompare(b.id));
}

export function robotsBlock(contents,path){
 const lines=String(contents).split(/\r?\n/).map(s=>s.split("#")[0].trim()).filter(Boolean);
 let agents=[],allow=[],deny=[];
 const groups=[];
 function finish(){if(agents.length)groups.push({agents,allow,deny});agents=[];allow=[];deny=[];}
 for(const line of lines){
  const idx=line.indexOf(":");if(idx<0)continue;
  const key=line.slice(0,idx).toLowerCase(),val=line.slice(idx+1).trim();
  if(key==="user-agent"){
    if(allow.length||deny.length)finish();
    agents.push(val.toLowerCase());
  }else if(key==="allow")allow.push(val);
  else if(key==="disallow"&&val)deny.push(val);
 }
 finish();
 const applicable=groups.filter(g=>g.agents.includes("*")||g.agents.includes("caribcontractatlas-sourcescout"));
 let maxD=0,maxA=0;
 for(const g of applicable){
  for(const x of g.deny)if(path.startsWith(x))maxD=Math.max(maxD,x.length);
  for(const x of g.allow)if(path.startsWith(x))maxA=Math.max(maxA,x.length);
 }
 return maxD>0&&maxD>maxA;
}

async function getOfficialJson(){
 const robot=await fetch(PORTAL+"robots.txt",{signal:AbortSignal.timeout(12000),headers:{"user-agent":"CaribContractAtlas-SourceScout/1.1"}});
 if(robot.ok&&robotsBlock(await robot.text(),new URL(API).pathname))throw new Error("OFFICIAL_ROBOTS_PROHIBITS_THIS_API");
 const res=await fetch(API,{signal:AbortSignal.timeout(20000),headers:{accept:"application/json","user-agent":"CaribContractAtlas-SourceScout/1.1"}});
 if(!res.ok)throw new Error("PUBLIC_API_STATUS_"+res.status);
 if(!/json/i.test(res.headers.get("content-type")||""))throw new Error("PUBLIC_API_NOT_JSON");
 const length=Number(res.headers.get("content-length")||0);
 if(length>2_000_000)throw new Error("PUBLIC_API_OVERSIZE");
 const body=await res.text();
 if(body.length>2_000_000)throw new Error("PUBLIC_API_OVERSIZE");
 const value=JSON.parse(body);
 return value?.message;
}

export async function run(){
 await fs.mkdir(OUT,{recursive:true});
 const health={source:PORTAL,checkedAt:new Date().toISOString(),status:"NOT_CHECKED",publicationStatus:"REVIEW_ONLY",itemCount:0};
 try{
  const notices=normalizePublicFeed(await getOfficialJson());
  const snapshot={schemaVersion:1,asOf:guyanaDate(),source:PORTAL,status:"unreviewed_public_api_candidates",sourceCheckedAt:health.checkedAt,notices};
  validateSnapshot(snapshot);
  health.status="CANDIDATES_EXTRACTED_NEEDS_REVIEW";
  health.itemCount=notices.length;
  await fs.writeFile(new URL("latest-candidates.json",OUT),JSON.stringify(snapshot,null,2)+"\n");
  console.log(JSON.stringify({status:health.status,publicCandidates:notices.length,browserRequired:false,autopublished:false}));
 }catch(error){
  health.status="SOURCE_VALIDATION_FAILED";
  health.error=clear(error?.message,150);
  console.error(JSON.stringify(health));
  process.exitCode=1;
 }finally{
  await fs.writeFile(new URL("source-health.json",OUT),JSON.stringify(health,null,2)+"\n");
 }
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1])await run();
