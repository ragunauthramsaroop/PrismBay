import {CreateMLCEngine} from "@mlc-ai/web-llm";
let engine=null,loading=null;
export const model="Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export async function load(progress){
 if(!navigator.gpu)throw Error("WebGPU is not available in this browser.");
 if(!engine&&!loading)loading=CreateMLCEngine(model,{initProgressCallback:r=>progress(r.text)}).then(x=>{engine=x;return x;}).finally(()=>{loading=null;});
 return engine||await loading;
}
export async function generate(messages,progress){const e=await load(progress);const r=await e.chat.completions.create({messages:messages.slice(-6),max_tokens:384,temperature:0.6});const text=r.choices?.[0]?.message?.content;if(!text)throw Error("Local model returned no answer.");return {provider:"on-device",model,text};}
