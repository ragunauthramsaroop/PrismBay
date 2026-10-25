import test from "node:test";
import assert from "node:assert/strict";
import {freshTasks,setTask,planDeckJob,auditDeck,snapshot,diffDeck,approveCandidate} from "../src/agent-workflow.js";
import {makeSlide,sanitizeDeck} from "../src/core.js";
test("tasks never mark queued work complete without an update",()=>{
 const initial=freshTasks(true);
 assert.equal(initial.filter(x=>x.status==="complete").length,0);
 const next=setTask(initial,"read","complete","Parsed report.pdf");
 assert.equal(next.find(x=>x.id==="read").status,"complete");
 assert.equal(initial.find(x=>x.id==="read").status,"queued");
});
test("build plan enumerates deliverables based on actual inputs",()=>{
 const p=planDeckJob("Make an executive report",[{name:"report.pdf"}],[{name:"report.pdf"}],{count:10,audience:"Executive board"});
 assert.equal(p.files[0],"report.pdf");assert.ok(p.actions.some(x=>x.includes("10-slide")));
});
const doc=[{name:"audit.pdf",kind:"pdf",text:"The company conserved 30 hectares in 2025 across its operational area."}];
const verified=sanitizeDeck({title:"Protected habitats",slides:[makeSlide("cover",{title:"Protected habitats"}),makeSlide("bullets",{title:"Biodiversity controls",body:"30 hectares conserved in 2025",notes:"Source: audit.pdf"})]});
test("audit detects unsupported quantitative claims and source references",()=>{
 const result=auditDeck(verified,doc,2);
 assert.equal(result.metrics.slides,2);
 assert.equal(result.metrics.sources,1);
 assert.equal(result.metrics.citedSlides,1);
 assert.equal(result.issues.length,0);
 const altered=sanitizeDeck({...verified,slides:verified.slides.map((s,i)=>i===1?{...s,body:"999 tonnes saved",notes:""}:s)});
 const issues=auditDeck(altered,doc,2).issues.map(x=>x.text).join("\n");
 assert.match(issues,/999 tonnes/);assert.match(issues,/speaker notes/);
});
test("approve and restore use independent deck copies",()=>{
 const change=sanitizeDeck({...verified,title:"Next report",slides:[...verified.slides,makeSlide("bullets",{title:"Risk review"})]});
 assert.deepEqual(diffDeck(verified,change),{added:1,removed:0,edited:0,themeChanged:false,titleChanged:true});
 const approved=approveCandidate(verified,change,"Previous");
 assert.equal(approved.deck.title,"Next report");assert.equal(approved.history.length,1);
 assert.equal(approved.history[0].deck.title,"Protected habitats");
 assert.equal(snapshot(verified,"Backup").deck.slides.length,2);
 assert.throws(()=>approveCandidate(verified,null,"Previous"),/No draft/);
});
