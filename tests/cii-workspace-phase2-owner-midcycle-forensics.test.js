import assert from 'node:assert/strict';
import { reconcileCiiOwnerMidCyclePhysicalRows } from './cii-workspace-phase2-owner-midcycle-forensics.js';

const candidate=(sources,targets)=>({
  sourceLookupCount:sources.length,
  targetLookupCount:targets.length,
  sourceMembers:[...new Set(sources.map(s=>s.member))],
  sourceNodeIds:sources.map(s=>s.member+':'+s.id),
  targetNodeIds:targets.map(t=>t.id),
  uniquePhysicalPair:sources.length===1&&targets.length===1,
  candidatePairs:sources.flatMap(s=>targets.map(t=>({
    sourceMemberId:s.member,sourcePhysicalNodeId:s.id,targetPhysicalNodeId:t.id,
    sourceNodeName:s.name||'SL-SOURCE',targetNodeName:t.name||'PS-TARGET',
  }))),
});
const s1=[{member:'S1',id:'10'}],s2=[{member:'S2',id:'20'}],t1=[{id:'5010'}],t2=[{id:'5020'}];
const pairs=[
  {originalLine:5,rawSourceLabel:'PS01',rawTargetLabel:'SL01',
    declared:candidate([],t1),transposedDiagnostic:candidate(s1,t1),
    transposedLegacyBoundAndLabelAgreement:true,legacyBoundAndLabelAgreement:false},
  {originalLine:6,rawSourceLabel:'PS02',rawTargetLabel:'SL02',
    declared:candidate([],[]),transposedDiagnostic:candidate(s1,[]),
    transposedLegacyBoundAndLabelAgreement:false,legacyBoundAndLabelAgreement:false},
  {originalLine:7,rawSourceLabel:'PS03',rawTargetLabel:'SL03',
    declared:candidate(s2,[]),transposedDiagnostic:candidate([],t1),
    transposedLegacyBoundAndLabelAgreement:false,legacyBoundAndLabelAgreement:false},
  {originalLine:8,rawSourceLabel:'PS04',rawTargetLabel:'SL04',
    declared:candidate([s1[0],s2[0]],t1),transposedDiagnostic:candidate(s1,t2),
    transposedLegacyBoundAndLabelAgreement:false,legacyBoundAndLabelAgreement:false},
  {originalLine:9,rawSourceLabel:'PS05',rawTargetLabel:'SL05',
    declared:candidate(s1,[t1[0],t2[0]]),transposedDiagnostic:candidate(s1,t1),
    transposedLegacyBoundAndLabelAgreement:true,legacyBoundAndLabelAgreement:false},
].map((row,index)=>({...row,ownerOrdinal:index+1}));
const result=reconcileCiiOwnerMidCyclePhysicalRows(pairs);
assert.equal(result.originalRowCount,5);
assert.equal(result.asWritten.reasonCounts.SOURCE_ORIGINAL_NODENAME_NOT_FOUND,1);
assert.equal(result.asWritten.reasonCounts.BOTH_ORIGINAL_NODENAMES_NOT_FOUND,1);
assert.equal(result.asWritten.reasonCounts.TARGET_ORIGINAL_NODENAME_NOT_FOUND,1);
assert.equal(result.asWritten.reasonCounts.SOURCE_NODENAME_AMBIGUOUS,1);
assert.equal(result.asWritten.reasonCounts.TARGET_NODENAME_AMBIGUOUS,1);
assert.equal(result.directionReversalDiagnostic.physicalPairCandidatesUniqueNameRows,3);
assert.equal(result.directionReversalDiagnostic.distinctPhysicalPairCandidateCount,2);
assert.equal(result.directionReversalDiagnostic.repeatedExactPhysicalPairCredit,1);
assert.equal(result.directionReversalDiagnostic.independentlyExistingAutoSolverAgreements,2);
assert.equal(result.directionReversalDiagnostic.multiTargetSources.length,1);
assert.equal(result.directionReversalDiagnostic.multiTargetSources[0].sourcePhysicalKey,'S1:10');
assert.equal(result.independentValidatedRecall,null);
assert.equal(result.ownerApprovedTranspose,false);
assert.equal(result.writerAuthorizationGranted,false);
assert.throws(()=>reconcileCiiOwnerMidCyclePhysicalRows([{...pairs[0],ownerOrdinal:3}]),/OWNER_ORDINALS_NOT_CONTIGUOUS/);
console.log('PASS owner mid cycle original NodeName physical-node forensic full-row coverage and multiplicity veto');
