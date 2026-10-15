/** ARCH-01/A2-SHADOW-01: authentic immutable SOURCE/TARGET witness + negative proofs.
 * Runs the existing engine twice; does not alter any production correspondence
 * or invoke a CII Writer, and does not manufacture independent certificates.
 */
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {
  createCiiWriter2SourceSetPreviewFromPreparedSession,
  createCiiCommonAnalysisCache,
} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import { buildCiiA2ShadowJointEvidence, assertCiiA2ShadowNoWrite } from '../scripts/cii-architecture-a2-shadow-joint-evidence.mjs';
import { CII_TRANSFER_ARCH_A1_CATALOG } from '../tabs/cii-workspace/architecture/cii-transfer-capability-contracts.js';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fixtures = {
  'S1.CII': '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII': '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII': 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII': 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const buffers=Object.fromEntries(Object.entries(fixtures).map(([name,expected])=>{
  const bytes=readFileSync(new URL('../Benchmark/'+name,import.meta.url));
  assert.equal(sha(bytes),expected,name+': exact frozen SHA required');
  return [name,bytes];
}));
const sources=[1,2,3].map(i=>({sourceId:'S'+i,fileName:'S'+i+'.CII',bytes:buffers['S'+i+'.CII']}));
const targetBytes=buffers['T.CII'];
const { inspection, preparedSession }=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  {sources,targetBytes,targetFileName:'T.CII'},{cryptoRef:webcrypto});
const baseLoopsBySource=Object.fromEntries(inspection.memberInspections.map(m=>{
  const choice=ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]);
  assert.equal(choice.status,'READY',m.sourceId+': real retained automatic selection');
  return [m.sourceId,choice.baseLoops];
}));
const manualPairs=[
  {sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
  {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'},
];
const modes=[
  {mode:'AUTO_ONLY',options:{baseLoopsBySource}},
  {mode:'UI_MIXED_BASE_PROXY',options:{
    baseLoopsBySource:{S1:baseLoopsBySource.S1},
    anchorPairsBySource:{
      S2:[{sourceNodeId:'420',targetNodeId:'415'}],
      S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
    },
  }},
];
function reviewFor(preview) {
  return Object.fromEntries(preview.memberPreviews.map(({sourceId,preview:member})=>[
    sourceId,{
      ...(member.review||{}),
      reviewedCorrespondenceIds:(member.compareReview?.rows||[])
        .filter(row=>row.identityBound && ['HIGH','MEDIUM'].includes(row.confidence))
        .map(row=>row.correspondenceId),
      lockedCorrespondenceIds:(member.compareReview?.rows||[])
        .filter(row=>row.decision==='LOCKED').map(row=>row.correspondenceId),
      rejectedCorrespondenceIds:[],
    },
  ]));
}
const snapshots=[];
const cache=createCiiCommonAnalysisCache();
let graphReference=null;
for(const {mode,options} of modes) {
  const discovery=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,options,
    {cryptoRef:webcrypto,commonAnalysisCache:cache});
  const preview=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,
    {...options,reviewBySource:reviewFor(discovery)},
    {cryptoRef:webcrypto,commonAnalysisCache:cache});
  const audit=buildCiiSourceTargetAudit(preview);
  assert.equal(audit.summary.totalSourceNodes,150);
  assert.deepEqual(Object.fromEntries(audit.summary.bySource.map(m=>[m.sourceId,m.enumeratedNodeCount])),
    {S1:57,S2:47,S3:46});
  if(mode==='AUTO_ONLY')assert.equal(audit.summary.BOUND,105);
  if(mode==='UI_MIXED_BASE_PROXY')assert.equal(audit.summary.BOUND,38);
  snapshots.push({mode,audit,sourceSetSha256:preview.sourceSetSha256,
    originalTargetSha256:preview.targetAuthority.originalSha256});
  if(!graphReference) graphReference=preview;
}
// Graphs belong to the prepared immutable session/common analysis rather than
// the public Writer preview projection; bind physical advisories to those models.
const sourceGraphsById=Object.fromEntries(preparedSession.members.map(item=>
  [item.sourceId,item.sourceGraph]));
const authority={
  sourceSetSha256:snapshots[0].sourceSetSha256,
  originalTargetSha256:sha(targetBytes),
  originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,sha(s.bytes)])),
};
const opts={authority,snapshots,manualClaims:manualPairs,sourceGraphsById,
  targetGraph:preparedSession.target.targetGraph};
const graph=buildCiiA2ShadowJointEvidence(opts);
assert.equal(graph.status,'SHADOW_REVIEW_ONLY');
assert.equal(graph.summary.originalPhysicalSourceNodes,150);
assert.equal(graph.summary.physicallyCertifiedNodeCount,0);
assert.equal(graph.summary.writerReadyOperationCount,0);
assert.equal(graph.summary.rawEvidenceRows,145);
assert.equal(graph.summary.distinctSourceTargetHypotheses,108);
assert.deepEqual(graph.summary.directlyCompetingSourceNodes,['S2:420','S3:1550','S3:1580']);
assert.equal(graph.hypotheses.filter(c=>c.evidence.some(e=>e.origin==='USER_MANUAL_ASSERTION')).length,2);
assert.equal(graph.summary.byState.UNMAPPED+graph.summary.byState.REVIEW_REQUIRED+graph.summary.byState.CONFLICT,150);
assert.equal(graph.requiredFamilyCatalog,CII_TRANSFER_ARCH_A1_CATALOG.catalogVersion);
assert(Object.isFrozen(graph));
assert(Object.isFrozen(graph.hypotheses));
assert.equal(graph.writerDispatchInstalled,false);
assert.equal(graph.transferPlan,null);
assert.equal(graph.writeScope,null);
const conflict=(key)=>graph.nodeRows.find(row=>row.sourceNodeKey===key);
assert.deepEqual(conflict('S2:420').targets,['415','10330']);
assert.deepEqual(conflict('S3:1550').targets,['7860','8870']);
assert.deepEqual(conflict('S3:1580').targets,['7880','8895']);
for(const key of graph.summary.directlyCompetingSourceNodes) {
  assert.equal(conflict(key).state,'CONFLICT');
  assert(conflict(key).reasons.includes('COMPETING_TARGET_IDENTITIES'));
  assert.equal(conflict(key).certificationId,null);
}
const bad=graph.hypotheses.find(row=>row.sourceNodeKey==='S2:420' && row.targetNodeId==='415');
assert(bad,'preserve contested current manual lock as non-admitted hypothesis');
assert.equal(bad.physicalAdvisory.identityQualified,false);
assert.equal(bad.physicalAdvisory.incidentOdErrorPercent,91.69);
assert(bad.physicalAdvisory.warnings.includes('ONE_HOP_INCIDENT_OD_OVER_50_PERCENT'));
assert(graph.hypotheses.some(row=>row.sourceNodeKey==='S2:420' && row.targetNodeId==='10330'));
assert.throws(()=>assertCiiA2ShadowNoWrite(graph),/SHADOW_CORRESPONDENCE_NOT_WRITER_CERTIFIED/);
const wrongHash=structuredClone({authority,snapshots,manualClaims:manualPairs});
wrongHash.snapshots[1].originalTargetSha256='0'.repeat(64);
assert.throws(()=>buildCiiA2ShadowJointEvidence(wrongHash),/REPLAY_INPUT_CUSTODY_DIFFERENCE/);
const wrongManual=structuredClone({authority,snapshots,manualClaims:manualPairs});
wrongManual.manualClaims[1].targetNodeId='8895';
assert.throws(()=>buildCiiA2ShadowJointEvidence(wrongManual),/UNATTESTED_MANUAL_LOCK/);
const malformed=structuredClone({authority,snapshots,manualClaims:manualPairs});
malformed.snapshots[0].audit.rows[1].rowKey=malformed.snapshots[0].audit.rows[0].rowKey;
assert.throws(()=>buildCiiA2ShadowJointEvidence(malformed),/AUDIT_ROW_IDENTITY_NAMESPACE_MISMATCH|DUPLICATE_PHYSICAL_NODE/);
const drift=structuredClone({authority,snapshots,manualClaims:manualPairs});
drift.snapshots[1].audit.rows.splice(0,1);
drift.snapshots[1].audit.summary.totalSourceNodes--;
assert.throws(()=>buildCiiA2ShadowJointEvidence(drift),/CANNOT_COMPARE_DIFFERENT_SOURCE_POPULATIONS|SOURCE_MEMBER_CENSUS_INCOMPLETE/);

function miniRow(s,n,target) {
  return {rowKey:s+':'+n,sourceId:s,sourceNodeId:n,targetNodeId:target,
    state:'BOUND',confidence:'HIGH',reviewDecisions:['ACCEPTED']};
}
const minA=[miniRow('S1','1','50'),miniRow('S2','2','50')];
const miniSourceShaById={S1:'1'.repeat(64),S2:'2'.repeat(64)};
const miniAuthority={sourceSetSha256:'3'.repeat(64),originalTargetSha256:'4'.repeat(64),
  originalSourceShaById:miniSourceShaById};
const miniSnapshots=['TEST_A','TEST_B'].map(mode=>({mode,
  sourceSetSha256:miniAuthority.sourceSetSha256,
  originalTargetSha256:miniAuthority.originalTargetSha256,
  audit:{rows:minA,summary:{totalSourceNodes:2,bySource:[
    {sourceId:'S1',enumeratedNodeCount:1,populationStatus:'MATCH'},
    {sourceId:'S2',enumeratedNodeCount:1,populationStatus:'MATCH'},
  ]}},
}));
const globalCollision=buildCiiA2ShadowJointEvidence({authority:miniAuthority,snapshots:miniSnapshots});
assert.equal(globalCollision.summary.distinctSourceTargetHypotheses,2);
assert.deepEqual(globalCollision.summary.byState,{UNMAPPED:0,REVIEW_REQUIRED:0,CONFLICT:2});
assert.deepEqual(globalCollision.summary.sharedTargetCustodyNodes,['S1:1','S2:2']);
const deterministic=buildCiiA2ShadowJointEvidence(opts);
assert.equal(JSON.stringify(graph),JSON.stringify(deterministic));
console.log(JSON.stringify({
  schema:graph.schema,sourceSetSha256:graph.provenance.sourceSetSha256,
  originalTargetSha256:graph.provenance.originalTargetSha256,
  sourceNodes:graph.summary.originalPhysicalSourceNodes,
  rawEvidenceRows:graph.summary.rawEvidenceRows,
  uniqueHypotheses:graph.summary.distinctSourceTargetHypotheses,
  stateCounts:graph.summary.byState,
  competingSourceNodes:graph.summary.directlyCompetingSourceNodes,
  manualT415LocalODMismatchPercent:bad.physicalAdvisory.incidentOdErrorPercent,
  sharedCustodySourceNodes:graph.summary.sharedTargetCustodyNodes.length,
  writerReady:0,
},null,2));
console.log('PASS A2 shadow: authentic 150-NODE additive evidence, current 3 competing assignments, source/target hash custody, shared TARGET collision fail-closed, wrong LOCK and no Writer certification');
