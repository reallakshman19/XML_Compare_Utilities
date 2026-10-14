/**
 * ARCH-01 A2-SHADOW-06: truthful SOURCE missing-edge islands, target-side
 * component reachability, and independent ambiguity/custody review queues.
 *
 * This is a diagnostic over immutable A2-05 evidence, NOT candidate generation,
 * correspondence certification, or a Writer plan.
 */
import { createHash } from 'node:crypto';

const SHA=/^[0-9a-f]{64}$/i;
const string=(v)=>String(v??'').trim();
const cmp=(a,b)=>string(a).localeCompare(string(b),undefined,{numeric:true});
const sorted=(values)=>[...values].sort(cmp);
const hash=(obj)=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==='object')return Object.freeze(Object.fromEntries(Object.entries(value)
    .map(([key,item])=>[key,freeze(item)])));
  return value;
}
const key=(source,node)=>string(source)+':'+string(node);
const fault=(message)=>{throw Error('A206_'+message);};
function policyOf(arg={}){
  const policy={maxMissingIslands:300,maxTargetComponentNodes:100000,
    maxTargetProbeHops:4,maxTargetProbeVisits:120,...arg};
  for(const [field,max] of [
    ['maxMissingIslands',10000],['maxTargetComponentNodes',300000],
    ['maxTargetProbeHops',10],['maxTargetProbeVisits',10000]]){
    if(!Number.isSafeInteger(policy[field])||policy[field]<1||policy[field]>max)
      fault('INVALID_BOUNDED_POLICY:'+field);
  }
  return freeze(policy);
}
function physicalGraph(g,side,normalizedSha){
  if(!SHA.test(string(normalizedSha))||g?.side!==side
    ||g.documentId!==side+':'+normalizedSha
    ||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))
    fault('CANONICAL_GRAPH_SHA_CUSTODY_REQUIRED:'+side);
  const byId=new Map(),byNode=new Map();
  for(const edge of g.edges){
    const eid=string(edge.elementId),a=string(edge.from),b=string(edge.to);
    if(!eid||!a||!b||a===b||byId.has(eid))fault('DUPLICATE_OR_INVALID_PHYSICAL_ELEMENT:'+side);
    if(!(g.adjacency.get(a)||[]).some(e=>string(e.elementId)===eid)
      ||!(g.adjacency.get(b)||[]).some(e=>string(e.elementId)===eid))
      fault('CANONICAL_ADJACENCY_INCOMPLETE:'+side);
    byId.set(eid,edge);
    if(!byNode.has(a))byNode.set(a,[]);
    if(!byNode.has(b))byNode.set(b,[]);
    byNode.get(a).push(edge);byNode.get(b).push(edge);
  }
  for(const [node,edges] of byNode){
    const original=g.adjacency.get(node)||[];
    if(edges.length!==original.length
      ||sorted(edges.map(e=>string(e.elementId))).join('|')
        !==sorted(original.map(e=>string(e.elementId))).join('|'))
      fault('CANONICAL_ADJACENCY_EXTRA_OR_MISSING:'+side);
  }
  return {g,byId,byNode};
}
function other(edge,node){return string(edge.from)===node?string(edge.to):string(edge.from);}
function targetComponents(target,policy){
  const components=[],index=new Map(),seen=new Set();
  const all=sorted(target.byNode.keys());
  let visits=0,truncated=false;
  for(const start of all){
    if(seen.has(start))continue;
    const list=[],queue=[start];seen.add(start);
    for(let i=0;i<queue.length;i++){
      if(visits>=policy.maxTargetComponentNodes){truncated=true;break;}
      const node=queue[i];visits++;list.push(node);
      for(const e of [...(target.byNode.get(node)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
        const next=other(e,node);
        if(!seen.has(next)){seen.add(next);queue.push(next);}
      }
    }
    const id='TGRAPH-'+String(components.length+1).padStart(3,'0');
    for(const node of list)index.set(node,id);
    components.push(freeze({id,nodeCount:list.length,
      edgeCount:new Set(list.flatMap(n=>(target.byNode.get(n)||[]).map(e=>e.elementId))).size,
      complete:!truncated}));
    if(truncated)break;
  }
  return {components,index,truncated,visitedNodes:visits};
}
function targetProbe(target,anchor,policy){
  if(!target.byNode.has(anchor))return freeze({anchor,status:'TARGET_NODE_NOT_IN_PHYSICAL_GRAPH',
    visitCount:0,hopBound:policy.maxTargetProbeHops,reachedBranchNodes:[],reachedPhysicalNodes:[]});
  const seen=new Set([anchor]),queue=[{node:anchor,hop:0}],branches=[];
  let truncated=false;
  for(let i=0;i<queue.length;i++){
    if(i>=policy.maxTargetProbeVisits){truncated=true;break;}
    const {node,hop}=queue[i],incidence=target.byNode.get(node)||[];
    if(incidence.length!==2)branches.push(node);
    if(hop>=policy.maxTargetProbeHops)continue;
    for(const edge of [...incidence].sort((a,b)=>cmp(a.elementId,b.elementId))){
      const next=other(edge,node);
      if(!seen.has(next)){seen.add(next);queue.push({node:next,hop:hop+1});}
    }
  }
  return freeze({anchor,status:truncated?'TRUNCATED_TARGET_PROBE':'BOUNDED_TARGET_NEIGHBOURHOOD',
    visitCount:Math.min(queue.length,policy.maxTargetProbeVisits),
    hopBound:policy.maxTargetProbeHops,
    reachedBranchNodes:sorted(branches),
    reachedPhysicalNodes:sorted(seen)});
}
function baselines(r){
  if(r?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
    ||r.status!=='RECONCILED_SHADOW_NONWRITING'||r.writerReady!==false
    ||r.transferPlan!==null||r.writeScope!==null
    ||r.certifiedNodeCount!==0||r.certifiedElementCount!==0
    ||r.augmentedJoint?.writerDispatchInstalled!==false
    ||r.augmentedJoint?.transferPlan!==null||r.augmentedJoint?.writeScope!==null
    ||r.recomputedGlobalAudit?.writerReady!==false||r.recomputedGlobalAudit.certifiedNodeCount!==0)
    fault('NONWRITING_A205_RECONCILIATION_REQUIRED');
  const joint=r.augmentedJoint,path=r.recomputedPathAudit,global=r.recomputedGlobalAudit;
  if(joint.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'
    ||path.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
    ||global.schema!=='CiiArchitectureA203GlobalConstraintShadow.v1'
    ||path.writerReady!==false||path.certifiedNodeCount!==0||path.certifiedElementCount!==0)
    fault('A2_STAGE_SCHEMA_INCOMPATIBLE');
  const authority=joint.provenance;
  if(authority.physicalOriginalSnapshotDigest!==r.originalPhysicalSnapshotDigest
    ||path.provenance.originalSourceSetSha256!==authority.sourceSetSha256
    ||path.provenance.originalTargetSha256!==authority.originalTargetSha256
    ||path.provenance.jointSnapshotDigest!==authority.physicalOriginalSnapshotDigest
    ||global.provenance.originalSourceSetSha256!==authority.sourceSetSha256
    ||global.provenance.originalTargetSha256!==authority.originalTargetSha256
    ||global.provenance.jointSnapshotDigest!==authority.physicalOriginalSnapshotDigest
    ||path.provenance.normalizedTargetSha256!==global.provenance.normalizedTargetSha256
    ||r.recomputedEndpointMissingFactors!==path.edgeRows.filter(x=>x.status==='ENDPOINT_CANDIDATE_MISSING').length
    ||r.recomputedGlobalComponentCounts.INCOMPLETE_PHYSICAL_EVIDENCE
      !==global.componentStates.INCOMPLETE_PHYSICAL_EVIDENCE)
    fault('A205_SHARED_ORIGINAL_PHYSICAL_BASIS_CHANGED');
  return {joint,path,global,authority};
}
function sourceIslands(sourceGraphs,missingFactors,nodeRows,policy){
  const result=[];
  const byMember=new Map();
  for(const factor of missingFactors){
    if(!byMember.has(factor.sourceMember))byMember.set(factor.sourceMember,[]);
    byMember.get(factor.sourceMember).push(factor);
  }
  for(const member of sorted(sourceGraphs.keys())){
    const {byId,byNode}=sourceGraphs.get(member);
    const pending=byMember.get(member)||[];
    const nodesByMissingEdge=new Map();
    for(const f of pending){
      const physical=byId.get(string(f.sourceElementId));
      if(!physical||JSON.stringify(f.sourceEndpoints)!==JSON.stringify([string(physical.from),string(physical.to)]))
        fault('MISSING_FACTOR_NOT_CANONICAL_SOURCE_ELEMENT:'+member+':'+f.sourceElementId);
      for(const n of [string(physical.from),string(physical.to)]){
        if(!nodesByMissingEdge.has(n))nodesByMissingEdge.set(n,[]);
        nodesByMissingEdge.get(n).push(f);
      }
    }
    const pendingById=new Set(pending.map(f=>string(f.sourceElementId))),visited=new Set();
    for(const start of sorted(pendingById)){
      if(visited.has(start))continue;
      const q=[start],edges=[],nodes=new Set();
      visited.add(start);
      for(let i=0;i<q.length;i++){
        const eid=q[i],edge=byId.get(eid);
        edges.push(eid);nodes.add(string(edge.from));nodes.add(string(edge.to));
        for(const n of [string(edge.from),string(edge.to)])
          for(const adjacent of nodesByMissingEdge.get(n)||[]){
            const next=string(adjacent.sourceElementId);
            if(!visited.has(next)){visited.add(next);q.push(next);}
          }
      }
      const orderedNodes=sorted(nodes),orderedEdges=sorted(edges);
      const boundary=orderedNodes.filter(n=>(nodeRows.get(key(member,n))?.targets||[]).length>0);
      const unknown=orderedNodes.filter(n=>!(nodeRows.get(key(member,n))?.targets||[]).length);
      const borderElements=new Set();
      for(const n of orderedNodes)
        for(const e of byNode.get(n)||[])
          if(!pendingById.has(string(e.elementId)))borderElements.add(string(e.elementId));
      const targetBindings=boundary.flatMap(n=>
        (nodeRows.get(key(member,n))?.targets||[]).map(t=>({sourceNode:n,targetNode:t,
          provisionalEvidence:(nodeRows.get(key(member,n))?.state||'UNMAPPED')==='CONFLICT'
        })));
      const id=member+'-ISLAND-'+String(result.filter(x=>x.sourceMember===member).length+1).padStart(3,'0');
      result.push({
        id,sourceMember:member,sourceNodeIds:orderedNodes,sourceElementIds:orderedEdges,
        missingElementCount:orderedEdges.length,
        unmappedSourceNodeIds:unknown,
        boundaryNodeIds:boundary,boundaryHypotheses:targetBindings,
        borderingNonmissingSourceElements:sorted(borderElements),
      });
      if(result.length>policy.maxMissingIslands)fault('MISSING_ISLAND_COUNT_BOUND_EXCEEDED');
    }
  }
  return result.sort((a,b)=>cmp(a.sourceMember,b.sourceMember)
    ||cmp(a.sourceNodeIds[0],b.sourceNodeIds[0]));
}
export function investigateCiiA206PhysicalIslands({
  reconciliation,sourceGraphsById={},targetGraph,
  normalizedSourceShaById={},normalizedTargetSha256,policy={},
}={}){
  const p=policyOf(policy);
  const {joint,path,global,authority}=baselines(reconciliation);
  const members=sorted(Object.keys(authority.originalSourceShaById||{}));
  if(!members.length||members.join('|')!==sorted(Object.keys(sourceGraphsById)).join('|')
    ||members.join('|')!==sorted(Object.keys(normalizedSourceShaById)).join('|')
    ||members.join('|')!==sorted(Object.keys(path.provenance.normalizedSourceShaById||{})).join('|'))
    fault('SOURCE_GRAPH_MEMBER_CUSTODY_INCOMPLETE');
  const graphByMember=new Map();
  for(const member of members){
    if(normalizedSourceShaById[member]!==path.provenance.normalizedSourceShaById[member])
      fault('SOURCE_NORMALIZED_HASH_MISMATCH');
    graphByMember.set(member,physicalGraph(sourceGraphsById[member],'SOURCE',normalizedSourceShaById[member]));
  }
  if(normalizedTargetSha256!==path.provenance.normalizedTargetSha256)
    fault('TARGET_NORMALIZED_HASH_MISMATCH');
  const target=physicalGraph(targetGraph,'TARGET',normalizedTargetSha256);
  const targetStructure=targetComponents(target,p);
  const physicalNodeRows=new Map();
  for(const row of joint.nodeRows){
    if(row.sourceNodeKey!==key(row.sourceId,row.sourceNodeId)
      ||physicalNodeRows.has(row.sourceNodeKey))fault('SOURCE_NODE_CENSUS_INCONSISTENT');
    physicalNodeRows.set(row.sourceNodeKey,row);
  }
  if(physicalNodeRows.size!==joint.summary.originalPhysicalSourceNodes)
    fault('SOURCE_NODE_COUNT_MISMATCH');
  const missing=path.edgeRows.filter(x=>x.status==='ENDPOINT_CANDIDATE_MISSING');
  if(missing.length!==33&&missing.length!==reconciliation.recomputedEndpointMissingFactors)
    fault('MISSING_FACTOR_STATUS_INCONSISTENT');
  if(path.edgeRows.length!==path.sourceElementCountExamined)fault('SOURCE_ELEMENT_CENSUS_MISMATCH');
  const islands=sourceIslands(graphByMember,missing,physicalNodeRows,p);
  const seedKeys=new Set();
  const decorated=islands.map(island=>{
    const targetComponentIds=sorted(new Set(island.boundaryHypotheses.map(x=>
      targetStructure.index.get(x.targetNode)||'TARGET_TOPOLOGY_NOT_ENUMERATED')));
    const uniqueAnchors=sorted(new Set(island.boundaryHypotheses.map(x=>x.targetNode)));
    for(const n of uniqueAnchors)seedKeys.add(n);
    const boundaryStatus=targetStructure.truncated?'TARGET_TOPOLOGY_ENUMERATION_TRUNCATED':
      !island.boundaryHypotheses.length?'NO_BOUNDARY_CORRESPONDENCE_SEED':
        targetComponentIds.length>1?'BOUNDARY_TARGETS_IN_DISCONNECTED_TARGET_COMPONENTS':
          island.boundaryNodeIds.length===1?'SINGLE_BOUNDARY_SOURCE_NODE':
            'MULTI_BOUNDARY_IN_ONE_TARGET_COMPONENT';
    const priority=boundaryStatus==='BOUNDARY_TARGETS_IN_DISCONNECTED_TARGET_COMPONENTS'?'CUSTODY_REVIEW':
      boundaryStatus==='NO_BOUNDARY_CORRESPONDENCE_SEED'?'INDEPENDENT_BASE_SEARCH':
        island.boundaryHypotheses.some(x=>x.provisionalEvidence)?'CONFLICT_REVIEW':'TOPOLOGY_WITNESS_SEARCH';
    return freeze({...island,targetComponentIds,boundaryStatus,priority,
      certified:false,writerReady:false});
  });
  const targetProbes=sorted(seedKeys).map(node=>targetProbe(target,node,p));
  const ambiguous=path.edgeRows.filter(r=>r.status==='LOCAL_PATH_AMBIGUOUS').map(row=>{
    if(row.pathWitnesses.length<2)fault('AMBIGUOUS_FACTOR_REQUIRES_TWO_PATHS');
    const actual=graphByMember.get(row.sourceMember)?.byId.get(row.sourceElementId);
    if(!actual||JSON.stringify(row.sourceEndpoints)!==JSON.stringify([
      string(actual.from),string(actual.to)]))fault('AMBIGUOUS_FACTOR_SOURCE_EDGE_MISMATCH');
    const alternatives=row.pathWitnesses.map(w=>{
      const ids=w.targetElementIds||[],nodes=w.targetNodePath||[];
      if(!ids.length||nodes.length!==ids.length+1
        ||nodes[0]!==w.targetEndpoints[0]||nodes.at(-1)!==w.targetEndpoints[1])
        fault('AMBIGUOUS_WITNESS_ORDERING_INCONSISTENT');
      for(let i=0;i<ids.length;i++){
        const e=target.byId.get(string(ids[i]));
        if(!e||!((string(e.from)===nodes[i]&&string(e.to)===nodes[i+1])
          ||(string(e.to)===nodes[i]&&string(e.from)===nodes[i+1])))
          fault('AMBIGUOUS_WITNESS_NOT_CANONICAL_TARGET_ROUTE');
      }
      return freeze({targetEndpoints:[...w.targetEndpoints],
        targetElementIds:[...ids],targetNodePath:[...nodes],
        propertyWarnings:[...(w.propertyWarnings||[])],
        physicalCertificate:false});
    });
    const ids=new Set(alternatives.map(a=>JSON.stringify([a.targetEndpoints,a.targetElementIds])));
    if(ids.size!==alternatives.length)fault('DUPLICATED_AMBIGUOUS_PATH_WITNESSES');
    const allEdges=new Set(alternatives.flatMap(a=>a.targetElementIds));
    const commonEdges=alternatives.length?
      alternatives[0].targetElementIds.filter(id=>alternatives.every(a=>a.targetElementIds.includes(id))):[];
    return freeze({
      sourceMember:row.sourceMember,sourceElementId:row.sourceElementId,
      sourceEndpoints:[...row.sourceEndpoints],candidatePairCount:row.candidatePairCount,
      alternativeCount:alternatives.length,alternatives,
      commonTargetElementIds:sorted(commonEdges),
      competingTargetElementIds:sorted([...allEdges].filter(x=>!commonEdges.includes(x))),
      reviewStatus:'UNRESOLVED_MULTIPLE_BOUNDED_LOCAL_ROUTES',certified:false,
    });
  }).sort((a,b)=>cmp(a.sourceMember,b.sourceMember)||cmp(a.sourceElementId,b.sourceElementId));
  const custody=[...(reconciliation.sharedTargetCustodyConflicts||[])].map(c=>{
    const claimant=physicalNodeRows.get(c.sourceNodeKey);
    const targetId=string(c.targetNodeId);
    if(!claimant?.targets.includes(targetId)
      ||!Array.isArray(c.otherSourceNodeKeys)||!c.otherSourceNodeKeys.length)
      fault('CUSTODY_CLAIM_NOT_IN_AUGMENTED_NODE_LEDGER');
    for(const rival of c.otherSourceNodeKeys)
      if(!physicalNodeRows.get(rival)?.targets.includes(targetId))
        fault('CUSTODY_RIVAL_NOT_ATTESTED');
    return freeze({...c,reviewStatus:'UNRESOLVED_TARGET_NODE_MULTI_CLAIM',
      certified:false,writerReady:false});
  }).sort((a,b)=>cmp(a.sourceNodeKey,b.sourceNodeKey)||cmp(a.targetNodeId,b.targetNodeId));
  if(custody.length!==reconciliation.proposalsWithSharedTargetCustodyWarnings)
    fault('CUSTODY_CONFLICT_CENSUS_INCONSISTENT');
  const reviewItems=[
    ...decorated.map(x=>({id:x.id,type:'MISSING_EDGE_ISLAND',member:x.sourceMember,
      priority:x.priority,sourceNodes:x.sourceNodeIds,sourceElements:x.sourceElementIds,
      reason:x.boundaryStatus})),
    ...ambiguous.map(x=>({id:x.sourceMember+':'+x.sourceElementId,type:'AMBIGUOUS_TARGET_PATH',
      member:x.sourceMember,priority:'AMBIGUITY_REVIEW',
      sourceNodes:x.sourceEndpoints,sourceElements:[x.sourceElementId],
      reason:String(x.alternativeCount)+'_COMPETING_LOCAL_PATHS'})),
    ...custody.map(x=>({id:x.sourceNodeKey+'->'+x.targetNodeId,type:'TARGET_NODE_CUSTODY_CONFLICT',
      member:x.sourceNodeKey.split(':')[0],priority:'CUSTODY_REVIEW',
      sourceNodes:[x.sourceNodeKey,...x.otherSourceNodeKeys],
      sourceElements:[],reason:'MULTIPLE_SOURCE_NODE_HYPOTHESES_CLAIM_PHYSICAL_TARGET'})),
  ];
  const priority={CUSTODY_REVIEW:0,AMBIGUITY_REVIEW:1,INDEPENDENT_BASE_SEARCH:2,TOPOLOGY_WITNESS_SEARCH:3};
  reviewItems.sort((a,b)=>(priority[a.priority]??4)-(priority[b.priority]??4)||cmp(a.id,b.id));
  const missingCount=islands.reduce((sum,i)=>sum+i.missingElementCount,0);
  if(missingCount!==missing.length)fault('MISSING_ISLAND_ELEMENT_PARTITION_INVALID');
  const byMember=Object.fromEntries(members.map(m=>[m,{
    incompleteSourceElements:missing.filter(r=>r.sourceMember===m).length,
    missingIslands:decorated.filter(x=>x.sourceMember===m).length,
    ambiguousElements:ambiguous.filter(x=>x.sourceMember===m).length,
    custodyWarningProposals:custody.filter(x=>x.sourceNodeKey.startsWith(m+':')).length,
  }]));
  return freeze({
    schema:'CiiArchitectureA206PhysicalReviewIslands.v1',status:'PHYSICAL_ISLAND_REVIEW_ONLY',
    authority:{
      sourceSetSha256:authority.sourceSetSha256,
      originalTargetSha256:authority.originalTargetSha256,
      physicalOriginalSnapshotDigest:authority.physicalOriginalSnapshotDigest,
      normalizedTargetSha256,
      augmentedNodeHypothesisDigest:hash(joint.hypotheses.map(h=>[h.sourceNodeKey,h.targetNodeId])),
      reconcilationStatus:reconciliation.status,
    },
    policy:p,policyDigest:hash(p),
    summary:{
      sourceNodeCount:physicalNodeRows.size,sourceElementCount:path.edgeRows.length,
      unresolvedFactorCount:missing.length,missingIslandCount:decorated.length,
      ambiguousElementCount:ambiguous.length,custodyWarningProposalCount:custody.length,
      targetComponentCountObserved:targetStructure.components.length,
      targetComponentEnumerationComplete:!targetStructure.truncated,
      targetBoundedProbeCount:targetProbes.length,
      totalReviewItems:reviewItems.length,
      bySource:byMember,
    },
    missingIslands:decorated,ambiguousElements:ambiguous,
    targetNodeCustodyWarnings:custody,targetComponents:targetStructure.components,
    boundedTargetProbes:targetProbes,reviewQueue:reviewItems,
    certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
    correspondenceCertificates:[],transferPlan:null,writeScope:null,
    limitations:[
      'BOUNDARY_TOPOLOGY_AND_TARGET_PROXIMITY_ARE_DIAGNOSTICS_NOT_IDENTITY_EVIDENCE',
      'THE_TARGET_GRAPH_COMPONENT_INDEX_IS_NOT_METHOD_A_OR_B_REGISTRATION',
      'SOURCE_EDGE_ISLANDS_ARE_CONNECTED_ONLY_THROUGH_CURRENTLY_MISSING_FACTORS',
      'ORIGINAL_CANDIDATE_DOMAINS_MAY_OMIT_GENUINE_ALTERNATIVES',
      'NO_NEW_NODE_CANDIDATES_OR_WRITER_ADMISSION_OR_TARGET_MUTATION',
    ],
  });
}
export function assertCiiA206NoWrite(result){
  if(result?.schema!=='CiiArchitectureA206PhysicalReviewIslands.v1')
    fault('REVIEW_ISLAND_SCHEMA_REQUIRED');
  fault('PHYSICAL_REVIEW_ISLAND_NEVER_WRITER_AUTHORITY');
}
