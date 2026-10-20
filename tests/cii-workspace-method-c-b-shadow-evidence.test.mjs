import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {buildOriginalGraphFromBytes} from '../docs/tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import {registerMethodC} from '../docs/tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {findMethodCCandidates} from '../docs/tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import {createMethodCASidecar} from '../docs/tabs/cii-workspace/cii-workspace-method-c-a-sidecar.js';
import {evaluateMethodCBShadow} from '../docs/tabs/cii-workspace/cii-workspace-method-c-b-shadow-evidence.js';

const original = Object.freeze({
  S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const hash = value => createHash('sha256').update(value).digest('hex');
const buffer = id => readFileSync(new URL('../Benchmark/'+id+'.CII',import.meta.url));
async function fixture() {
  const sourceSetSha256=hash(['S1','S2','S3'].map(id=>id+':'+original[id]+'\n').join(''));
  const [s,t]=await Promise.all(['S1','T'].map(id=>{
    const bytes=buffer(id);
    assert.equal(hash(bytes),original[id],'original CII hash must not be copied from algorithm');
    return buildOriginalGraphFromBytes({bytes,member:id,expectedSha256:original[id],cryptoRef:webcrypto});
  }));
  const pose=registerMethodC(s,t,[{source:'3910',target:'875',role:'experimental-unverified'}],
    {orientationMode:'AUTO_GEOMETRIC_PREVIEW'});
  const tol={x:100,y:100,z:100};
  const candidates=pose.status==='HOLD'?null:findMethodCCandidates(s,t,pose,tol);
  const a=createMethodCASidecar({sourceSetSha256,sourceId:'S1',sessionEpoch:3,
    sourceGraph:s,targetGraph:t,registration:pose,candidates,tolerance:tol});
  return {s,t,a};
}
test('ORIGINAL S1/T real signed graph shadow classifies all 57 without B grant',async()=>{
  for(const id of ['S1','S2','S3','T'])assert.equal(hash(buffer(id)),original[id]);
  const {s,t,a}=await fixture();
  const shadow=evaluateMethodCBShadow({aEvidence:a,sourceGraph:s,targetGraph:t});
  assert.equal(shadow.rows.length,57);
  assert.equal(shadow.rows.filter(r=>r.candidateCount).length,41);
  assert.equal(shadow.sourceId,'S1');
  assert.equal(shadow.sourceOriginalSha256,original.S1);
  assert.equal(shadow.targetOriginalSha256,original.T);
  assert.equal(shadow.sessionEpoch,3);
  assert.equal(shadow.authority,'B_INVESTIGATION_ONLY_NOT_ADMITTED');
  assert.equal(shadow.policyStatus,'OWNER_PHYSICAL_B_ADMISSION_POLICY_NOT_APPROVED');
  assert.deepEqual(shadow.physicalCertificates,[]);
  assert.deepEqual(shadow.certifiedBoundRows,[]);
  assert.deepEqual(shadow.mutationOperations,[]);
  assert.equal(shadow.qualifiedPhysicalIdentityCount,0);
  assert.equal(shadow.applyAuthorized,false);
  assert.equal(shadow.writerEligible,false);
  assert(Object.isFrozen(shadow.rows[0].hypotheses));
  const seg=shadow.rows.find(row=>row.sourceNode==='4060');
  assert.equal(seg.geometricStatus,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
  assert.equal(seg.candidateCount,0);
  assert.deepEqual(seg.segmentOnly.endpoints,['900','905']);
  assert(seg.missingEvidence.includes('ORIGINAL_TARGET_ELEMENT_ONLY_NO_PHYSICAL_NODE'));
  const far=shadow.rows.find(row=>row.sourceNode==='4970');
  assert.equal(far.geometricStatus,'OUTSIDE_TOLERANCE');
  assert.equal(far.candidateCount,0);
  const seed=shadow.rows.find(row=>row.sourceNode==='3910');
  assert(seed.missingEvidence.includes('EXPERIMENTAL_ANCHOR_UNAUTHENTICATED'));
  assert(seed.hypotheses[0]?.reviewReasons.includes('NO_AUTHENTICATED_INDEPENDENT_SEED'));
  assert(seed.hypotheses[0]?.signedSourceElements.length>0);
  assert(seed.hypotheses[0]?.signedTargetElements.length>0);
});
test('forged, mismatched, nonoriginal graph or fake SOURCE physical NODE fail closed',async()=>{
  const {s,t,a}=await fixture(),evalWith=(ov={})=>evaluateMethodCBShadow({
    aEvidence:ov.a||a,sourceGraph:ov.s||s,targetGraph:ov.t||t,
  });
  assert.throws(()=>evalWith({s:{...s,byteAuthority:'DERIVED_PROFILE_NO_RAW_SEED'}}),/ORIGINAL_BYTE_GRAPH_REQUIRED/);
  assert.throws(()=>evalWith({t:{...t,sha256:'a'.repeat(64)}}),/ORIGINAL_BYTE_GRAPH_REQUIRED/);
  assert.throws(()=>evalWith({a:{...a,writerEligible:true}}),/A_ONLY_AUTHORITY_REQUIRED/);
  assert.throws(()=>evalWith({a:{...a,qualifiedPhysicalIdentityCount:1}}),/A_ONLY_AUTHORITY_REQUIRED/);
  assert.throws(()=>evalWith({a:{...a,sourceOriginalSha256:'a'.repeat(64)}}),/ORIGINAL_BYTE_GRAPH_REQUIRED/);
  assert.throws(()=>evalWith({a:{...a,rows:[{...a.rows[0],sourceNode:'999999'}]}}),/SOURCE_NODE_MISSING_FROM_ORIGINAL/);
  assert.throws(()=>evalWith({a:{...a,rows:[{...a.rows[0],alternatives:[
    {target:'999999',distanceMm:0,residual:[0,0,0]}]}]}}),/TARGET_PHYSICAL_NODE_OR_DISTANCE_NOT_VERIFIED/);
  assert.throws(()=>evalWith({a:{...a,rows:[{...a.rows[0],physicalIdentityQualified:true}]}}),/FORGED_B_IDENTITY/);
});
test('segment-only cannot be promoted; all near alternatives remain nonauthoritative',async()=>{
  const {s,t,a}=await fixture();
  const forged={...a,rows:a.rows.map(row=>row.sourceNode==='4060'?
    {...row,alternatives:[{target:'900',distanceMm:0,residual:[0,0,0]}]}:row)};
  assert.throws(()=>evaluateMethodCBShadow({aEvidence:forged,sourceGraph:s,targetGraph:t}),
    /SEGMENT_IS_NOT_A_TARGET_PHYSICAL_NODE/);
  const near={...a,rows:a.rows.map(row=>row.sourceNode==='3910'?
    {...row,status:'COORDINATE_NEAR_CANDIDATE'}:row)};
  const output=evaluateMethodCBShadow({aEvidence:near,sourceGraph:s,targetGraph:t});
  assert(output.rows.every(row=>row.bDisposition==='B_POLICY_HOLD'));
  assert(output.rows.every(row=>row.hypotheses.every(h=>h.verification==='NOT_PHYSICAL_CERTIFICATE')));
});
test('new shadow source has no productive Writer2 imports and docs/root parity',()=>{
  const served=readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-b-shadow-evidence.js',import.meta.url),'utf8');
  const root=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-method-c-b-shadow-evidence.js',import.meta.url),'utf8');
  assert.equal(served,root);
  assert.doesNotMatch(served,/from ['"].*(?:writer2.*-ui|multisource-preview|transfer-scope|review-ui)['"]/);
  assert.doesNotMatch(served,/\b(?:identityBound|writerEligible|applyAuthorized)\s*:\s*true\b/);
});
