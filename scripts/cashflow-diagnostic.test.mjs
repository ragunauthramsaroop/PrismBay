import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessCashflow, buildCashflowDiagnostic,
  CASHFLOW_DIAGNOSTIC_URL, CASHFLOW_STUDIO_PAGE, CASHFLOW_STUDIO_CHECKOUT
} from './cashflow-diagnostic.mjs';

test('baseline models exact cash deficit, runway and the two stress cases', () => {
  const r=assessCashflow({startingCash:3000,monthlyReceipts:1000,monthlyCosts:2000});
  assert.equal(r.baseline.monthlyNet,-1000);
  assert.equal(r.baseline.runwayMonths,3);
  assert.equal(r.baseline.afterThreeMonths,0);
  assert.equal(r.baseline.afterSixMonths,-3000);
  assert.equal(r.baseline.afterTwelveMonths,-9000);
  assert.equal(r.lowerReceipts.monthlyNet,-1100);
  assert.equal(r.lowerReceipts.afterSixMonths,-3600);
  assert.equal(r.higherCosts.monthlyNet,-1200);
  assert.equal(r.higherCosts.afterSixMonths,-4200);
});
test('surplus and breakeven have no monthly cash-burn runway',()=>{
  for(const v of [
    {startingCash:5000,monthlyReceipts:2500,monthlyCosts:2000},
    {startingCash:0,monthlyReceipts:2000,monthlyCosts:2000}
  ]){
    const r=assessCashflow(v);
    assert.equal(r.baseline.runwayMonths,null);
  }
});
test('zero initial cash and one-month deficit means zero runway',()=>{
  const r=assessCashflow({startingCash:0,monthlyReceipts:5,monthlyCosts:20});
  assert.equal(r.baseline.runwayMonths,0);
  assert.equal(r.baseline.afterThreeMonths,-45);
});
test('invalid values fail closed without remote services',()=>{
  for(const x of [-1,NaN,Infinity,1000000001,'5',null]){
    assert.throws(()=>assessCashflow({startingCash:x,monthlyReceipts:2,monthlyCosts:1}));
  }
  assert.throws(()=>assessCashflow(null));
});
test('free local-only calculator links to the already verified paid SKU',()=>{
  const html=buildCashflowDiagnostic();
  assert.ok(html.includes(CASHFLOW_DIAGNOSTIC_URL));
  assert.ok(html.includes(CASHFLOW_STUDIO_PAGE));
  assert.ok(html.includes(CASHFLOW_STUDIO_CHECKOUT));
  assert.match(html,/\$5\.99 USD one time/);
  assert.match(html,/No registration/);
  assert.match(html,/No bank connection/);
  assert.match(html,/application\/ld\+json/);
  assert.match(html,/rel="canonical"/);
  assert.match(html,/calculate cash runway/i);
  assert.match(html,/10% fewer customer payments/);
  assert.match(html,/download results/i);
  assert.match(html,/Blob/);
  assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.doesNotMatch(html,/guaranteed profit|limited time offer|fake review/i);
  assert.doesNotMatch(html,/<form[^>]+action=/i);
});
