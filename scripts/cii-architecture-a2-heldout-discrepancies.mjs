/**
 * ARCH-01 A2-SHADOW-12: forensic falsification of the real A2-11 S2
 * held-out native-geometry transform. No NODE/EDGE identity admission.
 *
 * Recomputes EVERY held-out geometric NODE choice, lists missing NODEs and
 * incompatible EDGE resources with exact original graph edges, and compares
 * competing near-neighbours and 1-to-many TARGET paths. Engineering revisions
 * remain observations; a geometry fit never becomes a Writer scope.
 */
import { createHash } from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const reject=k=>{throw Error('A212_'+k);};
const deep=x=>Array.isArray(x)?Object.freeze(x.map(deep)):x&&typeof x==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,deep(v)]))):x;
const xyz=x=>{const a=Array.isArray(x)?x:[x?.x,x?.y,x?.z];return a?.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n))?[...a]:null;};
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const distance=(a,b)=>Math.hypot(...sub(a,b));
const round=x=>Math.abs(x)<5e-7?0:Number(x.toFixed(6));
const defaults={
  holdoutToleranceMm:30,
  nearestDiagnosticDistanceMm:350,
  directPhysicalLengthToleranceMm:25,
  pathLengthToleranceMm:25,
  maxSubdivisionSegments:4,
  maxPathsPerEdge:20,
  maxNeighbourExamples:4,
};
function policyFor(o={}){
 const p={...defaults,...o};
 for(const [k,a,b] of [
  ['holdoutToleranceMm',0,1000],['nearestDiagnosticDistanceMm',1,100000],
  ['directPhysicalLengthToleranceMm',0,10000],['pathLengthToleranceMm',0,10000],
  ['maxSubdivisionSegments',1,8],['maxPathsPerEdge',1,100],
  ['maxNeighbourExamples',1,25]]){
  if(!Number.isFinite(p[k])||p[k]<a||p[k]>b||
    (k.startsWith('max')&&!Number.isSafeInteger(p[k])))reject('INVALID_POLICY_'+k);
 }
 if(p.nearestDiagnosticDistanceMm<p.holdoutToleranceMm)reject('DIAGNOSTIC_BAND_BELOW_ACCEPTANCE_BAND');
 return deep(p);
}
function readGraph(g,side,expected){
 if(g?.side!==side||g.documentId!==side+':'+expected||
  !Array.isArray(g.nodes)||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))
  reject('GRAPH_CUSTODY_'+side);
 const nodes=new Map(),edges=new Map(),signatures=new Map();
 for(const n of g.nodes){
  const id=String(n.id);
  if(!id||nodes.has(id))reject('NODE_DUPLICATE_'+side);
  nodes.set(id,{id,position:xyz(n.position)});
 }
 for(const e of g.edges){
  const id=String(e.elementId),a=String(e.from),b=String(e.to);
  if(!id||edges.has(id)||a===b||!nodes.has(a)||!nodes.has(b)||
    !(g.adjacency.get(a)||[]).some(x=>String(x.elementId)===id)||
    !(g.adjacency.get(b)||[]).some(x=>String(x.elementId)===id))
   reject('EDGE_INCIDENCE_'+side);
  edges.set(id,e);
 }
 for(const [id] of nodes){
  const incidents=g.adjacency.get(id)||[];
  if(incidents.length!==g.edges.filter(e=>String(e.from)===id||String(e.to)===id).length)
   reject('INCOMPLETE_EDGE_ADJACENCY_'+side);
  signatures.set(id,incidents.length+'|'+incidents.map(e=>String(e.componentKind)).sort(cmp).join('/'));
 }
 return {nodes,edges,signatures,adjacency:g.adjacency};
}
const edgeOther=(e,n)=>String(e.from)===n?String(e.to):String(e.from);
const length=e=>Number(e.lengthMm);
function findPaths(target,first,last,sourceEdge,p){
 if(first===last)return {witnesses:[],truncated:false};
 const allowed=String(sourceEdge.componentKind);
 // True single physical EDGE witness or straight PIPE 1:N subdivision only.
 const results=[],queue=[{node:first,visited:[first],path:[],sum:0}];
 let truncated=false;
 for(let i=0;i<queue.length;i++){
  const state=queue[i];
  if(state.path.length>=p.maxSubdivisionSegments)continue;
  for(const e of [...(target.adjacency.get(state.node)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
   if(String(e.componentKind)!==allowed)continue;
   const next=edgeOther(e,state.node);
   if(state.visited.includes(next))continue;
   if(state.path.length>=1&&allowed!=='PIPE')continue;
   if(state.path.length>=1&&(target.adjacency.get(state.node)||[]).length!==2)continue;
   if(!Number.isFinite(length(e))||length(e)<=0)continue;
   const candidate={node:next,visited:[...state.visited,next],
    path:[...state.path,String(e.elementId)],sum:state.sum+length(e)};
   if(next===last){
    if(results.length>=p.maxPathsPerEdge){truncated=true;continue;}
    results.push({targetElementIds:candidate.path,targetNodePath:candidate.visited,
      pathLengthMm:round(candidate.sum),
      originalSourceLengthMm:length(sourceEdge),
      physicalLengthDifferenceMm:round(Math.abs(candidate.sum-length(sourceEdge))),
      sameKind:true,lengthWithinDeclaredTolerance:
        Math.abs(candidate.sum-length(sourceEdge))<=
        (candidate.path.length===1?p.directPhysicalLengthToleranceMm:p.pathLengthToleranceMm),
      subdivisionStraightness:round(distance(
        target.nodes.get(first).position,target.nodes.get(last).position
       )/candidate.sum),
      subdivisionStraightnessValid:candidate.path.length===1||
        distance(target.nodes.get(first).position,target.nodes.get(last).position)/
        candidate.sum>=0.995,
      segmentationType:candidate.path.length===1?'ONE_TO_ONE':'PIPE_ONE_TO_MANY',
      hasIntermediateTargetBranch:false});
   }else if(candidate.path.length<p.maxSubdivisionSegments)queue.push(candidate);
  }
 }
 return {witnesses:results,truncated};
}
function assertParent({recall,registrationAudit,reconciliation,sourceId,sourceGraph,targetGraph,
 normalizedSourceSha256,normalizedTargetSha256}){
 if(recall?.schema!=='CiiArchitectureA211IndexedNativeGeometry.v1'
  ||recall.writerReady!==false||recall.certifiedNodeCount!==0
  ||recall.certifiedElementCount!==0||recall.admittedCandidateCount!==0
  ||recall.transferPlan!==null||recall.writeScope!==null
  ||registrationAudit?.schema!=='CiiArchitectureA209IndependentRegistration.v1'
  ||registrationAudit.status!=='BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY'
  ||registrationAudit.writerReady!==false
  ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
  ||reconciliation.writerReady!==false)
   reject('NONWRITING_PARENT_REQUIRED');
 const root=reconciliation.augmentedJoint?.provenance;
 if(!root?.originalSourceShaById?.[sourceId]||
  recall.provenance.originalSourceSetSha256!==root.sourceSetSha256||
  recall.provenance.sourceOriginalSha256!==root.originalSourceShaById[sourceId]||
  recall.provenance.originalTargetSha256!==root.originalTargetSha256||
  recall.provenance.normalizedSourceSha256!==normalizedSourceSha256||
  recall.provenance.normalizedTargetSha256!==normalizedTargetSha256||
  registrationAudit.provenance.originalSourceSetSha256!==root.sourceSetSha256||
  registrationAudit.provenance.originalTargetSha256!==root.originalTargetSha256||
  registrationAudit.provenance.normalizedSourceSha256!==normalizedSourceSha256||
  registrationAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256||
  recall.provenance.sourceId!==sourceId||
  recall.summary.sourceNativeCoordinateNodes!==sourceGraph.nodes.length||
  recall.summary.targetNativeCoordinateNodes!==targetGraph.nodes.length||
  recall.summary.searchComplete!==false)
   reject('STALE_OR_UNQUALIFIED_ORIGINAL_BASIS');
 return root;
}
function geometricAssignments(source,target,h,p,ledger,sourceId){
 const selected=new Map(),used=new Set();
 const sourceFit=h.sourceTriangleNodeIds,targetFit=h.targetTriangleNodeIds;
 if(sourceFit.length!==3||targetFit.length!==3||
   new Set(sourceFit).size!==3||new Set(targetFit).size!==3)
   reject('FIT_TRIANGLE_NOT_INDEPENDENT');
 for(let i=0;i<3;i++){
  if(!source.nodes.has(sourceFit[i])||!target.nodes.has(targetFit[i]))
   reject('FIT_NODE_MISSING');
  selected.set(sourceFit[i],targetFit[i]);used.add(targetFit[i]);
 }
 const rows=[],missing=[],project=x=>h.rotationRows.map((row,i)=>dot(row,x)+h.translationMm[i]);
 if(h.rotationRows.length!==3||h.translationMm?.length!==3
  ||h.rotationRows.some(row=>row.length!==3||row.some(x=>!Number.isFinite(x)))
  ||h.translationMm.some(x=>!Number.isFinite(x)))reject('INVALID_TRANSFORM');
 const available=[...source.nodes.values()].filter(n=>n.position&&!selected.has(n.id)).sort((a,b)=>cmp(a.id,b.id));
 if(available.length>50)reject('PARENT_HELDOUT_NODE_CAP_REQUIRED_FOR_FORENSIC_FIDELITY');
 for(const node of available){
  const predicted=project(node.position),expectedSig=source.signatures.get(node.id);
  const near=[...target.nodes.values()].filter(n=>n.position&&
    distance(n.position,predicted)<=p.nearestDiagnosticDistanceMm)
   .map(n=>({
    targetNodeId:n.id,distanceMm:round(distance(n.position,predicted)),
    targetDegreeKind:target.signatures.get(n.id),
    degreeKindCompatible:target.signatures.get(n.id)===expectedSig,
    alreadyReserved:used.has(n.id),
   }))
   .sort((a,b)=>a.distanceMm-b.distanceMm||cmp(a.targetNodeId,b.targetNodeId));
  // Reproduce A2-11's nearest, compatible and not-reserved 30mm pick.
  const eligible=near.filter(x=>x.degreeKindCompatible&&!x.alreadyReserved
    &&x.distanceMm<=p.holdoutToleranceMm);
  const ambiguous=eligible.length>1&&eligible[1].distanceMm-eligible[0].distanceMm<=1e-6;
  const chosen=!ambiguous&&eligible.length?eligible[0]:null;
  if(chosen){selected.set(node.id,chosen.targetNodeId);used.add(chosen.targetNodeId);}
  const nearestGlobal=[...target.nodes.values()].filter(n=>n.position)
    .map(n=>({targetNodeId:n.id,
      distanceMm:round(distance(n.position,predicted)),
      signedTargetMinusPredictedMm:n.position.map((x,i)=>round(x-predicted[i])),
      degreeKindCompatible:target.signatures.get(n.id)===expectedSig,
      targetDegreeKind:target.signatures.get(n.id)}))
    .sort((a,b)=>a.distanceMm-b.distanceMm||cmp(a.targetNodeId,b.targetNodeId))
    .slice(0,p.maxNeighbourExamples);
  const ledgerRow=ledger.get(sourceId+':'+node.id);
  const record={
    sourceNodeId:node.id,sourceDegreeKind:expectedSig,
    sourceNativePosition:node.position,
    targetPredictedPosition:predicted.map(round),
    status:chosen?'BOUNDED_GEOMETRIC_NODE_HYPOTHESIS_ONLY':
      ambiguous?'AMBIGUOUS_GEOMETRIC_NEIGHBOURS':
      near.some(x=>x.distanceMm<=p.holdoutToleranceMm&&x.degreeKindCompatible&&x.alreadyReserved)
      ?'TARGET_NODE_CUSTODY_COLLISION_WITHIN_HYPOTHESIS':
      near.some(x=>x.distanceMm<=p.holdoutToleranceMm)
      ?'LOCAL_TOPOLOGY_SIGNATURE_MISMATCH_WITHIN_30MM':
      near.length?'NO_TARGET_NODE_WITHIN_30MM':'NO_TARGET_NODE_WITHIN_350MM',
    chosenTargetNodeId:chosen?.targetNodeId||null,
    distanceMm:chosen?.distanceMm??null,
    nearestOriginalTargetGeometry:near.slice(0,p.maxNeighbourExamples),
    nearestGlobalTargetGeometry:nearestGlobal,
    physicalBridgeCounterfactuals:[],
    preexistingLedgerTargets:[...(ledgerRow?.targets||[])].sort(cmp),
    newCandidateAdmitted:false,
  };
  rows.push(record);
  if(!chosen)missing.push(record);
 }
 // Holdout assignment is frozen before probing unadmitted alternative nodes.
 // Any bridge is an independent original physical path *observation*, not a
 // change to the assignment, NODE scope or candidate ledger.
 for(const missingRow of missing){
  const candidates=missingRow.nearestOriginalTargetGeometry
   .filter(x=>x.distanceMm<=p.nearestDiagnosticDistanceMm)
   .map(x=>x.targetNodeId);
  const bridges=[];
  for(const candidateTarget of candidates){
   for(const e of source.adjacency.get(missingRow.sourceNodeId)||[]){
    const sourceNeighbour=edgeOther(e,missingRow.sourceNodeId);
    const targetNeighbour=selected.get(sourceNeighbour);
    if(!targetNeighbour)continue;
    const physical=findPaths(target,candidateTarget,targetNeighbour,e,p);
    const compatible=physical.witnesses.filter(w=>
      w.lengthWithinDeclaredTolerance&&w.subdivisionStraightnessValid);
    if(!compatible.length)continue;
    bridges.push({sourceElementId:String(e.elementId),
      fromUnadmittedSourceNode:missingRow.sourceNodeId,
      toAlreadyProposedSourceNode:sourceNeighbour,
      fromUnadmittedTargetCandidate:candidateTarget,
      toAlreadyProposedTargetNode:targetNeighbour,
      targetPhysicalPaths:compatible,
      certifiesCorrespondence:false});
   }
  }
  missingRow.physicalBridgeCounterfactuals=bridges;
 }
 return {chosen:selected,missing,rows,allHeldOutCount:available.length};
}
function edgeFacts(source,target,assign,p){
 const complete=[],failed=[];
 for(const e of [...source.edges.values()].sort((a,b)=>cmp(a.elementId,b.elementId))){
  const sa=String(e.from),sb=String(e.to);
  if(!assign.has(sa)||!assign.has(sb)||!(assign.get(sa)||assign.get(sb)))continue;
  const ta=assign.get(sa),tb=assign.get(sb);
  const paths=findPaths(target,ta,tb,e,p);
  const directTopology=(target.adjacency.get(ta)||[]).some(te=>
    edgeOther(te,ta)===tb&&String(te.componentKind)===String(e.componentKind));
  const direct=paths.witnesses.find(w=>w.targetElementIds.length===1&&w.lengthWithinDeclaredTolerance);
  const subdivision=paths.witnesses.find(w=>w.targetElementIds.length>1
    &&w.lengthWithinDeclaredTolerance&&w.subdivisionStraightnessValid);
  const witness={sourceElementId:String(e.elementId),sourceEndpoints:[sa,sb],
    targetEndpointHypotheses:[ta,tb],sourceKind:String(e.componentKind),
    sourceRecordedLengthMm:length(e),directPhysicalEdgeTopologyMatches:directTopology,
    pathWitnesses:paths.witnesses,
    witnessListTruncated:paths.truncated,
    status:direct?'DIRECT_SAME_KIND_LENGTH_SUPPORTED_ONLY':
      subdivision?'BOUNDED_PIPE_SUBDIVISION_SUPPORTED_ONLY':
      paths.witnesses.length?'GEOMETRY_OR_LENGTH_REVISION_REVIEW_REQUIRED':
      'NO_DECLARED_COMPONENT_KIND_TARGET_PATH',
    originalEdgeWitnessCertified:false};
  if(direct||subdivision)complete.push(witness);else failed.push(witness);
 }
 return {complete,failed};
}
export function inspectCiiA212HeldOutDiscrepancies({
 recall,registrationAudit,reconciliation,sourceId,sourceGraph,targetGraph,
 normalizedSourceSha256,normalizedTargetSha256,policy={},
}={}){
 const p=policyFor(policy),member=String(sourceId);
 const provenance=assertParent({recall,registrationAudit,reconciliation,sourceId:member,
  sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256});
 const source=readGraph(sourceGraph,'SOURCE',normalizedSourceSha256),
  target=readGraph(targetGraph,'TARGET',normalizedTargetSha256);
 const candidate=recall.hypotheses.find(h=>h.heldOut.supported);
 const ledger=new Map((reconciliation.augmentedJoint.nodeRows||[])
  .map(x=>[x.sourceNodeKey,x]));
 if(!candidate)return deep({
  schema:'CiiArchitectureA212HeldOutDiscrepancies.v1',
  status:'NO_HELDOUT_SUPPORTED_TRANSFORM_IN_BOUNDED_PARENT_SEARCH',
  provenance:{originalSourceSetSha256:provenance.sourceSetSha256,
   originalTargetSha256:provenance.originalTargetSha256,
   sourceOriginalSha256:provenance.originalSourceShaById[member],
   normalizedSourceSha256,normalizedTargetSha256,
   parentA211PolicyDigest:recall.policyDigest,sourceId:member},
  policy:p,summary:{sourceNodeCount:source.nodes.size,sourceElementCount:source.edges.size,
   independentSurveyQualified:false,transformSelected:false,
   incompleteOriginalPhysicalElementsRepaired:0},
  discrepancies:[],heldOutEdges:[],reviewCandidate:null,
  admittedCandidateCount:0,certifiedNodeCount:0,certifiedElementCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
 });
 if(candidate.externallySurveyed!==false||candidate.certified!==false
  ||candidate.writerReady!==false||candidate.canBindScope!==false
  ||candidate.reviewStatus!=='GEOMETRY_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED')
  reject('CANDIDATE_NOT_PROVISIONAL');
 // Reproduce exact original 50-row heldout and 30mm SOURCE/TARGET assignment;
 // this copy is not allowed to mutate the global candidate ledger.
 if(p.holdoutToleranceMm!==recall.policy.candidateNodeToleranceMm)
  reject('FALSIFIER_HOLDOUT_TOLERANCE_MISMATCH');
 const assigned=geometricAssignments(source,target,candidate,p,ledger,member);
 const all=edgeFacts(source,target,assigned.chosen,p);
 // Compare A2-11's held-out-only edge metric, not all SOURCE EDGE factors.
 const fits=new Set(candidate.sourceTriangleNodeIds);
 const heldOutPhysical=all.complete.concat(all.failed).filter(x=>
  !(fits.has(x.sourceEndpoints[0])&&fits.has(x.sourceEndpoints[1])));
 const topologicalMatches=heldOutPhysical.filter(x=>x.directPhysicalEdgeTopologyMatches);
 const topologicalFailures=heldOutPhysical.filter(x=>!x.directPhysicalEdgeTopologyMatches);
 const witnessed=heldOutPhysical.filter(x=>
  x.status==='DIRECT_SAME_KIND_LENGTH_SUPPORTED_ONLY'||
  x.status==='BOUNDED_PIPE_SUBDIVISION_SUPPORTED_ONLY');
 const notWitnessed=heldOutPhysical.filter(x=>!witnessed.includes(x));
 const directOnly=heldOutPhysical.filter(x=>
  x.pathWitnesses.some(w=>w.targetElementIds.length===1));
 const originalClaims=new Map();
 for(const row of reconciliation.augmentedJoint.nodeRows||[]){
  for(const t of row.targets||[]){
   if(!originalClaims.has(t))originalClaims.set(t,[]);
   originalClaims.get(t).push(row.sourceNodeKey);
  }
 }
 const custodyWarnings=[...assigned.chosen].flatMap(([src,tgt])=>
  (originalClaims.get(tgt)||[]).filter(other=>other!==member+':'+src)
   .map(other=>({provisionalSourceNode:member+':'+src,targetNodeId:tgt,
    preexistingOtherSourceClaim:other,
    status:'EXISTING_LEDGER_CUSTODY_REVIEW_ONLY'})));
 return deep({
  schema:'CiiArchitectureA212HeldOutDiscrepancies.v1',
  status:'UNQUALIFIED_TRANSFORM_DISCREPANCIES_ATTESTED_NOT_WRITABLE',
  provenance:{originalSourceSetSha256:provenance.sourceSetSha256,
   originalTargetSha256:provenance.originalTargetSha256,
   sourceOriginalSha256:provenance.originalSourceShaById[member],
   normalizedSourceSha256,normalizedTargetSha256,
   parentA211PolicyDigest:recall.policyDigest,
   inspectedParentCandidateDigest:sha([candidate.sourceTriangleNodeIds,
    candidate.targetTriangleNodeIds,candidate.rotationRows,candidate.translationMm]),
   sourceId:member},
  policy:p,summary:{
   sourceNodeCount:source.nodes.size,sourceElementCount:source.edges.size,
   originalTARGETNodeCount:target.nodes.size,
   fitNodeCount:fits.size,heldOutNodeCount:assigned.allHeldOutCount,
   geometryAssignedHeldOutNodes:assigned.rows.filter(x=>x.chosenTargetNodeId!==null).length,
   unmatchedHeldOutNodes:assigned.missing.length,
   originalA211ReportedMatches:candidate.heldOut.heldOutNodeMatches,
   originalA211ReportedEdgesChecked:candidate.heldOut.heldOutEdgesChecked,
   originalA211ReportedEdgesCompatible:candidate.heldOut.heldOutEdgesCompatible,
   heldOutEdgesReinspected:heldOutPhysical.length,
   heldOutDirectTopologyCompatible:topologicalMatches.length,
   heldOutDirectTopologyIncompatible:topologicalFailures.length,
   directlyOrSubdividedPathSupportedHeldOutEdges:witnessed.length,
   missingStrictPhysicalPathWitnessEdges:notWitnessed.length,
   observedDirectPathCandidates:directOnly.length,
   custodyWarningCount:custodyWarnings.length,
   independentSurveyQualified:false,transformSelected:true,
   missingNodesWithExactPhysicalBridgeCounterfactual:
    assigned.missing.filter(x=>x.physicalBridgeCounterfactuals.length>0).length,
   incompleteOriginalPhysicalElementsRepaired:0,
  },
  reviewCandidate:{
   sourceFitNodeIds:candidate.sourceTriangleNodeIds,
   targetFitNodeIds:candidate.targetTriangleNodeIds,
   rotationRows:candidate.rotationRows,translationMm:candidate.translationMm,
   surveyAttestationAvailable:false,
   independentHeldOutSubchainAttestationAvailable:false,
  },
  discrepancies:assigned.missing,
  heldOutEdges:heldOutPhysical,
  strictlyUnwitnessedEdges:notWitnessed,
  originalTopologyIncompatibleEdges:topologicalFailures,
  existingCustodyWarnings:custodyWarnings,
  limitations:[
   'NODE_HOLDOUT_IS_INTERNAL_GEOMETRY_RECHECK_NOT_EXTERNAL_SURVEY',
   'REPRODUCED_HELDOUT_ASSIGNMENTS_CAN_DIFFER_FROM_A211_IF_DISTANCE_ROUNDING_TIES',
   'DIRECT_PATHS_ARE_LOCAL_AND_TARGET_ELEMENT_OCCUPANCY_NOT_GLOBALLY_CERTIFIED',
   'PIPE_SUBDIVISIONS_ARE_ORDERED_PROVISIONAL_OBSERVATIONS',
   'BEND_OR_MATERIAL_REVISIONS_REQUIRE_INDEPENDENT_RECORD_BASIS',
   'UNMATCHED_NODES_ARE_NOT_AUTOMATIC_CREATES_OR_DELETES',
   'NO_A205_A202_A203_CANDIDATE_LEDGER_MUTATION_OR_WRITER_PERMISSION',
  ],
  admittedCandidateCount:0,certifiedNodeCount:0,certifiedElementCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
 });
}
export function assertCiiA212NoWrite(value){
 if(value?.schema!=='CiiArchitectureA212HeldOutDiscrepancies.v1')
  reject('FORENSIC_SCHEMA_REQUIRED');
 reject('HELDOUT_GEOMETRY_NEVER_WRITER_AUTHORITY');
}
