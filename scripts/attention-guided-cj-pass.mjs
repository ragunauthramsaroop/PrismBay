import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { main as runPaperclipSourcing } from './paperclip-cj-sourcing.mjs';

export async function runAttentionGuidedPass({basePath='paperclip/prismbay-global-commerce/research/supplier-candidates.json',guidedPath='growth-reports/attention-guided-supplier-candidates.json'}={}){
  const original=await fs.readFile(basePath,'utf8');
  const guided=await fs.readFile(guidedPath,'utf8');
  const parsed=JSON.parse(guided);
  if(!Array.isArray(parsed?.candidates)||!parsed.candidates.length)throw new Error('attention_guided_catalog_empty');
  try{
    await fs.writeFile(basePath,guided);
    const previousBatch=process.env.PAPERCLIP_CJ_BATCH_SIZE,previousAnchors=process.env.PAPERCLIP_CJ_ANCHOR_COUNT;
    process.env.PAPERCLIP_CJ_BATCH_SIZE=String(Math.min(3,parsed.candidates.length));
    process.env.PAPERCLIP_CJ_ANCHOR_COUNT=String(Math.min(3,parsed.candidates.length));
    try{return await runPaperclipSourcing();}
    finally{
      if(previousBatch===undefined)delete process.env.PAPERCLIP_CJ_BATCH_SIZE;else process.env.PAPERCLIP_CJ_BATCH_SIZE=previousBatch;
      if(previousAnchors===undefined)delete process.env.PAPERCLIP_CJ_ANCHOR_COUNT;else process.env.PAPERCLIP_CJ_ANCHOR_COUNT=previousAnchors;
    }
  } finally {
    await fs.writeFile(basePath,original);
  }
}

export async function main(){return runAttentionGuidedPass();}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
