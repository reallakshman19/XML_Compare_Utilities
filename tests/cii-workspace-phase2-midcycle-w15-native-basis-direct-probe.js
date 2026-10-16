/**
 * Issue #106 W15: invoke the REAL native Method B evidence evaluator on eight
 * untrusted review hypotheses. This does NOT seed anchors, create AUTO loops,
 * qualify a winner, or promote correspondence/Writer2; the ordinary native
 * production base suggestion/Method A/Winner Gap checks remain mandatory.
 */
import {qualifyCiiMethodBRunBasis} from '../tabs/cii-workspace/cii-workspace-pipe-runs.js';
import {ciiQualifiedLoopsForSuggestion} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {discoverCiiMethodABases,projectCiiMethodAEvidence} from '../tabs/cii-workspace/cii-workspace-anchor-method-a.js';

const id=x=>String(x??'').trim();
const pairKey=(s,t)=>id(s)+'=>'+id(t);
export function probeCiiW15NativeABOnDisputedHypotheses({
 preparedSession,w14,w11Qualification,inspection,
}={}){
 if(preparedSession?.members?.length!==3||
  !preparedSession.target?.targetGraph||
  !Array.isArray(w14?.productionMethodABMissingEvidence)||
  w14.productionMethodABMissingEvidence.length!==8||
  w11Qualification?.rows?.length!==22||
  inspection?.memberInspections?.length!==3)
  throw Error('W15_ORIGINAL_NATIVE_PREPARED_GRAPH_AND_EIGHT_CONFLICTS_REQUIRED');
 const sources=new Map(preparedSession.members.map(x=>[id(x.sourceId),x.sourceGraph]));
 if([...sources.keys()].sort().join(',')!=='S1,S2,S3'||[...sources.values()].some(x=>!x?.nodes?.length))
  throw Error('W15_ALL_NATIVE_SOURCE_GRAPHS_REQUIRED');
 const target=preparedSession.target.targetGraph;
 const byMember=new Map(inspection.memberInspections.map(x=>[
  id(x.sourceId),x.inspection?.baseAnchorSuggestions||[]]));
 const w11=new Map(w11Qualification.rows.map(x=>[x.sourcePhysicalKey,x]));
 const rows=w14.productionMethodABMissingEvidence.map(x=>{
  const member=id(x.sourceMember),src=id(x.sourcePhysicalKey).slice(member.length+1);
  const targetNode=id(x.provisionalOriginalTargetPhysicalNodeId);
  const graph=sources.get(member),audit=w11.get(x.sourcePhysicalKey);
  if(!graph||!audit||audit.identityBound===true||
   id(audit.provisionalOriginalTargetPhysicalNodeId)!==targetNode)
    throw Error('W15_UNTRUSTED_PROPOSAL_AND_SOURCE_CUSTODY_REQUIRED');
  const nativeB=qualifyCiiMethodBRunBasis(graph,target,src,targetNode);
  // Native A is evaluated on pre-existing native candidate pool ONLY:
  // never append the proposed geometrical pair to an anchor triplet.
  const nativeSuggestions=byMember.get(member);
  if(!Array.isArray(nativeSuggestions))throw Error('W15_NATIVE_MEMBER_SUGGESTIONS_MISSING');
  const availableNativeProposal=nativeSuggestions.filter(s=>
   id(s.sourceNodeId)===src&&id(s.targetNodeId)===targetNode);
  const existingALoops=nativeSuggestions.flatMap(s=>
   ciiQualifiedLoopsForSuggestion(s).filter(loop=>loop.method==='METHOD_A_SPATIAL'));
  const genuineAAnchorMembership=existingALoops.filter(loop=>
   loop.anchorPairs.some(p=>pairKey(p.sourceNodeId,p.targetNodeId)===pairKey(src,targetNode)));
  const requiredAxes=2;
  const sourceAxes=Number(nativeB.source?.independentAxisRunCount||0);
  const targetAxes=Number(nativeB.target?.independentAxisRunCount||0);
  const realMethodBBasisQualified=nativeB.status==='READY'&&sourceAxes>=requiredAxes&&
    targetAxes>=requiredAxes&&nativeB.compatibleBasisCount>0;
  const nativeBasisOnlyNoWinnerGapAuthority=realMethodBBasisQualified&&
    availableNativeProposal.length===0;
  const reasons=[];
  if(sourceAxes<2)reasons.push('NATIVE_B_SOURCE_INDEPENDENT_AXIS_RUN_COUNT_BELOW_TWO');
  if(targetAxes<2)reasons.push('NATIVE_B_TARGET_INDEPENDENT_AXIS_RUN_COUNT_BELOW_TWO');
  if(nativeB.status!=='READY')reasons.push('NATIVE_B_'+id(nativeB.reason));
  if(!genuineAAnchorMembership.length)reasons.push('NATIVE_A_NO_EXISTING_QUALIFIED_BASE_CONTAINING_EXACT_PAIR');
  if(!availableNativeProposal.length)reasons.push('NO_NATIVE_DISCOVERED_PAIR_OR_MUTUAL_BEST_WINNER_GAP_EVIDENCE');
  if(!audit.provenanceAndProductionIdentitySupported)
    reasons.push('ACTUAL_PRODUCTION_METHOD_AB_IDENTITY_NOT_BOUND');
  if(audit.targetPhysicalCustodyUncontested===false)
    reasons.push('GLOBAL_TARGET_CONFLICT');
  return {sourcePhysicalKey:x.sourcePhysicalKey,provisionalTargetNodeId:targetNode,
    productionReviewedTargetNodeIds:x.productionReviewedTargetPhysicalNodeIds,
    nativeSourceIndependentAxisRunCount:sourceAxes,
    nativeTargetIndependentAxisRunCount:targetAxes,
    nativeMethodBStatus:nativeB.status,nativeMethodBReason:nativeB.reason,
    nativeMethodBCompatibleIndependentBasisCount:nativeB.compatibleBasisCount,
    nativeMethodBCompatibleDimension:nativeB.weight?.compatibleDimension||null,
    nativeMethodBOdScaledToleranceMm:nativeB.tolerancePolicy?.toleranceMm??null,
    nativeMethodBOdReferenceMm:nativeB.tolerancePolicy?.odRefMm??null,
    nativeMethodBSelectedBasis:nativeB.selectedBasis?{
      compatibleIndependentRunCount:nativeB.selectedBasis.compatibleIndependentRunCount,
      maxNormalizedGeometricError:nativeB.selectedBasis.maxNormalizedGeometricError,
      runMapping:nativeB.selectedBasis.runMapping,
    }:null,
    nativeMethodBPhysicalRunBasisQualified:realMethodBBasisQualified,
    nativeMethodBRunBasisAloneCannotQualifyAnchor:true,
    productionNativeDiscoveredExactPairCount:availableNativeProposal.length,
    nativeMethodAExistingQualifiedBaseContainingPairCount:genuineAAnchorMembership.length,
    nativeRequiredWinnerGap:8,
    nativeWinnerGapForExactPair:availableNativeProposal.length?
      availableNativeProposal.map(y=>y.winnerGap??null):[],
    noNativeSuggestionStillGatesQualification:!availableNativeProposal.length,
    originalProductionIdentityBound:false,
    nativeIndependentPhysicalQualificationMissing:reasons,
    physicalCreditGranted:false,
    scope:'DIRECT_UNTRUSTED_NATIVE_BASIS_PROBE_NOT_ANCHOR_SELECTION_OR_METHOD_B_READY_BASE',
  };
 });
 const totals={
  eightDisputedPhysicalPairs:rows.length,
  sourceMissingSecondAxis:rows.filter(r=>r.nativeSourceIndependentAxisRunCount<2).length,
  targetMissingSecondAxis:rows.filter(r=>r.nativeTargetIndependentAxisRunCount<2).length,
  nativeBRunBasisReady:rows.filter(r=>r.nativeMethodBPhysicalRunBasisQualified).length,
  nativeBRunBasisReview:rows.filter(r=>!r.nativeMethodBPhysicalRunBasisQualified).length,
  existingAQualifiedBaseContainingExactPair:rows.filter(r=>r.nativeMethodAExistingQualifiedBaseContainingPairCount>0).length,
  nativeExactPairDiscovered:rows.filter(r=>r.productionNativeDiscoveredExactPairCount>0).length,
  nativeExactPairWithProvedWinnerGap:rows.filter(r=>
    r.nativeWinnerGapForExactPair.some(g=>Number.isFinite(g)&&g>=r.nativeRequiredWinnerGap)).length,
  addedIndependentPhysicalNodeMatches:0,
 };
 return {schema:'CiiMidcycleW15NativeUntrustedEightHypothesisABEvidence.v1',
  originalSourceCount:150,originalTargetCount:1619,
  unchangedMethodBTwoIndependentAxisRequirement:2,unchangedWinnerGap:8,
  details:rows,totals,methodAGeometryHypothesisInjected:false,
  methodBProposedPairOnlyExaminedNotUsedAsLiveAnchor:true,
  newProductionBaseLoops:0,newWriter2Authority:0,
  separateOriginal428AcceptancePreserved:true};
}
