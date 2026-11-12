import { registeredMethodCPoint } from './cii-workspace-method-c-registration.js';
// Read-only proximity observations, never qualified identity or Writer2 authority.
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const length=a=>Math.hypot(...a);
const ids=(a,b)=>Number(a)-Number(b)||String(a).localeCompare(String(b));
const rank=(a,b)=>a.distance-b.distance||ids(a.target,b.target);
export function validateXYZTolerance(tolerance) {
  const values=['x','y','z'].map(k=>Number(tolerance?.[k]));
  if(values.some(x=>!Number.isFinite(x)||x<0||x>100000))throw new RangeError('XYZ_TOLERANCE_MM_INVALID');
  return values;
}
function key(p,cell){return p.map((v,i)=>Math.floor(v/cell[i])).join(':');}
function makeIndex(nodes,cell){
  const index=new Map();
  for(const node of nodes){const k=key(node.xyz,cell);if(!index.has(k))index.set(k,[]);index.get(k).push(node);}
  return index;
}
function neighbors(index,p,cell){
  const at=p.map((v,i)=>Math.floor(v/cell[i])),result=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)
    result.push(...(index.get([at[0]+x,at[1]+y,at[2]+z].join(':'))||[]));
  return result;
}
function segmentProjection(p,a,b){
  const d=sub(b,a),len2=d.reduce((v,x)=>v+x*x,0);
  const t=len2?Math.max(0,Math.min(1,sub(p,a).reduce((v,x,i)=>v+x*d[i],0)/len2)):0;
  const xyz=a.map((x,i)=>x+t*d[i]);
  return {xyz,t,stationMm:Math.sqrt(len2)*t,lengthMm:Math.sqrt(len2),
    distance:length(sub(p,xyz)),residual:sub(xyz,p)};
}
function nearestSegment(p,target,eligible){
  let best=null;
  for(const edge of target.edges){
    if(!eligible.has(edge.from)||!eligible.has(edge.to))continue;
    const a=target.nodeIndex.get(edge.from),b=target.nodeIndex.get(edge.to);
    if(!a||!b)throw new Error('TARGET_ELEMENT_MISSING_PHYSICAL_ENDPOINT');
    const projection=segmentProjection(p,a.xyz,b.xyz);
    if(!best||projection.distance<best.distance-1e-9||
       (Math.abs(projection.distance-best.distance)<=1e-9&&edge.index<best.element))
      best={...projection,element:edge.index,witness:edge.witness,
        between:[edge.from,edge.to],od:edge.od,wall:edge.wall,
        sourceOfCoordinates:'ORIGINAL_TARGET_ELEMENT'};
  }
  return best;
}
function requireGraphAndPose(source,target,pose){
  if(!source?.nodes||!target?.nodes||!source?.nodeIndex||!target?.nodeIndex||
     !source?.sha256||!target?.sha256||!Array.isArray(source.components)||
     !Array.isArray(target.components))throw new Error('CII_ORIGINAL_GRAPH_CUSTODY_REQUIRED');
  if(!pose?.anchors?.length)throw new Error('REGISTRATION_ANCHOR_REQUIRED');
  if(!Number.isInteger(pose.sourceComponent)||!source.components[pose.sourceComponent]||
     !Number.isInteger(pose.targetComponent)||!target.components[pose.targetComponent]||
     !Array.isArray(pose.rotation)||!Array.isArray(pose.translation))
     throw new Error('REGISTERED_COMPONENT_AND_RIGID_TRANSFORM_REQUIRED');
  if((pose.sourceSha&&pose.sourceSha!==source.sha256)||
     (pose.targetSha&&pose.targetSha!==target.sha256)||
     (pose.sourceMember&&pose.sourceMember!==source.member)||
     (pose.targetMember&&pose.targetMember!==target.member))
     throw new Error('STALE_METHOD_C_FILE_REVISION_OR_MEMBER');
  const R=pose.rotation,t=pose.translation;
  if(pose.scale!==undefined&&pose.scale!==1)throw new Error('METHOD_C_NONRIGID_POSE_REJECTED');
  if(R.length!==3||R.some(row=>!Array.isArray(row)||row.length!==3||
      row.some(v=>!Number.isFinite(v)))||
     t.length!==3||t.some(v=>!Number.isFinite(v)))
     throw new Error('METHOD_C_NONRIGID_POSE_REJECTED');
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)
    if(Math.abs(dot(R[i],R[j])-(i===j?1:0))>1e-6)
      throw new Error('METHOD_C_NONRIGID_POSE_REJECTED');
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  if(Math.abs(dot(R[0],cross(R[1],R[2]))-1)>1e-6)
    throw new Error('METHOD_C_NONRIGID_POSE_REJECTED');
}
export function findMethodCCandidates(source,target,pose,tolerance={x:100,y:100,z:100}){
  const tol=validateXYZTolerance(tolerance),cell=tol.map(x=>Math.max(1,x));
  requireGraphAndPose(source,target,pose);
  const eligible=new Set(target.components[pose.targetComponent]);
  const targets=target.nodes.filter(n=>eligible.has(n.id));
  const sources=source.nodes.filter(n=>n.component===pose.sourceComponent);
  const index=makeIndex(targets,cell);
  const anchors=new Map(pose.anchors.map(a=>[a.source,a.target]));
  const ranked=sources.map(s=>{
    const xyz=registeredMethodCPoint(pose,s.xyz);
    if(xyz.some(v=>!Number.isFinite(v)))throw new Error('NONFINITE_REGISTERED_SOURCE_COORDINATE');
    const alternatives=neighbors(index,xyz,cell).map(t=>{
      const residual=sub(t.xyz,xyz);
      return {target:t.id,targetMember:target.member,targetSha:target.sha256,xyz:t.xyz,
        residual,distance:length(residual),nodeName:t.nodeName,
        targetWitness:t.incident,originalElements:t.incident?.map(i=>target.edges[i]?.witness).filter(Boolean)??[],
        od:t.od,wall:t.wall,degree:t.degree};
    }).filter(p=>p.residual.every((v,i)=>Math.abs(v)<=tol[i]+1e-9)).sort(rank);
    const nearest=targets.map(t=>({target:t.id,residual:sub(t.xyz,xyz),
      distance:length(sub(t.xyz,xyz))})).sort(rank)[0]||null;
    const segment=alternatives.length?null:nearestSegment(xyz,target,eligible);
    return {source:s.id,member:source.member,sourceSha:source.sha256,targetSha:target.sha256,
      xyz,original:s.xyz,nodeName:s.nodeName,degree:s.degree,sourceWitness:s.incident,
      sourceOd:s.od,sourceWall:s.wall,
      originalElements:s.incident?.map(i=>source.edges[i]?.witness).filter(Boolean)??[],
      alternatives,nearest,segment,anchorTarget:anchors.get(s.id)||null};
  });
  const uses=new Map();
  for(const row of ranked)for(const alternative of row.alternatives){
    if(!uses.has(alternative.target))uses.set(alternative.target,new Set());
    uses.get(alternative.target).add([row.member,row.sourceSha,row.source].join(':'));
  }
  const rows=ranked.map(row=>{
    const contestedTargets=row.alternatives.filter(a=>uses.get(a.target).size>1)
      .map(a=>a.target).sort(ids);
    let status='OUTSIDE_TOLERANCE',explanation='No TARGET physical NODE within independent XYZ tolerances.';
    if(row.alternatives.length>1){
      status='AMBIGUOUS';explanation='Multiple original physical TARGET NODE alternatives; all retained.';
    }else if(row.alternatives.length===1&&contestedTargets.length){
      status='TARGET_COLLISION';explanation='TARGET physical NODE contested by multiple SOURCE candidates.';
    }else if(row.alternatives.length===1){
      status='COORDINATE_NEAR_CANDIDATE';explanation='Coordinate-near only; physical identity not qualified.';
    }else if(row.segment&&row.segment.distance<=Math.max(...tol)){
      status='MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT';
      explanation='Original TARGET ELEMENT projection only; no TARGET physical NODE correspondence.';
    }
    if(row.anchorTarget&&!row.alternatives.some(a=>a.target===row.anchorTarget)){
      status='ANCHORED_CONFLICT';explanation='Experimental anchor outside current candidate tolerance.';
    }else if(row.anchorTarget&&(status==='AMBIGUOUS'||status==='TARGET_COLLISION')){
      explanation='Experimental anchor does not suppress competing TARGET evidence.';
    }else if(row.anchorTarget){
      status='OWNER_ANCHOR_EXPERIMENT';explanation='Experiment anchor only, never physical-credit or Writer authority.';
    }
    const best=row.alternatives[0];
    return {...row,contestedTargets,status,explanation,
      target:best?.target||null,residual:best?.residual||row.nearest?.residual||null,
      distance:best?.distance??row.nearest?.distance??null,
      odDifference:best?row.sourceOd-best.od:null,
      wallDifference:best?Number((row.sourceWall-best.wall).toFixed(4)):null,
      grade:'METHOD_C_GEOMETRIC_REVIEW_ONLY',physicalNodeCorrespondenceQualified:false,
      writerEligible:false};
  }).sort((a,b)=>ids(a.source,b.source));
  const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length]));
  return {rows,counts,nearSourceCount:rows.filter(r=>r.alternatives.length>0).length,
    collisionTargets:[...uses].filter(([,v])=>v.size>1).map(([k])=>k).sort(ids),
    tolerance:{x:tol[0],y:tol[1],z:tol[2]},qualifiedIdentityCount:0,
    targetComponentCount:eligible.size,totalTargetComponents:target.components.length,
    snapshot:[source.member,source.sha256,target.member,target.sha256,
      pose.sourceComponent,pose.targetComponent,pose.status,
      JSON.stringify(pose.anchors),JSON.stringify(pose.rotation),
      JSON.stringify(pose.translation),JSON.stringify(pose.originalDiscovery??null),
      pose.selectedPoseId??null,tol.join(',')].join('|')};
}
export function findMethodCMultiSourceCandidates(members,target,registrations,tolerance={x:100,y:100,z:100}){
  const ledgers=members.map(graph=>{
    const pose=registrations[graph.member];
    if(!pose)return {member:graph.member,status:'UNREGISTERED_COMPONENT',rows:[]};
    return {member:graph.member,status:pose.status,...findMethodCCandidates(graph,target,pose,tolerance)};
  });
  const rows=ledgers.flatMap(ledger=>ledger.rows),custody=new Map();
  for(const row of rows)for(const alternative of row.alternatives){
    if(!custody.has(alternative.target))custody.set(alternative.target,new Set());
    custody.get(alternative.target).add([row.member,row.sourceSha,row.source].join(':'));
  }
  const reconciled=rows.map(row=>{
    if(!row.alternatives.some(a=>custody.get(a.target).size>1))return row;
    return {...row,status:row.anchorTarget?'ANCHORED_CONFLICT':'TARGET_COLLISION',
      explanation:'GLOBAL_TARGET_CUSTODY_CONFLICT_ACROSS_SOURCE_MEMBERS: manual review required.',
      writerEligible:false};
  }).sort((a,b)=>a.member.localeCompare(b.member)||ids(a.source,b.source));
  return {rows:reconciled,members:ledgers.map(({member,status})=>({member,status})),
    globallyReusedTargets:[...custody].filter(([,v])=>v.size>1).map(([id])=>id).sort(ids),
    writerEligible:false};
}
