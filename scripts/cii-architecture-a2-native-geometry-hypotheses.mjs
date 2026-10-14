/**
 * ARCH-01 A2-SHADOW-10: native-geometry, graph-conditioned transform hypotheses.
 * This is NOT independently surveyed registration or a correspondence writer.
 *
 * No Method A/B proposals, manual LOCK, Owner golden labels or existing NODE
 * identities are read to generate seeds. Deterministically enumerate bounded
 * non-collinear triangles from canonical graph signatures + positions, then
 * evaluate disjoint held-out NODEs with target geometry and topology. Keep
 * alternative rigid transforms and cap/incompleteness receipts.
 */
import {createHash} from 'node:crypto';
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const H=/^[0-9a-f]{64}$/i;
const err=k=>{throw Error('A210_'+k);};
const freeze=x=>Array.isArray(x)?Object.freeze(x.map(freeze)):x&&typeof x==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,freeze(v)]))):x;
const V=x=>{const a=Array.isArray(x)?x:[x?.x,x?.y,x?.z];return a?.length===3&&a.every(y=>typeof y==='number'&&Number.isFinite(y))?[...a]:null;};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,x)=>a.map(v=>v*x);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const unit=a=>norm(a)<1e-8?null:mul(a,1/norm(a));
const round=x=>Math.abs(x)<5e-7?0:Number(x.toFixed(6));
const DEFAULT=Object.freeze({
 maxSeedNodes:10,maxTargetCandidatesPerSeed:50,maxSourceTriples:100,
 maxTupleChecks:45000,maxTransformEvaluations:40,maxReturnedTransforms:8,
 maxHeldOutSourceNodes:32,
 triangleDistanceToleranceMm:25,minTriangleSine:0.03,
 heldOutToleranceMm:25,ambiguousDistanceGapMm:3,
 minHeldOutMatches:2,minHeldOutOutOfPlaneMm:5,minHeldOutCoverageFraction:0.9,
});
function policyOf(o={}){
 const p={...DEFAULT,...o};
 for(const [key,lo,hi] of [
 ['maxSeedNodes',3,80],['maxTargetCandidatesPerSeed',1,300],
 ['maxSourceTriples',1,5000],['maxTupleChecks',1,250000],
 ['maxTransformEvaluations',1,500],['maxReturnedTransforms',1,100],
 ['maxHeldOutSourceNodes',2,200],['triangleDistanceToleranceMm',0,10000],
 ['minTriangleSine',0.000001,1],['heldOutToleranceMm',0,5000],
 ['ambiguousDistanceGapMm',0,1000],['minHeldOutMatches',2,30],
 ['minHeldOutOutOfPlaneMm',0.000001,100000],
 ['minHeldOutCoverageFraction',0.5,1],
 ]){
  if(!Number.isFinite(p[key])||p[key]<lo||p[key]>hi
    ||(key.startsWith('max')||key==='minHeldOutMatches')&&!Number.isSafeInteger(p[key]))
    err('INVALID_POLICY_'+key);
 }
 if(p.maxReturnedTransforms>p.maxTransformEvaluations)err('RETENTION_EXCEEDS_TRIALS');
 return freeze(p);
}
function indexGraph(g,side,hash){
 if(!H.test(String(hash))||g?.side!==side||g.documentId!==side+':'+hash
  ||!(g.adjacency instanceof Map)||!Array.isArray(g.nodes)||!Array.isArray(g.edges))
  err('GRAPH_CUSTODY_'+side);
 const nodes=new Map(),sig=new Map(),edges=new Map();
 for(const n of g.nodes){
  const id=String(n.id),pos=V(n.position);
  if(!id||nodes.has(id))err('INVALID_OR_DUPLICATE_NODE_'+side);
  nodes.set(id,{id,pos});
 }
 for(const e of g.edges){
  const key=String(e.elementId);
  if(!key||edges.has(key)||!nodes.has(String(e.from))||!nodes.has(String(e.to))
    ||!(g.adjacency.get(String(e.from))||[]).some(x=>String(x.elementId)===key)
    ||!(g.adjacency.get(String(e.to))||[]).some(x=>String(x.elementId)===key))
    err('INVALID_PHYSICAL_EDGE_'+side);
  edges.set(key,e);
 }
 for(const [id,n] of nodes){
  const incident=g.adjacency.get(id)||[];
  if(incident.some(e=>!edges.has(String(e.elementId))))err('UNKNOWN_ADJACENCY_EDGE_'+side);
  if(incident.length!==g.edges.filter(e=>String(e.from)===id||String(e.to)===id).length)
   err('MISSING_ADJACENCY_EDGE_'+side);
  // OD/wall/name/process/length are revisions, not graph identity tokens.
  const kinds=incident.map(e=>String(e.componentKind)).sort(cmp);
  sig.set(id,incident.length+'|'+kinds.join('/'));
 }
 return {nodes,sig,edges,adjacency:g.adjacency,
  nativeCount:[...nodes.values()].filter(n=>n.pos).length};
}
function checkBasis({registrationAudit,geometryAudit,routeAudit,triage,reconciliation,sourceId,
 sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256}){
 if(registrationAudit?.schema!=='CiiArchitectureA209IndependentRegistration.v1'
  ||registrationAudit.status!=='BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY'
  ||registrationAudit.writerReady!==false||registrationAudit.certifiedNodeCount!==0
  ||geometryAudit?.schema!=='CiiArchitectureA208GeometryRevisionFalsifiers.v1'
  ||geometryAudit.writerReady!==false
  ||routeAudit?.schema!=='CiiArchitectureA207IslandRouteWitnesses.v1'
  ||routeAudit.writerReady!==false
  ||triage?.schema!=='CiiArchitectureA206PhysicalReviewIslands.v1'
  ||triage.writerReady!==false
  ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
  ||reconciliation.writerReady!==false)
  err('NONWRITING_A205_A209_REQUIRED');
 const custody=reconciliation.augmentedJoint?.provenance,s=String(sourceId);
 if(!custody?.originalSourceShaById?.[s]
   ||registrationAudit.provenance.sourceOriginalSha256!==custody.originalSourceShaById[s]
   ||registrationAudit.provenance.originalTargetSha256!==custody.originalTargetSha256
   ||registrationAudit.provenance.originalSourceSetSha256!==custody.sourceSetSha256
   ||registrationAudit.provenance.normalizedSourceSha256!==normalizedSourceSha256
   ||registrationAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256
   ||geometryAudit.provenance.originalSourceSetSha256!==custody.sourceSetSha256
   ||routeAudit.provenance.sourceSetSha256!==custody.sourceSetSha256
   ||triage.authority.sourceSetSha256!==custody.sourceSetSha256
   ||triage.authority.normalizedTargetSha256!==normalizedTargetSha256
   ||reconciliation.recomputedPathAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256
   ||reconciliation.recomputedPathAudit.provenance.normalizedSourceShaById?.[s]!==normalizedSourceSha256)
   err('STALE_SNAPSHOT_OR_ORIGINAL_SHA');
 return {source:indexGraph(sourceGraph,'SOURCE',normalizedSourceSha256),
   target:indexGraph(targetGraph,'TARGET',normalizedTargetSha256),custody};
}
function frame(a,b,c,minSine){
 const ab=sub(b,a),ac=sub(c,a),u=unit(ab);
 if(!u)return null;
 const v0=cross(u,ac),sin=norm(v0)/norm(ac);
 if(!Number.isFinite(sin)||sin<minSine)return null;
 const n=unit(v0),v=cross(n,u);
 return {origin:a,axes:[u,v,n],sine:sin};
}
function transform(source,target,p){
 const sf=frame(...source,p.minTriangleSine),tf=frame(...target,p.minTriangleSine);
 if(!sf||!tf)return null;
 const rot=[0,1,2].map(j=>[0,1,2].map(i=>tf.axes.reduce((s,v,k)=>s+v[j]*sf.axes[k][i],0)));
 const apply=x=>add(tf.origin,rot.map(row=>dot(row,sub(x,sf.origin))));
 const residual=source.map((x,i)=>norm(sub(apply(x),target[i])));
 return {sf,tf,rot,apply,residual};
}
function matchHeldOut(t,s,fitSourceIds,fitTargetIds,p){
 const sRows=[...s.nodes.values()].filter(x=>x.pos&&!fitSourceIds.has(x.id))
  .sort((a,b)=>cmp(a.id,b.id)).slice(0,p.maxHeldOutSourceNodes);
 const matches=[],unmatched=[],ambiguous=[],taken=new Set(fitTargetIds);
 let maxOutOfPlane=0;
 for(const n of sRows){
  const q=t.apply(n.pos),signature=s.sig.get(n.id),near=[];
  for(const candidate of t.targetRowsBySignature.get(signature)||[]){
   if(fitTargetIds.has(candidate.id)||taken.has(candidate.id))continue;
   const d=norm(sub(q,candidate.pos));
   if(d<=p.heldOutToleranceMm+1e-9)near.push({id:candidate.id,residualMm:d});
  }
  near.sort((a,b)=>a.residualMm-b.residualMm||cmp(a.id,b.id));
  if(!near.length){unmatched.push(n.id);continue;}
  if(near.length>1&&near[1].residualMm-near[0].residualMm<p.ambiguousDistanceGapMm){
   ambiguous.push({sourceNodeId:n.id,candidates:near.slice(0,4).map(x=>x.id)});
   continue;
  }
  const accepted=near[0];
  taken.add(accepted.id);
  const distanceFromFitPlane=Math.abs(dot(sub(n.pos,t.sf.origin),t.sf.axes[2]));
  maxOutOfPlane=Math.max(maxOutOfPlane,distanceFromFitPlane);
  matches.push({sourceNodeId:n.id,targetNodeId:accepted.id,residualMm:round(accepted.residualMm),
   outOfFitPlaneMm:round(distanceFromFitPlane),evidence:'DISTINCT_HELDOUT_GEOMETRIC_TOPOLOGY_NOT_SURVEY'});
 }
 return {matches,unmatched,ambiguous,maxOutOfPlaneMm:round(maxOutOfPlane),
  heldoutSourceRowsInspected:sRows.length,heldoutScanTruncated:
    [...s.nodes.values()].filter(x=>x.pos&&!fitSourceIds.has(x.id)).length>sRows.length};
}
function evaluateTriple(s,t,sNodes,tNodes,p){
 const sPositions=sNodes.map(x=>x.pos),tPositions=tNodes.map(x=>x.pos);
 const transformResult=transform(sPositions,tPositions,p);
 if(!transformResult)return null;
 const fitSource=new Set(sNodes.map(x=>x.id)),fitTarget=new Set(tNodes.map(x=>x.id));
 const held=matchHeldOut({...transformResult,targetRowsBySignature:t.bySignature},
    s,fitSource,fitTarget,p);
 const heldOutCoverageFraction=held.heldoutSourceRowsInspected>0
  ?held.matches.length/held.heldoutSourceRowsInspected:0;
 const qualified=held.matches.length>=p.minHeldOutMatches
  &&heldOutCoverageFraction>=p.minHeldOutCoverageFraction
  &&!held.heldoutScanTruncated
  &&held.maxOutOfPlaneMm>=p.minHeldOutOutOfPlaneMm;
 return {
  sourceFitNodes:sNodes.map(x=>x.id),targetFitNodes:tNodes.map(x=>x.id),
  fitResidualsMm:transformResult.residual.map(round),
  sourceTriangleSine:round(transformResult.sf.sine),
  targetTriangleSine:round(transformResult.tf.sine),
  rotationRows:transformResult.rot.map(row=>row.map(round)),
  translationMm:transformResult.rot.map((row,i)=>
    round(transformResult.tf.origin[i]-dot(row,transformResult.sf.origin))),
  heldOut:held,
  heldOutCoverageFraction:round(heldOutCoverageFraction),
  distinctHeldOutMatchedCount:held.matches.length,
  evaluation:qualified?'BOUNDED_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED':
    'INSUFFICIENT_INDEPENDENT_3D_HELDOUT_GEOMETRIC_SUPPORT',
  surveyAuthenticated:false,certified:false,writerReady:false,
 };
}
const d=(a,b)=>norm(sub(a.pos,b.pos));
export function discoverCiiA210NativeGeometryHypotheses({
 registrationAudit,geometryAudit,routeAudit,triage,reconciliation,sourceId,
 sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256,policy={},
}={}){
 const p=policyOf(policy);
 const basis=checkBasis({registrationAudit,geometryAudit,routeAudit,triage,reconciliation,sourceId,
  sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256});
 const {source,target,custody}=basis;
 const bySignature=new Map();
 for(const x of target.nodes.values())if(x.pos){
  const signature=target.sig.get(x.id);
  if(!bySignature.has(signature))bySignature.set(signature,[]);
  bySignature.get(signature).push(x);
 }
 for(const rows of bySignature.values())rows.sort((a,b)=>cmp(a.id,b.id));
 target.bySignature=bySignature;
 const domain=new Map(),seedable=[];
 const counts={nodesWithoutTopologyCompatibleTarget:0,sourceNodesWithoutNativePosition:0,
  targetDomainClipped:0,sourceSeedClipped:false,sourceTriangleClipped:false,
  tupleCheckBudgetExhausted:false,transformTrialBudgetExhausted:false,
  heldOutScanClipped:0,degenerateTrianglesRejected:0,pairDistanceRejected:0};
 for(const node of source.nodes.values()){
  if(!node.pos){counts.sourceNodesWithoutNativePosition++;continue;}
  const choices=bySignature.get(source.sig.get(node.id))||[];
  if(!choices.length){counts.nodesWithoutTopologyCompatibleTarget++;continue;}
  if(choices.length>p.maxTargetCandidatesPerSeed)counts.targetDomainClipped++;
  domain.set(node.id,choices.slice(0,p.maxTargetCandidatesPerSeed));
  seedable.push(node);
 }
 // Rare graph fingerprints rank first; no claimant source ID, node name,
 // manual LOCK, Method-A or Owner golden enters this seed list.
 seedable.sort((a,b)=>(bySignature.get(source.sig.get(a.id)).length-
   bySignature.get(source.sig.get(b.id)).length)||cmp(a.id,b.id));
 counts.sourceSeedClipped=seedable.length>p.maxSeedNodes;
 const seeds=seedable.slice(0,p.maxSeedNodes);
 const trial=[],signatures=new Set(),tripleSourceIds=[];
 for(let a=0;a<seeds.length;a++)for(let b=a+1;b<seeds.length;b++)
  for(let c=b+1;c<seeds.length;c++){
   if(tripleSourceIds.length>=p.maxSourceTriples){counts.sourceTriangleClipped=true;break;}
   const triple=[seeds[a],seeds[b],seeds[c]];
   if(!frame(...triple.map(x=>x.pos),p.minTriangleSine)){counts.degenerateTrianglesRejected++;continue;}
   tripleSourceIds.push(triple);
  }
 let tupleChecks=0,transformChecks=0,stop=false;
 for(const triplet of tripleSourceIds){
  if(stop)break;
  const [a,b,c]=triplet,ab=d(a,b),ac=d(a,c),bc=d(b,c);
  for(const A of domain.get(a.id)){
   if(stop)break;
   for(const B of domain.get(b.id)){
    if(stop)break;
    if(A.id===B.id||Math.abs(d(A,B)-ab)>p.triangleDistanceToleranceMm){
     counts.pairDistanceRejected++;continue;}
    for(const C of domain.get(c.id)){
     if(tupleChecks>=p.maxTupleChecks){counts.tupleCheckBudgetExhausted=true;stop=true;break;}
     tupleChecks++;
     if(C.id===A.id||C.id===B.id
      ||Math.abs(d(A,C)-ac)>p.triangleDistanceToleranceMm
      ||Math.abs(d(B,C)-bc)>p.triangleDistanceToleranceMm){
      counts.pairDistanceRejected++;continue;}
     if(transformChecks>=p.maxTransformEvaluations){
      counts.transformTrialBudgetExhausted=true;stop=true;break;
     }
     transformChecks++;
     const candidate=evaluateTriple(source,target,triplet,[A,B,C],p);
     if(!candidate){counts.degenerateTrianglesRejected++;continue;}
     if(candidate.heldOut.heldoutScanTruncated)counts.heldOutScanClipped++;
     const matrixKey=sha([candidate.rotationRows,candidate.translationMm]);
     if(!signatures.has(matrixKey)){
      signatures.add(matrixKey);trial.push(candidate);
     }
    }
   }
  }
 }
 trial.sort((a,b)=>b.distinctHeldOutMatchedCount-a.distinctHeldOutMatchedCount
  ||a.heldOut.ambiguous.length-b.heldOut.ambiguous.length
  ||cmp(a.sourceFitNodes.join('|'),b.sourceFitNodes.join('|'))
  ||cmp(a.targetFitNodes.join('|'),b.targetFitNodes.join('|')));
 const retained=trial.slice(0,p.maxReturnedTransforms);
 const truncated=counts.sourceSeedClipped||counts.sourceTriangleClipped
  ||counts.targetDomainClipped>0||counts.tupleCheckBudgetExhausted
  ||counts.transformTrialBudgetExhausted||trial.length>p.maxReturnedTransforms
  ||counts.heldOutScanClipped>0;
 const observedSupport=retained.filter(x=>
  x.evaluation==='BOUNDED_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED').length;
 return freeze({
  schema:'CiiArchitectureA210NativeGeometryHypotheses.v1',
  status:truncated?'BOUNDED_GEOMETRY_SEARCH_INCOMPLETE_REVIEW_ONLY':
    observedSupport?'NATIVE_GEOMETRY_HYPOTHESES_WITH_HELDOUT_REVIEW_ONLY':
    'NO_VALIDATED_TRANSFORM_IN_DECLARED_HEURISTIC_DOMAIN',
  provenance:{
   originalSourceSetSha256:custody.sourceSetSha256,
   sourceOriginalSha256:custody.originalSourceShaById[String(sourceId)],
   originalTargetSha256:custody.originalTargetSha256,
   physicalSnapshotDigest:custody.physicalOriginalSnapshotDigest,
   normalizedSourceSha256,normalizedTargetSha256,
   previousSurveyState:registrationAudit.status,
  },
  policy:p,policyDigest:sha(p),
  summary:{sourcePhysicalNodes:source.nodes.size,targetPhysicalNodes:target.nodes.size,
   sourceNativeCoordinateRows:source.nativeCount,targetNativeCoordinateRows:target.nativeCount,
   geometrySeedNodesConsidered:seeds.length,nonCollinearSourceTriplesExplored:tripleSourceIds.length,
   triangleTupleChecks:tupleChecks,rigidTransformTrials:transformChecks,
   distinctTransformHypotheses:trial.length,retainedTransformHypotheses:retained.length,
   heldOutSupportedRetainedHypotheses:observedSupport,
   candidateSearchComplete:false, // seed heuristic excludes alternative SOURCE combinations even without caps
   independentExternalSurveyPresent:false,searchLimitReached:truncated,
   ...counts},
  hypotheses:retained.map(x=>({...x,physicalIdentityAuthority:'NONE',
    candidateNodePairAdmissions:0})),
  originalManualOrAutomaticClaimsUsedAsSeeds:false,
  certifiedNodeCount:0,certifiedElementCount:0,admittedCandidateCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
  limitations:[
   'NO_INDEPENDENT_SURVEY_OR_EXTERNAL_NODE_PAIR_AUTHORITY',
   'NATIVE_SHAPE_SEEDS_DO_NOT_PROVE_TARGET_IDENTITY',
   'HOLDOUT_MATCHES_DERIVED_FROM_SAME_UNQUALIFIED_GEOMETRY_NOT_INDEPENDENT_SURVEY',
   'TOPOLOGY_SIGNATURE_AND_BOUNDS_MAY_EXCLUDE_GENUINE_GEOMETRY_REVISIONS',
   'SOURCE_TRIANGLE_AND_TARGET_CANDIDATE_SAMPLING_ARE_INCOMPLETE_BY_DESIGN',
   'REFLECTION_OR_MIRROR_SYMMETRY_NEEDS_NONCOPLANAR_HELDOUT_AND_HIGH_COVERAGE',
   'ZERO_NODE_ELEMENT_CERTIFICATIONS_ZERO_WRITER_SCOPE',
  ],
 });
}
export function assertCiiA210NoWrite(x){
 if(x?.schema!=='CiiArchitectureA210NativeGeometryHypotheses.v1')err('SCHEMA_REQUIRED');
 err('HEURISTIC_REGISTRATION_NEVER_WRITER_AUTHORITY');
}
