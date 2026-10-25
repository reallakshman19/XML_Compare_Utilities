import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import { methodCSvgScene } from '../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import { methodCEvidence, methodCJsonExport } from '../tabs/cii-workspace/cii-workspace-method-c-exports.js';
import { sharedViewBox } from '../tabs/cii-workspace/cii-fnr-vnext/geometry/scene.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b';
const targetHash = 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';
const read = path => readFileSync(join(dir,path));
let run;
async function originalEvidence() {
  if (run) return run;
  const s = read('Benchmark/S1.CII'), t = read('Benchmark/T.CII');
  assert.equal(hash(s),sourceHash); assert.equal(hash(t),targetHash);
  const [source,target] = await Promise.all([[s,'S1.CII'],[t,'T.CII']].map(([bytes,member]) =>
    buildOriginalGraphFromBytes({bytes,member,cryptoRef:webcrypto})));
  const transform=registerMethodC(source,target,[{source:'3910',target:'875'}]);
  const candidates=findMethodCCandidates(source,target,transform,{x:100,y:100,z:100});
  const scene=methodCSvgScene({source,target,transform,candidates,projection:'XZ'});
  return run={source,target,transform,candidates,scene,s,t};
}
test('original S1/T identity and G1 physical NODE vs original ELEMENT-only exception',async()=>{
  const {source,target,transform,candidates,s,t}=await originalEvidence();
  assert.equal(transform.status,'TRANSLATION_ONLY_EXPLORATION / ORIENTATION_UNDETERMINED');
  assert.equal(transform.physicalNodeCorrespondenceQualified,false);
  assert.equal(candidates.nearSourceCount,41);assert.equal(candidates.rows.length,57);
  const n4060=candidates.rows.find(r=>r.source==='4060');
  assert.equal(n4060.alternatives.length,0);
  assert.equal(n4060.target,null);
  assert.deepEqual(n4060.segment.between,['900','905']);
  assert.equal(n4060.segment.t,0.76175);
  const n4970=candidates.rows.find(r=>r.source==='4970');
  assert.equal(n4970.nearest.target,'1065');
  assert(Math.abs(n4970.nearest.residual[2]+300.57)<1e-6);
  assert.equal(hash(s),sourceHash);assert.equal(hash(t),targetHash);
  assert.equal(source.byteAuthority,'ORIGINAL_BYTES');assert.equal(target.byteAuthority,'ORIGINAL_BYTES');
});
test('original byte corruption cannot masquerade as the frozen SOURCE',async()=>{
  const bytes=new Uint8Array(read('Benchmark/S1.CII'));bytes[70]^=1;
  await assert.rejects(buildOriginalGraphFromBytes({bytes,member:'S1.CII',expectedSha256:sourceHash,
    cryptoRef:webcrypto}),/ORIGINAL_SHA256_MISMATCH/);
});
test('native read-only evidence exports retain full alternatives, signed discrepancy, original witnesses',async()=>{
  const {source,target,transform,candidates,scene}=await originalEvidence();
  const ctx={source,target,transform,candidates,scene,projection:'XZ'};
  const exported=JSON.parse(methodCJsonExport(ctx));
  assert.equal(exported.nearSourceCount,41);
  assert.equal(exported.rows.length,57);
  assert.equal(exported.writerEligible,false);
  assert.equal(exported.qualifiedPhysicalIdentityCount,0);
  const p=exported.rows.find(x=>x.sourceNode==='4060');
  assert.equal(p.candidateTarget,null);
  assert.equal(p.segmentOnly.elementIndex,178);
  assert.deepEqual(p.segmentOnly.endpoints,['900','905']);
  assert(exported.rows.every(x=>Array.isArray(x.competingTargets)));
  assert.equal(exported.rows.filter(x=>x.competingTargets.length>0).length,41);
  assert.throws(()=>methodCEvidence({...ctx,projection:'ISO'}),/METHOD_C_EXPORT_STALE_PROJECTION/);
});
test('common metric view transforms do not distort SOURCE relative to TARGET',async()=>{
  const {scene}=await originalEvidence();
  const b=scene.viewBox;
  const base=[b.x,b.y,b.width,b.height];
  const zoom=sharedViewBox(base,2,12,-4);
  assert.equal(zoom[2],base[2]/2);
  assert.equal(zoom[3],base[3]/2);
  assert.deepEqual(sharedViewBox(base,1),base);
  assert.throws(()=>sharedViewBox(base,0),/INVALID_SHARED_METRIC_VIEW/);
  assert.match(scene.svg,/data-metric="true"/);
});
test('G1 served/authored mirrors equal and Geometry never exposes Normal writer region',()=>{
  for(const name of ['geometry/ui.js','geometry/scene.js','geometry/style.css','ui/app.js']) {
    const authored=read('tabs/cii-workspace/cii-fnr-vnext/'+name);
    assert.deepEqual(authored,read('docs/tabs/cii-workspace/cii-fnr-vnext/'+name));
  }
  const html=read('docs/cii-fnr-vnext.html').toString();
  const app=read('tabs/cii-workspace/cii-fnr-vnext/ui/app.js').toString();
  const ui=read('tabs/cii-workspace/cii-fnr-vnext/geometry/ui.js').toString();
  assert.match(html,/data-geometry-area hidden/);
  assert.match(app,/geometry\.setFiles\(source, target\)/);
  assert.match(app,/section\.hidden = active === 'GEOMETRY' && !section\.classList\.contains\('intake'\)/);
  assert.match(ui,/writerEligible|Writer2|no Writer action/i);
  assert.doesNotMatch(ui,/validatePostimage|planNormal|applyNewCopy|target1Hash/);
});
