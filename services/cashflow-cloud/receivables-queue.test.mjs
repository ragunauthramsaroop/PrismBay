import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceivablesQueue, buildFollowUpDraft } from './receivables-queue.mjs';

const today = '2026-11-01';
const base = (overrides = {}) => ({
  id:'a', invoiceNumber:'INV-1', client:'Client A',
  amount:100, dueDate:'2026-10-31', status:'open', ...overrides,
});

test('reports aging buckets with exact cent totals and paid exclusions', () => {
  const rows = [
    base(), base({id:'b',invoiceNumber:'2',amount:20.12,dueDate:'2026-10-20'}),
    base({id:'c',invoiceNumber:'3',amount:50.5,dueDate:'2026-09-01'}),
    base({id:'d',invoiceNumber:'4',amount:75.25,dueDate:'2026-11-05'}),
    base({id:'e',invoiceNumber:'5',amount:40,dueDate:'2026-09-30'}),
    base({id:'f',invoiceNumber:'6',amount:1000,dueDate:'2026-10-01',status:'paid'}),
  ];
  const r = buildReceivablesQueue(rows,today);
  assert.equal(r.summary.openAmount,285.87);
  assert.equal(r.summary.overdueAmount,210.62);
  assert.equal(r.summary.dueNext7Amount,75.25);
  assert.deepEqual(r.summary.aging.days1to7,{count:1,amount:100});
  assert.deepEqual(r.summary.aging.days8to30,{count:1,amount:20.12});
  assert.deepEqual(r.summary.aging.days31to60,{count:1,amount:40});
  assert.deepEqual(r.summary.aging.days61plus,{count:1,amount:50.5});
  assert.deepEqual(r.summary.aging.current,{count:1,amount:75.25});
  assert.equal(r.summary.paidCount,1);
});
test('ranks longest overdue first and uses deterministic invoice tie breaks', () => {
  const r = buildReceivablesQueue([
    base({id:'a',invoiceNumber:'A',dueDate:'2026-10-20',amount:10}),
    base({id:'b',invoiceNumber:'B',dueDate:'2026-09-01',amount:1}),
    base({id:'c',invoiceNumber:'C',dueDate:'2026-11-02',amount:999}),
    base({id:'d',invoiceNumber:'D',dueDate:'2026-10-20',amount:20}),
  ],today);
  assert.deepEqual(r.queue.map(x=>x.invoiceNumber),['B','D','A','C']);
  assert.deepEqual(r.queue.map(x=>x.priority),['critical','high','high','upcoming']);
});
test('does not include paid invoices in action queue', () => {
  const r=buildReceivablesQueue([base({status:'paid'})],today);
  assert.equal(r.queue.length,0); assert.equal(r.summary.openAmount,0);
});
test('honors do-not-contact preference and still counts outstanding balance', () => {
  const r=buildReceivablesQueue([base({doNotContact:true})],today);
  assert.equal(r.queue.length,0);assert.equal(r.holds[0].reason,'do_not_contact');assert.equal(r.summary.overdueAmount,100);
  assert.throws(()=>buildFollowUpDraft(base({doNotContact:true}),today),/opted out/);
});
test('holds promised payments through the promised day', () => {
  const r=buildReceivablesQueue([base({promisedPaymentDate:'2026-11-01'})],today);
  assert.equal(r.holds[0].reason,'payment_promised');
  assert.equal(buildReceivablesQueue([base({promisedPaymentDate:'2026-10-31'})],today).queue.length,1);
});
test('holds snoozed follow-ups until next follow-up date', () => {
  const r=buildReceivablesQueue([base({nextFollowUpDate:'2026-11-02'})],today);
  assert.equal(r.holds[0].reason,'follow_up_snoozed');
  assert.equal(buildReceivablesQueue([base({nextFollowUpDate:today})],today).queue.length,1);
});
test('avoids repeated contact inside minimum gap, with boundary on day 3', () => {
  assert.equal(buildReceivablesQueue([base({lastFollowUpDate:'2026-10-30'})],today).holds[0].reason,'recently_contacted');
  assert.equal(buildReceivablesQueue([base({lastFollowUpDate:'2026-10-29'})],today).queue.length,1);
});
test('holds invoices beyond lookahead and includes due-today', () => {
  const r=buildReceivablesQueue([base({id:'a',invoiceNumber:'A',dueDate:'2026-11-09'}),base({id:'b',invoiceNumber:'B',dueDate:today})],today);
  assert.equal(r.holds[0].reason,'not_due_yet');
  assert.equal(r.queue[0].action,'due_today');
  assert.equal(r.summary.dueNext7Amount,100);
});
test('handles leap day and timezone-independent day arithmetic', () => {
  const r=buildReceivablesQueue([base({dueDate:'2028-02-29'})],'2028-03-01');
  assert.equal(r.queue[0].daysOverdue,1);
  assert.throws(()=>buildReceivablesQueue([base({dueDate:'2026-02-29'})],today),/real calendar date/);
});
test('rejects invalid amounts, dates, and duplicate invoice identifiers', () => {
  for (const amount of [0,-1,NaN,Infinity,100000000.01,1.234]) assert.throws(()=>buildReceivablesQueue([base({amount})],today));
  assert.throws(()=>buildReceivablesQueue([base({dueDate:'01/11/2026'})],today));
  assert.throws(()=>buildReceivablesQueue([base(),base({id:'a',invoiceNumber:'INV-2'})],today),/Duplicate/);
  assert.throws(()=>buildReceivablesQueue([base(),base({id:'b',invoiceNumber:'inv-1'})],today),/Duplicate/);
});
test('rejects control characters to prevent header injection in reminder drafts', () => {
  assert.throws(()=>buildFollowUpDraft(base({invoiceNumber:'INV\r\nBcc:evil@example.com'}),today),/single-line/);
  assert.throws(()=>buildFollowUpDraft(base({client:'Client\nOther'}),today),/single-line/);
});
test('produces editable reminder text with exact amount and no send action', () => {
  const r=buildFollowUpDraft(base({amount:12.5}),today);
  assert.match(r.subject,/INV-1/); assert.match(r.body,/USD 12\.50/);
  assert.match(r.body,/was due on 2026-10-31/);assert.equal(r.sendAutomatically,false);
  assert.throws(()=>buildFollowUpDraft(base({status:'paid'}),today),/Paid invoices/);
});
test('does not mutate original input or trigger network calls', () => {
  const input=Object.freeze([Object.freeze(base())]);
  const r=buildReceivablesQueue(input,today);
  assert.equal(r.queue.length,1);
  assert.equal(input[0].amount,100);
});
test('enforces invoice and option limits', () => {
  assert.throws(()=>buildReceivablesQueue(Array.from({length:501},(_,i)=>base({id:String(i),invoiceNumber:String(i)})),today),/500/);
  assert.throws(()=>buildReceivablesQueue([base()],today,{lookaheadDays:31}),/lookahead/);
  assert.throws(()=>buildReceivablesQueue([base()],today,{minimumFollowUpGapDays:-1}),/interval/);
});
