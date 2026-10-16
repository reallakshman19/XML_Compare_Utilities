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

const files=['S1.CII','S2.CII','S3.CII'].map((fileName,i)=>({
  sourceId:'S'+(i+1),fileName,bytes:readFileSync(new URL('../Benchmark/'+fileName,import.meta.url)),
}));
const targetBytes=readFileSync(new URL('../Benchmark/T.CII',import.meta.url));
const raw=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url),'utf8'));
assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.originalUploadSha256);
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
const originalIndexes=buildCiiOwnerOriginalNodeNameIndexes(files,targetBytes);
assert.deepEqual(originalIndexes.sourceStats.map(r=>r.physicalNodeCount),[57,47,46]);
assert.equal(originalIndexes.targetStats.physicalNodeCount,1619);
const resolved=resolveCiiOwnerPhase2RowsByOriginalNodeName(originals,originalIndexes);
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
    sourceMemberCandidates:row.declared.sourceMembers,
    sourcePhysicalNodeCandidates:row.declared.sourceNodeIds,
    targetPhysicalNodeCandidates:row.declared.targetNodeIds,
    sourceCandidateCount:row.declared.sourceLookupCount,
    targetCandidateCount:row.declared.targetLookupCount,
    uniquelyAttributed:row.declared.uniquePhysicalPair,
    legacyBoundAndLabelAgreement:declaredLegacy.length>0,
    transposedLegacyBoundAndLabelAgreement:transposedLegacy.length>0,
    observedDeclaredLegacyPairs:declaredLegacy,
    observedTransposedLegacyPairs:transposedLegacy,
    discrepancy:row.declared.status,
    physicalValidationTier:'OWNER_NODENAME_RESOLUTION_NOT_INDEPENDENT_SOLVER_PROOF',
    verifiedPhysicalCorrespondence:false,
  });
});
const midCycle=reconcileCiiOwnerMidCyclePhysicalRows(diagnostics);
// In TEST ONLY, score the physically grounded 33-row reversed-column
// diagnostic independently against complete, matcher-generated physical
// source-node audit. Never feed Owner labels/pairs into a matching option.
const reverseConditional=scoreCiiOwnerPhysicalCandidateCoverage(
  midCycle.directionReversalDiagnostic.rows,audit,{originalDenominator:428});
const declaredConditional=scoreCiiOwnerPhysicalCandidateCoverage(
  midCycle.asWritten.rows,audit,{originalDenominator:428});
assert.equal(declaredConditional.physicallyLocatableUniqueNameRows,0);
assert.equal(reverseConditional.physicallyLocatableUniqueNameRows,33);
assert.equal(reverseConditional.distinctPhysicalOraclePairs,33);
// Keep this as a diagnostic snapshot, NOT a declared 70% PASS.
assert.equal(reverseConditional.P2_VALIDATED_RECALL,null);
assert.equal(reverseConditional.phase2SeventyPercentQualified,false);

const count=predicate=>diagnostics.filter(predicate).length;
const agreement=count(row=>row.legacyBoundAndLabelAgreement);
const transposedAgreement=count(row=>row.transposedLegacyBoundAndLabelAgreement);
const bySourcePhysicalId=new Map();
for(const row of diagnostics.filter(r=>r.legacyBoundAndLabelAgreement))
  for(const pair of row.observedDeclaredLegacyPairs){
    const key=pair.sourceMemberId+':'+pair.sourcePhysicalNodeId;
    if(!bySourcePhysicalId.has(key))bySourcePhysicalId.set(key,[]);
    bySourcePhysicalId.get(key).push(row.ownerOrdinal);
  }
const manyRows=[...bySourcePhysicalId].filter(([,ids])=>ids.length>1).map(([sourceKey,ids])=>({sourceKey,ownerOrdinals:ids}));
const report={
  schema:'CiiPhase2OwnerBenchmarkDiagnostic.v1',
  status:'NOT_EVALUABLE_INDEPENDENT_GLOBAL_PHYSICAL_CERTIFICATION_MISSING',
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
    reversedUnapproved:{...reverseConditional,rows:undefined},
    originalOwnerDenominator:428,
    ownerApprovedOrientation:false,
    phase2Acceptance:'NOT_EVALUABLE_UNRATIFIED_DIRECTION_AND_395_UNRESOLVED_ROWS',
  },
  midCycleReconciliationSummary:{
    ownerDirectionConfirmed:false,
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
  observedLegacyBoundWithNameAgreement:agreement,
  observedLegacyAgreementFractionOfOwnerInput:agreement/428,
  rowsWithSourceLabelFound:resolved.asDeclared.sourceNameFound,rowsWithTargetLabelFound:resolved.asDeclared.targetNameFound,
  rowsWithBothLabelsFound:resolved.asDeclared.bothNamesFound,
  rowsMissingSourceLabel:resolved.asDeclared.noSourceName,rowsMissingTargetLabel:resolved.asDeclared.noTargetName,
  rowsUniquelyAttributedByLabels:count(r=>r.uniquelyAttributed),
  sourcePhysicalNodesWithRepeatedLegacyOwnerCredits:manyRows,
  independentGlobalPhysicalValidatedCount:null,
  P2_VALIDATED_RECALL:null,
  Phase2ThresholdMet:null,
  physicallyValidatedCreditingRule:'NO NAME-ONLY, NO LEGACY IDENTITYBOUND; requires full original physical source-member and global target custody proof and independent falsifiers',
  note:'Original fixed-field NodeName->Node indexes are built per member and T; declared PS-source/SL-target and reversed SL-source/PS-target are separately reported without silently swapping Owner columns. A label-resolved pair from Owner golden is an expected physical-node pair, not an independently correct matcher output or Writer authorization. Report ambiguity and repeat reuse explicitly.',
};
const root=new URL('../test-results/cii-phase2/',import.meta.url);
mkdirSync(root,{recursive:true});
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
    asWritten:declaredConditional,reversedUnapproved:reverseConditional,
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

// Owner-ready fixture/revision adjudication packet; the data here can never
// be interpreted as Owner signature, direction approval or Writer authority.
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
const disposition={
  schema:'CiiOwnerPhase2BenchmarkAdjudicationPacket.v1',
  ownerInputSha256:manifest.originalUploadSha256,
  pinnedSourceSetSha256:inspection.sourceSet.sourceSetSha256,
  pinnedTargetSha256:inspection.versionBridge.target.originalSha256,
  sourcePhysicalNodeTotal:audit.summary.totalSourceNodes,
  originalDenominator:428,originalRequiredValidatedRows:300,
  proposedReversedInterpretationPendingOwnerDecision:true,
  asWrittenPhysicalPairCount:midCycle.asWritten.physicalPairCandidatesUniqueNameRows,
  reversedUniqueNamePairCount:reverse.physicalPairCandidatesUniqueNameRows,
  reversedIndependentlyBoundPhysicalPairCount:reverseConditional.independentlyBoundPhysicalPairAgreement,
  reversedIndependentPhysicalPairWrongTargetCount:reverseConditional.independentBoundWrongTargets,
  unresolvedOwnerRowCount:428-reverse.physicalPairCandidatesUniqueNameRows,
  requestedOwnerDecisions:[
    'Confirm PS-column belongs to T and SL-column belongs to S1/S2/S3, or provide the correct orientation and original file revisions',
    'Provide missing original CII SOURCE member/target revisions whose complete NodeName lists cover remaining original 395 Owner pairs, with exact byte hashes',
    'Specify independently supported original physical node occurrence/member mapping for any repeated or alternative NodeNames',
    'Ratify whether all original 428 rows are distinct scored physical obligations; explain one-to-many PS02687.1 x78 and how 300 independent correct physical SOURCE claims are possible with 150 pinned SOURCE nodes',
    'Provide independent physical validation and unambiguous false-positive/duplicate-credit adjudication before claiming >=70% release PASS',
  ],
  categories:samples,
  uniqueReversedPhysicalCandidates:mappedPairs,
  ownerApprovalAttested:false,phase2RecallCertified:null,
};
writeFileSync(new URL('owner-benchmark-adjudication-packet.json',root),JSON.stringify(disposition,null,2)+'\n');
const packetLines=[
  '# CII Phase 2 — Owner original-NodeName benchmark adjudication',
  '', '**Status:** OWNER DIRECTION, FILE REVISION AND OCCURRENCE CONTRACT NOT RATIFIED.',
  '**No validated 70% recall or Writer authority is claimed.**',
  '',
  '## Frozen custody',
  '',
  '- Owner 428 original rows: SHA-256 \`'+manifest.originalUploadSha256+'\`.',
  '- SOURCE S1/S2/S3 original sourceSet SHA-256 \`'+inspection.sourceSet.sourceSetSha256+'\`.',
  '- T original SHA-256 \`'+inspection.versionBridge.target.originalSha256+'\`.',
  '- Original SOURCE physical NODE census: '+audit.summary.totalSourceNodes+'; original owner required independent physical row count: 300/428.',
  '- NodeName is decoded independently through original CII ELEMENTS -> NODENAME pointers. No owner name is fed into production matching.',
  '',
  '## Observed without rewriting the Owner columns',
  '',
  '| Interpretation | Unique physical pairs | Existing AUTO bound agreement | Status |',
  '|---|---:|---:|---|',
  '| As written PS(S1/S2/S3)->SL(T) | '+midCycle.asWritten.physicalPairCandidatesUniqueNameRows+' | '+declaredConditional.independentlyBoundPhysicalPairAgreement+' | Cannot score full golden |',
  '| Reversed for diagnostic only SL(S1/S2/S3)->PS(T) | '+reverse.physicalPairCandidatesUniqueNameRows+' | '+reverseConditional.independentlyBoundPhysicalPairAgreement+' | Direction unapproved; conditional 33/33 is NOT 70% recall |',
  '',
  '## Original row-level reason codes (reversed diagnostic only)',
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
console.log('PHASE2_CONDITIONAL_PHYSICAL_COVERAGE '+JSON.stringify({originalOwnerDenominator:428,unapprovedReverseNamePairs:reverseConditional.distinctPhysicalOraclePairs,matched:reverseConditional.independentlyBoundPhysicalPairAgreement,wrongTargets:reverseConditional.independentBoundWrongTargets,original428Recall:reverseConditional.P2_VALIDATED_RECALL,reason:reverseConditional.reason}));
console.log('PHASE2_OWNER_NODENAME_INDEX_COMPLETE: original CII NODENAME->physical NODE, both column orientations separately evaluated; validated correspondence recall requires independent solver proof');
