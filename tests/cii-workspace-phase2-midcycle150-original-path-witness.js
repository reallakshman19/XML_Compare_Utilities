/**
 * Independent (test-only) original CII path witness diagnostic.
 * Reads ORIGINAL ELEMENTS geometry fixed fields; never uses production graphs
 * to manufacture validation, but also does NOT claim independent global
 * physical identity when paths/alternative T-node candidates are unresolved.
 */
import {parseIndependentNodeNameState} from './cii-workspace-multisource-texpected-oracle.js';
const rowsOf=(raw,section)=>{
 const all=Buffer.isBuffer(raw)?raw.toString('latin1'):String(raw);
 const lines=all.split(/\r?\n/);let active=false,rows=[];
 for(const line of lines){
  const m=line.match(/^\s*#\$\s+(\S+)/);
  if(m){active=m[1].toUpperCase()===section;continue}
  if(active)rows.push(line);
 }
 return rows;
};
const float=(line,field)=>{
 const raw=String(line||'').padEnd(2+13*(field+1),' ')
  .slice(2+13*field,2+13*(field+1)).trim().replace(/[dD]/g,'E');
 const value=Number(raw);
 return Number.isFinite(value)?value:null;
};
function originalGraph(bytes){
 const parsed=parseIndependentNodeNameState(Buffer.isBuffer(bytes)?bytes.toString('latin1'):bytes);
 if(parsed.conflicts.length)throw Error('MIDCYCLE_ORIGINAL_NODE_NAME_CUSTODY_CONFLICT');
 const numeric=rowsOf(bytes,'ELEMENTS');
 if(numeric.length!==parsed.elements.length*15)throw Error('MIDCYCLE_ORIGINAL_ELEMENT_CENSUS_CONFLICT');
 const edges=parsed.elements.map((e,i)=>{
  const line=numeric[i*15];
  const delta=[2,3,4].map(k=>float(line,k));
  if(delta.some(x=>x==null))throw Error('MIDCYCLE_ORIGINAL_VECTOR_NOT_PARSEABLE:'+i);
  const length=Math.hypot(...delta);
  return Object.freeze({from:e.from,to:e.to,index:i,originalLengthMm:length,
   originalDirectionVector:Object.freeze(delta),
   originalFixedFieldElementRow:i*15+1,
   originalNodeNamePointer:e.pointer});
 });
 const adjacency=new Map();
 for(const e of edges)for(const id of [e.from,e.to]){
  if(!adjacency.has(id))adjacency.set(id,[]);
  adjacency.get(id).push(e);
 }
 return {edges,adjacency,nodeNameMap:parsed.names};
}
const other=(e,id)=>e.from===id?e.to:e.from;
function originalShortestPath(graph,start,end) {
 if(start===end)return {status:'SAME_PHYSICAL_NODE',edges:[],lengthMm:0};
 if(!graph.adjacency.has(start)||!graph.adjacency.has(end))return {status:'MISSING_NODE'};
 const q=[start],distance=new Map([[start,0]]),ways=new Map([[start,1]]),parent=new Map();
 for(let i=0;i<q.length;i++){
  const id=q[i],depth=distance.get(id);
  for(const edge of graph.adjacency.get(id)){
   const next=other(edge,id),nd=depth+1;
   if(!distance.has(next)){distance.set(next,nd);ways.set(next,ways.get(id));
    parent.set(next,{prior:id,edge});q.push(next);}
   else if(distance.get(next)===nd){ways.set(next,Math.min(2,ways.get(next)+ways.get(id)));}
  }
 }
 if(!distance.has(end))return {status:'DISCONNECTED'};
 if(ways.get(end)!==1)return {status:'AMBIGUOUS_SHORTEST_HOP_ROUTE'};
 let id=end,out=[],steps=[];
 while(id!==start){
  const p=parent.get(id);
  if(!p)throw Error('MIDCYCLE_SHORTEST_PATH_RECONSTRUCTION_FAILED');
  out.push(p.edge);steps.push({from:p.prior,to:id,edge:p.edge});id=p.prior;
 }
 out.reverse();steps.reverse();
 const delta=steps.reduce((sum,step)=>{
   const sign=step.from===step.edge.from?1:-1;
   return sum.map((n,i)=>n+sign*step.edge.originalDirectionVector[i]);
 },[0,0,0]);
 return {status:'UNIQUE_MIN_HOP_ROUTE',edges:out,vectorMm:delta,
  lengthMm:out.reduce((sum,e)=>sum+e.originalLengthMm,0)};
}
const sourceKey=(member,node)=>member+':'+node;
export function buildCiiMidcycle150OriginalPathWitnesses({
 originalSources,originalTarget,audit,pathTotalLengthToleranceMm=100,
}) {
 if(!Array.isArray(originalSources)||originalSources.length!==3||
   !Number.isFinite(pathTotalLengthToleranceMm)||pathTotalLengthToleranceMm<0)
  throw Error('MIDCYCLE_ORIGINAL_SOURCE_AND_TOLERANCE_REQUIRED');
 const sourceGraphs=new Map(originalSources.map(r=>[r.sourceId,originalGraph(r.bytes)]));
 if([...sourceGraphs.keys()].sort().join(',')!=='S1,S2,S3')
  throw Error('MIDCYCLE_ORIGINAL_SOURCE_MEMBER_SET_REQUIRED');
 const targetGraph=originalGraph(originalTarget);
 const auditRows=new Map(),boundBySource=new Map(),targetClaims=new Map();
 for(const row of audit?.rows||[]){
  const source=sourceKey(row.sourceId,row.sourceNodeId);
  if(auditRows.has(source))throw Error('MIDCYCLE_AUDIT_REPEATED_SOURCE_NODE');
  auditRows.set(source,row);
  if(row.identityBound===true&&row.state==='BOUND'){
   const list=row.targetNodeIds||[];
   if(list.length!==1)throw Error('MIDCYCLE_AUDIT_AMBIGUOUS_BOUND_NODE');
   const target=String(list[0]);
   if(!targetClaims.has(target))targetClaims.set(target,[]);
   targetClaims.get(target).push(source);
   boundBySource.set(source,target);
  }
 }
 const globalTargetConflictIds=new Set([...targetClaims].filter(([,rows])=>rows.length>1).map(([id])=>id));
 const perSource=new Map([...sourceGraphs].map(([id,g])=>[id,[...g.adjacency.keys()]]));
 const total=[...perSource.values()].reduce((n,x)=>n+x.length,0);
 if(total!==150||auditRows.size!==150)throw Error('MIDCYCLE_CUMULATIVE_SOURCE_PHYSICAL_150_CENSUS_MISMATCH');
 const results=[];
 for(const [sourceId,ids] of perSource){
  const g=sourceGraphs.get(sourceId);
  for(const nodeId of ids){
   const key=sourceKey(sourceId,nodeId),targetId=boundBySource.get(key);
   const eligible=Boolean(targetId)&&!globalTargetConflictIds.has(targetId);
   const witnesses=[];
   if(eligible){
    for(const e of g.adjacency.get(nodeId)){
     if(e.originalLengthMm<=0)continue;
     const neighbor=other(e,nodeId),matchedTargetNeighbor=boundBySource.get(sourceKey(sourceId,neighbor));
     if(!matchedTargetNeighbor||globalTargetConflictIds.has(matchedTargetNeighbor)||matchedTargetNeighbor===targetId)continue;
     const targetPath=originalShortestPath(targetGraph,targetId,matchedTargetNeighbor);
     const lengthDeltaMm=targetPath.status==='UNIQUE_MIN_HOP_ROUTE'
      ?Math.abs(targetPath.lengthMm-e.originalLengthMm):null;
     const sourceSigned= e.from===nodeId?e.originalDirectionVector:e.originalDirectionVector.map(x=>-x);
     const vectorDeltaMm=targetPath.vectorMm?Math.hypot(...sourceSigned.map((x,i)=>x-targetPath.vectorMm[i])):null;
     const qualified=lengthDeltaMm!==null&&lengthDeltaMm<=pathTotalLengthToleranceMm;
     witnesses.push(Object.freeze({sourceElementIndex:e.index,
      sourceOriginalNodeIds:[e.from,e.to],sourceLengthMm:e.originalLengthMm,
      targetOriginalPhysicalNodes:[targetId,matchedTargetNeighbor],
      targetPathStatus:targetPath.status,
      targetElementIndices:(targetPath.edges||[]).map(x=>x.index),
      targetPathLengthMm:targetPath.lengthMm??null,
      lengthDeltaMm,vectorDeltaMm,
      sourceDisplacementVectorMm:sourceSigned,
      targetDisplacementVectorMm:targetPath.vectorMm||null,
      withinVectorTolerance:vectorDeltaMm!==null&&vectorDeltaMm<=pathTotalLengthToleranceMm,
      withinLengthTolerance:qualified,
      witnessTier:qualified?'ORIGINAL_LOCAL_ROUTE_LENGTH_COMPATIBLE_NOT_GLOBAL_IDENTITY':'NOT_QUALIFIED'}));
    }
   }
   const supported=witnesses.filter(w=>w.withinLengthTolerance);
   results.push(Object.freeze({sourcePhysicalKey:key,sourceId,sourceNodeId:nodeId,
    targetNodeId:targetId||null,
    state:!targetId?'NOT_BOUND':globalTargetConflictIds.has(targetId)?'GLOBAL_TARGET_COLLISION':
     supported.length?'LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY':'NO_ORIGINAL_ROUTE_LENGTH_WITNESS',
    independentLocalRouteWitnessCount:supported.length,
    independentLocalRouteWitnesses:supported,
    examinedNeighborCandidates:witnesses,
    globalPhysicalIdentityCertificate:false,
   }));
  }
 }
 const summary={
  schema:'CiiMidcycle150OriginalLocalRouteDiagnostics.v1',
  denominator:150,sourceMemberCounts:Object.fromEntries([...perSource].map(([id,rows])=>[id,rows.length])),
  matcherBoundNodeCount:boundBySource.size,
  globalTargetCollisionCount:globalTargetConflictIds.size,
  nodesWithLocalOriginalRouteLengthEvidence:results.filter(r=>r.state==='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY').length,
  boundNodesWithoutLocalRouteEvidence:results.filter(r=>r.state==='NO_ORIGINAL_ROUTE_LENGTH_WITNESS').length,
  boundNodesWithBothLengthAndVectorOriginalWitness:results.filter(r=>r.independentLocalRouteWitnesses.some(w=>w.withinVectorTolerance)).length,
  originalPathLengthToleranceMm:pathTotalLengthToleranceMm,
  thisIsNotGlobalPhysicalCertification:true,
  sourceMemberIdentityNotCollapsed:true,
 };
 return Object.freeze({summary,rows:Object.freeze(results)});
}
