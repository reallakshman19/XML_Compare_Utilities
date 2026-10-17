import { fitProperRigidAnchors } from './cii-workspace-method-c-rigid-fit.js';
import { registerMethodCAutoReview } from './cii-workspace-method-c-auto-registration.js';
// Method C registration is geometry review only; never Method A/B or Writer authority.
const I = [[1,0,0],[0,1,0],[0,0,1]];
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const add = (a,b) => a.map((v,i)=>v+b[i]);
const mul = (a,k) => a.map((v)=>v*k);
const dot = (a,b) => a.reduce((v,x,i)=>v+x*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = (a) => { const m=Math.hypot(...a);return m>1e-9?mul(a,1/m):null; };
const mv = (matrix,point) => matrix.map((row)=>dot(row,point));
const transpose = (matrix) => matrix[0].map((_,j)=>matrix.map((row)=>row[j]));
const mm = (a,b) => a.map((row)=>transpose(b).map((col)=>dot(row,col)));
const det = (matrix) => dot(matrix[0],cross(matrix[1],matrix[2]));
function axisAngle(axis, angleDegrees) {
  const k=norm(axis);
  if(!k||!Number.isFinite(Number(angleDegrees)))throw new Error('INVALID_ROTATION_AXIS_OR_ANGLE');
  const a=Number(angleDegrees)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const K=[[0,-k[2],k[1]],[k[2],0,-k[0]],[-k[1],k[0],0]];
  return I.map((row,i)=>row.map((x,j)=>c*x+(1-c)*k[i]*k[j]+s*K[i][j]));
}
function rotationPreview(euler) {
  if(!Array.isArray(euler)||euler.length!==3||euler.some((x)=>!Number.isFinite(x)))
    throw new Error('INVALID_PREVIEW_EULER_DEGREES');
  return mm(axisAngle([0,0,1],euler[2]),mm(axisAngle([0,1,0],euler[1]),axisAngle([1,0,0],euler[0])));
}
function shortestDirectionRotation(a,b) {
  const u=norm(a),v=norm(b);
  if(!u||!v)return null;
  const uv=cross(u,v),sin=Math.hypot(...uv),cos=dot(u,v);
  if(sin<1e-12&&cos>0)return I;
  if(sin<1e-12) {
    const k=norm(cross(u,Math.abs(u[0])<0.8?[1,0,0]:[0,1,0]));
    return I.map((row,i)=>row.map((x,j)=>-x+2*k[i]*k[j]));
  }
  const k=mul(uv,1/sin),angle=Math.atan2(sin,cos),c=Math.cos(angle),s=Math.sin(angle);
  const K=[[0,-k[2],k[1]],[k[2],0,-k[0]],[-k[1],k[0],0]];
  return I.map((row,i)=>row.map((x,j)=>c*x+(1-c)*k[i]*k[j]+s*K[i][j]));
}
export function registeredMethodCPoint(transform,xyz) {
  return add(mv(transform.rotation,xyz),transform.translation);
}
function validatePairs(source,target,anchors) {
  const usedSources=new Set(),usedTargets=new Set();
  if(!Array.isArray(anchors))throw new Error('ANCHORS_ARRAY_REQUIRED');
  return anchors.map((anchor,index)=>{
    const sourceKey=String(anchor.source),targetKey=String(anchor.target);
    if(anchor.member&&anchor.member!==source.member)throw new Error('ANCHOR_WRONG_SOURCE_MEMBER');
    if((anchor.sourceSha&&anchor.sourceSha!==source.sha256)||(anchor.targetSha&&anchor.targetSha!==target.sha256))
      throw new Error('ANCHOR_ORIGINAL_SHA_MISMATCH');
    if(usedSources.has(sourceKey)||usedTargets.has(targetKey))throw new Error('DUPLICATE_ANCHOR_CUSTODY');
    usedSources.add(sourceKey);usedTargets.add(targetKey);
    const s=source.nodeIndex.get(sourceKey),t=target.nodeIndex.get(targetKey);
    if(!s||!t)throw new Error('ANCHOR_NOT_PHYSICAL_NODE:'+index);
    if([s.xyz,t.xyz].some((p)=>!Array.isArray(p)||p.length!==3||p.some((x)=>!Number.isFinite(x))))
      throw new Error('ANCHOR_NONFINITE_POSITION');
    return {source:s,target:t,role:anchor.role||'candidate'};
  });
}
function residuals(transform,pairs) {
  return pairs.map((p)=>{
    const vector=sub(registeredMethodCPoint(transform,p.source.xyz),p.target.xyz);
    return {source:p.source.id,target:p.target.id,xyz:vector,distance:Math.hypot(...vector)};
  });
}
function leaveOneOut(pairs,minSinAngle) {
  if(pairs.length<4)return {status:'INSUFFICIENT_ANCHORS',rows:[]};
  if(pairs.length>64)return {status:'SKIPPED_ANCHOR_COUNT_LIMIT',rows:[]};
  return {status:'DIAGNOSTIC_ONLY_NOT_AUTO_EXCLUSION',rows:pairs.map((anchor,index)=>{
    const fit=fitProperRigidAnchors(pairs.filter((_,i)=>i!==index),{minSinAngle});
    if(!fit)return {source:anchor.source.id,target:anchor.target.id,distanceMm:null,status:'DEGENERATE_REMAINDER'};
    const error=sub(add(mv(fit.rotation,anchor.source.xyz),fit.translation),anchor.target.xyz);
    return {source:anchor.source.id,target:anchor.target.id,residual:error,
      distanceMm:Math.hypot(...error),status:'WITNESS_RETAINED'};
  })};
}
export function registerMethodC(source,target,anchors,options={}) {
  if(!source?.nodeIndex||!target?.nodeIndex)throw new Error('PHYSICAL_GRAPH_REQUIRED');
  const pairs=validatePairs(source,target,anchors);
  if(!pairs.length)return {status:'NO_ANCHOR',qualified:false,identified:false,
    rotation:I,translation:[0,0,0],anchors:[],warning:'METHOD_C_ONLY_NO_WRITER_AUTHORITY'};
  const first=pairs[0],sourceComponent=first.source.component,targetComponent=first.target.component;
  if(pairs.some((p)=>p.source.component!==sourceComponent||p.target.component!==targetComponent))
    throw new Error('ANCHORS_CROSS_DISCONNECTED_COMPONENTS');
  const tolerance=options.registrationToleranceMm??1,minSinAngle=options.minSinAngle??0.01;
  if(!Number.isFinite(tolerance)||tolerance<0)throw new Error('REGISTRATION_TOLERANCE_INVALID');
  if(!Number.isFinite(minSinAngle)||minSinAngle<=0||minSinAngle>1)throw new Error('RIGID_MIN_SIN_POLICY_INVALID');
  let rotation=I,translation,fit=null,status='TRANSLATION_ONLY_EXPLORATION / ORIENTATION_UNDETERMINED',mismatch=0;
  if(pairs.length===1&&String(options.orientationMode??'').startsWith('AUTO_'))
    return registerMethodCAutoReview(source,target,anchors,options);
  if(pairs.length===1) rotation=rotationPreview(options.previewEulerDeg??[0,0,0]);
  if(pairs.length===2) {
    const a=sub(pairs[1].source.xyz,first.source.xyz);
    const b=sub(pairs[1].target.xyz,first.target.xyz);
    if(!norm(a)||!norm(b))throw new Error('ZERO_LENGTH_TWO_ANCHOR_AXIS');
    mismatch=Math.abs(Math.hypot(...a)-Math.hypot(...b));
    rotation=shortestDirectionRotation(a,b);
    if(options.previewTwistDeg!==undefined)
      rotation=mm(axisAngle(b,options.previewTwistDeg),rotation);
    status=mismatch>tolerance?'INCOMPATIBLE_EXACT_TWO_ANCHORS':'TWO_ANCHORS_AXIS_ALIGNED / TWIST_UNDETERMINED';
  }
  if(pairs.length>=3) {
    fit=fitProperRigidAnchors(pairs,{minSinAngle});
    if(!fit)return {status:'DEGENERATE_NONCOLLINEAR_BASIS',qualified:false,identified:false,
      targetComponent,sourceComponent,anchors:pairs.map((p)=>({source:p.source.id,target:p.target.id})),
      warning:'METHOD_C_ONLY_NO_WRITER_AUTHORITY'};
    rotation=fit.rotation;
    translation=fit.translation;
  }
  if(!rotation||Math.abs(det(rotation)-1)>1e-6)throw new Error('PROPER_RIGID_ROTATION_REQUIRED');
  translation??=sub(first.target.xyz,mv(rotation,first.source.xyz));
  const transform={rotation,translation,scale:1,determinant:det(rotation)};
  const errors=residuals(transform,pairs);
  const maxResidualMm=Math.max(...errors.map((r)=>r.distance));
  const rmsResidualMm=Math.sqrt(errors.reduce((sum,r)=>sum+r.distance*r.distance,0)/errors.length);
  // The anchor role is caller-controlled metadata, not an Owner-authenticated receipt.
  // Numeric admissibility is distinct from physical identity and trusted provenance.
  const qualified=false,numericFitAcceptable=maxResidualMm<=tolerance;
  if(pairs.length>=3)
    status=maxResidualMm>tolerance?'ANCHOR_RESIDUAL_CONFLICT':
      'RIGID_3D_NUMERIC_FIT_UNTRUSTED_ANCHORS';
  return {...transform,status,qualified,identified:false,numericFitAcceptable,
    ownerAnchorAuthenticated:false,physicalNodeCorrespondenceQualified:false,
    qualifiedIdentityCount:0,writerEligible:false,applyAuthorized:false,residuals:errors,
    sourceSha:source.sha256,targetSha:target.sha256,sourceMember:source.member,targetMember:target.member,
    maxResidualMm,rmsResidualMm,sourceComponent,targetComponent,separationMismatchMm:mismatch,
    leaveOneOut:leaveOneOut(pairs,minSinAngle),
    anchors:pairs.map((p)=>({source:p.source.id,target:p.target.id,role:p.role})),
    warning:'METHOD_C_GEOMETRY_REVIEW_ONLY; NOT_METHOD_A_OR_B; NO_WRITER_AUTHORITY'};
}
