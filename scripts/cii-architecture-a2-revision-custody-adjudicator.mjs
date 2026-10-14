/**
 * ARCH-01 A2-14 — independent read-only original engineering-revision and
 * TARGET custody qualification ledger. Never equate length, chord, displacement,
 * owner-supplied revision claims or review status with physical identity.
 * This module is not imported by production matchers or Writer.
 */
import {createHash} from 'node:crypto';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const H=/^[a-f0-9]{64}$/i;
const fail=s=>{throw Error('A214_'+s);};
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const pos=x=>Array.isArray(x)&&x.length===3&&x.every(finite)?x:null;
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const norm=x=>Math.hypot(...x);
const round=x=>Math.abs(x)<0.0000005?0:Number(x.toFixed(6));
const freeze=x=>Array.isArray(x)?Object.freeze(x.map(freeze)):x&&typeof x==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,freeze(v)]))):x;

function physicalGraph(graph,side,sha){
 if(!H.test(String(sha))||graph?.side!==side||graph.documentId!==side+':'+sha
  ||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)
  ||!(graph.adjacency instanceof Map))fail('GRAPH_BASIS_'+side);
 const nodes=new Map(),edges=new Map();
 for(const n of graph.nodes){
  const id=String(n.id);
  if(!id||nodes.has(id)||!pos(n.position))fail('INVALID_NODE_'+side);
  nodes.set(id,pos(n.position));
 }
 for(const e of graph.edges){
  const id=String(e.elementId),a=String(e.from),b=String(e.to);
  if(!id||edges.has(id)||a===b||!nodes.has(a)||!nodes.has(b)
   ||!finite(Number(e.lengthMm))||Number(e.lengthMm)<=0
   ||!['PIPE','BEND','RIGID'].includes(String(e.componentKind))
   ||!(graph.adjacency.get(a)||[]).some(z=>String(z.elementId)===id)
   ||!(graph.adjacency.get(b)||[]).some(z=>String(z.elementId)===id))
   fail('INVALID_ELEMENT_'+side);
  edges.set(id,e);
 }
 for(const id of nodes.keys()){
  const supplied=(graph.adjacency.get(id)||[]).map(x=>String(x.elementId)).sort(cmp);
  const actual=[...edges.values()].filter(e=>String(e.from)===id||String(e.to)===id)
   .map(x=>String(x.elementId)).sort(cmp);
  if(JSON.stringify(supplied)!==JSON.stringify(actual))fail('INCOMPLETE_INCIDENCE_'+side);
 }
 return {nodes,edges,adjacency:graph.adjacency};
}
function physicalMeasure(graph,elementId){
 const e=graph.edges.get(String(elementId));
 if(!e)fail('MISSING_ORIGINAL_ELEMENT_'+elementId);
 const a=graph.nodes.get(String(e.from)),b=graph.nodes.get(String(e.to));
 const chord=norm(minus(b,a)),length=Number(e.lengthMm);
 if(!finite(chord))fail('UNREADABLE_ENDPOINT_CHORD');
 return {elementId:String(e.elementId),componentKind:String(e.componentKind),
  from:String(e.from),to:String(e.to),
  recordedLengthMm:round(length),endpointChordMm:round(chord),
  recordedMinusChordMm:round(length-chord),
  bendRadiusMm:null,bendSweepDegrees:null,
  curvatureProof:'NOT_ATTESTED_BY_NORMALIZED_GRAPH',
  unit:'mm'};
}
function verifyParents(a213,a212,reconciliation,sourceId,sNorm,tNorm){
 if(a213?.schema!=='CiiArchitectureA213WholeSubchainFalsifiers.v1'
  ||a213.status!=='S2_WHOLE_SUBCHAINS_REVIEW_ONLY_WITH_CUSTODY_AND_BOUNDARY_VETOES'
  ||a212?.schema!=='CiiArchitectureA212HeldOutDiscrepancies.v1'
  ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
  ||a213.writerReady!==false||a212.writerReady!==false||reconciliation.writerReady!==false
  ||a213.certifiedNodeCount!==0||a213.certifiedElementCount!==0
  ||a213.admittedCandidateCount!==0||a213.transferPlan!==null||a213.writeScope!==null
  ||a213.correspondenceCertificates?.length!==0
  ||a212.certifiedNodeCount!==0||a212.admittedCandidateCount!==0)
  fail('UNQUALIFIED_READ_ONLY_PARENTS_REQUIRED');
 const basis=reconciliation.augmentedJoint?.provenance;
 if(!basis||String(sourceId)!=='S2'||a213.provenance.sourceId!==sourceId
  ||a212.provenance.sourceId!==sourceId
  ||basis.sourceSetSha256!==a213.provenance.originalSourceSetSha256
  ||basis.originalTargetSha256!==a213.provenance.originalTargetSha256
  ||basis.originalSourceShaById?.[sourceId]!==a213.provenance.sourceOriginalSha256
  ||a213.provenance.normalizedSourceSha256!==sNorm
  ||a213.provenance.normalizedTargetSha256!==tNorm
  ||a212.provenance.originalSourceSetSha256!==basis.sourceSetSha256
  ||a212.provenance.originalTargetSha256!==basis.originalTargetSha256
  ||a213.provenance.parentA212CandidateDigest!==digest(a212.reviewCandidate)
  ||a213.provenance.parentA212MismatchDigest!==digest(a212.discrepancies)
  ||JSON.stringify(a213.custodyVetoes)!==JSON.stringify(a212.existingCustodyWarnings)
  ||!H.test(basis.sourceSetSha256)||!H.test(basis.originalTargetSha256))
  fail('PARENT_ORIGINAL_SHA_OR_LINEAGE_CHANGED');
 if(a213.reviewZones?.length!==3||a213.summary.zonesReviewed!==3
  ||a213.summary.unresolvedTargetCustodyVetoes!==a213.custodyVetoes.length
  ||a213.summary.zonesWithTwoIndependentBoundaryClosures!==0)
  fail('BOUNDARY_CUSTODY_PARENT_VETO_CHANGED');
 return basis;
}
function inspectTargetPath(target,sourceEdge,witness){
 const ids=witness.targetElementIds,nodes=witness.targetNodePath;
 if(!Array.isArray(ids)||!ids.length||!Array.isArray(nodes)||nodes.length!==ids.length+1)
  fail('INVALID_ORIGINAL_TARGET_PATH');
 let total=0;
 const records=ids.map((id,i)=>{
  const e=physicalMeasure(target,id);
  if(!((e.from===String(nodes[i])&&e.to===String(nodes[i+1]))
    ||(e.to===String(nodes[i])&&e.from===String(nodes[i+1]))))
   fail('TARGET_PATH_INCIDENCE_CHANGED');
  if(e.componentKind!==sourceEdge.componentKind)fail('TARGET_PATH_COMPONENT_CHANGED');
  total+=e.recordedLengthMm;
  return e;
 });
 if(records.length>1&&sourceEdge.componentKind!=='PIPE')
  fail('NON_PIPE_SUBDIVISION_NOT_ALLOWED');
 for(const node of nodes.slice(1,-1))
  if((target.adjacency.get(String(node))||[]).length!==2)
   fail('TARGET_SUBDIVISION_NODE_DEGREE_CHANGED');
 const delta=Math.abs(total-sourceEdge.recordedLengthMm);
 if(Math.abs(total-Number(witness.targetLengthMm))>0.001
  ||Math.abs(delta-Number(witness.lengthDifferenceMm))>0.001)
  fail('A213_TARGET_PATH_METRICS_DRIFT');
 return {targetOriginalElementIds:ids,
  targetOriginalNodePath:nodes,
  targetSegments:records,
  targetTotalRecordedLengthMm:round(total),
  lengthDifferenceMm:round(delta),
  localLengthCompatibilityOnly:delta<=25,
  identityCertified:false};
}
function inspectZones(a213,source,target){
 return a213.reviewZones.map(zone=>{
  const boundaryRows=(zone.outsideBoundaryPhysicalEdges||[]).map(x=>{
   const src=physicalMeasure(source,x.sourceElementId);
   if(src.componentKind!==x.sourceKind
    ||Math.abs(src.recordedLengthMm-x.originalLengthMm)>0.000001
    ||![src.from,src.to].includes(String(x.fromZoneSource))
    ||![src.from,src.to].includes(String(x.outsideSource)))
    fail('A213_BOUNDARY_SOURCE_EDGE_CHANGED');
   const paths=(x.independentOriginalTargetPathWitnesses||[])
    .map(w=>inspectTargetPath(target,src,w));
   return {source:src,provisionalTargetPaths:paths,
    fromZoneNode:String(x.fromZoneSource),
    targetNodeHypothesis:String(x.fromUnadmittedTarget),
    outsideSourceNode:String(x.outsideSource),
    hasStrictLocalPathWitness:paths.some(p=>p.localLengthCompatibilityOnly),
    engineeringRevisionRecordAuthenticated:false,
    independentBoundaryPairCertified:false,
    status:'ORIGINAL_PHYSICAL_DIFFERENCE_OBSERVED_REVISION_AUTHORITY_REQUIRED'};
  });
  if(zone.physicalEngineeringRevisionAuthorized!==false
   ||zone.twoIndependentBoundaryClosuresProven!==false
   ||zone.certifiedNodeCount!==0||zone.writerReady!==false)
   fail('A213_ZONE_ADMISSION_UNEXPECTED');
  const degreeDisagreements=zone.unadmittedSourceTargetGeometryPairs.flatMap(p=>{
   const s=(source.adjacency.get(String(p.sourceNodeId))||[]).length,
    t=(target.adjacency.get(String(p.targetNodeHypothesis))||[]).length;
   return s===t?[]:[{sourceNodeId:String(p.sourceNodeId),
    targetNodeHypothesis:String(p.targetNodeHypothesis),sourceDegree:s,targetDegree:t}];
  });
  return {zoneName:zone.zoneName,
   sourceNodes:zone.originalSourceNodes,
   candidateTargetNodes:zone.unadmittedSourceTargetGeometryPairs.map(x=>x.targetNodeHypothesis),
   meanTargetMinusProvisionalFitMm:zone.meanTargetMinusGlobalTransformMm,
   offsetSpreadMm:zone.maximumOffsetSpreadMm,
   independentRegistration:false,
   independentBoundaryEndCount:zone.independentlyVerifiedBoundaryEnds,
   twoIndependentBoundariesProven:false,
   degreeDisagreements,
   boundaries:boundaryRows,
   disposition:'EXTERNAL_REVISION_AND_IDENTITY_EVIDENCE_REQUIRED',
   certifiedNodeCount:0,certifiedElementCount:0};
 });
}
function inspectCustody(a213,reconciliation,source,target){
 const claims=reconciliation.augmentedJoint?.nodeRows||[],warnings=a213.custodyVetoes;
 const seen=new Set();
 return warnings.map(w=>{
  const t=String(w.targetNodeId),p=String(w.provisionalSourceNode),
   incumbent=String(w.preexistingOtherSourceClaim);
  if(!target.nodes.has(t)||p===incumbent||seen.has(t))fail('INVALID_TARGET_CUSTODY_VETO');
  seen.add(t);
  const [pm,pn]=p.split(':'),[im,inode]=incumbent.split(':');
  if(pm!=='S2'||im!=='S2'||!source.nodes.has(pn)||!source.nodes.has(inode))
   fail('INVALID_ORIGINAL_CUSTODY_CLAIMANT');
  if(!claims.some(x=>String(x.sourceNodeKey)===incumbent
    &&(x.targets||[]).map(String).includes(t)))
   fail('INCUMBENT_TARGET_CUSTODY_NOT_IN_LEDGER');
  return {targetNodeId:t,competingSourceNodeKeys:[incumbent,p].sort(cmp),
   incumbentRecordedInA205Ledger:true,
   proposedS2PairIsGeometricHypothesisOnly:true,
   independentCustodyDecisionAvailable:false,
   disposition:'MULTIPLE_PHYSICAL_CLAIMANTS_INDEPENDENT_ADJUDICATION_REQUIRED'};
 }).sort((a,b)=>cmp(a.targetNodeId,b.targetNodeId));
}
/** Claims are accepted as intake for inspection ONLY, never as certification. */
function inspectRevisionClaims(claims,observations,basis){
 if(!Array.isArray(claims)||claims.length>50)fail('INVALID_REVISION_CLAIM_SET');
 const all=observations.flatMap(z=>z.boundaries.flatMap(b=>
  b.provisionalTargetPaths.flatMap(p=>p.targetOriginalElementIds.map(id=>
   [b.source.elementId,id]))));
 return claims.map(x=>{
  if(!x||typeof x!=='object'||typeof x.sourceElementId!=='string'
   ||typeof x.targetElementId!=='string'
   ||typeof x.documentRef!=='string'||x.documentRef.length>256
   ||!x.documentRef.trim()||x.sourceOriginalSha256!==basis.originalSourceShaById.S2
   ||x.targetOriginalSha256!==basis.originalTargetSha256)
   fail('INVALID_OR_STALE_REVISION_CLAIM');
  if(!all.some(([s,t])=>s===x.sourceElementId&&t===x.targetElementId))
   fail('CLAIM_PAIR_NOT_REPRODUCED_FROM_PHYSICAL_GRAPH');
  return {sourceElementId:x.sourceElementId,targetElementId:x.targetElementId,
   documentRef:x.documentRef,
   proposedRevisionStatus:String(x.approvalStatus||'UNKNOWN'),
   verifiedOriginalRecord:false,verifiedIndependentSurvey:false,
   independentlyReviewed:false,
   disposition:'UNTRUSTED_EXTERNAL_DOCUMENT_REFERENCE_NOT_AUTHORITY'};
 });
}
export function reviewCiiA214EngineeringRevisionAndCustody({
 subchains,discrepancy,reconciliation,sourceId='S2',
 sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256,
 revisionClaims=[],
}={}){
 const basis=verifyParents(subchains,discrepancy,reconciliation,sourceId,
  normalizedSourceSha256,normalizedTargetSha256);
 const source=physicalGraph(sourceGraph,'SOURCE',normalizedSourceSha256),
  target=physicalGraph(targetGraph,'TARGET',normalizedTargetSha256);
 const zones=inspectZones(subchains,source,target);
 const custody=inspectCustody(subchains,reconciliation,source,target);
 const claims=inspectRevisionClaims(revisionClaims,zones,basis);
 return freeze({
  schema:'CiiArchitectureA214EngineeringRevisionCustodyLedger.v1',
  status:'ORIGINAL_DISCREPANCIES_REPRODUCED_EXTERNAL_REVISION_AND_CUSTODY_REQUIRED',
  provenance:{originalSourceSetSha256:basis.sourceSetSha256,
   originalTargetSha256:basis.originalTargetSha256,
   sourceOriginalSha256:basis.originalSourceShaById[sourceId],
   normalizedSourceSha256,normalizedTargetSha256,
   parentA213ZoneDigest:digest(subchains.reviewZones),
   parentA213CustodyDigest:digest(subchains.custodyVetoes)},
  zones,custodyConflicts:custody,externalRevisionClaims:claims,
  summary:{sourceOriginalNodes:source.nodes.size,
   sourceOriginalElements:source.edges.size,
   zonesReviewed:zones.length,
   originalBoundaryEdges:zones.reduce((n,z)=>n+z.boundaries.length,0),
   engineeringRevisionDocumentsIndependentlyVerified:0,
   independentlyCertifiedSubchains:0,
   unresolvedGlobalTargetCustodyConflicts:custody.length,
   originalGlobalIncompleteElementFactorsRepaired:0},
  blockers:['NO_INDEPENDENT_SOURCE_CORRECT_ENGINEERING_REVISION_ATTESTATION',
   'BEND_RADIUS_SWEEP_AND_REVISION_APPLICABILITY_NOT_ATTESTED',
   'NO_TWO_INDEPENDENT_CLOSED_SUBCHAIN_BOUNDARIES',
   'GLOBAL_TARGET_NODE_CUSTODY_CONFLICTS_UNRESOLVED',
   'NO_INDEPENDENT_SURVEYED_SOURCE_TARGET_NODE_AUTHORITY'],
  certifiedNodeCount:0,certifiedElementCount:0,
  admittedCandidateCount:0,correspondenceCertificates:[],
  writerReady:false,transferPlan:null,writeScope:null,
 });
}
export function assertCiiA214NoWrite(x){
 if(x?.schema!=='CiiArchitectureA214EngineeringRevisionCustodyLedger.v1')
  fail('LEDGER_SCHEMA_REQUIRED');
 fail('ORIGINAL_REVISION_FORENSICS_NEVER_WRITER_AUTHORITY');
}
