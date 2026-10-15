/**
 * ARCH-01 / A2-SHADOW-03: immutable, bounded GLOBAL constraint propagation.
 * The result is *never* a certified physical match or executable mutation.
 * Candidate domains originate in A2-01; bounded paths originate in A2-02.
 * Neither an unambiguous solution inside these domains nor absent bounded
 * witnesses implies uniqueness/absence in the original complete TARGET.
 */
import { createHash } from 'node:crypto';

const SHA=/^[a-f0-9]{64}$/i;
const text=(x)=>String(x??'').trim();
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const digest=(x)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fixed=(x)=>{
  if(Array.isArray(x))return Object.freeze(x.map(fixed));
  if(x&&typeof x==='object')return Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,fixed(v)])));
  return x;
};
const k=(s,n)=>text(s)+':'+text(n);
const sorted=(x)=>[...x].sort(cmp);
function policyFor(x={}){
  const p={maxPropagationPasses:100,maxSearchStates:15000,maxDistinctSolutions:2,maxComponents:300,...x};
  for(const [key,max] of [
    ['maxPropagationPasses',1000],['maxSearchStates',100000],['maxDistinctSolutions',3],['maxComponents',10000]]){
    if(!Number.isSafeInteger(p[key])||p[key]<1||p[key]>max)
      throw Error('A203_INVALID_BOUNDED_POLICY:'+key);
  }
  if(p.maxDistinctSolutions<2)throw Error('A203_TWO_SOLUTIONS_REQUIRED_TO_WITNESS_AMBIGUITY');
  return fixed(p);
}
function assertBasis(joint,audit){
  if(joint?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'
    ||joint.status!=='SHADOW_REVIEW_ONLY'||joint.writerDispatchInstalled!==false
    ||joint.transferPlan!==null||joint.writeScope!==null)
    throw Error('A203_NON_WRITING_A201_REQUIRED');
  if(audit?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
    ||audit.status!=='SHADOW_PHYSICAL_CONSTRAINTS_ONLY'||audit.writerReady!==false
    ||audit.mutationPlan!==null||audit.writeScope!==null
    ||audit.certifiedNodeCount!==0||audit.certifiedElementCount!==0)
    throw Error('A203_NON_WRITING_A202_REQUIRED');
  if(audit.provenance?.originalSourceSetSha256!==joint.provenance?.sourceSetSha256
    ||audit.provenance?.originalTargetSha256!==joint.provenance?.originalTargetSha256
    ||audit.provenance?.jointSnapshotDigest!==joint.provenance?.physicalOriginalSnapshotDigest)
    throw Error('A203_ORIGINAL_INPUT_AND_JOINT_CUSTODY_MISMATCH');
  const sourceMembers=Object.keys(joint.provenance?.originalSourceShaById||{}).sort(cmp);
  if(!sourceMembers.length||sourceMembers.join('|')!==Object.keys(audit.provenance?.normalizedSourceShaById||{}).sort(cmp).join('|'))
    throw Error('A203_NORMALIZED_SOURCE_MEMBER_BASIS_MISSING');
  for(const sha of [
    joint.provenance.sourceSetSha256,joint.provenance.originalTargetSha256,
    audit.provenance.normalizedTargetSha256,audit.policyDigest,
    ...sourceMembers.map(s=>joint.provenance.originalSourceShaById[s]),
    ...sourceMembers.map(s=>audit.provenance.normalizedSourceShaById[s]),
  ])if(!SHA.test(text(sha)))throw Error('A203_INVALID_SHA256_PROVENANCE');
  return sourceMembers;
}
function materialize(joint,audit,members){
  const nodes=new Map(),factors=[],seenEdges=new Set();
  for(const row of joint.nodeRows||[]){
    const source=k(row.sourceId,row.sourceNodeId);
    if(!members.includes(row.sourceId)||row.sourceNodeKey!==source||nodes.has(source))
      throw Error('A203_DUPLICATE_OR_INVALID_SOURCE_NODE:'+source);
    const d=sorted(new Set(row.targets||[]));
    if(d.some(t=>!text(t)))throw Error('A203_EMPTY_TARGET_CANDIDATE');
    nodes.set(source,{key:source,sourceMember:row.sourceId,original:d});
  }
  if(!nodes.size||nodes.size!==joint.summary?.originalPhysicalSourceNodes)
    throw Error('A203_PHYSICAL_NODE_CENSUS_MISMATCH');
  for(const h of joint.hypotheses||[]){
    const source=k(h.sourceRef?.sourceId,h.sourceRef?.physicalId);
    if(h.sourceNodeKey!==source||!nodes.has(source)
      ||h.sourceRef?.originalSha256!==joint.provenance.originalSourceShaById[h.sourceRef.sourceId]
      ||h.targetRef?.originalSha256!==joint.provenance.originalTargetSha256
      ||h.targetNodeId!==h.targetRef.physicalId
      ||!nodes.get(source).original.includes(h.targetNodeId))
      throw Error('A203_UNATTESTED_OR_TAMPERED_PHYSICAL_CLAIM');
  }
  for(const row of audit.edgeRows||[]){
    const label=k(row.sourceMember,row.sourceElementId);
    if(!members.includes(row.sourceMember)||!text(row.sourceElementId)
      ||seenEdges.has(label)||!Array.isArray(row.sourceEndpoints)||row.sourceEndpoints.length!==2)
      throw Error('A203_DUPLICATE_OR_INVALID_SOURCE_ELEMENT:'+label);
    seenEdges.add(label);
    const ends=row.sourceEndpoints.map(n=>k(row.sourceMember,n));
    if(!ends.every(n=>nodes.has(n)))throw Error('A203_EDGE_ENDPOINT_OUTSIDE_SOURCE_CENSUS:'+label);
    if(ends[0]===ends[1])throw Error('A203_SELF_LOOP_REQUIRES_DISTINCT_PHYSICAL_FACTOR');
    const options=[];
    const seenPath=new Set();
    for(const w of row.pathWitnesses||[]){
      const a=text(w.targetEndpoints?.[0]),b=text(w.targetEndpoints?.[1]);
      if(!a||!b||!Array.isArray(w.targetNodePath)||!Array.isArray(w.targetElementIds)
        ||w.targetElementIds.length<1||w.targetNodePath.length!==w.targetElementIds.length+1
        ||w.targetNodePath[0]!==a||w.targetNodePath.at(-1)!==b
        ||w.sourceElementId!==row.sourceElementId)
        throw Error('A203_INVALID_ORDERED_TARGET_PATH_WITNESS:'+label);
      const mid=w.targetNodePath.slice(1,-1);
      if(mid.some(n=>!text(n))||new Set(w.targetNodePath).size!==w.targetNodePath.length
        ||w.targetElementIds.some(n=>!text(n))||new Set(w.targetElementIds).size!==w.targetElementIds.length)
        throw Error('A203_TARGET_PATH_NOT_SIMPLE:'+label);
      const pathKey=JSON.stringify([a,b,w.targetElementIds]);
      if(seenPath.has(pathKey))throw Error('A203_DUPLICATED_FACTOR_WITNESS:'+label);
      seenPath.add(pathKey);
      if(!nodes.get(ends[0]).original.includes(a)||!nodes.get(ends[1]).original.includes(b))
        throw Error('A203_PATH_NOT_IN_SOURCE_NODE_CANDIDATE_DOMAINS:'+label);
      options.push(fixed({
        sourceElementId:row.sourceElementId,sourceMember:row.sourceMember,
        targets:[a,b],targetElementIds:[...w.targetElementIds],
        internalNodes:mid,pathLength:w.targetElementIds.length,
        routeType:w.relation,propertyWarnings:w.propertyWarnings||[],
      }));
    }
    options.sort((a,b)=>cmp(JSON.stringify(a.targets),JSON.stringify(b.targets))
      ||cmp(a.targetElementIds.join('|'),b.targetElementIds.join('|')));
    if(row.truncated===true&&row.status!=='SEARCH_INCOMPLETE')
      throw Error('A203_TRUNCATED_FACTOR_MISLABELED:'+label);
    if(row.status==='SEARCH_INCOMPLETE'&&row.truncated!==true)
      throw Error('A203_INCOMPLETE_FACTOR_WITHOUT_TRUNCATION:'+label);
    if(row.status==='ENDPOINT_CANDIDATE_MISSING'&&row.candidatePairCount!==0)
      throw Error('A203_MISSING_ENDPOINT_INCONSISTENT:'+label);
    factors.push({key:label,ends,options,status:row.status,
      complete:row.truncated!==true&&options.length>0
        &&['LOCAL_PATH_SUPPORTED','LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS','LOCAL_PATH_AMBIGUOUS'].includes(row.status),
      reason:!options.length?(row.blockers||['NO_BOUNDED_PATH_WITNESS']):row.truncated?['PATH_ENUMERATION_INCOMPLETE']:[],
    });
  }
  if(factors.length!==audit.sourceElementCountExamined)
    throw Error('A203_SOURCE_ELEMENT_POPULATION_CHANGED');
  return {nodes,factors:factors.sort((a,b)=>cmp(a.key,b.key))};
}
function groups(nodes,factors,policy){
  const parent=new Map([...nodes.keys()].map(key=>[key,key]));
  function root(key){let x=key;while(parent.get(x)!==x)x=parent.get(x);
    let y=key;while(parent.get(y)!==x){const t=parent.get(y);parent.set(y,x);y=t;}return x;}
  function union(a,b){const x=root(a),y=root(b);if(x!==y)parent.set(cmp(x,y)<0?y:x,cmp(x,y)<0?x:y);}
  for(const f of factors)union(f.ends[0],f.ends[1]);
  const sharedTarget=new Map();
  for(const [key,node] of nodes)for(const t of node.original){
    if(sharedTarget.has(t))union(sharedTarget.get(t),key);
    else sharedTarget.set(t,key);
  }
  const occupancy=new Map();
  for(const f of factors)for(const op of f.options)for(const resource of [
    ...op.targetElementIds.map(v=>'E:'+v),...op.internalNodes.map(v=>'I:'+v)]){
    if(occupancy.has(resource))union(occupancy.get(resource),f.ends[0]);
    else occupancy.set(resource,f.ends[0]);
  }
  // A target subdivision interior cannot simultaneously be a physical
  // SOURCE NODE correspondence, even across disconnected SOURCE members.
  for(const [resource,owner] of occupancy) {
    if(resource.startsWith('I:')&&sharedTarget.has(resource.slice(2)))
      union(owner,sharedTarget.get(resource.slice(2)));
  }
  const result=new Map();
  for(const key of sorted(nodes.keys())){
    const r=root(key);
    if(!result.has(r))result.set(r,{nodes:[],factors:[]});
    result.get(r).nodes.push(key);
  }
  for(const f of factors)result.get(root(f.ends[0])).factors.push(f);
  const components=[...result.values()].sort((a,b)=>cmp(a.nodes[0],b.nodes[0]));
  if(components.length>policy.maxComponents)throw Error('A203_COMPONENT_BOUND_EXCEEDED');
  return components;
}
function consistentDomainPrune(component,nodes,policy){
  const domains=new Map(component.nodes.map(key=>[key,new Set(nodes.get(key).original)]));
  const factors=component.factors.map(f=>({...f,options:[...f.options]}));
  let pass=0,changed=true,contradiction=null;
  while(changed){
    if(++pass>policy.maxPropagationPasses)
      return {status:'INCOMPLETE',domains,factors,passes:pass,reason:'ARC_PROPAGATION_BOUND'};
    changed=false;
    for(const factor of factors){
      const existing=factor.options.length;
      factor.options=factor.options.filter(op=>
        domains.get(factor.ends[0]).has(op.targets[0])&&domains.get(factor.ends[1]).has(op.targets[1]));
      if(existing!==factor.options.length)changed=true;
      if(!factor.options.length){contradiction='EMPTY_ELEMENT_PATH_FACTOR:'+factor.key;break;}
    }
    if(contradiction)break;
    for(const key of component.nodes){
      const incident=factors.filter(f=>f.ends.includes(key));
      if(!incident.length)continue;
      let valid=null;
      for(const f of incident){
        const side=f.ends[0]===key?0:1;
        const supported=new Set(f.options.map(x=>x.targets[side]));
        valid=valid===null?supported:new Set([...valid].filter(x=>supported.has(x)));
      }
      const domain=domains.get(key),next=new Set([...domain].filter(x=>valid.has(x)));
      if(!next.size){contradiction='EMPTY_NODE_DOMAIN:'+key;break;}
      if(next.size!==domain.size){domains.set(key,next);changed=true;}
    }
    if(contradiction)break;
    const singleOwners=new Map();
    for(const [key,d] of domains){
      if(d.size!==1)continue;
      const target=[...d][0];
      if(singleOwners.has(target)&&singleOwners.get(target)!==key){
        contradiction='TWO_SOURCE_NODES_CLAIM_IDENTICAL_TARGET:'+target;break;
      }
      singleOwners.set(target,key);
    }
    if(contradiction)break;
    for(const [key,d] of domains){
      if(d.size===1)continue;
      const next=new Set([...d].filter(v=>!singleOwners.has(v)));
      if(!next.size){contradiction='GLOBAL_TARGET_CUSTODY_EXHAUSTED:'+key;break;}
      if(next.size!==d.size){domains.set(key,next);changed=true;}
    }
    if(contradiction)break;
  }
  return {status:contradiction?'CONTRADICTION':'FIXPOINT',domains,factors,passes:pass,reason:contradiction};
}
function search(component,prop,policy){
  let states=0,truncated=false;
  const samples=[];
  const ordering=[...prop.factors].sort((a,b)=>a.options.length-b.options.length||cmp(a.key,b.key));
  const assignments=new Map(),targetOwner=new Map(),usedElements=new Set(),usedInternal=new Set();
  function run(idx,picked){
    if(truncated||samples.length>=policy.maxDistinctSolutions)return;
    if(++states>policy.maxSearchStates){truncated=true;return;}
    if(idx>=ordering.length){
      if(assignments.size!==component.nodes.length)return; // isolated SOURCE nodes require separate proof
      const sortedAssignments=Object.fromEntries([...assignments].sort(([a],[b])=>cmp(a,b)));
      samples.push({
        nodeAssignments:sortedAssignments,
        elementPaths: Object.fromEntries([...picked].sort(([a],[b])=>cmp(a,b))
          .map(([key,op])=>[key,{targets:op.targets,targetElementIds:op.targetElementIds,
            internalNodes:op.internalNodes}])),
      });
      return;
    }
    const factor=ordering[idx];
    for(const op of factor.options){
      if(truncated||samples.length>=policy.maxDistinctSolutions)return;
      const additions=[];
      let invalid=op.targetElementIds.some(e=>usedElements.has(e))
        ||op.internalNodes.some(n=>usedInternal.has(n)||targetOwner.has(n));
      if(invalid)continue;
      for(let i=0;i<2&&!invalid;i++){
        const key=factor.ends[i],target=op.targets[i];
        if(assignments.has(key)){
          if(assignments.get(key)!==target)invalid=true;
        }else if(targetOwner.has(target)||usedInternal.has(target)){
          invalid=true;
        }else{
          assignments.set(key,target);targetOwner.set(target,key);
          additions.push([key,target]);
        }
      }
      if(!invalid){
        for(const id of op.targetElementIds)usedElements.add(id);
        for(const n of op.internalNodes)usedInternal.add(n);
        picked.set(factor.key,op);
        run(idx+1,picked);
        picked.delete(factor.key);
        for(const n of op.internalNodes)usedInternal.delete(n);
        for(const id of op.targetElementIds)usedElements.delete(id);
      }
      for(const [key,target] of additions){assignments.delete(key);targetOwner.delete(target);}
    }
  }
  run(0,new Map());
  return {states,truncated,solutions:samples};
}
export function solveCiiA2GlobalShadow({joint,pathAudit,policy={}}={}){
  const p=policyFor(policy);
  const members=assertBasis(joint,pathAudit);
  const {nodes,factors}=materialize(joint,pathAudit,members);
  const comps=groups(nodes,factors,p);
  const results=[];
  for(const [index,comp] of comps.entries()){
    const missing=comp.factors.filter(f=>!f.complete);
    const isolated=comp.nodes.filter(key=>!comp.factors.some(f=>f.ends.includes(key)));
    if(missing.length||isolated.length){
      results.push(fixed({index,sourceNodes:comp.nodes,sourceElements:comp.factors.map(f=>f.key),
        status:'INCOMPLETE_PHYSICAL_EVIDENCE',reason:'GLOBAL_ASSIGNMENT_REQUIRES_COMPLETE_NODE_AND_ELEMENT_PATH_FACTORS',
        factorsNotQualified:missing.map(f=>({sourceElementId:f.key,status:f.status,reasons:f.reason})),
        isolatedSourceNodes:isolated,propagationPasses:0,searchStates:0,
        distinctSolutionWitnesses:0,solutions:[],certified:false}));
      continue;
    }
    const pr=consistentDomainPrune(comp,nodes,p);
    if(pr.status==='INCOMPLETE'){
      results.push(fixed({index,sourceNodes:comp.nodes,sourceElements:comp.factors.map(f=>f.key),
        status:'SEARCH_INCOMPLETE',reason:pr.reason,
        propagationPasses:pr.passes,searchStates:0,distinctSolutionWitnesses:0,
        solutions:[],certified:false}));
      continue;
    }
    const contradiction=pr.status==='CONTRADICTION';
    const result=contradiction?{states:0,truncated:false,solutions:[]}:search(comp,pr,p);
    const status=result.truncated?'SEARCH_INCOMPLETE':
      result.solutions.length>=2?'MULTIPLE_GLOBAL_ASSIGNMENTS_WITHIN_BOUNDS':
        !result.solutions.length?'NO_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET':
          'ONE_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET';
    results.push(fixed({
      index,sourceNodes:comp.nodes,sourceElements:comp.factors.map(f=>f.key),
      status,reason:contradiction?pr.reason:result.truncated?'GLOBAL_SEARCH_STATE_BOUND_EXCEEDED':
        result.solutions.length>=2?'TWO_DISTINCT_GLOBAL_ASSIGNMENTS_PROVED':
          result.solutions.length===0?'CANDIDATE_DOMAINS_GLOBALLY_INCONSISTENT':
            'ONE_SOLUTION_IN_BOUNDED_LOCAL_WITNESSES_NOT_GLOBAL_CERTIFICATE',
      initialNodeDomains:Object.fromEntries(comp.nodes.map(k=>[k,nodes.get(k).original])),
      propagatedNodeDomains:Object.fromEntries(comp.nodes.map(k=>[k,sorted(pr.domains.get(k))])),
      propagationPasses:pr.passes,searchStates:result.states,
      distinctSolutionWitnesses:result.solutions.length,
      enumerationComplete:!result.truncated&&result.solutions.length<2,
      solutions:result.solutions,certified:false,
    }));
  }
  const stateCount={};
  for(const r of results)stateCount[r.status]=(stateCount[r.status]||0)+1;
  return fixed({
    schema:'CiiArchitectureA203GlobalConstraintShadow.v1',status:'GLOBAL_SHADOW_NON_WRITING',
    provenance:{originalSourceSetSha256:joint.provenance.sourceSetSha256,
      originalTargetSha256:joint.provenance.originalTargetSha256,
      jointSnapshotDigest:joint.provenance.physicalOriginalSnapshotDigest,
      normalizedTargetSha256:pathAudit.provenance.normalizedTargetSha256,
      pathConstraintPolicyDigest:pathAudit.policyDigest},
    policy:p,policyDigest:digest(p),
    originalPhysicalSourceNodeCount:nodes.size,sourceElementFactorCount:factors.length,
    connectedConstraintComponents:results.length,componentStates:stateCount,
    components:results,certifiedNodeCount:0,certifiedElementCount:0,
    correspondentCertificates:[],writeScope:null,transferPlan:null,writerReady:false,
    limitations:[
      'GLOBAL_PROPAGATION_ONLY_WITHIN_A2_01_CANDIDATE_AND_A2_02_BOUNDED_PATH_WITNESS_SETS',
      'M1_M2_GEOMETRIC_REGISTRATION_AND_COMPLETE_TARGET_SEARCH_NOT_CERTIFIED',
      'ENGINEERING_OD_WALL_ARE_REVISION_OBSERVATIONS_NOT_IDENTITY_DISQUALIFIERS',
      'CROSS_MEMBER_TARGET_NODE_AND_ELEMENT_OCCUPANCY_CONSERVATIVELY_INJECTIVE',
      'A_UNIQUE_CANDIDATE_ASSIGNMENT_IS_NOT_AN_INDEPENDENT_PHYSICAL_CERTIFICATE',
      'NO_RESTRAINT_OR_P1_WRITER_ADMISSION',
    ],
  });
}
export function assertCiiA203NoWrite(audit){
  if(audit?.schema!=='CiiArchitectureA203GlobalConstraintShadow.v1')
    throw Error('A203_GLOBAL_SHADOW_SCHEMA_REQUIRED');
  throw Error('A203_GLOBAL_CONSISTENCY_IS_NEVER_WRITE_AUTHORITY');
}
