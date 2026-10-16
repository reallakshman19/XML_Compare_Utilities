/**
 * Issue #106 W14 — diagnose *missing* production-native Method A/B evidence
 * for eight different-T SOURCE nodes and verify three original S1 displacement
 * failures against raw CII UNITS/COORDS registration records.
 *
 * Test-only and read-only. No new Method A/B qualification, manual seed,
 * geometry transform, correspondence, or Writer2 authority is granted.
 */
import {parseCiiMidcycleOriginalPhysicalGeometry} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';

const id=x=>String(x??'').trim();
const key=(member,node)=>member+':'+node;
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function section(bytes,sectionName){
 const rows=[],all=(Buffer.isBuffer(bytes)?bytes.toString('latin1'):String(bytes)).split(/\r?\n/);
 let inSection=false;
 for(const line of all){
  const header=line.match(/^\s*#\$\s+(\S+)/);
  if(header){inSection=header[1].toUpperCase()===sectionName;continue;}
  if(inSection&&line.trim())rows.push(line);
 }
 return rows;
}
function fixedNumber(line,index){
 const start=2+13*index;
 const value=String(line??'').padEnd(start+13,' ').slice(start,start+13).trim().replace(/[dD]/g,'E');
 if(!value)throw Error('W14_ORIGINAL_COORDINATE_FIELD_MISSING');
 const n=Number(value);if(!Number.isFinite(n))throw Error('W14_ORIGINAL_COORDINATE_NUMERIC_FIELD_INVALID');
 return n;
}
export function parseCiiW14OriginalRegistration(bytes){
 const rows=section(bytes,'COORDS'),units=section(bytes,'UNITS');
 if(!rows.length||!units.length)throw Error('W14_ORIGINAL_COORDS_AND_UNITS_REQUIRED');
 const declared=Number(rows[0].trim());
 if(!Number.isSafeInteger(declared)||declared<0||declared!==rows.length-1)
  throw Error('W14_ORIGINAL_COORDINATE_RECORD_COUNT_INVALID');
 const points=new Map();
 for(const line of rows.slice(1)){
  const node=String(fixedNumber(line,0));
  if(!Number.isSafeInteger(Number(node))||points.has(node))
   throw Error('W14_ORIGINAL_COORDINATE_ANCHOR_ID_INVALID_OR_REUSED');
  points.set(node,[fixedNumber(line,1),fixedNumber(line,2),fixedNumber(line,3)]);
 }
 const mmUnits=units.some(line=>/^\s*SI \(mm\)/i.test(line));
 return {declaredCoordinates:declared,physicalCoordinateSeeds:points,
  ciiUnitsLabel:units.slice(4,6).map(x=>x.trim()),
  physicalOriginalUnitMm: mmUnits,
  unitsAndCoordinateEvidenceAvailable:rows.length>0&&units.length>=4};
}
function absoluteCoordinates(originalBytes,graph){
 const reg=parseCiiW14OriginalRegistration(originalBytes);
 const translation=new Map(), conflicts=[];
 for(const [seedId,seedCoordinate] of reg.physicalCoordinateSeeds){
  const component=graph.componentByNode.get(seedId);
  if(component===undefined){conflicts.push({type:'SEED_NODE_NOT_IN_ORIGINAL_ELEMENTS',seedId});continue;}
  const seedRelative=graph.positions.get(seedId);
  const offset=sub(seedCoordinate,seedRelative);
  if(translation.has(component)&&distance(translation.get(component),offset)>1)
   conflicts.push({type:'INCONSISTENT_ORIGINAL_CII_COMPONENT_COORDS',seedId,component,
     translationResidualMm:distance(translation.get(component),offset)});
  else translation.set(component,offset);
 }
 const at=node=>{
  const component=graph.componentByNode.get(node);
  if(component===undefined||!translation.has(component))return null;
  return graph.positions.get(node).map((x,i)=>x+translation.get(component)[i]);
 };
 return {reg,translation,conflicts,at};
}
function methodAProvenance(row){
 const a=row?.methodA||{},base=a?.bestBase||{},anchors=base?.anchorPairs||[];
 const w=base?.weight||{};
 return {
  nativeStatus:id(a.status)||'NOT_REPORTED',
  readyThreeAnchorBase:Boolean(a.status==='READY'&&base.baseId&&anchors.length>=3),
  nativeAnchorCount:anchors.length,
  score:Number.isFinite(Number(w.total))?Number(w.total):null,
  sourceNativeAnchorIds:anchors.map(x=>id(x.sourceNodeId)),
  targetNativeAnchorIds:anchors.map(x=>id(x.targetNodeId)),
  qualificationBasis:id(row?.basisMethod),
 };
}
function methodBProvenance(row){
 const b=row?.methodB||{},weight=row?.methodBWeight||{};
 return {nativeStatus:id(b.status)||'NOT_REPORTED',
  readyNativeMethodB:b.status==='READY'&&['METHOD_B_NETWORK','METHOD_A_AND_B'].includes(row?.basisMethod),
  originalNativeAxisEvidence:b.axes??b.independentAxes??b.topologyAxes??b.axisEvidence??null,
  originalNativeBlockers:b.blockers??b.reasons??[],
  originalNativeWinnerGap:row?.winnerGap??b.winnerGap??null,
  nativeTotalWeight:Number.isFinite(Number(weight.total))?Number(weight.total):null,
  qualificationBasis:id(row?.basisMethod),
 };
}
export function diagnoseCiiW14MethodABMissingEvidence({
 w11Qualification,w13,w12,rooted,suggestionsByMember,originalSources,originalTarget,
}={}){
 if(w11Qualification?.rows?.length!==22||
  w13?.productionCompetingTargetMethodABChecks?.length!==8||
  w13?.signedDisplacementFrameChecks?.length!==3||
  w12?.noCandidateOriginalPathReviews?.length!==23||
  rooted?.certificates?.length!==105||
  !Array.isArray(originalSources)||
  originalSources.map(x=>x.sourceId).sort().join(',')!=='S1,S2,S3'||
  !(suggestionsByMember&&typeof suggestionsByMember==='object')||!originalTarget)
  throw Error('W14_COMPLETE_ORIGINAL_DATA_AND_METHOD_AB_REQUIRED');
 const forensics=new Map(w11Qualification.rows.map(r=>[r.sourcePhysicalKey,r]));
 const methods=w13.productionCompetingTargetMethodABChecks.map(entry=>{
  const r=forensics.get(entry.sourcePhysicalKey),[member,sourceNode]=entry.sourcePhysicalKey.split(':');
  if(!r||r.w11Disposition!=='PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET')
   throw Error('W14_COMPETING_TARGET_PRODUCTION_AUDIT_CUSTODY_REQUIRED');
  const proposed=id(entry.originalHypothesisTarget);
  if(proposed!==id(r.provisionalOriginalTargetPhysicalNodeId))
   throw Error('W14_GOLDEN_GEOMETRY_AND_PRODUCTION_PROVISIONAL_ID_CONFLICT');
  const all=suggestionsByMember[member];
  if(!Array.isArray(all))throw Error('W14_NATIVE_SUGGESTIONS_MEMBER_MISSING');
  const sameSource=all.filter(x=>id(x.sourceNodeId)===sourceNode);
  const exact=sameSource.filter(x=>id(x.targetNodeId)===proposed);
  const otherReviewed=(r.productionReviewedTargetMethodEvidence||[]).map(x=>({
   targetPhysicalNodeId:id(x.targetPhysicalNodeId),nativeAuthority:id(x.authority),
   nativeEvidenceBasis:id(x.identityEvidenceBasis),nativeDecision:id(x.decision),
   nativeIdentityBound:x.identityBound===true,
   nativeConfidence:x.confidence??null,nativeScore:x.score??null,
   nativeWinnerGap:x.winnerGap??null,
  }));
  const blockers=[];
  if(exact.length===0)blockers.push('NO_NATIVE_AUTO_BASE_SUGGESTION_FOR_EXACT_PROVISIONAL_SOURCE_TARGET_PAIR');
  if(!exact.some(row=>methodAProvenance(row).readyThreeAnchorBase))
   blockers.push('METHOD_A_NO_READY_INDEPENDENT_THREE_ANCHOR_BASE_FOR_EXACT_PAIR');
  if(!exact.some(row=>methodBProvenance(row).readyNativeMethodB))
   blockers.push('METHOD_B_NO_READY_NATIVE_NETWORK_AXIS_TOPOLOGY_OD_GATE_FOR_EXACT_PAIR');
  if(!exact.some(row=>Number.isFinite(Number(row.winnerGap))&&
      Number(row.winnerGap)>=8))
   blockers.push('NO_PROVED_NATIVE_WINNER_GAP_AT_LEAST_EIGHT_FOR_EXACT_PAIR');
  if(r.exactProductionPairReviewRows!==0)
   throw Error('W14_EIGHT_DIFFERENT_TARGET_NO_EXACT_REVIEW_INVARIANT_VIOLATED');
  blockers.push('PRODUCTION_REVIEW_REFERENCES_DIFFERENT_TARGET_AND_NO_EXACT_PAIR_BINDING');
  if(r.targetPhysicalCustodyUncontested!==true)
   blockers.push('GLOBAL_TARGET_CUSTODY_OR_COMPETING_PROVISIONAL_TARGET_VETO');
  return {sourcePhysicalKey:entry.sourcePhysicalKey,sourceMember:member,
   provisionalOriginalTargetPhysicalNodeId:proposed,
   productionReviewedTargetPhysicalNodeIds:r.productionReviewedTargetPhysicalNodeIds,
   productionReviewedNativeRowDetails:otherReviewed,
   productionMatcherState:r.matcherState,productionMatcherConfidence:r.matcherConfidence,
   productionBlockers:r.matcherBlockers,
   productionMethodABoundaryDiagnostics:r.originalMethodABoundaryDiagnostics,
   originalGeometryHypothesisAllTrustedRootsPass:entry.hypothesisOriginalGeometryAllRootsPass,
   productionAlternativesPassAllTrustedRoots:entry.alternateOriginalGeometryAllRootsPass,
   exactNativeAutoSuggestionCount:exact.length,
   sameSourceOtherNativeSuggestions:sameSource.filter(x=>id(x.targetNodeId)!==proposed).length,
   exactNativeMethodA:exact.map(methodAProvenance),
   exactNativeMethodB:exact.map(methodBProvenance),
   missingIndependentEvidence:blockers,
   independentlyCertifiedNewMatch:false,productionAuthorityChanged:false,
  };
 });
 const graphByMember=new Map(originalSources.map(s=>[s.sourceId,parseCiiMidcycleOriginalPhysicalGeometry(s.bytes)]));
 if([...graphByMember.values()].reduce((n,g)=>n+g.adjacency.size,0)!==150)
  throw Error('W14_EXACT_CUMULATIVE_ORIGINAL_150_PHYSICAL_NODES_REQUIRED');
 const targetGraph=parseCiiMidcycleOriginalPhysicalGeometry(originalTarget);
 const seenSourceCertificates=new Set(),seenTargetCertificates=new Set();
 for(const cert of rooted.certificates){
   const physicalSource=id(cert.sourcePhysicalKey),physicalTarget=id(cert.targetPhysicalNodeId);
   const [member,sourceNodeId]=physicalSource.split(':');
   if(cert.certificateStatus!=='INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED'||
    !Array.isArray(cert.originalPhysicalWitnessIds)||!cert.originalPhysicalWitnessIds.length||
    !graphByMember.get(member)?.adjacency.has(sourceNodeId)||
    !targetGraph.adjacency.has(physicalTarget)||
    seenSourceCertificates.has(physicalSource)||seenTargetCertificates.has(physicalTarget))
     throw Error('W14_ROOTED_ORIGINAL_105_UNIQUE_PHYSICAL_CERTIFICATE_CUSTODY_REQUIRED');
   seenSourceCertificates.add(physicalSource);seenTargetCertificates.add(physicalTarget);
 }
 const sourceCoords=new Map(originalSources.map(s=>[s.sourceId,
  absoluteCoordinates(s.bytes,graphByMember.get(s.sourceId))]));
 const targetCoords=absoluteCoordinates(originalTarget,targetGraph);
 // Independently compare source/T absolute coordinate records for physical
 // correspondence roots. This is only a frame-consistency diagnostic: native
 // COORDS may anchor a subset of components and does NOT authorize rotations.
 const independentRoots=rooted.certificates.map(c=>{
   const [member,srcId]=id(c.sourcePhysicalKey).split(':');
   const sourceAbsolute=sourceCoords.get(member)?.at(srcId)||null;
   const targetAbsolute=targetCoords.at(id(c.targetPhysicalNodeId));
   return {sourcePhysicalKey:id(c.sourcePhysicalKey),
     originalTargetNodeId:id(c.targetPhysicalNodeId),
     sourceAbsoluteMm:sourceAbsolute,targetAbsoluteMm:targetAbsolute,
     registeredBothSides:Boolean(sourceAbsolute&&targetAbsolute),
     originalSourceToTargetAbsoluteOffsetMm:sourceAbsolute&&targetAbsolute?
       sub(targetAbsolute,sourceAbsolute):null};
 });
 const registrationByMember=['S1','S2','S3'].map(member=>{
   const pairs=independentRoots.filter(r=>r.sourcePhysicalKey.startsWith(member+':')&&r.registeredBothSides);
   const offsets=pairs.map(r=>r.originalSourceToTargetAbsoluteOffsetMm);
   const reference=offsets[0]||null;
   return {sourceId:member,independentlyCertifiedPairs:pairs.length,
     originalRelativeFrameOffsetReferenceMm:reference,
     maxOffsetDisagreementMm:reference?
       Math.max(...offsets.map(value=>distance(value,reference))):null,
     uniformTranslationProvenForAllComponents:false,
     registeredComponentsOnly:true};
 });
 const displacement=w13.signedDisplacementFrameChecks.map(entry=>{
  const member=entry.sourcePhysicalKey.split(':')[0],sourceCoordinate=sourceCoords.get(member);
  const registered=entry.alternatives.map(alt=>{
   const rootSource=id(alt.trustedRoot).split(':')[1],targetCandidate=id(alt.targetPhysicalNodeId);
   const sourceRoot=sourceCoordinate.at(rootSource),sourceEnd=sourceCoordinate.at(entry.sourcePhysicalKey.split(':')[1]);
   // W13 stores the original physical TARGET candidate; W12 retains the
   // *separate* certified original T ROOT used for that measurement.
   const w12Row=w12.noCandidateOriginalPathReviews.find(x=>x.sourcePhysicalKey===entry.sourcePhysicalKey);
   const correspondingRoot=w12Row?.perRootOriginalPathEvidence?.find(x=>
      x.trustedOriginalSourceRoot===alt.trustedRoot&&
      x.closestODBranchCompatibleAlternatives?.some(t=>id(t.originalTargetId)===targetCandidate&&
      t.within100mmIndependentLength&& !t.within100mmSignedVector));
   const targetRoot=correspondingRoot? id(correspondingRoot.trustedOriginalTargetRoot):null;
   const targetRootAbsolute=targetRoot?targetCoords.at(targetRoot):null;
   const targetEndAbsolute=targetCoords.at(targetCandidate);
   const derivedAbsoluteVectorResidual=sourceRoot&&sourceEnd&&targetRootAbsolute&&targetEndAbsolute?
     distance(sub(sourceEnd,sourceRoot),sub(targetEndAbsolute,targetRootAbsolute)):null;
   return {targetPhysicalNodeId:targetCandidate,originalSourceRootCoordinate:sourceRoot,
    originalSourceNodeCoordinate:sourceEnd,
    originalTargetRootPhysicalNodeId:targetRoot,
    originalTargetRootCoordinate:targetRootAbsolute,
    originalTargetPhysicalNodeCoordinate:targetEndAbsolute,
    bothSidesOriginalCiiCoordsCoverRootAndEndpoint:Boolean(
      sourceRoot&&sourceEnd&&targetRootAbsolute&&targetEndAbsolute),
    independentlyRegisteredRelativeVectorResidualMm:derivedAbsoluteVectorResidual,
    originalAbsoluteFrameDoesNotChangeSignedRelativeVector:true,
    sourceCiiCoordsCoversBoth:Boolean(sourceRoot&&sourceEnd),
    originalLengthResidualMm:alt.originalLengthResidualMm,
    independentSignedVectorResidualMm:alt.signedResidualMm,
    reversedVectorResidualMm:alt.reversedResidualMm,
    changedByPureTranslation:false,
    independentlyApprovedAxisRotation:false};
  });
  return {sourcePhysicalKey:entry.sourcePhysicalKey,
   sourceCiiCoordSeeds:sourceCoordinate.reg.declaredCoordinates,
   targetCiiCoordSeeds:targetCoords.reg.declaredCoordinates,
   sourceUnitsMm:sourceCoordinate.reg.physicalOriginalUnitMm,
   targetUnitsMm:targetCoords.reg.physicalOriginalUnitMm,
   sourceSeededOriginalComponents:sourceCoordinate.translation.size,
   targetSeededOriginalComponents:targetCoords.translation.size,
   originalSourceCoordinateConflicts:sourceCoordinate.conflicts,
   originalTargetCoordinateConflicts:targetCoords.conflicts,
   originalSourceComponentHasAbsoluteRegistration:registered.some(x=>x.sourceCiiCoordsCoversBoth),
   originalTargetRegistrationCoverageNotProofOfCrossFileTransform:true,
   availableOriginalTargetFrameAlternatives:registered,
   originalCoordinateTransformApproved:false,
   status:'ORIGINAL_CII_COORDS_AND_UNITS_AUDITED_VECTOR_MISMATCH_UNRESOLVED',
   newlyCreditedPhysicalPair:false};
 });
 const totals={eightOriginalProductionTargetConflicts:methods.length,
  nativeAutoSuggestionsForProvisionalPairs:methods.reduce((n,r)=>n+r.exactNativeAutoSuggestionCount,0),
  noReadyMethodA:methods.filter(r=>r.missingIndependentEvidence.some(s=>s.startsWith('METHOD_A_NO_READY'))).length,
  noReadyMethodB:methods.filter(r=>r.missingIndependentEvidence.some(s=>s.startsWith('METHOD_B_NO_READY'))).length,
  noProvedWinnerGap:methods.filter(r=>r.missingIndependentEvidence.some(s=>s.startsWith('NO_PROVED_NATIVE_WINNER_GAP'))).length,
  originalDisplacementCases:displacement.length,
  registeredOriginalSourceComponents:displacement.filter(x=>x.originalSourceComponentHasAbsoluteRegistration).length,
  registeredOriginalPairBothSides:independentRoots.filter(x=>x.registeredBothSides).length,
  originalRegistrationCoordinateFrameMismatchAcrossRoots:
    registrationByMember.filter(x=>x.maxOffsetDisagreementMm!==null&&x.maxOffsetDisagreementMm>100).length,
  coordinateFrameRotationsApproved:0,
  newIndependentNodeCredits:0,
 };
 return {schema:'CiiMidcycleW14IndependentMethodABAndOriginalCiiRegistration.v1',
  originalSourceMemberCount:3,originalSourcePhysicalNodeCount:150,
  originalTargetPhysicalNodeCount:targetGraph.adjacency.size,
  rawCoordinateEvidence:{perSource:Object.fromEntries([...sourceCoords].map(([member,reg])=>
   [member,{originalCiiCoordCount:reg.reg.declaredCoordinates,unitsMm:reg.reg.physicalOriginalUnitMm,
    coordinateConflicts:reg.conflicts.length}])),
   target:{originalCiiCoordCount:targetCoords.reg.declaredCoordinates,
    unitsMm:targetCoords.reg.physicalOriginalUnitMm,coordinateConflicts:targetCoords.conflicts.length}},
  totals,productionMethodABMissingEvidence:methods,
  independentlyCertifiedOriginalCoordinateFrameSamples:registrationByMember,
  originalCiiAbsoluteRegistrationAndDisplacements:displacement,
  originalCoordinateRegistrationPermitsMatchingOnlyIfBothMm:
    [...sourceCoords.values()].every(x=>x.reg.physicalOriginalUnitMm)&&targetCoords.reg.physicalOriginalUnitMm,
  qualification:'READ_ONLY_NO_PHYSICAL_IDENTITY_PROMOTION',
  original100mmPolicyUnchanged:true,
  original428OwnerAcceptanceUnchanged:true,writer2AuthorityGranted:false};
}
