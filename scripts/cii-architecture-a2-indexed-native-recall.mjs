/**
 * ARCH-01 A2-SHADOW-11. Recall-oriented, component-stratified native-geometry
 * registration hypotheses. Diagnostic only; does not infer NODE identity.
 *
 * Unlike A2-10 first-N TARGET candidate domains, enumerate every original
 * TARGET EDGE of the same component kind, indexed by recorded chord length,
 * and stratify bounded retrieval across all TARGET connected components.
 * Use independently chosen third NODE + disjoint held-out NODE/EDGE evidence.
 * Geometry revision retrieval bands are NEVER correspondence acceptance bands.
 */
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const f=v=>Array.isArray(v)?Object.freeze(v.map(f)):v&&typeof v==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,f(x)]))):v;
const fail=k=>{throw Error('A211_'+k);};
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,t)=>a.map(v=>v*t),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=v=>Math.hypot(...v),dist=(a,b)=>len(sub(a,b));
const unit=x=>len(x)>1e-8?mul(x,1/len(x)):null;
const round=n=>Math.abs(n)<5e-7?0:Number(n.toFixed(6));
const P={maxSourceSeedEdges:24,maxThirdSourceNodesPerEdge:3,
 maxTargetEdgeRecordsPerSourceSeed:120,maxTriangleChecks:24000,
 maxTransformsEvaluated:100,maxReturnedHypotheses:12,
 maxHeldOutNodes:50,minHeldOutMatches:2,minHeldOutCoverageFraction:0.85,
 minHeldOutNoncoplanarMm:5,minHeldOutEdgeChecks:2,minHeldOutEdgeAgreement:0.9,
 candidateNodeToleranceMm:30,seedEdgeRetrievalBandMm:350,
 triangleCrossDistanceToleranceMm:30,minTriangleSine:0.03};
function policyOf(overrides={}){
 const p={...P,...overrides};
 for(const [key,lo,hi] of [
 ['maxSourceSeedEdges',1,500],['maxThirdSourceNodesPerEdge',1,50],
 ['maxTargetEdgeRecordsPerSourceSeed',1,10000],['maxTriangleChecks',1,300000],
 ['maxTransformsEvaluated',1,1500],['maxReturnedHypotheses',1,150],
 ['maxHeldOutNodes',2,300],['minHeldOutMatches',2,200],
 ['minHeldOutCoverageFraction',0.1,1],['minHeldOutNoncoplanarMm',0.0001,100000],
 ['minHeldOutEdgeChecks',1,300],['minHeldOutEdgeAgreement',0.1,1],
 ['candidateNodeToleranceMm',0,10000],['seedEdgeRetrievalBandMm',0,10000],
 ['triangleCrossDistanceToleranceMm',0,10000],['minTriangleSine',0.00001,1]
 ]){
  if(!Number.isFinite(p[key])||p[key]<lo||p[key]>hi||
   ((key.startsWith('max')||key==='minHeldOutMatches'||key==='minHeldOutEdgeChecks')
    &&!Number.isSafeInteger(p[key])))fail('INVALID_POLICY_'+key);
 }
 if(p.maxReturnedHypotheses>p.maxTransformsEvaluated)fail('RETENTION_EXCEEDS_TRIALS');
 return f(p);
}
function native(v){const a=Array.isArray(v)?v:[v?.x,v?.y,v?.z];return a?.length===3&&a.every(x=>typeof x==='number'&&Number.isFinite(x))?[...a]:null;}
function graph(g,side,expected){
 if(g?.side!==side||g.documentId!==side+':'+expected||!Array.isArray(g.nodes)||
   !Array.isArray(g.edges)||!(g.adjacency instanceof Map))fail('WRONG_GRAPH_SHA_'+side);
 const nodes=new Map(),edges=new Map();
 for(const n of g.nodes){const id=String(n.id);
  if(!id||nodes.has(id))fail('INVALID_NODE_'+side);
  nodes.set(id,{id,position:native(n.position)});
 }
 for(const e of g.edges){
  const id=String(e.elementId),a=String(e.from),b=String(e.to);
  if(!id||edges.has(id)||a===b||!nodes.has(a)||!nodes.has(b)
    ||!(g.adjacency.get(a)||[]).some(x=>String(x.elementId)===id)
    ||!(g.adjacency.get(b)||[]).some(x=>String(x.elementId)===id))
   fail('INVALID_EDGE_INCIDENCE_'+side);
  edges.set(id,e);
 }
 const signature=new Map();
 for(const [id,node] of nodes){
  const incident=g.adjacency.get(id)||[];
  if(incident.length!==g.edges.filter(e=>String(e.from)===id||String(e.to)===id).length)
   fail('MISSING_ADJACENCY_'+side);
  signature.set(id,incident.length+'|'+incident.map(e=>String(e.componentKind)).sort(cmp).join('/'));
 }
 const componentByNode=new Map(),components=[];
 for(const start of [...nodes.keys()].sort(cmp)){
  if(componentByNode.has(start))continue;
  const current=String(components.length+1),queue=[start],list=[];
  componentByNode.set(start,current);
  for(let i=0;i<queue.length;i++){
   const n=queue[i];list.push(n);
   for(const e of g.adjacency.get(n)||[]){
    const other=String(e.from)===n?String(e.to):String(e.from);
    if(!componentByNode.has(other)){componentByNode.set(other,current);queue.push(other);}
   }
  }
  components.push({id:current,nodes:list.sort(cmp)});
 }
 for(const [id,e] of edges){
  if(componentByNode.get(String(e.from))!==componentByNode.get(String(e.to)))
   fail('EDGE_ACROSS_DISJOINT_COMPONENTS_'+side);
 }
 return {nodes,edges,adjacency:g.adjacency,signature,componentByNode,components,
  positionCount:[...nodes.values()].filter(n=>n.position).length};
}
function validate(input){
 const {baseline,registrationAudit,sourceGraph,targetGraph,sourceId,
  normalizedSourceSha256,normalizedTargetSha256}=input;
 if(baseline?.schema!=='CiiArchitectureA210NativeGeometryHypotheses.v1'
  ||baseline.writerReady!==false||baseline.certifiedNodeCount!==0
  ||baseline.certifiedElementCount!==0||baseline.admittedCandidateCount!==0
  ||registrationAudit?.schema!=='CiiArchitectureA209IndependentRegistration.v1'
  ||registrationAudit.status!=='BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY'
  ||registrationAudit.writerReady!==false)fail('NONWRITING_A210_SURVEY_BLOCK_REQUIRED');
 if(baseline.provenance.sourceOriginalSha256!==registrationAudit.provenance.sourceOriginalSha256
  ||baseline.provenance.originalSourceSetSha256!==registrationAudit.provenance.originalSourceSetSha256
  ||baseline.provenance.originalTargetSha256!==registrationAudit.provenance.originalTargetSha256
  ||baseline.provenance.normalizedSourceSha256!==normalizedSourceSha256
  ||baseline.provenance.normalizedTargetSha256!==normalizedTargetSha256
  ||baseline.provenance.previousSurveyState!==registrationAudit.status
  ||baseline.summary.sourcePhysicalNodes!==sourceGraph.nodes.length
  ||baseline.summary.targetPhysicalNodes!==targetGraph.nodes.length)
   fail('A210_PROVENANCE_OR_CENSUS_STALE');
 return {source:graph(sourceGraph,'SOURCE',normalizedSourceSha256),
  target:graph(targetGraph,'TARGET',normalizedTargetSha256)};
}
function frame(a,b,c,minSine){
 const u=unit(sub(b,a)),v0=u&&cross(u,sub(c,a));
 const h=v0&&len(v0)/Math.max(len(sub(c,a)),1e-10);
 if(!u||!v0||!h||h<minSine)return null;
 const n=unit(v0);return {origin:a,axes:[u,cross(n,u),n],sine:h};
}
function rigid(source,target,p){
 const s=frame(...source,p.minTriangleSine),t=frame(...target,p.minTriangleSine);
 if(!s||!t)return null;
 const matrix=[0,1,2].map(j=>[0,1,2].map(i=>t.axes.reduce(
  (sum,axis,k)=>sum+axis[j]*s.axes[k][i],0)));
 const project=x=>add(t.origin,matrix.map(row=>dot(row,sub(x,s.origin))));
 const residuals=source.map((x,i)=>round(dist(project(x),target[i])));
 return {s,t,matrix,project,residuals};
}
function targetEdgeIndex(target){
 const byKind=new Map();
 for(const e of target.edges.values()){
  const a=target.nodes.get(String(e.from)),b=target.nodes.get(String(e.to));
  if(!a.position||!b.position)continue;
  const kind=String(e.componentKind);
  if(!byKind.has(kind))byKind.set(kind,[]);
  byKind.get(kind).push({id:String(e.elementId),from:a,to:b,
   length:dist(a.position,b.position),
   component:target.componentByNode.get(a.id),kind});
 }
 for(const rows of byKind.values())rows.sort((a,b)=>a.length-b.length||cmp(a.id,b.id));
 return byKind;
}
function selectEdges(source,p){
 const byCompKind=new Map();
 for(const e of source.edges.values()){
  const a=source.nodes.get(String(e.from)),b=source.nodes.get(String(e.to));
  if(!a.position||!b.position)continue;
  const k=source.componentByNode.get(a.id)+'|'+String(e.componentKind);
  if(!byCompKind.has(k))byCompKind.set(k,[]);
  byCompKind.get(k).push({id:String(e.elementId),a,b,
    kind:String(e.componentKind),length:dist(a.position,b.position),
    component:source.componentByNode.get(a.id)});
 }
 for(const rows of byCompKind.values())rows.sort((a,b)=>cmp(a.id,b.id));
 const active=[...byCompKind].sort((a,b)=>a[1].length-b[1].length||cmp(a[0],b[0]))
  .map(([key,values])=>({key,values,idx:0}));
 const out=[];
 while(out.length<p.maxSourceSeedEdges&&active.some(x=>x.idx<x.values.length)){
  for(const lane of active){
   if(out.length>=p.maxSourceSeedEdges)break;
   if(lane.idx<lane.values.length)out.push(lane.values[lane.idx++]);
  }
 }
 const all=active.reduce((sum,x)=>sum+x.values.length,0);
 return {edges:out,eligibleSourceEdges:all,clipped:out.length<all};
}
function thirds(source,edge,p){
 const nodes=[...source.nodes.values()].filter(n=>n.position
  &&source.componentByNode.get(n.id)===edge.component
  &&n.id!==edge.a.id&&n.id!==edge.b.id);
 const ab=sub(edge.b.position,edge.a.position);
 const ranked=nodes.map(n=>({
  ...n,sine:len(cross(ab,sub(n.position,edge.a.position)))/
   Math.max(len(ab)*dist(n.position,edge.a.position),1e-9)
 })).filter(n=>n.sine>=p.minTriangleSine)
  .sort((a,b)=>b.sine-a.sine||cmp(a.id,b.id));
 return {items:ranked.slice(0,p.maxThirdSourceNodesPerEdge),clipped:ranked.length>p.maxThirdSourceNodesPerEdge};
}
function stratify(edges,max){
 const byComponent=new Map();
 for(const edge of edges){
  if(!byComponent.has(edge.component))byComponent.set(edge.component,[]);
  byComponent.get(edge.component).push(edge);
 }
 for(const rows of byComponent.values())rows.sort((a,b)=>a.length-b.length||cmp(a.id,b.id));
 const lanes=[...byComponent].sort((a,b)=>cmp(a[0],b[0]))
  .map(([component,rows])=>({component,rows,idx:0}));
 const selected=[];
 while(selected.length<max&&lanes.some(x=>x.idx<x.rows.length)){
  for(const lane of lanes){
   if(selected.length>=max)break;
   if(lane.idx<lane.rows.length)selected.push(lane.rows[lane.idx++]);
  }
 }
 return {selected,scannedComponents:lanes.length,selectedComponents:new Set(selected.map(x=>x.component)).size,
  truncated:edges.length>selected.length,fullOriginalMatchingEdges:edges.length};
}
function heldout(r,source,target,seedSrc,seedTgt,p){
 const fitIds=new Set(seedSrc.map(x=>x.id)),reserved=new Set(seedTgt.map(x=>x.id));
 const all=[...source.nodes.values()].filter(x=>x.position&&!fitIds.has(x.id)).sort((a,b)=>cmp(a.id,b.id));
 const attempts=all.slice(0,p.maxHeldOutNodes),assigned=new Map(seedSrc.map((x,i)=>[x.id,seedTgt[i].id]));
 const retained=[],ambiguous=[],unmatched=[];
 let maxPlaneDistance=0;
 for(const node of attempts){
  const guess=r.project(node.position),candidates=[];
  for(const targetNode of target.nodes.values()){
   if(!targetNode.position||reserved.has(targetNode.id)
    ||target.signature.get(targetNode.id)!==source.signature.get(node.id))continue;
   const delta=dist(targetNode.position,guess);
   if(delta<=p.candidateNodeToleranceMm)candidates.push({id:targetNode.id,delta});
  }
  candidates.sort((a,b)=>a.delta-b.delta||cmp(a.id,b.id));
  if(!candidates.length){unmatched.push(node.id);continue;}
  if(candidates.length>1&&candidates[1].delta-candidates[0].delta<=1e-6){
   ambiguous.push({sourceNode:node.id,targetCandidates:candidates.slice(0,4).map(x=>x.id)});continue;
  }
  const best=candidates[0];reserved.add(best.id);assigned.set(node.id,best.id);
  const plane=Math.abs(dot(sub(node.position,r.s.origin),r.s.axes[2]));
  maxPlaneDistance=Math.max(maxPlaneDistance,plane);
  retained.push({sourceNode:node.id,targetNode:best.id,residualMm:round(best.delta),outOfPlaneMm:round(plane)});
 }
 let edgeChecks=0,edgeAgrees=0;
 for(const edge of source.edges.values()){
  const a=String(edge.from),b=String(edge.to);
  if(!assigned.has(a)||!assigned.has(b)||fitIds.has(a)&&fitIds.has(b))continue;
  edgeChecks++;
  const ta=assigned.get(a),tb=assigned.get(b);
  if((target.adjacency.get(ta)||[]).some(e=>
   (String(e.from)===ta&&String(e.to)===tb||String(e.from)===tb&&String(e.to)===ta)
    &&String(e.componentKind)===String(edge.componentKind)))edgeAgrees++;
 }
 const coverage=attempts.length?retained.length/attempts.length:0;
 const agreement=edgeChecks?edgeAgrees/edgeChecks:0;
 const supported=retained.length>=p.minHeldOutMatches
  &&coverage>=p.minHeldOutCoverageFraction
  &&maxPlaneDistance>=p.minHeldOutNoncoplanarMm
  &&edgeChecks>=p.minHeldOutEdgeChecks
  &&agreement>=p.minHeldOutEdgeAgreement
  &&all.length===attempts.length;
 return {supported,heldOutNodeMatches:retained.length,
  sourceNodesHeldOut:attempts.length,heldOutTotalClipped:all.length>attempts.length,
  heldOutCoverageFraction:round(coverage),
  maxHeldOutOutOfPlaneMm:round(maxPlaneDistance),
  heldOutEdgesChecked:edgeChecks,heldOutEdgesCompatible:edgeAgrees,
  heldOutEdgeAgreementFraction:round(agreement),ambiguousSourceNodes:ambiguous,
  missingSourceNodes:unmatched,examples:retained.slice(0,20)};
}
export function exploreCiiA211IndexedNativeGeometry({
 baseline,registrationAudit,sourceGraph,targetGraph,sourceId,
 normalizedSourceSha256,normalizedTargetSha256,policy={},
}={}){
 const p=policyOf(policy);const {source,target}=validate({baseline,registrationAudit,sourceGraph,targetGraph,sourceId,
   normalizedSourceSha256,normalizedTargetSha256});
 const index=targetEdgeIndex(target),selection=selectEdges(source,p);
 const reports=[],hypotheses=[],seen=new Set();
 let triangles=0,transformTrials=0,targetEdgeMatches=0,sourceThirdClipped=0,edgeCapped=0,
  sourceSeedUnavailable=0,geometryRejected=0,goodRigidTriangles=0,stopped=false;
 const targetComponentsSeen=new Set();
 for(const seed of selection.edges){
  if(stopped)break;
  const matching=(index.get(seed.kind)||[]).filter(e=>Math.abs(e.length-seed.length)<=p.seedEdgeRetrievalBandMm);
  targetEdgeMatches+=matching.length;
  const pool=stratify(matching,p.maxTargetEdgeRecordsPerSourceSeed);
  edgeCapped+=pool.truncated?1:0;
  for(const e of pool.selected)targetComponentsSeen.add(e.component);
  const sourceThird=thirds(source,seed,p);
  if(sourceThird.clipped)sourceThirdClipped++;
  if(!sourceThird.items.length){sourceSeedUnavailable++;continue;}
  for(const candidate of pool.selected){
   if(stopped)break;
   for(const orientation of [0,1]){
    if(stopped)break;
    const TA=orientation?candidate.to:candidate.from,TB=orientation?candidate.from:candidate.to;
    for(const C of sourceThird.items){
     if(stopped)break;
     const triSrc=[seed.a,seed.b,C],srcAC=dist(seed.a.position,C.position),
       srcBC=dist(seed.b.position,C.position);
     for(const TC of target.components.find(x=>x.id===candidate.component).nodes){
      if(triangles>=p.maxTriangleChecks||transformTrials>=p.maxTransformsEvaluated){
       stopped=true;break;
      }
      if(TC===TA.id||TC===TB.id)continue;
      const tnode=target.nodes.get(TC);
      if(!tnode?.position||target.signature.get(TC)!==source.signature.get(C.id))continue;
      triangles++;
      if(Math.abs(dist(TA.position,tnode.position)-srcAC)>p.triangleCrossDistanceToleranceMm
       ||Math.abs(dist(TB.position,tnode.position)-srcBC)>p.triangleCrossDistanceToleranceMm){
       geometryRejected++;continue;
      }
      const triTgt=[TA,TB,tnode];
      const fitted=rigid(triSrc.map(x=>x.position),triTgt.map(x=>x.position),p);
      if(!fitted){geometryRejected++;continue;}
      if(Math.max(...fitted.residuals)>p.candidateNodeToleranceMm){
       geometryRejected++;continue;}
      goodRigidTriangles++;transformTrials++;
      const key=hash([fitted.matrix.map(x=>x.map(round)),
       fitted.matrix.map((row,i)=>round(fitted.t.origin[i]-dot(row,fitted.s.origin)))]);
      if(seen.has(key))continue;seen.add(key);
      const quality=heldout(fitted,source,target,triSrc,triTgt,p);
      hypotheses.push({
       sourceSeedElementId:seed.id,targetSeedElementId:candidate.id,
       sourceTriangleNodeIds:triSrc.map(x=>x.id),targetTriangleNodeIds:triTgt.map(x=>x.id),
       targetComponentId:candidate.component,
       seedEdgeLengthDeltaMm:round(Math.abs(seed.length-candidate.length)),
       seedEdgeRevisionSensitivityOnly:Math.abs(seed.length-candidate.length)>p.candidateNodeToleranceMm,
       fitResidualsMm:fitted.residuals,rotationRows:fitted.matrix.map(x=>x.map(round)),
       translationMm:fitted.matrix.map((row,i)=>round(fitted.t.origin[i]-dot(row,fitted.s.origin))),
       heldOut:quality,reviewStatus:quality.supported?'GEOMETRY_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED':
        'UNQUALIFIED_RETRIEVED_GEOMETRY_HYPOTHESIS',
       externallySurveyed:false,certified:false,writerReady:false,canBindScope:false,
      });
     }
    }
   }
  }
  reports.push({
   sourceSeedElementId:seed.id,sourceComponentId:seed.component,sourceKind:seed.kind,
   sourceRecordedChordMm:round(seed.length),
   targetSameKindEdgesWithinRetrievalBand:matching.length,
   targetComponentsWithMatchingEdges:new Set(matching.map(e=>e.component)).size,
   targetEdgeCandidatesSelected:pool.selected.length,
   targetComponentCoverageInSample:pool.selectedComponents,
   targetEdgeCandidateLimitReached:pool.truncated,
   independentThirdSourceNodeCount:sourceThird.items.length,
  });
 }
 hypotheses.sort((a,b)=>Number(b.heldOut.supported)-Number(a.heldOut.supported)
  ||b.heldOut.heldOutEdgesCompatible-a.heldOut.heldOutEdgesCompatible
  ||b.heldOut.heldOutNodeMatches-a.heldOut.heldOutNodeMatches
  ||cmp(a.sourceSeedElementId,b.sourceSeedElementId)||cmp(a.targetSeedElementId,b.targetSeedElementId));
 const retained=hypotheses.slice(0,p.maxReturnedHypotheses);
 const clipped=stopped||selection.clipped||edgeCapped>0||sourceThirdClipped>0||
   hypotheses.length>retained.length||retained.some(x=>x.heldOut.heldOutTotalClipped);
 return f({
  schema:'CiiArchitectureA211IndexedNativeGeometry.v1',
  status:clipped?'RECALL_INDEXED_SEARCH_INCOMPLETE_REVIEW_ONLY':
    'RECALL_INDEXED_SAMPLED_EVIDENCE_REVIEW_ONLY',
  provenance:{
   originalSourceSetSha256:baseline.provenance.originalSourceSetSha256,
   sourceOriginalSha256:baseline.provenance.sourceOriginalSha256,
   originalTargetSha256:baseline.provenance.originalTargetSha256,
   normalizedSourceSha256,normalizedTargetSha256,
   sourceId:String(sourceId),precedingA210PolicyDigest:baseline.policyDigest,
   previousExternalSurveyState:registrationAudit.status,
  },
  policy:p,policyDigest:hash(p),
  summary:{
   sourceNativeCoordinateNodes:source.positionCount,
   targetNativeCoordinateNodes:target.positionCount,
   sourceEligiblePhysicalEdges:selection.eligibleSourceEdges,
   sourceSeedEdgesSelected:selection.edges.length,
   sourceEdgeSeedLimitReached:selection.clipped,
   targetConnectedComponents:target.components.length,
   targetComponentsSampled:targetComponentsSeen.size,
   targetSameKindChordEdgesWithinRetrievalBand:targetEdgeMatches,
   sourceSeedEdgesWithTargetCandidateCapping:edgeCapped,
   sourceSeedEdgesWithThirdNodeCapping:sourceThirdClipped,
   sourceSeedEdgesLackingNoncollinearThirdNode:sourceSeedUnavailable,
   targetTriangleChecks:triangles,
   sourceTargetTriangleMetricFailures:geometryRejected,
   geometricallyViableRigidTriangles:goodRigidTriangles,
   rigidTransformTrials:transformTrials,
   distinctRigidTransforms:hypotheses.length,retainedTransformHypotheses:retained.length,
   heldOutTopologySupportedRetained:retained.filter(x=>x.heldOut.supported).length,
   searchBudgetExhausted:stopped,
   searchComplete:false, // stratified source edge & third selection never exhaustive
  },
  sourceSeedRetrievalReports:reports,
  hypotheses:retained,previousA210TransformTrials:baseline.summary.rigidTransformTrials,
  originalManualOrAutoAnchorsAsSeeds:false,
  admittedCandidateCount:0,certifiedNodeCount:0,certifiedElementCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
  limitations:[
   'INDEXED_TARGET_EDGE_RETRIEVAL_IMPROVES_RECALL_NOT_INDEPENDENT_IDENTITY',
   'RETRIEVAL_BAND_IS_NOT_PHYSICAL_CORRESPONDENCE_TOLERANCE',
   'EXACT_EDGE_SEED_MATCHING_MAY_MISS_SUBDIVISION_OR_GEOMETRY_REVISIONS',
   'SOURCE_EDGE_AND_THIRD_NODE_STRATIFICATION_NOT_EXHAUSTIVE',
   'NATIVE_HELDOUT_GEOMETRY_NOT_EXTERNALLY_SURVEYED',
   'MIRROR_SYMMETRY_AND_COMPETING_COMPONENTS_REMAIN_UNCERTIFIED',
   'NO_ADMISSION_TO_A2_02_A2_03_OR_ANY_WRITER',
  ],
 });
}
export function assertCiiA211NoWrite(report){
 if(report?.schema!=='CiiArchitectureA211IndexedNativeGeometry.v1')fail('SCHEMA_REQUIRED');
 fail('INDEXED_RECALL_EVIDENCE_NEVER_WRITER_AUTHORITY');
}
