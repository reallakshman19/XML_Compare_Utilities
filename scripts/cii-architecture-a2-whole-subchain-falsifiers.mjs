/**
 * ARCH-01 / A2-SHADOW-13 — whole-subchain held-out physical geometry and
 * two-boundary falsifier. Every NODE name below is an original graph locator,
 * never a correspondence acceptance or a Writer scope.
 *
 * Anchors and zone candidates remain provisional A2-12 geometry, not an
 * independent external coordinate survey. In particular, a coherent local
 * translation does not certify an engineering relocation.
 */
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const fail=k=>{throw Error('A213_'+k);};
const freeze=x=>Array.isArray(x)?Object.freeze(x.map(freeze)):x&&typeof x==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,freeze(v)]))):x;
const v3=x=>{const a=Array.isArray(x)?x:[x?.x,x?.y,x?.z];
 return a?.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n))?[...a]:null;};
const sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b)=>a.map((x,i)=>x+b[i]);
const dot=(a,b)=>a.reduce((q,x,i)=>q+x*b[i],0),mul=(a,n)=>a.map(x=>x*n);
const len=a=>Math.hypot(...a),dist=(a,b)=>len(sub(a,b));
const round=x=>Math.abs(x)<0.0000005?0:Number(x.toFixed(6));
const rounded=x=>x.map(round);
const P={coherentTranslationToleranceMm:5,translationMagnitudeMinimumMm:50,
  maxPhysicalEdgesPerPath:12,sourceBoundaryPathSegments:4,
  originalLengthToleranceMm:25,maxShortestPathVisits:200,
  maxReportedCandidatePaths:8,minIndependentBoundaryEnds:2};
function policyOf(o={}){
 const p={...P,...o};
 for(const [key,low,high] of [
  ['coherentTranslationToleranceMm',0.001,1000],
  ['translationMagnitudeMinimumMm',0.001,100000],
  ['maxPhysicalEdgesPerPath',1,40],['sourceBoundaryPathSegments',1,8],
  ['originalLengthToleranceMm',0,10000],['maxShortestPathVisits',1,2000],
  ['maxReportedCandidatePaths',1,100],['minIndependentBoundaryEnds',2,2]]){
  if(!Number.isFinite(p[key])||p[key]<low||p[key]>high
    ||(key.startsWith('max')||key==='minIndependentBoundaryEnds')&&!Number.isSafeInteger(p[key]))
   fail('BAD_POLICY_'+key);
 }
 return freeze(p);
}
function graph(g,side,digest){
 if(g?.side!==side||g.documentId!==side+':'+digest||
  !Array.isArray(g.nodes)||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))
  fail('WRONG_GRAPH_CUSTODY_'+side);
 const nodes=new Map(),edges=new Map();
 for(const n of g.nodes){
  const key=String(n.id);
  if(!key||nodes.has(key)||!v3(n.position))fail('INVALID_OR_DUPLICATE_POSITION_'+side);
  nodes.set(key,v3(n.position));
 }
 for(const e of g.edges){
  const id=String(e.elementId),a=String(e.from),b=String(e.to);
  if(!id||edges.has(id)||a===b||!nodes.has(a)||!nodes.has(b)||
    !(g.adjacency.get(a)||[]).some(x=>String(x.elementId)===id)||
    !(g.adjacency.get(b)||[]).some(x=>String(x.elementId)===id)||
    !Number.isFinite(Number(e.lengthMm))||Number(e.lengthMm)<=0)
   fail('INVALID_EDGE_INCIDENCE_'+side);
  edges.set(id,e);
 }
 for(const node of nodes.keys()){
  if((g.adjacency.get(node)||[]).length!==g.edges.filter(e=>
    String(e.from)===node||String(e.to)===node).length)
   fail('ADJACENCY_INCOMPLETE_'+side);
 }
 return {nodes,edges,adjacency:g.adjacency};
}
const other=(e,n)=>String(e.from)===n?String(e.to):String(e.from);
function shortestPath(g,start,end,maxEdges,maxVisits,kind=null){
 if(!g.nodes.has(start)||!g.nodes.has(end))fail('UNKNOWN_SHORTEST_PATH_NODE');
 if(start===end)return {nodes:[start],edges:[],visitCount:1,truncated:false};
 let visited=new Set([start]),queue=[{at:start,nodes:[start],edges:[]}],truncated=false,steps=0;
 for(let i=0;i<queue.length;i++){
  if(++steps>maxVisits){truncated=true;break;}
  const row=queue[i];
  if(row.edges.length>=maxEdges){truncated=true;continue;}
  for(const e of [...(g.adjacency.get(row.at)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
   if(kind&&String(e.componentKind)!==kind)continue;
   const n=other(e,row.at);
   if(visited.has(n))continue;
   const candidate={at:n,nodes:[...row.nodes,n],edges:[...row.edges,String(e.elementId)]};
   if(n===end)return {...candidate,visitCount:steps,truncated};
   visited.add(n);queue.push(candidate);
  }
 }
 return {nodes:[],edges:[],visitCount:steps,truncated};
}
function provenanceCheck({discrepancy,reconciliation,sourceId,sourceGraph,targetGraph,
 normalizedSourceSha256,normalizedTargetSha256}){
 if(discrepancy?.schema!=='CiiArchitectureA212HeldOutDiscrepancies.v1'
   ||discrepancy.writerReady!==false||discrepancy.admittedCandidateCount!==0
   ||discrepancy.certifiedNodeCount!==0||discrepancy.certifiedElementCount!==0
   ||discrepancy.transferPlan!==null||discrepancy.writeScope!==null
   ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
   ||reconciliation.writerReady!==false)fail('A212_AND_A205_NONWRITING_REQUIRED');
 const root=reconciliation.augmentedJoint?.provenance,s=String(sourceId);
 if(!root?.originalSourceShaById?.[s]
  ||discrepancy.provenance.originalSourceSetSha256!==root.sourceSetSha256
  ||discrepancy.provenance.originalTargetSha256!==root.originalTargetSha256
  ||discrepancy.provenance.sourceOriginalSha256!==root.originalSourceShaById[s]
  ||discrepancy.provenance.normalizedSourceSha256!==normalizedSourceSha256
  ||discrepancy.provenance.normalizedTargetSha256!==normalizedTargetSha256
  ||discrepancy.provenance.sourceId!==s
  ||discrepancy.summary.independentSurveyQualified!==false)
  fail('ORIGINAL_SOURCE_TARGET_PROVENANCE_MISMATCH');
 if(discrepancy.status==='UNQUALIFIED_TRANSFORM_DISCREPANCIES_ATTESTED_NOT_WRITABLE'){
  if(discrepancy.summary.unmatchedHeldOutNodes!==discrepancy.discrepancies.length
   ||discrepancy.summary.heldOutEdgesReinspected!==discrepancy.heldOutEdges.length
   ||!Array.isArray(discrepancy.originalTopologyIncompatibleEdges))
   fail('A212_DISCREPANCY_CENSUS_INCONSISTENT');
 }else if(discrepancy.status!=='NO_HELDOUT_SUPPORTED_TRANSFORM_IN_BOUNDED_PARENT_SEARCH')
  fail('UNKNOWN_A212_STATUS');
 return root;
}
function assignedMap(discrepancy){
 const map=new Map();
 const add=(s,t)=>{if(map.has(s)&&map.get(s)!==t)
   fail('A212_DUPLICATE_SOURCE_DIFFERENT_TARGET');map.set(s,t);};
 const fit=discrepancy.reviewCandidate;
 if(!fit)return map;
 if(fit.sourceFitNodeIds.length!==3||fit.targetFitNodeIds.length!==3||
  new Set(fit.sourceFitNodeIds).size!==3||
  new Set(fit.targetFitNodeIds).size!==3)fail('INVALID_FIT_SEED_PAIR');
 fit.sourceFitNodeIds.forEach((s,i)=>add(s,fit.targetFitNodeIds[i]));
 for(const e of discrepancy.heldOutEdges){
  e.sourceEndpoints.forEach((s,i)=>add(s,e.targetEndpointHypotheses[i]));
 }
 return map;
}
function retainedPaths(target,start,end,sourceEdge,p){
 // Explicit complete bounded enumeration of only declared edge kind, with
 // PIPE 1:N only; target subdivision interiors must be degree-2, collinear.
 const paths=[],q=[{nodes:[start],elements:[],lengthMm:0}],kind=String(sourceEdge.componentKind);
 let visits=0,truncated=false;
 for(let i=0;i<q.length;i++){
  if(++visits>p.maxShortestPathVisits){truncated=true;break;}
  const item=q[i],at=item.nodes.at(-1);
  if(item.elements.length>=p.sourceBoundaryPathSegments)continue;
  for(const e of [...(target.adjacency.get(at)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
   if(String(e.componentKind)!==kind)continue;
   const next=other(e,at);
   if(item.nodes.includes(next))continue;
   if(item.elements.length>=1&&(kind!=='PIPE'||(target.adjacency.get(at)||[]).length!==2))continue;
   const nodes=[...item.nodes,next],elements=[...item.elements,String(e.elementId)];
   const lengthMm=item.lengthMm+Number(e.lengthMm);
   if(next===end){
    const lengthDelta=Math.abs(lengthMm-Number(sourceEdge.lengthMm));
    const straightness=dist(target.nodes.get(start),target.nodes.get(end))/lengthMm;
    const witness={targetNodePath:nodes,targetElementIds:elements,
      targetLengthMm:round(lengthMm),sourceLengthMm:Number(sourceEdge.lengthMm),
      lengthDifferenceMm:round(lengthDelta),straightness:round(straightness),
      originalComponentKind:kind,
      physicalPathStrictlyCompatible:lengthDelta<=p.originalLengthToleranceMm+1e-9
       &&(elements.length===1||straightness>=0.995),
      provisionalOnly:true};
    if(paths.length>=p.maxReportedCandidatePaths)truncated=true;
    else paths.push(witness);
   }else if(elements.length<p.sourceBoundaryPathSegments)q.push({nodes,elements,lengthMm});
  }
 }
 return {witnesses:paths,truncated,visits};
}
function neighboursWithLedger(g,node,exclude,assigned){
 return [...(g.adjacency.get(node)||[])].map(e=>{
  const neighbour=other(e,node);
  return {sourceElementId:String(e.elementId),sourceNeighbourId:neighbour,
   outsideSourceZone:!exclude.has(neighbour),
   proposedTargetNeighbourId:assigned.get(neighbour)||null,
   sourceComponentKind:String(e.componentKind),
   sourcePhysicalLengthMm:Number(e.lengthMm),rawEdge:e};
 }).sort((a,b)=>cmp(a.sourceElementId,b.sourceElementId));
}
function zoneEvidence({name,sourceIds,missing,source,target,assigned,discrepancy,p,custody}){
 const zone=new Set(sourceIds);
 const members=sourceIds.map(id=>{
  const m=missing.get(id);
  if(!m)fail('ZONE_NODE_NOT_MISSING_FROM_PARENT_'+id);
  const nearest=m.nearestGlobalTargetGeometry?.[0];
  if(!nearest?.targetNodeId||!target.nodes.has(nearest.targetNodeId))
   fail('MISSING_NEAREST_ORIGINAL_TARGET_NODE');
  const pos=source.nodes.get(id),targetPos=target.nodes.get(nearest.targetNodeId);
  if(!pos||!targetPos||!m.sourceNativePosition||dist(pos,m.sourceNativePosition)>0.000001
   ||dist(targetPos,m.targetPredictedPosition.map((x,i)=>x+nearest.signedTargetMinusPredictedMm[i]))>0.005)
   fail('A212_COORDINATE_WITNESS_NOT_REPRODUCIBLE');
  return {sourceNodeId:id,targetNodeHypothesis:nearest.targetNodeId,
   distanceFromGlobalTransformMm:nearest.distanceMm,
   targetMinusPredictedMm:nearest.signedTargetMinusPredictedMm,
   originalSourcePositionMm:pos,originalTargetPositionMm:targetPos,
   sourcePositionRelativeToGlobal:sub(pos,discrepancy.reviewCandidate?.sourceFitNodeIds?.length
    ?source.nodes.get(discrepancy.reviewCandidate.sourceFitNodeIds[0]):pos),
   preexistingCandidateTargets:m.preexistingLedgerTargets,
   admitted:false};
 });
 const displacement=members.map(x=>x.targetMinusPredictedMm);
 const centroid=[0,1,2].map(i=>displacement.reduce((q,x)=>q+x[i],0)/displacement.length);
 const maxSpread=Math.max(...displacement.map(x=>dist(x,centroid)));
 const selected=members.map(m=>m.sourceNodeId),sourcePathParts=[],targetPathParts=[];
 for(let i=1;i<members.length;i++){
  const a=members[i-1],b=members[i];
  sourcePathParts.push(shortestPath(source,a.sourceNodeId,b.sourceNodeId,
   p.maxPhysicalEdgesPerPath,p.maxShortestPathVisits));
  targetPathParts.push(shortestPath(target,a.targetNodeHypothesis,b.targetNodeHypothesis,
   p.maxPhysicalEdgesPerPath,p.maxShortestPathVisits));
 }
 const pathComplete=sourcePathParts.length>0&&sourcePathParts.every(x=>x.nodes.length>0)
  &&targetPathParts.every(x=>x.nodes.length>0);
 const interiorPhysicalSegments=sourcePathParts.map((sp,i)=>{
  const tp=targetPathParts[i],se=sp.edges.map(id=>source.edges.get(id)),
    te=tp.edges.map(id=>target.edges.get(id));
  const sl=se.reduce((sum,e)=>sum+Number(e.lengthMm),0),
    tl=te.reduce((sum,e)=>sum+Number(e.lengthMm),0);
  const sourceKinds=se.map(e=>String(e.componentKind)),
    targetKinds=te.map(e=>String(e.componentKind));
  const pairedEdgeKindsCompatible=sourceKinds.length===targetKinds.length
   &&sourceKinds.every((kind,j)=>kind===targetKinds[j]);
  return {
   sourceStartNode:members[i].sourceNodeId,
   sourceEndNode:members[i+1].sourceNodeId,
   targetStartNodeHypothesis:members[i].targetNodeHypothesis,
   targetEndNodeHypothesis:members[i+1].targetNodeHypothesis,
   sourcePhysicalElements:sp.edges,targetPhysicalElements:tp.edges,
   sourceComponentKinds:sourceKinds,targetComponentKinds:targetKinds,
   sourceTotalRecordedLengthMm:round(sl),
   targetTotalRecordedLengthMm:round(tl),
   originalRecordedLengthDifferenceMm:round(Math.abs(sl-tl)),
   pairedEdgeComponentKindsCompatible:pairedEdgeKindsCompatible,
   strictOriginalLengthMatch:sp.edges.length>0&&tp.edges.length>0
    &&pairedEdgeKindsCompatible&&Math.abs(sl-tl)<=p.originalLengthToleranceMm,
   sourceAndTargetPathEnumerationComplete:!sp.truncated&&!tp.truncated,
   noIdentityCertificate:true,
  };
 });
 const R=discrepancy.reviewCandidate?.rotationRows;
 const srcDisp=source.nodes.has(selected[0])&&source.nodes.has(selected.at(-1))
  ?sub(source.nodes.get(selected.at(-1)),source.nodes.get(selected[0])):null;
 const predDelta=R&&srcDisp?R.map(row=>dot(row,srcDisp)):null;
 const tgtDelta=sub(target.nodes.get(members.at(-1).targetNodeHypothesis),
  target.nodes.get(members[0].targetNodeHypothesis));
 const relativeError=predDelta?dist(predDelta,tgtDelta):null;
 const outside=members.flatMap(m=>neighboursWithLedger(source,m.sourceNodeId,zone,assigned)
  .filter(x=>x.outsideSourceZone).map(x=>{
   const original=source.edges.get(x.sourceElementId);
   const t=x.proposedTargetNeighbourId;
   const links=t?retainedPaths(target,m.targetNodeHypothesis,t,original,p):null;
   return {fromZoneSource:m.sourceNodeId,fromUnadmittedTarget:m.targetNodeHypothesis,
    outsideSource:x.sourceNeighbourId,outsideProposedTarget:t,
    sourceElementId:x.sourceElementId,sourceKind:x.sourceComponentKind,
    originalLengthMm:x.sourcePhysicalLengthMm,
    independentOriginalTargetPathWitnesses:links?.witnesses||[],
    boundedSearchTruncated:links?.truncated||false,
    hasStrictPhysicalBoundaryWitness:!!links?.witnesses?.some(w=>w.physicalPathStrictlyCompatible),
    independentlySurveyed:false};
  }));
 const originalClaimByTarget=new Map();
 for(const row of custody||[]){
  for(const t of row.targets||[]){
   if(!originalClaimByTarget.has(t))originalClaimByTarget.set(t,[]);
   originalClaimByTarget.get(t).push(row.sourceNodeKey);
  }
 }
 const conflicts=members.flatMap(m=>
  (originalClaimByTarget.get(m.targetNodeHypothesis)||[])
   .filter(claim=>claim!=='S2:'+m.sourceNodeId)
   .map(claim=>({provisionalSourceNode:'S2:'+m.sourceNodeId,
    targetNode:m.targetNodeHypothesis,existingClaim:claim})));
 const qualifyingBoundaries=outside.filter(x=>x.outsideProposedTarget
   &&x.hasStrictPhysicalBoundaryWitness);
 const distinctBoundaryEnds=new Set(qualifyingBoundaries.map(x=>x.fromZoneSource));
 const independentClosure=distinctBoundaryEnds.size>=p.minIndependentBoundaryEnds
  &&outside.every(x=>x.hasStrictPhysicalBoundaryWitness)
  &&conflicts.length===0;
 const coherentTranslation=members.length>=3
  &&len(centroid)>=p.translationMagnitudeMinimumMm
  &&maxSpread<=p.coherentTranslationToleranceMm;
 return freeze({
  zoneName:name,originalSourceNodes:selected,
  unadmittedSourceTargetGeometryPairs:members.map(m=>({
   sourceNodeId:m.sourceNodeId,targetNodeHypothesis:m.targetNodeHypothesis,
   distanceFromGlobalTransformMm:m.distanceFromGlobalTransformMm,
   displacementMm:m.targetMinusPredictedMm,
   preexistingCandidateTargets:m.preexistingCandidateTargets})),
  meanTargetMinusGlobalTransformMm:rounded(centroid),
  maximumOffsetSpreadMm:round(maxSpread),
  originalSourceAndTargetRelativeEndpointVectorResidualMm:
   relativeError===null?null:round(relativeError),
  coherentTranslationGeometryOnly:coherentTranslation,
  sourceWholeSubchainSegments:sourcePathParts.map(x=>({nodes:x.nodes,physicalElements:x.edges,
   graphTruncated:x.truncated})),
  targetWholeSubchainSegments:targetPathParts.map(x=>({nodes:x.nodes,physicalElements:x.edges,
   graphTruncated:x.truncated})),
  wholeSubchainRouteConnected:pathComplete,
  orderedOriginalSubchainPhysicalComparisons:interiorPhysicalSegments,
  entireOrderedInternalPhysicalSubchainStrictlyCompatible:
   pathComplete&&interiorPhysicalSegments.every(x=>x.strictOriginalLengthMatch
    &&x.sourceAndTargetPathEnumerationComplete),
  outsideBoundaryPhysicalEdges:outside,
  twoIndependentBoundaryClosuresProven:independentClosure,
  independentlyVerifiedBoundaryEnds:distinctBoundaryEnds.size,
  existingTargetCustodyConflicts:conflicts,
  physicalEngineeringRevisionAuthorized:false,
  zoneDisposition:coherentTranslation?
   'COHERENT_DISPLACEMENT_WITHOUT_INDEPENDENT_BOUNDARY_REVISION_AUTHORITY':
   'NON_COHERENT_OR_ISOLATED_GEOMETRY_MISMATCH_NOT_CERTIFIED',
  certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
 });
}
export function reviewCiiA213WholeSubchains({
 discrepancy,reconciliation,sourceId,sourceGraph,targetGraph,
 normalizedSourceSha256,normalizedTargetSha256,policy={},
}={}){
 const p=policyOf(policy),member=String(sourceId);
 const root=provenanceCheck({discrepancy,reconciliation,sourceId:member,
  sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256});
 const source=graph(sourceGraph,'SOURCE',normalizedSourceSha256),
  target=graph(targetGraph,'TARGET',normalizedTargetSha256);
 const basis={originalSourceSetSha256:root.sourceSetSha256,
  originalTargetSha256:root.originalTargetSha256,
  sourceOriginalSha256:root.originalSourceShaById[member],
  normalizedSourceSha256,normalizedTargetSha256,
  parentA212CandidateDigest:sha(discrepancy.reviewCandidate),
  parentA212MismatchDigest:sha(discrepancy.discrepancies),
  sourceId:member};
 if(discrepancy.status==='NO_HELDOUT_SUPPORTED_TRANSFORM_IN_BOUNDED_PARENT_SEARCH')
  return freeze({schema:'CiiArchitectureA213WholeSubchainFalsifiers.v1',
   status:'BLOCKED_WITHOUT_A212_HELDOUT_SUPPORTED_TRANSFORM',
   provenance:basis,policy:p,reviewZones:[],summary:{sourceNodeCount:source.nodes.size,
    reviewedOriginalZones:0,independentlyCertifiedSubchains:0,
    originalPhysicalElementGapsRepaired:0},
   custodyVetoes:[],certifiedNodeCount:0,certifiedElementCount:0,
   admittedCandidateCount:0,correspondenceCertificates:[],
   writerReady:false,transferPlan:null,writeScope:null});
 if(member!=='S2')fail('A213_ORIGINAL_S2_ZONE_REVIEW_ONLY');
 if(discrepancy.summary.unmatchedHeldOutNodes!==6||
  discrepancy.summary.heldOutDirectTopologyIncompatible!==3)
  fail('A212_ORIGINAL_S2_CENSUS_CHANGED');
 const missing=new Map(discrepancy.discrepancies.map(x=>[x.sourceNodeId,x]));
 const originalFour=['630','640','660','669'];
 if(originalFour.some(id=>!missing.has(id))||!missing.has('40')||!missing.has('210'))
  fail('ORIGINAL_S2_DISCREPANCY_SET_NOT_PRESENT');
 const assigned=assignedMap(discrepancy);
 const zones=[
  zoneEvidence({name:'S2_END_NODE_DEGREE_AND_PIPE_SPLIT',sourceIds:['40'],
    missing,source,target,assigned,discrepancy,p,custody:reconciliation.augmentedJoint.nodeRows}),
  zoneEvidence({name:'S2_1500MM_SINGLE_NODE_OUTLIER',sourceIds:['210'],
    missing,source,target,assigned,discrepancy,p,custody:reconciliation.augmentedJoint.nodeRows}),
  zoneEvidence({name:'S2_FOUR_NODE_200MM_SHIFT',sourceIds:originalFour,
    missing,source,target,assigned,discrepancy,p,custody:reconciliation.augmentedJoint.nodeRows}),
 ];
 const custodyVetoes=discrepancy.existingCustodyWarnings||[];
 if(discrepancy.summary.custodyWarningCount!==custodyVetoes.length||
   custodyVetoes.some(x=>!x.preexistingOtherSourceClaim||!x.targetNodeId))
  fail('PARENT_CUSTODY_VETO_TAMPERED');
 return freeze({
  schema:'CiiArchitectureA213WholeSubchainFalsifiers.v1',
  status:'S2_WHOLE_SUBCHAINS_REVIEW_ONLY_WITH_CUSTODY_AND_BOUNDARY_VETOES',
  provenance:basis,policy:p,
  reviewZones:zones,custodyVetoes,
  summary:{
   sourceNodeCount:source.nodes.size,
   sourceElementCount:source.edges.size,
   originalUnmatchedSourceNodes:discrepancy.discrepancies.length,
   originalIncompleteElementFactorsRepaired:0,
   originalS2DirectOrSubdividedWitnessedHeldOutEdges:
    discrepancy.summary.directlyOrSubdividedPathSupportedHeldOutEdges,
   zonesReviewed:zones.length,
   coherentLocalTranslationZones:zones.filter(x=>x.coherentTranslationGeometryOnly).length,
   zonesWithTwoIndependentBoundaryClosures:zones.filter(x=>x.twoIndependentBoundaryClosuresProven).length,
   wholeSubchainConnectedZones:zones.filter(x=>x.wholeSubchainRouteConnected).length,
   unresolvedTargetCustodyVetoes:custodyVetoes.length,
   independentlyCertifiedSubchains:0,
  },
  limitations:[
   'SOURCE_SUBCHAINS_ARE_HELD_OUT_FROM_FIT_BUT_NOT_INDEPENDENTLY_SURVEYED',
   'TRANSLATION_ZONE_COHERENCE_DOES_NOT_AUTHORIZE_ENGINEERING_REVISION',
   'SOURCE_TARGET_SHORTEST_PATHS_ARE_TOPOLOGICAL_FALSIFIERS_NOT_IDENTITY',
   'TWO_INDEPENDENT_ORIGINAL_BOUNDARY_WITNESSES_REQUIRED_FOR_LOCAL_CLOSURE',
   'EXISTING_TARGET_CUSTODY_CLAIMS_REQUIRE_INDEPENDENT_ADJUDICATION',
   'NO_200MM_OR_1500MM_GLOBAL_MATCH_TOLERANCE_RELAXATION',
   'NO_A205_A202_A203_LEDGER_PROMOTION_OR_WRITER_AUTHORITY',
  ],
  certifiedNodeCount:0,certifiedElementCount:0,admittedCandidateCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
 });
}
export function assertCiiA213NoWrite(result){
 if(result?.schema!=='CiiArchitectureA213WholeSubchainFalsifiers.v1')
  fail('REVIEW_SCHEMA_REQUIRED');
 fail('A213_WHOLE_SUBCHAIN_GEOMETRY_NEVER_WRITER_AUTHORITY');
}
