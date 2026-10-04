import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DIR='paperclip/prismbay-global-commerce/research';
const DEFAULT_OUT='growth-reports/catalog-research-candidates.json';

export function aggregateBatches(batches=[]){
  const seenSlug=new Set();
  const seenName=new Set();
  const candidates=[];
  const batchStats=[];
  const duplicates=[];
  for(const batch of batches){
    if(!Array.isArray(batch?.candidates)) throw new Error('invalid_batch_candidates');
    let accepted=0;
    for(const c of batch.candidates){
      const slug=String(c.slug||'').trim().toLowerCase();
      const name=String(c.name||'').trim();
      if(!slug||!name) throw new Error('candidate_missing_slug_or_name');
      const nameKey=name.toLowerCase();
      if(seenSlug.has(slug)||seenName.has(nameKey)){
        duplicates.push({slug,name,sourceBatch:batch.batch||null});
        continue;
      }
      seenSlug.add(slug); seenName.add(nameKey);
      candidates.push({
        ...c,
        sourceBatch:batch.batch||null,
        sourceIssue:batch.sourceIssue||null,
        status:'RESEARCH_CANDIDATE',
        supplierReady:false,
        freightReady:false,
        mediaRightsReady:false,
        checkoutReady:false,
        fulfillmentReady:false,
        promotionReady:false,
        listed:false,
        ordersEnabled:false
      });
      accepted++;
    }
    batchStats.push({batch:batch.batch||null,inputCount:batch.candidates.length,acceptedCount:accepted});
  }
  candidates.sort((a,b)=>Number(b.researchScore||0)-Number(a.researchScore||0)||String(a.slug).localeCompare(String(b.slug)));
  const categoryCounts={};
  for(const c of candidates) categoryCounts[c.category]=(categoryCounts[c.category]||0)+1;
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    mode:'research_only',
    candidateCount:candidates.length,
    batchCount:batches.length,
    categoryCounts,
    duplicates,
    batchStats,
    gates:{supplierReady:false,freightReady:false,mediaRightsReady:false,checkoutReady:false,fulfillmentReady:false,promotionReady:false,listed:false,ordersEnabled:false},
    candidates
  };
}

async function loadBatches(dir){
  let files=[];
  try{files=(await fs.readdir(dir)).filter(f=>/^demand-batch-[a-f]-100\.json$/.test(f)).sort();}
  catch(e){if(e?.code==='ENOENT') return []; throw e;}
  const batches=[];
  for(const file of files){
    const parsed=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
    batches.push(parsed);
  }
  return batches;
}

export async function main(dir=process.argv[2]||DEFAULT_DIR,out=process.argv[3]||DEFAULT_OUT){
  const batches=await loadBatches(dir);
  const result=aggregateBatches(batches);
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({batchCount:result.batchCount,candidateCount:result.candidateCount,duplicateCount:result.duplicates.length,categoryCounts:result.categoryCounts},null,2));
  return result;
}

if(import.meta.url===`file://${process.argv[1]}`) await main();
