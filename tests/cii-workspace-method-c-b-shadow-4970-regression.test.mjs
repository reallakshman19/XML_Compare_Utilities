import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMethodCBShadow} from '../docs/tabs/cii-workspace/cii-workspace-method-c-b-shadow-evidence.js';

// [SIMULATED] Independent classification regression for out-of-tolerance projection.
const sha = x => x.repeat(64);
function graph(member, marker, nodes) {
  const edges = nodes.map((n,i)=>({index:i,from:n.id,to:String(Number(n.id)+1),
    witness:'ELEMENTS#'+(i+1)+':15rows',delta:[100,0,0],od:n.od,wall:n.wall}));
  return {byteAuthority:'ORIGINAL_BYTES',member,sha256:sha(marker),nodes,edges,
    nodeIndex:new Map(nodes.map(n=>[n.id,n]))};
}
const node=(id,wall=25.4)=>({id,degree:1,incident:[0],od:273,wall});
const s=graph('S1','a',[node('4970')]);
const t=graph('T','b',[node('1060',18.3)]);
const segment={endpoints:['1060','1065'],distanceMm:300.57,originalWitness:'ELEMENTS#180:15rows'};
function source(status){return {schema:'MethodC.Writer2ReadOnlyGeometry.v1',
  authority:'READ_ONLY_UNVERIFIED_GEOMETRY',sourceId:'S1',sourceSetSha256:sha('c'),
  sourceOriginalSha256:sha('a'),targetOriginalSha256:sha('b'),sessionEpoch:3,
  qualifiedPhysicalIdentityCount:0,writerEligible:false,applyAuthorized:false,
  mutationOperations:[],rows:[{sourceNode:'4970',status,alternatives:[],segmentOnly:segment}]};}
test('4970 OUTSIDE_TOLERANCE cannot inherit a qualifying aligned-segment classification',()=>{
  const b=evaluateMethodCBShadow({aEvidence:source('OUTSIDE_TOLERANCE'),sourceGraph:s,targetGraph:t});
  const row=b.rows[0];
  assert.equal(row.bDisposition,'B_POLICY_HOLD');
  assert.deepEqual(row.missingEvidence,[
    'NO_PHYSICAL_TARGET_IN_WINDOW','INDEPENDENT_PHYSICAL_IDENTITY_NOT_ESTABLISHED']);
  assert.equal(row.segmentOnly,null);
  assert.deepEqual(row.nearestUnqualifiedSegment,segment);
  assert.equal(row.candidateCount,0);
  assert.deepEqual(b.certifiedBoundRows,[]);
  assert.deepEqual(b.mutationOperations,[]);
});
test('4060 true segment-only witness remains non-physical',()=>{
  const b=evaluateMethodCBShadow({aEvidence:source('MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT'),sourceGraph:s,targetGraph:t});
  const row=b.rows[0];
  assert.equal(row.missingEvidence[0],'ORIGINAL_TARGET_ELEMENT_ONLY_NO_PHYSICAL_NODE');
  assert.deepEqual(row.segmentOnly,segment);
  assert.equal(row.nearestUnqualifiedSegment,null);
  assert.equal(b.qualifiedPhysicalIdentityCount,0);
});
