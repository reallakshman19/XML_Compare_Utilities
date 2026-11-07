import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proveInputXmlSameRunCoincidence as prove,
  INPUT_XML_B3_CODES as C} from '../uxml/UxmlInputXmlSameRunCoincidence.js';
import {bytes,sha,element,model,coincident,separated,crossRun,
  inconsistentLoop,accumulatedResidual}
  from './uxml-edit-ops-b3-fixtures.mjs';

const check=(text,sourceNode,canonicalNode,extra={})=>prove({
  originalBytes:bytes(text),fileSha256:sha(text),sourceNode,canonicalNode,...extra,
});
test('B3 proof: original delta-only run proves 10 and 40 coincident',async()=>{
  const src=coincident(),input=bytes(src),before=Buffer.from(input);
  const r=await check(src,40,10);
  assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
  assert.equal(r.distanceMm,0);
  assert.equal(r.pathResidualMm,0);
  assert.equal(r.sourceSha256,sha(src));
  assert.equal(r.runId,'RUN-0000');
  assert.equal(r.authority,'ORIGINAL_INPUTXML_DELTA_SAME_RUN_READ_ONLY');
  assert.equal(r.sourceWitnesses.length,2);
  assert.equal(r.canonicalWitnesses.length,2);
  assert(r.sourceWitnesses.every(w=>w.recordKey&&w.endpoint&&w.frame));
  assert.deepEqual(input,before);
  assert.equal('bytes' in r,false);
  assert.equal('ledger' in r,false);
});
test('B3 public GRE original 500 -> 510 is NOT_COINCIDENT',async()=>{
  const input=readFileSync(new URL('../docs/GREInputxml.xml',import.meta.url));
  const src=input.toString('utf8');
  const r=await prove({originalBytes:input,fileSha256:sha(src),
    sourceNode:500,canonicalNode:510});
  assert.equal(r.status,'NOT_COINCIDENT',JSON.stringify(r));
  assert(Math.abs(r.distanceMm-224.9999854134436)<1e-5,r.distanceMm);
  assert.equal(r.pathResidualMm,0);
});
test('B3 forged side coordinate cannot authorize noncoincident source nodes',async()=>{
  const src=separated();
  const r=await check(src,40,10,{
    sideFile:{fileSha256:sha(src),coordinates:[
      {node:40,x:0,y:0,z:0},{node:10,x:0,y:0,z:0},
    ]},
  });
  assert.equal(r.status,'NOT_COINCIDENT',JSON.stringify(r));
  assert(r.distanceMm>0.001);
});
test('B3 cross-run zero-seeded coincidence is explicitly refused',async()=>{
  const r=await check(crossRun(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.CROSS_RUN);
});
test('B3 absent node refuses',async()=>{
  const r=await check(coincident(),999,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.ABSENT);
});
test('B3 loop closure 0.002 mm conflicts with all-path consistency',async()=>{
  const r=await check(inconsistentLoop(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.LOOP);
});
test('B3 two sub-tolerance loop residuals accumulate beyond 0.001',async()=>{
  const r=await check(accumulatedResidual(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.LOOP);
  assert(r.pathResidualMm>0.001);
});
test('B3 missing DELTA refuses with named code',async()=>{
  const text=model([element(10,20,'100').replace(' DELTA_Z="-1.010100"','')]);
  const r=await check(text,10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_MISSING);
});
test('B3 nonfinite DELTA refuses with named code',async()=>{
  const r=await check(model([element(10,20,'1e999')]),10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_NONFINITE);
});
test('B3 invalid numeric DELTA refuses',async()=>{
  const r=await check(model([element(10,20,'NaN')]),10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_INVALID);
});
test('B3 wrong SHA refuses before geometry',async()=>{
  const src=coincident();
  const r=await check(src,40,10,{fileSha256:'0'.repeat(64)});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.SHA_MISMATCH);
});
test('B3 missing SHA refuses',async()=>{
  const src=coincident();
  const r=await check(src,40,10,{fileSha256:''});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.SHA_REQUIRED);
});
test('B3 valid UTF-8 with BOM remains byte identical',async()=>{
  const src='\uFEFF'+coincident();
  const r=await check(src,'40.000000','1e1');
  assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
});
test('B3 malformed UTF-8 refuses',async()=>{
  const r=await prove({originalBytes:Uint8Array.of(0x3c,0xff,0x3e),
    fileSha256:'0'.repeat(64),sourceNode:40,canonicalNode:10});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.BYTES);
});
test('B3 distinct input node identities required',async()=>{
  const r=await check(coincident(),'10.0','1e1');
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DISTINCT);
});
test('B3 boundary 0.0005 is coincident; 0.002 is not',async()=>{
  const near=model([element(10,20,'100'),element(20,40,'-99.9995')]);
  const a=await check(near,40,10),b=await check(separated(),40,10);
  assert.equal(a.status,'PROVEN_COINCIDENT');
  assert(a.maxWitnessDistanceMm<=0.001);
  assert.equal(b.status,'NOT_COINCIDENT');
  assert(b.distanceMm>0.001);
});
