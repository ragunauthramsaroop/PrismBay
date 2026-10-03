import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLedger } from './ledger.mjs';
import { createCommercialSignalRecorder, signalTokenAuthorized } from './commercial-signals.mjs';

test('records only aggregate commercial failure fields and never stores customer data', async t=>{
 const dir=await mkdtemp(join(tmpdir(),'signal-test-'));
 const ledger=await openLedger(dir);
 t.after(async()=>{await ledger.close();await rm(dir,{recursive:true,force:true});});
 let now=1_800_000_000_000;
 const recorder=createCommercialSignalRecorder({ledger,now:()=>now,minimumPersistIntervalMs:60_000});
 assert.equal(await recorder.record({stage:'quote',sku:'crevice',code:'verified_origin_stock_unavailable',zip:'10001',email:'x@example.com'}),true);
 const summary=recorder.summary();
 assert.equal(summary.eventCount,1);
 assert.deepEqual(Object.keys(summary.events[0]).sort(),['count','error','lastSeenAt','sku','stage']);
 const disk=JSON.stringify(ledger.snapshot());
 assert.equal(disk.includes('10001'),false);
 assert.equal(disk.includes('example.com'),false);
});

test('rate limits persistent writes per signal key and resumes next minute', async t=>{
 const dir=await mkdtemp(join(tmpdir(),'signal-rate-test-'));
 const ledger=await openLedger(dir);
 t.after(async()=>{await ledger.close();await rm(dir,{recursive:true,force:true});});
 let now=1_800_000_000_000;
 const recorder=createCommercialSignalRecorder({ledger,now:()=>now,minimumPersistIntervalMs:60_000});
 assert.equal(await recorder.record({stage:'checkout',sku:'crevice',code:'quote_expired'}),true);
 assert.equal(await recorder.record({stage:'checkout',sku:'crevice',code:'quote_expired'}),false);
 now+=60_001;
 assert.equal(await recorder.record({stage:'checkout',sku:'crevice',code:'quote_expired'}),true);
 assert.equal(recorder.summary().events[0].count,2);
});

test('signal endpoint token helper fails closed',()=>{
 const secret='s'.repeat(40);
 assert.equal(signalTokenAuthorized(secret,secret),true);
 assert.equal(signalTokenAuthorized(secret,'wrong'),false);
 assert.equal(signalTokenAuthorized('short','short'),false);
});
