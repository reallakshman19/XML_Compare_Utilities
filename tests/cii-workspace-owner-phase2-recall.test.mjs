import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reconcileCiiOwnerLexicalGolden} from './cii-workspace-owner-lexical-golden.js';
import {evaluateCiiOwnerPhase2Recall,CII_P2_PHYSICAL_RECEIPT_SCHEMA} from './cii-workspace-owner-phase2-recall.js';

const sourceSet='5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3';
const target='abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';
const ownerEvidenceRef='https://github.com/reallakshman19/XML_Compare_Utilities/issues/102#issuecomment-6190091019';
// ALL ROWS BELOW ARE SYNTHETIC CONTROLS, not the missing authentic Owner golden.
const sourceRows=Array.from({length:10},(_,i)=>({
  sourceId:'S1',sourceNodeId:String(i+1),rowKey:'S1:'+(i+1),
  sourceNodeName:'PS-'+(i+1),targetNodeIds:[String(100+i)],
  identityBound:true,state:'BOUND',confidence:'HIGH'
}));
const targetNodes=Array.from({length:10},(_,i)=>({id:String(100+i),nodeName:'SL-'+(i+1)}));
const raw=Array.from({length:10},(_,i)=>'S1\tPS-'+(i+1)+'\tSL-'+(i+1)).join('\n')+'\n';
const makeGolden=(text=raw,source=sourceRows,targets=targetNodes)=>{
  const goldenBytes=Buffer.from(text,'utf8');
  return reconcileCiiOwnerLexicalGolden({
    goldenBytes,declaredSha256:createHash('sha256').update(goldenBytes).digest('hex'),
    declaredRowCount:text.trim().split('\n').length,ownerEvidenceRef,
    sourceRows:source,targetNodes:targets,
    sourceSetSha256:sourceSet,requiredSourceSetSha256:sourceSet,
    targetOriginalSha256:target,requiredTargetOriginalSha256:target
  });
};
const kwargs={expectedSourceSetSha256:sourceSet,expectedTargetOriginalSha256:target};
const golden=makeGolden();
assert.equal(golden.observedRowCount,10);
assert.equal(golden.qualificationSummary.total,10);
assert.equal(golden.qualificationSummary.resolved,10,'all ten LEGACY bound only');
const receipt=(i,overrides={})=>({
  schema:CII_P2_PHYSICAL_RECEIPT_SCHEMA,state:'INDEPENDENT_PASS',
  sourceNodeKey:'S1:'+(i+1),targetNodeId:String(100+i),
  sourceSetSha256:sourceSet,targetOriginalSha256:target,
  identityProofSha256:'a'.repeat(64),
  independentReviewRef:ownerEvidenceRef,
  globalAssignmentComplete:true,uniqueTargetCustody:true,
  noUnresolvedAlternatives:true,...overrides
});
const absent=evaluateCiiOwnerPhase2Recall({
  goldenReport:reconcileCiiOwnerLexicalGolden({}),...kwargs
});
assert.equal(absent.status,'NOT_EVALUABLE_AUTHENTIC_FULL_OWNER_GOLDEN_MISSING');
assert.equal(absent.denominator,null);
assert.equal(absent.validatedRecallPct,null);
assert.equal(absent.ownerAccepted,false);
const unverified=evaluateCiiOwnerPhase2Recall({goldenReport:golden,...kwargs});
assert.equal(unverified.legacyBoundAgreement,10);
assert.equal(unverified.validatedRows,0);
assert.equal(unverified.validatedRecallPct,0);
assert.equal(unverified.thresholdNumericallyReached,false);
const seven=evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,physicalReviewReceipts:Array.from({length:7},(_,i)=>receipt(i)),...kwargs
});
assert.equal(seven.denominator,10);
assert.equal(seven.validatedRows,7);
assert.equal(seven.validatedRecallPct,70);
assert.equal(seven.thresholdNumericallyReached,true);
assert.equal(seven.ownerAccepted,false);
assert.equal(seven.writerAuthority,false);
assert.equal(seven.mergeAuthorized,false);
assert.equal(seven.byMember[0].member,'S1');
assert.equal(seven.byMember[0].validatedRecallPct,70);
assert.equal(seven.rows.filter(x=>x.countedInValidatedRecall).length,7);
const six=evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,physicalReviewReceipts:Array.from({length:6},(_,i)=>receipt(i)),...kwargs
});
assert.equal(six.validatedRecallPct,60);
assert.equal(six.thresholdNumericallyReached,false);
const wrong=evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,physicalReviewReceipts:[receipt(0,{targetNodeId:'999'})],...kwargs
});
assert.equal(wrong.validatedRows,0,'unmatched TARGET physical ID cannot score');
for(const bad of [
  {state:'REVIEW_ONLY'}, {globalAssignmentComplete:false},
  {uniqueTargetCustody:false}, {noUnresolvedAlternatives:false},
  {sourceSetSha256:'b'.repeat(64)}, {targetOriginalSha256:'c'.repeat(64)},
  {identityProofSha256:'FORGED'}, {independentReviewRef:'https://example.com/declared-review'}
]){
  assert.throws(()=>evaluateCiiOwnerPhase2Recall({
    goldenReport:golden,physicalReviewReceipts:[receipt(0,bad)],...kwargs
  }),/P2_UNVERIFIED_OR_STALE_PHYSICAL_RECEIPT/);
}
assert.throws(()=>evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,physicalReviewReceipts:[receipt(0),receipt(0)],...kwargs
}),/P2_DUPLICATE_PHYSICAL_RECEIPT/);
assert.throws(()=>evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,physicalReviewReceipts:[receipt(0),receipt(1,{targetNodeId:'100'})],...kwargs
}),/P2_CONFLICTING_TARGET_PHYSICAL_CUSTODY/);
const repeated=makeGolden(raw+'S1\tPS-1\tSL-1\n');
const repeatedReport=evaluateCiiOwnerPhase2Recall({
  goldenReport:repeated,
  physicalReviewReceipts:Array.from({length:10},(_,i)=>receipt(i)),...kwargs
});
assert.equal(repeatedReport.denominator,11);
assert.equal(repeatedReport.validatedRows,10,'duplicate raw expectation cannot increase numerator');
assert.equal(repeatedReport.rows[10].countedInValidatedRecall,false);
assert.equal(repeatedReport.rows[10].reason,'DUPLICATE_OWNER_LEXICAL_RELATION_NO_EXTRA_CREDIT');
const missingText=makeGolden(raw.replace('PS-5','PS-MISSING'));
const missing=evaluateCiiOwnerPhase2Recall({
  goldenReport:missingText,physicalReviewReceipts:Array.from({length:10},(_,i)=>receipt(i)),...kwargs
});
assert.equal(missing.denominator,10);
assert.equal(missing.validatedRows,9,'a missing SOURCE label stays in denominator');
assert.equal(missing.rows[4].countedInValidatedRecall,false);
const ambiguous=makeGolden(raw,sourceRows,[...targetNodes,{id:'999',nodeName:'SL-1'}]);
const ambiguousScore=evaluateCiiOwnerPhase2Recall({
  goldenReport:ambiguous,physicalReviewReceipts:Array.from({length:10},(_,i)=>receipt(i)),...kwargs
});
assert.equal(ambiguousScore.validatedRows,9,'duplicated TARGET label veto despite a reviewed physical claim');
assert.throws(()=>evaluateCiiOwnerPhase2Recall({
  goldenReport:golden,...kwargs,expectedTargetOriginalSha256:'0'.repeat(64)
}),/P2_ORIGINAL_SOURCE_TARGET_DIGEST_DRIFT/);
console.log('CII_PHASE2_70_RECALL_SYNTHETIC_GATES_PASS',JSON.stringify({
  missingGolden:absent.status,legacyBoundDoesNotCount:unverified.validatedRows,
  at70:seven.validatedRecallPct,below: six.validatedRecallPct,
  duplicateDenominator:repeatedReport.denominator,duplicateCredit:repeatedReport.validatedRows,
  releaseAuthorized:seven.writerAuthority,realOwnerGoldenSupplied:false
}));
