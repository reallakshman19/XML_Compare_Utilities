/**
 * Owner Phase2 exact retained S1/S2/S3/T diagnostic.
 * NEVER imports expected labels into a matcher or turns lexical agreement or
 * legacy identityBound into globally validated physical correspondence.
 * Independent physical proof and SOURCE-member occurrence adjudication are
 * mandatory before publishing P2_VALIDATED_RECALL.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit} from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import { buildCiiOwnerOriginalNodeNameIndexes, resolveCiiOwnerPhase2RowsByOriginalNodeName } from './cii-workspace-phase2-owner-nodename-index.js';
import {reconcileCiiOwnerMidCyclePhysicalRows} from './cii-workspace-phase2-owner-midcycle-forensics.js';
import {scoreCiiOwnerPhysicalCandidateCoverage} from './cii-workspace-phase2-owner-conditional-coverage.js';
import {scoreCiiOwnerPhase2PhysicalAcceptance} from './cii-workspace-phase2-owner-physical-acceptance.js';
import {scoreCiiMidcycle150} from './cii-workspace-phase2-midcycle150-score.js';
import {buildCiiMidcycle150OriginalPathWitnesses} from './cii-workspace-phase2-midcycle150-original-path-witness.js';
import {verifyCiiMidcycle150GlobalOriginalShape} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';
import {buildCiiMidcycle150OwnerGoldenCertificates} from './cii-workspace-phase2-midcycle150-owner-golden-certificates.js';
import {verifyCiiMidcycle150RootedCorrespondences} from './cii-workspace-phase2-midcycle150-rooted-verify.js';
import {diagnoseCiiMidcycle150Unverified} from './cii-workspace-phase2-midcycle150-unverified-forensics.js';
import {reviewCiiMidcycleW11ProductionQualification} from './cii-workspace-phase2-midcycle-w11-qualification-audit.js';
import {investigateCiiMidcycleW12OriginalPaths} from './cii-workspace-phase2-midcycle-w12-original-path-review.js';
import {adjudicateCiiW13OriginalEvidence} from './cii-workspace-phase2-midcycle-w13-actual-element-type-and-target-arbitration.js';
import {diagnoseCiiW14MethodABMissingEvidence} from './cii-workspace-phase2-midcycle-w14-methodab-registration-review.js';

const files=['S1.CII','S2.CII','S3.CII'].map((fileName,i)=>({
  sourceId:'S'+(i+1),fileName,bytes:readFileSync(new URL('../Benchmark/'+fileName,import.meta.url)),
}));
const targetBytes=readFileSync(new URL('../Benchmark/T.CII',import.meta.url));
const raw=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url),'utf8'));
assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.originalUploadSha256);
const decision=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-confirmed-direction.json',import.meta.url),'utf8'));
assert.equal(decision.ownerConfirmedDirection,true);
assert.equal(decision.rawFixtureOriginalSha256,manifest.originalUploadSha256);
assert.equal(decision.freezeOriginalRows,428);
assert.equal(decision.acceptedSource,'S1/S2/S3 physical NODE with NodeName = original column 2 SL');
assert.equal(decision.acceptedTarget,'T physical NODE with NodeName = original column 1 PS');
const originals=raw.toString('utf8').split(/\r?\n/).map((line,index)=>({line,index})).filter(x=>/^(PS\S+)\s+(SL\S+)\s*$/.test(x.line.trim())).map(({line,index},i)=>{
  const match=line.trim().match(/^(PS\S+)\s+(SL\S+)$/);
  return {ordinal:i+1,originalLine:index+1,rawSourceLabel:match[1],rawTargetLabel:match[2]};
});
assert.equal(originals.length,428);
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge({
  sources:files,targetBytes,targetFileName:'T.CII',
},{cryptoRef:globalThis.crypto||webcrypto});
const loops={};const choices=[];
for(const member of inspection.memberInspections){
  const choice=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
  choices.push({sourceId:member.sourceId,status:choice.status,confidence:choice.confidence||null,basisMethod:choice.basisMethod||null});
  if(choice.status==='READY')loops[member.sourceId]=choice.baseLoops;
}
const preview=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
  baseLoopsBySource:loops,
},{cryptoRef:globalThis.crypto||webcrypto,pathTotalLengthToleranceMm:100});
const audit=buildCiiSourceTargetAudit(preview);
// The owner table contains NodeName labels, NOT physical NODE numbers.
// Build from original CII fixed-field NODENAME pointers; never compare label to
// a numeric node ID or infer SOURCE member from owner row order.
const pathWitness=buildCiiMidcycle150OriginalPathWitnesses({
  originalSources:files,originalTarget:targetBytes,audit,
  pathTotalLengthToleranceMm:100,
});
const globalShape=verifyCiiMidcycle150GlobalOriginalShape({
 originalSources:files,originalTarget:targetBytes,audit,localPathWitness:pathWitness,
});
const originalIndexes=buildCiiOwnerOriginalNodeNameIndexes(files,targetBytes);
assert.deepEqual(originalIndexes.sourceStats.map(r=>r.physicalNodeCount),[57,47,46]);
assert.equal(originalIndexes.targetStats.physicalNodeCount,1619);
const resolved=resolveCiiOwnerPhase2RowsByOriginalNodeName(originals,originalIndexes,{
  ownerConfirmedSlSourceToPsTarget:decision.ownerConfirmedDirection,
});
assert.equal(resolved.ownerDirectionReinterpretationAuthorized,true);
const originalOwnerCertificates=buildCiiMidcycle150OwnerGoldenCertificates({
  resolvedOwnerRows:resolved.rows,audit,localPathWitness:pathWitness,
  originalSourceSetSha256:inspection.sourceSet.sourceSetSha256,
  originalTargetSha256:inspection.versionBridge.target.originalSha256,
  ownerConfirmedDirection:decision.ownerConfirmedDirection,
});
const rooted=verifyCiiMidcycle150RootedCorrespondences({
 originalSources:files,originalTarget:targetBytes,audit,
 ownerCertificates:originalOwnerCertificates,globalShape,
 localPathWitness:pathWitness,
 originalSourceSetSha256:inspection.sourceSet.sourceSetSha256,
 originalTargetSha256:inspection.versionBridge.target.originalSha256,
});
const unverifiedForensics=diagnoseCiiMidcycle150Unverified({
 originalSources:files,originalTarget:targetBytes,audit,rooted,
});
assert.equal(unverifiedForensics.unverifiedSourcePhysicalNodeCount,45);
assert.deepEqual(unverifiedForensics.unverifiedByMember.map(r=>r.unverified),[22,11,12]);
const w11Qualification=reviewCiiMidcycleW11ProductionQualification({
 forensics:unverifiedForensics,audit,rooted,
 compareReview:preview.compareReview,memberPreviews:preview.memberPreviews,
});
assert.equal(w11Qualification.leadCount,22);
assert.equal(w11Qualification.newIndependentlyCertifiedPhysicalNodeCount,0);
const w11NoCandidate=unverifiedForensics.rows.filter(r=>
 r.status==='NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY');
assert.equal(w11NoCandidate.length,23);
const w12Original=investigateCiiMidcycleW12OriginalPaths({
 originalSources:files,originalTarget:targetBytes,audit,rooted,
 forensics:unverifiedForensics,w11Qualification,
 pathTotalLengthToleranceMm:100,
});
assert.equal(w12Original.counts.countNoCandidate,23);
assert.equal(w12Original.counts.differentTReviewCases,8);
assert.equal(w12Original.counts.addedCertifiedPhysicalMatches,0);
const w13Actual=adjudicateCiiW13OriginalEvidence({
 originalSources:files,originalTarget:targetBytes,w12:w12Original,
 w11Qualification,immutable100mmTolerance:100,
});
assert.equal(w13Actual.summary.originalSegmentationProxyCount,1);
assert.equal(w13Actual.summary.threeSignedVectorFailuresInvestigated,3);
assert.equal(w13Actual.summary.eightProductionTargetConflictsInvestigated,8);
assert.equal(w13Actual.summary.addedIndependentlyCertifiedPhysicalPairs,0);
const w14NativeEvidence=diagnoseCiiW14MethodABMissingEvidence({
 w11Qualification,w13:w13Actual,w12:w12Original,rooted,
 originalSources:files,originalTarget:targetBytes,
 suggestionsByMember:Object.fromEntries(inspection.memberInspections.map(member=>[
   member.sourceId,member.inspection?.baseAnchorSuggestions||[],
 ])),
});
assert.equal(w14NativeEvidence.totals.eightOriginalProductionTargetConflicts,8);
assert.equal(w14NativeEvidence.totals.originalDisplacementCases,3);
assert.equal(w14NativeEvidence.totals.newIndependentNodeCredits,0);




const midcycle150=scoreCiiMidcycle150({
  originalSourcePhysicalNodeCount:150,
  originalSourceSetSha256:inspection.sourceSet.sourceSetSha256,
  originalTargetSha256:inspection.versionBridge.target.originalSha256,
  audit,independentCertificates:rooted.certificates,
  originalLocalPathWitnesses:pathWitness,
});
assert.equal(midcycle150.denominator,150);
assert.equal(midcycle150.requiredValidatedPhysicalPairs,105);
assert.equal(midcycle150.autoBoundCandidateCount,105);
assert.equal(midcycle150.originalLocalRouteWitnessNodeCount,105);
assert.equal(midcycle150.originalLocalRoute70PercentReached,true);
// Original Owner-verified correspondences qualify individually; BOUND alone
// and neighbor-conditioned original local geometry do not auto-award credits.
assert(midcycle150.independentCertificateCount>=33);
assert.equal(midcycle150.independentCertificateCount,rooted.independentlyRootedVerifiedPhysicalNodes);
assert.equal(midcycle150.thresholdMet,rooted.strict70PercentPhysicalGoalMet);

const observedBySourceId=new Map(audit.rows.map(row=>[String(row.rowKey),row]));
function legacyObserved(resolution) {
  const matching=resolution.candidatePairs.filter(pair=>{
    const auditRow=observedBySourceId.get(pair.sourceMemberId+':'+pair.sourcePhysicalNodeId);
    return auditRow?.identityBound===true && (auditRow.targetNodeIds||[]).some(t=>String(t)===pair.targetPhysicalNodeId);
  });
  return matching;
}
const diagnostics=resolved.rows.map(row=>{
  const declaredLegacy=legacyObserved(row.declared);
  const transposedLegacy=legacyObserved(row.transposedDiagnostic);
  return Object.freeze({
    ...row,
    sourceMemberCandidates:row.transposedDiagnostic.sourceMembers,
    sourcePhysicalNodeCandidates:row.transposedDiagnostic.sourceNodeIds,
    targetPhysicalNodeCandidates:row.transposedDiagnostic.targetNodeIds,
    sourceCandidateCount:row.transposedDiagnostic.sourceLookupCount,
    targetCandidateCount:row.transposedDiagnostic.targetLookupCount,
    uniquelyAttributed:row.transposedDiagnostic.uniquePhysicalPair,
    legacyBoundAndLabelAgreement:declaredLegacy.length>0,
    ownerConfirmedBoundAgreement:transposedLegacy.length>0,
    transposedLegacyBoundAndLabelAgreement:transposedLegacy.length>0,
    observedDeclaredLegacyPairs:declaredLegacy,
    observedTransposedLegacyPairs:transposedLegacy,
    discrepancy:row.transposedDiagnostic.status,
    physicalValidationTier:'OWNER_NODENAME_RESOLUTION_NOT_INDEPENDENT_SOLVER_PROOF',
    verifiedPhysicalCorrespondence:false,
  });
});
const midCycle=reconcileCiiOwnerMidCyclePhysicalRows(diagnostics,{
  ownerConfirmedSlSourceToPsTarget:decision.ownerConfirmedDirection,
});
assert.equal(midCycle.ownerApprovedTranspose,true);
// In TEST ONLY, score Owner-CONFIRMED SL source -> PS target physical pairs
// independently against complete matcher-generated physical source-node audit.
// The Owner fixture remains in its ORIGINAL PS-first, SL-second byte order.
const reverseConditional=scoreCiiOwnerPhysicalCandidateCoverage(
  midCycle.directionReversalDiagnostic.rows,audit,{originalDenominator:428,
    ownerApprovedOrientation:decision.ownerConfirmedDirection,
    sourceSetOriginalSha256:inspection.sourceSet.sourceSetSha256,
    targetOriginalSha256:inspection.versionBridge.target.originalSha256,
  });
const declaredConditional=scoreCiiOwnerPhysicalCandidateCoverage(
  midCycle.asWritten.rows,audit,{originalDenominator:428,
    sourceSetOriginalSha256:inspection.sourceSet.sourceSetSha256,
    targetOriginalSha256:inspection.versionBridge.target.originalSha256,
  });
assert.equal(declaredConditional.physicallyLocatableUniqueNameRows,0);
assert.equal(reverseConditional.physicallyLocatableUniqueNameRows,33);
assert.equal(reverseConditional.distinctPhysicalOraclePairs,33);
// Keep this as a diagnostic snapshot, NOT a declared 70% PASS.
assert.equal(reverseConditional.P2_VALIDATED_RECALL,null);
assert.equal(reverseConditional.phase2SeventyPercentQualified,false);
const acceptance=scoreCiiOwnerPhase2PhysicalAcceptance({
  ownerRows:428,originalSourcePhysicalNodeCount:audit.summary.totalSourceNodes,
  originalTargetPhysicalNodeCount:originalIndexes.targetStats.physicalNodeCount,
  ownerDirectionConfirmed:decision.ownerConfirmedDirection,physicalCoverage:reverseConditional,
});
assert.equal(acceptance.requiredValidatedPhysicalRowCredits,300);
assert.equal(acceptance.maxIndependentPhysicalRowCredits,150);
assert.equal(acceptance.acceptanceStatus,'FAIL_STRUCTURALLY_UNATTAINABLE_ON_PINNED_FILES');

const count=predicate=>diagnostics.filter(predicate).length;
const agreement=count(row=>row.legacyBoundAndLabelAgreement);
const transposedAgreement=count(row=>row.transposedLegacyBoundAndLabelAgreement);
const bySourcePhysicalId=new Map();
for(const row of diagnostics.filter(r=>r.ownerConfirmedBoundAgreement))
  for(const pair of row.observedTransposedLegacyPairs){
    const key=pair.sourceMemberId+':'+pair.sourcePhysicalNodeId;
    if(!bySourcePhysicalId.has(key))bySourcePhysicalId.set(key,[]);
    bySourcePhysicalId.get(key).push(row.ownerOrdinal);
  }
const manyRows=[...bySourcePhysicalId].filter(([,ids])=>ids.length>1).map(([sourceKey,ids])=>({sourceKey,ownerOrdinals:ids}));
const report={
  schema:'CiiPhase2OwnerBenchmarkDiagnostic.v1',
  status:'FAIL_STRUCTURALLY_UNATTAINABLE_ON_PINNED_FILES',
  ownerConfirmedSourceTargetDirection:'SL_S1_S2_S3_TO_PS_T',
  physicalOneToOneAcceptance:acceptance,
  midcycle150PhysicalAcceptance:midcycle150,
  midcycle150OriginalPathWitnessSummary:pathWitness.summary,
  midcycleW14MissingNativeMethodABAndRegistration:{
    totals:w14NativeEvidence.totals,
    originalCiiRegistration:w14NativeEvidence.rawCoordinateEvidence,
    independentCredit:0,
  },
  midcycleW13OriginalElementTypesAndTargetArbitration:{
    summary:w13Actual.summary,
    newIndependentCredits:0,
    productionMatcherUnchanged:true,
  },
  midcycleW12OriginalRevisionAndCompetingTarget:{
    sourcePopulation:w12Original.sourcePopulation,
    certifiedBaseline:w12Original.certifiedMidcycle150Baseline,
    totals:w12Original.counts,perSource:w12Original.sourcePerMember,
    newIndependentCredits:0,
  },
  midcycleW11OriginalGeometryVsProductionReview:{
    leadCount:w11Qualification.leadCount,
    dispositions:w11Qualification.dispositionCounts,
    targetClaimConflicts:w11Qualification.conflictTargets,
    stageRootCauses:unverifiedForensics.geometryRootCauseCounts,
    newIndependentlyCertifiedPhysicalNodes:0,
  },
  midcycle150UnverifiedForensicsSummary:{
    unverified:unverifiedForensics.unverifiedSourcePhysicalNodeCount,
    perMember:unverifiedForensics.unverifiedByMember,
    reasonCounts:unverifiedForensics.reasonCounts,
    newlyCreditedPhysicalNodes:0,
  },
  midcycle150RootedIndependentPhysicalSummary:{
    ownerSeeds:rooted.ownerGoldenSeeds,
    globalShapeSeeds:rooted.additionalExhaustiveGlobalGeometrySeeds,
    verified:rooted.independentlyRootedVerifiedPhysicalNodes,
    unresolved:rooted.unresolvedBoundPhysicalNodes,
    perMember:rooted.sourcePerMember,
    thresholdMet:rooted.strict70PercentPhysicalGoalMet,
  },
  midcycle150IndependentGlobalShapeSummary:{
    validatedUniqueOriginalGeometryNodes:globalShape.validatedUniqueOriginalGeometryNodes,
    validatedPerSource:globalShape.validatedPerSource,
    completeOriginalGraphComponentsSearched:globalShape.completeOriginalGraphComponentsSearched,
    ambiguousOriginalGeometryComponents:globalShape.ambiguousOriginalGeometryComponents,
    originalTargetCoordinateCycleConflicts:globalShape.originalTargetCoordinateCycleConflicts,
  },
  originalOwnerInputSha256:manifest.originalUploadSha256,
  originalBenchmarkRows:428,requiredValidatedRows:300,targetValidatedRecall:0.70,
  sourceSetOriginalSha256:inspection.sourceSet.sourceSetSha256,
  targetOriginalSha256:inspection.versionBridge.target.originalSha256,
  sourcePhysicalNodeCensus:audit.summary.totalSourceNodes,
  sourcePhysicalNodePerMember:audit.summary.bySource.map(r=>({sourceId:r.sourceId,nodeCount:r.enumeratedNodeCount,bound:r.BOUND,ambiguous:r.AMBIGUOUS,unresolved:r.UNRESOLVED,unemitted:r.UNEMITTED})),
  targetPhysicalNodeCensus:preparedSession.target.targetGraph.nodes.length,
  autoChoices:choices,
  physicalCandidateCorrespondenceStatus:preview.correspondence.status,
  conditionalOriginalPhysicalCoverage:{
    asWritten:{...declaredConditional,rows:undefined},
    ownerConfirmedSlToPs:{...reverseConditional,rows:undefined},
    originalOwnerDenominator:428,
    ownerApprovedOrientation:true,
    phase2Acceptance:'FAIL_ONE_TO_ONE_150_NODE_CAP_300_REQUIRED',
  },
  midCycleReconciliationSummary:{
    ownerDirectionConfirmed:true,
    asWritten:{...midCycle.asWritten,rows:undefined},
    reversed:{...midCycle.directionReversalDiagnostic,rows:undefined},
  },
  originalCiiNodeNameSourceStats:resolved.sourceStats,
  originalCiiNodeNameTargetStats:resolved.targetStats,
  asDeclaredOwnerNodeNameResolution:resolved.asDeclared,
  transposedOwnerNodeNameDiagnostic:resolved.transposedDiagnostic,
  transposedNodeNameLegacyAgreement:transposedAgreement,
  transposedLexicallyResolvedAndSolverAgreed:transposedAgreement,
  transposedResolvedAndSolverAgreedFractionOfOriginalRows:transposedAgreement/428,
  transposedExamples:diagnostics.filter(r=>r.transposedDiagnostic.uniquePhysicalPair)
    .slice(0,12).map(r=>({ownerOrdinal:r.ownerOrdinal,
      sourceNodeName:r.rawTargetLabel,targetNodeName:r.rawSourceLabel,
      sourcePhysicalKey:r.transposedDiagnostic.candidatePairs[0].sourceMemberId+':'+r.transposedDiagnostic.candidatePairs[0].sourcePhysicalNodeId,
      targetPhysicalNodeId:r.transposedDiagnostic.candidatePairs[0].targetPhysicalNodeId,
      observedSolverPairAgreement:r.transposedLegacyBoundAndLabelAgreement})),
  observedLegacyBoundWithNameAgreement:transposedAgreement,
  asWrittenButSupersededAgreement:agreement,
  observedLegacyAgreementFractionOfOwnerInput:transposedAgreement/428,
  rowsWithSourceLabelFound:resolved.transposedDiagnostic.sourceNameFound,rowsWithTargetLabelFound:resolved.transposedDiagnostic.targetNameFound,
  rowsWithBothLabelsFound:resolved.transposedDiagnostic.bothNamesFound,
  rowsMissingSourceLabel:resolved.transposedDiagnostic.noSourceName,rowsMissingTargetLabel:resolved.transposedDiagnostic.noTargetName,
  rowsUniquelyAttributedByLabels:count(r=>r.uniquelyAttributed),
  sourcePhysicalNodesWithRepeatedLegacyOwnerCredits:manyRows,
  independentGlobalPhysicalValidatedCount:null,
  P2_VALIDATED_RECALL:null,
  Phase2ThresholdMet:false,
  physicallyValidatedCreditingRule:'OWNER_CONFIRMED_SL_TO_PS; ONE_UNIQUE_SOURCE_MEMBER_NODE_AND_ONE_UNIQUE_TARGET_NODE_PER_CREDIT; REUSED_SOURCE_TARGET_AND_CONFLICTS_VETOED; NOT_NAME_ONLY',
  note:'Owner confirms source=SL in S1/S2/S3, target=PS in T, despite original input PS then SL ordering. Exact bytes/428 rows remain unchanged. 33 independently AUTO-bound name-resolved pairs are a conditional diagnostic; strict certified R is not established. One-to-one 150-node upper bound makes original >=300/428 structurally unattainable on the pinned source files.',
};
const root=new URL('../test-results/cii-phase2/',import.meta.url);
mkdirSync(root,{recursive:true});
writeFileSync(new URL('midcycle150-assessment.json',root),JSON.stringify({
  score:midcycle150,pathWitnessSummary:pathWitness.summary,
  physicalCertificationPolicy:'BOUND != independently physically certified; original local path length is nonexclusive',
},null,2)+'\n');
writeFileSync(new URL('midcycle150-original-path-witnesses.json',root),JSON.stringify(pathWitness,null,2)+'\n');
writeFileSync(new URL('midcycle150-owner-physical-golden-certificates.json',root),JSON.stringify(originalOwnerCertificates,null,2)+'\n');
writeFileSync(new URL('midcycle150-trusted-root-physical-verified.json',root),JSON.stringify(rooted,null,2)+'\n');
writeFileSync(new URL('midcycle150-unverified-45-original-geometry-forensics.json',root),
  JSON.stringify(unverifiedForensics,null,2)+'\n');
const unresolvedColumns=['sourcePhysicalKey','sourceMemberId','sourcePhysicalNodeId',
  'originalSourceNodeName','matcherState','matcherReasons','originalSourceDegree',
  'trustedOriginalPhysicalRootsExamined','originalTargetPhysicalCandidateCount',
  'candidateOriginalTargetNodeIds','status','independentlyCertified'];
const unresolvedCell=value=>'"'+String(value&&typeof value==='object'?JSON.stringify(value):value??'').replace(/"/g,'""')+'"';
writeFileSync(new URL('midcycle150-unverified-45-original-geometry-forensics.csv',root),
 [unresolvedColumns.join(','),...unverifiedForensics.rows.map(r=>
 unresolvedColumns.map(k=>unresolvedCell(r[k])).join(','))].join('\n')+'\n');

const candidateCols=['sourcePhysicalKey','originalSourceNodeName','matcherState',
 'matcherReasons','candidateTargetPhysicalNodeId','vettedPhysicalIdentity','nextRequiredStep'];
writeFileSync(new URL('midcycle150-priority-22-original-T-candidate-leads.csv',root),
 [candidateCols.join(','),...unverifiedForensics.priorityCandidates.map(r=>
 candidateCols.map(k=>unresolvedCell(r[k])).join(','))].join('\n')+'\n');
writeFileSync(new URL('midcycle150-independent-global-shape.json',root),JSON.stringify(globalShape,null,2)+'\n');
writeFileSync(new URL('midcycle-w11-22-candidates-vs-production-review.json',root),
  JSON.stringify(w11Qualification,null,2)+'\n');
writeFileSync(new URL('midcycle-w11-23-no-candidate-stage-root-causes.json',root),
  JSON.stringify({
    schema:'CiiMidcycleW11OriginalGeometryStageVetoBreakdown.v1',
    originalSourceCensus:150,missingCandidateCount:23,
    stageReasonCounts:unverifiedForensics.geometryRootCauseCounts,
    rows:w11NoCandidate,
    noIdentityCreditsFromThisReport:true,
  },null,2)+'\n');
writeFileSync(new URL('midcycle-w12-original-revision-geometry-and-eight-competing-targets.json',root),
 JSON.stringify(w12Original,null,2)+'\n');
writeFileSync(new URL('midcycle-w13-original-element-type-segment-vector-methodab.json',root),
 JSON.stringify(w13Actual,null,2)+'\n');
writeFileSync(new URL('midcycle-w14-native-methodab-and-original-cii-coordinate-registration.json',root),
 JSON.stringify(w14NativeEvidence,null,2)+'\n');
const w14MethodCols=['sourcePhysicalKey','provisionalOriginalTargetPhysicalNodeId',
 'productionReviewedTargetPhysicalNodeIds','productionMatcherState','productionMatcherConfidence',
 'exactNativeAutoSuggestionCount','sameSourceOtherNativeSuggestions','missingIndependentEvidence',
 'independentlyCertifiedNewMatch'];
writeFileSync(new URL('midcycle-w14-eight-missing-native-methodab-evidence.csv',root),
 [w14MethodCols.join(','),...w14NativeEvidence.productionMethodABMissingEvidence.map(row=>
 w14MethodCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');
const w14FrameCols=['sourcePhysicalKey','sourceCiiCoordSeeds','targetCiiCoordSeeds',
 'sourceUnitsMm','targetUnitsMm','originalSourceComponentHasAbsoluteRegistration',
 'originalCoordinateTransformApproved','newlyCreditedPhysicalPair'];
writeFileSync(new URL('midcycle-w14-three-original-coordinate-registration.csv',root),
 [w14FrameCols.join(','),...w14NativeEvidence.originalCiiAbsoluteRegistrationAndDisplacements.map(row=>
 w14FrameCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');
const w13SplitCols=['sourcePhysicalKey','status','reportedProxyCount','witnessCount','newCertifiedMatches'];
writeFileSync(new URL('midcycle-w13-segmented-run-element-type-receipts.csv',root),
 [w13SplitCols.join(','),...w13Actual.segmentedRunElementTypeChecks.map(row=>
  w13SplitCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');
const w13VectorCols=['sourcePhysicalKey','originalLengthCompatibleAlternatives','disposition','grantedNewBinding'];
writeFileSync(new URL('midcycle-w13-three-original-displacement-frame-checks.csv',root),
 [w13VectorCols.join(','),...w13Actual.signedDisplacementFrameChecks.map(row=>
  w13VectorCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');
const w13ConflictCols=['sourcePhysicalKey','originalHypothesisTarget','productionReviewedTargets',
  'reviewedProductionSourceCorrespondenceStatus',
  'productionOriginalGeometryAnyRootPass','hypothesisOriginalGeometryAllRootsPass',
  'alternateOriginalGeometryAllRootsPass','productionMethodABPhysicalAuthorityEstablished',
  'acceptedNewPhysicalMatch','disposition'];
writeFileSync(new URL('midcycle-w13-eight-production-methodab-target-conflicts.csv',root),
 [w13ConflictCols.join(','),...w13Actual.productionCompetingTargetMethodABChecks.map(row=>
  w13ConflictCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');

const w12Cols=['sourcePhysicalKey','originalSourceNodeName','originalW11StageRootCause',
 'trustedOriginalRootsExamined','signedVectorFitsButLengthBreaks',
 'lengthFitsButSignedVectorBreaks','apparentSegmentSplittingProxy','independentPhysicalCredit'];
writeFileSync(new URL('midcycle-w12-23-original-route-segmentation-review.csv',root),
 [w12Cols.join(','),...w12Original.noCandidateOriginalPathReviews.map(row=>
  w12Cols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');
const w12CompCols=['sourcePhysicalKey','w10HypotheticalTargetNodeId',
 'productionDifferentTargetReviewCount','matcherBlockers','resolution','newPhysicalCredit'];
writeFileSync(new URL('midcycle-w12-eight-competing-targets-review.csv',root),
 [w12CompCols.join(','),...w12Original.eightCompetingOriginalTargetReviews.map(row=>
  w12CompCols.map(c=>unresolvedCell(row[c])).join(','))].join('\n')+'\n');

const reviewColumns=['sourcePhysicalKey','provisionalOriginalTargetPhysicalNodeId',
 'matcherState','matcherConfidence','matcherBlockers','productionCorrespondenceRows',
 'exactProductionPairReviewRows','exactProductionPairAuthority','exactProductionPairEvidenceBasis',
 'originalMethodABoundaryDiagnostics','originalSourceMemberBlockers',
 'w11Disposition','newIndependentPhysicalCredit'];
writeFileSync(new URL('midcycle-w11-22-candidates-vs-production-review.csv',root),
 [reviewColumns.join(','),...w11Qualification.rows.map(row=>
 reviewColumns.map(k=>unresolvedCell(row[k])).join(','))].join('\n')+'\n');


// Owner explicitly requested NodeName -> physical NODE indexes FIRST. Export
// the complete, exact, member-custodied inverse maps independently of labels
// selected by the owner golden and independently of solver predictions.
const csv=v=>'"'+String(v && typeof v==='object'?JSON.stringify(v):v??'').replace(/"/g,'""')+'"';
const writeCsv=(name,columns,rows)=>writeFileSync(new URL(name,root),
  [columns.join(','),...rows.map(row=>columns.map(k=>csv(row[k])).join(','))].join('\n')+'\n');
const sourceNameIndex=[...originalIndexes.sourceByName].flatMap(([nodeName,rows])=>rows.map(row=>({
  sourceMemberId:row.sourceId,nodeName,physicalNodeId:row.nodeId,
}))).sort((a,b)=>a.sourceMemberId.localeCompare(b.sourceMemberId)||Number(a.physicalNodeId)-Number(b.physicalNodeId));
const targetNameIndex=[...originalIndexes.targetByName].flatMap(([nodeName,rows])=>rows.map(row=>({
  nodeName,physicalNodeId:row.nodeId,
}))).sort((a,b)=>Number(a.physicalNodeId)-Number(b.physicalNodeId));
writeCsv('original-source-nodename-to-node.csv',['sourceMemberId','nodeName','physicalNodeId'],sourceNameIndex);
writeCsv('original-target-nodename-to-node.csv',['nodeName','physicalNodeId'],targetNameIndex);
writeFileSync(new URL('owner-original-physical-conditional-coverage.json',root),
  JSON.stringify({schema:'CiiOwnerOriginalPhysicalConditionalCoverageReport.v1',
    asWritten:declaredConditional,ownerConfirmedSlToPs:reverseConditional,
    originalOwnerInputSha256:manifest.originalUploadSha256,
    qualification:'NOT_EVALUABLE_WRITER_AND_PRODUCTION_UNCHANGED',
  },null,2)+'\n');
const conditionalColumns=['ownerOrdinal','sourcePhysicalKey','targetPhysicalNodeId',
  'status','credit','auditStatus','observedTargets','solverAuthority','solverEvidenceBases'];
writeCsv('owner-original-physical-conditional-coverage-428.csv',conditionalColumns,reverseConditional.rows);
writeCsv('owner-original-physical-conditional-agreements.csv',conditionalColumns,
  reverseConditional.rows.filter(r=>r.credit===1));
writeFileSync(new URL('owner-midcycle-reconciliation.json',root),JSON.stringify({
  schema:midCycle.schema,status:midCycle.status,ownerApprovedTranspose:midCycle.ownerApprovedTranspose,
  originalRowCount:midCycle.originalRowCount,
  asWritten:midCycle.asWritten,
  directionReversalDiagnostic:midCycle.directionReversalDiagnostic,
},null,2)+'\n');
const classifiedKeys=['ownerOrdinal','sourceOriginalLine','originalSourceLabel','originalTargetLabel',
  'physicalSourceName','physicalTargetName','interpretation','reasonCode','sourceMemberCandidates',
  'sourceOccurrenceKeys','targetOccurrenceIds','candidatePairs','exactlyOneCandidate',
  'existingAutoSolverAgreement','note'];
writeCsv('owner-midcycle-as-written-428.csv',classifiedKeys,midCycle.asWritten.rows);
writeCsv('owner-midcycle-transposed-428.csv',classifiedKeys,midCycle.directionReversalDiagnostic.rows);
writeCsv('owner-midcycle-33-resolved-physical-pairs.csv',classifiedKeys,
  midCycle.directionReversalDiagnostic.rows.filter(row=>row.exactlyOneCandidate));
writeCsv('owner-golden-physical-pair-resolution.csv',[
  'ownerOrdinal','rawSourceLabel','rawTargetLabel','declared','transposedDiagnostic',
  'legacyBoundAndLabelAgreement','transposedLegacyBoundAndLabelAgreement',
],diagnostics);
assert.equal(sourceNameIndex.length,104);
assert.equal(targetNameIndex.length,950);
assert.equal(resolved.transposedDiagnostic.uniquelyResolvedPairs,33,'retained transposed NodeName lookup regression');
assert.equal(transposedAgreement,33,'resolved reversed owner pairs must be independently observed by existing solver');
assert.equal(midCycle.asWritten.physicalPairCandidatesUniqueNameRows,0);
assert.equal(midCycle.directionReversalDiagnostic.physicalPairCandidatesUniqueNameRows,33);
assert.equal(midCycle.directionReversalDiagnostic.independentlyExistingAutoSolverAgreements,33);
assert.equal(midCycle.directionReversalDiagnostic.distinctPhysicalPairCandidateCount,33);
assert.equal(midCycle.originalRowCount,428);

// Owner direction IS explicitly confirmed; remaining dataset-revision and
// one-to-one arithmetic cannot be treated as Owner approval of release/Writer.
const reverse=midCycle.directionReversalDiagnostic;
const reasonOrder=['BOTH_ORIGINAL_NODENAMES_NOT_FOUND','SOURCE_ORIGINAL_NODENAME_NOT_FOUND',
  'TARGET_ORIGINAL_NODENAME_NOT_FOUND','UNIQUE_ORIGINAL_PHYSICAL_PAIR_CANDIDATE'];
const samples=reasonOrder.map(code=>{
  const matching=reverse.rows.filter(r=>r.reasonCode===code);
  return {
    code,count:matching.length,
    firstFive:matching.slice(0,5).map(r=>({
      ordinal:r.ownerOrdinal,ownerPS:r.originalSourceLabel,ownerSL:r.originalTargetLabel,
    })),
  };
});
const mappedPairs=reverse.rows.filter(r=>r.exactlyOneCandidate).map(r=>{
  const c=r.candidatePairs[0];
  return {
    ordinal:r.ownerOrdinal,
    ownerPS:r.originalSourceLabel,ownerSL:r.originalTargetLabel,
    sourceMemberId:c.sourceMemberId,sourcePhysicalNodeId:c.sourcePhysicalNodeId,
    targetPhysicalNodeId:c.targetPhysicalNodeId,
    independentlyBound:reverseConditional.rows.find(x=>x.ownerOrdinal===r.ownerOrdinal)?.credit===1,
  };
});
writeFileSync(new URL('owner-confirmed-one-to-one-acceptance.json',root),JSON.stringify({
  ownerDecision:decision,acceptance,
  sourceSetOriginalSha256:inspection.sourceSet.sourceSetSha256,
  targetOriginalSha256:inspection.versionBridge.target.originalSha256,
  duplicateAndConflictVetoesApplied:true,
},null,2)+'\n');
const disposition={
  schema:'CiiOwnerPhase2BenchmarkAdjudicationPacket.v1',
  ownerInputSha256:manifest.originalUploadSha256,
  pinnedSourceSetSha256:inspection.sourceSet.sourceSetSha256,
  pinnedTargetSha256:inspection.versionBridge.target.originalSha256,
  sourcePhysicalNodeTotal:audit.summary.totalSourceNodes,
  originalDenominator:428,originalRequiredValidatedRows:300,
  ownerConfirmedSlSourceToPsTarget:true,
  oneToOnePhysicalAcceptance:acceptance,
  asWrittenPhysicalPairCount:midCycle.asWritten.physicalPairCandidatesUniqueNameRows,
  reversedUniqueNamePairCount:reverse.physicalPairCandidatesUniqueNameRows,
  reversedIndependentlyBoundPhysicalPairCount:reverseConditional.independentlyBoundPhysicalPairAgreement,
  reversedIndependentPhysicalPairWrongTargetCount:reverseConditional.independentBoundWrongTargets,
  unresolvedOwnerRowCount:428-reverse.physicalPairCandidatesUniqueNameRows,
  requestedOwnerDecisions:[
    'CONFIRMED: PS-column belongs to T and SL-column to S1/S2/S3; original PS-first bytes and N=428 remain unchanged',
    'Provide missing original CII SOURCE member/target revisions whose complete NodeName lists cover remaining original 395 Owner pairs, with exact byte hashes',
    'Provide independently supported original physical NODE occurrences in the appropriate CII benchmark revision for the remaining 395 owner rows',
    'Counting resolved: each distinct original SOURCE NODE -> TARGET NODE is worth at most one credit; 150 distinct SOURCE NODEs cap credits at 150/428=35.05%, below required 300. Supply a different approved physical fixture contract to attain >=70%',
    'Provide independent physical validation and unambiguous false-positive/duplicate-credit adjudication before claiming >=70% release PASS',
  ],
  categories:samples,
  uniqueOwnerConfirmedPhysicalCandidates:mappedPairs,
  ownerApprovalAttested:false,phase2RecallCertified:null,
};
writeFileSync(new URL('owner-benchmark-adjudication-packet.json',root),JSON.stringify(disposition,null,2)+'\n');
const packetLines=[
  '# CII Phase 2 — Owner original-NodeName benchmark adjudication',
  '', '**Status:** DIRECTION CONFIRMED SL(S1/S2/S3)->PS(T); ONE-TO-ONE 428-ROW ACCEPTANCE STRUCTURALLY FAILS ON PINNED 150-NODE SOURCES.',
  '**No validated 70% recall or Writer authority is claimed.**',
  '',
  '## Frozen custody',
  '',
  '- Owner 428 original rows: SHA-256 \`'+manifest.originalUploadSha256+'\`.',
  '- SOURCE S1/S2/S3 original sourceSet SHA-256 \`'+inspection.sourceSet.sourceSetSha256+'\`.',
  '- T original SHA-256 \`'+inspection.versionBridge.target.originalSha256+'\`.',
  '- Original SOURCE physical NODE census: '+audit.summary.totalSourceNodes+'; original owner required independent physical row count: 300/428.',
  '- **Owner-approved count:** N=428; count at most one independently certified SOURCE(member,NODE)->TARGET NODE. No reuse or conflicts.',
  '- **Structural bound:** max '+acceptance.maxIndependentPhysicalRowCredits+'/'+acceptance.inputOwnerRows+' = '+(acceptance.upperBoundRecall*100).toFixed(2)+'%, below 300/428: '+acceptance.acceptanceStatus+'.',
  '- **Observed subset:** '+acceptance.observed.correctPhysicalSolverBindingsAmongResolvableOwnerPairs+'/'+acceptance.observed.physicallyResolvableDistinctOwnerPairs+' name-resolved pairs agree with AUTO; strict certified R and full recall remain null.',
  '- NodeName is decoded independently through original CII ELEMENTS -> NODENAME pointers. No owner name is fed into production matching.',
  '',
  '## Observed without rewriting the Owner columns',
  '',
  '| Interpretation | Unique physical pairs | Existing AUTO bound agreement | Status |',
  '|---|---:|---:|---|',
  '| As written PS(S1/S2/S3)->SL(T) | '+midCycle.asWritten.physicalPairCandidatesUniqueNameRows+' | '+declaredConditional.independentlyBoundPhysicalPairAgreement+' | Cannot score full golden |',
  '| Owner-confirmed SL(S1/S2/S3)->PS(T) | '+reverse.physicalPairCandidatesUniqueNameRows+' | '+reverseConditional.independentlyBoundPhysicalPairAgreement+' | 33/33 conditional; hard upper bound 150/428 <70% |',
  '',
  '## Original row-level reason codes (Owner-confirmed SL to PS direction)',
  '',
  '| Reason | Count | Example owner ordinal: PS, SL |',
  '|---|---:|---|',
  ...samples.map(x=>'| '+x.code+' | '+x.count+' | '+x.firstFive.map(y=>y.ordinal+': '+y.ownerPS+', '+y.ownerSL).join('; ')+' |'),
  '', '## 33 exact original physical candidates with independent AUTO comparisons', '',
  '| Owner row | SOURCE member | SOURCE NodeName | SOURCE NODE ID | TARGET NodeName | T NODE ID | AUTO bound agreement |',
  '|---:|---|---|---:|---|---:|---|',
  ...mappedPairs.map(x=>'| '+x.ordinal+' | '+x.sourceMemberId+' | '+x.ownerSL+' | '+x.sourcePhysicalNodeId+' | '+x.ownerPS+' | '+x.targetPhysicalNodeId+' | '+(x.independentlyBound?'Yes':'No')+' |'),
  '', '## Required Owner input before release acceptance', '',
  ...disposition.requestedOwnerDecisions.map((t,i)=>(i+1)+'. '+t),
  '', 'The 33 candidates are test-only evidence; never auto-create MANUAL anchors from expected Owner input.',
  'Issue #106 remains OPEN. PR #107 remains DRAFT and unmerged.',
];
writeFileSync(new URL('owner-benchmark-adjudication-packet.md',root),packetLines.join('\n')+'\n');
writeFileSync(new URL('phase2-owner-diagnostic.json',root),JSON.stringify({report,rows:diagnostics},null,2)+'\n');
const keys=['ownerOrdinal','originalLine','rawSourceLabel','rawTargetLabel','ownerDirection','sourceMemberCandidates','sourcePhysicalNodeCandidates','targetPhysicalNodeCandidates','sourceCandidateCount','targetCandidateCount','uniquelyAttributed','declared','transposedDiagnostic','legacyBoundAndLabelAgreement','transposedLegacyBoundAndLabelAgreement','discrepancy','physicalValidationTier'];

writeFileSync(new URL('phase2-owner-diagnostic.csv',root),[keys.join(','),...diagnostics.map(row=>keys.map(k=>csv(row[k])).join(','))].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
console.log('PHASE2_MIDCYCLE_150_OWNER_ORIGINAL_CERTIFICATES '+JSON.stringify({certified:originalOwnerCertificates.qualifiedOwnerGoldenPhysicalCertificates,missingOrUnqualified:originalOwnerCertificates.unmatchedOrUnqualifiedGoldenRows}));
console.log('PHASE2_MIDCYCLE_W14_NATIVE_METHODAB_REGISTRATION '+JSON.stringify({totals:w14NativeEvidence.totals,coords:w14NativeEvidence.rawCoordinateEvidence,methods:w14NativeEvidence.productionMethodABMissingEvidence.map(x=>({source:x.sourcePhysicalKey,provisionalT:x.provisionalOriginalTargetPhysicalNodeId,nativeSuggestionCount:x.exactNativeAutoSuggestionCount,missing:x.missingIndependentEvidence})),signed:w14NativeEvidence.originalCiiAbsoluteRegistrationAndDisplacements.map(x=>({source:x.sourcePhysicalKey,sourceRegistered:x.originalSourceComponentHasAbsoluteRegistration,alternatives:x.availableOriginalTargetFrameAlternatives.map(y=>({t:y.targetPhysicalNodeId,tRoot:y.originalTargetRootPhysicalNodeId,originalCoordsBoth:y.bothSidesOriginalCiiCoordsCoverRootAndEndpoint,registeredVectorResidualMm:y.independentlyRegisteredRelativeVectorResidualMm}))}))}));
console.log('PHASE2_MIDCYCLE_W13_ORIGINAL_TYPES_AND_METHODAB '+JSON.stringify({
 summary:w13Actual.summary,
 split:w13Actual.segmentedRunElementTypeChecks.map(x=>({
  source:x.sourcePhysicalKey,status:x.status,types:x.witnesses?.map(y=>({
   sourceType:y.originalSourceElementTypeReferences.classification,
   targetType:y.originalTargetElementTypeReferences.classification,
   original100mmGeometryPass:y.comparison.originalStraightConstantOdPathGeometryCompatible,
  }))})),
 displacements:w13Actual.signedDisplacementFrameChecks.map(x=>({
  source:x.sourcePhysicalKey,candidates:x.originalLengthCompatibleAlternatives,
  reverseCandidateExists:x.alternatives.some(v=>v.reversedResidualMm<=100),
 })),
 conflicts:w13Actual.productionCompetingTargetMethodABChecks.map(x=>({
  source:x.sourcePhysicalKey,
  productionTargets:x.productionReviewedTargets,
  productionRootPass:x.productionOriginalGeometryAnyRootPass,
  hypothesisAllRootsPass:x.hypothesisOriginalGeometryAllRootsPass,
  anyProdAllRootsPass:x.alternateOriginalGeometryAllRootsPass,
 })),
}));
console.log('PHASE2_MIDCYCLE_W12_ORIGINAL_GEOMETRY '+JSON.stringify({totals:w12Original.counts,perSource:w12Original.sourcePerMember,newCredits:0}));
console.log('PHASE2_MIDCYCLE_W11_PRODUCTION_QUALIFICATION '+JSON.stringify({leadCount:w11Qualification.leadCount,dispositions:w11Qualification.dispositionCounts,perMember:w11Qualification.perMember,newCredits:w11Qualification.newIndependentlyCertifiedPhysicalNodeCount}));
console.log('PHASE2_MIDCYCLE_W11_NO_CANDIDATE_STAGE_GATES '+JSON.stringify({missing:23,stageRootCauses:unverifiedForensics.geometryRootCauseCounts}));
console.log('PHASE2_MIDCYCLE_150_UNVERIFIED_FORENSICS '+JSON.stringify({count:unverifiedForensics.unverifiedSourcePhysicalNodeCount,byMember:unverifiedForensics.unverifiedByMember,reasonCounts:unverifiedForensics.reasonCounts,matcherStateCounts:unverifiedForensics.matcherStateCounts}));
console.log('PHASE2_MIDCYCLE_150_ROOTED_PROOF '+JSON.stringify({ownerSeeds:rooted.ownerGoldenSeeds,globalShapeSeeds:rooted.additionalExhaustiveGlobalGeometrySeeds,verified:rooted.independentlyRootedVerifiedPhysicalNodes,perMember:rooted.sourcePerMember,thresholdMet:rooted.strict70PercentPhysicalGoalMet,rounds:rooted.proofRounds}));
console.log('PHASE2_MIDCYCLE_150_SCORE '+JSON.stringify(midcycle150));
console.log('PHASE2_MIDCYCLE_150_ORIGINAL_PATH_WITNESS '+JSON.stringify(pathWitness.summary));
console.log('PHASE2_MIDCYCLE_150_OD_WALL_SAMPLE '+JSON.stringify(pathWitness.rows.filter(x=>x.state==='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY').slice(0,12).map(x=>({source:x.sourcePhysicalKey,target:x.targetNodeId,branchCompatible:x.originalBranchCompatible,sourceBranch:x.sourceHasOriginalBranch,targetBranch:x.targetHasOriginalBranch,witness:x.independentLocalRouteWitnesses.slice(0,2).map(w=>({srcOD:w.sourceOriginalOdMm,tgtOD:w.targetOriginalOdMm,srcWall:w.sourceOriginalWallMm,tgtWall:w.targetOriginalWallMm,odCompatible:w.originalOdCompatible,wallCompatible:w.originalWallCompatible}))}))));
console.log('PHASE2_MIDCYCLE_150_GLOBAL_SHAPE '+JSON.stringify({
 matched:globalShape.validatedUniqueOriginalGeometryNodes,
 perMember:globalShape.validatedPerSource,sourceComponents:globalShape.completeOriginalGraphComponentsSearched,
 ambiguous:globalShape.ambiguousOriginalGeometryComponents,
 targetCoordinateCycles:globalShape.originalTargetCoordinateCycleConflicts,
}));
console.log('PHASE2_OWNER_CONFIRMED_ACCEPTANCE '+JSON.stringify(acceptance));
console.log('PHASE2_CONDITIONAL_PHYSICAL_COVERAGE '+JSON.stringify({originalOwnerDenominator:428,ownerConfirmedPhysicalNamePairs:reverseConditional.distinctPhysicalOraclePairs,matched:reverseConditional.independentlyBoundPhysicalPairAgreement,wrongTargets:reverseConditional.independentBoundWrongTargets,original428CertifiedRecall:reverseConditional.P2_VALIDATED_RECALL,reason:reverseConditional.reason}));
console.log('PHASE2_OWNER_NODENAME_INDEX_COMPLETE: original CII NODENAME->physical NODE, both column orientations separately evaluated; validated correspondence recall requires independent solver proof');
