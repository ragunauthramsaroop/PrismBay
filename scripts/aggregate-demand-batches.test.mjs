import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBatches } from './aggregate-demand-batches.mjs';

const c=(slug,name,score=50,category='cleaning-tools')=>({slug,name,query:name.toLowerCase(),category,researchScore:score,status:'RESEARCH_CANDIDATE'});

test('aggregates batches and keeps every candidate research-only',()=>{
  const out=aggregateBatches([
    {batch:'A',sourceIssue:239,candidates:[c('a','A',90),c('b','B',70)]},
    {batch:'B',sourceIssue:240,candidates:[c('c','C',80,'kitchen-cleaning-organization')]}
  ]);
  assert.equal(out.batchCount,2);
  assert.equal(out.candidateCount,3);
  assert.deepEqual(out.candidates.map(x=>x.slug),['a','c','b']);
  for(const x of out.candidates){
    assert.equal(x.status,'RESEARCH_CANDIDATE');
    assert.equal(x.supplierReady,false);
    assert.equal(x.checkoutReady,false);
    assert.equal(x.promotionReady,false);
    assert.equal(x.listed,false);
    assert.equal(x.ordersEnabled,false);
  }
});

test('deduplicates by slug or name across batches',()=>{
  const out=aggregateBatches([
    {batch:'A',candidates:[c('a','Product A')]},
    {batch:'B',candidates:[c('a','Different Name'),c('different','Product A')]}
  ]);
  assert.equal(out.candidateCount,1);
  assert.equal(out.duplicates.length,2);
});

test('records category counts and source batch',()=>{
  const out=aggregateBatches([{batch:'D',sourceIssue:242,candidates:[c('p','Pet Tool',60,'pet-home-cleanup')]}]);
  assert.equal(out.categoryCounts['pet-home-cleanup'],1);
  assert.equal(out.candidates[0].sourceBatch,'D');
  assert.equal(out.candidates[0].sourceIssue,242);
});

test('rejects malformed batch',()=>assert.throws(()=>aggregateBatches([{batch:'A'}]),/invalid_batch_candidates/));
test('rejects candidate without slug or name',()=>assert.throws(()=>aggregateBatches([{batch:'A',candidates:[{slug:'',name:'X'}]}]),/candidate_missing_slug_or_name/));
