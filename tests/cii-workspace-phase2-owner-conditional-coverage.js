/**
 * Issue #106 / W9.3: a physically keyed, test-only diagnostic scorer.
 * Reads a fully resolved original CII NodeName->physical-node oracle and an
 * INDEPENDENTLY produced source-target census, not a proposed lexical match
 * list. Never imports this test module or the owner table in production.
 *
 * This reports CONDITIONAL COVERAGE on physically locatable unique owner rows.
 * It deliberately does NOT certify the 428-row Phase 2 R/N denominator,
 * provenance, HUMAN manual seed review, Method A/B equivalence, or Writer.
 */
function asId(raw) {
  const x=String(raw??'').trim();
  if(!/^\d+$/.test(x))throw new Error('PHASE2_PHYSICAL_NODE_ID_INVALID');
  return String(BigInt(x));
}
function fullKey(row) {return String(row.sourceMemberId)+':'+asId(row.sourcePhysicalNodeId);}
const freeze=Object.freeze;
export function scoreCiiOwnerPhysicalCandidateCoverage(ownerCandidateRows, independentAudit, options={}) {
  if(!Array.isArray(ownerCandidateRows)||!Array.isArray(independentAudit?.rows))
    throw new TypeError('PHASE2_PHYSICAL_COVERAGE_ORACLE_OR_AUDIT_REQUIRED');
  const approvedOrientation=options.ownerApprovedOrientation===true;
  const originalDenominator=Number(options.originalDenominator??428);
  if(!Number.isSafeInteger(originalDenominator)||originalDenominator<ownerCandidateRows.length)
    throw new Error('PHASE2_ORIGINAL_OWNER_DENOMINATOR_INVALID');
  const auditBySource=new Map(),targetClaimants=new Map();
  for(const row of independentAudit.rows){
    const key=String(row?.rowKey||'');
    if(!key||auditBySource.has(key))throw new Error('PHASE2_AUDIT_PHYSICAL_SOURCE_CUSTODY_DUPLICATE');
    auditBySource.set(key,row);
    if(row?.identityBound===true&&row?.state==='BOUND'){
      const targets=row.targetNodeIds||[];
      if(targets.length!==1)throw new Error('PHASE2_INVALID_BOUND_TARGET_CARDINALITY');
      const tk=asId(targets[0]);
      if(!targetClaimants.has(tk))targetClaimants.set(tk,[]);
      targetClaimants.get(tk).push(key);
    }
  }
  const oracleSourceClaims=new Map(),seenOrdinals=new Set(),obligations=[];
  for(const owner of ownerCandidateRows){
    const originalOrdinal=Number(owner?.ownerOrdinal);
    if(!Number.isSafeInteger(originalOrdinal)||originalOrdinal<1||originalOrdinal>originalDenominator||seenOrdinals.has(originalOrdinal))
      throw new Error('PHASE2_OWNER_ORDINAL_DUPLICATE_OR_INVALID');
    seenOrdinals.add(originalOrdinal);
    const c=owner.candidatePairs||[];
    if(!owner.exactlyOneCandidate||c.length!==1){
      obligations.push(freeze({ownerOrdinal:originalOrdinal,
        status:'NOT_A_UNIQUE_PHYSICAL_CANDIDATE',credit:0,sourcePhysicalKey:null,targetPhysicalNodeId:null,
        auditStatus:null,evidence:'ORIGINAL_NODENAME_CANDIDATE_MISSING_OR_AMBIGUOUS'}));
      continue;
    }
    const candidate=c[0],sourcePhysicalKey=fullKey(candidate),targetPhysicalNodeId=asId(candidate.targetPhysicalNodeId);
    if(!oracleSourceClaims.has(sourcePhysicalKey))oracleSourceClaims.set(sourcePhysicalKey,new Map());
    const sourceTargets=oracleSourceClaims.get(sourcePhysicalKey);
    if(!sourceTargets.has(targetPhysicalNodeId))sourceTargets.set(targetPhysicalNodeId,[]);
    sourceTargets.get(targetPhysicalNodeId).push(originalOrdinal);
    obligations.push({ownerOrdinal:originalOrdinal,sourcePhysicalKey,targetPhysicalNodeId,
      candidate});
  }
  const ambiguousSourceKeys=new Set([...oracleSourceClaims].filter(([,targets])=>targets.size!==1).map(([source])=>source));
  const collisionTargets=new Set([...targetClaimants].filter(([,sources])=>sources.length>1).map(([id])=>id));
  const seenPhysicalClaims=new Set();
  const resolved=obligations.map(o=>{
    if(o.status)return o;
    const pairKey=o.sourcePhysicalKey+'|'+o.targetPhysicalNodeId;
    const duplicateClaim=seenPhysicalClaims.has(pairKey);
    seenPhysicalClaims.add(pairKey);
    const audit=auditBySource.get(o.sourcePhysicalKey);
    const observed=(audit?.targetNodeIds||[]).map(t=>asId(t));
    const globallyConflicted=collisionTargets.has(o.targetPhysicalNodeId)||observed.some(t=>collisionTargets.has(t));
    const wrong=Boolean(audit?.identityBound===true && audit.state==='BOUND'
      && observed.length===1 && observed[0]!==o.targetPhysicalNodeId);
    const exact=Boolean(audit?.identityBound===true && audit.state==='BOUND'
      && observed.length===1 && observed[0]===o.targetPhysicalNodeId);
    const status=ambiguousSourceKeys.has(o.sourcePhysicalKey)?'ORACLE_SOURCE_MULTIPLE_TARGETS':
      duplicateClaim?'DUPLICATE_OWNER_PHYSICAL_PAIR_NO_EXTRA_CREDIT':
      !audit?'AUDIT_SOURCE_PHYSICAL_NODE_NOT_FOUND':
      globallyConflicted?'GLOBAL_TARGET_CUSTODY_CONFLICT':
      wrong?'WRONG_BOUND_TARGET':
      exact?'INDEPENDENT_SOLVER_BOUND_EXACT_PAIR':
      audit.state==='AMBIGUOUS'?'SOLVER_AMBIGUOUS':
      audit.state==='UNEMITTED'?'SOLVER_UNEMITTED':'SOLVER_UNRESOLVED';
    return freeze({ownerOrdinal:o.ownerOrdinal,sourcePhysicalKey:o.sourcePhysicalKey,
      targetPhysicalNodeId:o.targetPhysicalNodeId,status,credit:status==='INDEPENDENT_SOLVER_BOUND_EXACT_PAIR'?1:0,
      duplicateClaim,auditStatus:audit?.state||null,
      observedTargets:freeze(observed),
      solverAuthority:freeze([...(audit?.authorities||[])]),
      solverEvidenceBases:freeze([...(audit?.evidenceBases||[])]),
    });
  });
  const covered=resolved.filter(o=>o.status!=='NOT_A_UNIQUE_PHYSICAL_CANDIDATE');
  const distinctKeyCount=new Set(covered.map(o=>o.sourcePhysicalKey+'|'+o.targetPhysicalNodeId)).size;
  const exact=resolved.filter(o=>o.credit===1).length;
  const negatives=resolved.filter(o=>o.status==='WRONG_BOUND_TARGET').length;
  const statusCounts=freeze(Object.fromEntries([...new Set(resolved.map(r=>r.status))].sort()
    .map(key=>[key,resolved.filter(r=>r.status===key).length])));
  // Census-wide claims that are outside this incomplete Owner oracle are
  // UNVERIFIED, NOT automatically false positives or correct matches.
  const solverBoundSourcePhysicalKeys=[...auditBySource].filter(([,row])=>row?.identityBound===true&&row?.state==='BOUND')
    .map(([key])=>key);
  const conditionallyAgreedSourceKeys=new Set(resolved.filter(r=>r.credit===1).map(r=>r.sourcePhysicalKey));
  const globalTargetCustodyDuplicates=[...targetClaimants].filter(([,sourceKeys])=>sourceKeys.length>1)
    .map(([targetId,sourceKeys])=>freeze({targetId,sourceKeys:freeze([...sourceKeys])}));
  const score=freeze({
    schema:'CiiOwnerOriginalPhysicalConditionalCoverage.v1',
    originalOwnerDenominator:originalDenominator,
    totalEnumeratedSourcePhysicalNodes:independentAudit.rows.length,
    independentSolverBoundSourceNodeCount:solverBoundSourcePhysicalKeys.length,
    ownerConditionallyAgreedSourceNodeCount:conditionallyAgreedSourceKeys.size,
    boundSourceNodesUnverifiedAgainstIncompleteOwnerOracle:
      solverBoundSourcePhysicalKeys.filter(key=>!conditionallyAgreedSourceKeys.has(key)).length,
    globalDuplicateTargetClaims:freeze(globalTargetCustodyDuplicates),
    originalOwnerRowsSubmitted:ownerCandidateRows.length,
    physicallyLocatableUniqueNameRows:covered.length,
    distinctPhysicalOraclePairs:distinctKeyCount,
    independentlyBoundPhysicalPairAgreement:exact,
    independentBoundWrongTargets:negatives,
    conditionalPhysicalPairAgreementRatio:distinctKeyCount?exact/distinctKeyCount:null,
    statusCounts,
    sourceOriginalCustody:independentAudit.sourceSetSha256||null,
    targetOriginalCustody:independentAudit.target?.contentSha256||null,
    isOwnerDirectionApproved:approvedOrientation,
    P2_VALIDATED_RECALL:null,
    phase2SeventyPercentQualified:false,
    reason:'NAME-RESOLVED_CONDITIONAL_HOLDOUT_NOT_GLOBAL_OWNER_ATTESTED_RECALL',
    noWriterAuthorityFromThisReport:true,
    rows:freeze(resolved),
  });
  return score;
}
