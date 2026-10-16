/**
 * Test-only physical SOURCE/T correspondence certificates from the *frozen*
 * Owner's original intended NodeName relation, independently mapped through
 * original CII ELEMENTS/NODENAME pointers, with exact matcher comparison.
 * Produces no certificate for missing/ambiguous owner names, unresolved
 * physical nodes, conflict/reused TARGET, or absent original graph witness.
 * NEVER provided to production matcher, manual seeds or Writer2.
 */
export function buildCiiMidcycle150OwnerGoldenCertificates({
  resolvedOwnerRows,audit,localPathWitness,originalSourceSetSha256,
  originalTargetSha256,ownerConfirmedDirection,
}) {
 if(ownerConfirmedDirection!==true)throw Error('MIDCYCLE_GOLDEN_OWNER_DIRECTION_NOT_CONFIRMED');
 if(!Array.isArray(resolvedOwnerRows)||resolvedOwnerRows.length!==428)
  throw Error('MIDCYCLE_GOLDEN_FULL_ORIGINAL_428_ROWS_REQUIRED');
 if(!Array.isArray(audit?.rows)||audit.rows.length!==150)
  throw Error('MIDCYCLE_GOLDEN_FULL_CUMULATIVE_SOURCE_150_REQUIRED');
 const observed=new Map(audit.rows.map(r=>[String(r.rowKey),r]));
 if(observed.size!==150)throw Error('MIDCYCLE_GOLDEN_DUPLICATE_ORIGINAL_SOURCE_ROW');
 const physicalWitnesses=new Map((localPathWitness?.rows||[]).map(r=>[String(r.sourcePhysicalKey),r]));
 const targetClaims=new Map();
 for(const row of audit.rows)if(row?.identityBound===true&&row.state==='BOUND'){
  if((row.targetNodeIds||[]).length!==1)throw Error('MIDCYCLE_GOLDEN_MATCHER_BOUND_MULTIPLE_TARGETS');
  const id=String(row.targetNodeIds[0]);
  if(!targetClaims.has(id))targetClaims.set(id,[]);
  targetClaims.get(id).push(String(row.rowKey));
 }
 const seenSource=new Set(),seenTarget=new Set(),certificates=[],skipped=[];
 for(const item of resolvedOwnerRows){
  const r=item.transposedDiagnostic;
  if(!r?.uniquePhysicalPair||r.candidatePairs?.length!==1){
   skipped.push({ownerOrdinal:item.ownerOrdinal,status:'ORIGINAL_NODENAME_PAIR_MISSING_OR_AMBIGUOUS'});
   continue;
  }
  const pair=r.candidatePairs[0],sourceKey=pair.sourceMemberId+':'+pair.sourcePhysicalNodeId,
   targetId=String(pair.targetPhysicalNodeId),auditRow=observed.get(sourceKey),
   path=physicalWitnesses.get(sourceKey);
  const qualified=Boolean(auditRow?.identityBound===true&&auditRow.state==='BOUND'&&
   auditRow.targetNodeIds?.length===1&&
   String(auditRow.targetNodeIds[0])===targetId&&
   (targetClaims.get(targetId)||[]).length===1&&
   path?.state==='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY'&&
   path.locallyUniqueOriginalTargetRelativeToBoundNeighbors===true&&
   path.independentLocalRouteWitnesses?.some(w=>w.withinLengthTolerance&&w.withinVectorTolerance));
  if(!qualified||seenSource.has(sourceKey)||seenTarget.has(targetId)){
   skipped.push({ownerOrdinal:item.ownerOrdinal,sourcePhysicalKey:sourceKey,
     targetId,status:!qualified?'AUTO_BINDING_OR_INDEPENDENT_ORIGINAL_GEOMETRY_NOT_QUALIFIED':'DUPLICATE_SOURCE_OR_TARGET_PHYSICAL_OWNER_GOLDEN'});
   continue;
  }
  if(String(pair.sourceNodeName)!==String(item.rawTargetLabel)||
     String(pair.targetNodeName)!==String(item.rawSourceLabel))
   throw Error('MIDCYCLE_GOLDEN_ORIGINAL_NODE_NAME_PROVENANCE_MISMATCH');
  seenSource.add(sourceKey);seenTarget.add(targetId);
  certificates.push(Object.freeze({
   sourcePhysicalKey:sourceKey,
   targetPhysicalNodeId:targetId,
   certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
   originalSourceSetSha256,originalTargetSha256,
   independentlyConfirmedOwnerOrdinal:item.ownerOrdinal,
   qualificationBasis:'ORIGINAL_OWNER_GOLDEN_INTENDED_RELATION_AND_INDEPENDENT_CII_NODENAME_TO_NUMERIC_NODE_PLUS_LOCAL_GEOMETRY',
   originalPhysicalWitnessIds:Object.freeze([
    'OWNER_ORIGINAL_ROW:'+item.ownerOrdinal,
    'SOURCE_ORIGINAL_CII_NODENAME:'+sourceKey+':'+pair.sourceNodeName,
    'TARGET_ORIGINAL_CII_NODENAME:'+targetId+':'+pair.targetNodeName,
    'SOURCE_TARGET_ORIGINAL_GEOMETRY_LOCAL_ORIGINAL_PATH:'+sourceKey,
   ]),
  }));
 }
 return Object.freeze({
   schema:'CiiMidcycle150IndependentOwnerGoldenCertificates.v1',
   exactOriginalOwnerRowsExamined:resolvedOwnerRows.length,
   qualifiedOwnerGoldenPhysicalCertificates:certificates.length,
   unmatchedOrUnqualifiedGoldenRows:skipped.length,
   certificates:Object.freeze(certificates),
   skipped:Object.freeze(skipped),
   thisDoesNotValidateRemainingUnlabeledSourceNodes:true,
 });
}
