import test from "node:test";
import assert from "node:assert/strict";
import {SOURCE_ACCEPT,fileExtension,isServerFormat,ingestOne} from "../src/ingest.js";
test("advertises all requested upload families",()=>{
 for(const suffix of [".html",".txt",".mp4",".ppt",".pptx",".pdf",".doc",".docx",".xls",".xlsx"]){assert.ok(SOURCE_ACCEPT.includes(suffix));}
});
test("properly routes legacy and video to server",()=>{
 assert.equal(fileExtension("BOARD.PPTX"),"pptx");
 assert.equal(isServerFormat("legacy.doc"),true);
 assert.equal(isServerFormat("meeting.mp4"),true);
 assert.equal(isServerFormat("new.docx"),false);
});
test("refuses unsupported uploads",async()=>{
 await assert.rejects(()=>ingestOne({name:"execute.exe",size:15}),/Unsupported/);
});
