/**
 * CII102-F2-RCA-02: original physical 2-edge continuity on bounded TARGET
 * path hypotheses. Diagnostic ONLY: no Owner expected labels, no identity
 * certification, no SOURCE->TARGET mapping decision and no Writer import.
 *
 * Contract: given all 21 original both-endpoint-missing SOURCE factors and
 * the FULL geometry-only TARGET route sets (not first-12 display examples),
 * find possible oriented contiguous TARGET segments with distinct physical
 * TARGET ELEMENT custody and exactly the original shared SOURCE NODE.
 * Report arc-consistent chain support, not certified global correspondence.
 */
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const fixed=v=>Object.freeze(v);
function stableOptions(row,routes){
 const ans=[];
 const endpoints=row.sourceEndpoints.map(String);
 if(endpoints.length!==2||endpoints[0]===endpoints[1])
  throw Error('CII102_BAD_ORIGINAL_SOURCE_EDGE');
 for(let i=0;i<routes.length;i++){
  const route=routes[i],nodes=(route.targetNodePath||[]).map(String);
  const ids=(route.targetElementIds||[]).map(String);
  if(nodes.length!==ids.length+1||!ids.length||new Set(nodes).size!==nodes.length
   ||new Set(ids).size!==ids.length)
   throw Error('CII102_INVALID_TARGET_PATH_WITNESS:'+row.sourceElementKey);
  for(let dir=0;dir<2;dir++)ans.push(fixed({
   id:row.sourceElementKey+'|'+i+'|'+dir,
   routeIndex:i,orientation:dir?'REVERSED':'FORWARD',
   sourceEnds:fixed([...endpoints]),
   targetForSourceFrom:dir?nodes.at(-1):nodes[0],
   targetForSourceTo:dir?nodes[0]:nodes.at(-1),
   targetElements:fixed([...ids]),targetNodes:fixed([...nodes]),
   lengthDeltaMm:route.lengthResidualMm,
   originalGeometryOnly:true,identityCertified:false,writerReady:false
  }));
 }
 return ans;
}
function sharedSource(a,b){
 const common=a.sourceEndpoints.filter(x=>b.sourceEndpoints.includes(x));
 if(common.length!==1)throw Error('CII102_CHAIN_EXPECTS_EXACT_ONE_SHARED_SOURCE_NODE');
 return common[0];
}
function atSourceNode(opt,node){
 const i=opt.sourceEnds.indexOf(node);
 if(i<0)throw Error('CII102_MISSING_SHARED_SOURCE_NODE');
 return i===0?opt.targetForSourceFrom:opt.targetForSourceTo;
}
function compatible(a,b,node){
 const target=atSourceNode(a,node);
 if(target!==atSourceNode(b,node))return {ok:false,reason:'TARGET_SHARED_NODE_DISAGREES'};
 if(a.targetElements.some(x=>b.targetElements.includes(x)))
  return {ok:false,reason:'TARGET_ELEMENT_DOUBLE_CUSTODY'};
 const shared=a.targetNodes.filter(x=>b.targetNodes.includes(x));
 if(new Set(shared).size!==1||shared[0]!==target)
  return {ok:false,reason:'NON_SHARED_TARGET_NODE_COLLISION'};
 return {ok:true,reason:'LOCAL_TARGET_TOPOLOGY_CONTINUOUS_NO_CERTIFICATE'};
}
function edges(rows){
 const out=[];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const same=rows[i].sourceEndpoints.filter(n=>rows[j].sourceEndpoints.includes(n));
  if(same.length===1)out.push({
   a:rows[i].sourceElementKey,b:rows[j].sourceElementKey,sharedSourceNode:same[0]
  });
  else if(same.length>1)throw Error('CII102_SOURCE_PARALLEL_EDGE_NOT_CHAIN');
 }
 return out;
}
/** Source-custody authenticated by caller; no interpretation of accepted
 * correspondence: all candidates remain geometry-only under a local bound. */
export function auditCii102ChainContinuity(rows,routesByFactor){
 if(!Array.isArray(rows)||!rows.length||!routesByFactor
  ||typeof routesByFactor!=='object')
  throw Error('CII102_CHAIN_ORIGINAL_FACTOR_INPUT_REQUIRED');
 if(new Set(rows.map(r=>r.sourceElementKey)).size!==rows.length)
  throw Error('CII102_DUPLICATE_ORIGINAL_SOURCE_FACTOR');
 const ordered=[...rows].sort((a,b)=>cmp(a.sourceElementKey,b.sourceElementKey));
 const byKey=new Map(ordered.map(r=>[r.sourceElementKey,r]));
 const candidates=new Map(ordered.map(r=>{
  const routes=routesByFactor[r.sourceElementKey];
  if(!Array.isArray(routes))throw Error('CII102_MISSING_FULL_ORIGINAL_TARGET_ROUTES:'+r.sourceElementKey);
  return [r.sourceElementKey,stableOptions(r,routes)];
 }));
 const links=edges(ordered);
 const initialLinks=links.map(link=>{
  const a=candidates.get(link.a),b=candidates.get(link.b);
  const stats={compatible:0,mismatchedSharedNode:0,reusedTargetElement:0,
   collisionOfOtherNodes:0,comparisons:a.length*b.length};
  for(const x of a)for(const y of b){
   const proof=compatible(x,y,link.sharedSourceNode);
   if(proof.ok)stats.compatible++;
   else if(proof.reason==='TARGET_SHARED_NODE_DISAGREES')stats.mismatchedSharedNode++;
   else if(proof.reason==='TARGET_ELEMENT_DOUBLE_CUSTODY')stats.reusedTargetElement++;
   else stats.collisionOfOtherNodes++;
  }
  return {...link,...stats,certified:false};
 });
 // Strictly local pairwise arc consistency, not global injectivity or frame.
 // A zero domain only means no coherent path in the declared LIMITED evidence.
 const live=new Map([...candidates].map(([key,opts])=>[key,new Set(opts.map(x=>x.id))]));
 let rounds=0,changed=true;
 const maxRounds=ordered.length*2+2;
 while(changed){
  changed=false;rounds++;
  if(rounds>maxRounds)throw Error('CII102_ARC_PROPAGATION_BOUND_EXCEEDED');
  for(const l of links)for(const [left,right] of [[l.a,l.b],[l.b,l.a]]){
   const leftOpts=candidates.get(left),rightOpts=candidates.get(right);
   for(const x of leftOpts){
    if(!live.get(left).has(x.id))continue;
    const supported=rightOpts.some(y=>live.get(right).has(y.id)
     &&compatible(x,y,l.sharedSourceNode).ok);
    if(!supported){live.get(left).delete(x.id);changed=true;}
   }
  }
 }
 const factorRows=ordered.map(r=>{
  const originals=candidates.get(r.sourceElementKey);
  const surviving=originals.filter(x=>live.get(r.sourceElementKey).has(x.id));
  const uniqueRoutes=new Set(surviving.map(x=>x.routeIndex));
  return fixed({
   sourceElementKey:r.sourceElementKey,
   originalGeometryOnlyRoutes:originals.length/2,
   originalOrientedHypotheses:originals.length,
   locallyArcConsistentOrientedHypotheses:surviving.length,
   locallyArcConsistentPhysicalRoutes:uniqueRoutes.size,
   localState:links.some(l=>l.a===r.sourceElementKey||l.b===r.sourceElementKey)
    ?surviving.length?'LOCAL_CONTINUITY_POSSIBLE_NO_GLOBAL_CERTIFICATE':
      'NO_LOCAL_CONTINUITY_WITHIN_DECLARED_BOUNDS_UNKNOWN'
    :'ISOLATED_SOURCE_FACTOR_NO_PAIRWISE_CONSTRAINT',
   certifiedNodeCount:0,writerReady:false
  });
 });
 if(factorRows.some(x=>x.originalOrientedHypotheses!==2*x.originalGeometryOnlyRoutes))
  throw Error('CII102_ORIENTATION_POPULATION_NOT_PRESERVED');
 return fixed({
  schema:'CII102PhysicalChainContinuity.v1',
  authority:'ORIGINAL_TARGET_TOPOLOGY_ONLY_NONWRITING',
  sourceFactorCount:ordered.length,sharedNodePairCount:links.length,
  pairwiseChecks:fixed(initialLinks),
  propagationRounds:rounds,factors:fixed(factorRows),
  originalGeometryOnlyRoutes:factorRows.reduce((s,r)=>s+r.originalGeometryOnlyRoutes,0),
  locallyArcConsistentRoutes:factorRows.reduce((s,r)=>s+r.locallyArcConsistentPhysicalRoutes,0),
  zeroArcSupportedFactors:factorRows.filter(r=>r.localState==='NO_LOCAL_CONTINUITY_WITHIN_DECLARED_BOUNDS_UNKNOWN').length,
  hypothesesNotGlobalCertificates:true,
  excludedGuarantees:fixed(['NO_RIGID_SOURCE_TARGET_FRAME','NO_GLOBAL_NONLOCAL_TARGET_CUSTODY',
   'NO_OWNER_EXPECTED_RELATION_LIST','NO_FULL_GRAPH_CERTIFICATION',
   'BOUNDED_TARGET_ROUTE_SEARCH_ONLY']),
  certifiedNodeCount:0,certifiedElementCount:0,
  writerReady:false,transferPlan:null,writeScope:null,
 });
}
