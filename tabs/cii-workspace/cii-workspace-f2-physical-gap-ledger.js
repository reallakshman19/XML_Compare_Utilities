/**
 * ARCH-01 F2 physical-gap ledger: read-only projection of the canonical
 * A2-02/A2-05 factor audits. This does not solve correspondence or grant Writer.
 * Preserve every original physical SOURCE ELEMENT occurrence, including those
 * with no endpoint hypotheses or truncated/ambiguous TARGET paths.
 */
const key=x=>String(x.sourceMember)+':'+String(x.sourceElementId);
const frozen=x=>Object.freeze(x);
function requireAudit(x,role){
 if(x?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
  ||x.status!=='SHADOW_PHYSICAL_CONSTRAINTS_ONLY'||x.writerReady!==false
  ||x.certifiedNodeCount!==0||x.certifiedElementCount!==0
  ||!Array.isArray(x.edgeRows))throw Error('F2_GAP_NONWRITING_PHYSICAL_AUDIT_REQUIRED:'+role);
}
function disposition(row) {
 if(row.status==='ENDPOINT_CANDIDATE_MISSING')return 'SOURCE_ENDPOINT_HYPOTHESIS_MISSING';
 if(row.status==='SEARCH_INCOMPLETE')return 'BOUND_EXCEEDED_NOT_PROVEN_ABSENT';
 if(row.status==='LOCAL_PATH_AMBIGUOUS')return 'MULTIPLE_LOCAL_TARGET_ROUTES';
 if(row.status==='NO_COMPATIBLE_BOUNDED_PATH')return 'NO_LOCAL_PATH_WITHIN_DECLARED_LIMIT';
 return 'LOCAL_WITNESS_NOT_GLOBAL_IDENTITY_CERTIFICATE';
}
export function buildCiiF2PhysicalGapLedger(original, reconciled){
 requireAudit(original,'ORIGINAL');
 const revised=reconciled?.recomputedPathAudit;
 requireAudit(revised,'RECHECKED');
 if(reconciled?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
  ||reconciled.writerReady!==false||reconciled.certifiedNodeCount!==0
  ||reconciled.certifiedElementCount!==0
  ||reconciled.originalEndpointMissingFactors<reconciled.recomputedEndpointMissingFactors)
  throw Error('F2_GAP_RECHECKED_FRONTIER_REQUIRED');
 if(original.provenance.originalSourceSetSha256!==revised.provenance.originalSourceSetSha256
  ||original.provenance.originalTargetSha256!==revised.provenance.originalTargetSha256
  ||original.provenance.jointSnapshotDigest!==revised.provenance.jointSnapshotDigest
  ||original.sourceElementCountExamined!==revised.sourceElementCountExamined
  ||original.sourceElementCountExamined!==original.edgeRows.length
  ||revised.sourceElementCountExamined!==revised.edgeRows.length)
  throw Error('F2_GAP_SOURCE_POPULATION_OR_CUSTODY_CHANGED');
 const old=new Map(original.edgeRows.map(x=>[key(x),x]));
 const current=new Map(revised.edgeRows.map(x=>[key(x),x]));
 if(old.size!==original.edgeRows.length||current.size!==revised.edgeRows.length
  ||[...old.keys()].some(id=>!current.has(id)))
  throw Error('F2_GAP_ORIGINAL_ELEMENT_IDENTITY_LOST_OR_DUPLICATED');
 const rows=[...old].map(([sourceElementKey,a])=>{
  const b=current.get(sourceElementKey);
  if(JSON.stringify(a.sourceEndpoints)!==JSON.stringify(b.sourceEndpoints))
   throw Error('F2_GAP_ORIGINAL_ELEMENT_ENDPOINTS_CHANGED');
  return frozen({
   sourceElementKey,sourceMember:a.sourceMember,sourceElementId:a.sourceElementId,
   sourceEndpoints:frozen([...a.sourceEndpoints]),
   originalStatus:a.status,recheckedStatus:b.status,
   disposition:disposition(b),
   originalCandidatePairCount:a.candidatePairCount,
   recheckedCandidatePairCount:b.candidatePairCount,
   originalPathWitnesses:a.pathWitnesses.length,
   recheckedPathWitnesses:b.pathWitnesses.length,
   boundedSearchIncomplete:Boolean(b.truncated),
   blockers:frozen([...(b.blockers||[])]),
   statusChanged:a.status!==b.status,
   physicalIdentityCertified:false,writerReady:false,
  });
 }).sort((a,b)=>a.sourceMember.localeCompare(b.sourceMember)
  ||a.sourceElementId.localeCompare(b.sourceElementId,undefined,{numeric:true}));
 const missingOriginal=rows.filter(x=>x.originalStatus==='ENDPOINT_CANDIDATE_MISSING').length;
 const missingNow=rows.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING').length;
 if(missingOriginal!==reconciled.originalEndpointMissingFactors
  ||missingNow!==reconciled.recomputedEndpointMissingFactors)
  throw Error('F2_GAP_ENDPOINT_FACTOR_RECONCILIATION_MISMATCH');
 const byMember=Object.fromEntries([...new Set(rows.map(x=>x.sourceMember))].sort()
  .map(s=>{
   const part=rows.filter(x=>x.sourceMember===s);
   return [s,frozen({physicalElementCount:part.length,
    endpointMissing:part.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING').length,
    localPathAmbiguous:part.filter(x=>x.recheckedStatus==='LOCAL_PATH_AMBIGUOUS').length,
    boundedSearchIncomplete:part.filter(x=>x.boundedSearchIncomplete).length,
    localSupportNotCertified:part.filter(x=>x.recheckedPathWitnesses>0).length})];
  }));
 return frozen({
  schema:'CiiF2PhysicalFactorGapLedger.v1',
  authority:'ORIGINAL_SHA_BOUND_CANONICAL_A2_NONWRITING',
  originalSourceSetSha256:original.provenance.originalSourceSetSha256,
  originalTargetSha256:original.provenance.originalTargetSha256,
  totalPhysicalSourceElements:rows.length,
  originalEndpointMissingFactors:missingOriginal,
  currentEndpointMissingFactors:missingNow,
  byMember:frozen(byMember),rows:frozen(rows),
  certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
  transferPlan:null,writeScope:null,
 });
}
