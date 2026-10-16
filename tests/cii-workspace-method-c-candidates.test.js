import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { buildOriginalGraphFromBytes, graphRoute } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates, findMethodCMultiSourceCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';

const sha={S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060'};
async function originals(){
  return Promise.all(['S1','T'].map(async member=>buildOriginalGraphFromBytes({
    bytes:await readFile(new URL('../Benchmark/'+member+'.CII',import.meta.url)),
    member,expectedSha256:sha[member],cryptoRef:webcrypto})));
}
function graph(member,points,hash='1'.repeat(64),edges=[],components=null){
  const nodes=points.map(([id,xyz,component=0])=>({id:String(id),xyz,component,degree:1,
    od:273,wall:20,incident:[],nodeName:''}));
  return {member,sha256:hash,nodes,edges,components:components||[nodes.map(n=>n.id)],
    nodeIndex:new Map(nodes.map(n=>[n.id,n]))};
}
const view=(sourceComponent=0,targetComponent=0)=>({anchors:[{source:'1',target:'5',role:'experimental'}],
  sourceComponent,targetComponent,rotation:[[1,0,0],[0,1,0],[0,0,1]],
  translation:[0,0,0],status:'TRANSLATION_ONLY_EXPLORATION / ORIENTATION_UNDETERMINED'});
test('Original S1/T independent XYZ: 37/45 route, 41/57 source component, zero TARGET reuse',async()=>{
  const [s,t]=await originals();
  const pose=registerMethodC(s,t,[{source:'3910',target:'875',member:'S1',
    sourceSha:sha.S1,targetSha:sha.T,role:'owner-directed-experiment'}]);
  const ledger=findMethodCCandidates(s,t,pose);
  assert.equal(ledger.rows.length,57);
  assert.equal(ledger.nearSourceCount,41);
  assert.equal(ledger.targetComponentCount,767);
  assert.equal(ledger.totalTargetComponents,5);
  assert.deepEqual(ledger.collisionTargets,[]);
  const routeIds=new Set(graphRoute(s,'3910','5110').ids);
  const routeRows=ledger.rows.filter(r=>routeIds.has(r.source));
  assert.equal(routeRows.length,45);
  assert.equal(routeRows.filter(r=>r.alternatives.length>0).length,37);
  assert.equal(new Set(routeRows.flatMap(r=>r.alternatives.map(a=>a.target))).size,37);
  assert.equal(ledger.qualifiedIdentityCount,0);
  assert.equal(ledger.rows.every(r=>!r.writerEligible&&!r.physicalNodeCorrespondenceQualified),true);
  console.log('METHOD_C_WP4_RAW_COUNTS '+JSON.stringify({sourceSha:s.sha256,targetSha:t.sha256,
    sourceNodeCount:ledger.rows.length,targetRegisteredComponent:ledger.targetComponentCount,
    fullNear:ledger.nearSourceCount,selectedNear:routeRows.filter(r=>r.alternatives.length>0).length,
    selectedTotal:routeRows.length,targetCollisions:ledger.collisionTargets,
    qualifiedIdentityCount:ledger.qualifiedIdentityCount}));
});
test('Original S1 4060 is segment-only on T 900->905 original witness, no invented TARGET NODE',async()=>{
  const [s,t]=await originals();
  const pose=registerMethodC(s,t,[{source:'3910',target:'875'}]);
  const row=findMethodCCandidates(s,t,pose).rows.find(r=>r.source==='4060');
  assert.equal(row.status,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
  assert.equal(row.alternatives.length,0);
  assert.deepEqual(row.segment.between,['900','905']);
  assert.match(row.segment.witness,/^ELEMENTS#/);
  assert.ok(Math.abs(row.segment.distance)<1e-6);
  assert.ok(Math.abs(row.segment.t-0.76175)<1e-5);
  assert.ok(row.segment.stationMm>0&&row.segment.stationMm<row.segment.lengthMm);
  assert.equal(row.segment.sourceOfCoordinates,'ORIGINAL_TARGET_ELEMENT');
  assert.equal(row.nearest.target,'905');
  console.log('METHOD_C_WP4_SEGMENT_ONLY '+JSON.stringify({source:row.source,
    witness:row.segment.witness,between:row.segment.between,fraction:row.segment.t,
    stationMm:row.segment.stationMm,segmentDistanceMm:row.segment.distance,
    nearestPhysicalNode:row.nearest.target,nearestDistanceMm:row.nearest.distance}));
  assert.ok(Math.abs(row.nearest.distance-1906)<1e-6);
});
test('Original downstream 300.57 mm Z failure and separate wall versus OD',async()=>{
  const [s,t]=await originals();
  const pose=registerMethodC(s,t,[{source:'3910',target:'875'}]);
  const ledger=findMethodCCandidates(s,t,pose),find=id=>ledger.rows.find(r=>r.source===id);
  assert.equal(find('4960').target,'1060');
  assert.ok(Math.abs(find('4960').residual[2]+0.57)<1e-4);
  assert.equal(find('4970').target,null);
  assert.ok(Math.abs(find('4970').nearest.residual[2]+300.57)<1e-4);
  assert.equal(find('5110').status,'OUTSIDE_TOLERANCE');
  const material=ledger.rows.find(r=>r.sourceWall===25.4&&r.alternatives.some(a=>a.wall===18.3&&a.od===273));
  assert.ok(material);
  assert.equal(material.sourceOd,273);
  assert.equal(material.wallDifference,7.1);
  assert.ok(material.alternatives[0].originalElements.length>0);
});
test('RED: exactly 100mm independently per axis qualifies; 99.99 threshold rejects',()=>{
  const s=graph('S',[[1,[0,0,0]]]),t=graph('T',[[5,[100,100,100]]]);
  const inside=findMethodCCandidates(s,t,view());
  assert.equal(inside.rows[0].alternatives.length,1);
  assert.ok(inside.rows[0].distance>100);
  const outside=findMethodCCandidates(s,t,view(),{x:99.99,y:100,z:100});
  assert.equal(outside.rows[0].alternatives.length,0);
  assert.notEqual(inside.snapshot,outside.snapshot);
  assert.throws(()=>findMethodCCandidates(s,t,view(),{x:-1,y:100,z:100}),/XYZ_TOLERANCE_MM_INVALID/);
});
test('RED: all alternatives preserved and singleton TARGET collision cannot be hidden',()=>{
  const s=graph('S',[[1,[0,0,0]],[2,[80,0,0]]]);
  const t=graph('T',[[5,[80,0,0]],[6,[-30,0,0]]]);
  const ledger=findMethodCCandidates(s,t,view(),{x:80,y:5,z:5});
  assert.equal(ledger.rows[0].alternatives.length,2);
  assert.equal(ledger.rows[0].status,'AMBIGUOUS');
  assert.equal(ledger.rows[1].alternatives.length,1);
  assert.equal(ledger.rows[1].status,'TARGET_COLLISION');
  assert.deepEqual(ledger.collisionTargets,['5']);
  assert.equal(ledger.rows.every(r=>r.writerEligible===false),true);
});
test('RED: both SOURCE members using identical numeric NODE ID contest one TARGET',()=>{
  const a=graph('S1',[[1,[0,0,0]]]),b=graph('S2',[[1,[0,0,0]]],'2'.repeat(64));
  const t=graph('T',[[5,[0,0,0]]]);
  const result=findMethodCMultiSourceCandidates([a,b],t,{S1:view(),S2:view()});
  assert.equal(result.rows.length,2);
  assert.deepEqual(result.globallyReusedTargets,['5']);
  assert.equal(result.rows.every(r=>!r.writerEligible),true);
  assert.notEqual(result.rows[0].sourceSha,result.rows[1].sourceSha);
});
test('RED: disconnected TARGET and unregistered SOURCE components have zero candidates',()=>{
  const s=graph('S',[[1,[0,0,0]],[2,[0,0,0],1]],'1'.repeat(64),[],[['1'],['2']]);
  const t=graph('T',[[5,[0,0,0]],[6,[0,0,0],1]],'3'.repeat(64),[],[['5'],['6']]);
  const ledger=findMethodCCandidates(s,t,view());
  assert.equal(ledger.rows.length,1);
  assert.equal(ledger.targetComponentCount,1);
  assert.equal(ledger.rows[0].alternatives.length,1);
  const mult=findMethodCMultiSourceCandidates([s,graph('S2',[[1,[0,0,0]]])],t,{S:view()});
  assert.equal(mult.members[1].status,'UNREGISTERED_COMPONENT');
  assert.equal(mult.rows.length,1);
});
test('RED: no registered anchor, invalid component and nonfinite tolerance fail closed',()=>{
  const s=graph('S',[[1,[0,0,0]]]),t=graph('T',[[5,[0,0,0]]]);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),anchors:[]}),/REGISTRATION_ANCHOR_REQUIRED/);
  assert.throws(()=>findMethodCCandidates(s,t,view(0,100)),/REGISTERED_COMPONENT_AND_RIGID_TRANSFORM_REQUIRED/);
  assert.throws(()=>findMethodCCandidates(s,t,view(),{x:NaN,y:100,z:100}),/XYZ_TOLERANCE_MM_INVALID/);
});

test('RED: stale registered source revision, uniform scaling and reflections never enter candidate inventory',()=>{
  const s=graph('S',[[1,[0,0,0]]]),t=graph('T',[[5,[0,0,0]]]);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),sourceSha:'f'.repeat(64)}),
    /STALE_METHOD_C_FILE_REVISION_OR_MEMBER/);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),targetMember:'another-target'}),
    /STALE_METHOD_C_FILE_REVISION_OR_MEMBER/);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),scale:1.001}),
    /METHOD_C_NONRIGID_POSE_REJECTED/);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),rotation:[[-1,0,0],[0,1,0],[0,0,1]]}),
    /METHOD_C_NONRIGID_POSE_REJECTED/);
  assert.throws(()=>findMethodCCandidates(s,t,{...view(),rotation:[[1.1,0,0],[0,1,0],[0,0,1]]}),
    /METHOD_C_NONRIGID_POSE_REJECTED/);
});
