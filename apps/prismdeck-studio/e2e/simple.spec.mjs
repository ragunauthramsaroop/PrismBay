import {test,expect} from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
test("landing page contains exactly the simple upload, instructions and generation flow",async({page})=>{
 await page.goto("/#simple");
 await expect(page.getByRole("heading",{name:/Upload\. Instruct\. Present\./})).toBeVisible();
 await expect(page.locator("#simple-upload")).toHaveAttribute("multiple","");
 await expect(page.getByLabel("Presentation instructions")).toBeVisible();
 await expect(page.getByRole("button",{name:/Generate presentation/})).toBeVisible();
 await expect(page.locator(".slide-surface")).toHaveCount(0);
});
test("one source plus ordinary instructions creates editable slide deck and PPTX",async({page})=>{
 await page.goto("/#simple");
 await page.locator("#simple-upload").setInputFiles({name:"solar-carbon-report.txt",mimeType:"text/plain",
  buffer:Buffer.from("An operational assessment found diesel savings during the solar expansion project. Solar generation increased during the review period. Carbon emissions estimates rely on fleet fuel-use records. Workforce training continued throughout the plant commissioning schedule. Future investment commitments require internal approval. Operational performance measurements are still subject to verification. Additional fuel consumption data will be reviewed during the next planning period.")});
 await expect(page.getByText("solar-carbon-report.txt")).toBeVisible();
 await page.getByLabel("Presentation instructions").fill("Prepare 10 slides for the board. Focus on diesel savings and carbon emissions. Keep text concise and use a dark theme.");
 await page.getByRole("button",{name:/Generate presentation/}).click();
 await expect(page.locator('.thumb[data-action="select"]')).toHaveCount(10,{timeout:25000});
 await expect(page.locator(".slide-surface")).toBeVisible();
 await page.locator('.thumb[data-action="select"][data-index="1"]').click();
 await expect(page.locator(".slide-surface")).toContainText(/diesel|carbon/i);
 const [download]=await Promise.all([page.waitForEvent("download"),page.locator('[data-action="pptx"]').click()]);
 expect(download.suggestedFilename()).toMatch(/\.pptx$/);
 const zipped=await JSZip.loadAsync(await fs.readFile(await download.path()));
 expect(Object.keys(zipped.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(10);
 await expect(page.getByRole("button",{name:"Simple upload"})).toBeVisible();
});
test("unsupported video displays an actionable converter error without creating deck",async({page})=>{
 await page.goto("/#simple");
 await page.locator("#simple-upload").setInputFiles({name:"meeting.mp4",mimeType:"video/mp4",buffer:Buffer.from("fake-video")});
 await page.getByLabel("Presentation instructions").fill("Make a presentation summarizing this meeting.");
 await page.getByRole("button",{name:/Generate presentation/}).click();
 await expect(page.getByRole("alert")).toContainText("private converter");
 await expect(page.locator(".slide-surface")).toHaveCount(0);
});
test("instructions only still work and advanced editor remains reachable",async({page})=>{
 await page.goto("/#simple");
 await page.getByLabel("Presentation instructions").fill("Create 5 investor slides about clean industrial energy.");
 await page.getByRole("button",{name:/Generate presentation/}).click();
 await expect(page.locator('.thumb[data-action="select"]')).toHaveCount(5);
 await page.getByRole("button",{name:"Simple upload"}).click();
 await expect(page.getByRole("heading",{name:/Upload\. Instruct\. Present\./})).toBeVisible();
 await page.getByRole("button",{name:/Advanced editor/}).click();
 await expect(page.locator(".slide-surface")).toBeVisible();
});
