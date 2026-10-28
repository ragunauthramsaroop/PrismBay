import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateCandidate} from './pricing.mjs';
const candidate = JSON.parse(readFileSync(new URL('./example-candidate.json', import.meta.url), 'utf8'));
test('video illustrative unit costs and sales model, with zero buying approvals', () => {
  const result = evaluateCandidate(candidate);
  assert.equal(result.inventoryPurchaseCost, 5399.28);
  assert.equal(result.initialCashOutlay, 5939.28);
  assert.equal(result.unitContribution, 19.43);
  assert.equal(result.unitMarginPercent, 14.5);
  assert.equal(result.profitAtSellout, 1398.96);
  assert.equal(result.decision, 'DO NOT PURCHASE');
  assert.equal(result.missingGates.length, 8);
  assert.equal(result.scenarios[3].netCashFlow, 1398.96);
  assert.equal(result.scenarios[0].sold, 18);
});
test('lower competing offer damages margin', () => {
  const result = evaluateCandidate({...candidate, salePrice:124.95});
  assert.equal(result.unitContribution, 11.47);
  assert.equal(result.unitMarginPercent, 9.18);
});
test('all approvals, sufficient budget and healthy margin passes preliminary review', () => {
  const allApproved = Object.fromEntries(Object.keys(candidate.gates).map(k=>[k,true]));
  const result = evaluateCandidate({...candidate, salePrice:200, cashBudget:20000, gates:allApproved});
  assert.match(result.decision,/UNDERWRITING PASSED/);
});
test('invalid fee, quantity and referral rate fail loudly', () => {
  assert.throws(()=>evaluateCandidate({...candidate, freightPerUnit:-1}),/freightPerUnit/);
  assert.throws(()=>evaluateCandidate({...candidate, referralRatePercent:100}),/referralRatePercent/);
  assert.throws(()=>evaluateCandidate({...candidate, minimumOrderQty:1.5}),/minimumOrderQty/);
});
test('missing cash or invalid target do not approve purchase', () => {
  assert.throws(()=>evaluateCandidate({...candidate, cashBudget:NaN}),/cashBudget/);
  assert.throws(()=>evaluateCandidate({...candidate, targetMarginPercent:-1}),/targetMarginPercent/);
  assert.equal(evaluateCandidate({...candidate, gates:Object.fromEntries(Object.keys(candidate.gates).map(k=>[k,true])), cashBudget:0}).decision,'DO NOT PURCHASE');
});
