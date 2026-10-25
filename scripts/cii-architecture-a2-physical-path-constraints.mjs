/**
 * ARCH-01 / A2-SHADOW-02 — bounded physical NODE/ELEMENT/PATH constraint audit.
 *
 * Input hypotheses remain uncertified. Exact original-file custody is inherited
 * from A2-SHADOW-01; each physical graph is separately bound to its normalized
 * V11/V14 bridge digest. Exhaustion limits are explicit. No Writer import.
 */
import { ciiA2HashJson } from './cii-a2-json-sha256.mjs';

const SHA=/^[0-9a-f]{64}$/i;
const text=(v)=>String(v??'').trim();
const digest=ciiA2HashJson;
const compare=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
function freeze(v){
  if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)])));
  return v;
}
function hash(v,label){const s=text(v).toLowerCase();if(!SHA.test(s))throw Error('A2P_'+label+'_SHA_INVALID');return s;}
function numeric(v,label,min,max){
  const n=Number(v);
  if(!Number.isFinite(n)||n<min||n>max)throw Error('A2P_INVALID_POLICY_'+label);
  return n;
}
const DEFAULT_POLICY=Object.freeze({
  maxSegments:4,maxPairCombinations:24,maxTraversalVisits:1500,maxPathWitnesses:4,
  pathLengthToleranceMm:25,diameterToleranceMm:2,wallToleranceMm:1,
  minTargetStraightness:0.995,straightnessDifferenceTolerance:0.01,
});
function policyFor(p={}){
  const x={...DEFAULT_POLICY,...p};
  for(const [key,min,max] of [
    ['maxSegments',1,8],['maxPairCombinations',1,64],['maxTraversalVisits',1,10000],
    ['maxPathWitnesses',1,32],['pathLengthToleranceMm',0,10000],
    ['diameterToleranceMm',0,100],['wallToleranceMm',0,100],
    ['minTargetStraightness',0,1],['straightnessDifferenceTolerance',0,1]])numeric(x[key],key,min,max);
  for(const key of ['maxSegments','maxPairCombinations','maxTraversalVisits','maxPathWitnesses'])
    if(!Number.isSafeInteger(x[key]))throw Error('A2P_INTEGER_POLICY_REQUIRED:'+key);
  return freeze(x);
}
function physicalGraph(graph,side,expectedNormalizedSha){
  if(graph?.side!==side||!Array.isArray(graph?.edges)||!(graph?.adjacency instanceof Map))
    throw Error('A2P_'+side+'_CANONICAL_PHYSICAL_GRAPH_REQUIRED');
  if(graph.documentId!==side+':'+hash(expectedNormalizedSha,side+'_NORMALIZED'))
    throw Error('A2P_'+side+'_NORMALIZED_BRIDGE_GRAPH_CUSTODY_MISMATCH');
  const ids=new Set(),endpointKeys=new Set();
  for(const edge of graph.edges){
    const id=text(edge.elementId),a=text(edge.from),b=text(edge.to);
    if(!id||!a||!b||!graph.adjacency.has(a)||!graph.adjacency.has(b))
      throw Error('A2P_PHYSICAL_EDGE_ENDPOINT_REQUIRED');
    if(ids.has(id))throw Error('A2P_DUPLICATE_CANONICAL_EDGE');
    ids.add(id);
    endpointKeys.add(a);endpointKeys.add(b);
  }
  // Verify adjacency actually indexes physical edges; never trust a forged
  // graph label whose edge endpoint isn't available via the canonical incidence.
  for(const edge of graph.edges){
    for(const n of [text(edge.from),text(edge.to)]){
      if(!(graph.adjacency.get(n)||[]).some(x=>x.elementId===edge.elementId))
        throw Error('A2P_PHYSICAL_EDGE_ADJACENCY_MISMATCH');
    }
  }
  return graph;
}
function other(edge,node){return String(edge.from)===node?String(edge.to):String(edge.from);}
function orient(edge,from,to){
  const backwards=String(edge.from)!==from;
  if(!((!backwards&&String(edge.to)===to)||(backwards&&String(edge.to)===from&&String(edge.from)===to)))
    throw Error('A2P_PATH_ORIENTATION_MISMATCH');
  return {
    from,to,id:String(edge.elementId),diameter:Number(edge.diameter),wall:Number(edge.wall),
    kind:String(edge.componentKind||'PIPE'),length:Number(edge.lengthMm),
    vector:[Number(edge.dx)*(backwards?-1:1),Number(edge.dy)*(backwards?-1:1),Number(edge.dz)*(backwards?-1:1)],
  };
}
function pathMeasure(steps){
  const total=steps.reduce((s,x)=>s+x.length,0);
  const v=steps.reduce((s,x)=>s.map((n,i)=>n+x.vector[i]),[0,0,0]);
  return {lengthMm:total,straightness:Math.hypot(...v)/Math.max(total,1)};
}
function traverse(graph,start,end,policy,reserved){
  const target=String(end),origin=String(start),found=[],failures=new Map();
  const stats={visits:0,complete:true,pathsExamined:0};
  if(!graph.adjacency.has(origin)||!graph.adjacency.has(target))
    return {paths:[],stats:{...stats,blocker:'TARGET_ENDPOINT_ABSENT'}};
  if(origin===target)return {paths:[],stats:{...stats,blocker:'SAME_TARGET_ENDPOINT'}};
  const remember=(code)=>failures.set(code,(failures.get(code)||0)+1);
  const stack=new Set([origin]);
  const dfs=(node,steps)=>{
    if(!stats.complete)return;
    if(stats.visits>=policy.maxTraversalVisits){stats.complete=false;return;}
    stats.visits++;
    if(node===target){
      stats.pathsExamined++;
      if(found.length<policy.maxPathWitnesses)found.push(steps);
      else stats.complete=false;
      return;
    }
    if(steps.length>=policy.maxSegments)return;
    const candidates=[...(graph.adjacency.get(node)||[])].sort((a,b)=>compare(a.elementId,b.elementId));
    for(const edge of candidates){
      if(!stats.complete)return;
      const next=other(edge,node);
      if(stack.has(next))continue;
      if(next!==target){
        if((graph.adjacency.get(next)||[]).length!==2){remember('TARGET_PATH_INTERNAL_NODE_DEGREE_NOT_2');continue;}
        if(reserved.has(next)){remember('TARGET_PATH_INTERNAL_NODE_RESERVED_BY_OTHER_CLAIM');continue;}
      }
      stack.add(next);
      dfs(next,[...steps,orient(edge,node,next)]);
      stack.delete(next);
    }
  };
  dfs(origin,[]);
  return {paths:found,stats:{...stats,rejectionSummary:Object.fromEntries(failures)}};
}
function physicalMatch(sourceStep,targetSteps,policy){
  // Physical identity evidence must not confuse revision properties with
  // topology. The existing topology adapter explicitly excludes OD/wall
  // from M2 identity tokens; both may be intended engineering deltas.
  const reasons=[],propertyWarnings=[],measurement=pathMeasure(targetSteps),original=pathMeasure([sourceStep]);
  if(targetSteps.length>1&&sourceStep.kind!=='PIPE')reasons.push('SUBDIVISION_NON_PIPE_SOURCE');
  if(targetSteps.some(step=>step.kind!==sourceStep.kind))reasons.push('ELEMENT_COMPONENT_KIND_MISMATCH');
  if(targetSteps.some(step=>!Number.isFinite(step.diameter)||!Number.isFinite(step.wall))
    ||!Number.isFinite(sourceStep.diameter)||!Number.isFinite(sourceStep.wall)){
    reasons.push('DIMENSIONAL_EVIDENCE_INVALID');
  }else{
    if(targetSteps.some(step=>Math.abs(step.diameter-sourceStep.diameter)>policy.diameterToleranceMm))
      propertyWarnings.push('ELEMENT_OD_ENGINEERING_REVISION_DIFFERENCE');
    if(targetSteps.some(step=>Math.abs(step.wall-sourceStep.wall)>policy.wallToleranceMm))
      propertyWarnings.push('ELEMENT_WALL_ENGINEERING_REVISION_DIFFERENCE');
  }
  if(Math.abs(original.lengthMm-measurement.lengthMm)>policy.pathLengthToleranceMm)
    reasons.push('PATH_LENGTH_MISMATCH');
  if(targetSteps.length>1&&(measurement.straightness<policy.minTargetStraightness
    ||Math.abs(original.straightness-measurement.straightness)>policy.straightnessDifferenceTolerance))
    reasons.push('SUBDIVISION_STRAIGHTNESS_MISMATCH');
  if(!Number.isFinite(sourceStep.length)||sourceStep.length<=0||!Number.isFinite(original.straightness)
    ||!Number.isFinite(measurement.straightness)||measurement.lengthMm<=0)
    reasons.push('PHYSICAL_METRICS_INVALID');
  return {compatible:reasons.length===0,reasons,propertyWarnings,
    dimensionChangeEvidence:{
      sourceOdMm:sourceStep.diameter,targetOdMm:targetSteps.map(step=>step.diameter),
      sourceWallMm:sourceStep.wall,targetWallMm:targetSteps.map(step=>step.wall),
    },
    lengthDeltaMm:Number(Math.abs(original.lengthMm-measurement.lengthMm).toFixed(3)),
    targetStraightness:Number(measurement.straightness.toFixed(6)),
    sourceStraightness:Number(original.straightness.toFixed(6))};
}
/**
 * Local arc-consistency constraints. Enumerates *all simple paths up to the
 * explicit segment cap* subject to internal node custody. Incomplete search
 * is never treated as evidence of a missing route. Even an unambiguous local
 * witness does not prove full graph identity, registration M1/M2 or uniqueness.
 */
export function inspectCiiA2PhysicalConstraints({
  joint,sourceGraphsById={},targetGraph,normalizedSourceShaById={},normalizedTargetSha256,
  policy={},maxEdgesPerSource=null,
}={}){
  if(joint?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'
    ||joint?.status!=='SHADOW_REVIEW_ONLY'||joint?.writerDispatchInstalled!==false
    ||joint?.transferPlan!==null||joint?.writeScope!==null)
    throw Error('A2P_NONWRITING_JOINT_HYPOTHESIS_REQUIRED');
  const applied=policyFor(policy);
  const target=physicalGraph(targetGraph,'TARGET',normalizedTargetSha256);
  const sourceIds=Object.keys(joint.provenance?.originalSourceShaById||{}).sort(compare);
  if(!sourceIds.length||Object.keys(sourceGraphsById).sort(compare).join('|')!==sourceIds.join('|'))
    throw Error('A2P_EXACT_SOURCE_GRAPH_MEMBER_SET_REQUIRED');
  const graphs=Object.fromEntries(sourceIds.map(s=>[s,physicalGraph(sourceGraphsById[s],'SOURCE',normalizedSourceShaById[s])]));
  const claims=new Map();
  const reserved=new Set();
  for(const h of joint.hypotheses||[]){
    const key=text(h.sourceNodeKey),tid=text(h.targetNodeId);
    const s=text(h.sourceRef?.sourceId);
    if(!sourceIds.includes(s)||h.sourceRef?.originalSha256!==joint.provenance.originalSourceShaById[s]
      ||h.targetRef?.originalSha256!==joint.provenance.originalTargetSha256
      ||key!==s+':'+h.sourceRef.physicalId||tid!==h.targetRef.physicalId)
      throw Error('A2P_CLAIM_ORIGINAL_CUSTODY_MISMATCH');
    if(!claims.has(key))claims.set(key,new Set());
    claims.get(key).add(tid);reserved.add(tid);
  }
  for(const row of joint.nodeRows||[]){
    if(row.targets?.length!==(claims.get(row.sourceNodeKey)?.size||0))
      throw Error('A2P_JOINT_CENSUS_CLAIM_MISMATCH');
  }
  const edgeRows=[],edgeLimit=maxEdgesPerSource==null?Infinity:numeric(maxEdgesPerSource,'maxEdgesPerSource',1,100000);
  for(const s of sourceIds){
    const edges=graphs[s].edges.slice().sort((a,b)=>compare(a.elementId,b.elementId));
    for(const edge of edges.slice(0,edgeLimit)){
      const sourceNodeFrom=text(edge.from),sourceNodeTo=text(edge.to);
      const starts=[...(claims.get(s+':'+sourceNodeFrom)||[])].sort(compare);
      const ends=[...(claims.get(s+':'+sourceNodeTo)||[])].sort(compare);
      const row={sourceMember:s,sourceElementId:String(edge.elementId),
        sourceEndpoints:[sourceNodeFrom,sourceNodeTo],candidatePairCount:starts.length*ends.length,
        pathWitnesses:[],invalidCandidatePairs:[],truncated:false};
      if(!starts.length||!ends.length){
        row.status='ENDPOINT_CANDIDATE_MISSING';row.blockers=['SOURCE_EDGE_ENDPOINT_NOT_IN_HYPOTHESIS_LEDGER'];
      }else if(starts.length*ends.length>applied.maxPairCombinations){
        row.status='SEARCH_INCOMPLETE';row.truncated=true;row.blockers=['CANDIDATE_PAIR_BOUND_EXCEEDED'];
      }else{
        const src=orient(edge,sourceNodeFrom,sourceNodeTo);
        for(const a of starts)for(const b of ends){
          // Candidate pair end nodes are selected TARGETs; internal nodes
          // already mentioned in ANY hypothesis are reserved.
          const search=traverse(target,a,b,applied,reserved);
          if(!search.stats.complete)row.truncated=true;
          let accepted=0;
          for(const route of search.paths){
            const fit=physicalMatch(src,route,applied);
            if(!fit.compatible){row.invalidCandidatePairs.push({targetEndpoints:[a,b],
              route:route.map(x=>x.id),reasons:fit.reasons});continue;}
            accepted++;
            row.pathWitnesses.push({
              targetEndpoints:[a,b],targetElementIds:route.map(x=>x.id),
              targetNodePath:[a,...route.map(x=>x.to)],
              sourceElementId:String(edge.elementId),
              relation:route.length===1?'ELEMENT_1_TO_1':'SOURCE_ELEMENT_TO_SUBDIVIDED_TARGET_PATH',
              ...fit,
            });
          }
          if(accepted===0&&search.paths.length===0)
            row.invalidCandidatePairs.push({targetEndpoints:[a,b],route:[],reasons:[
              search.stats.blocker||'NO_SIMPLE_TARGET_ROUTE_WITHIN_DECLARED_SEGMENT_BOUND',
              ...(Object.keys(search.stats.rejectionSummary||{}))]});
        }
        const signatures=new Set(row.pathWitnesses.map(w=>JSON.stringify([w.targetEndpoints,w.targetElementIds])));
        if(signatures.size!==row.pathWitnesses.length)throw Error('A2P_DUPLICATE_PHYSICAL_PATH_WITNESS');
        row.status=row.truncated?'SEARCH_INCOMPLETE':row.pathWitnesses.length>1?'LOCAL_PATH_AMBIGUOUS':
          row.pathWitnesses.length===1
            ? (row.pathWitnesses[0].propertyWarnings.length
              ? 'LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS':'LOCAL_PATH_SUPPORTED')
            :'NO_COMPATIBLE_BOUNDED_PATH';
        row.blockers=row.truncated?['PATH_ENUMERATION_INCOMPLETE']:
          row.pathWitnesses.length>1?['MULTIPLE_PHYSICALLY_PLAUSIBLE_PATHS']:
            row.pathWitnesses.length===0?['NO_LOCAL_PHYSICAL_ROUTE_QUALIFIED_WITHIN_BOUND']:
              ['GLOBAL_GRAPH_IDENTITY_AND_M1_M2_REGISTRATION_NOT_CERTIFIED'];
      }
      edgeRows.push(freeze(row));
    }
  }
  const summary=Object.fromEntries([...new Set(edgeRows.map(x=>x.status))].sort().map(state=>
    [state,edgeRows.filter(x=>x.status===state).length]));
  return freeze({
    schema:'CiiArchitectureA2PhysicalConstraintAudit.v1',
    status:'SHADOW_PHYSICAL_CONSTRAINTS_ONLY',
    provenance:{
      originalSourceSetSha256:joint.provenance.sourceSetSha256,
      originalTargetSha256:joint.provenance.originalTargetSha256,
      normalizedSourceShaById:Object.fromEntries(sourceIds.map(s=>[s,hash(normalizedSourceShaById[s],s)])),
      normalizedTargetSha256:hash(normalizedTargetSha256,'TARGET'),
      jointSnapshotDigest:joint.provenance.physicalOriginalSnapshotDigest,
    },
    policy:applied,policyDigest:digest(applied),sourceElementCountExamined:edgeRows.length,
    edgeRows,summary,certifiedNodeCount:0,certifiedElementCount:0,
    mutationPlan:null,writeScope:null,writerReady:false,
    limitations:['MAX_SEGMENTS_IS_A_LOCAL_DECLARED_SEARCH_SCOPE_NOT_GLOBAL_PATH_COMPLETENESS',
      'ONE_HOP_OR_SUBDIVISION_LOCAL_SUPPORT_IS_NOT_JOINT_GRAPH_CERTIFICATION',
      'M1_M2_GEOMETRIC_REGISTRATION_AND_BRANCH_ORIENTATION_UNRESOLVED',
      'UNSEEN_TARGET_PATHS_BEYOND_LIMIT_MAY_EXIST',
      'NODE_AND_ELEMENT_SHARED_CUSTODY_MUST_BE_RESOLVED_GLOBALLY',
      'OD_WALL_ARE_ENGINEERING_REVISION_OBSERVATIONS_NOT_HARD_NODE_IDENTITY_VETO',
      'NO_FAMILY_TRANSFER_OR_WRITER_ADMISSION'],
  });
}

export function assertCiiA2PhysicalNoWrite(result){
  if(result?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1')throw Error('A2P_SCHEMA_REQUIRED');
  throw Error('A2P_LOCAL_PHYSICAL_WITNESS_NEVER_WRITE_AUTHORITY');
}
