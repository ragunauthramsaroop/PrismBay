import {anonymous,complete} from "../lib/hybrid.mjs";
let last=null,at=0,pending=null;
export default async function handler(req,res){
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 res.setHeader("Cache-Control","public, s-maxage=60, stale-while-revalidate=120");
 if(!last||Date.now()-at>60000){
 if(!pending)pending=(async()=>{const trace=[];const answer=await complete(anonymous[0],[{role:"user",content:"Reply with the word READY."}],trace,fetch,32);
 last={version:"0.3",checkedAt:new Date().toISOString(),cloud:answer?"responding":"unavailable",model:answer?.model||anonymous[0].model,trace,local:"WebGPU required; device not tested",central:"owner-only, optional"};at=Date.now();})().finally(()=>{pending=null;});
 await pending;
 }
 return res.status(200).json(last);
}