import http from "node:http";
import {readFile} from "node:fs/promises";
import {timingSafeEqual} from "node:crypto";
import {createRouter} from "./router.mjs";
const secret=process.env.SUPER_AI_TOKEN;
if(!secret||secret.length<32)throw Error("Set SUPER_AI_TOKEN to a random secret of at least 32 characters");
const router=createRouter(); const ui=await readFile(new URL("./index.html",import.meta.url)); 
const script=await readFile(new URL("./ui.js",import.meta.url));
const style=await readFile(new URL("./style.css",import.meta.url));
let times=[];
const auth=req=>{const a=Buffer.from(req.headers.authorization||""),b=Buffer.from("Bearer "+secret);return a.length===b.length&&timingSafeEqual(a,b);};
function send(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
 if(req.method==="GET"&&["/","/ui.js","/style.css"].includes(req.url)){
  const entry={"/":[ui,"text/html"],"/ui.js":[script,"text/javascript"],"/style.css":[style,"text/css"]}[req.url];res.writeHead(200,{"Content-Type":entry[1]+"; charset=utf-8"});return res.end(entry[0]);
 }
 if(!auth(req))return send(res,401,{error:"Unauthorized"});
 if(req.method==="GET"&&req.url==="/api/status")return send(res,200,{providers:router.status()});
 if(req.method!=="POST"||req.url!=="/api/chat")return send(res,404,{error:"Not found"});
 if(!String(req.headers["content-type"]||"").startsWith("application/json"))return send(res,415,{error:"JSON required"});
 const now=Date.now();times=times.filter(t=>now-t<60000);if(times.length>=6)return send(res,429,{error:"Local rate limit reached"});times.push(now);
 let raw="",size=0;try{for await(const chunk of req){size+=chunk.length;if(size>140000){send(res,413,{error:"Request too large"});return;}raw+=chunk.toString("utf8");}const result=await router.run(JSON.parse(raw));send(res,result.answer?200:503,result);}
 catch(e){send(res,400,{error:e instanceof SyntaxError?"Invalid JSON":String(e.message).slice(0,200)});}
});
server.requestTimeout=90000;
server.listen(Number(process.env.PORT||8787),"127.0.0.1",()=>console.log("PrismBay Super AI listening on loopback"));
