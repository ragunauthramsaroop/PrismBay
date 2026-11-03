import { products, runProduct, UPSTREAM } from "./core.mjs";
const $=id=>document.getElementById(id);
let selectedId=products[0].id, latest=null;
const categories=[...new Set(products.map(p=>p.category))].sort();
for(const category of categories){const el=document.createElement("option");el.value=category;el.textContent=category;$("category").appendChild(el);}
$("total").textContent=String(products.length);
function renderList(){
 const q=$("search").value.toLowerCase().trim(),c=$("category").value;
 const found=products.filter(p=>(!c||p.category===c)&&(!q||[p.name,p.value,p.buyer,p.category].join(" ").toLowerCase().includes(q)));
 $("visible-count").textContent=found.length+" shown";
 $("products").replaceChildren(...found.map(p=>{
  const button=document.createElement("button");button.type="button";button.className="product"+(p.id===selectedId?" active":"");button.setAttribute("aria-pressed",String(p.id===selectedId));
  const info=document.createElement("div"),name=document.createElement("strong"),buyer=document.createElement("small"),price=document.createElement("em");
  name.textContent=p.name;buyer.textContent=p.buyer;price.textContent="$"+p.price+"/mo*";info.append(name,buyer);button.append(info,price);button.addEventListener("click",()=>choose(p.id));return button;
 }));
}
function choose(id){
 const p=products.find(p=>p.id===id);if(!p)return;
 selectedId=p.id;latest=null;$("selected-category").textContent=p.category;$("product-title").textContent=p.name;$("product-value").textContent=p.value;
 $("product-stage").textContent=p.stage.toUpperCase();$("buyer").textContent=p.buyer;
 $("price").textContent="$"+p.price+" / month (test proposal)";
 $("upstream").href=UPSTREAM+"/tree/main/"+p.source;
 $("input").value=JSON.stringify(p.example,null,2);$("result").hidden=true;$("error").hidden=true;$("export").disabled=true;renderList();
}
function renderResult(r){
 $("result-headline").textContent=r.headline;
 $("metrics").replaceChildren(...Object.entries(r.metrics).map(([name,value])=>{
  const d=document.createElement("div"),s=document.createElement("small"),v=document.createElement("strong");d.className="metric";s.textContent=name.replace(/([A-Z])/g," $1");v.textContent=String(value??"n/a");d.append(s,v);return d;
 }));
 const write=(target,list)=>$(target).replaceChildren(...list.map(value=>{const el=document.createElement("li");el.textContent=value;return el;}));
 write("findings",r.findings);write("actions",r.actions);$("disclaimer").textContent=r.disclaimer;$("result").hidden=false;
}
$("run").addEventListener("click",()=>{
 $("error").hidden=true;
 try{const parsed=JSON.parse($("input").value);const r=runProduct(selectedId,parsed);latest={product:selectedId,input:parsed,result:r,exportedAt:new Date().toISOString()};renderResult(r);$("export").disabled=false;}
 catch(e){latest=null;$("result").hidden=true;$("export").disabled=true;$("error").textContent="Unable to run: "+(e instanceof Error?e.message:"Invalid input.");$("error").hidden=false;}
});
$("reset").addEventListener("click",()=>choose(selectedId));
$("export").addEventListener("click",()=>{
 if(!latest)return;
 const body=JSON.stringify(latest,null,2),blob=new Blob([body],{type:"application/json"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="prismbay-demo-"+selectedId+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("search").addEventListener("input",renderList);$("category").addEventListener("change",renderList);choose(selectedId);