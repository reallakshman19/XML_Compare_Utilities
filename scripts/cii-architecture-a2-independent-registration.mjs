/**
 * ARCH-01 / A2-SHADOW-09 — survey-qualified 3D rigid registration falsifier.
 *
 * Native NODE position is not inherently an independent coordinate survey.
 * No prior Method-A/manual/automatic correspondence may seed the fit.
 * Only independently reviewed fit and *different* held-out evidence is read.
 * Even a geometrically valid fit is never a physical identity certificate.
 * No Writer1/2 imports; no mutation plan or code path.
 */
import { createHash } from 'node:crypto';
const SHA=/^[0-9a-f]{64}$/i;
const str=x=>String(x??'').trim();
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=c=>{throw Error('A209_'+c);};
const freeze=v=>Array.isArray(v)?Object.freeze(v.map(freeze)):v&&typeof v==='object'
  ?Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)]))):v;
const vec3=x=>{
  const a=Array.isArray(x)?x:[x?.x,x?.y,x?.z];
  return a.length===3&&a.every(v=>typeof v==='number'&&Number.isFinite(v))?[...a]:null;
};
const sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b)=>a.map((x,i)=>x+b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const mul=(a,n)=>a.map(x=>x*n);
const unit=a=>norm(a)>1e-12?mul(a,1/norm(a)):null;
const rounded=x=>Math.abs(x)<0.0000005?0:Number(x.toFixed(6));
const id=x=>str(x);
const policyDefaults={maxFitAnchorTriangleEdgeMm:1000000,minTriangleSine:0.01,
  maxFitAnchorResidualMm:1,maxHeldOutResidualMm:5,minHeldOut:2,maxPairs:20};
function policyOf(o={}){
  const p={...policyDefaults,...o};
  for(const [k,min,max] of [
    ['maxFitAnchorTriangleEdgeMm',1,100000000],
    ['minTriangleSine',1e-6,1],['maxFitAnchorResidualMm',0,100000],
    ['maxHeldOutResidualMm',0,100000],['minHeldOut',2,10],['maxPairs',5,100],
  ]){
    if(!Number.isFinite(p[k])||p[k]<min||p[k]>max||(k.startsWith('minHeld')||k==='maxPairs')&&!Number.isSafeInteger(p[k]))
      fail('INVALID_POLICY_'+k);
  }
  return freeze(p);
}
function graph(g,side,normalized){
  if(!SHA.test(str(normalized))||g?.side!==side||g.documentId!==side+':'+normalized
    ||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||!(g.adjacency instanceof Map))
    fail('CANONICAL_GRAPH_CUSTODY_'+side);
  const nodes=new Map();
  for(const n of g.nodes){
    if(!id(n.id)||nodes.has(id(n.id)))fail('DUPLICATE_OR_INVALID_NODE_'+side);
    nodes.set(id(n.id),n);
  }
  const edges=new Set();
  for(const e of g.edges){
    if(!id(e.elementId)||edges.has(id(e.elementId))||!nodes.has(id(e.from))||!nodes.has(id(e.to))
      ||!(g.adjacency.get(id(e.from))||[]).some(x=>x.elementId===e.elementId)
      ||!(g.adjacency.get(id(e.to))||[]).some(x=>x.elementId===e.elementId))
      fail('CANONICAL_GRAPH_EDGE_INCIDENCE_'+side);
    edges.add(id(e.elementId));
  }
  const usable=[...nodes.values()].filter(x=>vec3(x.position)!==null).length;
  return {nodes,rawNodes:nodes.size,nativeCoordinateRows:usable,edges:edges.size};
}
function checkParent({geometryAudit,routeAudit,triage,reconciliation,sourceId,
  sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256}){
  if(geometryAudit?.schema!=='CiiArchitectureA208GeometryRevisionFalsifiers.v1'
    ||geometryAudit.status!=='GEOMETRY_REVISION_DIAGNOSIS_ONLY'
    ||geometryAudit.writerReady!==false||geometryAudit.certifiedNodeCount!==0
    ||geometryAudit.certifiedElementCount!==0||geometryAudit.admittedCandidateCount!==0
    ||geometryAudit.transferPlan!==null||geometryAudit.writeScope!==null
    ||routeAudit?.schema!=='CiiArchitectureA207IslandRouteWitnesses.v1'
    ||routeAudit.writerReady!==false
    ||triage?.schema!=='CiiArchitectureA206PhysicalReviewIslands.v1'
    ||triage.writerReady!==false
    ||reconciliation?.schema!=='CiiArchitectureA205FrontierReconciliation.v1'
    ||reconciliation.writerReady!==false)
    fail('PREDECESSOR_A205_A208_NONWRITING_BASIS_REQUIRED');
  const p=reconciliation.augmentedJoint?.provenance;
  if(!p?.originalSourceShaById?.[sourceId]||geometryAudit.provenance.originalSourceSetSha256!==p.sourceSetSha256
    ||geometryAudit.provenance.originalTargetSha256!==p.originalTargetSha256
    ||geometryAudit.provenance.physicalOriginalSnapshotDigest!==p.physicalOriginalSnapshotDigest
    ||geometryAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256
    ||routeAudit.provenance.sourceSetSha256!==p.sourceSetSha256
    ||triage.authority.sourceSetSha256!==p.sourceSetSha256
    ||reconciliation.recomputedPathAudit.provenance.normalizedSourceShaById[sourceId]!==normalizedSourceSha256
    ||reconciliation.recomputedPathAudit.provenance.normalizedTargetSha256!==normalizedTargetSha256)
    fail('SOURCE_TARGET_SHA_PROVENANCE_MISMATCH');
  return {source:graph(sourceGraph,'SOURCE',normalizedSourceSha256),
    target:graph(targetGraph,'TARGET',normalizedTargetSha256),provenance:p};
}
function checkSurvey(survey,originalSource,originalTarget){
  if(survey?.status!=='EXTERNALLY_REVIEWED_INDEPENDENT_COORDINATE_SURVEY'
    ||!SHA.test(str(survey.receiptSha256))
    ||survey.sourceOriginalSha256!==originalSource
    ||survey.targetOriginalSha256!==originalTarget
    ||survey.sourceUnits!=='mm'||survey.targetUnits!=='mm'
    ||survey.sourceHandedness!=='RIGHT'||survey.targetHandedness!=='RIGHT'
    ||survey.sourceFrameId===survey.targetFrameId
    ||!str(survey.sourceFrameId)||!str(survey.targetFrameId))
    return false;
  return true;
}
function attest(pair,survey,source,target){
  const a=pair?.attestation;
  const sid=id(pair?.sourceNodeId),tid=id(pair?.targetNodeId);
  if(!sid||!tid||!SHA.test(str(a?.receiptSha256))
    ||a?.authority!=='INDEPENDENT_EXTERNAL_PHYSICAL_SURVEY'
    ||a?.sourceOriginalSha256!==survey.sourceOriginalSha256
    ||a?.targetOriginalSha256!==survey.targetOriginalSha256
    ||a?.sourceFrameId!==survey.sourceFrameId
    ||a?.targetFrameId!==survey.targetFrameId
    ||a?.status!=='PHYSICAL_NODE_PAIR_INDEPENDENTLY_REVIEWED')
    fail('PAIR_NOT_INDEPENDENTLY_ATTESTED');
  const s=vec3(source.nodes.get(sid)?.position),t=vec3(target.nodes.get(tid)?.position);
  if(!s||!t)fail('PAIR_NODE_POSITION_MISSING_OR_UNQUALIFIED');
  return {sourceNodeId:sid,targetNodeId:tid,sourcePosition:s,targetPosition:t,receiptSha256:a.receiptSha256};
}
function frame(a,b,c,minSine,maxEdge){
  const ab=sub(b,a),ac=sub(c,a),l1=norm(ab),l2=norm(ac);
  if(!l1||!l2||l1>maxEdge||l2>maxEdge)fail('ANCHOR_TRIANGLE_TOO_LARGE_OR_DUPLICATE');
  const u=unit(ab),w=cross(u,ac),sin=norm(w)/l2;
  if(sin<minSine)fail('ANCHOR_TRIANGLE_COLLINEAR_OR_ILL_CONDITIONED');
  const n=unit(w),v=cross(n,u);
  return {origin:a,axes:[u,v,n],sine:sin};
}
function project(point,src,dst){
  const d=sub(point,src.origin);
  return add(dst.origin,dst.axes.reduce((r,axis,i)=>
    add(r,mul(axis,dot(d,src.axes[i]))),[0,0,0]));
}
function commonResult(basis,inventory,p,extra){
  return freeze({
    schema:'CiiArchitectureA209IndependentRegistration.v1',
    status:extra.status,reason:extra.reason,
    provenance:{
      originalSourceSetSha256:basis.provenance.sourceSetSha256,
      originalTargetSha256:basis.provenance.originalTargetSha256,
      sourceOriginalSha256:basis.provenance.originalSourceShaById[extra.sourceId],
      physicalSnapshotDigest:basis.provenance.physicalOriginalSnapshotDigest,
      normalizedSourceSha256:extra.normalizedSourceSha256,
      normalizedTargetSha256:extra.normalizedTargetSha256,
    },
    policy:p,policyDigest:hash(p),nativePositionInventory:inventory,
    surveyQualification:extra.surveyQualification,
    independentFitAnchors:extra.fitAnchors||[],
    independentHeldOut:extra.heldOut||[],
    fitResidualsMm:extra.fitResidualsMm||[],
    heldOutResidualsMm:extra.heldOutResidualsMm||[],
    transformDiagnostic:extra.transformDiagnostic||null,
    certifiedNodeCount:0,certifiedElementCount:0,
    admittedCandidateCount:0,correspondenceCertificates:[],
    writerReady:false,transferPlan:null,writeScope:null,
    limitations:[
      'NATIVE_PARSED_NODE_POSITIONS_ARE_NOT_INTRINSICALLY_INDEPENDENT_SURVEY_AUTHORITY',
      'SURVEY_RECEIPTS_REQUIRE_EXTERNAL_REAL_WORLD_AUTHENTICATION_NOT_JUST_FIELDS',
      'THREE_ANCHORS_PLUS_HELDOUT_FIT_DO_NOT_PROVE_ALL_NETWORK_NODE_IDENTITIES',
      'REFLECTION_AND_SCALE_CHANGES_ARE_NOT_PERMITTED',
      'BEND_RADIUS_SWEEP_AND_TRUE_ARC_ARE_NOT_PROVEN_BY_DISPLACEMENT_VECTOR',
      'NO_PRODUCTION_WRITER_OR_NODE_NAME_RESTRAINT_PRESSURE_ADMISSION',
    ],
  });
}
export function examineCiiA209IndependentRegistration({
  geometryAudit,routeAudit,triage,reconciliation,sourceId,
  sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256,
  independentSurvey=null,fitPairs=[],heldOutPairs=[],policy={},
}={}){
  const p=policyOf(policy),member=str(sourceId);
  const basis=checkParent({geometryAudit,routeAudit,triage,reconciliation,sourceId:member,
    sourceGraph,targetGraph,normalizedSourceSha256,normalizedTargetSha256});
  const inventory={sourceNativeCoordinateNodeCount:basis.source.nativeCoordinateRows,
    sourcePhysicalNodeCount:basis.source.rawNodes,
    targetNativeCoordinateNodeCount:basis.target.nativeCoordinateRows,
    targetPhysicalNodeCount:basis.target.rawNodes,
    nativeCoordinatesAuthority:'UNQUALIFIED_UNLESS_EXTERNAL_SURVEY_RECEIPT_VERIFIED'};
  const base={sourceId:member,normalizedSourceSha256,normalizedTargetSha256};
  if(!checkSurvey(independentSurvey,basis.provenance.originalSourceShaById[member],
    basis.provenance.originalTargetSha256))
    return commonResult(basis,inventory,p,{...base,
      status:'BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY',
      reason:'NATIVE_GRAPH_POSITIONS_OR_MANUAL_LOCKS_ARE_NOT_AN_INDEPENDENT_REGISTRATION_BASIS',
      surveyQualification:'NOT_ADMITTED'});
  if(fitPairs.length!==3||heldOutPairs.length<p.minHeldOut
    ||fitPairs.length+heldOutPairs.length>p.maxPairs)
    fail('THREE_FIT_ANCHORS_AND_INDEPENDENT_HELDOUT_REQUIRED');
  const fit=fitPairs.map(x=>attest(x,independentSurvey,basis.source,basis.target));
  const held=heldOutPairs.map(x=>attest(x,independentSurvey,basis.source,basis.target));
  const all=[...fit,...held];
  if(new Set(all.map(x=>x.sourceNodeId)).size!==all.length
    ||new Set(all.map(x=>x.targetNodeId)).size!==all.length
    ||new Set(all.map(x=>x.receiptSha256)).size!==all.length)
    fail('REUSED_NODE_OR_ATTESTATION_ACROSS_FIT_AND_HELDOUT');
  const sf=frame(...fit.map(x=>x.sourcePosition),p.minTriangleSine,p.maxFitAnchorTriangleEdgeMm);
  const tf=frame(...fit.map(x=>x.targetPosition),p.minTriangleSine,p.maxFitAnchorTriangleEdgeMm);
  const fitResiduals=fit.map(x=>rounded(norm(sub(project(x.sourcePosition,sf,tf),x.targetPosition))));
  const heldOutResiduals=held.map(x=>rounded(norm(sub(project(x.sourcePosition,sf,tf),x.targetPosition))));
  const pairs=(xs,rs)=>xs.map((x,i)=>({sourceNodeId:x.sourceNodeId,
    targetNodeId:x.targetNodeId,attestationReceiptSha256:x.receiptSha256,residualMm:rs[i]}));
  const worstFit=Math.max(...fitResiduals),worstHeld=Math.max(...heldOutResiduals);
  const accepted=worstFit<=p.maxFitAnchorResidualMm&&worstHeld<=p.maxHeldOutResidualMm;
  return commonResult(basis,inventory,p,{...base,
    status:accepted?'INDEPENDENT_SURVEY_RIGID_FIT_HELDOUT_PASS_NOT_CERTIFIED':
      'INDEPENDENT_SURVEY_RIGID_FIT_FALSIFIED',
    reason:accepted?'FIT_AND_SEPARATE_HELDOUT_RESIDUALS_WITHIN_DECLARED_BOUNDS'
      :'FIT_OR_HELDOUT_EXCEEDS_DECLARED_RIGID_REGISTRATION_RESIDUAL',
    surveyQualification:'EXTERNAL_SURVEY_RECEIPT_DECLARED_NOT_AUTOMATICALLY_AUTHENTICATED',
    fitAnchors:pairs(fit,fitResiduals),heldOut:pairs(held,heldOutResiduals),
    fitResidualsMm:fitResiduals,heldOutResidualsMm:heldOutResiduals,
    transformDiagnostic:{
      sourceOrigin:sf.origin,targetOrigin:tf.origin,
      rotationRows:[0,1,2].map(j=>[0,1,2].map(i=>rounded(tf.axes.reduce(
        (v,axis,k)=>v+axis[j]*sf.axes[k][i],0)))),
      scale:1,reflectionAllowed:false,sourceTriangleSine:rounded(sf.sine),
      targetTriangleSine:rounded(tf.sine),
      worstFitResidualMm:worstFit,worstHeldOutResidualMm:worstHeld,
    },
  });
}
export function assertCiiA209NoWrite(result){
  if(result?.schema!=='CiiArchitectureA209IndependentRegistration.v1')
    fail('REGISTRATION_SCHEMA_REQUIRED');
  fail('RIGID_REGISTRATION_SHADOW_NEVER_WRITER_AUTHORITY');
}
