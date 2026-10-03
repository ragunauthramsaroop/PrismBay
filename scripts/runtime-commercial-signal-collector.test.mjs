import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRuntimeSignals, normalizeSignalSummary } from './runtime-commercial-signal-collector.mjs';

test('normalizes only bounded aggregate commercial failure evidence',()=>{
 const out=normalizeSignalSummary({events:[{stage:'quote',sku:'crevice',error:'verified_origin_stock_unavailable',count:3,lastSeenAt:'2026-10-03T17:00:00Z',zip:'10001',email:'x@example.com'}]});
 assert.equal(out.eventCount,3);
 assert.deepEqual(Object.keys(out.events[0]).sort(),['count','error','lastSeenAt','sku','stage']);
 assert.equal(JSON.stringify(out).includes('10001'),false);
 assert.equal(JSON.stringify(out).includes('example.com'),false);
});

test('fails closed when runtime collector is not securely configured',async()=>{
 const out=await collectRuntimeSignals({url:'http://insecure.example/signals',token:'x'.repeat(40),fetchImpl:async()=>{throw new Error('should not fetch');}});
 assert.equal(out.configured,false);
 assert.equal(out.evidence.eventCount,0);
 const short=await collectRuntimeSignals({url:'https://example.com/signals',token:'short',fetchImpl:async()=>{throw new Error('should not fetch');}});
 assert.equal(short.configured,false);
});

test('accepts only the privacy-safe runtime schema and authenticated header',async()=>{
 let seenHeader='';
 const token='t'.repeat(40);
 const out=await collectRuntimeSignals({url:'https://example.com/commercial-signals',token,fetchImpl:async(_url,options)=>{seenHeader=options.headers['x-commercial-signal-token'];return{ok:true,status:200,json:async()=>({privacy:'aggregate_no_zip_email_ip_token_or_payment_data',eventType:'commercial_failure_summary',events:[{stage:'checkout',sku:'crevice',error:'quote_expired',count:2,lastSeenAt:'2026-10-03T17:10:00Z'}]})};}});
 assert.equal(seenHeader,token);
 assert.equal(out.configured,true);
 assert.equal(out.evidence.events[0].error,'quote_expired');
});

test('rejects any upstream schema that does not declare the privacy contract',async()=>{
 await assert.rejects(collectRuntimeSignals({url:'https://example.com/signals',token:'t'.repeat(40),fetchImpl:async()=>({ok:true,status:200,json:async()=>({events:[]})})}),/schema_rejected/);
});
