import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html=fs.readFileSync('youtube-growth/companion/2026-11-01-ai-agent-roi-ledger-calculator.html','utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'Inline calculator script required');
assert.ok(!/<script[^>]+src=|<link[^>]+href="https?:|fetch\(|XMLHttpRequest|sendBeacon/.test(html),
  'Calculator must stay self-contained and transmit no input data');

const config={
 volume:[6000,1,10000000],minutes:[5,.01,1440],rate:[36,0,10000],
 straight:[75,0,100],review:[45,0,3600],compute:[1800,0,10000000],
 support:[2200,0,10000000],risk:[1000,0,10000000],setup:[30000,0,100000000]
};
function fakeNode(id=''){
 return {id,value:'',min:'',max:'',textContent:'',children:[],listeners:{},
   addEventListener(type,cb){this.listeners[type]=cb},
   replaceChildren(){this.children=[]},
   append(child){this.children.push(child)}};
}
function setup(){
 const nodes={};
 for(const [id,[v,min,max]] of Object.entries(config)){
  nodes[id]=fakeNode(id);nodes[id].value=String(v);
  nodes[id].min=String(min);nodes[id].max=String(max);
 }
 for(const id of ['error','baseline','benefit','payback','rbaseline','rexceptions','rover',
  'rother','rpost','rnet','ryear','scenarios','copy','copystatus'])nodes[id]=fakeNode(id);
 const document={getElementById:id=>nodes[id]??null,createElement:tag=>fakeNode(tag)};
 const context=vm.createContext({document,Intl,Number,console,navigator:{clipboard:{writeText:async()=>{}}}});
 vm.runInContext(match[1],context,{timeout:1000});
 return {nodes,context};
}
test('illustrative base case matches 2026 ROI source',()=>{
 const {nodes}=setup();
 assert.equal(nodes.baseline.textContent,'$18,000');
 assert.equal(nodes.benefit.textContent,'$5,800');
 assert.equal(nodes.payback.textContent,'5.2 months');
 assert.equal(nodes.rexceptions.textContent,'$4,500');
 assert.equal(nodes.rover.textContent,'$2,700');
 assert.equal(nodes.rother.textContent,'$5,000');
 assert.equal(nodes.rpost.textContent,'$12,200');
 assert.equal(nodes.ryear.textContent,'$39,600');
 assert.equal(nodes.scenarios.children.length,3);
 assert.deepEqual(nodes.scenarios.children.map(r=>r.children.map(c=>c.textContent)),
  [['60%','$3,100','9.7 months'],['75%','$5,800','5.2 months'],['90%','$8,500','3.5 months']]);
});
test('completion rate changes the monthly economic benefit, not the baseline',()=>{
 const {nodes,context}=setup();
 nodes.straight.value='60';vm.runInContext('compute()',context);
 assert.equal(nodes.benefit.textContent,'$3,100');
 assert.equal(nodes.payback.textContent,'9.7 months');
 nodes.straight.value='90';vm.runInContext('compute()',context);
 assert.equal(nodes.benefit.textContent,'$8,500');
 assert.equal(nodes.payback.textContent,'3.5 months');
 assert.equal(nodes.baseline.textContent,'$18,000');
});
test('unprofitable case does not invent positive payback',()=>{
 const {nodes,context}=setup();
 nodes.compute.value='25000';vm.runInContext('compute()',context);
 assert.equal(nodes.payback.textContent,'Not reached');
 assert.ok(nodes.benefit.textContent.startsWith('-'));
});
test('invalid values stop calculation',()=>{
 const {nodes,context}=setup();
 nodes.straight.value='101';vm.runInContext('compute()',context);
 assert.match(nodes.error.textContent,/valid value/);
});
test('companion makes no claim of observed cash savings',()=>{
 assert.match(html,/not verified cash savings/i);
 assert.match(html,/calculations run entirely in your browser/i);
 assert.match(html,/PRISMBAY AI/);
});
