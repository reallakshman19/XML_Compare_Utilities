// ARCH-01 F2.1: SOURCE-first authenticity & coverage counterfactual.
// This does not feed benchmark labels into production correspondence and has NO Writer call.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiCommonAnalysisCache,createCiiWriter2SourceSetPreviewFromPreparedSession}
  from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit} from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=Object.freeze({
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const benchmark=name=>readFileSync(fileURLToPath(new URL('../Benchmark/'+name+'.CII',import.meta.url)));
const sources=['S1','S2','S3'].map(sourceId=>({
 sourceId,fileName:sourceId+'.CII',bytes:benchmark(sourceId),
}));
const targetBytes=benchmark('T');
for(const item of sources)assert.equal(sha(item.bytes),expected[item.sourceId],item.sourceId+' original bytes');
assert.equal(sha(targetBytes),expected.T,'TARGET original bytes');

const cryptoRef=globalThis.crypto||webcrypto;
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes,targetFileName:'T.CII'},{cryptoRef});
assert.equal(inspection.sourceSet.memberCount,3);
const baseLoopsBySource={};
for(const member of inspection.memberInspections){
 const choice=ciiAutomaticBaseSelection(member.inspection.baseAnchorSuggestions||[]);
 assert.equal(choice.status,'READY',member.sourceId+' automatic basis');
 assert(choice.baseLoops.length>0,member.sourceId+' must retain native auto evidence');
 baseLoopsBySource[member.sourceId]=choice.baseLoops;
}
const scenarios=[
 {name:'AUTO_ONLY',input:{baseLoopsBySource}},
 {name:'OWNER_OBSERVED_MANUAL_ACTIVE',input:{
   baseLoopsBySource:{S1:baseLoopsBySource.S1},
   anchorPairsBySource:{
    S2:[{sourceNodeId:'420',targetNodeId:'415'}],
    S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
   },
 }},
];

function acceptanceFromDiscovery(raw){
 return Object.fromEntries(raw.memberPreviews.map(({sourceId,preview})=>{
  const rows=preview?.compareReview?.rows||[];
  return [sourceId,{
   reviewedCorrespondenceIds:rows.filter(r=>r.identityBound===true&&['HIGH','MEDIUM'].includes(r.confidence))
    .map(r=>r.correspondenceId),
   lockedCorrespondenceIds:rows.filter(r=>r.decision==='LOCKED').map(r=>r.correspondenceId),
   rejectedCorrespondenceIds:[],
  }];
 }));
}
function metrics(audit){
 const out=Object.fromEntries(audit.summary.bySource.map(m=>[m.sourceId,{
  physicalNodes:m.enumeratedNodeCount,bound:m.BOUND,unresolved:m.UNRESOLVED,ambiguous:m.AMBIGUOUS,
  unemitted:m.UNEMITTED,qualifiedNameChanges:m.qualifiedNodeNameChangeCount,
 }]));
 for(const m of Object.values(out))assert.equal(m.physicalNodes,m.bound+m.unresolved+m.ambiguous+m.unemitted,
  'SOURCE physical census partition must be exhaustive');
 return out;
}
const results=[];
for(const scenario of scenarios){
 const cache=createCiiCommonAnalysisCache();
 const raw=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,scenario.input,{cryptoRef,commonAnalysisCache:cache});
 const reviewed=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
  ...scenario.input,reviewBySource:acceptanceFromDiscovery(raw),
 },{cryptoRef,commonAnalysisCache:cache});
 const audit=buildCiiSourceTargetAudit(reviewed);
 assert.equal(audit.schema,'CIIWorkspaceSourceTargetAudit.v1');
 assert.equal(audit.summary.totalSourceNodes,150,'full native S1/S2/S3 node inventory must be present');
 assert.equal(audit.rows.length,150,'no SOURCE nodes may vanish');
 assert.equal(new Set(audit.rows.map(r=>r.rowKey)).size,150,'unique SOURCE physical keys');
 assert.equal(audit.summary.bySource.find(m=>m.sourceId==='S1').enumeratedNodeCount,57);
 assert.equal(audit.summary.bySource.find(m=>m.sourceId==='S2').enumeratedNodeCount,47);
 assert.equal(audit.summary.bySource.find(m=>m.sourceId==='S3').enumeratedNodeCount,46);
 assert.equal(audit.sourceSetSha256,inspection.sourceSet.sourceSetSha256);
 assert.equal(reviewed.targetAuthority.originalSha256,expected.T);
 const cases={
  S1_E5:['S1','3910','875'], S1_E30:['S1','4560','1000'],
  S2_wrongManual:['S2','420','415'],S3_manual:['S3','1580','7880'],
 };
 const witnesses=Object.fromEntries(Object.entries(cases).map(([label,[sourceId,src,tgt]])=>{
  const row=audit.rows.find(x=>x.sourceId===sourceId&&x.sourceNodeId===src);
  return [label,{
   state:row?.state||'MISSING',targetNodeIds:row?.targetNodeIds||[],expectedPairPresent:row?.targetNodeIds?.includes(tgt)||false,
   reasons:row?.reasons||[],
  }];
 }));
 // Phase 1 intended correspondences are Owner assertions requiring independent proof,
 // NOT a score/identity oracle and never forwarded into candidate generation.
 const ownerPhaseOne=[
  {sourceId:'S1',sourceNodeId:'4410',ownerProposedTargetNodeId:'970',ownerExpectedGrade:'HIGH'},
  {sourceId:'S1',sourceNodeId:'4440',ownerProposedTargetNodeId:'975',ownerExpectedGrade:'HIGH'},
  {sourceId:'S1',sourceNodeId:'4470',ownerProposedTargetNodeId:'980',ownerExpectedGrade:'HIGH'},
  {sourceId:'S1',sourceNodeId:'4490',ownerProposedTargetNodeId:'985',ownerExpectedGrade:'HIGH'},
  {sourceId:'S2',sourceNodeId:'360',ownerProposedTargetNodeId:'10280',ownerExpectedGrade:'HIGH_CONTROL'},
  {sourceId:'S2',sourceNodeId:'370',ownerProposedTargetNodeId:'10290',ownerExpectedGrade:'HIGH_CONTROL'},
  {sourceId:'S2',sourceNodeId:'390',ownerProposedTargetNodeId:'10300',ownerExpectedGrade:'HIGH_CONTROL'},
  {sourceId:'S2',sourceNodeId:'400',ownerProposedTargetNodeId:'10310',ownerExpectedGrade:'HIGH_CONTROL'},
  {sourceId:'S3',sourceNodeId:'1610',ownerProposedTargetNodeId:'8920',ownerExpectedGrade:'HIGH'},
  {sourceId:'S3',sourceNodeId:'1620',ownerProposedTargetNodeId:'8940',ownerExpectedGrade:'HIGH'},
  {sourceId:'S3',sourceNodeId:'1640',ownerProposedTargetNodeId:'8950',ownerExpectedGrade:'HIGH'},
 ];
 const phaseOne=ownerPhaseOne.map(c=>{
  const row=audit.rows.find(r=>r.sourceId===c.sourceId&&r.sourceNodeId===c.sourceNodeId);
  assert(row, 'Owner Phase1 original SOURCE NODE missing: '+c.sourceId+':'+c.sourceNodeId);
  return {
   ...c,
   actualState:row.state,
   actualTargetNodeIds:row.targetNodeIds,
   actualConfidence:row.confidence,
   ownerProposedTargetIsEmitted:row.targetNodeIds.includes(c.ownerProposedTargetNodeId),
   matchIsCertifiedByThisTest:false,
   causes:row.reasons,
  };
 });
 const accepted=reviewed.compareReview?.rows?.filter(r=>r.decision==='ACCEPTED').length||0;
 const high=reviewed.compareReview?.rows?.filter(r=>r.confidence==='HIGH').length||0;
 const medium=reviewed.compareReview?.rows?.filter(r=>r.confidence==='MEDIUM').length||0;
 const caseResult={
  scenario:scenario.name,
  custody:{sourceSetSha256:inspection.sourceSet.sourceSetSha256,sourceOriginalSha256:Object.fromEntries(
   sources.map(m=>[m.sourceId,expected[m.sourceId]])),targetOriginalSha256:expected.T},
  evidenceSelection:{
   autoSources:Object.keys(scenario.input.baseLoopsBySource||[]),
   manualSources:Object.keys(scenario.input.anchorPairsBySource||[]),
   automaticBasesRetainedForAllSources:true,
  },
  census:{total:audit.summary.totalSourceNodes,bySource:metrics(audit),
   bound:audit.summary.BOUND,unresolved:audit.summary.UNRESOLVED,
   ambiguous:audit.summary.AMBIGUOUS,unemitted:audit.summary.UNEMITTED,
   qualifiedNameChanges:audit.summary.qualifiedNodeNameChangeCount},
  review:{rowCount:reviewed.compareReview?.rows?.length||0,high,medium,accepted},
  matching:{status:reviewed.correspondence?.status,
    blockers:reviewed.correspondence?.blockers||[],conflictCount:reviewed.correspondence?.conflicts?.length||0,
    memberBlockers:reviewed.correspondence?.members?.map(x=>({
     sourceId:x.sourceId,status:x.memberStatus,blockers:x.memberBlockers,
    }))||[]},
  witnesses,
  ownerPhaseOneHypothesisClassification:phaseOne,
  writerAuthorizationByThisTest:false,
 };
 results.push(caseResult);
 console.log('CII_ARCH01_F2_MODE',JSON.stringify(caseResult));
}
const auto=results.find(x=>x.scenario==='AUTO_ONLY');
const manual=results.find(x=>x.scenario==='OWNER_OBSERVED_MANUAL_ACTIVE');
const change=Object.fromEntries(['S1','S2','S3'].map(id=>[id,{
 manualBound:manual.census.bySource[id].bound,
 autoBound:auto.census.bySource[id].bound,
 automaticMinusManualBound:auto.census.bySource[id].bound-manual.census.bySource[id].bound,
 manualUnemitted:manual.census.bySource[id].unemitted,
 autoUnemitted:auto.census.bySource[id].unemitted,
}]));
console.log('CII_ARCH01_F2_EFFECT',JSON.stringify({
 schema:'CiiArch01F2ModeReconciliation.v1',
 reason:'MODE_EXCLUSIVITY_NOT_SAME_AS_JOINT_PHYSICAL_RESOLVER',
 custody:expected,sideBySide:change,
 originalBytesUnchanged:true,physicalIdentityNewlyCertified:0,writerOperationsByTest:0,
}));
