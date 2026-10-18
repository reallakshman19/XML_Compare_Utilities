import test from 'node:test';
import assert from 'node:assert/strict';
import {createMethodCASidecar,assertMethodCASidecarCurrent} from '../docs/tabs/cii-workspace/cii-workspace-method-c-a-sidecar.js';
const sha1='1'.repeat(64), sha2='2'.repeat(64), sha3='3'.repeat(64);
const ctx = () => ({sourceSetSha256:sha3,sourceId:'S1',sessionEpoch:2,
 sourceGraph:{member:'S1',sha256:sha1,byteAuthority:'ORIGINAL_BYTES'},
 targetGraph:{member:'T',sha256:sha2,byteAuthority:'ORIGINAL_BYTES'},
 registration:{status:'UNVERIFIED_GEOMETRIC_PREVIEW',sourceSha:sha1,targetSha:sha2,
  sourceMember:'S1',targetMember:'T',scale:1,rotation:[[1,0,0],[0,1,0],[0,0,1]],
  translation:[100,200,300],qualified:false,writerEligible:false,applyAuthorized:false,
  originalDiscovery:{hypotheses:[{heldOut:{rejected:['witness']}}]},anchors:[{source:'3910',target:'875',role:'experimental-unverified'}]},
 candidates:{qualifiedIdentityCount:0,tolerance:{x:100,y:100,z:100},rows:[{
  source:'4060',sourceSha:sha1,targetSha:sha2,status:'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT',
  target:null,alternatives:[],nearest:{target:'905'},original:[0,0,0],xyz:[1,2,3],
  originalElements:['S1:element'],segment:{between:['900','905'],witness:'T:e',xyz:[1,2,3],t:.76175,distance:0,element:99},
 }]},tolerance:{x:100,y:100,z:100}});
test('A sidecar is deeply frozen, source-bound, B0/C0, segment-only',()=>{
 const input=ctx(),v=createMethodCASidecar(input);assert.equal(v.rows.length,1);
 assert.equal(v.rows[0].status,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
 assert.equal(v.rows[0].selectedPhysicalTarget,null);assert.equal(v.rows[0].segmentOnly.originalWitness,'T:e');
 assert.equal(v.qualifiedPhysicalIdentityCount,0);assert.equal(v.writerEligible,false);
 assert.equal(v.applyAuthorized,false);assert.deepEqual(v.mutationOperations,[]);
 assert.equal(Object.isFrozen(v.rows[0].segmentOnly.endpoints),true);
 assert.throws(()=>{v.rows.push(3)},TypeError);
 input.candidates.rows[0].originalElements[0]='MUTATED';
 assert.equal(v.rows[0].originalSourceElementWitnesses[0],'S1:element');
 assert.equal(assertMethodCASidecarCurrent(v,{sourceSetSha256:sha3,sourceId:'S1',sourceOriginalSha256:sha1,
  targetOriginalSha256:sha2,sessionEpoch:2}),true);
});
test('session revision/source SHA/TARGET SHA all invalidate',()=>{
 const v=createMethodCASidecar(ctx());const base={sourceSetSha256:sha3,sourceId:'S1',
  sourceOriginalSha256:sha1,targetOriginalSha256:sha2,sessionEpoch:2};
 for(const patch of [{sessionEpoch:3},{sourceSetSha256:sha1},{sourceOriginalSha256:sha3},
  {targetOriginalSha256:sha3},{sourceId:'S2'}])assert.throws(()=>assertMethodCASidecarCurrent(v,{...base,...patch}),/STALE_EVIDENCE/);
});
test('rejects forged certification and claimed writer authority',()=>{
 for(const patch of [{qualified:true},{writerEligible:true},{applyAuthorized:true},
  {ownerAnchorAuthenticated:true},{physicalNodeCorrespondenceQualified:true}]){
  const v=ctx();Object.assign(v.registration,patch);
  assert.throws(()=>createMethodCASidecar(v),/UNAUTHORIZED_REGISTRATION/);
 }
});
test('rejects forged reflection and scale',()=>{
 let v=ctx();v.registration.rotation=[[1,0,0],[0,1,0],[0,0,-1]];
 assert.throws(()=>createMethodCASidecar(v),/PROPER_RIGID_REQUIRED/);
 v=ctx();v.registration.scale=1.01;
 assert.throws(()=>createMethodCASidecar(v),/PROPER_RIGID_REQUIRED/);
});
test('rejects stale candidate SHAs and policy',()=>{
 let v=ctx();v.candidates.rows[0].targetSha=sha3;
 assert.throws(()=>createMethodCASidecar(v),/CANDIDATE_CUSTODY_MISMATCH/);
 v=ctx();v.candidates.tolerance.x=101;
 assert.throws(()=>createMethodCASidecar(v),/CANDIDATE_POLICY_MISMATCH/);
});
test('cannot turn 4060 segment-only into physical candidate',()=>{
 let v=ctx();v.candidates.rows[0].target='905';
 assert.throws(()=>createMethodCASidecar(v),/SEGMENT_CANNOT_BE_PHYSICAL_NODE/);
 v=ctx();v.candidates.rows[0].alternatives=[{target:'905',residual:[0,0,0],distance:0}];
 assert.throws(()=>createMethodCASidecar(v),/SEGMENT_CANNOT_BE_PHYSICAL_NODE/);
});
test('HOLD contains original rejection ledger but no physical rows',()=>{
 const v=ctx();v.registration.status='HOLD';v.registration.rotation=null;v.registration.translation=null;
 v.candidates=null;const e=createMethodCASidecar(v);
 assert.equal(e.registration.status,'HOLD');assert.deepEqual(e.rows,[]);
 assert.equal(e.registration.originalDiscovery.hypotheses[0].heldOut.rejected[0],'witness');
});
test('wrong source member and unverified graph blocked',()=>{
 let v=ctx();v.sourceGraph.member='S2';
 assert.throws(()=>createMethodCASidecar(v),/WRONG_MEMBER/);
 v=ctx();v.sourceGraph.byteAuthority='NORMALIZED';
 assert.throws(()=>createMethodCASidecar(v),/ORIGINAL_GRAPH_REQUIRED/);
});