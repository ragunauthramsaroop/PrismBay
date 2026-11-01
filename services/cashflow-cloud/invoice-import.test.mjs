import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRows, previewInvoiceImport } from './invoice-import.mjs';

const head = 'Invoice,Client,Amount USD,Due date,Status';
const valid = head + '\r\nINV-1,Northstar Studio,1250.50,2026-11-03,open\r\nINV-2,Atlas Workshop,90.25,2026-11-06,paid\r\n';

test('imports the five columns exported by the live pilot', () => {
  const result = previewInvoiceImport(valid);
  assert.equal(result.ok, true);
  assert.equal(result.count, 2);
  assert.equal(result.totalAmount, 1340.75);
  assert.deepEqual(result.records[0], { invoiceNumber: 'INV-1', client: 'Northstar Studio', amount: 1250.5, dueDate: '2026-11-03', status: 'open' });
});
test('supports BOM, CRLF, escaped quotes and quoted comma amounts', () => {
  const csv = '\uFEFF' + head + '\r\n"INV-3","ACME, ""LLC""","$1,234.56",2026-12-01,OPEN\r\n';
  const result = previewInvoiceImport(csv);
  assert.equal(result.ok, true);
  assert.equal(result.records[0].client, 'ACME, "LLC"');
  assert.equal(result.records[0].amount, 1234.56);
});
test('recognizes common header synonyms and different header order', () => {
  const result = previewInvoiceImport('Payment Status,Customer,Due,Invoice No,Invoice Amount\npaid,Client A,2026-12-12,AA-1,99.99');
  assert.equal(result.ok, true);
  assert.equal(result.records[0].invoiceNumber, 'AA-1');
});
test('rejects duplicate invoice numbers, including existing records', () => {
  assert.equal(previewInvoiceImport(valid, [{ invoiceNumber: 'inv-1' }]).ok, false);
  assert.equal(previewInvoiceImport(head + '\nINV-1,A,1,2026-11-03,open\ninv-1,B,1,2026-11-03,paid').ok, false);
});
test('rejects unsafe formula-leading fields and control characters', () => {
  assert.equal(previewInvoiceImport(head + '\n=HYPERLINK(1),Client,1,2026-11-03,open').ok, false);
  assert.equal(previewInvoiceImport(head + '\nINV-3,+CMD,1,2026-11-03,open').ok, false);
  assert.equal(previewInvoiceImport(head + '\nINV-3,"Client\nOther",1,2026-11-03,open').ok, false);
});
test('rejects impossible dates and accepts leap days', () => {
  assert.equal(previewInvoiceImport(head + '\nA,Client,1,2026-02-29,open').ok, false);
  assert.equal(previewInvoiceImport(head + '\nA,Client,1,2028-02-29,open').ok, true);
});
test('rejects negative, zero, excess precision and excessive amounts', () => {
  for (const amount of ['-1','0','1.234','100000000.01','1e3']) {
    assert.equal(previewInvoiceImport(head + '\nA,Client,' + amount + ',2026-11-03,open').ok, false, amount);
  }
});
test('rejects malformed CSV, missing headers, extra columns and duplicate headers', () => {
  assert.equal(previewInvoiceImport(head + '\n"A,Client,1,2026-11-03,open').ok, false);
  assert.equal(previewInvoiceImport('Client,Amount\nA,1').ok, false);
  assert.equal(previewInvoiceImport(head + '\nA,Client,1,2026-11-03,open,extra').ok, false);
  assert.equal(previewInvoiceImport(head + ',Invoice number\nA,Client,1,2026-11-03,open,A').ok, false);
});
test('enforces the combined 500-invoice limit and 512 KB input cap', () => {
  assert.equal(previewInvoiceImport(valid, Array.from({length:499}, (_,i)=>({invoiceNumber:'EXIST-'+i}))).ok, false);
  assert.equal(previewInvoiceImport('x'.repeat(512*1024+1)).ok, false);
});
test('does not mutate existing invoices or import a partial batch', () => {
  const existing = [{ invoiceNumber: 'OLD' }];
  const input = head + '\nNEW,Client,10,2026-11-03,open\nBAD,Client,0,2026-11-03,open';
  const result = previewInvoiceImport(input, existing);
  assert.equal(result.ok, false);
  assert.deepEqual(result.records, []);
  assert.deepEqual(existing, [{ invoiceNumber: 'OLD' }]);
});
test('parses quoted newlines and reports original line numbers', () => {
  const input = head + '\n"INV\n2",Client,5,2026-11-03,open';
  const rows = parseCsvRows(input);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].line, 2);
  const result = previewInvoiceImport(input);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /Line 2/);
});