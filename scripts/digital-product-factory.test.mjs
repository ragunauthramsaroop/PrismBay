import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, validateCatalog, toCsv } from './digital-product-factory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const spec=JSON.parse(await fs.readFile(path.join(root,'data/global-digital-products-2026.json'),'utf8'));

test('ten products use unique safe IDs and review-only publication',()=>{
  const valid=validateCatalog(spec);
  assert.equal(valid.products.length,10);
  assert.equal(valid.publication,'prototype_only');
  assert.ok(valid.products.every(x=>x.priceUsd>0&&x.priceUsd<=50));
});

test('rejects duplicate IDs and invalid worksheet shapes',()=>{
  const duplicate=structuredClone(spec);
  duplicate.products[1].id=duplicate.products[0].id;
  assert.throws(()=>validateCatalog(duplicate),/duplicate/);
  const broken=structuredClone(spec);
  broken.products[0].rows[0].pop();
  assert.throws(()=>validateCatalog(broken),/CSV rows/);
  const live=structuredClone(spec);
  live.publication='live';
  assert.throws(()=>validateCatalog(live),/unpublished/);
});

test('CSV escaping handles quotes and newlines',()=>{
  assert.equal(toCsv([['a','A "quote"'],['line\nbreak',2]]),'"a","A ""quote"""\r\n"line\nbreak","2"\r\n');
});

test('factory generates ten reviewable packs with original templates and no checkout',async()=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'prismbay-product-lab-'));
  try{
    const summary=await build(tmp);
    assert.equal(summary.count,10);
    const mf=JSON.parse(await fs.readFile(path.join(tmp,'catalog-manifest.json'),'utf8'));
    assert.equal(mf.approvalRequiredBeforeSale,true);
    assert.equal(mf.firstSaleVerified,false);
    assert.equal(mf.postsPublished,false);
    assert.equal(mf.products.length,10);
    for(const p of spec.products){
      const dir=path.join(tmp,p.id);
      const m=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
      assert.equal(m.status,'prototype_not_for_sale');
      assert.equal(m.shopUrl,null);
      assert.equal(m.salesVerified,false);
      assert.equal(m.published,false);
      assert.ok(m.files.length>=4);
      const brief=JSON.parse(await fs.readFile(path.join(dir,'marketing/short-video-brief.json'),'utf8'));
      assert.equal(brief.published,false);
      assert.equal(brief.doNotClaimAvailable,true);
      assert.equal(brief.scenes.at(-1).end,24);
      if(p.format==='csv'){
        const sheet=await fs.readFile(path.join(dir,'templates/'+p.id+'.csv'),'utf8');
        assert.match(sheet,/^\x22/);
        assert.ok(sheet.includes('\r\n'));
      }
      if(p.format==='html'){
        const html=await fs.readFile(path.join(dir,'templates/index.html'),'utf8');
        assert.match(html,/viewport/);
        assert.match(html,/replace-with-your-email@example.com/);
      }
      if(p.format==='svg'){
        const icons=await fs.readdir(path.join(dir,'assets'));
        assert.equal(icons.length,6);
      }
    }
    const financial=await fs.readFile(path.join(tmp,'service-pricing-guide/templates/service-pricing-guide.csv'),'utf8');
    assert.match(financial,/=F2\/\(1-G2\)/);
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
});

test('free sample calculator is offline, accessible and makes no false sales promise',async()=>{
  const html=await fs.readFile(path.join(root,'public/digital/free-pricing-calculator.html'),'utf8');
  for(const id of ['hours','rate','expenses','contingency','margin','price','export','reset']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(html,/No data upload/);
  assert.match(html,/gross margin/);
  assert.match(html,/URL\.createObjectURL/);
  assert.doesNotMatch(html,/fetch\(|analytics|guaranteed income/i);
});
