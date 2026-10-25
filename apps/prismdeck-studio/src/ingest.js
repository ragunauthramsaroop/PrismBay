// Browser-first ingestion. No file content leaves this device unless the user
// selects a format requiring the separately deployed, authenticated converter.
const MAX_BROWSER=35*1024*1024,MAX_SERVER=120*1024*1024;
const extensions=["txt","md","markdown","html","htm","csv","tsv","srt","vtt","pdf","docx","xlsx","xls","pptx","doc","ppt","mp4","mov","m4v","webm","mkv","mp3","wav","m4a","odt","ods","odp"];
export const SOURCE_ACCEPT=extensions.map(x=>"."+x).join(",");
export function fileExtension(name){return String(name||"").split(".").at(-1).toLowerCase();}
export function isServerFormat(name){return ["doc","ppt","mp4","mov","m4v","webm","mkv","mp3","wav","m4a","odt","ods","odp"].includes(fileExtension(name));}
function limit(str,max=150000){return String(str||"").slice(0,max).trim();}
function stripHtml(html){
 const doc=new DOMParser().parseFromString(html,"text/html");
 doc.querySelectorAll("script,style,noscript,svg,canvas,iframe,form,nav,footer").forEach(e=>e.remove());
 const main=doc.querySelector("article,main")||doc.body;
 return limit(main.textContent?.replace(/\s{2,}/g," ")||"");
}
function cleanupSubtitle(data){
 return String(data||"").replace(/^\uFEFF/,"").replace(/^WEBVTT[^\n]*\n/,"")
 .replace(/^\d+\s*$/gm,"").replace(/^\s*\d\d:\d\d:\d\d[.,]\d+\s*-->\s*[^\n]+$/gm,"")
 .replace(/^\s*\d\d:\d\d[.,]\d+\s*-->\s*[^\n]+$/gm,"")
 .replace(/<[^>]*>/g," ").replace(/\n{2,}/g,"\n").trim();
}
async function pdfExtract(file){
 const pdfjs=await import("pdfjs-dist/build/pdf.mjs");
 const worker=await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
 pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true});
 const doc=await task.promise,parts=[];
 try{
  if(doc.numPages>250)throw new Error("PDF exceeds the 250-page limit.");
  for(let i=1;i<=doc.numPages;i++){
   const page=await doc.getPage(i),content=await page.getTextContent();
   const lines=content.items.map(x=>x.str||"").join(" ");
   parts.push("[Page "+i+"] "+lines);
   if(parts.join("").length>150000)break;
  }
 }finally{await doc.destroy();}
 return limit(parts.join("\n\n"));
}
async function docxExtract(file){
 const mod=await import("mammoth");const mammoth=mod.default||mod;
 const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
 return limit(result.value);
}
async function excelExtract(file){
 const mod=await import("xlsx"),xlsx=mod.default||mod;
 const wb=xlsx.read(await file.arrayBuffer(),{type:"array",cellFormula:false,cellHTML:false,cellStyles:false,cellText:true,sheetRows:250});
 const sections=[],numericSeries=[];
 for(const name of wb.SheetNames.slice(0,8)){
  const rows=xlsx.utils.sheet_to_json(wb.Sheets[name],{header:1,blankrows:false,defval:"",raw:true}).slice(0,200);
  sections.push("Sheet: "+name);
  for(const row of rows){
   sections.push(row.slice(0,16).map((x,i)=>"Column "+(i+1)+": "+String(x??"").slice(0,200)).join(" | "));
   if(numericSeries.length<8&&row.length>=2&&typeof row[0]==="string"&&typeof row[1]==="number"&&Number.isFinite(row[1])){
    numericSeries.push({label:String(row[0]).slice(0,35),value:row[1]});
   }
   if(sections.join("").length>150000)break;
  }
 }
 return {text:limit(sections.join("\n")),numericSeries};
}
async function pptxExtract(file){
 const mod=await import("jszip"),JSZip=mod.default||mod;
 const zip=await JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:false});
 const keys=Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x))
 .sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1])).slice(0,120);
 if(!keys.length)throw new Error("No readable slide XML found.");
 const parts=[];
 for(const key of keys){
  const xml=await zip.file(key).async("string");
  if(xml.length>2000000)throw new Error("A slide contains an oversized XML part.");
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  const texts=Array.from(doc.getElementsByTagNameNS("*","t")).map(x=>x.textContent?.trim()).filter(Boolean);
  parts.push("[Slide "+key.match(/slide(\d+)/)[1]+"] "+texts.join(". "));
  if(parts.join("").length>150000)break;
 }
 return limit(parts.join("\n\n"));
}
export async function ingestOne(file,opts={}){
 if(!file||!file.name)throw new Error("Select a valid file.");
 const ext=fileExtension(file.name);
 if(!extensions.includes(ext))throw new Error("Unsupported format: "+ext);
 if(file.size>(isServerFormat(file.name)?MAX_SERVER:MAX_BROWSER))throw new Error(file.name+" exceeds the upload size limit.");
 if(isServerFormat(file.name))return ingestServer(file,opts);
 let text="",numericSeries=[],kind="article";
 if(["txt","md","markdown","csv","tsv"].includes(ext)){text=limit(await file.text());kind=ext==="csv"||ext==="tsv"?"spreadsheet":"article";}
 else if(["htm","html"].includes(ext)){text=stripHtml(await file.text());kind="article";}
 else if(["srt","vtt"].includes(ext)){text=cleanupSubtitle(await file.text());kind="transcript";}
 else if(ext==="pdf"){text=await pdfExtract(file);kind="pdf";}
 else if(ext==="docx"){text=await docxExtract(file);kind="word";}
 else if(ext==="pptx"){text=await pptxExtract(file);kind="presentation";}
 else if(["xlsx","xls"].includes(ext)){({text,numericSeries}=await excelExtract(file));kind="spreadsheet";}
 if(!text.trim())throw new Error(file.name+": no selectable text found. Use OCR or provide a text transcription.");
 return {name:file.name,kind,text,numericSeries,bytes:file.size,note:kind==="transcript"?"Caption text supplied by the user.":"Source text extracted from a user-uploaded file."};
}
export async function ingestServer(file,opts={}){
 const endpoint=String(opts.endpoint||"/api/ingest").trim();
 if(!endpoint.startsWith("/")&&!/^https:\/\//i.test(endpoint))throw new Error("Use an HTTPS URL for the optional conversion server.");
 const payload=new FormData();payload.append("file",file,file.name);
 let res;
 try{res=await fetch(endpoint,{method:"POST",body:payload,signal:AbortSignal.timeout(180000),headers:opts.token?{"Authorization":"Bearer "+opts.token}:undefined});}
 catch{throw new Error(file.name+": advanced conversion is unavailable. Connect an authenticated PrismDeck converter for legacy Office files or video transcription.");}
 if(!res.ok){if(res.status===401)throw new Error("Converter requires a valid access token.");if(res.status===404)throw new Error("Converter service is not deployed at "+endpoint);throw new Error("Conversion failed with HTTP "+res.status);}
 const data=await res.json();
 if(typeof data.text!=="string"||!data.text.trim())throw new Error("Converter returned no readable text.");
 return {name:file.name,kind:data.kind||"converted",text:limit(data.text),numericSeries:Array.isArray(data.numericSeries)?data.numericSeries.slice(0,8):[],bytes:file.size,note:data.note||"Converted using a separate service; verify transcription and source text."};
}
export async function ingestFiles(files,opts={},progress=()=>{}){
 const arr=Array.from(files||[]).slice(0,20),ok=[],errors=[];
 if(!arr.length)throw new Error("Choose at least one source file.");
 for(let i=0;i<arr.length;i++){
  progress({index:i+1,total:arr.length,name:arr[i].name});
  try{ok.push(await ingestOne(arr[i],opts));}
  catch(err){errors.push({name:arr[i].name,error:String(err.message||err)});}
 }
 return {documents:ok,errors};
}
