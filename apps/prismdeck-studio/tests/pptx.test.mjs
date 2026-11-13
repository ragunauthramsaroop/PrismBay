import test from "node:test";
import assert from "node:assert/strict";
import {buildPowerpoint} from "../src/pptx.js";
import {starterDeck,generateDeck} from "../src/core.js";

test("full demonstration exports a standards-compatible ZIP PowerPoint",async()=>{
  const pptx=buildPowerpoint(starterDeck());
  const output=await pptx.write({outputType:"nodebuffer",compression:true});
  assert.ok(Buffer.isBuffer(output));
  assert.ok(output.byteLength>10000);
  assert.equal(output.subarray(0,2).toString(),"PK");
});
test("every premium theme exports PowerPoint",async()=>{
  for(const theme of ["midnight","cobalt","sand","emerald"]){
    const pptx=buildPowerpoint(generateDeck("Industrial clean power", {count:4,theme}));
    const output=await pptx.write({outputType:"nodebuffer",compression:true});
    assert.equal(output.subarray(0,2).toString(),"PK");
  }
});
