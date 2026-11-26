import {anonymous,complete} from "../lib/hybrid.mjs";
let last=null,at=0,pending=null;
export default async function handler(req,res){
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 res.setHeader("Cache-Control","public, s-maxage=60, stale-while-revalidate=120");
 if(!last||Date.now()-at>60000){
 if(!pending)pending=(async()=>{const trace=[];let answer=null;
 for(const model of anonymous){answer=await complete(model,[{role:"user",content:"Reply with the word READY. Do not explain."}],trace,fetch,256);if(answer||["http_429","http_401","http_403"].includes(trace.at(-1).status))break;}
 last={version:"0.4.1",checkedAt:new Date().toISOString(),cloud:answer?"responding":"unavailable",model:answer?.model||null,trace,local:"WebGPU required; device not tested",central:"owner-only, optional"};at=Date.now();})().finally(()=>{pending=null;});
 await pending;
 }
 return res.status(200).json(last);
}