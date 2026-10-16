// Complete, deterministic, read-only Method C evidence; no Writer2 artifact.
import { escapeMethodCXml } from './cii-workspace-method-c-svg.js';
const jsonNum = v=>Number.isFinite(v)?v:null;
const csvField = value => {
  const numeric=typeof value==='number'&&Number.isFinite(value);
  let s=String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ');
  // CSV must remain safe when opened in Excel/Sheets (including leading whitespace).
  if(!numeric&&/^\s*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
};
export function methodCEvidence({source,target,transform,candidates,scene,projection='XZ'}={}){
  if(!source?.sha256||!target?.sha256||!transform?.anchors?.length||!candidates?.snapshot||
     !scene?.svg)throw new Error('METHOD_C_EXPORT_STALE_OR_INCOMPLETE');
  if(candidates.rows.some(r=>r.sourceSha!==source.sha256||r.targetSha!==target.sha256))
    throw new Error('METHOD_C_EXPORT_SHA_REVISION_MISMATCH');
  if(candidates.snapshot!== [
    source.member,source.sha256,target.member,target.sha256,
    transform.sourceComponent,transform.targetComponent,transform.status,
    JSON.stringify(transform.anchors),JSON.stringify(transform.rotation),
    JSON.stringify(transform.translation),
    [candidates.tolerance.x,candidates.tolerance.y,candidates.tolerance.z].join(',')
  ].join('|'))throw new Error('METHOD_C_EXPORT_STALE_SNAPSHOT');
  if(scene.projection!==projection)throw new Error('METHOD_C_EXPORT_STALE_PROJECTION');
  const rows=candidates.rows.map(r=>({
    sourceMember:r.member,sourceNode:r.source,sourceSha:r.sourceSha,
    sourceX:jsonNum(r.original[0]),sourceY:jsonNum(r.original[1]),sourceZ:jsonNum(r.original[2]),
    registeredX:jsonNum(r.xyz[0]),registeredY:jsonNum(r.xyz[1]),registeredZ:jsonNum(r.xyz[2]),
    targetMember:target.member,targetSha:r.targetSha,candidateTarget:r.target,
    nearestTarget:r.nearest?.target??null,status:r.status,
    deltaX:jsonNum(r.residual?.[0]),deltaY:jsonNum(r.residual?.[1]),deltaZ:jsonNum(r.residual?.[2]),
    distanceMm:jsonNum(r.distance),tolerance:candidates.tolerance,
    originalSourceElements:r.originalElements,competingTargets:r.alternatives,
    sourceOD:r.sourceOd,sourceWall:r.sourceWall,
    selectedTargetOD:r.alternatives[0]?.od??null,selectedTargetWall:r.alternatives[0]?.wall??null,
    odDifference:r.odDifference,wallDifference:r.wallDifference,nearestPhysicalTarget:r.nearest,
    segmentOnly:r.segment?{
      witness:r.segment.witness,elementIndex:r.segment.element,
      endpoints:r.segment.between,fraction:r.segment.t,stationMm:r.segment.stationMm,
      segmentLengthMm:r.segment.lengthMm,distanceMm:r.segment.distance,
      projectedXYZ:r.segment.xyz,od:r.segment.od,wall:r.segment.wall
    }:null,contestedTargets:r.contestedTargets,
    explanation:r.explanation,writerEligible:false,physicalIdentityQualified:false
  }));
  return {schema:'MethodC.GeometricReviewEvidence.v1',authority:'METHOD_C_READ_ONLY_GEOMETRIC_CANDIDATES',
    source:{member:source.member,sha256:source.sha256,nodeCount:source.nodes.length,elementCount:source.edges.length},
    target:{member:target.member,sha256:target.sha256,nodeCount:target.nodes.length,elementCount:target.edges.length,
      components:target.components.map((ids,index)=>({index,nodeCount:ids.length,
        registered:index===transform.targetComponent}))},
    registration:{status:transform.status,qualifiedForGeometricReview:Boolean(transform.qualified),
      anchors:transform.anchors,rotation:transform.rotation,translation:transform.translation,
      scale:1,determinant:transform.determinant,maxResidualMm:transform.maxResidualMm,
      rmsResidualMm:transform.rmsResidualMm,anchorResiduals:transform.residuals,
      leaveOneOut:transform.leaveOneOut},
    tolerance:candidates.tolerance,projection,svgMetric:scene.metric,
    snapshot:candidates.snapshot,nearSourceCount:candidates.nearSourceCount,
    candidateStatusCounts:candidates.counts,collisionTargets:candidates.collisionTargets,
    originalTargetComponentsUnregistered:target.components.map((ids,i)=>i)
      .filter(i=>i!==transform.targetComponent),
    qualifiedPhysicalIdentityCount:0,writerEligible:false,
    rows};
}
export function methodCJsonExport(context){
  return JSON.stringify(methodCEvidence(context),null,2)+'\n';
}
export function methodCCsvExport(context){
  const evidence=methodCEvidence(context);
  const columns=['sourceMember','sourceNode','sourceSha','sourceX','sourceY','sourceZ',
    'registeredX','registeredY','registeredZ','targetMember','targetSha',
    'candidateTarget','nearestTarget','status','deltaX','deltaY','deltaZ','distanceMm',
    'sourceOD','sourceWall','selectedTargetOD','selectedTargetWall','odDifference','wallDifference',
    'originalSourceElements','competingTargets','segmentOnly','contestedTargets','explanation',
    'registrationStatus','snapshot','writerEligible'];
  const data=evidence.rows.map(row=>{
    const flat={...row,registrationStatus:evidence.registration.status,snapshot:evidence.snapshot};
    return columns.map(key=>{
      const value=flat[key];
      return csvField(typeof value==='object'&&value!==null?JSON.stringify(value):value);
    }).join(',');
  });
  return columns.map(csvField).join(',')+'\r\n'+data.join('\r\n')+'\r\n';
}
export function methodCSvgExport(context){
  methodCEvidence(context); // reject stale file/anchor/tolerance/projection state
  const svg=context.scene.svg;
  if(!svg.startsWith('<svg ')||/<(?:script|foreignObject)\b/i.test(svg)||
     /<[^>]+\s+on[a-z]+\s*=/i.test(svg))throw new Error('METHOD_C_SVG_EXPORT_SANITIZATION_FAILED');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+svg+'\n';
}
export function methodCSafeLabel(label){return escapeMethodCXml(label);}
