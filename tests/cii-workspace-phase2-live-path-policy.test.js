import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCiiComparisonAttachmentEvidenceByNode } from '../tabs/cii-workspace/cii-workspace-path-attachment-custody.js';
import { compareLockedCiiAnchorSpan } from '../tabs/cii-workspace/cii-workspace-topology.js';
import { canonicalCiiCommonAnalysisAuthority,ciiCommonAnalysisOptions } from '../tabs/cii-workspace/cii-workspace-common-analysis-key.js';
import { getCiiMultiSourceMethodAConfidenceOptions,setCiiMultiSourcePathTotalLengthToleranceMm } from '../tabs/cii-workspace/cii-workspace-source-set.js';

const edge=(elementId,from,to,len)=>({elementId,from:String(from),to:String(to),componentKind:'PIPE',
  lengthMm:len,dx:len,dy:0,dz:0,diameter:150,wall:8,
  parsedElementIndex:Number(elementId.slice(1)),packetEvidence:[],anchorFlags:[],isAnchorElement:false});
const graph=edges=>{
  const adjacency=new Map();
  for(const e of edges)for(const node of [e.from,e.to]){
    if(!adjacency.has(node))adjacency.set(node,[]);
    adjacency.get(node).push(e);
  }
  return {documentId:'synthetic',edges,adjacency,nodes:[...adjacency].map(([id,rows])=>({id,degree:rows.length}))};
};
const source=graph([edge('E1',10,20,2000),edge('E2',20,30,2000)]);
const target=graph([edge('E1',5010,5015,4050)]);
const zero={bend:0,rigid:0,restraint:0,sifTee:0,nodeName:0,reducer:0};
const evidence=(_graph)=>({
  parsed:{elements:_graph.edges.map(e=>({index:e.parsedElementIndex,from:e.from,to:e.to}))},
  capabilities:{families:{hangers:{raw:{present:false}},restraints:{state:'EMPTY'},rigidMass:{state:'EMPTY'},sifTee:{state:'EMPTY'}}},
  auxiliaryEvidence:{
    conflicts:[],rawElementBlockCount:_graph.edges.length,mappedElementCount:_graph.edges.length,
    miscel1SectionRowCount:0,restraints:{byNode:{}},sifTee:{byPointer:{}},
    elements:Object.fromEntries(_graph.edges.map(e=>[e.parsedElementIndex,{pointers:{...zero}}])),
  },
});
const verifiedSource=buildCiiComparisonAttachmentEvidenceByNode(evidence(source),source);
const verifiedTarget=buildCiiComparisonAttachmentEvidenceByNode(evidence(target),target);
assert.equal(verifiedSource['20'].state,'VERIFIED_EMPTY');
assert.equal(verifiedTarget['5010'].complete,false);
const anchors=[{sourceNodeId:'10',targetNodeId:'5010'},{sourceNodeId:'30',targetNodeId:'5015'}];
const opts={
  enableSafeComparisonPaths:true,sourceAttachmentEvidenceByNode:verifiedSource,
  targetAttachmentEvidenceByNode:verifiedTarget,pathTotalLengthToleranceMm:100,
};
const match=compareLockedCiiAnchorSpan(source,target,anchors,opts);
assert.equal(match.normalizedPathEvidence?.deltaMm,50,'match must consume actual normalized cumulative lengths');
assert.equal(match.normalizedPathEvidence?.lengthPass,true);
assert.deepEqual(match.normalizedPathEvidence?.sourceWitness?.originalNodeIds,['10','20','30']);
assert(match.elementRows.some(row=>row.authority==='NORMALIZED_PIPE_PATH_CANDIDATE_NOT_CERTIFIED'));
assert(match.blockers.includes('NORMALIZED_PATH_PHYSICAL_IDENTITY_NOT_CERTIFIED'));
assert.notEqual(match.status,'READY','path lengths never certify physical correspondence for Writer');
const beyond=compareLockedCiiAnchorSpan(source,target,anchors,{...opts,pathTotalLengthToleranceMm:49});
assert.equal(beyond.normalizedPathEvidence?.lengthPass,false);
const unknown=compareLockedCiiAnchorSpan(source,target,anchors,{...opts,sourceAttachmentEvidenceByNode:{}});
assert.equal(unknown.normalizedPathEvidence,null);
const attachedDoc=evidence(source);attachedDoc.auxiliaryEvidence.elements[1].pointers.restraint=2;
assert.notEqual(buildCiiComparisonAttachmentEvidenceByNode(attachedDoc,source)['20'].state,'VERIFIED_EMPTY');
const incomplete=evidence(source);incomplete.auxiliaryEvidence.miscel1SectionRowCount=12;
assert.notEqual(buildCiiComparisonAttachmentEvidenceByNode(incomplete,source)['20'].state,'VERIFIED_EMPTY');
const loops=[{method:'METHOD_B_NETWORK',baseId:'B',anchorPairs:[{sourceNodeId:'10',targetNodeId:'5010'}]}];
const left=canonicalCiiCommonAnalysisAuthority({baseLoops:loops,anchorPairs:[{sourceNodeId:'30',targetNodeId:'5015'}],anchorPairMode:'INDEPENDENT_SEEDS'});
const right=canonicalCiiCommonAnalysisAuthority({baseLoops:loops,anchorPairs:[{sourceNodeId:'30',targetNodeId:'5999'}],anchorPairMode:'INDEPENDENT_SEEDS'});
assert.equal(left.mode,'PARALLEL_AUTO_MANUAL');
assert.notDeepEqual(left,right,'manual claim change must invalidate prepared common analysis');
assert.notDeepEqual(ciiCommonAnalysisOptions({pathTotalLengthToleranceMm:100}),ciiCommonAnalysisOptions({pathTotalLengthToleranceMm:90}));
const before=getCiiMultiSourceMethodAConfidenceOptions();
assert.equal(setCiiMultiSourcePathTotalLengthToleranceMm(100),100);
assert.equal(setCiiMultiSourcePathTotalLengthToleranceMm(85),85);
assert.equal(getCiiMultiSourceMethodAConfidenceOptions().pathTotalLengthToleranceMm,85);
assert.throws(()=>setCiiMultiSourcePathTotalLengthToleranceMm(-1),/TOLERANCE_INVALID/);
assert.equal(getCiiMultiSourceMethodAConfidenceOptions().pathTotalLengthToleranceMm,85,'invalid draft never replaces effective policy');
setCiiMultiSourcePathTotalLengthToleranceMm(before.pathTotalLengthToleranceMm);
const ui=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-multisource-review-only-filter-shell.js',import.meta.url),'utf8');
assert(ui.includes('data-ciiw-path-total-length-tolerance'));
assert(ui.includes('setCiiMultiSourcePathTotalLengthToleranceMm(field.value)'));
const sourceSet=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-multisource-session-persistence.js',import.meta.url),'utf8');
assert(sourceSet.includes('stored.pathTotalLengthToleranceMm'));
console.log('PASS Phase2 live matcher consumes 100mm normalized path evidence REVIEW-only; original Method A/B and Writer authority untouched');
