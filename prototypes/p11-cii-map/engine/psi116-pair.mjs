import { require } from '../kit/core.mjs';
import { groupPsi116Points, vector, label, key, distance } from './psi116-match.mjs';
import { validateMap } from './map-validation.mjs';

const EPS = 0.001;
const validRef = r => r?.kind==='xml' && ['branchOrdinal','nodeOrdinal'].every(k=>Number.isInteger(r[k])&&r[k]>=0) &&
  ['branchName','nodeNumber','componentRefNo'].every(k=>typeof r[k]==='string');
const within = (a,b,t) => Math.abs(a[0]-b[0])<=t && Math.abs(a[1]-b[1])<=t && Math.abs(a[2]-b[2])<=t && distance(a,b)<=t;
const record = n => ({ref:n.ref,xyz:n.xyz});

function pointsFor(graph, side) {
  require(graph?.profile==='PSI116' && Array.isArray(graph.nodes) && graph.nodes.length,
    'MATCH_GRAPH_INVALID',side,'nonempty PSI116 node list required');
  const ids=new Set();
  for(const n of graph.nodes) {
    require(validRef(n?.ref)&&vector(n.xyz)&&!ids.has(key(n.ref)), 'MATCH_GRAPH_INVALID',side,'invalid or repeated node identity');
    ids.add(key(n.ref));
  }
  const points=[...groupPsi116Points(graph.nodes).values()];
  const owner=new Map(), branches=new Map();
  for(const [i,p] of points.entries()) {
    p.index=i; p.side=side;
    for(const n of p.nodes) owner.set(n,p);
  }
  for(const n of graph.nodes) {
    const b=n.ref.branchOrdinal;
    if(!branches.has(b)) branches.set(b,[]);
    branches.get(b).push(n);
  }
  const neighbours=new Map();
  for(const ns of branches.values()) {
    ns.sort((a,b)=>a.ref.nodeOrdinal-b.ref.nodeOrdinal);
    // Skip consecutive records belonging to the same point. Adjacent distinct
    // positions, not branch names, ordinals or node numbers, identify context.
    for(let i=0;i<ns.length;) {
      let j=i+1;while(j<ns.length&&owner.get(ns[j])===owner.get(ns[i]))j++;
      const near=[i>0?owner.get(ns[i-1]):null,j<ns.length?owner.get(ns[j]):null];
      for(let k=i;k<j;k++) neighbours.set(ns[k],near);
      i=j;
    }
  }
  return {points,neighbours};
}

// Resolve only a reciprocal one-to-one record assignment. At coincident points
// geometry alone may be insufficient; a unique adjacent-position signature is
// additional geometric evidence, never a node-number or ordinal tie-breaker.
function resolveRecords(s,t,source,target,uniqueTargets,tol,identical) {
  if(s.nodes.length!==t.nodes.length) return null;
  if(s.nodes.length===1) return within(s.nodes[0].xyz,t.nodes[0].xyz,tol)?[[s.nodes[0],t.nodes[0]]]:null;
  if(identical) {
    const byId=new Map(t.nodes.map(n=>[key(n.ref),n]));
    const pairs=s.nodes.map(n=>[n,byId.get(key(n.ref))]);
    if(pairs.every(([a,b])=>b&&distance(a.xyz,b.xyz)===0&&Object.keys(a.ref).every(k=>a.ref[k]===b.ref[k]))) return pairs;
  }
  const signature=(n,model,isSource)=>{
    const ns=model.neighbours.get(n), mapped=ns.map(p=>p===null?-1:isSource?uniqueTargets.get(p)?.index:p.index);
    return mapped.includes(undefined)?null:mapped.sort((a,b)=>a-b).join(':');
  };
  const ts=t.nodes.map(n=>({n,sig:signature(n,target,false)}));
  const candidates=s.nodes.map(n=>{
    const sig=signature(n,source,true);
    return ts.filter(q=>sig!==null&&q.sig===sig&&within(n.xyz,q.n.xyz,tol)).map(q=>q.n);
  });
  const claims=new Map();
  for(const cs of candidates)for(const b of cs)claims.set(b,(claims.get(b)||0)+1);
  const pairs=[], leftS=[], used=new Set();
  for(const [i,a] of s.nodes.entries()) {
    const cs=candidates[i];
    if(cs.length===1&&claims.get(cs[0])===1){pairs.push([a,cs[0]]);used.add(cs[0]);}
    else leftS.push(a);
  }
  const leftT=t.nodes.filter(n=>!used.has(n));
  // A uniquely resolved context may leave a single forced positional pair
  // even when its neighbour moved out of tolerance. No arbitrary zip of ties.
  if(leftS.length===1&&leftT.length===1&&within(leftS[0].xyz,leftT[0].xyz,tol))pairs.push([leftS[0],leftT[0]]);
  return pairs.length===s.nodes.length?pairs:null;
}

export function pairPsi116(sourceGraph,targetGraph,{toleranceMm=1,bore=false}={}) {
  const start=performance.now();
  require(typeof toleranceMm==='number'&&Number.isFinite(toleranceMm)&&toleranceMm>0,'MATCH_TOLERANCE_INVALID','toleranceMm',String(toleranceMm));
  require(typeof bore==='boolean','MATCH_GRAPH_INVALID','bore','boolean required');
  const source=pointsFor(sourceGraph,'source'),target=pointsFor(targetGraph,'target');
  for(const s of source.points) for(const t of target.points) {
    if(s.nodes.some(a=>t.nodes.some(b=>within(a.xyz,b.xyz,toleranceMm)))) {s.hits.push(t);t.hits.push(s);}
  }
  for(const model of [source,target]) for(const p of model.points) {
    if(p.hits.length>1)p.issues.push('multiple opposite points within tolerance');
    if(p.hits.some(h=>h.hits.length>1))p.issues.push('opposite point claimed by multiple points');
  }
  const uniqueTargets=new Map();
  for(const s of source.points) if(!s.issues.length&&s.hits.length===1&&!s.hits[0].issues.length&&s.hits[0].hits.length===1) uniqueTargets.set(s,s.hits[0]);
  const nodePairs=[], boreRefused=[], ambiguities=[], usedS=new Set(),usedT=new Set();
  const identical=typeof sourceGraph.sha256==='string'&&/^[a-f0-9]{64}$/.test(sourceGraph.sha256)&&sourceGraph.sha256===targetGraph.sha256;
  // Emit one diagnostic per affected source point, or per isolated target
  // point. Target-only competitors are included in their source's candidate list.
  const diagnostic=(s,ts,detail)=>({code:'MATCH_NODE_AMBIGUOUS',where:label((s?.nodes[0]??ts[0].nodes[0]).ref),detail,
    sourceNodes:s?s.nodes.map(record):[],targetNodes:ts.flatMap(t=>t.nodes.map(record))});
  for(const s of source.points) {
    const t=uniqueTargets.get(s);
    if(s.issues.length||s.hits.some(p=>p.issues.length)) {
      ambiguities.push(diagnostic(s,s.hits,[...new Set([...s.issues,...s.hits.flatMap(p=>p.issues)])].join('; ')));continue;
    }
    if(!t)continue;
    const resolved=resolveRecords(s,t,source,target,uniqueTargets,toleranceMm,identical);
    if(!resolved) {
      ambiguities.push(diagnostic(s,[t],'coincident records have no unique position-based one-to-one assignment'));continue;
    }
    for(const [a,b] of resolved) {
      const d=distance(a.xyz,b.xyz),p={source:a.ref,target:b.ref,rule:d<=EPS?'same-position':'nearest-within-tolerance',distanceMm:d};
      if(bore&&(!Number.isFinite(a.outsideDiameter)||a.outsideDiameter<=0||!Number.isFinite(b.outsideDiameter)||b.outsideDiameter<=0||a.outsideDiameter!==b.outsideDiameter)) {
        boreRefused.push({...p,code:'MATCH_BORE_MISMATCH',where:label(a.ref),detail:'OutsideDiameter differs or is missing/invalid',sourceOD:a.outsideDiameter??null,targetOD:b.outsideDiameter??null});continue;
      }
      nodePairs.push(p);usedS.add(a);usedT.add(b);
    }
  }
  for(const t of target.points) if(t.issues.length&&!t.hits.length) ambiguities.push(diagnostic(null,[t],t.issues.join('; ')));
  const unmatchedNodesSource=sourceGraph.nodes.filter(n=>!usedS.has(n)).map(record),unmatchedNodesTarget=targetGraph.nodes.filter(n=>!usedT.has(n)).map(record);
  return {mode:'psi116-pair',inputs:{source:{sha256:sourceGraph.sha256},target:{sha256:targetGraph.sha256}},nodePairs,unmatchedNodesSource,unmatchedNodesTarget,ambiguities,boreRefused,
    summary:{toleranceMm,bore,sourceNodes:sourceGraph.nodes.length,targetNodes:targetGraph.nodes.length,sourcePoints:source.points.length,targetPoints:target.points.length,
      paired:nodePairs.length,unmatchedSource:unmatchedNodesSource.length,unmatchedTarget:unmatchedNodesTarget.length,ambiguous:ambiguities.length,boreRefused:boreRefused.length,ms:performance.now()-start}};
}

export function psi116PairToMapFile(result,{sourceFile,targetFile,createdAt=new Date().toISOString()}={}) {
  require(result?.mode==='psi116-pair'&&result.ok!==false&&Array.isArray(result.nodePairs),'MAP_EXPORT_INVALID','PSI116 pair','complete result required');
  require(Array.isArray(result.ambiguities)&&result.ambiguities.length===0&&result.summary?.ambiguous===0,'MATCH_NODE_AMBIGUOUS','PSI116 pair','Map export requires zero ambiguities');
  const file=(side,f)=>{
    require(f&&f.sha256===result.inputs?.[side]?.sha256,'MAP_EXPORT_INVALID',side,'descriptor must match input graph');
    return {kind:'xml',fileName:f.fileName,sha256:f.sha256};
  };
  const ref=r=>({kind:'xml',branchOrdinal:r.branchOrdinal,branchName:r.branchName,nodeOrdinal:r.nodeOrdinal,nodeNumber:r.nodeNumber,componentRefNo:r.componentRefNo});
  const ss=new Set(),tt=new Set();
  const pairs=result.nodePairs.map(p=>{
    require(validRef(p.source)&&validRef(p.target)&&Number.isFinite(p.distanceMm)&&p.distanceMm>=0&&['same-position','nearest-within-tolerance'].includes(p.rule),'MAP_EXPORT_INVALID','node pair','invalid ref, residual or rule');
    require(!ss.has(key(p.source))&&!tt.has(key(p.target)),'MAP_NOT_ONE_TO_ONE','node pair','duplicate structural identity');
    ss.add(key(p.source));tt.add(key(p.target));
    return {pairId:'psi116-pair-'+key(p.source),source:ref(p.source),target:ref(p.target),status:'candidate',evidence:{rule:p.rule,detail:`${p.distanceMm} mm`}};
  });
  return validateMap({format:'topofix.map',version:1,createdAt,source:file('source',sourceFile),target:file('target',targetFile),method:'geometry-pair',pairs});
}
