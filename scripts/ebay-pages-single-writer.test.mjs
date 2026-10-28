import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(path,'utf8');

test('eBay publishers own disjoint status files',async()=>{
  const [control,orchestrator]=await Promise.all([
    read('.github/workflows/ebay-control-plane.yml'),
    read('.github/workflows/ebay-autonomous-orchestrator.yml')
  ]);
  assert.match(control,/cp growth-reports\/ebay\/control-plane\.json/);
  assert.doesNotMatch(orchestrator,/cp growth-reports\/ebay\/control-plane\.json/);
  assert.match(orchestrator,/cp growth-reports\/ebay\/orchestrator-state\.json/);
  assert.doesNotMatch(control,/cp growth-reports\/ebay\/orchestrator-state\.json/);
  for(const workflow of [control,orchestrator]){
    assert.match(workflow,/reset --hard origin\/gh-pages/);
    assert.match(workflow,/push origin HEAD:gh-pages/);
    assert.doesNotMatch(workflow,/push --force|push -f\b/);
  }
});
