import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import { methodCSvgScene,escapeMethodCXml } from '../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import { methodCEvidence,methodCCsvExport,methodCJsonExport,methodCSvgExport } from '../tabs/cii-workspace/cii-workspace-method-c-exports.js';
const shas={S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  T:'abfa3ffc9281fe75d4170b885d554cb1f120dadedae7c7ab609548b63cc060'.replace('885d','885d')};
const actualTarget='abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';
async function context(){
 const [s,t]=await Promise.all(['S1','T'].map(async member=>buildOriginalGraphFromBytes({
  bytes:await readFile(new URL('../Benchmark/'+member+'.CII',import.meta.url)),
  member,cryptoRef:webcrypto,expectedSha256:member==='S1'?shas.S1:actualTarget
 })));
 const transform=registerMethodC(s,t,[{source:'3910',target:'875',sourceSha:s.sha256,targetSha:t.sha256,role:'experimental'}]);
 const candidates=findMethodCCandidates(s,t,transform),projection='XZ';
 const scene=methodCSvgScene({source:s,target:t,transform,candidates,projection,selectedSource:'4060',labels:true});
 return {source:s,target:t,transform,candidates,projection,scene};
}
test('original S1/T XZ SVG includes original element and selectable NODE markers with metric axes',async()=>{
 const c=await context(),svg=c.scene.svg;
 assert.match(svg,/data-projection="XZ" data-metric="true"/);
 assert.match(svg,/data-layer="source-elements"/);
 assert.match(svg,/data-layer="target-elements"/);
 assert.match(svg,/data-kind="SOURCE" data-node="4060"/);
 assert.match(svg,/data-kind="TARGET" data-node="905"/);
 assert.match(svg,/data-layer="segment-projection"/);
 assert.equal(c.scene.sourceNodes,57);
 assert.equal(c.scene.targetNodes,767);
 assert.ok(c.scene.sourceElements>0);
 assert.ok(c.scene.targetElements>0);
 assert.equal(c.scene.metric,true);
});
test('every projection makes a distinct real geometry view; ISO is explicitly non-metric',async()=>{
 const c=await context();
 const scenes=['XZ','YZ','XY','ISO'].map(projection=>methodCSvgScene({...c,projection}));
 assert.ok(scenes.every(x=>x.svg.includes('data-projection')));
 assert.equal(new Set(scenes.map(x=>x.svg)).size,4);
 assert.equal(scenes.filter(x=>x.metric).length,3);
 assert.equal(scenes[3].metric,false);
 assert.match(scenes[3].svg,/data-metric="false"/);
 assert.throws(()=>methodCSvgScene({...c,projection:'BOGUS'}),/UNSUPPORTED_METHOD_C_PROJECTION/);
});
test('CSV JSON SVG preserve original SHA, anchor, 4060 projection and real signed numeric residuals',async()=>{
 const c=await context(),json=methodCJsonExport(c),csv=methodCCsvExport(c),svg=methodCSvgExport(c);
 const model=JSON.parse(json),seg=model.rows.find(r=>r.sourceNode==='4060');
 assert.equal(model.source.sha256,c.source.sha256);
 assert.equal(model.target.sha256,c.target.sha256);
 assert.equal(model.registration.anchors[0].source,'3910');
 assert.equal(model.rows.length,57);
 assert.equal(seg.segmentOnly.elementIndex,178);
 assert.equal(seg.segmentOnly.fraction,0.76175);
 assert.equal(seg.segmentOnly.distanceMm,0);
 assert.equal(seg.candidateTarget,null);
 assert.equal(seg.physicalIdentityQualified,false);
 assert.ok(model.rows.some(r=>r.sourceNode==='4970'&&Math.abs(r.deltaZ+300.57)<.01));
 assert.match(csv,/segmentOnly/);
 assert.match(csv,/MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT/);
 assert.match(csv,/4060/);
 assert.match(svg,/^<\?xml version="1.0"/);
 assert.ok(svg.includes('data-node="4060"'));
 assert.equal(model.qualifiedPhysicalIdentityCount,0);
 assert.equal(model.writerEligible,false);
});
test('RED: stale file/hash/tolerance/projection snapshot refuses every export',async()=>{
 const c=await context();
 assert.throws(()=>methodCJsonExport({...c,source:{...c.source,sha256:'0'.repeat(64)}}),
   /METHOD_C_EXPORT_SHA_REVISION_MISMATCH/);
 const changed={...c,candidates:{...c.candidates,tolerance:{x:99,y:100,z:100}}};
 assert.throws(()=>methodCCsvExport(changed),/METHOD_C_EXPORT_STALE_SNAPSHOT/);
 assert.throws(()=>methodCSvgExport({...c,projection:'YZ'}),/METHOD_C_EXPORT_STALE_PROJECTION/);
});
test('RED: SVG and table labels cannot inject DOM, event handlers or executable SVG',async()=>{
 const c=await context(),name='evil <script>alert("x")</script> & <image onerror="1">';
 const tamperedNode={...c.source.nodes.find(n=>n.id==='4060'),nodeName:name};
 const changedSource={...c.source,nodes:c.source.nodes.map(n=>n.id==='4060'?tamperedNode:n)};
 const view=methodCSvgScene({...c,source:changedSource});
 assert.ok(view.svg.includes('&lt;script&gt;'));
 assert.ok(!/<script\b/i.test(view.svg));
 assert.ok(!/\sonerror\s*=\s*[\"']/i.test(view.svg)); // escaped label can contain onerror=&quot;, never a raw event attribute
 assert.equal(escapeMethodCXml(name).includes('&lt;image'),true);
 assert.match(methodCSvgExport({...c,scene:view}),/evil &lt;script&gt;/);
 const bad={...c,scene:{...c.scene,svg:'<svg onload="alert(1)"></svg>'}};
 assert.throws(()=>methodCSvgExport(bad),/METHOD_C_SVG_EXPORT_SANITIZATION_FAILED/);
});
