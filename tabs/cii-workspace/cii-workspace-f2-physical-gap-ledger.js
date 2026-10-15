/**
 * ARCH-01 F2 / Issue #102 W4: read-only original SOURCE ELEMENT factor
 * ledger with per-endpoint pre/post target domains and physical path reasons.
 * No expected Owner names, benchmark table, correspondence certification,
 * Transfer plan, or Writer authority are consumed here.
 */
const key=x=>String(x.sourceMember)+':'+String(x.sourceElementId);
const nodeKey=(s,n)=>String(s)+':'+String(n);
const frozen=x=>Object.freeze(x);
const ordered=x=>[...x].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
function requireAudit(x,role){
 if(x?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
  ||x.status!=='SHADOW_PHYSICAL_CONSTRAINTS_ONLY'||x.writerReady!==false
  ||x.certifiedNodeCount!==0||x.certifiedElementCount!==0
  ||!Array.isArray(x.edgeRows)||!x.provenance?.originalSourceSetSha256
  ||!x.provenance?.originalTargetSha256)
  throw Error('F2_GAP_NONWRITING_PHYSICAL_AUDIT_REQUIRED:'+role);
}
function disposition(row) {
 if(row.status==='ENDPOINT_CANDIDATE_MISSING')return 'SOURCE_ENDPOINT_HYPOTHESIS_MISSING';
 if(row.status==='SEARCH_INCOMPLETE')return 'BOUND_EXCEEDED_NOT_PROVEN_ABSENT';
 if(row.status==='LOCAL_PATH_AMBIGUOUS')return 'MULTIPLE_LOCAL_TARGET_ROUTES';
 if(row.status==='NO_COMPATIBLE_BOUNDED_PATH')return 'NO_LOCAL_PATH_WITHIN_DECLARED_LIMIT';
 return 'LOCAL_WITNESS_NOT_GLOBAL_IDENTITY_CERTIFICATE';
}
function investigation(row) {
 if(row.status==='ENDPOINT_CANDIDATE_MISSING')return 'INVESTIGATE_SOURCE_NODE_TARGET_DOMAIN';
 if(row.status==='SEARCH_INCOMPLETE')return 'EXPAND_BOUNDED_TARGET_PATH_EVIDENCE_WITH_FALSIFIERS';
 if(row.status==='LOCAL_PATH_AMBIGUOUS')return 'RECONCILE_ALL_PHYSICAL_TARGET_ROUTE_ALTERNATIVES';
 if(row.status==='NO_COMPATIBLE_BOUNDED_PATH')return 'RECHECK_COMPONENT_KIND_LENGTH_STRAIGHTNESS_AND_TARGET_TOPOLOGY';
 return 'REQUIRE_COMPLETE_GLOBAL_IDENTITY_AND_ENGINEERING_REVISION_EVIDENCE';
}
function requireJoint(j,role,source,originalCount) {
 if(j?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'
  ||j.writerDispatchInstalled!==false||j.transferPlan!==null||j.writeScope!==null
  ||j.provenance?.sourceSetSha256!==source.originalSourceSetSha256
  ||j.provenance?.originalTargetSha256!==source.originalTargetSha256
  ||j.provenance?.physicalOriginalSnapshotDigest!==source.jointSnapshotDigest
  ||!Array.isArray(j.nodeRows)||j.nodeRows.length!==originalCount)
  throw Error('F2_GAP_ORIGINAL_SHA_BOUND_JOINT_REQUIRED:'+role);
 const map=new Map();
 for(const row of j.nodeRows){
  const n=nodeKey(row.sourceId,row.sourceNodeId);
  if(row.sourceNodeKey!==n||map.has(n)||!Array.isArray(row.targets)
    ||new Set(row.targets.map(String)).size!==row.targets.length)
   throw Error('F2_GAP_INVALID_OR_DUPLICATE_NODE_DOMAIN:'+role+':'+n);
  map.set(n,ordered(row.targets.map(String)));
 }
 return map;
}
function reasonsFor(row) {
 const counts=new Map();
 for(const bad of row.invalidCandidatePairs||[]){
  for(const r of bad.reasons||[])counts.set(String(r),(counts.get(String(r))||0)+1);
 }
 return frozen(ordered(counts.keys()).map(reason=>frozen({reason,occurrences:counts.get(reason)})));
}
function witnessEvidence(row) {
 return frozen((row.pathWitnesses||[]).map(w=>frozen({
  targetEndpoints:frozen([...(w.targetEndpoints||[])].map(String)),
  targetElementIds:frozen([...(w.targetElementIds||[])].map(String)),
  targetNodePath:frozen([...(w.targetNodePath||[])].map(String)),
  relation:w.relation,
  propertyWarnings:frozen(ordered(w.propertyWarnings||[])),
 })));
}
export function buildCiiF2PhysicalGapLedger(original,reconciled,{joint,frontier}={}){
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
  ||revised.sourceElementCountExamined!==revised.edgeRows.length
  ||original.policyDigest!==revised.policyDigest)
  throw Error('F2_GAP_SOURCE_POPULATION_CUSTODY_OR_SEARCH_POLICY_CHANGED');
 const before=requireJoint(joint,'BEFORE',original.provenance,joint?.nodeRows?.length);
 const after=requireJoint(reconciled?.augmentedJoint,'AFTER',original.provenance,before.size);
 if([...before].some(([n])=>!after.has(n)))throw Error('F2_GAP_ORIGINAL_SOURCE_NODE_DOMAIN_LOST');
 for(const [n,values] of before)if(values.some(t=>!after.get(n).includes(t)))
  throw Error('F2_GAP_ORIGINAL_TARGET_HYPOTHESIS_REMOVED:'+n);
 if(frontier?.schema!=='CiiArchitectureA204FrontierRecovery.v1'
  ||frontier.status!=='PROVISIONAL_FRONTIER_HYPOTHESES_NONWRITING'
  ||frontier.writerReady!==false||frontier.certifiedNodeCount!==0
  ||frontier.certifiedElementCount!==0
  ||frontier.provenance?.originalSourceSetSha256!==original.provenance.originalSourceSetSha256
  ||frontier.provenance?.originalTargetSha256!==original.provenance.originalTargetSha256
  ||!Array.isArray(frontier.rootCauses))
  throw Error('F2_GAP_SHA_BOUND_FRONTIER_CAUSES_REQUIRED');
 const old=new Map(original.edgeRows.map(x=>[key(x),x]));
 const current=new Map(revised.edgeRows.map(x=>[key(x),x]));
 if(old.size!==original.edgeRows.length||current.size!==revised.edgeRows.length
  ||[...old.keys()].some(id=>!current.has(id)))
  throw Error('F2_GAP_ORIGINAL_ELEMENT_IDENTITY_LOST_OR_DUPLICATED');
 const causes=new Map(frontier.rootCauses.map(x=>[key(x),x]));
 if(causes.size!==frontier.rootCauses.length
  ||causes.size!==frontier.originalMissingPhysicalElementFactors)
  throw Error('F2_GAP_ORIGINAL_MISSING_FACTOR_CAUSES_INCOMPLETE');
 const rows=[...old].map(([sourceElementKey,a])=>{
  const b=current.get(sourceElementKey);
  if(JSON.stringify(a.sourceEndpoints)!==JSON.stringify(b.sourceEndpoints))
   throw Error('F2_GAP_ORIGINAL_ELEMENT_ENDPOINTS_CHANGED');
  const endpoints=a.sourceEndpoints.map((n,i)=>{
   const k=nodeKey(a.sourceMember,n),prior=before.get(k),post=after.get(k);
   if(!prior||!post)throw Error('F2_GAP_ELEMENT_ENDPOINT_OUTSIDE_SOURCE_CENSUS:'+k);
   return frozen({
    sourceNodeKey:k,direction:i===0?'FROM':'TO',
    originalTargets:frozen([...prior]),recheckedTargets:frozen([...post]),
    newUnverifiedTargets:frozen(post.filter(t=>!prior.includes(t))),
    missingInitially:prior.length===0,missingAfter:post.length===0,
   });
  });
  const oldPairs=endpoints[0].originalTargets.length*endpoints[1].originalTargets.length;
  const newPairs=endpoints[0].recheckedTargets.length*endpoints[1].recheckedTargets.length;
  if(oldPairs!==a.candidatePairCount||newPairs!==b.candidatePairCount)
   throw Error('F2_GAP_CANDIDATE_PAIR_PRODUCT_MISMATCH:'+sourceElementKey);
  const cause=causes.get(sourceElementKey);
  if((a.status==='ENDPOINT_CANDIDATE_MISSING')!==Boolean(cause))
   throw Error('F2_GAP_ROOT_FACTOR_CAUSE_STATUS_MISMATCH:'+sourceElementKey);
  if(cause){
   const missingBoth=endpoints.every(x=>x.missingInitially);
   const expected=missingBoth?'BOTH_ENDPOINT_HYPOTHESES_ABSENT':
    endpoints[0].missingInitially?'FROM_ENDPOINT_HYPOTHESES_ABSENT':
    'TO_ENDPOINT_HYPOTHESES_ABSENT';
   if(cause.primaryCause!==expected ||
     JSON.stringify(cause.currentTargetCandidateCounts)!==JSON.stringify(
      endpoints.map(x=>x.originalTargets.length)))
    throw Error('F2_GAP_ROOT_FACTOR_CAUSE_DOMAIN_MISMATCH:'+sourceElementKey);
  }
  return frozen({
   sourceElementKey,sourceMember:a.sourceMember,sourceElementId:a.sourceElementId,
   sourceEndpoints:frozen([...a.sourceEndpoints]),
   endpointDiagnosis:frozen(endpoints),
   originalRootCause:cause?.primaryCause||null,
   originalStatus:a.status,recheckedStatus:b.status,
   disposition:disposition(b),nextInvestigation:investigation(b),
   originalCandidatePairCount:a.candidatePairCount,
   recheckedCandidatePairCount:b.candidatePairCount,
   originalPathWitnesses:a.pathWitnesses.length,
   recheckedPathWitnesses:b.pathWitnesses.length,
   targetPhysicalPathAlternatives:witnessEvidence(b),
   targetPathRejectionReasons:reasonsFor(b),
   boundedSearchIncomplete:Boolean(b.truncated),
   declaredLocalSearchPolicyDigest:revised.policyDigest,
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
 const originalRootCauseCounts={};
 for(const r of rows)if(r.originalRootCause)
  originalRootCauseCounts[r.originalRootCause]=(originalRootCauseCounts[r.originalRootCause]||0)+1;
 if(JSON.stringify(originalRootCauseCounts)!==JSON.stringify(frontier.rootCauseCounts))
  throw Error('F2_GAP_ORIGINAL_ROOT_CAUSE_TOTAL_MISMATCH');
 const byMember=Object.fromEntries([...new Set(rows.map(x=>x.sourceMember))].sort()
  .map(s=>{
   const part=rows.filter(x=>x.sourceMember===s);
   return [s,frozen({physicalElementCount:part.length,
    endpointMissing:part.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING').length,
    localPathAmbiguous:part.filter(x=>x.recheckedStatus==='LOCAL_PATH_AMBIGUOUS').length,
    boundedSearchIncomplete:part.filter(x=>x.boundedSearchIncomplete).length,
    localSupportNotCertified:part.filter(x=>x.recheckedPathWitnesses>0).length})];
  }));
 const investigationCounts={};
 for(const row of rows)investigationCounts[row.nextInvestigation]=(investigationCounts[row.nextInvestigation]||0)+1;
 return frozen({
  schema:'CiiF2PhysicalFactorGapLedger.v1',
  authority:'ORIGINAL_SHA_BOUND_CANONICAL_A2_NONWRITING',
  originalSourceSetSha256:original.provenance.originalSourceSetSha256,
  originalTargetSha256:original.provenance.originalTargetSha256,
  targetLocalSearchPolicyDigest:revised.policyDigest,
  totalPhysicalSourceElements:rows.length,
  originalEndpointMissingFactors:missingOriginal,
  currentEndpointMissingFactors:missingNow,
  originalRootCauseCounts:frozen(originalRootCauseCounts),
  currentMissingEndpointDirectionCounts:frozen({
   BOTH:rows.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING'
     &&x.endpointDiagnosis.every(e=>e.missingAfter)).length,
   FROM:rows.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING'
     &&x.endpointDiagnosis[0].missingAfter&&!x.endpointDiagnosis[1].missingAfter).length,
   TO:rows.filter(x=>x.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING'
     &&x.endpointDiagnosis[1].missingAfter&&!x.endpointDiagnosis[0].missingAfter).length,
  }),
  nextInvestigationCounts:frozen(investigationCounts),
  byMember:frozen(byMember),rows:frozen(rows),
  certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
  transferPlan:null,writeScope:null,
 });
}
