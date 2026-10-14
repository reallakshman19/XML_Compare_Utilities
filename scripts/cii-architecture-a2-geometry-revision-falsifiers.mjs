/**
 * ARCH-01 A2-SHADOW-08 — independent original-graph geometry/revision
 * falsifiers, not a registration algorithm and NEVER Writer authorization.
 *
 * Counterfactual length bands and unanchored TARGET alternatives are retained
 * as sensitivity observations, not substitutions for M1/M2 identity proof.
 */
import { createHash } from 'node:crypto';

const t=(v)=>String(v??'').trim();
const cmp=(a,b)=>t(a).localeCompare(t(b),undefined,{numeric:true});
const sorted=(a)=>[...a].sort(cmp);
const digest=(v)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const error=(k)=>{throw Error('A208_'+k);};
function freeze(v){if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)])));
  return v;}
const DEFAULT=Object.freeze({
  revisionBandsMm:[25,100,300,350],
  maxTargetEdgesInspected:50000,maxAlternativeRecords:16,
  chordDifferenceToleranceMm:50,recordedLengthChordRatioTolerance:0.05,
  turnCosineTolerance:0.16,
});
function policyFor(input={}){
  const p={...DEFAULT,...input};
  if(!Array.isArray(p.revisionBandsMm)||p.revisionBandsMm.length<2||p.revisionBandsMm.length>12
    ||p.revisionBandsMm.some((n,i)=>!Number.isFinite(n)||n<0||n>10000
      ||(i>0&&n<=p.revisionBandsMm[i-1])))error('BAD_COUNTERFACTUAL_BANDS');
  for(const [field,low,high] of [
    ['maxTargetEdgesInspected',1,1000000],['maxAlternativeRecords',1,100],
    ['chordDifferenceToleranceMm',0,100000],['recordedLengthChordRatioTolerance',0,2],
    ['turnCosineTolerance',0,2]]){
    if(!Number.isFinite(p[field])||p[field]<low||p[field]>high
      ||(field.startsWith('max')&&!Number.isSafeInteger(p[field])))error('BAD_POLICY_'+field);
  }
  return freeze(p);
}
const vec=(e,from)=>{const dir=t(e.from)===from?1:-1;
  return [Number(e.dx)*dir,Number(e.dy)*dir,Number(e.dz)*dir];};
const mag=v=>Math.hypot(...v);
const cosine=(a,b)=>mag(a)>0&&mag(b)>0?a.reduce((s,x,i)=>s+x*b[i],0)/mag(a)/mag(b):null;
const round=n=>Number(n.toFixed(6));
function measure(e){
  const length=Number(e.lengthMm);
  const chord=mag([Number(e.dx),Number(e.dy),Number(e.dz)]);
  if(!Number.isFinite(length)||length<=0||!Number.isFinite(chord)||chord<=0
    ||chord>length+0.000001||!Number.isFinite(Number(e.diameter))
    ||!Number.isFinite(Number(e.wall)))error('INVALID_OR_INCONSISTENT_ORIGINAL_EDGE_METRICS');
  // Canonical BEND class/pointer does not itself attest bend centre, radius,
  // sweep angle or true arc length. lengthMm may equal the displacement chord.
  // Never treat recorded length/chord ratio == 1 as a straight-bend proof.
  return {lengthMm:length,chordMm:round(chord),
    recordedLengthToChordRatio:round(length/chord),
    bendCurvatureStatus:'RADIUS_AND_SWEEP_NOT_ATTESTED_BY_CANONICAL_EDGE',
    componentKind:t(e.componentKind),
    diameterMm:Number(e.diameter),wallMm:Number(e.wall)};
}
function indexGraph(g,side,normalized){
  if(g?.side!==side||g.documentId!==side+':'+normalized
    ||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))
    error('NORMALIZED_GRAPH_CUSTODY_MISMATCH_'+side);
  const byId=new Map(),byNode=new Map();
  for(const e of g.edges){
    const id=t(e.elementId),from=t(e.from),to=t(e.to);
    if(!id||!from||!to||from===to||byId.has(id))error('CANONICAL_ELEMENT_INVALID_'+side);
    byId.set(id,e);
    for(const n of [from,to]){
      if(!byNode.has(n))byNode.set(n,[]);
      byNode.get(n).push(e);
    }
    measure(e);
  }
  for(const [n,rows] of byNode){
    const supplied=g.adjacency.get(n)||[];
    if(rows.length!==supplied.length||
      sorted(rows.map(e=>t(e.elementId))).join('|')!==sorted(supplied.map(e=>t(e.elementId))).join('|'))
      error('INCONSISTENT_GRAPH_INCIDENCE_'+side);
  }
  return {byId,byNode};
}
function validate({routeAudit,triage,reconciliation,sourceGraphsById,targetGraph,
  normalizedSourceShaById,normalizedTargetSha256}){
  if(routeAudit?.schema!=='CiiArchitectureA207IslandRouteWitnesses.v1'
    ||routeAudit.status!=='INDEPENDENT_BOUNDED_PHYSICAL_ROUTE_REVIEW_ONLY'
    ||routeAudit.writerReady!==false||routeAudit.certifiedNodeCount!==0
    ||routeAudit.certifiedElementCount!==0||routeAudit.transferPlan!==null
    ||routeAudit.writeScope!==null
    ||triage?.schema!=='CiiArchitectureA206PhysicalReviewIslands.v1'
    ||triage.writerReady!==false
    ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
    ||reconciliation.writerReady!==false)error('A205_A206_A207_SHADOW_BASIS_REQUIRED');
  const basis=reconciliation.augmentedJoint?.provenance;
  if(!basis
    ||routeAudit.provenance.sourceSetSha256!==basis.sourceSetSha256
    ||routeAudit.provenance.originalTargetSha256!==basis.originalTargetSha256
    ||routeAudit.provenance.physicalOriginalSnapshotDigest!==basis.physicalOriginalSnapshotDigest
    ||triage.authority.sourceSetSha256!==basis.sourceSetSha256
    ||triage.authority.originalTargetSha256!==basis.originalTargetSha256
    ||routeAudit.provenance.triageSummaryDigest!==digest(triage.summary)
    ||triage.authority.augmentedNodeHypothesisDigest!==digest(reconciliation.augmentedJoint.hypotheses
      .map(h=>[h.sourceNodeKey,h.targetNodeId]))
    ||routeAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256
    ||triage.authority.normalizedTargetSha256!==normalizedTargetSha256
    ||reconciliation.recomputedPathAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256)
    error('STALE_OR_MISMATCHED_ORIGINAL_EVIDENCE_CUSTODY');
  const members=sorted(Object.keys(basis.originalSourceShaById||{}));
  if(!members.length||members.join('|')!==sorted(Object.keys(sourceGraphsById)).join('|')
    ||members.join('|')!==sorted(Object.keys(normalizedSourceShaById)).join('|')
    ||members.join('|')!==sorted(Object.keys(reconciliation.recomputedPathAudit.provenance.normalizedSourceShaById)).join('|'))
    error('SOURCE_GRAPH_MEMBER_SET_CHANGED');
  const src={};
  for(const member of members){
    if(normalizedSourceShaById[member]!==reconciliation.recomputedPathAudit.provenance.normalizedSourceShaById[member])
      error('SOURCE_BRIDGE_SHA_MISMATCH');
    src[member]=indexGraph(sourceGraphsById[member],'SOURCE',normalizedSourceShaById[member]);
  }
  const target=indexGraph(targetGraph,'TARGET',normalizedTargetSha256);
  if(routeAudit.islands?.length!==triage.missingIslands?.length
    ||routeAudit.summary.islandCount!==triage.summary.missingIslandCount)
    error('PHYSICAL_ISLAND_CENSUS_DRIFT');
  return {src,target,basis,nodeRows:new Map(reconciliation.augmentedJoint.nodeRows
    .map(r=>[r.sourceNodeKey,r]))};
}
function predecessorPairs(src,target,sourceStart,firstEdgeId,sourceMember,targetAnchor,
  nodeRows,policy){
  const incidentSrc=(src.byNode.get(sourceStart)||[]).filter(e=>t(e.elementId)!==firstEdgeId);
  const targetIncident=(target.byNode.get(targetAnchor)||[]);
  const pairs=[];
  for(const pred of incidentSrc){
    const other=t(pred.from)===sourceStart?t(pred.to):t(pred.from);
    const bound=nodeRows.get(sourceMember+':'+other)?.targets||[];
    for(const te of targetIncident){
      const far=t(te.from)===targetAnchor?t(te.to):t(te.from);
      if(!bound.includes(far))continue;
      // Independent turn comparison of two physical vectors using the
      // *already observed* predecessor-node candidate, not naming.
      pairs.push({sourcePredecessorElementId:t(pred.elementId),
        sourceOtherNode:other,claimedTargetPredecessorNode:far,
        targetPredecessorElementId:t(te.elementId),targetAnchor,
        sourcePredecessor:pred,targetPredecessor:te});
    }
  }
  return pairs;
}
function diagnoseIsland(island,original,src,target,nodeRows,p){
  const physical=src[island.sourceMember];
  const prior=new Map();
  for(const [i,x] of (original.firstBoundaryNeighbourhood||[]).entries())
    prior.set(x.anchor,x);
  if(!original.orderedSourceElementIds?.length
    ||!original.physicalSourceNodePath?.length
    ||original.orderedSourceElementIds.length!==original.missingElementCount
    ||original.physicalSourceNodePath.length!==original.missingElementCount+1)
    error('SOURCE_CHAIN_OR_FIRST_EDGE_UNAVAILABLE');
  const firstEdgeId=original.orderedSourceElementIds[0],first=physical.byId.get(firstEdgeId);
  const start=original.physicalSourceNodePath[0],next=original.physicalSourceNodePath[1];
  if(!first||!((t(first.from)===start&&t(first.to)===next)
    ||(t(first.to)===start&&t(first.from)===next)))
    error('ORIGINAL_FIRST_SOURCE_EDGE_ORIENTATION_MISMATCH');
  const sourceMetrics=measure(first),rows=[],alts=[];
  const sourceAnchors=sorted(new Set(nodeRows.get(island.sourceMember+':'+start)?.targets||[]));
  if(JSON.stringify(sourceAnchors)!==JSON.stringify(sorted(original.startingTargetCandidates||[])))
    error('SOURCE_STARTING_CANDIDATE_CUSTODY_MISMATCH');
  let inspected=0,scanIncomplete=false;
  for(const targetEdge of [...target.byId.values()].sort((a,b)=>cmp(a.elementId,b.elementId))){
    if(inspected>=p.maxTargetEdgesInspected){scanIncomplete=true;break;}
    inspected++;
    const m=measure(targetEdge);
    if(m.componentKind!==sourceMetrics.componentKind)continue;
    const lenDiff=Math.abs(m.lengthMm-sourceMetrics.lengthMm);
    const chordDiff=Math.abs(m.chordMm-sourceMetrics.chordMm);
    const ratioDiff=Math.abs(m.recordedLengthToChordRatio-sourceMetrics.recordedLengthToChordRatio);
    if(lenDiff>p.revisionBandsMm[0]||chordDiff>p.chordDifferenceToleranceMm
      ||ratioDiff>p.recordedLengthChordRatioTolerance)continue;
    alts.push({targetElementId:t(targetEdge.elementId),targetEndpoints:[t(targetEdge.from),t(targetEdge.to)],
      metricLengthDeltaMm:round(lenDiff),chordDeltaMm:round(chordDiff),recordedLengthChordRatioDelta:round(ratioDiff),
      relationToCurrentAnchor:sourceAnchors.some(a=>a===t(targetEdge.from)||a===t(targetEdge.to))
        ?'INCIDENT_TO_PRIOR_CANDIDATE':'UNANCHORED_GLOBAL_TARGET_EDGE',
    });
  }
  const alternatives=alts.slice(0,p.maxAlternativeRecords);
  const alternativeListTruncated=alts.length>p.maxAlternativeRecords;
  for(const anchor of sourceAnchors){
    const stored=prior.get(anchor),edges=(target.byNode.get(anchor)||[]).sort((a,b)=>cmp(a.elementId,b.elementId));
    if(!stored||stored.sourceFirstElementId!==firstEdgeId
      ||stored.sourceFirstComponentKind!==sourceMetrics.componentKind
      ||Math.abs(stored.sourceFirstLengthMm-sourceMetrics.lengthMm)>0.001
      ||stored.incidentListTruncated!==(edges.length>20)
      ||JSON.stringify(stored.targetIncidentPhysicalElements.map(x=>x.elementId))
        !==JSON.stringify(edges.slice(0,20).map(e=>t(e.elementId))))
      error('A207_FIRST_BOUNDARY_WITNESS_TAMPERED');
    const predecessors=predecessorPairs(physical,target,start,firstEdgeId,island.sourceMember,
      anchor,nodeRows,p);
    for(const e of edges){
      const m=measure(e),lengthDelta=Math.abs(m.lengthMm-sourceMetrics.lengthMm);
      const chordDelta=Math.abs(m.chordMm-sourceMetrics.chordMm);
      const ratioDelta=Math.abs(m.recordedLengthToChordRatio-sourceMetrics.recordedLengthToChordRatio);
      const sameKind=m.componentKind===sourceMetrics.componentKind;
      const predecessorTurns=predecessors
        .filter(z=>t(z.targetPredecessorElementId)!==t(e.elementId))
        .map(z=>{
          const incomingSource=vec(z.sourcePredecessor,z.sourceOtherNode);
          const incomingTarget=vec(z.targetPredecessor,z.claimedTargetPredecessorNode);
          const srcTurn=cosine(incomingSource,vec(first,start));
          const targetTurn=cosine(incomingTarget,vec(e,anchor));
          return {
            sourcePredecessorElementId:z.sourcePredecessorElementId,
            targetPredecessorElementId:z.targetPredecessorElementId,
            claimedOtherSourceNode:z.sourceOtherNode,
            claimedOtherTargetNode:z.claimedTargetPredecessorNode,
            sourceTurnCosine:srcTurn===null?null:round(srcTurn),
            targetTurnCosine:targetTurn===null?null:round(targetTurn),
            turnDifference:srcTurn===null||targetTurn===null?null:round(Math.abs(srcTurn-targetTurn)),
            passesLocalTurnTolerance:srcTurn!==null&&targetTurn!==null
              &&Math.abs(srcTurn-targetTurn)<=p.turnCosineTolerance,
          };
        });
      const bands=p.revisionBandsMm.map(mm=>({counterfactualLengthBandMm:mm,
        compatibleComponentAndLength:sameKind&&lengthDelta<=mm+1e-8,
        notAnIdentityCertificate:true}));
      rows.push({
        sourceFirstElementId:firstEdgeId,sourceStartingNode:start,
        targetAnchorNode:anchor,targetIncidentElementId:t(e.elementId),
        targetOtherNode:t(e.from)===anchor?t(e.to):t(e.from),
        sourceMetrics,targetMetrics:m,
        lengthDeltaMm:round(lengthDelta),lengthDeltaFraction:round(lengthDelta/sourceMetrics.lengthMm),
        chordDeltaMm:round(chordDelta),recordedLengthChordRatioDelta:round(ratioDelta),
        componentKindMatches:sameKind,
        exactA207BaseLengthGate:sameKind&&lengthDelta<=Math.min(
          25,0.12*sourceMetrics.lengthMm)+1e-8,
        counterfactualBands:bands,
        originalPredecessorConstraintCount:predecessorTurns.length,
        predecessorTurnInvariants:predecessorTurns,
        evaluation:'MEASURED_ORIGINAL_GEOMETRY_NO_REGISTERED_COORDINATE_FRAME',
      });
    }
  }
  const matchingAnchorKind=rows.filter(x=>x.componentKindMatches);
  return freeze({
    islandId:island.id,sourceMember:island.sourceMember,
    sourceFirstElementId:firstEdgeId,startingSourceNode:start,
    currentTargetAnchors:sourceAnchors,
    sourceMetrics,
    incidentOriginalWitnessCount:rows.length,
    boundaryGeometryComparisons:rows,
    matchingKindAtExistingAnchors:matchingAnchorKind.length,
    minExistingAnchorSameKindLengthDeltaMm:matchingAnchorKind.length
      ?Math.min(...matchingAnchorKind.map(x=>x.lengthDeltaMm)):null,
    strictBandCompatibleExistingAnchorEdges:rows.filter(x=>x.counterfactualBands[0].compatibleComponentAndLength).length,
    targetEdgesInspected:inspected,unanchoredAlternativeScanComplete:!scanIncomplete,
    strictKindLengthChordCandidatesInTarget:alts.length,
    strictKindLengthChordCandidateExamples:alternatives,
    globalAlternativeListTruncated:alternativeListTruncated,
    routeOutcome:original.status,
    classification:!sourceAnchors.length?'NO_CURRENT_ANCHOR':
      matchingAnchorKind.length===0?'BOUNDARY_COMPONENT_KIND_UNSUPPORTED':
      rows.some(x=>x.exactA207BaseLengthGate)?'FIRST_EDGE_BASE_LENGTH_GATE_NOT_THE_ONLY_BLOCKER':
      'EXISTING_BOUNDARY_BEND_OR_PIPE_REQUIRES_GEOMETRIC_REVISION_OR_ALTERNATE_REGISTRATION_REVIEW',
    certified:false,admittedCandidateCount:0,writerReady:false,
  });
}
export function investigateCiiA208GeometryRevision({
  routeAudit,triage,reconciliation,sourceGraphsById={},targetGraph,
  normalizedSourceShaById={},normalizedTargetSha256,policy={},
}={}){
  const p=policyFor(policy);
  const {src,target,basis,nodeRows}=validate({routeAudit,triage,reconciliation,
    sourceGraphsById,targetGraph,normalizedSourceShaById,normalizedTargetSha256});
  const islands=triage.missingIslands.map(island=>{
    const audit=routeAudit.islands.find(x=>x.id===island.id);
    if(!audit||audit.sourceMember!==island.sourceMember
      ||audit.missingElementCount!==island.missingElementCount)
      error('ORIGINAL_ISLAND_IDENTITY_CHANGED');
    return diagnoseIsland(island,audit,src,target,nodeRows,p);
  });
  const count=islands.filter(x=>x.classification.endsWith('REVIEW')).length;
  return freeze({
    schema:'CiiArchitectureA208GeometryRevisionFalsifiers.v1',
    status:'GEOMETRY_REVISION_DIAGNOSIS_ONLY',
    provenance:{
      originalSourceSetSha256:basis.sourceSetSha256,
      originalTargetSha256:basis.originalTargetSha256,
      physicalOriginalSnapshotDigest:basis.physicalOriginalSnapshotDigest,
      normalizedTargetSha256,
      originalA207IslandDigest:digest(routeAudit.islands.map(x=>[x.id,x.status])),
    },
    policy:p,policyDigest:digest(p),
    summary:{
      originalMissingElementFactors:triage.summary.unresolvedFactorCount,
      physicalIslandsExamined:islands.length,
      islandsWithExistingAnchorRevisionOrRegistrationReview:count,
      zeroTargetGraphRewrites:true,
      originalAmbiguousElementFactors:triage.summary.ambiguousElementCount,
      originalCustodyWarningProposals:triage.summary.custodyWarningProposalCount,
    },
    islands,certifiedNodeCount:0,certifiedElementCount:0,
    admittedCandidateCount:0,correspondenceCertificates:[],
    writerReady:false,transferPlan:null,writeScope:null,
    limitations:[
      'RECORDED_EDGE_LENGTH_AND_DISPLACEMENT_CHORD_ARE_NOT_CURVATURE_PROOF_OR_M1_M2_REGISTRATION',
      'UNANCHORED_MATCHING_TARGET_EDGES_ARE_NOT_NEW_SOURCE_TARGET_IDENTITY_CLAIMS',
      'COUNTERFACTUAL_LENGTH_BANDS_DO_NOT_CHANGE_A2_07_OR_PRODUCTION_TOLERANCES',
      'NEARBY_OR_SIMILAR_BENDS_MAY_BE_UNRELATED_ASSETS',
      'NO_CANONICAL_BEND_RADIUS_CENTRE_OR_SWEEP_ANGLE_WITNESS',
      'NO_CORRESPONDENCE_CERTIFICATION_OR_RESTRAINT_P1_WRITER_PERMISSION',
    ],
  });
}
export function assertCiiA208NoWrite(value){
  if(value?.schema!=='CiiArchitectureA208GeometryRevisionFalsifiers.v1')
    error('DIAGNOSIS_SCHEMA_REQUIRED');
  error('COUNTERFACTUAL_GEOMETRY_IS_NOT_WRITER_AUTHORITY');
}
