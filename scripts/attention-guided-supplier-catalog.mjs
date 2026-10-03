import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { hasApprovedProductClass, matchesIntendedProduct } from './cj-match-policy.mjs';

function cleanText(value,max=160){const text=String(value||'').trim();return text&&text.length<=max?text:null;}

export function buildAttentionGuidedCatalog({baseCatalog={},tournament={},liveCatalog={},limit=3}={}){
  const baseRows=Array.isArray(baseCatalog.candidates)?baseCatalog.candidates:[];
  const baseMap=new Map(baseRows.map(row=>[row.slug,row]));
  const liveMap=new Map((liveCatalog.candidates||[]).map(row=>[row.slug,row]));
  const selected=[];
  const seen=new Set();
  for(const leader of tournament.productTournament||[]){
    if(selected.length>=Math.max(1,Math.min(Number(limit)||3,5)))break;
    const slug=String(leader?.slug||'').trim();
    if(!slug||seen.has(slug))continue;
    let candidate=baseMap.get(slug)||null;
    if(!candidate){
      const live=liveMap.get(slug);
      const name=cleanText(live?.name),query=cleanText(live?.query);
      if(!live?.liveStoreProduct||!name||!query||!hasApprovedProductClass(slug)||!matchesIntendedProduct({slug},name))continue;
      candidate={slug,storeSku:slug,name,query,queries:[query,name.toLowerCase()].filter((v,i,a)=>a.indexOf(v)===i),researchScore:Number.isFinite(Number(leader?.researchScore))?Number(leader.researchScore):null,liveStoreProduct:true,commercialAttentionOverride:true,searchStrategy:'Current commercial tournament leader; run fail-closed CJ discovery with strict product-identity, stock and freight checks. Tournament attention does not waive any commercial gate.'};
    }
    seen.add(slug);selected.push({...candidate,commercialAttentionRank:selected.length+1});
  }
  for(const row of baseRows){if(seen.has(row.slug))continue;seen.add(row.slug);selected.push(row);}
  return {schemaVersion:1,generatedAt:new Date().toISOString(),market:baseCatalog.market||liveCatalog.market||'US',mode:'attention_guided_read_only_supplier_discovery',leaderCount:Math.min(Number(limit)||3,selected.length),leaders:selected.slice(0,Math.min(Number(limit)||3,selected.length)).map(row=>row.slug),selectionRule:'Current tournament leaders receive the next focused read-only supplier pass. Product identity, stock, freight, economics, final ZIP and checkout gates remain mandatory.',candidates:selected};
}

export async function main(){
 const baseCatalog=JSON.parse(await fs.readFile('paperclip/prismbay-global-commerce/research/supplier-candidates.json','utf8'));
 const tournament=JSON.parse(await fs.readFile('growth-reports/ceo-commercial-tournament.json','utf8'));
 const liveCatalog=JSON.parse(await fs.readFile('services/physical-orders/live-catalog-candidates.json','utf8'));
 const output=buildAttentionGuidedCatalog({baseCatalog,tournament,liveCatalog,limit:Number(process.env.ATTENTION_GUIDED_SUPPLIER_LIMIT||3)});
 await fs.mkdir('growth-reports',{recursive:true});
 await fs.writeFile('growth-reports/attention-guided-supplier-candidates.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({leaders:output.leaders,candidateCount:output.candidates.length},null,2));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
