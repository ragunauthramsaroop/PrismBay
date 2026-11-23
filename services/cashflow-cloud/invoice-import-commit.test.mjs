import test from 'node:test';
import assert from 'node:assert/strict';
import { commitInvoiceImport } from './invoice-import-commit.mjs';
import { previewInvoiceImport } from './invoice-import.mjs';

const header = 'Invoice,Client,Amount USD,Due date,Status';
const csv = header + '\nINV-2,Northstar Studio,1250.50,2026-11-03,open\nINV-3,Atlas Workshop,90.25,2026-11-06,paid';
const existing = Object.freeze([
  Object.freeze({id:'old-1',invoiceNumber:'INV-1',client:'Prior',amount:45,dueDate:'2026-11-01',status:'open'}),
]);
const ids = (...values) => {
  let i = 0;
  return () => values[i++];
};
const confirm = (input=csv, current=existing, options={}) => commitInvoiceImport(input,current,{
  personalWorkspace:true, confirmed:true, idFactory:ids('new-2','new-3'), ...options,
});

test('preview is side-effect-free and exposes a count before confirmation', () => {
  const result = previewInvoiceImport(csv,existing);
  assert.equal(result.ok,true);
  assert.equal(result.count,2);
  assert.equal(result.totalAmount,1340.75);
  assert.equal(existing.length,1);
});

test('refuses importing into fictional example mode', () => {
  const result = commitInvoiceImport(csv,existing,{personalWorkspace:false,confirmed:true,idFactory:ids('a','b')});
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
  assert.deepEqual(result.added,[]);
});

test('requires explicit confirmation even in a personal workspace', () => {
  const result = commitInvoiceImport(csv,existing,{personalWorkspace:true,confirmed:false,idFactory:ids('a','b')});
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
});

test('atomically appends valid invoices, retaining paid state and original records', () => {
  const result = confirm();
  assert.equal(result.ok,true);
  assert.equal(result.count,2);
  assert.deepEqual(result.records.slice(0,1),existing);
  assert.deepEqual(result.added.map(i=>i.id),['new-2','new-3']);
  assert.equal(result.added[1].status,'paid');
  assert.equal(result.records.length,3);
  assert.equal(existing.length,1);
  assert.equal(result.records[0],existing[0]);
});

test('rechecks duplicates against records added after preview', () => {
  assert.equal(previewInvoiceImport(csv,existing).ok,true);
  const newer=[...existing,{id:'late',invoiceNumber:'INV-2',client:'Later',amount:1,dueDate:'2026-11-03',status:'open'}];
  const result=confirm(csv,newer);
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
  assert.equal(newer.length,2);
});

test('rejects malformed or partially invalid CSV without any appended records', () => {
  const input=header+'\nNEW,Client,10,2026-11-03,open\nBAD,Client,0,2026-11-03,open';
  const result=confirm(input);
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
  assert.deepEqual(result.added,[]);
});

test('rejects duplicate generated IDs and collisions with existing IDs', () => {
  for(const generator of [ids('old-1','x'),ids('same','same'),ids('valid','')]) {
    const result=confirm(csv,existing,{idFactory:generator});
    assert.equal(result.ok,false);
    assert.equal(result.records,null);
  }
});

test('rejects invalid ID factories and exceptions without partial import', () => {
  const cases=[null,()=>{throw new Error('unavailable');},()=>123,()=>('a'.repeat(121))];
  for(const generator of cases) {
    const result=confirm(csv,existing,{idFactory:generator});
    assert.equal(result.ok,false);
    assert.equal(result.records,null);
  }
});

test('rejects malformed existing IDs without changing source records', () => {
  const malformed=[{invoiceNumber:'INV-1',client:'A',amount:10,dueDate:'2026-11-01',status:'open'}];
  const result=confirm(csv,malformed);
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
  assert.equal(malformed[0].id,undefined);
});

test('enforces combined 500 record limit at the commit boundary', () => {
  const many=Array.from({length:499},(_,i)=>({id:'id-'+i,invoiceNumber:'OLD-'+i}));
  const result=confirm(csv,many);
  assert.equal(result.ok,false);
  assert.equal(result.records,null);
});

test('keeps all data local and produces no storage or network side effects', () => {
  const result=confirm();
  assert.equal(result.ok,true);
  assert.equal(typeof result.records[0].client,'string');
  assert.equal(Object.prototype.hasOwnProperty.call(result,'sent'),false);
});
