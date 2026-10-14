/**
 * ARCH-01 A2-SHADOW-04: recover missing endpoint *hypotheses*, never identity.
 *
 * Work backward from an original SOURCE edge with exactly one known NODE
 * target hypothesis. Enumerate bounded, ordered TARGET path continuations.
 * New evidence may seed a later round, but that lineage stays speculative.
 * No global acceptance, no write, and no name-based or OD/WALL identity veto.
 */
import { createHash } from 'node:crypto';

const HASH=/^[0-9a-f]{64}$/i;
const S=(x)=>String(x??'').trim();
const cmp=(a,b)=>S(a).localeCompare(S(b),undefined,{numeric:true});
const sha=(x)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function frozen(x){
  if(Array.isArray(x))return Object.freeze(x.map(frozen));
  if(x&&typeof x==='object')return Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,frozen(v)])));
  return x;
}
const nodeKey=(s,n)=>S(s)+':'+S(n);
const defaultPolicy=Object.freeze({
  maxRounds:2,maxTargetPathSegments:4,maxTraversalVisitsPerSeed:750,
  maxGlobalTraversalVisits:30000,maxProposals:400,maxWitnessesPerProposal:4,
  pathLengthToleranceMm:25,minStraightness:0.995,straightnessTolerance:0.01,
  diameterWarningToleranceMm:2,wallWarningToleranceMm:1,
});
function getPolicy(x={}){
  const p={...defaultPolicy,...x};
  for(const [key,lo,hi] of [
    ['maxRounds',1,3],['maxTargetPathSegments',1,8],
    ['maxTraversalVisitsPerSeed',1,10000],['maxGlobalTraversalVisits',1,200000],
    ['maxProposals',1,2000],['maxWitnessesPerProposal',1,20],
    ['pathLengthToleranceMm',0,10000],['minStraightness',0,1],
    ['straightnessTolerance',0,1],['diameterWarningToleranceMm',0,100],
    ['wallWarningToleranceMm',0,100],
  ]){
    if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<lo||p[key]>hi)
      throw Error('A204_BAD_POLICY:'+key);
    if(key.startsWith('max')&&!Number.isSafeInteger(p[key]))
      throw Error('A204_BAD_INTEGER_POLICY:'+key);
  }
  return frozen(p);
}
function checkJoint(joint,audit){
  if(joint?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'||joint?.status!=='SHADOW_REVIEW_ONLY'
    ||joint.writerDispatchInstalled!==false||joint.transferPlan!==null||joint.writeScope!==null)
    throw Error('A204_A201_NON_WRITING_JOINT_REQUIRED');
  if(audit?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
    ||audit.status!=='SHADOW_PHYSICAL_CONSTRAINTS_ONLY'
    ||audit.writerReady!==false||audit.certifiedNodeCount!==0||audit.certifiedElementCount!==0)
    throw Error('A204_A202_PHYSICAL_SHADOW_REQUIRED');
  if(audit.provenance.originalSourceSetSha256!==joint.provenance.sourceSetSha256
    ||audit.provenance.originalTargetSha256!==joint.provenance.originalTargetSha256
    ||audit.provenance.jointSnapshotDigest!==joint.provenance.physicalOriginalSnapshotDigest)
    throw Error('A204_SOURCE_TARGET_CUSTODY_DIFFERENCE');
  for(const value of [
    joint.provenance.sourceSetSha256,joint.provenance.originalTargetSha256,
    audit.provenance.normalizedTargetSha256,
    ...Object.values(audit.provenance.normalizedSourceShaById||{}),
  ])if(!HASH.test(S(value)))throw Error('A204_SHA256_REQUIRED');
}
function checkGraph(graph,side,normalizedHash){
  if(graph?.side!==side||graph.documentId!==side+':'+normalizedHash
    ||!(graph.adjacency instanceof Map)||!Array.isArray(graph.edges))
    throw Error('A204_CANONICAL_GRAPH_CUSTODY_REQUIRED:'+side);
  const ids=new Set();
  for(const edge of graph.edges){
    if(!S(edge.elementId)||ids.has(edge.elementId)||!S(edge.from)||!S(edge.to)
      ||!(graph.adjacency.get(S(edge.from))||[]).some(e=>e.elementId===edge.elementId)
      ||!(graph.adjacency.get(S(edge.to))||[]).some(e=>e.elementId===edge.elementId))
      throw Error('A204_INVALID_GRAPH_EDGE_OR_INCIDENCE:'+side);
    ids.add(edge.elementId);
  }
}
function other(edge,n){return S(edge.from)===n?S(edge.to):S(edge.from);}
function vector(step){const backwards=step.from!==S(step.edge.from);const sign=backwards?-1:1;
  return [Number(step.edge.dx)*sign,Number(step.edge.dy)*sign,Number(step.edge.dz)*sign];}
function pathMetric(steps){
  const length=steps.reduce((x,s)=>x+Number(s.edge.lengthMm),0);
  const v=steps.reduce((x,s)=>x.map((e,i)=>e+vector(s)[i]),[0,0,0]);
  return {length,straightness:Math.hypot(...v)/Math.max(length,1)};
}
function pathTest(edge,steps,p){
  if(!steps.length)return {ok:false,reason:'EMPTY_TARGET_ROUTE'};
  const sourceLen=Number(edge.lengthMm);
  const sourceVecLen=Math.hypot(Number(edge.dx),Number(edge.dy),Number(edge.dz));
  const {length,straightness}=pathMetric(steps);
  if(!Number.isFinite(sourceLen)||sourceLen<=0||!Number.isFinite(length)||length<=0)
    return {ok:false,reason:'MISSING_PHYSICAL_LENGTH'};
  if(Math.abs(length-sourceLen)>p.pathLengthToleranceMm)return {ok:false,reason:'PATH_LENGTH_MISMATCH'};
  if(steps.length>1&&S(edge.componentKind)!=='PIPE')
    return {ok:false,reason:'NONPIPE_SUBDIVISION'};
  if(steps.some(s=>S(s.edge.componentKind)!==S(edge.componentKind)))
    return {ok:false,reason:'COMPONENT_KIND_DIFFERS'};
  if(steps.length>1&&(straightness<p.minStraightness
    ||Math.abs(straightness-sourceVecLen/sourceLen)>p.straightnessTolerance))
    return {ok:false,reason:'SUBDIVIDED_PATH_NOT_STRAIGHT'};
  const ods=steps.map(s=>Number(s.edge.diameter)),walls=steps.map(s=>Number(s.edge.wall));
  if(ods.some(x=>!Number.isFinite(x))||walls.some(x=>!Number.isFinite(x))
    ||!Number.isFinite(Number(edge.diameter))||!Number.isFinite(Number(edge.wall)))
    return {ok:false,reason:'DIMENSION_EVIDENCE_MALFORMED'};
  const propertyWarnings=[];
  if(ods.some(v=>Math.abs(v-Number(edge.diameter))>p.diameterWarningToleranceMm))
    propertyWarnings.push('OD_ENGINEERING_REVISION_OBSERVATION');
  if(walls.some(v=>Math.abs(v-Number(edge.wall))>p.wallWarningToleranceMm))
    propertyWarnings.push('WALL_ENGINEERING_REVISION_OBSERVATION');
  return {ok:true,lengthDeltaMm:Number(Math.abs(length-sourceLen).toFixed(3)),
    targetStraightness:Number(straightness.toFixed(6)),propertyWarnings};
}
function traverse(graph,start,sourceEdge,policy,remaining){
  const proposals=[],reasons={},origin=S(start),seenNodes=new Set([origin]);
  const result={visits:0,truncated:false,proposals,reasons};
  const maxLength=Number(sourceEdge.lengthMm)+policy.pathLengthToleranceMm;
  function remember(name){reasons[name]=(reasons[name]||0)+1;}
  function dfs(node,steps,length){
    if(result.truncated)return;
    if(result.visits>=policy.maxTraversalVisitsPerSeed||result.visits>=remaining){
      result.truncated=true;return;
    }
    result.visits++;
    if(steps.length){
      const witness=pathTest(sourceEdge,steps,policy);
      if(witness.ok)proposals.push({targetNodeId:node,
        targetElementIds:steps.map(x=>S(x.edge.elementId)),
        targetNodePath:[origin,...steps.map(x=>x.to)],...witness});
      else remember(witness.reason);
    }
    if(steps.length>=policy.maxTargetPathSegments)return;
    for(const edge of [...(graph.adjacency.get(node)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
      const next=other(edge,node);
      if(seenNodes.has(next))continue;
      const d=Number(edge.lengthMm);
      if(!Number.isFinite(d)||d<=0){remember('INVALID_TARGET_EDGE_LENGTH');continue;}
      if(length+d>maxLength){remember('TARGET_PATH_EXCEEDS_SOURCE_LENGTH_BOUND');continue;}
      // A target path may END at a tee/junction; only intermediate nodes
      // must have degree two when continuing through a subdivision.
      const step={edge,from:node,to:next};
      const nextSteps=[...steps,step];
      seenNodes.add(next);
      dfs(next,nextSteps,length+d);
      seenNodes.delete(next);
      if(result.truncated)return;
      if((graph.adjacency.get(next)||[]).length!==2)
        remember('PATH_MAY_NOT_CONTINUE_THROUGH_BRANCH');
    }
  }
  dfs(origin,[],0);
  return result;
}
function severityFor(proposal,claims){
  const claimers=[...(claims.get(proposal.targetNodeId)||[])].filter(x=>x!==proposal.sourceNodeKey);
  return claimers.length?['EXISTING_OTHER_SOURCE_TARGET_CUSTODY_CLAIMS']:[];
}
/**
 * Generates a deterministic inventory of provisional hypotheses, including
 * speculative rounds. Do not union these into runtime write authority.
 */
export function recoverCiiA2FrontierHypotheses({
  joint,pathAudit,sourceGraphsById={},targetGraph,policy={},
}={}){
  checkJoint(joint,pathAudit);
  const p=getPolicy(policy);
  const members=Object.keys(joint.provenance.originalSourceShaById||{}).sort(cmp);
  if(members.length<2||members.join('|')!==Object.keys(sourceGraphsById).sort(cmp).join('|')
    ||members.join('|')!==Object.keys(pathAudit.provenance.normalizedSourceShaById||{}).sort(cmp).join('|'))
    throw Error('A204_SOURCE_MEMBER_GRAPH_INVENTORY_MISMATCH');
  for(const s of members)checkGraph(sourceGraphsById[s],'SOURCE',pathAudit.provenance.normalizedSourceShaById[s]);
  checkGraph(targetGraph,'TARGET',pathAudit.provenance.normalizedTargetSha256);
  const physicalRows=new Map();
  for(const row of joint.nodeRows||[]){
    const key=nodeKey(row.sourceId,row.sourceNodeId);
    if(row.sourceNodeKey!==key||physicalRows.has(key))
      throw Error('A204_DUPLICATE_OR_WRONG_SOURCE_NODE:'+key);
    physicalRows.set(key,row);
  }
  if(physicalRows.size!==joint.summary.originalPhysicalSourceNodes)
    throw Error('A204_SOURCE_NODE_POPULATION_INCOMPLETE');
  const domain=new Map([...physicalRows].map(([key,row])=>[key,new Set(row.targets||[])]));
  const originalClaims=new Map();
  for(const [key,targets] of domain)for(const target of targets){
    if(!originalClaims.has(target))originalClaims.set(target,new Set());
    originalClaims.get(target).add(key);
  }
  for(const h of joint.hypotheses||[]){
    if(!domain.get(h.sourceNodeKey)?.has(h.targetNodeId)
      ||h.sourceRef?.originalSha256!==joint.provenance.originalSourceShaById[h.sourceRef.sourceId]
      ||h.targetRef?.originalSha256!==joint.provenance.originalTargetSha256)
      throw Error('A204_UNATTESTED_OR_STALE_CANDIDATE');
  }
  const edgesByMember=Object.fromEntries(members.map(s=>[
    s,new Map(sourceGraphsById[s].edges.map(e=>[S(e.elementId),e]))]));
  const missingFactors=(pathAudit.edgeRows||[])
    .filter(r=>r.status==='ENDPOINT_CANDIDATE_MISSING')
    .sort((a,b)=>cmp(a.sourceMember,b.sourceMember)||cmp(a.sourceElementId,b.sourceElementId));
  const allFactors=pathAudit.edgeRows||[];
  if(new Set(allFactors.map(r=>nodeKey(r.sourceMember,r.sourceElementId))).size!==allFactors.length
    ||allFactors.length!==pathAudit.sourceElementCountExamined)
    throw Error('A204_PHYSICAL_ELEMENT_CENSUS_INVALID');
  const rootCauses=[];
  for(const f of missingFactors){
    const edge=edgesByMember[f.sourceMember]?.get(S(f.sourceElementId));
    if(!edge||!Array.isArray(f.sourceEndpoints)||f.sourceEndpoints.length!==2
      ||f.sourceEndpoints[0]!==S(edge.from)||f.sourceEndpoints[1]!==S(edge.to))
      throw Error('A204_MISSING_FACTOR_NOT_ORIGINAL_EDGE:'+S(f.sourceElementId));
    const [a,b]=f.sourceEndpoints.map(n=>nodeKey(f.sourceMember,n));
    if(!domain.has(a)||!domain.has(b))throw Error('A204_FACTOR_ENDPOINT_OUTSIDE_SOURCE_NODES');
    const haveA=domain.get(a).size>0,haveB=domain.get(b).size>0;
    rootCauses.push(frozen({
      sourceMember:f.sourceMember,sourceElementId:f.sourceElementId,sourceEndpoints:f.sourceEndpoints,
      currentTargetCandidateCounts:[domain.get(a).size,domain.get(b).size],
      primaryCause:!haveA&&!haveB?'BOTH_ENDPOINT_HYPOTHESES_ABSENT':
        !haveA?'FROM_ENDPOINT_HYPOTHESES_ABSENT':'TO_ENDPOINT_HYPOTHESES_ABSENT',
      upstreamCause:'NO_EMITTED_OR_ADMITTED_NODE_HYPOTHESIS_NOT_PROOF_TARGET_ABSENCE',
    }));
  }
  const proposals=new Map(),rounds=[],rawWitnessCount=0,seedVisits=0;
  let globallyTruncated=false;
  for(let round=1;round<=p.maxRounds;round++){
    const fresh=[];
    let seeds=0,roundVisits=0,roundTruncated=false;
    const boundary=allFactors.slice().sort((a,b)=>cmp(a.sourceMember,b.sourceMember)||cmp(a.sourceElementId,b.sourceElementId));
    for(const f of boundary){
      const edge=edgesByMember[f.sourceMember]?.get(S(f.sourceElementId));
      if(!edge)throw Error('A204_FACTOR_UNKNOWN_ORIGINAL_EDGE:'+f.sourceElementId);
      const [a,b]=[nodeKey(f.sourceMember,S(edge.from)),nodeKey(f.sourceMember,S(edge.to))];
      if(!domain.has(a)||!domain.has(b))throw Error('A204_EDGE_ENDPOINT_OUTSIDE_CENSUS:'+f.sourceElementId);
      const pairs=[{from:a,to:b},{from:b,to:a}];
      for(const {from,to} of pairs){
        if(domain.get(to).size||!domain.get(from).size)continue;
        for(const anchor of [...domain.get(from)].sort(cmp)){
          if(seedVisits>=p.maxGlobalTraversalVisits){globallyTruncated=true;roundTruncated=true;break;}
          seeds++;
          const result=traverse(targetGraph,anchor,edge,p,p.maxGlobalTraversalVisits-seedVisits);
          seedVisits+=result.visits;roundVisits+=result.visits;
          if(result.truncated){roundTruncated=true;globallyTruncated=true;}
          for(const witness of result.proposals){
            if(witness.targetNodeId===anchor)continue;
            const key=JSON.stringify([to,witness.targetNodeId]);
            if(!proposals.has(key)&&proposals.size>=p.maxProposals){
              globallyTruncated=true;roundTruncated=true;break;
            }
            const sourceMember=f.sourceMember,sourceNodeId=to.slice(sourceMember.length+1);
            if(!proposals.has(key))proposals.set(key,{
              sourceNodeKey:to,sourceId:sourceMember,sourceNodeId,
              targetNodeId:witness.targetNodeId,round,
              hypotheses:[{
                origin:'A2_04_SPECULATIVE_TOPOLOGY_FRONTIER',fromSourceNode:from,
                fromTargetNode:anchor,sourceElementId:f.sourceElementId,
                targetElementIds:witness.targetElementIds,targetNodePath:witness.targetNodePath,
                propertyWarnings:witness.propertyWarnings,
                lengthDeltaMm:witness.lengthDeltaMm,
                targetStraightness:witness.targetStraightness,
              }],
            });
            else{
              const row=proposals.get(key);
              const w=JSON.stringify([f.sourceElementId,anchor,witness.targetElementIds]);
              if(!row.hypotheses.some(old=>JSON.stringify([old.sourceElementId,old.fromTargetNode,old.targetElementIds])===w)
                &&row.hypotheses.length<p.maxWitnessesPerProposal)
                row.hypotheses.push({
                  origin:'A2_04_SPECULATIVE_TOPOLOGY_FRONTIER',fromSourceNode:from,
                  fromTargetNode:anchor,sourceElementId:f.sourceElementId,
                  targetElementIds:witness.targetElementIds,targetNodePath:witness.targetNodePath,
                  propertyWarnings:witness.propertyWarnings,
                  lengthDeltaMm:witness.lengthDeltaMm,
                  targetStraightness:witness.targetStraightness,
                });
            }
            rawWitnessCount++;
          }
          if(roundTruncated)break;
        }
        if(roundTruncated)break;
      }
      if(roundTruncated)break;
    }
    // Only newly suggested endpoint claims feed subsequent speculative rounds,
    // not current-round propagation (prevents order-dependent cascading).
    for(const item of [...proposals.values()].filter(x=>x.round===round)){
      if(!domain.get(item.sourceNodeKey).has(item.targetNodeId)){
        fresh.push(item);domain.get(item.sourceNodeKey).add(item.targetNodeId);
      }
    }
    rounds.push(frozen({
      round,seedCount:seeds,targetGraphVisits:roundVisits,distinctNewHypotheses:fresh.length,
      sourceNodesGainingHypotheses:new Set(fresh.map(x=>x.sourceNodeKey)).size,
      truncated:roundTruncated,
    }));
    if(roundTruncated||!fresh.length)break;
  }
  const items=[...proposals.values()].sort((a,b)=>cmp(a.sourceNodeKey,b.sourceNodeKey)||cmp(a.targetNodeId,b.targetNodeId))
    .map(item=>{
      const probes=[...item.hypotheses].sort((a,b)=>cmp(a.fromSourceNode,b.fromSourceNode)
        ||cmp(a.fromTargetNode,b.fromTargetNode)||cmp(a.sourceElementId,b.sourceElementId)
        ||cmp(a.targetElementIds.join('|'),b.targetElementIds.join('|')));
      return frozen({
        ...item, hypotheses:probes,
        claimStatus:'RECOVERED_UNVERIFIED_TOPOLOGY_HYPOTHESIS',
        sharedTargetWarnings:severityFor(item,originalClaims),
        originalTargetSha256:joint.provenance.originalTargetSha256,
        sourceOriginalSha256:joint.provenance.originalSourceShaById[item.sourceId],
        evidenceDigest:sha({sourceNodeKey:item.sourceNodeKey,targetNodeId:item.targetNodeId,probes}),
        certified:false,canBindScope:false,
      });
    });
  const domainAfter=new Map([...physicalRows].map(([key,row])=>[key,new Set(row.targets||[])]));
  for(const row of items)domainAfter.get(row.sourceNodeKey).add(row.targetNodeId);
  const remaining=missingFactors.filter(f=>f.sourceEndpoints.some(n=>!(domainAfter.get(nodeKey(f.sourceMember,n))?.size)));
  const rootCounts={};
  for(const row of rootCauses)rootCounts[row.primaryCause]=(rootCounts[row.primaryCause]||0)+1;
  return frozen({
    schema:'CiiArchitectureA204FrontierRecovery.v1',status:'PROVISIONAL_FRONTIER_HYPOTHESES_NONWRITING',
    provenance:{
      originalSourceSetSha256:joint.provenance.sourceSetSha256,
      originalTargetSha256:joint.provenance.originalTargetSha256,
      physicalOriginalSnapshotDigest:joint.provenance.physicalOriginalSnapshotDigest,
      normalizedTargetSha256:pathAudit.provenance.normalizedTargetSha256,
      normalizedSourceShaById:pathAudit.provenance.normalizedSourceShaById,
      parentJointCandidateDigest:sha(joint.hypotheses.map(x=>[x.sourceNodeKey,x.targetNodeId])),
      parentLocalPathPolicyDigest:pathAudit.policyDigest,
    },
    policy:p,policyDigest:sha(p),rootCauses,rootCauseCounts:rootCounts,
    originalMissingPhysicalElementFactors:missingFactors.length,
    sourceNodesOriginallyUnmapped:[...physicalRows].filter(([,r])=>!r.targets?.length).map(([key])=>key),
    recoveryRoundEvidence:rounds,
    proposals:items,
    newDistinctHypotheses:items.length,
    sourceNodesWithNewHypotheses:new Set(items.map(x=>x.sourceNodeKey)).size,
    rawPathWitnessesEncountered:rawWitnessCount,
    remainingFactorsWithoutBothEndpointHypotheses:remaining.length,
    remainingOriginalMissingFactors:remaining.map(x=>nodeKey(x.sourceMember,x.sourceElementId)),
    statusFlags:[
      ...(globallyTruncated?['ENUMERATION_TRUNCATED_NO_COMPLETENESS_CLAIM']:[]),
      'RECOVERED_CANDIDATES_ARE_NOT_PHYSICAL_CERTIFICATES',
      'LOCAL_PATH_SEARCH_NOT_EXHAUSTIVE_TARGET_NETWORK',
      'MANUAL_AND_AUTOMATIC_CANDIDATES_NEVER_REPLACED',
    ],
    certifiedNodeCount:0,certifiedElementCount:0,
    writerReady:false,correspondenceCertificates:[],transferPlan:null,writeScope:null,
  });
}
export function assertCiiA204NoWrite(result){
  if(result?.schema!=='CiiArchitectureA204FrontierRecovery.v1')throw Error('A204_SCHEMA_REQUIRED');
  throw Error('A204_FRONTIER_HYPOTHESES_NEVER_WRITER_AUTHORITY');
}
