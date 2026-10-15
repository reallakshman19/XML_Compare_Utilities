/**
 * ARCH-01 F2: immutable joint MANUAL + Method A/B seed evidence.
 *
 * This is the first production-facing, browser-safe diagnostic consumer of both
 * retained lanes. In particular it DOES NOT change the existing per-source
 * active lane, correspondence, review decisions, Transfer Preview or Writer.
 * A unique asserted NODE pair is not proof of independent physical identity.
 */
import { buildCiiSelectedBaseLoops } from './cii-workspace-base-loop-selection.js';
import { deepFreeze } from './cii-workspace-contracts.js';

const id=v=>String(v??'').trim();
const sort=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const uniq=x=>[...new Set(x)].sort(sort);
const pick=(store,key)=>store instanceof Map?store.get(key):store?.[key];
const graphNodes=g=>new Set((g?.nodes||[]).map(x=>id(x.id||x.nodeId)).filter(Boolean));
const graphEdges=g=>(g?.edges||[]).filter(x=>x.from!=null&&x.to!=null);
const SHA=/^[a-f0-9]{64}$/i;
function realSha(value,name){
 if(!SHA.test(id(value)))throw new Error('F2_JOINT_ORIGINAL_SHA_INVALID:'+name);
 return id(value);
}
function incident(g){
 const map=new Map();
 for(const edge of graphEdges(g))for(const endpoint of [edge.from,edge.to]){
  const n=id(endpoint);if(!map.has(n))map.set(n,[]);
  map.get(n).push(edge);
 }
 return map;
}
function compatiblePath(source,targetEdges,sourceGraph,targetGraph,toleranceMm=25,maxSegments=4){
 // Advisory only. The validated ARC-01 solver, not this local witness, must
 // adjudicate global orientation, survey revision and shared element custody.
 const sourceKind=id(source.componentKind||'PIPE'),sourceLength=Number(source.lengthMm||0);
 if(!Number.isFinite(sourceLength)||sourceLength<=0)return [];
 const start=id(targetEdges[0]),end=id(targetEdges[1]);
 const targetAdj=incident(targetGraph),witnesses=[];
 const queue=[{node:start,nodes:[start],edges:[],length:0}],visitLimit=400,seen=new Set();
 let count=0;
 while(queue.length&&count++<visitLimit){
  const path=queue.shift();
  if(path.node===end&&path.edges.length){
   const delta=Math.abs(sourceLength-path.length);
   const isDirect=path.edges.length===1;
   const purePipe=sourceKind==='PIPE'&&path.edges.every(e=>id(e.componentKind||'PIPE')==='PIPE');
   const internalDegreeTwo=path.nodes.slice(1,-1).every(n=>(targetAdj.get(n)||[]).length===2);
   const sameKind=isDirect?sourceKind===id(path.edges[0].componentKind||'PIPE'):purePipe;
   if(delta<=toleranceMm&&sameKind&&internalDegreeTwo){
    witnesses.push(deepFreeze({
      relation:isDirect?'ELEMENT_1_TO_1':'PIPE_SUBDIVISION_PATH',
      targetElementIds:deepFreeze(path.edges.map(e=>id(e.elementId))),
      targetNodePath:deepFreeze([...path.nodes]),lengthDifferenceMm:Number(delta.toFixed(6)),
    }));
   }
   continue;
  }
  if(path.edges.length>=maxSegments)continue;
  for(const edge of targetAdj.get(path.node)||[]){
   const next=id(id(edge.from)===path.node?edge.to:edge.from);
   if(path.nodes.includes(next))continue;
   if(path.edges.length&&sourceKind!=='PIPE')continue;
   const step=Number(edge.lengthMm||0);
   if(!Number.isFinite(step)||step<=0||path.length+step>sourceLength+toleranceMm)continue;
   queue.push({node:next,nodes:[...path.nodes,next],edges:[...path.edges,edge],length:path.length+step});
  }
 }
 return {witnesses:deepFreeze(witnesses.slice(0,8)),
  searchIncomplete:queue.length>0||count>=visitLimit||witnesses.length>8};
}
export function buildCiiJointAuthorityEvidence({
 inspection,preparedSession,selectedBySource,manualBySource,activeModeBySource,
 originalSourceSetSha256,originalTargetSha256,spatialToleranceMm=100,
}={}){
 realSha(originalSourceSetSha256,'SOURCE_SET');
 realSha(originalTargetSha256,'TARGET');
 if(!inspection?.memberInspections?.length||!preparedSession?.members?.length||!preparedSession?.target?.targetGraph)
  throw new Error('F2_JOINT_PREPARED_PHYSICAL_MODELS_REQUIRED');
 const targetGraph=preparedSession.target.targetGraph,targetIds=graphNodes(targetGraph);
 const byMember=new Map(preparedSession.members.map(m=>[id(m.sourceId),m]));
 const claims=[],memberSummary=[],allNodes=new Set();
 for(const m of inspection.memberInspections){
  const memberId=id(m.sourceId),physical=byMember.get(memberId);
  if(!memberId||!physical?.sourceGraph)throw new Error('F2_JOINT_SOURCE_MEMBER_GRAPH_MISSING:'+memberId);
  const graph=physical.sourceGraph,nodeIds=graphNodes(graph);
  const selected=pick(selectedBySource,memberId)||[];
  const loops=buildCiiSelectedBaseLoops(m.inspection?.baseAnchorSuggestions||[],selected);
  const manual=pick(manualBySource,memberId)||[];
  if(!Array.isArray(manual))throw new Error('F2_JOINT_MANUAL_PAIR_LEDGER_INVALID:'+memberId);
  let retainedManual=0,retainedAuto=0;
  const add=(pair,lane,authority)=>{
   const sourceNodeId=id(pair?.sourceNodeId),targetNodeId=id(pair?.targetNodeId);
   if(!nodeIds.has(sourceNodeId)||!targetIds.has(targetNodeId))
    throw new Error('F2_JOINT_PHYSICAL_NODE_NOT_FOUND:'+memberId+':'+sourceNodeId+'=>'+targetNodeId);
   claims.push(deepFreeze({sourceId:memberId,sourceNodeId,targetNodeId,lane,authority,
     sourceNodeKey:memberId+':'+sourceNodeId,
     originalSourceSha256:realSha(physical.originalSha256,'SOURCE:'+memberId),
     originalTargetSha256}));
  };
  for(const loop of loops)for(const p of loop.anchorPairs||[]){
   add(p,'AUTO',id(loop.loopId||loop.baseId||loop.method));
   retainedAuto++;
  }
  for(const p of manual){add(p,'MANUAL','USER_REVIEWED_ANCHOR');retainedManual++;}
  for(const node of nodeIds)allNodes.add(memberId+':'+node);
  memberSummary.push(deepFreeze({
    sourceId:memberId,physicalSourceNodes:nodeIds.size,retainedAutomaticBases:loops.length,
    retainedAutomaticPairs:retainedAuto,retainedManualPairs:retainedManual,
    activeMode:id(pick(activeModeBySource,memberId)|| (manual.length?'MANUAL':'AUTO')),
  }));
 }
 const group=new Map(),targets=new Map();
 for(const c of claims){
  if(!group.has(c.sourceNodeKey))group.set(c.sourceNodeKey,[]);
  group.get(c.sourceNodeKey).push(c);
  if(!targets.has(c.targetNodeId))targets.set(c.targetNodeId,new Set());
  targets.get(c.targetNodeId).add(c.sourceNodeKey);
 }
 const rows=[];
 for(const key of [...allNodes].sort(sort)){
  const evidence=group.get(key)||[],targetOptions=uniq(evidence.map(x=>x.targetNodeId));
  const multiTarget=targetOptions.length>1;
  const custody=targetOptions.filter(t=>(targets.get(t)?.size||0)>1);
  const reasons=[
   ...(multiTarget?['MANUAL_AUTO_OR_BASE_TARGET_DISAGREEMENT']:[]),
   ...(custody.length?['SHARED_TARGET_NODE_CUSTODY']:[]),
  ];
  rows.push(deepFreeze({
   sourceNodeKey:key,sourceId:key.split(':')[0],sourceNodeId:key.slice(key.indexOf(':')+1),
   targets:deepFreeze(targetOptions),
   state:reasons.length?'CONFLICT':targetOptions.length?'SEED_HYPOTHESIS_ONLY':'UNSEEDED',
   reasons:deepFreeze(reasons),
   evidence:deepFreeze(evidence.slice().sort((a,b)=>sort(a.lane,b.lane)||sort(a.targetNodeId,b.targetNodeId))),
   certified:false,
  }));
 }
 // For any physical SOURCE ELEMENT whose endpoints BOTH have exactly one
 // uncontested hypothesis, seek bounded direct/PIPE-only adjacency witnesses.
 // No path witness is ever promoted to a NODE correspondence or mutation.
 const lookup=new Map(rows.map(row=>[row.sourceNodeKey,row]));
 const elementRows=[],limit=5000;
 for(const member of preparedSession.members){
  const memberId=id(member.sourceId);
  for(const edge of graphEdges(member.sourceGraph).slice(0,limit)){
   const a=lookup.get(memberId+':'+id(edge.from)),b=lookup.get(memberId+':'+id(edge.to));
   let state='NO_UNCONTESTED_TWO_ENDPOINTS',witnesses=[],searchIncomplete=false;
   if(a?.state==='SEED_HYPOTHESIS_ONLY'&&b?.state==='SEED_HYPOTHESIS_ONLY'){
    const result=compatiblePath(edge,[a.targets[0],b.targets[0]],member.sourceGraph,targetGraph);
    witnesses=result.witnesses;searchIncomplete=result.searchIncomplete;
    state=searchIncomplete?'BOUNDED_SEARCH_INCOMPLETE':
      witnesses.length===1?'LOCAL_PATH_WITNESS_ONLY':
      witnesses.length>1?'MULTIPLE_PHYSICAL_PATHS':'NO_BOUNDED_COMPATIBLE_PATH';
   }
   elementRows.push(deepFreeze({sourceId:memberId,sourceElementId:id(edge.elementId),
    sourceEndpoints:deepFreeze([id(edge.from),id(edge.to)]),state,
    witnesses:deepFreeze(witnesses),searchIncomplete}));
  }
 }
 const conflicts=rows.filter(x=>x.state==='CONFLICT');
 return deepFreeze({
  schema:'CiiJointAuthorityEvidence.v1',status:'SHADOW_NON_WRITING',
  originalSourceSetSha256,originalTargetSha256,appliedM1SpatialToleranceMm:Number(spatialToleranceMm),
  rows:deepFreeze(rows),elementRows:deepFreeze(elementRows),memberSummary:deepFreeze(memberSummary),
  summary:deepFreeze({originalPhysicalSourceNodes:rows.length,
   sourceNodesWithAtLeastOneSeedHypothesis:rows.filter(x=>x.targets.length>0).length,
   unseededPhysicalSourceNodes:rows.filter(x=>x.state==='UNSEEDED').length,
   competingSourceNodes:conflicts.length,
   localPathWitnessRows:elementRows.filter(x=>x.state==='LOCAL_PATH_WITNESS_ONLY').length,
   unresolvedElementConstraints:elementRows.filter(x=>x.state!=='LOCAL_PATH_WITNESS_ONLY').length}),
  conflicts:deepFreeze(conflicts),writerDispatchInstalled:false,
  independentlyCertifiedNodes:0,independentlyCertifiedElements:0,
  transferPlan:null,writeScope:null,writerReady:false,
  limitations:deepFreeze([
   'UNIQUE_SEED_HYPOTHESIS_IS_NOT_INDEPENDENT_PHYSICAL_IDENTITY',
   'LOCAL_PATH_WITNESS_IS_NOT_GLOBAL_ASSIGNMENT_OR_CERTIFICATE',
   'BOUNDED_SEARCH_CANNOT_PROVE_NO_UNSEEN_TARGET_PATH',
   'NO_AUTO_MANUAL_AUTHORITY_PROMOTION',
   'NO_WRITER_PERMISSIONS',
  ]),
 });
}
export function ciiJointAuthorityEvidenceMarkup(report,escape){
 if(!report)return '';
 const e=escape||((v)=>String(v??''));
 const s=report.summary;
 const conflicts=report.conflicts.slice(0,20).map(row=>'<tr><td>'+e(row.sourceNodeKey)+'</td><td>'+
  e(row.evidence.filter(x=>x.lane==='MANUAL').map(x=>x.targetNodeId).join(', ')||'—')+
  '</td><td>'+e(row.evidence.filter(x=>x.lane==='AUTO').map(x=>x.targetNodeId).join(', ')||'—')+
  '</td><td>'+e(row.reasons.join('; '))+'</td></tr>').join('');
 return '<section data-ciiw-f2-joint-review="1"><h3>Joint authority evidence — read-only</h3>'+
  '<p>All retained manual and automatic base claims are considered together here. The current Compare and Writer authority is NOT changed. No TARGET identity is certified by a better score or more candidates.</p>'+
  '<p><b>'+s.originalPhysicalSourceNodes+'</b> original SOURCE NODEs · <b>'+s.sourceNodesWithAtLeastOneSeedHypothesis+
  '</b> with retained seed hypothesis · <b>'+s.unseededPhysicalSourceNodes+
  '</b> unseeded · <b>'+s.competingSourceNodes+' conflicting</b> · <b>'+s.localPathWitnessRows+
  '</b> local physical path witnesses (not certified)</p>'+
  (conflicts?'<table class="ciiw-grid"><thead><tr><th>SOURCE</th><th>Manual TARGET</th><th>Automatic TARGET</th><th>Why REVIEW</th></tr></thead><tbody>'+conflicts+'</tbody></table>':
   '<p>No conflicting retained seeds were found; this does not establish global graph completeness.</p>')+
  '<small>Diagnostic: original SHA-bound seed and bounded path evidence only. Never authorizes Transfer Preview or Writer.</small></section>';
}
