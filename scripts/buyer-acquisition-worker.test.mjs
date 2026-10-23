import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignForSlot, ACTIVE_DIGITAL_OFFERS } from './digital-conversion-campaign.mjs';

test('buyer acquisition rotation always points to existing paid digital offers',()=>{
  assert.equal(ACTIVE_DIGITAL_OFFERS.length,4);
  for(let slot=0;slot<16;slot++){
    const c=campaignForSlot(slot);
    const o=ACTIVE_DIGITAL_OFFERS.find(x=>x.slug===c.offer.slug);
    assert.ok(o);
    assert.equal(c.offer.priceUsd,o.priceUsd);
    assert.ok(c.guideUrl.startsWith(o.guide));
    assert.ok(c.checkoutUrl.startsWith(o.checkout));
    assert.equal(c.guardrails.physicalProductsPromoted,false);
    assert.equal(c.guardrails.noClaimsOfNewSales,true);
  }
});

test('buyer acquisition copy is commercially explicit without fake urgency or outcomes',()=>{
  for(let i=0;i<ACTIVE_DIGITAL_OFFERS.length;i++){
    const c=campaignForSlot(i);
    assert.match(c.editorialDraft,/one time/);
    assert.match(c.editorialDraft,/not hosted AI software/);
    assert.doesNotMatch(c.editorialDraft,/guaranteed|only \d+ left|best.?seller|verified customer/i);
  }
  assert.match(campaignForSlot(0).editorialDraft,/Free step-by-step example/);
  assert.match(campaignForSlot(3).editorialDraft,/Free comparison page/);
});
