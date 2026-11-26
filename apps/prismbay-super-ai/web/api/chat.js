import {CATALOG,createRouter,validate} from "../lib/router.mjs";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"POST required"});}
 if(!String(req.headers["content-type"]||"").startsWith("application/json"))return res.status(415).json({error:"JSON required"});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
  if(!body||JSON.stringify(body).length>100000)return res.status(413).json({error:"Request too large"});
  const input=validate(body);
  if(body.freeOnly!==true)return res.status(400).json({error:"Confirm provider-enforced free-only billing first."});
  const keys=body.keys;
  if(!keys||typeof keys!=="object"||Array.isArray(keys))return res.status(400).json({error:"Add your own provider key in Settings."});
  const providers=CATALOG.filter(p=>typeof keys[p.id]==="string"&&keys[p.id].trim().length>=8&&keys[p.id].length<=2048).map(p=>({...p,token:keys[p.id].trim()}));
  if(!providers.length)return res.status(400).json({error:"No valid provider key configured."});
  const router=createRouter({providers,fetcher:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})});
  const result=await router.run({...input,consent:true});
  return res.status(result.answer?200:503).json(result);
 }catch{return res.status(400).json({error:"Invalid request or conversation. Check your settings."});}
}