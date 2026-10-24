import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_AUDIT_URL,CHECKOUT,CRITERIA,GUIDE,buildAssessment} from './first-sale-assessment.mjs';

test('assessment includes seven useful independent checks',()=>{
 assert.equal(CRITERIA.length,7);
 for(const [name,guide] of CRITERIA){
  assert.ok(name.length>=8);
  assert.ok(guide.length>=18);
 }
});
test('free page presents the live $79 digital offer transparently',()=>{
 const html=buildAssessment();
 assert.match(html,/\$79 USD/);
 assert.ok(html.includes(CHECKOUT));
 assert.ok(html.includes(GUIDE));
 assert.ok(html.includes(BOARD_AUDIT_URL));
 assert.match(html,/one-time document package/i);
 assert.match(html,/Request a custom project quotation/);
 assert.match(html,/mailto:support@prismbayai.com\?subject=Custom%20Board%20Paper%20Quote/);
 assert.doesNotMatch(html,/limited time|guaranteed results|thousands of customers/i);
});
test('browser assessment has actual event listeners, scoring and download',()=>{
 const html=buildAssessment();
 assert.equal((html.match(/data-item/g)||[]).length,8); // seven inputs + selector
 assert.match(html,/addEventListener\("submit"/);
 assert.match(html,/addEventListener\("change"/);
 assert.match(html,/id="download"/);
 assert.match(html,/Blob/);
 assert.match(html,/action-plan\.txt/);
 assert.match(html,/revokeObjectURL/);
 assert.match(html,/type="reset"/);
});
test('free assessment does not upload form data or require paid API keys',()=>{
 const html=buildAssessment();
 assert.doesNotMatch(html,/<form[^>]+action=/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage/);
 assert.match(html,/No input is sent to a server/);
 assert.match(html,/rel="canonical"/);
 assert.match(html,/application\/ld\+json/);
});
