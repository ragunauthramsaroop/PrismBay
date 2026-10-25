import {test,expect} from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
test("the premium workspace generates, edits and downloads native PowerPoint",async({page})=>{
 await page.goto("/");
 await expect(page.getByText("From idea to")).toBeVisible();
 await expect(page.locator(".slide-surface")).toBeVisible();
 await page.locator("#prompt").fill("Industrial energy investment strategy and governance");
 await page.getByRole("button",{name:/Generate outline/}).click();
 await expect(page.locator('.thumb[data-action="select"]')).toHaveCount(8);
 await page.locator('textarea[data-slide-field="title"]').fill("Industrial investment strategy");
 await expect(page.locator(".slide-surface")).toContainText("Industrial investment strategy");
 const [download]=await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button",{name:/Export PPTX/}).click()
 ]);
 expect(download.suggestedFilename()).toMatch(/\.pptx$/);
 const bytes=await fs.readFile(await download.path());
 const zip=await JSZip.loadAsync(bytes);
 expect(zip.file("ppt/presentation.xml")).toBeTruthy();
 expect(Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).length).toBe(8);
});
test("uploading an article becomes a sourced, editable deck",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:/Upload source files or article/}).click();
 const upload=page.locator("#fileImport");
 await upload.setInputFiles({name:"renewable-project.txt",mimeType:"text/plain",
  buffer:Buffer.from("The renewable energy project installed 35 MW of solar capacity. The project director reported that operations reduced diesel demand during the review period. Training sessions involved employees in safety and maintenance tasks. Management will review the implementation milestones at the next governance meeting.")});
 await expect(page.locator(".slide-surface")).toContainText("renewable project", {timeout:20000});
 await expect(page.getByText(/source\(s\) processed into this deck/)).toBeVisible();
 await expect(page.locator('.thumb[data-action="select"]')).toHaveCount(8);
});
test("all source families are advertised and an article can be pasted",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:/Upload source files or article/}).click();
 await expect(page.getByText(/DOC \/ DOCX/)).toBeVisible();
 await page.locator("#importText").fill("The organization seeks to expand solar capacity across its facilities. Recent investments improved reliability of site electricity supply. Leadership has scheduled governance reviews of the investment programme. Data remains subject to internal validation before public release.");
 await page.getByRole("button",{name:/Generate from article/}).click();
 await expect(page.locator(".slide-surface")).toBeVisible();
 await expect(page.locator('.thumb[data-action="select"]')).toHaveCount(8);
});
