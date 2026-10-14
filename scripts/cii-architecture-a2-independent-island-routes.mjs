/**
 * ARCH-01 A2-SHADOW-07. Independent bounded path exploration over A2-06
 * SOURCE physical missing-edge islands. This module deliberately produces
 * NO NODE correspondence claims, identity certificates, or Writer actions.
 *
 * A SOURCE chain is an ordered original physical ELEMENT sequence. An
 * independently enumerated TARGET walk may be 1:many at an individual
 * SOURCE edge. Turn-cosines are translation/rotation-invariant advisories,
 * not coordinate-frame registration or exhaustive physical identity proof.
 */
import { createHash } from 'node:crypto';

const str=x=>String(x??'').trim();
const cmp=(a,b)=>str(a).localeCompare(str(b),undefined,{numeric:true});
const sorted=x=>[...x].sort(cmp);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const err=x=>{throw Error('A207_'+x);};
function freeze(x){if(Array.isArray(x))return Object.freeze(x.map(freeze));
  if(x&&typeof x==='object')return Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,freeze(v)])));
  return x;}
const defaults=Object.freeze({
  maxGlobalExpansion:30000,maxBeamWidth:32,maxTargetPathSegmentsPerEdge:4,
  maxLocalWalkVisits:500,maxFullRoutesPerIsland:6,maxRoutePayloadSegments:120,
  lengthToleranceMm:25,minSubdividedStraightness:0.995,
  turnCosineTolerance:0.16,relativeLengthTolerance:0.12,
});
function policyOf(o={}){
  const p={...defaults,...o};
  for(const [field,lo,hi] of [
    ['maxGlobalExpansion',1,150000],['maxBeamWidth',1,200],
    ['maxTargetPathSegmentsPerEdge',1,8],['maxLocalWalkVisits',1,20000],
    ['maxFullRoutesPerIsland',1,50],['maxRoutePayloadSegments',1,800],
    ['lengthToleranceMm',0,10000],['minSubdividedStraightness',0,1],
    ['turnCosineTolerance',0,2],['relativeLengthTolerance',0,1],
  ]){
    if(!Number.isFinite(p[field])||p[field]<lo||p[field]>hi||
      (field.startsWith('max')&&!Number.isSafeInteger(p[field])))err('INVALID_POLICY_'+field);
  }
  return freeze(p);
}
const eid=e=>str(e.elementId);
const nid=n=>str(n);
function graph(g,side,expected){
  if(g?.side!==side||g.documentId!==side+':'+expected
    ||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))err('CANONICAL_GRAPH_BASIS_MISMATCH_'+side);
  const byId=new Map();
  for(const e of g.edges){
    if(!eid(e)||byId.has(eid(e))||!nid(e.from)||!nid(e.to)
      ||!(g.adjacency.get(nid(e.from))||[]).some(q=>eid(q)===eid(e))
      ||!(g.adjacency.get(nid(e.to))||[]).some(q=>eid(q)===eid(e)))
      err('ORIGINAL_GRAPH_INCIDENCE_FAILED_'+side);
    byId.set(eid(e),e);
  }
  return {g,byId};
}
const nextNode=(e,n)=>nid(e.from)===n?nid(e.to):nid(e.from);
const v3=(e,from)=>{
  const sign=nid(e.from)===from?1:-1;
  return [Number(e.dx)*sign,Number(e.dy)*sign,Number(e.dz)*sign];
};
const len=e=>Number(e.lengthMm);
const magnitude=v=>Math.hypot(...v);
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const cosine=(a,b)=>{
  const na=magnitude(a),nb=magnitude(b);
  return na>1e-8&&nb>1e-8?Math.max(-1,Math.min(1,dot(a,b)/na/nb)):null;
};
function sourceChain(island,sourceIndex){
  const edges=island.sourceElementIds.map(id=>{
    const e=sourceIndex.byId.get(id);if(!e)err('ISLAND_EDGE_MISSING_IN_ORIGINAL_SOURCE:'+id);
    return e;
  });
  const at=new Map();
  for(const e of edges)for(const node of [nid(e.from),nid(e.to)]){
    if(!at.has(node))at.set(node,[]);
    at.get(node).push(e);
  }
  if(edges.length===0)return {status:'EMPTY_SOURCE_ISLAND'};
  const branch=[...at].filter(([,inc])=>inc.length>2).map(([n])=>n);
  if(branch.length)return {status:'SOURCE_BRANCH_REQUIRES_SEPARATE_TOPOLOGY_FACTOR',branchNodes:sorted(branch)};
  const endpoints=sorted([...at].filter(([,inc])=>inc.length===1).map(([n])=>n));
  if(endpoints.length!==2)return {status:'CLOSED_OR_NONCHAIN_SOURCE_ISLAND',endpoints};
  const boundaries=new Set(island.boundaryNodeIds||[]);
  const start=boundaries.has(endpoints[0])?endpoints[0]:
    boundaries.has(endpoints[1])?endpoints[1]:endpoints[0];
  const ordered=[],nodes=[start],seen=new Set(),usedNodes=new Set([start]);
  let atNode=start;
  while(ordered.length<edges.length){
    const next=(at.get(atNode)||[]).find(e=>!seen.has(eid(e)));
    if(!next)break;
    seen.add(eid(next));const to=nextNode(next,atNode);
    if(usedNodes.has(to))err('SOURCE_ISLAND_CHAIN_LOOPED');
    usedNodes.add(to);
    ordered.push({sourceElementId:eid(next),from:atNode,to,
      lengthMm:len(next),kind:str(next.componentKind),
      vector:v3(next,atNode),element:next});
    atNode=to;nodes.push(to);
  }
  if(ordered.length!==edges.length||nodes.at(-1)!==endpoints.find(n=>n!==start))
    err('SOURCE_ISLAND_DISCONNECTED_EDGE_CHAIN');
  return {status:'ORDERED_SOURCE_CHAIN',nodes,ordered};
}
function validateBasis({triage,reconciliation,sourceGraphsById,targetGraph,
  normalizedSourceShaById,normalizedTargetSha256}){
  if(triage?.schema!=='CiiArchitectureA206PhysicalReviewIslands.v1'
    ||triage.status!=='PHYSICAL_ISLAND_REVIEW_ONLY'||triage.writerReady!==false
    ||triage.certifiedNodeCount!==0||triage.certifiedElementCount!==0
    ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
    ||reconciliation.status!=='RECONCILED_SHADOW_NONWRITING'
    ||reconciliation.writerReady!==false||reconciliation.certifiedNodeCount!==0
    ||reconciliation.certifiedElementCount!==0)err('NONWRITING_A205_A206_BASIS_REQUIRED');
  const provenance=reconciliation.augmentedJoint.provenance;
  if(triage.authority.sourceSetSha256!==provenance.sourceSetSha256
    ||triage.authority.originalTargetSha256!==provenance.originalTargetSha256
    ||triage.authority.physicalOriginalSnapshotDigest!==provenance.physicalOriginalSnapshotDigest
    ||reconciliation.originalPhysicalSnapshotDigest!==provenance.physicalOriginalSnapshotDigest
    ||triage.authority.augmentedNodeHypothesisDigest
      !==sha(reconciliation.augmentedJoint.hypotheses.map(h=>[h.sourceNodeKey,h.targetNodeId]))
    ||triage.summary.unresolvedFactorCount
      !==reconciliation.recomputedEndpointMissingFactors)
    err('TRIAGE_CUSTODY_OR_CENSUS_STALE');
  const expected=sorted(Object.keys(provenance.originalSourceShaById||{}));
  if(expected.length!==3||expected.join('|')!==sorted(Object.keys(sourceGraphsById)).join('|')
    ||expected.join('|')!==sorted(Object.keys(normalizedSourceShaById)).join('|'))
    err('SOURCE_MEMBER_POPULATION_INCONSISTENT');
  const source=new Map();
  for(const sid of expected){
    if(normalizedSourceShaById[sid]!==reconciliation.recomputedPathAudit.provenance.normalizedSourceShaById[sid])
      err('SOURCE_NORMALIZED_SHA_MISMATCH');
    source.set(sid,graph(sourceGraphsById[sid],'SOURCE',normalizedSourceShaById[sid]));
  }
  if(normalizedTargetSha256!==reconciliation.recomputedPathAudit.provenance.normalizedTargetSha256
    ||normalizedTargetSha256!==triage.authority.normalizedTargetSha256)err('TARGET_NORMALIZED_SHA_MISMATCH');
  const target=graph(targetGraph,'TARGET',normalizedTargetSha256);
  const rows=new Map(reconciliation.augmentedJoint.nodeRows.map(r=>[r.sourceNodeKey,r]));
  if(rows.size!==triage.summary.sourceNodeCount)err('NODE_CENSUS_DIVERGENT');
  return {source,target,rows,provenance};
}
function edgeOptions({target,start,sourceEdge,usedNodes,usedEdges,policy,budget,counts}){
  const out=[],sourceLen=sourceEdge.lengthMm,types=str(sourceEdge.kind);
  const seen=new Set([start]);
  function dfs(node,steps,total,vec){
    if(counts.visits>=policy.maxGlobalExpansion||budget.visits>=policy.maxLocalWalkVisits){
      budget.truncated=true;return;
    }
    budget.visits++;counts.visits++;
    if(steps.length){
      const delta=Math.abs(total-sourceLen);
      const maxDelta=Math.min(policy.lengthToleranceMm,
        Math.max(0.001,policy.relativeLengthTolerance*sourceLen));
      if(delta<=maxDelta+1e-8){
        const straight=magnitude(vec)/Math.max(total,1);
        if(steps.length===1||straight>=policy.minSubdividedStraightness){
          out.push({end:node,edges:steps.map(x=>x.id),
            nodes:[start,...steps.map(x=>x.to)],vector:vec,
            lengthMm:total,deltaMm:delta,
            propertyWarnings:sorted(new Set(steps.flatMap(x=>x.warnings)))});
        }else counts.rejectedSubdividedBend++;
      }
    }
    if(steps.length>=policy.maxTargetPathSegmentsPerEdge||budget.truncated)return;
    if(steps.length&&(target.g.adjacency.get(node)||[]).length!==2){
      counts.rejectedTargetBranchInterior++;return;
    }
    for(const e of [...(target.g.adjacency.get(node)||[])].sort((a,b)=>cmp(eid(a),eid(b)))){
      const dest=nextNode(e,node),el=eid(e),L=len(e);
      if(seen.has(dest)||usedNodes.has(dest)||usedEdges.has(el))continue;
      if(!Number.isFinite(L)||L<=0||str(e.componentKind)!==types
        ||(steps.length>0&&types!=='PIPE')){counts.rejectedKindOrLength++;continue;}
      if(total+L>sourceLen+policy.lengthToleranceMm+1e-7)continue;
      const warnings=[];
      if(Math.abs(Number(e.diameter)-Number(sourceEdge.element.diameter))>2)
        warnings.push('OD_REVISION_OBSERVATION');
      if(Math.abs(Number(e.wall)-Number(sourceEdge.element.wall))>1)
        warnings.push('WALL_REVISION_OBSERVATION');
      const v=v3(e,node);
      seen.add(dest);
      dfs(dest,[...steps,{id:el,to:dest,warnings}],total+L,vec.map((x,i)=>x+v[i]));
      seen.delete(dest);
      if(budget.truncated)return;
    }
  }
  dfs(start,[],0,[0,0,0]);
  return out.sort((a,b)=>cmp(a.end,b.end)||cmp(a.edges.join('|'),b.edges.join('|')));
}
function projectIsland(island,sourceIndex,target,rows,p,globalCounts){
  const source=sourceChain(island,sourceIndex);
  if(source.status!=='ORDERED_SOURCE_CHAIN')return freeze({
    id:island.id,sourceMember:island.sourceMember,status:source.status,
    missingElementCount:island.missingElementCount,fullRouteWitnesses:[],
    boundaryAnchors:[],maximumCompletedSourceEdges:0,
    truncated:false,diagnostics:source,
  });
  const startKey=island.sourceMember+':'+source.nodes[0];
  const endKey=island.sourceMember+':'+source.nodes.at(-1);
  const begin=sorted(rows.get(startKey)?.targets||[]);
  const finish=sorted(rows.get(endKey)?.targets||[]);
  const isDual=begin.length>0&&finish.length>0;
  const startingCandidates=begin;
  if(!startingCandidates.length)return freeze({
    id:island.id,sourceMember:island.sourceMember,status:'NO_QUALIFIED_START_BOUNDARY_HYPOTHESIS',
    sourceNodePath:source.nodes,missingElementCount:island.missingElementCount,
    boundaryAnchors:[],targetEndBoundaryCandidates:finish,
    fullRouteWitnesses:[],maximumCompletedSourceEdges:0,truncated:false,
  });
  const startNodes=new Set(startingCandidates);
  const resourcesReserved=new Map();
  for(const row of rows.values())for(const t of row.targets||[]){
    if(!resourcesReserved.has(t))resourcesReserved.set(t,[]);
    resourcesReserved.get(t).push(row.sourceNodeKey);
  }
  let beam=startingCandidates.filter(n=>target.g.adjacency.has(n)).map(n=>({
    start:n,node:n,nodes:[n],edges:[],sourceNodeAssignments:[[source.nodes[0],n]],
    steps:[],usedNodes:new Set([n]),usedEdges:new Set(),
    prevSourceVector:null,prevTargetVector:null,
  }));
  let maxCompleted=0,truncated=false;
  const rejection={
    rejectedSubdividedBend:0,rejectedTargetBranchInterior:0,rejectedKindOrLength:0,
    rejectedTurnProfile:0,rejectedExistingNodeCustody:0,
    rejectedEndpointNotInBoundaryCandidates:0,
  };
  for(let depth=0;depth<source.ordered.length;depth++){
    if(!beam.length)break;
    const next=[];
    const edge=source.ordered[depth];
    for(const state of beam){
      const budget={visits:0,truncated:false};
      const opts=edgeOptions({target,start:state.node,sourceEdge:edge,
        usedNodes:state.usedNodes,usedEdges:state.usedEdges,
        policy:p,budget,counts:{...rejection,
          get visits(){return globalCounts.visits;},
          set visits(value){globalCounts.visits=value;},
          get rejectedSubdividedBend(){return rejection.rejectedSubdividedBend;},
          set rejectedSubdividedBend(value){rejection.rejectedSubdividedBend=value;},
          get rejectedTargetBranchInterior(){return rejection.rejectedTargetBranchInterior;},
          set rejectedTargetBranchInterior(value){rejection.rejectedTargetBranchInterior=value;},
          get rejectedKindOrLength(){return rejection.rejectedKindOrLength;},
          set rejectedKindOrLength(value){rejection.rejectedKindOrLength=value;},
        }});
      if(budget.truncated)truncated=true;
      for(const option of opts){
        if(depth===source.ordered.length-1&&isDual&&!finish.includes(option.end)){
          rejection.rejectedEndpointNotInBoundaryCandidates++;continue;
        }
        const realOriginal=resourcesReserved.get(option.end)||[];
        const correctKey=island.sourceMember+':'+edge.to;
        const knownOther=realOriginal.filter(key=>key!==correctKey);
        // This is an *advisory conflict*, not a categorical identity veto;
        // do not pretend we independently know which existing claim is correct.
        let turn=null;
        if(state.prevSourceVector&&state.prevTargetVector){
          const a=cosine(state.prevSourceVector,edge.vector);
          const b=cosine(state.prevTargetVector,option.vector);
          if(a!==null&&b!==null){
            turn=Math.abs(a-b);
            if(turn>p.turnCosineTolerance+1e-8){
              rejection.rejectedTurnProfile++;continue;
            }
          }
        }
        const newUsedNodes=new Set(state.usedNodes);
        const newUsedEdges=new Set(state.usedEdges);
        for(const n of option.nodes.slice(1))newUsedNodes.add(n);
        for(const id of option.edges)newUsedEdges.add(id);
        const step={sourceElementId:edge.sourceElementId,
          sourceEndpoints:[edge.from,edge.to],targetNodePath:option.nodes,
          targetElementIds:option.edges,targetEndpoints:[state.node,option.end],
          sourceLengthMm:edge.lengthMm,targetLengthMm:option.lengthMm,
          lengthDeltaMm:option.deltaMm,turnProfileDifference:turn,
          propertyWarnings:option.propertyWarnings,
          targetNodeCustodyWarnings:sorted(knownOther)};
        next.push({start:state.start,node:option.end,
          nodes:[...state.nodes,...option.nodes.slice(1)],
          edges:[...state.edges,...option.edges],
          sourceNodeAssignments:[...state.sourceNodeAssignments,[edge.to,option.end]],
          steps:[...state.steps,step],
          usedNodes:newUsedNodes,usedEdges:newUsedEdges,
          prevSourceVector:edge.vector,prevTargetVector:option.vector});
      }
      if(truncated||globalCounts.visits>=p.maxGlobalExpansion){truncated=true;break;}
    }
    if(!next.length){beam=[];break;}
    // Deterministic bounded beam; pruning by width is *always* incomplete.
    next.sort((a,b)=>cmp(a.start,b.start)||cmp(a.node,b.node)
      ||cmp(a.edges.join('|'),b.edges.join('|')));
    const dedup=new Map();
    for(const n of next){
      const id=JSON.stringify([n.start,n.node,n.edges]);
      if(!dedup.has(id))dedup.set(id,n);
    }
    if(dedup.size>p.maxBeamWidth)truncated=true;
    beam=[...dedup.values()].slice(0,p.maxBeamWidth);
    maxCompleted=depth+1;
    if(globalCounts.visits>=p.maxGlobalExpansion){truncated=true;break;}
  }
  const complete=maxCompleted===source.ordered.length;
  const completeRoutes=complete?beam:[];
  if(completeRoutes.length>p.maxFullRoutesPerIsland)truncated=true;
  const witnesses=completeRoutes.slice(0,p.maxFullRoutesPerIsland).map(route=>freeze({
    startTargetNode:route.start,endTargetNode:route.node,
    sourceNodeAssignments:route.sourceNodeAssignments.map(x=>[...x]),
    orderedElementPaths:route.steps,
    flattenedTargetElementIds:route.edges,flattenedTargetNodePath:route.nodes,
    targetCustodyWarningSourceNodes:sorted(new Set(route.steps.flatMap(x=>x.targetNodeCustodyWarnings))),
    witnessStatus:isDual?'DUAL_ENDED_BOUNDED_ROUTE_HYPOTHESIS':'SINGLE_ENDED_BOUNDED_EXTENSION_HYPOTHESIS',
    certified:false,canBindScope:false,
  }));
  const status=truncated?'BOUNDED_SEARCH_INCOMPLETE':
    !complete?'NO_FULL_CHAIN_ROUTE_IN_DECLARED_WITNESS_DOMAIN':
      !isDual?'SINGLE_END_FULL_CHAIN_HYPOTHESES_ONLY':
        witnesses.length>1?'MULTIPLE_DUAL_BOUNDARY_ROUTES_WITHIN_BOUNDS':
          'ONE_DUAL_BOUNDARY_ROUTE_WITHIN_BOUNDS_NOT_CERTIFIED';
  return freeze({
    id:island.id,sourceMember:island.sourceMember,status,
    physicalSourceNodePath:source.nodes,
    orderedSourceElementIds:source.ordered.map(x=>x.sourceElementId),
    boundaryMode:isDual?'DUAL_BOUNDARY':'SINGLE_BOUNDARY',
    startingBoundarySourceNode:source.nodes[0],endingBoundarySourceNode:source.nodes.at(-1),
    startingTargetCandidates:begin,endingTargetCandidates:finish,
    missingElementCount:island.missingElementCount,
    maximumCompletedSourceEdges:maxCompleted,
    fullRouteWitnesses:witnesses,
    rejectedReasons:rejection,
    truncated,
    limitations:['BOUND_COUNTS_AND_BEAM_LIMIT_MAY_OMIT_ALTERNATE_FULL_TARGET_ROUTES',
      'PATH_SHAPE_AND_TURN_COSINES_ARE_NOT_INDEPENDENT_M1_M2_REGISTRATION',
      'COMPETING_TARGET_NODE_CUSTODY_WARNINGS_NEVER_AUTOMATICALLY_RESOLVED'],
  });
}
export function investigateCiiA207IndependentRoutes({
  triage,reconciliation,sourceGraphsById={},targetGraph,
  normalizedSourceShaById={},normalizedTargetSha256,policy={},
}={}){
  const p=policyOf(policy);
  const {source,target,rows,provenance}=validateBasis({
    triage,reconciliation,sourceGraphsById,targetGraph,normalizedSourceShaById,normalizedTargetSha256,
  });
  const globalCounts={visits:0};
  const islandResults=triage.missingIslands.map(i=>projectIsland(i,source.get(i.sourceMember),target,rows,p,globalCounts));
  const summary={
    originalPhysicalSourceNodes:triage.summary.sourceNodeCount,
    originalPhysicalSourceElements:triage.summary.sourceElementCount,
    incompletePhysicalFactors:triage.summary.unresolvedFactorCount,
    islandCount:islandResults.length,
    singleBoundaryIslands:islandResults.filter(i=>i.boundaryMode==='SINGLE_BOUNDARY').length,
    dualBoundaryIslands:islandResults.filter(i=>i.boundaryMode==='DUAL_BOUNDARY').length,
    islandsWithAtLeastOneCompleteBoundedRoute:islandResults.filter(i=>i.fullRouteWitnesses.length>0).length,
    totalCompleteBoundedRouteWitnesses:islandResults.reduce((sum,i)=>sum+i.fullRouteWitnesses.length,0),
    exhaustedIslands:islandResults.filter(i=>i.truncated).length,
    globalTargetWalkVisits:globalCounts.visits,
    ambiguousPhysicalElementReviewCount:triage.summary.ambiguousElementCount,
    targetCustodyWarningProposalCount:triage.summary.custodyWarningProposalCount,
  };
  return freeze({
    schema:'CiiArchitectureA207IslandRouteWitnesses.v1',
    status:'INDEPENDENT_BOUNDED_PHYSICAL_ROUTE_REVIEW_ONLY',
    provenance:{sourceSetSha256:provenance.sourceSetSha256,
      originalTargetSha256:provenance.originalTargetSha256,
      physicalOriginalSnapshotDigest:provenance.physicalOriginalSnapshotDigest,
      normalizedTargetSha256,triageSummaryDigest:sha(triage.summary)},
    policy:p,policyDigest:sha(p),summary,
    islands:islandResults,
    unresolvedAmbiguousElements:triage.ambiguousElements,
    unresolvedTargetNodeCustodyWarnings:triage.targetNodeCustodyWarnings,
    certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
    correspondenceCertificates:[],transferPlan:null,writeScope:null,
    limitations:[
      'NO_ADDITIVE_NODE_HYPOTHESES_ADMITTED_OR_PRODUCTION_MATCHING_MUTATED',
      'A_DUAL_BOUNDARY_ROUTE_IN_THE_TRIED_DOMAIN_IS_NOT_A_GLOBAL_IDENTITY_CERTIFICATE',
      'A_SINGLE_BOUNDARY_EXTENSION_IS_NOT_AN_INDEPENDENT_PHYSICAL_REGISTRATION',
      'BEAM_PRUNING_AND_LOCAL_PATH_SEGMENT_CAPS_PRECLUDE_GLOBAL_SEARCH_COMPLETENESS',
      'NO_NAME_BASED_MATCHING_AND_NO_WRITER_DISPATCH',
    ],
  });
}
export function assertCiiA207NoWrite(result){
  if(result?.schema!=='CiiArchitectureA207IslandRouteWitnesses.v1')
    err('ROUTE_REVIEW_SCHEMA_REQUIRED');
  err('INDEPENDENT_ROUTE_WITNESSES_NEVER_WRITER_AUTHORITY');
}
