#!/usr/bin/env node
/**
 * ARCH-01/F2 original-CII read-only joint resolver report. Not product
 * matching; no certification, writer, or mutation API import. Arbitrary
 * original input names can be used: nothing reads benchmark expected labels.
 *
 * Usage:
 * node scripts/cii-arch01-f2-joint-report.mjs --source S1:Benchmark/S1.CII
 *  --source S2:Benchmark/S2.CII --source S3:Benchmark/S3.CII
 *  --target Benchmark/T.CII --manual S2:420:415 --manual S3:1580:7880
 *  --m1-tolerance 100 --out test-results/f2-joint-100.json
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge,getCiiMultiSourceMethodAConfidenceOptions} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession,createCiiCommonAnalysisCache}
 from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit} from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import {buildCiiA2ShadowJointEvidence} from './cii-architecture-a2-shadow-joint-evidence.mjs';
import {inspectCiiA2PhysicalConstraints} from './cii-architecture-a2-physical-path-constraints.mjs';
import {solveCiiA2GlobalShadow} from './cii-architecture-a2-global-constraint-shadow.mjs';
import {recoverCiiA2FrontierHypotheses} from './cii-architecture-a2-frontier-recovery.mjs';
import {reconcileCiiA2RecoveredFrontier} from './cii-architecture-a2-frontier-reconciliation.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),opts={sources:[],manual:[],tolerance:100,target:null,out:null};
for(let i=0;i<args.length;i++){
 const flag=args[i],value=args[++i];
 if(!value||!['--source','--manual','--target','--out','--m1-tolerance'].includes(flag))
  throw Error('F2_BAD_CLI_FLAG_OR_VALUE:'+flag);
 if(flag==='--source')opts.sources.push(value);
 if(flag==='--manual')opts.manual.push(value);
 if(flag==='--target')opts.target=value;
 if(flag==='--out')opts.out=value;
 if(flag==='--m1-tolerance')opts.tolerance=Number(value);
}
if(opts.sources.length<2||!opts.target||!opts.manual.length
 ||!Number.isFinite(opts.tolerance)||opts.tolerance<1||opts.tolerance>200)
 throw Error('F2_SOURCE_SET_TARGET_MANUAL_AND_BOUNDED_TOLERANCE_REQUIRED');
// F2 is independently based on main. PR #97 adds the actual M1 tolerance
// consumer and #98 its qualified Method A residual-quality scoring link.
// A CLI option alone does NOT make a policy effective: reject any non-default
// request until the underlying runtime actually advertises the capability.
const toleranceWired=Object.hasOwn(getCiiMultiSourceMethodAConfidenceOptions(),'spatialToleranceMm');
if(!toleranceWired && opts.tolerance!==100)
 throw Error('F2_M1_TOLERANCE_UNWIRED_REQUIRES_PR97_PR98: cannot claim 200mm applied on current main');

const sources=opts.sources.map(item=>{
 const index=item.indexOf(':'),sourceId=item.slice(0,index),path=item.slice(index+1);
 if(index<1||!path||sourceId.includes('/')||sourceId.includes('\\'))
  throw Error('F2_INVALID_SOURCE_ID_OR_PATH');
 const bytes=readFileSync(resolve(path));
 return {sourceId,fileName:path.split(/[\\/]/).at(-1),bytes};
});
if(new Set(sources.map(x=>x.sourceId)).size!==sources.length)
 throw Error('F2_DUPLICATE_SOURCE_MEMBER');
const targetBytes=readFileSync(resolve(opts.target));
const claims=opts.manual.map(x=>{
 const bits=x.split(':');
 if(bits.length!==3||!sources.some(s=>s.sourceId===bits[0])
 ||bits.slice(1).some(v=>!v||!/^[0-9]+$/.test(v)))
 throw Error('F2_INVALID_MANUAL_CLAIM:'+x);
 return {sourceId:bits[0],sourceNodeId:bits[1],targetNodeId:bits[2]};
});
const bySource={};
for(const claim of claims)(bySource[claim.sourceId]??=[]).push({
 sourceNodeId:claim.sourceNodeId,targetNodeId:claim.targetNodeId,
});
const input={sources,targetBytes,targetFileName:opts.target.split(/[\\/]/).at(-1)};
const policy={cryptoRef:globalThis.crypto||webcrypto,spatialToleranceMm:opts.tolerance};
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(input,policy);
const automatic={};
for(const member of inspection.memberInspections){
 const choice=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
 if(choice.status!=='READY'||!choice.baseLoops.length)throw Error('F2_AUTO_BASIS_UNAVAILABLE:'+member.sourceId);
 automatic[member.sourceId]=choice.baseLoops;
}
const variants=[
 {mode:'AUTO_ONLY',params:{baseLoopsBySource:automatic}},
 {mode:'UI_MIXED_BASE_PROXY',params:{
  baseLoopsBySource:Object.fromEntries(Object.entries(automatic).filter(([s])=>!bySource[s])),
  anchorPairsBySource:bySource,
 }},
];
const cache=createCiiCommonAnalysisCache(),snapshots=[];
for(const variant of variants){
 const p=await createCiiWriter2SourceSetPreviewFromPreparedSession(
  preparedSession,variant.params,{...policy,commonAnalysisCache:cache});
 const reviewed=Object.fromEntries(p.memberPreviews.map(({sourceId,preview})=>[
  sourceId,{
   reviewedCorrespondenceIds:(preview.compareReview?.rows||[])
    .filter(r=>r.identityBound&&['HIGH','MEDIUM'].includes(r.confidence)).map(r=>r.correspondenceId),
   lockedCorrespondenceIds:(preview.compareReview?.rows||[])
    .filter(r=>r.decision==='LOCKED').map(r=>r.correspondenceId),
   rejectedCorrespondenceIds:[],
  },
 ]));
 const bound=await createCiiWriter2SourceSetPreviewFromPreparedSession(
  preparedSession,{...variant.params,reviewBySource:reviewed},{...policy,commonAnalysisCache:cache});
 const audit=buildCiiSourceTargetAudit(bound);
 snapshots.push({mode:variant.mode,sourceSetSha256:bound.sourceSetSha256,
  originalTargetSha256:bound.targetAuthority.originalSha256,audit});
}
const originals=Object.fromEntries(sources.map(s=>[s.sourceId,hash(s.bytes)]));
const graphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const joint=buildCiiA2ShadowJointEvidence({
 authority:{sourceSetSha256:snapshots[0].sourceSetSha256,
  originalTargetSha256:hash(targetBytes),originalSourceShaById:originals},
 snapshots,manualClaims:claims,sourceGraphsById:graphs,
 targetGraph:preparedSession.target.targetGraph,
});
const paths=inspectCiiA2PhysicalConstraints({
 joint,sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
 normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
 normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
const global=solveCiiA2GlobalShadow({joint,pathAudit:paths});
const normalizedSourceShaById=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256]));
const normalizedTargetSha256=preparedSession.target.normalizedSha256;
const frontier=recoverCiiA2FrontierHypotheses({
 joint,pathAudit:paths,sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
 policy:{maxRounds:2},
});
const reconciled=reconcileCiiA2RecoveredFrontier({
 joint,originalPathAudit:paths,frontier,sourceGraphsById:graphs,
 targetGraph:preparedSession.target.targetGraph,
 normalizedSourceShaById,normalizedTargetSha256,
});
if(frontier.writerReady!==false||reconciled.writerReady!==false
 ||reconciled.certifiedNodeCount!==0||reconciled.certifiedElementCount!==0
 ||reconciled.writeScope!==null||reconciled.transferPlan!==null)
 throw Error('F2_RECOVERED_FRONTIER_WRITER_VETO_VIOLATED');
if(global.writerReady!==false||global.certifiedNodeCount!==0||global.certifiedElementCount!==0
 ||global.transferPlan!==null||global.writeScope!==null
 ||joint.summary.originalPhysicalSourceNodes!==global.originalPhysicalSourceNodeCount)
 throw Error('F2_NONWRITING_OR_PHYSICAL_CENSUS_CONTRACT_FAILED');
const out={
 schema:'CiiARCH01F2JointSolverReport.v1',mode:'SHADOW_REVIEW_ONLY',
 policy:{spatialToleranceMm:opts.tolerance,appliedSpatialToleranceMm:opts.tolerance,
  requestedSpatialToleranceCapability:toleranceWired?'RUNTIME_CONFIGURED':'DEFAULT_100_ONLY',
  qualifiedMethodAScoreLinkPresent:toleranceWired?'REQUIRE_SEPARATE_PR98_PROOF':'NOT_PRESENT_ON_THIS_MAIN_BASE',
  sourceOdAdmissionUnchanged:true},
 custody:{sourceSetSha256:snapshots[0].sourceSetSha256,
  originalTargetSha256:hash(targetBytes),originalSourceShaById:originals},
 originalPhysicalSourceNodeCount:global.originalPhysicalSourceNodeCount,
 originalPhysicalSourceElementCount:global.sourceElementFactorCount,
 modeCensus:snapshots.map(s=>({mode:s.mode,...s.audit.summary})),
 jointClaims:joint.summary,physicalPaths:paths.summary,
 globalConstraints:{components:global.connectedConstraintComponents,
  states:global.componentStates,
  summaries:global.components.map(c=>({state:c.status,sourceNodeCount:c.sourceNodes.length,
   sourceElementCount:c.sourceElements.length,solutionWitnesses:c.distinctSolutionWitnesses,
   searchStates:c.searchStates||0}))},
 frontierRecovery:{
  originalEndpointMissingFactors:frontier.originalMissingPhysicalElementFactors,
  sourceNodesOriginallyUnmapped:frontier.sourceNodesOriginallyUnmapped.length,
  recoveredHypotheses:frontier.proposals.length,
  remainingFactorsWithoutBothEndpointHypotheses:frontier.remainingFactorsWithoutBothEndpointHypotheses,
  searchStatusFlags:frontier.statusFlags,
 },
 frontierReconciliation:{
  originalCandidateCount:reconciled.originalCandidateCount,
  addedCandidateCount:reconciled.addedCandidateCount,
  augmentedCandidateCount:reconciled.augmentedCandidateCount,
  independentlyRecheckedPhysicalWitnesses:reconciled.independentlyRecheckedPhysicalWitnesses,
  uniqueNewlyCoveredNodes:reconciled.uniqueNewlyCoveredNodes,
  originalEndpointMissingFactors:reconciled.originalEndpointMissingFactors,
  recomputedEndpointMissingFactors:reconciled.recomputedEndpointMissingFactors,
  globalComponentStates:reconciled.recomputedGlobalComponentCounts,
  recomputedPhysicalFactorCounts:reconciled.recomputedFactorStatusCounts,
  writerReady:false,certifiedNodeCount:0,
 },
  conflicts:joint.nodeRows.filter(x=>x.state==='CONFLICT').map(x=>({
  source:x.sourceNodeKey,targetAlternatives:x.targets,reasons:x.reasons})),
 originalInputsUnmodified:true,identityCertificates:[],
 certifiedNodeCount:0,certifiedElementCount:0,
 writerReady:false,transferPlan:null,writeScope:null,
 limitations:[
  'AUTO and MANUAL claims are competing hypotheses, not independently certified same physical point',
  'Global assignments are within bounded declared candidate sets, not proof of unique original TARGET identity',
  'Full-source UNKNOWN physical coverage and missing physical engineering revisions remain unresolved',
  'No runtime Compare/Transfer Preview or Writer consumers are enabled by this report',
 ],
};
if(opts.out){
 const dest=resolve(opts.out);
 const rel=relative(process.cwd(),dest).replaceAll('\\','/');
 if(rel==='Benchmark'||rel.startsWith('Benchmark/')||isAbsolute(rel)&&rel.includes('/Benchmark/'))
  throw Error('F2_NEVER_WRITE_TO_ORIGINAL_BENCHMARK');
 mkdirSync(dirname(dest),{recursive:true});
 writeFileSync(dest,JSON.stringify(out,null,2)+'\n','utf8');
}
console.log('CII_F2_JOINT_ORIGINAL_REPORT',JSON.stringify(out));
