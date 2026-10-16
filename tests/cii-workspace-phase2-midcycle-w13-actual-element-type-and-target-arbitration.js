/**
 * Issue #106 W13 — source/T CII element-type custody, vector-frame falsification,
 * and competing production TARGET Method A/B arbitration.
 * TEST ONLY: never promotes proposed geometry to a production identity, seed,
 * Method B axis, or Writer2 authority. Original 100mm dimensional rule intact.
 */
import {parseCiiMidcycleOriginalPhysicalGeometry} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';
import {compareCiiW12OriginalSegmentedPipeGeometry} from './cii-workspace-phase2-midcycle-w12-original-path-review.js';

const fields=(row,i)=>{
 const start=2+13*i;
 const raw=String(row??'').padEnd(start+13,' ').slice(start,start+13).trim().replace(/[dD]/g,'E');
 if(!raw)return 0;
 const n=Number(raw);
 if(!Number.isSafeInteger(n)||n<0)throw Error('W13_ORIGINAL_CII_AUX_POINTER_INVALID:'+raw);
 return n;
};
const originalElements=raw=>{
 const lines=(Buffer.isBuffer(raw)?raw.toString('latin1'):String(raw)).split(/\r?\n/);
 let on=false;const payload=[];
 for(const line of lines){
  const m=line.match(/^\s*#\$\s+(\S+)/);
  if(m){on=m[1].toUpperCase()==='ELEMENTS';continue;}
  if(on)payload.push(line);
 }
 if(payload.length%15!==0)throw Error('W13_ORIGINAL_ELEMENT_BLOCK_NOT_FIFTEEN_ROWS');
 return Array.from({length:payload.length/15},(_,i)=>{
  const block=payload.slice(i*15,i*15+15);
  const labels=['bend','rigid','expansionJointSlot','restraint','aux13Slot4','aux13Slot5'];
  const row13=Object.fromEntries(labels.map((key,j)=>[key,fields(block[12],j)]));
  const row14={sifOrTee:fields(block[13],4),nodeName:fields(block[13],5)};
  const row15={reducer:fields(block[14],0)};
  // The native CII ELEMENTS format stores auxiliary references; a clear
  // pointer set is NOT a definitive explicit PIPE type code. Validate the
  // live section references rather than guessing element.type from geometry.
  const physicalTypePointers={bend:row13.bend,rigid:row13.rigid,
    expansionJoint:row13.expansionJointSlot,
    sifOrTee:row14.sifOrTee,reducer:row15.reducer};
  const active=Object.entries(physicalTypePointers).filter(([,n])=>n!==0);
  return {originalElementIndex:i,originalElementRowFirst:i*15+1,
    physicalTypePointers,activePhysicalTypeReferences:active.map(([type,pointer])=>({type,pointer})),
    restraintPointer:row13.restraint,nodeNamePointer:row14.nodeName,
    typeEvidence:active.length?'ORIGINAL_AUXILIARY_NONPLAIN_PIPE_REFERENCE':
      'NO_NONPLAIN_AUX_POINTER_BUT_EXPLICIT_PIPE_TYPE_UNAVAILABLE'};
 });
};
const norm=v=>Math.hypot(...v);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
export function inspectCiiW13OriginalElementTypes(originalCii,indices){
 const all=originalElements(originalCii);
 if(!Array.isArray(indices)||!indices.length)throw Error('W13_ORIGINAL_ELEMENT_INDICES_REQUIRED');
 const out=indices.map(index=>{
  if(!Number.isSafeInteger(index)||index<0||index>=all.length)
   throw Error('W13_ORIGINAL_ELEMENT_INDEX_OUT_OF_BOUNDS');
  return all[index];
 });
 return {elementCount:out.length,records:out,
  activeNonPlainAuxiliaryCount:out.reduce((n,r)=>n+r.activePhysicalTypeReferences.length,0),
  plainPipeProvenByExplicitElementType:false,
  canRuleOutAuxiliaryFittings:out.every(r=>!r.activePhysicalTypeReferences.length),
  classification:out.some(r=>r.activePhysicalTypeReferences.length)?
    'REJECT_PLAIN_PIPE_HYPOTHESIS_AUXILIARY_COMPONENT_PRESENT':
    'PLAIN_PIPE_COMPATIBLE_AUX_POINTERS_CLEAR_EXPLICIT_TYPE_UNPROVEN'};
}
function signedOriginalPath(graph,from,to){
 if(!graph.adjacency.has(from)||!graph.adjacency.has(to))return null;
 const state=new Map([[from,{hops:0,ways:1,parent:null,edge:null}]]),q=[from];
 for(let i=0;i<q.length;i++){
  const v=q[i],s=state.get(v);
  for(const edge of graph.adjacency.get(v)){
   const next=edge.from===v?edge.to:edge.from,hops=s.hops+1;
   if(!state.has(next)){
    state.set(next,{hops,ways:s.ways,parent:v,edge});q.push(next);
   }else if(state.get(next).hops===hops){
    state.get(next).ways=Math.min(2,state.get(next).ways+s.ways);
   }
  }
 }
 if(!state.has(to)||state.get(to).ways!==1||from===to)return null;
 let cursor=to,path=[];
 while(cursor!==from){
  const step=state.get(cursor);
  if(!step?.edge||step.parent===null)throw Error('W13_ORIGINAL_SHORTEST_PATH_MALFORMED');
  const edge=step.edge,sign=edge.from===step.parent?1:-1;
  path.push({index:edge.index,vector:edge.delta.map(x=>x*sign),odMm:edge.originalOdMm});
  cursor=step.parent;
 }
 return path.reverse();
}
const vector=path=>path.reduce((v,e)=>v.map((x,i)=>x+e.vector[i]),[0,0,0]);
const length=path=>path.reduce((x,e)=>x+norm(e.vector),0);
function classifyDisplacement(source,target){
 const a=vector(source),b=vector(target),signedResidual=norm(sub(a,b));
 const reversedResidual=norm(a.map((x,i)=>x+b[i]));
 const aa=norm(a),bb=norm(b),cosine=aa>0&&bb>0?dot(a,b)/aa/bb:null;
 return {sourceSignedOriginalVectorMm:a,targetSignedOriginalVectorMm:b,
  signedResidualMm:signedResidual,reversedResidualMm:reversedResidual,
  sourceVectorMagnitudeMm:aa,targetVectorMagnitudeMm:bb,
  cosineDirection:cosine,
  sourceToTargetTranslationCanChangeRelativeDisplacement:false,
  directionLabel:cosine===null?'DEGENERATE_ORIGINAL_VECTOR':
   cosine<-.98?'NEAR_OPPOSITE_ORIGINAL_DIRECTION':
   cosine>.98?'NEAR_PARALLEL_ORIGINAL_DIRECTION':'NONCOLLINEAR_ORIGINAL_DIRECTION',
  100mmSignedDirectionPass:signedResidual<=100};
}
// Alternative geometry must pass original fixed branch, OD, independent
// path-total and signed-vector tests — a scorer REVIEW, not identity authority.
const originalQualified=c=>Boolean(c?.originalRouteUnique&&c.originalBranchCompatible&&
 c.originalOdCompatible&&c.within100mmIndependentLength&&c.within100mmSignedVector);
export function adjudicateCiiW13OriginalEvidence({
 originalSources,originalTarget,w12,w11Qualification,
 immutable100mmTolerance=100,
}={}){
 if(!Array.isArray(originalSources)||
    originalSources.map(x=>x.sourceId).sort().join(',')!=='S1,S2,S3'||
    !originalTarget||immutable100mmTolerance!==100||
    w12?.noCandidateOriginalPathReviews?.length!==23||
    w12?.eightCompetingOriginalTargetReviews?.length!==8||
    w11Qualification?.rows?.length!==22)
   throw Error('W13_COMPLETE_ORIGINAL_150_AND_100MM_EVIDENCE_REQUIRED');
 const sourceGraphs=new Map(originalSources.map(x=>[x.sourceId,parseCiiMidcycleOriginalPhysicalGeometry(x.bytes)]));
 const sourceByName=new Map(originalSources.map(x=>[x.sourceId,x.bytes]));
 const targetGraph=parseCiiMidcycleOriginalPhysicalGeometry(originalTarget);
 const segmentProxies=w12.noCandidateOriginalPathReviews.filter(x=>x.apparentSegmentSplittingProxy);
 const segmentation=segmentProxies.map(p=>{
  const member=p.sourcePhysicalKey.split(':')[0],sourceNode=p.sourcePhysicalKey.split(':')[1];
  const g=sourceGraphs.get(member);
  const variants=(p.perRootOriginalPathEvidence||[]).flatMap(root=>
    (root.closestODBranchCompatibleAlternatives||[]).filter(alt=>
     alt.possibleOriginalSegmentSplittingProxy===true).map(alt=>({root,alt})));
  if(!variants.length)return {sourcePhysicalKey:p.sourcePhysicalKey,
   status:'INCONSISTENT_W12_SEGMENTATION_PROXY_UNVERIFIABLE',newCertifiedMatches:0};
  const original=[];for(const {root,alt} of variants){
   const rootSrc=String(root.trustedOriginalSourceRoot).slice(member.length+1);
   const src=signedOriginalPath(g,rootSrc,sourceNode);
   const tgt=signedOriginalPath(targetGraph,
    String(root.trustedOriginalTargetRoot),String(alt.originalTargetId));
   if(!src||!tgt)continue;
   const sourceTypes=inspectCiiW13OriginalElementTypes(sourceByName.get(member),src.map(x=>x.index));
   const targetTypes=inspectCiiW13OriginalElementTypes(originalTarget,tgt.map(x=>x.index));
   const comparison=compareCiiW12OriginalSegmentedPipeGeometry(src,tgt);
   const typeCompatible=sourceTypes.canRuleOutAuxiliaryFittings&&targetTypes.canRuleOutAuxiliaryFittings;
   original.push({originalTrustedRoot:root.trustedOriginalSourceRoot,
    originalTargetPhysicalNodeId:String(alt.originalTargetId),
    sourceOriginalElementIndexes:src.map(x=>x.index),
    targetOriginalElementIndexes:tgt.map(x=>x.index),
    originalSourceElementTypeReferences:sourceTypes,
    originalTargetElementTypeReferences:targetTypes,
    comparison,
    structuralPlainPipeCompatible:typeCompatible&&comparison.originalStraightConstantOdPathGeometryCompatible,
    plainPipeTypeProven:false,
    independentPhysicalNodeIdentityEstablished:false});
  }
  return {sourcePhysicalKey:p.sourcePhysicalKey,reportedProxyCount:variants.length,
   witnessCount:original.length,witnesses:original,
   status:original.some(x=>x.structuralPlainPipeCompatible)?
     'GEOMETRY_AND_CLEARED_AUX_POINTERS_PLAUSIBLE_NOT_EXPLICIT_TYPE_PROOF':
     'PIPE_SEGMENTATION_NOT_SUPPORTED_BY_ORIGINAL_TYPE_AND_100MM_EVIDENCE',
   newCertifiedMatches:0};
 });
 const signedThree=w12.noCandidateOriginalPathReviews.filter(x=>x.lengthFitsButSignedVectorBreaks);
 const displacements=signedThree.map(r=>{
  const member=r.sourcePhysicalKey.split(':')[0],nodeId=r.sourcePhysicalKey.split(':')[1];
  const roots=(r.perRootOriginalPathEvidence||[]).flatMap(root=>
   (root.closestODBranchCompatibleAlternatives||[]).filter(x=>
    x.within100mmIndependentLength&&!x.within100mmSignedVector).map(alt=>({root,alt})));
  const candidates=roots.map(({root,alt})=>{
   const originalSrc=signedOriginalPath(sourceGraphs.get(member),
    String(root.trustedOriginalSourceRoot).slice(member.length+1),nodeId);
   const originalT=signedOriginalPath(targetGraph,
    String(root.trustedOriginalTargetRoot),String(alt.originalTargetId));
   if(!originalSrc||!originalT)return null;
   const residual=classifyDisplacement(originalSrc,originalT);
   return {trustedRoot:root.trustedOriginalSourceRoot,
    targetPhysicalNodeId:String(alt.originalTargetId),
    originalSourceElementIndexes:originalSrc.map(x=>x.index),
    originalTargetElementIndexes:originalT.map(x=>x.index),
    originalSourcePathLengthMm:length(originalSrc),
    originalTargetPathLengthMm:length(originalT),
    originalLengthResidualMm:Math.abs(length(originalSrc)-length(originalT)),
    ...residual,approvedCoordinateFrameTransform:false,
    productionPhysicalIdentityCertified:false};
  }).filter(Boolean);
  return {sourcePhysicalKey:r.sourcePhysicalKey,originalLengthCompatibleAlternatives:candidates.length,
   alternatives:candidates,
   disposition:'ORIGINAL_SIGNED_DISPLACEMENT_MISMATCH_NOT_REPAIRED_BY_TRANSLATION',
   grantedNewBinding:false};
 });
 const bySource=new Map(w11Qualification.rows.map(row=>[row.sourcePhysicalKey,row]));
 const conflictEight=w12.eightCompetingOriginalTargetReviews.map(c=>{
  const prod=bySource.get(c.sourcePhysicalKey);
  if(!prod||prod.w11Disposition!=='PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET')
   throw Error('W13_PRODUCTION_CONFLICT_ROW_OR_AUTHORITY_MISSING');
  const claims=(prod.productionReviewedTargetPhysicalNodeIds||[]).map(String);
  const roots=(c.originalRootComparisons||[]).map(root=>{
   const alternatives=root.comparedTargetClaims||[];
   return {trustedRoot:root.trustedOriginalSourceRoot,
    originalTRoot:root.originalTargetRoot,
    originalTGeometryHypothesisPasses:alternatives.some(x=>x.isW10Hypothesis&&originalQualified(x.originalGeometry)&&!x.targetAlreadyIndependentlyOccupied),
    productionOriginalGeometryPassingTargets:alternatives.filter(x=>!x.isW10Hypothesis&&
     originalQualified(x.originalGeometry)&&!x.targetAlreadyIndependentlyOccupied).map(x=>String(x.targetPhysicalNodeId)),
    originalHypothesis:alternatives.filter(x=>x.isW10Hypothesis).map(x=>({
     targetPhysicalNodeId:String(x.targetPhysicalNodeId),originalGeometry:x.originalGeometry})),
    productionAlternatives:alternatives.filter(x=>!x.isW10Hypothesis).map(x=>({
     targetPhysicalNodeId:String(x.targetPhysicalNodeId),originalGeometry:x.originalGeometry})),
   };
  });
  const productionDetails=(prod.productionReviewedTargetMethodEvidence||[])
   .filter(x=>claims.includes(String(x.targetPhysicalNodeId)));
  // Reject a claimed Method A/B winner when the production audit still says
  // UNRESOLVED/UNEMITTED. A geometrically close candidate is NOT a Method B
  // second physical axis, and a review row does not prove a winner gap.
  const productionBound=Boolean(prod.provenanceAndProductionIdentitySupported===true&&
   productionDetails.some(x=>x.identityBound===true));
  if(productionBound)throw Error('W13_CONFLICT_CANNOT_COEXIST_WITH_CERTIFIED_PRODUCTION_BINDING');
  return {sourcePhysicalKey:c.sourcePhysicalKey,
    originalHypothesisTarget:String(c.w10HypotheticalTargetNodeId),
    productionReviewedTargets:claims,productionMethodABEvidence:productionDetails,
    productionSourceBlockers:prod.matcherBlockers,
    existingMethodABoundaryDiagnostics:prod.originalMethodABoundaryDiagnostics,
    reviewedProductionSourceCorrespondenceStatus:prod.matcherState,
    perTrustedRootOriginalGeometry:roots,
    productionOriginalGeometryAnyRootPass:roots.some(x=>x.productionOriginalGeometryPassingTargets.length>0),
    hypothesisOriginalGeometryAllRootsPass:roots.length>0&&roots.every(x=>x.originalTGeometryHypothesisPasses),
    alternateOriginalGeometryAllRootsPass:claims.some(tid=>roots.length>0&&roots.every(x=>
      x.productionOriginalGeometryPassingTargets.includes(tid))),
    productionMethodABPhysicalAuthorityEstablished:false,
    acceptedNewPhysicalMatch:false,
    disposition:'UNRESOLVED_METHOD_AB_WINNER_GAP_AND_ORIGINAL_PHYSICAL_IDENTITY_VETO'};
 });
 const summary={originalSourceMembers:['S1','S2','S3'],originalTargetDomainCount:targetGraph.adjacency.size,
  originalSegmentationProxyCount:segmentation.length,
  originalSegmentationExplicitPipeTypeCertified:segmentation.filter(x=>x.witnesses?.some(y=>y.plainPipeTypeProven)).length,
  structuralPlainPipeGeometrySupported:segmentation.filter(x=>x.witnesses?.some(y=>y.structuralPlainPipeCompatible)).length,
  threeSignedVectorFailuresInvestigated:displacements.length,
  signedVectorCasesRepairedByTranslation:0,
  reverseOrientationWithin100mm:displacements.filter(x=>x.alternatives.some(y=>y.reversedResidualMm<=100)).length,
  eightProductionTargetConflictsInvestigated:conflictEight.length,
  productionMethodABCertifiedNewTarget:0,
  addedIndependentlyCertifiedPhysicalPairs:0,
 };
 return {schema:'CiiMidcycleW13ActualOriginalElementTypeAndCompetingTargetAdjudication.v1',
  stage:'W13_READ_ONLY_ORIGINAL_CII_TYPE_POINTER_AND_METHOD_AB_FALSIFICATION',
  immutable100mmToleranceMm:100,
  independentMidcycleBaseline:105,sourcePopulation:150,
  summary,segmentedRunElementTypeChecks:segmentation,
  signedDisplacementFrameChecks:displacements,
  productionCompetingTargetMethodABChecks:conflictEight,
  changesToProductionMatcher:false,ownerGoldenUsedAsMatcherSeed:false,
  newWriter2Authority:false};
}
