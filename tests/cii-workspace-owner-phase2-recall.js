/**
 * Issue #102 W0/W3: test-only, fail-closed Owner Phase 2 recall evaluator.
 * Reads an independent original Owner lexical-golden report and reviewed
 * physical identity receipts. NEVER imported by production matcher or Writer.
 * This does not independently authenticate the human reviewer or Owner source.
 */
export const CII_P2_RECALL_SCHEMA = 'CiiOwnerPhase2ValidatedRecall.v1';
export const CII_P2_PHYSICAL_RECEIPT_SCHEMA = 'CiiOwnerPhase2PhysicalReviewReceipt.v1';
const SHA = /^[a-f0-9]{64}$/;
const REVIEW = /^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:issues|pull)\/\d+#(?:issuecomment-|discussion_r|pullrequestreview-)\d+$/;
const pct = (n,d) => d ? Number((100*n/d).toFixed(4)) : null;
const physicalKey = r => String(r.sourceNodeKey)+'\u0000'+String(r.targetNodeId);
const base = (status,extra={}) => Object.freeze({
  schema:CII_P2_RECALL_SCHEMA,status,thresholdPct:70,
  ownerAccepted:false,mergeAuthorized:false,writerAuthority:false,
  ...extra
});
const isRow = r => r && typeof r.relationId==='string' &&
  Number.isSafeInteger(r.ordinal) && r.ordinal>0 &&
  typeof r.sourceLabel==='string' && typeof r.targetLabel==='string';
export function evaluateCiiOwnerPhase2Recall({goldenReport=null,physicalReviewReceipts=[],
  expectedSourceSetSha256,expectedTargetOriginalSha256}={}) {
  if(!goldenReport || goldenReport.status==='BLOCKED_AUTHENTIC_OWNER_GOLDEN_MISSING')
    return base('NOT_EVALUABLE_AUTHENTIC_FULL_OWNER_GOLDEN_MISSING',{
      denominator:null,validatedRows:null,validatedRecallPct:null,
      blockers:['COMPLETE_OWNER_PHASE2_ORIGINAL_TEXT_SHA_COUNT_AND_PROVENANCE_REQUIRED'],
      legacyBoundAgreement:null,rows:[]
    });
  if(!Array.isArray(goldenReport.rows) ||
    !Number.isSafeInteger(goldenReport.observedRowCount) ||
    goldenReport.observedRowCount<=0 ||
    goldenReport.rows.length!==goldenReport.observedRowCount ||
    goldenReport.qualificationSummary?.total!==goldenReport.observedRowCount ||
    goldenReport.rows.some(r=>!isRow(r)) ||
    new Set(goldenReport.rows.map(r=>r.relationId)).size!==goldenReport.rows.length ||
    new Set(goldenReport.rows.map(r=>r.ordinal)).size!==goldenReport.rows.length)
    throw Error('P2_ORIGINAL_GOLDEN_ROW_INTEGRITY_FAILURE');
  if(!SHA.test(goldenReport.custody?.actualSha256||'') ||
    goldenReport.custody?.declaredSha256!==goldenReport.custody?.actualSha256 ||
    goldenReport.custody?.declaredRowCount!==goldenReport.observedRowCount ||
    !REVIEW.test(goldenReport.custody?.ownerEvidenceRef||''))
    throw Error('P2_ORIGINAL_GOLDEN_CUSTODY_NOT_PROVEN');
  if(!SHA.test(expectedSourceSetSha256||'') || !SHA.test(expectedTargetOriginalSha256||''))
    throw Error('P2_ORIGINAL_PHYSICAL_CUSTODY_REQUIRED');
  if(goldenReport.custody.sourceSetSha256!==expectedSourceSetSha256 ||
    goldenReport.custody.targetOriginalSha256!==expectedTargetOriginalSha256)
    throw Error('P2_ORIGINAL_SOURCE_TARGET_DIGEST_DRIFT');
  if(!Array.isArray(physicalReviewReceipts))throw Error('P2_RECEIPTS_MUST_BE_ARRAY');
  const reviewed = new Map();
  const targetOwners=new Map();
  for(const r of physicalReviewReceipts){
    if(r?.schema!==CII_P2_PHYSICAL_RECEIPT_SCHEMA ||
      r.state!=='INDEPENDENT_PASS' ||
      !/^(S1|S2|S3):[0-9]+$/.test(r.sourceNodeKey||'') ||
      !/^[0-9]+$/.test(String(r.targetNodeId||'')) ||
      r.sourceSetSha256!==expectedSourceSetSha256 ||
      r.targetOriginalSha256!==expectedTargetOriginalSha256 ||
      !SHA.test(r.identityProofSha256||'') ||
      !REVIEW.test(r.independentReviewRef||'') ||
      r.globalAssignmentComplete!==true ||
      r.uniqueTargetCustody!==true ||
      r.noUnresolvedAlternatives!==true)
      throw Error('P2_UNVERIFIED_OR_STALE_PHYSICAL_RECEIPT');
    const key=physicalKey(r);
    if(reviewed.has(key))throw Error('P2_DUPLICATE_PHYSICAL_RECEIPT');
    reviewed.set(key,r);
    const id=String(r.targetNodeId);
    if(targetOwners.has(id)&&targetOwners.get(id)!==r.sourceNodeKey)
      throw Error('P2_CONFLICTING_TARGET_PHYSICAL_CUSTODY');
    targetOwners.set(id,r.sourceNodeKey);
  }
  // Preserve all literal Owner rows, including duplicates, invalid,
  // ambiguous and missing rows, in the raw denominator. Identical repeated
  // lexical rows never yield extra recall credit from a single certificate.
  const claimed=new Set(),rows=[],perMember=new Map();
  let validated=0,legacy=0;
  for(const row of goldenReport.rows){
    const member=row.sourceId||'UNSPECIFIED';
    const counts=perMember.get(member)||{member,denominator:0,validated:0,legacyBoundAgreement:0};
    counts.denominator++;
    const legacyBoundAgreement=row.disposition==='MATCHED';
    if(legacyBoundAgreement){legacy++;counts.legacyBoundAgreement++;}
    const candidates=(row.sourcePhysicalNodeKeys||[]).map(sourceNodeKey=>
      (row.targetPhysicalNodeIds||[]).map(targetNodeId=>({sourceNodeKey,targetNodeId}))).flat();
    const exactCandidates=candidates.filter(x=>reviewed.has(physicalKey(x)));
    const disposition=row.disposition||'INVALID';
    const excluded=['INVALID','MISSING','AMBIGUOUS'].includes(disposition) ||
      row.ownerAdjudicationRequired===true || !row.sourceId ||
      row.sourcePhysicalNodeKeys?.length!==1 || row.targetPhysicalNodeIds?.length!==1 ||
      row.reasons?.includes('DUPLICATE_OWNER_RELATION_PRESERVED') ||
      row.reasons?.includes('ONE_SOURCE_LABEL_MULTIPLE_EXPECTED_TARGET_LABELS');
    const uniquenessKey=member+'\u0000'+row.sourceLabel+'\u0000'+row.targetLabel;
    const duplicate=claimed.has(uniquenessKey);
    claimed.add(uniquenessKey);
    const canCount=!excluded && !duplicate && exactCandidates.length===1;
    if(canCount){validated++;counts.validated++;}
    rows.push(Object.freeze({
      relationId:row.relationId,ordinal:row.ordinal,
      sourceId:row.sourceId,sourceLabel:row.sourceLabel,targetLabel:row.targetLabel,
      legacyBoundAgreement,
      reviewedPhysicalReceiptPresent:exactCandidates.length>0,
      independentlyValidatedCandidate:canCount,
      countedInValidatedRecall:canCount,
      physicalSourceKey:canCount?exactCandidates[0].sourceNodeKey:null,
      physicalTargetNodeId:canCount?exactCandidates[0].targetNodeId:null,
      reason:canCount?'EXACT_REVIEWED_PHYSICAL_IDENTITY':
        duplicate?'DUPLICATE_OWNER_LEXICAL_RELATION_NO_EXTRA_CREDIT':
        excluded?'UNRESOLVED_AMBIGUOUS_INVALID_OR_ADJUDICATION':
        'NO_INDEPENDENTLY_REVIEWED_GLOBAL_PHYSICAL_IDENTITY'
    }));
    perMember.set(member,counts);
  }
  const denominator=goldenReport.observedRowCount;
  const rate=pct(validated,denominator);
  return base('TECHNICAL_RECALL_AUDIT_OWNER_ATTESTATION_AND_INDEPENDENT_REVIEW_REQUIRED',{
    denominator,validatedRows:validated,validatedRecallPct:rate,
    thresholdNumericallyReached:rate>=70,
    legacyBoundAgreement:legacy,
    legacyBoundAgreementPct:pct(legacy,denominator),
    reviewedReceiptCount:physicalReviewReceipts.length,
    byMember:[...perMember.values()].sort((a,b)=>a.member.localeCompare(b.member))
      .map(x=>({...x,validatedRecallPct:pct(x.validated,x.denominator)})),
    rows,
    blockers:[
      'ORIGINAL_OWNER_ATTESTATION_MUST_BE_INDEPENDENTLY_CONFIRMED',
      'ALL_PHYSICAL_RECEIPTS_REQUIRE_INDEPENDENT_SOURCE_LEVEL_REVIEW',
      'THIS_TEST_ONLY_AUDIT_DOES_NOT_AUTHORIZE_WRITER_OR_MERGE'
    ],
    sourceSetSha256:expectedSourceSetSha256,
    targetOriginalSha256:expectedTargetOriginalSha256,
    ownerGoldenSha256:goldenReport.custody.actualSha256,
    // A reported numerical threshold is not an Owner acceptance gate.
    ownerAcceptancePending:true
  });
}
