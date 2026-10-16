/**
 * TEST-ONLY original CII global shape search, independent of production
 * candidate ranking and independent of proposed TARGET node IDs for placement.
 * Exhaustively enumerate target node/component translations of an original
 * SOURCE connected component's BOUND-node geometry. Mark UNIQUE only when
 * exactly one original TARGET node placement can realize the whole source
 * physical shape. The result is a geometric witness, not Writer authority.
 */
import {parseIndependentNodeNameState} from './cii-workspace-multisource-texpected-oracle.js';
const originalLines=raw=>(Buffer.isBuffer(raw)?raw.toString('latin1'):String(raw)).split(/\r?\n/);
function elements(raw){
 const rows=[];let inSection=false;
 for(const line of originalLines(raw)){
  const match=line.match(/^\s*#\$\s+(\S+)/);
  if(match){inSection=match[1].toUpperCase()==='ELEMENTS';continue}
  if(inSection)rows.push(line);
 }
 return rows;
}
const nfield=(line,i)=>{
 const v=Number(String(line).padEnd(2+13*(i+1),' ').slice(2+13*i,2+13*(i+1)).trim().replace(/[dD]/g,'E'));
 if(!Number.isFinite(v))throw Error('MIDCYCLE_GLOBAL_SHAPE_ORIGINAL_NUMERIC_FIELD_INVALID');
 return v;
};
const key=p=>p.map(x=>Math.round(x)).join('|');
function originalGraph(bytes){
 const original=Buffer.isBuffer(bytes)?bytes.toString('latin1'):bytes;
 const parsed=parseIndependentNodeNameState(original);
 if(parsed.conflicts.length)throw Error('MIDCYCLE_GLOBAL_SHAPE_ORIGINAL_NODE_NAME_CONFLICT');
 const numeric=elements(original);
 if(numeric.length!==15*parsed.elements.length)throw Error('MIDCYCLE_GLOBAL_SHAPE_ORIGINAL_CII_ELEMENT_MISMATCH');
 const adjacency=new Map();
 for(const [index,e] of parsed.elements.entries()){
  const delta=[2,3,4].map(i=>nfield(numeric[index*15],i));
  for(const id of [e.from,e.to]){
   if(!adjacency.has(id))adjacency.set(id,[]);
   adjacency.get(id).push({index,from:e.from,to:e.to,delta});
  }
 }
 const positions=new Map(),componentByNode=new Map(),components=[],conflicts=[];
 for(const first of adjacency.keys()){
  if(positions.has(first))continue;
  const componentId=components.length,ids=[],queue=[first];
  positions.set(first,[0,0,0]);
  componentByNode.set(first,componentId);
  for(let ix=0;ix<queue.length;ix++){
   const current=queue[ix],position=positions.get(current);
   ids.push(current);
   for(const e of adjacency.get(current)||[]){
    const neighbor=e.from===current?e.to:e.from,sign=e.from===current?1:-1;
    const candidate=position.map((x,i)=>x+sign*e.delta[i]);
    if(!positions.has(neighbor)){
     positions.set(neighbor,candidate);
     componentByNode.set(neighbor,componentId);queue.push(neighbor);
    }else if(Math.hypot(...candidate.map((x,i)=>x-positions.get(neighbor)[i]))>1){
     conflicts.push({componentId,current,neighbor,edge:e.index});
    }
   }
  }
  components.push(ids);
 }
 return {positions,componentByNode,components,conflicts,adjacency};
}
const memberKey=(member,node)=>member+':'+node;
export function verifyCiiMidcycle150GlobalOriginalShape({
 originalSources,originalTarget,audit,localPathWitness,
}) {
 const sourceGraphs=new Map(originalSources.map(x=>[x.sourceId,originalGraph(x.bytes)]));
 if([...sourceGraphs.keys()].sort().join(',')!=='S1,S2,S3')
  throw Error('MIDCYCLE_GLOBAL_SHAPE_THREE_MEMBERS_REQUIRED');
 const target=originalGraph(originalTarget);
 const auditBySource=new Map();
 for(const row of audit.rows){
  const id=memberKey(row.sourceId,row.sourceNodeId);
  if(auditBySource.has(id))throw Error('MIDCYCLE_GLOBAL_SHAPE_DUPLICATE_AUDIT_SOURCE');
  auditBySource.set(id,row);
 }
 if(auditBySource.size!==150)throw Error('MIDCYCLE_GLOBAL_SHAPE_ORIGINAL_150_AUDIT_REQUIRED');
 const localBySource=new Map(localPathWitness.rows.map(x=>[x.sourcePhysicalKey,x]));
 const targetComponents=target.components.map((nodes,index)=>{
   const indexByCoord=new Map();
   for(const id of nodes){
    const coordinate=key(target.positions.get(id));
    if(!indexByCoord.has(coordinate))indexByCoord.set(coordinate,[]);
    indexByCoord.get(coordinate).push(id);
   }
   return {componentId:index,nodes,indexByCoord};
 });
 const report=[],verified=[];
 for(const [sourceId,graph] of sourceGraphs){
  for(let componentIndex=0;componentIndex<graph.components.length;componentIndex++){
   const members=graph.components[componentIndex];
   const boundNodes=members.filter(id=>{
    const r=auditBySource.get(memberKey(sourceId,id));
    return r?.identityBound===true&&r.state==='BOUND'&&(r.targetNodeIds||[]).length===1;
   });
   if(!boundNodes.length)continue;
   // A revised/unmatched section between otherwise correct SOURCE spans
   // must not invalidate independent geometry of either matched span.
   // Partition the ORIGINAL member's graph into maximal BOUND-only
   // connected subgraphs before globally searching all original T nodes.
   const accepted=new Set(boundNodes),seen=new Set(),boundGroups=[];
   for(const candidate of boundNodes){
     if(seen.has(candidate))continue;
     const queue=[candidate],group=[];
     seen.add(candidate);
     for(let ix=0;ix<queue.length;ix++){
       const current=queue[ix];group.push(current);
       for(const edge of graph.adjacency.get(current)||[]){
         const next=edge.from===current?edge.to:edge.from;
         if(accepted.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
       }
     }
     boundGroups.push(group);
   }
   for(let boundGroupIndex=0;boundGroupIndex<boundGroups.length;boundGroupIndex++){
   const bound=boundGroups[boundGroupIndex];
   const first=bound[0];
   const sourceRoot=graph.positions.get(first);
   const placements=[];
   if(graph.conflicts.some(x=>x.componentId===componentIndex)){
    report.push({sourceId,componentIndex,originalPhysicalNodeCount:members.length,
      boundSourceNodeCount:bound.length,fullOriginalShapeTranslationCandidates:null,
      status:'SOURCE_ORIGINAL_COMPONENT_COORDINATE_CYCLE_CONFLICT',boundSourceNodeIds:bound});continue;
   }
   if(bound.length>=3){
    for(const tc of targetComponents){
     if(tc.nodes.length<bound.length)continue;
     for(const candidateRootId of tc.nodes){
      const candidateRoot=target.positions.get(candidateRootId);
      const translation=candidateRoot.map((x,i)=>x-sourceRoot[i]);
      const map=[];
      for(const srcId of bound){
       const expected=graph.positions.get(srcId).map((x,i)=>x+translation[i]);
       const possibles=tc.indexByCoord.get(key(expected))||[];
       if(possibles.length!==1){map.length=0;break;}
       map.push({sourcePhysicalNodeId:srcId,targetPhysicalNodeId:possibles[0]});
      }
      if(map.length!==bound.length||new Set(map.map(x=>x.targetPhysicalNodeId)).size!==map.length)continue;
      placements.push({targetComponentId:tc.componentId,rootTargetNodeId:candidateRootId,translation,physicalNodePairs:map});
     }
    }
   }
   const proposedMatches=placements.filter(p=>p.physicalNodePairs.every(pair=>{
     const r=auditBySource.get(memberKey(sourceId,pair.sourcePhysicalNodeId));
     return String(r.targetNodeIds[0])===pair.targetPhysicalNodeId;
   }));
   const globalUnique=placements.length===1&&proposedMatches.length===1;
   const hasCompleteLocalWitness=bound.every(id=>{
     const r=localBySource.get(memberKey(sourceId,id));
     return r?.state==='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY'&&
        r.independentLocalRouteWitnesses.some(w=>w.withinVectorTolerance&&w.withinLengthTolerance);
   });
   const status=globalUnique&&hasCompleteLocalWitness?'UNIQUE_GLOBAL_TRANSLATED_ORIGINAL_GEOMETRY_WITH_ORIGINAL_ROUTE_CUSTODY':
     placements.length>1?'ORIGINAL_GEOMETRY_MULTIPLE_TARGET_COMPONENT_EMBEDDINGS':
     placements.length===0?'NO_COMPLETE_ORIGINAL_GEOMETRY_EMBEDDING':
     !hasCompleteLocalWitness?'ORIGINAL_LOCAL_ROUTE_NOT_QUALIFIED':'UNIQUE_GEOMETRY_NOT_INDEPENDENTLY_MATCHING_SOLVER';
   report.push({sourceId,componentIndex,originalPhysicalNodeCount:members.length,
    boundSourceNodeCount:bound.length,fullOriginalShapeTranslationCandidates:placements.length,
    solverPlacementCandidates:proposedMatches.length,sourceOriginalPositionConflicts:0,
    hasCompleteLocalWitness,status,boundSourceNodeIds:bound,
    boundGroupIndex,selectedUniquePlacement:globalUnique?placements[0]:null});
   if(globalUnique&&hasCompleteLocalWitness)for(const pair of placements[0].physicalNodePairs){
     verified.push({sourcePhysicalKey:memberKey(sourceId,pair.sourcePhysicalNodeId),
       targetPhysicalNodeId:pair.targetPhysicalNodeId,originalSourceComponent:componentIndex,
       originalTargetComponent:placements[0].targetComponentId,
       globalOriginalShapeWitness:'COMPLETE_COMPONENT_BOUND_SUBGRAPH_UNIQUE_TARGET_TRANSLATION_AND_VECTOR_PATH'});
   }
   }
  }
 }
 const verifiedPerMember=['S1','S2','S3'].map(sourceId=>({
   sourceId,geometricallyUniqueSourceNodeCount:verified.filter(v=>v.sourcePhysicalKey.startsWith(sourceId+':')).length,
 }));
 return {
   schema:'CiiMidcycle150ExhaustiveOriginalGlobalShapeVerification.v1',
   sourceModel:'CUMULATIVE_S1_PLUS_S2_PLUS_S3',targetNodeCount:target.positions.size,
   originalTargetComponentCount:target.components.length,
   originalTargetCoordinateCycleConflicts:target.conflicts.length,
   validatedUniqueOriginalGeometryNodes:verified.length,
   validatedPerSource:verifiedPerMember,
   completeOriginalGraphComponentsSearched:report.length,
   ambiguousOriginalGeometryComponents:report.filter(x=>x.status==='ORIGINAL_GEOMETRY_MULTIPLE_TARGET_COMPONENT_EMBEDDINGS').length,
   certificationScope:'ORIGINAL_MAXIMAL_BOUND_CONNECTED_SUBGRAPH_UNIQUE_TARGET_TRANSLATION_WITH_EXACT_ORIGINAL_COORDINATES_AND_ROUTE_VECTORS',
   originalGeometryNotOwner428Recall:true,
   components:report,uniquePlacementPhysicalNodes:verified,
 };
}
