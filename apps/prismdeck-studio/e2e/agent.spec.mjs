import {test,expect} from "@playwright/test";
import fs from "node:fs/promises";
import JSZip from "jszip";
const mock={
 title:"Biodiversity strategy",
 theme:"cobalt",
 audience:"Executive board",
 slides:[
 {layout:"cover",title:"Biodiversity strategy",subtitle:"Management briefing"},
 {layout:"bullets",title:"Habitat monitoring",body:"Wildlife observations documented\nMonitoring across work areas",notes:"Source: report.txt"},
 {layout:"bullets",title:"Progress and gaps",body:"Controls tracked through the reporting period"},
 {layout:"closing",title:"Recommended actions",body:"Validate evidence\nAssign accountabilities"}
]};
test("Replit-style agent accepts attachments, instructs an AI, edits in chat and exports PPTX",async({page})=>{
 await page.addInitScript((deck)=>{
  let n=0;
  window.puter={ai:{chat:async(prompt,options)=>{
   n++;
   if(n>1) return {message:{content:JSON.stringify({...deck,slides:deck.slides.map((s,i)=>i===1?{...s,title:"Revised conservation monitoring"}:s)})}};
   return {message:{content:JSON.stringify(deck)}};
  }}};
 },mock);
 await page.goto("/");
 await expect(page.getByRole("heading",{name:"What should we build?"})).toBeVisible();
 await page.locator("#agent-upload").setInputFiles({name:"report.txt",mimeType:"text/plain",buffer:Buffer.from("Biodiversity monitoring included wildlife observations at multiple work areas. Controls were documented during the reporting period. Follow up is needed to assess conservation outcomes. Management plans to validate additional evidence.")});
 await page.locator("#agent-prompt").fill("Prepare an executive biodiversity deck with sources");
 await page.locator("#agent-consent").check();
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-stage .slide-surface")).toBeVisible({timeout:20000});
 await expect(page.locator(".a-review-banner")).toContainText("Draft ready for review");
 await expect(page.locator(".a-task.complete")).toHaveCount(4);
 await expect(page.locator(".a-task.ready")).toHaveCount(1);
 await expect(page.locator(".a-audit")).toContainText("QUALITY REVIEW");
 await expect(page.locator('[data-action="agent-export"]')).toHaveCount(0);
 await page.locator('[data-action="agent-approve"]').click();
 await expect(page.locator('[data-action="agent-export"]')).toBeVisible();
 await expect(page.locator(".a-mini-list button")).toHaveCount(4);
 await page.locator("#agent-prompt").fill("Revise slide 2 to emphasize conservation monitoring.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-mini-list")).toContainText("Revised conservation monitoring");
 await expect(page.locator(".a-review-banner")).toContainText("Draft ready for review");
 await page.locator('[data-action="agent-reject"]').click();
 await expect(page.locator(".a-mini-list")).toContainText("Habitat monitoring");
 await page.locator("#agent-prompt").fill("Revise slide 2 to emphasize conservation monitoring.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-review-banner")).toBeVisible();
 await page.locator('[data-action="agent-approve"]').click();
 await expect(page.locator(".a-mini-list")).toContainText("Revised conservation monitoring");
 await expect(page.locator(".a-versions")).toContainText("Previous versions");
 const [download]=await Promise.all([page.waitForEvent("download"),page.locator('[data-action="agent-export"]').click()]);
 const zip=await JSZip.loadAsync(await fs.readFile(await download.path()));
 expect(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p))).toHaveLength(4);
});
test("explicit consent required before sending source to AI provider",async({page})=>{
 await page.goto("/");
 await page.locator("#agent-prompt").fill("Create 8 slides on biodiversity reporting");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.getByRole("alert")).toContainText("authorize sharing");
 await expect(page.locator(".a-stage")).toHaveCount(0);
});
test("offline mode remains usable without Puter account or Railway",async({page})=>{
 await page.goto("/");
 await page.locator("#agent-engine").selectOption("offline");
 await page.locator("#agent-upload").setInputFiles({name:"brief.txt",mimeType:"text/plain",buffer:Buffer.from("The conservation team reviewed biodiversity protection work. A survey recorded wildlife presence across the operational area. Environmental monitoring recommendations remain under internal review. A follow-up assessment was proposed for future reporting periods.")});
 await page.locator("#agent-prompt").fill("Prepare 6 slides summarizing the attached conservation work.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-stage .slide-surface")).toBeVisible();
 await expect(page.locator(".a-mini-list button")).toHaveCount(6);
 await expect(page.locator(".a-review-banner")).toBeVisible();
 await page.locator('[data-action="agent-approve"]').click();
 await expect(page.locator('[data-action="agent-export"]')).toBeVisible();
});

test("previous approved presentation survives revision failures, with restore checkpoints",async({page})=>{
 let step=0;
 await page.addInitScript(()=>{
  window.puter={ai:{chat:async ()=>{
   window.__requests=(window.__requests||0)+1;
   if(window.__requests===1)return {message:{content:JSON.stringify({title:"Original report",slides:[{layout:"cover",title:"Original report"},{layout:"bullets",title:"Habitat management",body:"Wildlife habitats documented"}]})}};
   if(window.__requests===2)return {message:{content:JSON.stringify({title:"Revised report",slides:[{layout:"cover",title:"Revised report"},{layout:"bullets",title:"Conservation action",body:"Habitat protection follow-ups"}]})}};
   return {message:{content:"Malformed output"}};
  }}};
 });
 await page.goto("/");
 await page.locator("#agent-consent").check();
 await page.locator("#agent-prompt").fill("Build a presentation about wildlife conservation.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-review-banner")).toBeVisible();
 await page.locator('[data-action="agent-approve"]').click();
 await expect(page.locator(".a-output-head")).toContainText("Original report");
 await page.locator("#agent-prompt").fill("Create a revision focused on conservation actions.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.locator(".a-review-banner")).toBeVisible();
 await expect(page.locator(".a-output-head")).toContainText("Revised report");
 await page.locator('[data-action="agent-approve"]').click();
 await expect(page.locator(".a-output-head")).toContainText("Revised report");
 await page.locator(".a-versions summary").click();
 await page.locator('[data-action="agent-restore"]').first().click();
 await expect(page.locator(".a-output-head")).toContainText("Original report");
 await page.reload();
 await expect(page.locator(".a-output-head")).toContainText("Original report");
});
test("AI cannot act without consent even when sources are selected",async({page})=>{
 await page.goto("/");
 await page.locator("#agent-upload").setInputFiles({name:"internal.txt",mimeType:"text/plain",buffer:Buffer.from("Private text")});
 await page.locator("#agent-prompt").fill("Make the requested board deck.");
 await page.locator('[data-action="agent-send"]').click();
 await expect(page.getByRole("alert")).toContainText("authorize sharing");
 await expect(page.locator(".a-taskboard")).toHaveCount(0);
});
