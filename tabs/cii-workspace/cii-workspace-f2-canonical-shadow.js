/**
 * ARCH-01/F2: the one read-only canonical A2 graph pipeline for browser and Node.
 * No second graph solver, physical identity certificate, Transfer Preview or Writer.
 * Input contains two independently prepared same-source/target audit snapshots;
 * manual assertions are retained even when excluded by ACTIVE Compare mode.
 */
import {buildCiiF2PhysicalGapLedger} from './cii-workspace-f2-physical-gap-ledger.js';
import {buildCiiA2ShadowJointEvidence} from '../../scripts/cii-architecture-a2-shadow-joint-evidence.mjs';
import {inspectCiiA2PhysicalConstraints} from '../../scripts/cii-architecture-a2-physical-path-constraints.mjs';
import {solveCiiA2GlobalShadow} from '../../scripts/cii-architecture-a2-global-constraint-shadow.mjs';
import {recoverCiiA2FrontierHypotheses} from '../../scripts/cii-architecture-a2-frontier-recovery.mjs';
import {reconcileCiiA2RecoveredFrontier} from '../../scripts/cii-architecture-a2-frontier-reconciliation.mjs';

export function computeCiiF2CanonicalShadow(input={}){
 const {authority,snapshots,manualClaims=[],sourceGraphsById,targetGraph,
  normalizedSourceShaById,normalizedTargetSha256}=input;
 const joint=buildCiiA2ShadowJointEvidence({
  authority,snapshots,manualClaims,sourceGraphsById,targetGraph});
 const physical=inspectCiiA2PhysicalConstraints({
  joint,sourceGraphsById,targetGraph,normalizedSourceShaById,normalizedTargetSha256});
 const global=solveCiiA2GlobalShadow({joint,pathAudit:physical});
 const frontier=recoverCiiA2FrontierHypotheses({
  joint,pathAudit:physical,sourceGraphsById,targetGraph,policy:{maxRounds:2}});
 const reconciled=reconcileCiiA2RecoveredFrontier({
  joint,originalPathAudit:physical,frontier,sourceGraphsById,
  targetGraph,normalizedSourceShaById,normalizedTargetSha256});
 const physicalGapLedger=buildCiiF2PhysicalGapLedger(physical,reconciled,{joint,frontier});
 for(const item of [joint,physical,global,frontier,reconciled]){
  if(item.writerReady!==false&&item.writerDispatchInstalled!==false)
   throw Error('F2_CANONICAL_NON_WRITER_CONTRACT_BROKEN');
  if(item.transferPlan!==undefined&&item.transferPlan!==null)
   throw Error('F2_CANONICAL_TRANSFER_PLAN_NOT_ALLOWED');
  if(item.writeScope!==undefined&&item.writeScope!==null)
   throw Error('F2_CANONICAL_SCOPE_NOT_ALLOWED');
 }
 const nodeRows=joint.nodeRows.map(x=>({
  sourceNodeKey:x.sourceNodeKey,state:x.state,
  targetAlternatives:x.targets,reasons:x.reasons,
 }));
 return Object.freeze({
  schema:'CiiF2CanonicalBrowserShadow.v1',
  status:'SHADOW_ONLY_NOT_PHYSICALLY_CERTIFIED',
  provenance:joint.provenance,
  summary:{
   originalPhysicalSourceNodes:joint.summary.originalPhysicalSourceNodes,
   jointHypotheses:joint.hypotheses.length,
   conflictingSourceNodes:nodeRows.filter(x=>x.state==='CONFLICT').length,
   originalPhysicalElementFactors:physical.summary?.originalPhysicalSourceElements
    ?? global.sourceElementFactorCount,
   originalMissingEndpointFactors:frontier.originalMissingPhysicalElementFactors,
   recoveredHypotheses:frontier.proposals.length,
   uniqueNewlyCoveredNodes:reconciled.uniqueNewlyCoveredNodes,
   factorsWithoutTwoEndpointsAfterRecovery:frontier.remainingFactorsWithoutBothEndpointHypotheses,
   independentlyRecheckedPhysicalWitnesses:reconciled.independentlyRecheckedPhysicalWitnesses,
   globalComponentStates:global.componentStates,
  },
  rows:nodeRows,frontier:frontier.proposals,physicalGapLedger,
  physicalConstraintSummary:physical.summary,
  globalConstraints:global.components.map(c=>({status:c.status,
   sourceNodeCount:c.sourceNodes.length,
   sourceElementCount:c.sourceElements.length,
   searchStates:c.searchStates||0})),
  writerReady:false,physicalIdentityCertified:false,
  certifiedNodeCount:0,certifiedElementCount:0,
  transferPlan:null,writeScope:null,correspondenceCertificates:[],
 });
}
