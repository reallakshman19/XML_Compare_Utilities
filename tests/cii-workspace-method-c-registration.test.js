import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC, registeredMethodCPoint } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';

const sourceHash='9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b';
const targetHash='abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';
const approx=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,String(a)+' != '+String(b));
async function originals(){
 const s=await readFile(new URL('../Benchmark/S1.CII',import.meta.url));
 const t=await readFile(new URL('../Benchmark/T.CII',import.meta.url));
 return Promise.all([
  buildOriginalGraphFromBytes({bytes:s,member:'S1',expectedSha256:sourceHash,cryptoRef:webcrypto}),
  buildOriginalGraphFromBytes({bytes:t,member:'T',expectedSha256:targetHash,cryptoRef:webcrypto}),
 ]);
}
function graph(member,values,sha='1'.repeat(64)){
 const nodes=values.map(([id,xyz,component=0])=>({id:String(id),xyz,component}));
 return {member,sha256:sha,nodeIndex:new Map(nodes.map(n=>[n.id,n]))};
}
test('original S1:3910 to T:875 explicitly unresolved rotation, translation aligned',async()=>{
 const [s,t]=await originals();
 const result=registerMethodC(s,t,[{source:'3910',target:'875',member:'S1',sourceSha:sourceHash,targetSha:targetHash,role:'owner-directed-experiment'}]);
 assert.match(result.status,/ORIENTATION_UNDETERMINED/);
 assert.equal(result.qualified,false);
 assert.equal(result.scale,1);
 assert.equal(result.anchors.length,1);
 const p=registeredMethodCPoint(result,s.nodeIndex.get('3910').xyz),q=t.nodeIndex.get('875').xyz;
 p.forEach((value,i)=>approx(value,q[i]));
 assert.match(result.warning,/NO_WRITER_AUTHORITY/);
});
test('second original illustrative anchor cannot be exactly fitted by a rigid registration',async()=>{
 const [s,t]=await originals();
 const a=[['3910','875'],['5110','1095']].map(([source,target])=>({
   source,target,role:'illustrative-only',sourceSha:sourceHash,targetSha:targetHash,
 }));
 const result=registerMethodC(s,t,a,{registrationToleranceMm:1});
 assert.equal(result.status,'INCOMPATIBLE_EXACT_TWO_ANCHORS');
 approx(result.separationMismatchMm,300.0818987353414,0.001);
 assert.ok(result.maxResidualMm>100);
 assert.equal(result.qualified,false);
 assert.equal(result.scale,1);
});
test('three independent noncollinear anchor axes fit exact proper rigid rotation',()=>{
 const original=[[1,[0,0,0]],[2,[200,0,0]],[3,[0,100,0]],[4,[0,0,120]]];
 const rotated=original.map(([id,[x,y,z]])=>[id,[10-y,20+x,30+z]]);
 const s=graph('S',original),t=graph('T',rotated);
 const pairs=original.map(([id])=>({source:id,target:id,sourceSha:s.sha256,targetSha:t.sha256,role:'independently-accepted'}));
 const result=registerMethodC(s,t,pairs);
 assert.equal(result.status,'RIGID_3D_NUMERIC_FIT_UNTRUSTED_ANCHORS');
 assert.equal(result.qualified,false);
 assert.equal(result.identified,false);
 assert.equal(result.numericFitAcceptable,true);
 assert.equal(result.ownerAnchorAuthenticated,false);
 assert.equal(result.scale,1);
 approx(result.determinant,1);
 assert.ok(result.rmsResidualMm<1e-6);
 assert.equal(result.leaveOneOut.status,'DIAGNOSTIC_ONLY_NOT_AUTO_EXCLUSION');
});
test('red: altered revision, repeated target and disconnected anchors blocked',()=>{
 const s=graph('S',[[1,[0,0,0],0],[2,[100,0,0],1]]);
 const t=graph('T',[[5,[0,0,0],0],[6,[100,0,0],1]]);
 assert.throws(()=>registerMethodC(s,t,[{source:1,target:5,sourceSha:'wrong'}]),/ANCHOR_ORIGINAL_SHA_MISMATCH/);
 assert.throws(()=>registerMethodC(s,t,[{source:1,target:5},{source:2,target:5}]),/DUPLICATE_ANCHOR_CUSTODY/);
 assert.throws(()=>registerMethodC(s,t,[{source:1,target:5},{source:2,target:6}]),/ANCHORS_CROSS_DISCONNECTED_COMPONENTS/);
});
test('red: conflicting trusted noncollinear witness reports residual rather than forced agreement',()=>{
 const s=graph('S',[[1,[0,0,0]],[2,[100,0,0]],[3,[0,100,0]],[4,[0,0,100]]]);
 const t=graph('T',[[5,[10,20,30]],[6,[110,20,30]],[7,[10,120,30]],[8,[10,20,440]]]);
 const pairs=[[1,5],[2,6],[3,7],[4,8]].map(([source,target])=>({source,target,role:'independently-accepted'}));
 const result=registerMethodC(s,t,pairs,{registrationToleranceMm:1});
 assert.equal(result.status,'ANCHOR_RESIDUAL_CONFLICT');
 assert.equal(result.qualified,false);
 assert.ok(result.maxResidualMm>100);
 assert.equal(result.anchors.length,4);
 assert.equal(result.leaveOneOut.rows.length,4);
 assert.ok(result.leaveOneOut.rows.some(r=>r.distanceMm>100));
});

test('compatible two-anchor axis still leaves axial twist unresolved',()=>{
 const s=graph('S',[[1,[0,0,0]],[2,[0,0,100]]]);
 const t=graph('T',[[5,[10,20,30]],[6,[10,120,30]]]);
 const tr=registerMethodC(s,t,[{source:1,target:5},{source:2,target:6}]);
 assert.match(tr.status,/TWIST_UNDETERMINED/);
 assert.equal(tr.qualified,false);
 approx(tr.maxResidualMm,0);
 assert.equal(tr.separationMismatchMm,0);
 assert.equal(tr.scale,1);
});
test('red: uniformly scaled registered anchors cannot acquire exact rigid acceptance',()=>{
 const s=graph('S',[[1,[0,0,0]],[2,[100,0,0]],[3,[0,100,0]],[4,[0,0,100]]]);
 const t=graph('T',[[5,[10,20,30]],[6,[130,20,30]],[7,[10,140,30]],[8,[10,20,150]]]);
 const anchors=[[1,5],[2,6],[3,7],[4,8]].map(([source,target])=>({source,target,role:'independently-accepted'}));
 const tr=registerMethodC(s,t,anchors,{registrationToleranceMm:1});
 assert.equal(tr.status,'ANCHOR_RESIDUAL_CONFLICT');
 assert.equal(tr.qualified,false);
 assert.equal(tr.scale,1);
 approx(tr.determinant,1);
 assert.ok(tr.maxResidualMm>5);
});
test('red: insufficient or collinear admissible anchors have no qualified transform',()=>{
 const s=graph('S',[[1,[0,0,0]],[2,[100,0,0]],[3,[200,0,0]]]);
 const t=graph('T',[[5,[1,2,3]],[6,[101,2,3]],[7,[201,2,3]]]);
 const anchors=[[1,5],[2,6],[3,7]].map(([source,target])=>({source,target,role:'independently-accepted'}));
 const tr=registerMethodC(s,t,anchors);
 assert.equal(tr.status,'DEGENERATE_NONCOLLINEAR_BASIS');
 assert.equal(tr.qualified,false);
 assert.equal(tr.rotation,undefined);
});

test('security: caller role never authenticates accurate 3D geometry; all XY/XZ/YZ bases fit',()=>{
 const planes=[[[0,0,0],[1000,0,0],[0,1200,0]],
   [[0,0,0],[1000,0,0],[0,0,1200]],
   [[0,0,0],[0,1000,0],[0,0,1200]]];
 for(const points of planes){
   const original=points.map((xyz,i)=>[i+1,xyz]);
   const shifted=original.map(([id,xyz])=>[id,xyz.map((v,j)=>v+[520,-220,1190][j])]);
   const s=graph('S',original),t=graph('T',shifted);
   const tuples=original.map(([id])=>({source:id,target:id,role:'candidate'}));
   const forged=tuples.map(row=>({...row,role:'independently-accepted',ownerProvided:true}));
   for(const anchors of [tuples,forged]){
     const fit=registerMethodC(s,t,anchors);
     assert.equal(fit.status,'RIGID_3D_NUMERIC_FIT_UNTRUSTED_ANCHORS');
     assert.equal(fit.qualified,false);
     assert.equal(fit.identified,false);
     assert.equal(fit.ownerAnchorAuthenticated,false);
     assert.equal(fit.numericFitAcceptable,true);
     assert.ok(fit.maxResidualMm<1e-7);
     assert.equal(fit.writerEligible,false);
   }
 }
});
