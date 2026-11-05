const SOURCE = "https://eprocure.gov.gy/";
const CATEGORIES = new Set(["Construction","Vehicles","Services","Technology","Other"]);
function dateOk(value) {
 if(typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const dt = new Date(value + "T00:00:00Z");
 return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0,10) === value;
}
export function validateSnapshot(snapshot) {
 if(!snapshot || snapshot.schemaVersion !== 1 || snapshot.source !== SOURCE || !dateOk(snapshot.asOf) || !Array.isArray(snapshot.notices)) throw new Error("invalid_snapshot_header");
 if(snapshot.notices.length === 0 || snapshot.notices.length > 500) throw new Error("invalid_snapshot_count");
 const ids = new Set(), natural = new Set();
 for(const n of snapshot.notices) {
  if(!n || typeof n.id !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(n.id)) throw new Error("invalid_notice_id");
  if(ids.has(n.id)) throw new Error("duplicate_notice_id");
  ids.add(n.id);
  if(typeof n.title !== "string" || n.title.trim().length < 12 || n.title.length > 240 || /<[^>]*>/.test(n.title)) throw new Error("invalid_title");
  if(typeof n.agency !== "string" || n.agency.trim().length < 6 || n.agency.length > 120 || /<[^>]*>/.test(n.agency)) throw new Error("invalid_agency");
  if(!CATEGORIES.has(n.sector)) throw new Error("invalid_category");
  if(!dateOk(n.deadline)) throw new Error("invalid_deadline");
  if(n.source !== SOURCE) throw new Error("untrusted_source");
  const key=[n.title,n.agency,n.deadline].join("|").toLowerCase().replace(/\s+/g," ");
  if(natural.has(key)) throw new Error("duplicate_notice");
  natural.add(key);
 }
 return {status:"PASS",count:snapshot.notices.length,asOf:snapshot.asOf,source:SOURCE};
}
export function guyanaDate(now=new Date()) {
 const parts = new Intl.DateTimeFormat("en-US",{timeZone:"America/Guyana",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const d=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return d.year+"-"+d.month+"-"+d.day;
}
export function filterNotices(snapshot,{asOf=guyanaDate(),sector="All sectors",query=""}={}) {
 validateSnapshot(snapshot);
 if(!dateOk(asOf)) throw new Error("invalid_asof");
 const q=String(query).trim().toLowerCase().slice(0,100);
 return snapshot.notices.filter(n=>n.deadline>=asOf&&(sector==="All sectors"||n.sector===sector)&&[n.title,n.agency,n.sector].join(" ").toLowerCase().includes(q)).sort((a,b)=>a.deadline.localeCompare(b.deadline)||a.title.localeCompare(b.title));
}
export function categoryForTitle(title) {
 const text=String(title).toLowerCase();
 if(/\b(ambulance|vehicle|motor car|pickup|truck|bus)\b/.test(text)) return "Vehicles";
 if(/\b(road|bridge|construction|civil works|rehabilitation|infrastructure|building)\b/.test(text)) return "Construction";
 if(/\b(software|computer|laptop|it equipment|server|network|telecom)\b/.test(text)) return "Technology";
 if(/\b(service|security|consult|insurance|cleaning|maintenance)\b/.test(text)) return "Services";
 return "Other";
}
export function readinessScore(items) {
 if(!Array.isArray(items)||items.length!==7||items.some(x=>typeof x!=="boolean")) throw new Error("invalid_readiness");
 return {completed:items.filter(Boolean).length,remaining:items.filter(x=>!x).length};
}
