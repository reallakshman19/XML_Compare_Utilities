/**
 * Issue #102 OWNER positive case A-01 and falsifiers.
 * This deliberately exercises ONLY the nonwriting physical span primitive.
 * Feature rows stand in for independently checked CII auxiliary receipts;
 * real product integration must derive them from original record custody.
 */
import assert from 'node:assert/strict';
import {buildCiiA2LandmarkSpanShadow,compareCiiA2LandmarkSpans}
 from '../scripts/cii-architecture-a2-landmark-span-shadow.mjs';
const shaS='a'.repeat(64),shaT='b'.repeat(64);
const policy={pathSpanAbsoluteToleranceMm:100,minStraightness:0.995};
function edge(id,from,to,length,vector=null,kind='PIPE'){
 const [dx,dy,dz]=vector||[length,0,0];
 return {elementId:String(id),from:String(from),to:String(to),lengthMm:length,dx,dy,dz,
  diameter:114.3,wall:6.0,componentKind:kind};
}
function graph(side,edges){
 const adjacency=new Map();
 for(const e of edges)for(const n of [e.from,e.to]){
  if(!adjacency.has(n))adjacency.set(n,[]);
  adjacency.get(n).push(e);
 }
 return {side,edges,adjacency};
}
function feature(id,features=[]){
 return {nodeId:String(id),
  status:features.length?'FEATURED':'NO_ATTACHMENTS_CONFIRMED',features};
}
function makeSource(custom={}) {
 const edges=custom.edges||[
  edge('SE1','10','20',2000),
  edge('SE2','20','30',2000),
 ];
 const rows=custom.rows||[feature('10',['RESTRAINT']),feature('20'),feature('30',['RESTRAINT'])];
 return buildCiiA2LandmarkSpanShadow({
  graph:graph('SOURCE',edges),originalSha256:shaS,nodeFeatureRows:rows,policy});
}
function makeTarget(length=4050,custom={}){
 const edges=custom.edges||[edge('TE1','5010','5015',length)];
 const rows=custom.rows||[feature('5010',['RESTRAINT']),feature('5015',['RESTRAINT'])];
 return buildCiiA2LandmarkSpanShadow({
  graph:graph('TARGET',edges),originalSha256:shaT,nodeFeatureRows:rows,policy});
}
const S=makeSource(),T=makeTarget();
assert.equal(S.status,'NONWRITING_LANDMARK_SPAN_EVIDENCE');
assert.equal(S.originalNodeCount,3);
assert.equal(S.retainedPhysicalNodeCount,3);
assert.equal(S.originalElementCount,2);
assert.equal(S.spans.length,1);
assert.deepEqual(S.spans[0].nodePath,['10','20','30']);
assert.deepEqual(S.spans[0].elementIds,['SE1','SE2']);
assert.deepEqual(S.spans[0].internalPlainNodes,['20']);
assert.equal(S.nodes.find(x=>x.nodeId==='20').role,'PLAIN_TRANSIT');
assert.equal(S.spans[0].totalLengthMm,4000);
assert.equal(T.spans.length,1);
assert.equal(T.spans[0].totalLengthMm,4050);
const actual=compareCiiA2LandmarkSpans(S.spans[0],T.spans[0],policy);
assert.equal(actual.status,'LOCAL_SPAN_GEOMETRY_SUPPORTED_NONWRITING');
assert.equal(actual.lengthPass,true);
assert.equal(actual.absoluteLengthDeltaMm,50);
assert.equal(actual.pathSpanAbsoluteToleranceMm,100);
assert.equal(actual.orientation,'FORWARD');
assert.equal(actual.identityIndependentlyCertified,false);
assert.equal(actual.physicalGlobalUniquenessVerified,false);
assert.equal(actual.writerReady,false);
assert.equal(actual.transferPlan,null);
assert.equal(S.certifiedNodeCount,0);
assert.equal(S.transferPlan,null);
assert.equal(S.writerReady,false);
// Inclusive EXACT boundary, then overflow.
const at100=compareCiiA2LandmarkSpans(S.spans[0],makeTarget(4100).spans[0],policy);
assert.equal(at100.absoluteLengthDeltaMm,100);
assert.equal(at100.lengthPass,true);
const over=compareCiiA2LandmarkSpans(S.spans[0],makeTarget(4100.01).spans[0],policy);
assert.equal(over.lengthPass,false);
assert(over.reasons.includes('LANDMARK_SPAN_LENGTH_DELTA_EXCEEDED'));
// Do not remove or hide a restraint/feature-bearing internal node.
const restrained=makeSource({rows:[
 feature('10',['RESTRAINT']),feature('20',['RESTRAINT']),feature('30',['RESTRAINT'])
]});
assert.equal(restrained.spans.length,2);
assert(restrained.nodes.find(x=>x.nodeId==='20').reasons.includes('FEATURE_RESTRAINT'));
assert(!restrained.spans.some(x=>x.internalPlainNodes.includes('20')));
// Missing feature proof is not equivalent to an empty record.
const unknown=makeSource({rows:[
 feature('10',['RESTRAINT']),{nodeId:'20',status:'UNKNOWN',features:[]},feature('30',['RESTRAINT'])
]});
assert.equal(unknown.spans.length,2);
assert(unknown.nodes.find(x=>x.nodeId==='20').reasons.includes('NODE_FEATURE_AUTHORITY_UNKNOWN'));
// A bend cannot be silently contracted based on scalar 4000 mm length.
const bent=makeSource({edges:[
 edge('SE1','10','20',2000,[2000,0,0]),
 edge('SE2','20','30',2000,[0,2000,0]),
]});
assert.equal(bent.spans.length,2);
assert(bent.nodes.find(x=>x.nodeId==='20').reasons.includes('NODE_BEND_OR_DIRECTION_CHANGE'));
// A branch is a landmark, not a transparent PIPE transit.
const branched=makeSource({edges:[
 edge('SE1','10','20',2000),
 edge('SE2','20','30',2000),
 edge('SE3','20','40',250,[0,250,0]),
],rows:[feature('10',['RESTRAINT']),feature('20'),feature('30',['RESTRAINT']),feature('40')]});
assert.equal(branched.nodes.find(x=>x.nodeId==='20').role,'LANDMARK');
assert.equal(branched.spans.length,3);
// Rigid/bend component edge custody must not be discarded by compression.
const rigid=makeSource({edges:[
 edge('SE1','10','20',2000,null,'PIPE'),
 edge('SE2','20','30',2000,null,'RIGID'),
]});
assert.equal(rigid.spans.length,2);
assert(rigid.nodes.find(x=>x.nodeId==='20').reasons.includes('INCIDENT_NON_PIPE_COMPONENT'));
// A target with two ordinary pipes is also a match: N SOURCE ↔ M TARGET.
const splitT=makeTarget(4050,{edges:[
 edge('TE1','5010','5012',2000),
 edge('TE2','5012','5015',2050),
],rows:[feature('5010',['RESTRAINT']),feature('5012'),feature('5015',['RESTRAINT'])]});
assert.equal(splitT.spans.length,1);
assert.deepEqual(splitT.spans[0].nodePath,['5010','5012','5015']);
assert.equal(compareCiiA2LandmarkSpans(S.spans[0],splitT.spans[0],policy).lengthPass,true);
// Matching must not rely on element orientation in the original CII.
const reverse=makeTarget(4050,{edges:[edge('TE1','5015','5010',4050,[-4050,0,0])]});
assert.equal(compareCiiA2LandmarkSpans(S.spans[0],reverse.spans[0],policy).lengthPass,true);
// Same length but different restraint endpoints MUST NOT qualify.
const badFeatures=makeTarget(4050,{rows:[feature('5010',['RESTRAINT']),feature('5015',['RIGID'])]});
const blocked=compareCiiA2LandmarkSpans(S.spans[0],badFeatures.spans[0],policy);
assert(blocked.reasons.includes('LANDMARK_FEATURE_SEQUENCE_MISMATCH'));
assert.equal(blocked.writerReady,false);
// Invalid policies, feature omissions and graph custody mismatch must fail closed.
assert.throws(()=>compareCiiA2LandmarkSpans(S.spans[0],T.spans[0],{pathSpanAbsoluteToleranceMm:-1}),
 /POLICY_OUT_OF_RANGE/);
assert.throws(()=>makeSource({rows:[feature('10',['RESTRAINT']),feature('30',['RESTRAINT'])]}),
 /INCOMPLETE_NODE_FEATURE_AUTHORITY/);
console.log('CII102_LANDMARK_SPAN_OWNER_A01_PASS',JSON.stringify({
 sourcePath:'10(Rest)->20(PLAIN)->30(Rest)',
 sourceLengthsMm:[2000,2000],sourceSpanMm:4000,
 targetPath:'5010(Rest)->5015(Rest)',targetSpanMm:4050,
 absoluteDeltaMm:actual.absoluteLengthDeltaMm,toleranceMm:100,
 sourcePhysicalNodesRetained:S.originalNodeCount,
 sourceIntermediateNode:'20',intermediateNotRequiredAsIdentity:true,
 positive:true,atBoundary100Pass:at100.lengthPass,
 overBoundary100Fail:!over.lengthPass,
 protectedIntermediateRestraint:true,
 unknownFeatureRefusal:true,bendRefusal:true,branchRefusal:true,
 nonPipeComponentRefusal:true,sourceNTargetMSupported:true,
 nonWriting:true,
}));
