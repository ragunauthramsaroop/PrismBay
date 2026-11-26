import {hybrid} from "../lib/hybrid.mjs";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"POST required"});}
 if(!String(req.headers["content-type"]||"").startsWith("application/json"))return res.status(415).json({error:"JSON required"});
 try{const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
 if(!body||JSON.stringify(body).length>60000)return res.status(413).json({error:"Request too large"});
 const result=await hybrid(body);return res.status(result.answer?200:503).json(result);
 }catch{return res.status(400).json({error:"Invalid conversation or missing cloud processing consent."});}
}