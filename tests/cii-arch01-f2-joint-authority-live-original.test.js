import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession,createCiiCommonAnalysisCache} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiJointAuthorityEvidence,ciiJointAuthorityEvidenceMarkup}
 from '../tabs/cii-workspace/cii-workspace-joint-authority-evidence.js';

const frozen={
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const bytes=k=>readFileSync(fileURLToPath(new URL('../Benchmark/'+k+'.CII',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=['S1','S2','S3'].map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:bytes(sourceId)}));
const targetBytes=bytes('T');
for(const m of sources)assert.equal(sha(m.bytes),frozen[m.sourceId]);
assert.equal(sha(targetBytes),frozen.T);
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes,targetFileName:'T.CII'}, {cryptoRef:webcrypto,spatialToleranceMm:200});
const selectedBySource=new Map();
for(const m of inspection.memberInspections){
 const selected=ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]);
 assert.equal(selected.status,'READY',m.sourceId);
 selectedBySource.set(m.sourceId,new Set(selected.selectionKeys));
}
const autoBases=Object.fromEntries(inspection.memberInspections.map(m=>[
 m.sourceId,ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]).baseLoops
]));
const automaticCorrespondencePreview=await createCiiWriter2SourceSetPreviewFromPreparedSession(
 preparedSession,{baseLoopsBySource:autoBases},{cryptoRef:webcrypto,
 commonAnalysisCache:createCiiCommonAnalysisCache(),spatialToleranceMm:200});
const manualBySource=new Map([
 ['S2',[{sourceNodeId:'420',targetNodeId:'415'}]],
 ['S3',[{sourceNodeId:'1580',targetNodeId:'7880'}]],
]);
const modes=new Map([['S1','AUTO'],['S2','MANUAL'],['S3','MANUAL']]);
const args={
 inspection,preparedSession,selectedBySource,manualBySource,
 automaticCorrespondencePreview,activeModeBySource:modes,
 originalSourceSetSha256:inspection.sourceSet.sourceSetSha256,
 originalTargetSha256:sha(targetBytes),spatialToleranceMm:200,
};
const actual=buildCiiJointAuthorityEvidence(args);
assert.equal(actual.schema,'CiiJointAuthorityEvidence.v1');
assert.equal(actual.status,'SHADOW_NON_WRITING');
assert.equal(actual.summary.originalPhysicalSourceNodes,150);
assert.deepEqual(actual.memberSummary.map(x=>x.physicalSourceNodes),[57,47,46]);
assert.equal(actual.appliedM1SpatialToleranceMm,200);
assert.equal(actual.originalSourceSetSha256,'5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3');
assert(actual.conflicts.length>=2,'actual MANUAL vs propagated AUTO conflicts S2/S3 remain visible');
const s2=actual.rows.find(x=>x.sourceNodeKey==='S2:420');
const s3=actual.rows.find(x=>x.sourceNodeKey==='S3:1580');
assert.deepEqual(s2.targets,['415','10330']);
assert.deepEqual(s3.targets,['7880','8895']);
assert.equal(s2.state,'CONFLICT');assert.equal(s3.state,'CONFLICT');
assert(s2.evidence.some(e=>e.lane==='AUTO')&&s2.evidence.some(e=>e.lane==='MANUAL'));
assert.equal(actual.writerReady,false);assert.equal(actual.transferPlan,null);
assert.equal(actual.independentlyCertifiedNodes,0);
assert(actual.summary.unseededPhysicalSourceNodes>0,'seed hypotheses must not masquerade as entire propagation');
assert(actual.elementRows.length>0);
assert(actual.elementRows.every(x=>!('mutation' in x)));
const same=buildCiiJointAuthorityEvidence(args);
assert.equal(JSON.stringify(actual),JSON.stringify(same));
assert(Object.isFrozen(actual.rows));
const safe=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html=ciiJointAuthorityEvidenceMarkup(actual,safe);
assert(html.includes('S2:420')&&html.includes('10330')&&html.includes('S3:1580'));
assert(html.includes('data-ciiw-f2-joint-review'));
assert(!html.includes('<script'));
assert.throws(()=>buildCiiJointAuthorityEvidence({...args,originalTargetSha256:'bad'}),/F2_JOINT_ORIGINAL_SHA_INVALID/);
console.log('F2_ORIGINAL_JOINT',JSON.stringify({
 sha:actual.originalSourceSetSha256,
 nodes:actual.summary.originalPhysicalSourceNodes,
 seedHypothesisNodes:actual.summary.sourceNodesWithAtLeastOneSeedHypothesis,
 conflicts:actual.summary.competingSourceNodes,
 localPathWitnesses:actual.summary.localPathWitnessRows,
 unresolvedElements:actual.summary.unresolvedElementConstraints,
 S2_420:s2.targets,S3_1580:s3.targets,
 writerReady:actual.writerReady,certifiedNodeCount:actual.independentlyCertifiedNodes,
}));
// Synthetic: physically unique SOURCE keys compete for the same TARGET;
 // no highest-score selection, no silent TARGET custody collision.
const h=k=>k.repeat(64),sGraph=(nodeId)=>({nodes:[{id:nodeId}],edges:[]});
const mock={
 inspection:{memberInspections:[
 {sourceId:'A',inspection:{baseAnchorSuggestions:[]}},
 {sourceId:'B',inspection:{baseAnchorSuggestions:[]}},
 ]},
 preparedSession:{members:[
  {sourceId:'A',sourceGraph:sGraph('1'),originalSha256:h('a')},
  {sourceId:'B',sourceGraph:sGraph('2'),originalSha256:h('b')},
 ],target:{targetGraph:{nodes:[{id:'9'}],edges:[]}}},
 selectedBySource:new Map(),manualBySource:new Map([
  ['A',[{sourceNodeId:'1',targetNodeId:'9'}]],
  ['B',[{sourceNodeId:'2',targetNodeId:'9'}]],
 ]),
 originalSourceSetSha256:h('c'),originalTargetSha256:h('d'),
};
const collision=buildCiiJointAuthorityEvidence(mock);
assert.equal(collision.summary.originalPhysicalSourceNodes,2);
assert.equal(collision.summary.competingSourceNodes,2);
assert(collision.conflicts.every(x=>x.reasons.includes('SHARED_TARGET_NODE_CUSTODY')));
assert.equal(collision.writerReady,false);
const wrong=structuredClone(mock);
wrong.manualBySource=new Map([['A',[{sourceNodeId:'not-there',targetNodeId:'9'}]]]);
assert.throws(()=>buildCiiJointAuthorityEvidence(wrong),/F2_JOINT_PHYSICAL_NODE_NOT_FOUND/);
console.log('F2_SYNTHETIC_CUSTODY',JSON.stringify({crossSourceCollisionCount:collision.summary.competingSourceNodes,
 writerReady:collision.writerReady}));
