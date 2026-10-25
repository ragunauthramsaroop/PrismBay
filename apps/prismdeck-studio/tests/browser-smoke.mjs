import assert from "node:assert/strict";
import {mkdir,stat} from "node:fs/promises";
import {chromium} from "playwright";

const address=process.env.PRISMDECK_URL||"http://127.0.0.1:5173/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
  const context=await browser.newContext({viewport:{width:1512,height:982},acceptDownloads:true});
  const page=await context.newPage();
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(address,{waitUntil:"domcontentloaded",timeout:30000});
  await page.locator(".slide-surface").waitFor();
  assert.equal(await page.locator(".thumb").count(),8,"starter deck should have eight layouts");
  const first=await page.locator(".slide-surface").boundingBox();
  assert.ok(first&&Math.abs(first.width/first.height-16/9)<0.02,"preview should be widescreen");
  await page.locator("#prompt").fill("International clean energy investment strategy");
  await page.locator("[data-audience]").selectOption("Investors");
  await page.locator("[data-count]").selectOption("8");
  await page.locator('[data-action="generate"]').click();
  await page.locator(".thumb").first().waitFor();
  assert.equal(await page.locator(".thumb").count(),8);
  assert.match(await page.locator(".deck-title-input").inputValue(),/International clean energy/);
  await page.locator('[data-action="select"][data-index="4"]').click();
  await page.locator('[data-metric="0"][data-metric-field="value"]').fill("26%");
  assert.equal((await page.locator(".stat-value").first().textContent()).trim(),"26%");
  await page.locator('[data-theme="cobalt"]').click();
  await page.locator(".slide-surface.theme-cobalt").waitFor();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".slide-surface.theme-cobalt").waitFor();
  assert.equal((await page.locator(".stat-value").first().textContent()).trim(),"26%","local edits should survive refresh");
  const downloadStarted=page.waitForEvent("download",{timeout:60000});
  await page.locator('[data-action="pptx"]').click();
  const download=await downloadStarted;
  assert.match(download.suggestedFilename(),/\.pptx$/);
  await mkdir("test-artifacts",{recursive:true});
  const out="test-artifacts/"+download.suggestedFilename();
  await download.saveAs(out);
  assert.ok((await stat(out)).size>10000,"export should contain a real PPTX archive");
  await page.screenshot({path:"test-artifacts/studio.png",fullPage:true});
  assert.deepEqual(errors,[],"browser must not raise uncaught app exceptions");
  console.log("Browser QA passed: layout, generation, editing, theme, autosave, PPTX download, screenshot");
} finally {
  await browser.close();
}
