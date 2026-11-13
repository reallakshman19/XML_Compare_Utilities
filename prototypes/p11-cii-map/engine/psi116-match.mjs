// PSI116 nodes have structural identities, not unique converter node numbers.
import { require, sha256Hex } from '../kit/core.mjs';
import { scanXml, psi116Index, child, children, text } from '../kit/xmlspan.mjs';
import { validateMap } from './map-validation.mjs';
import { addLoopNotes } from './loop-notes.mjs';

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
export const label = r => `branch ${r.branchOrdinal} (${r.branchName}) node ${r.nodeOrdinal} (${r.nodeNumber})`;
export const key = r => `${r.branchOrdinal}:${r.nodeOrdinal}`;
export const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));

// PSI116 Position frames. 'psi116' = as written. 'cii2019' = the 3D_Converters XML->CII 2019
// converter's own axis rule (xml_to_cii2019._map_position_to_cii): CII = (x, z, -y).
export const FRAMES = Object.freeze({psi116: ([x,y,z])=>[x,y,z], cii2019: ([x,y,z])=>[x,z,-y]});

export async function readPsi116Graph(bytes, {includeBore=false, frame='psi116'}={}) {
  require(Object.hasOwn(FRAMES, frame), 'MATCH_FRAME_INVALID', 'frame', String(frame));
  const doc = scanXml(bytes), index = psi116Index(doc);
  require(index.nodes.length > 0, 'MATCH_XML_INVALID', 'PSI116', 'no direct Branch/Node records');
  const nodes = index.nodes.map(({branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo,element}) => {
    const ref = {kind:'xml',branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo};
    const where = label(ref), position = child(element,'Position',true);
    require(position, 'MATCH_XML_INVALID', where, 'missing Position');
    const parts = text(doc,position).value.split(/\s+/), raw = parts.map(Number);
    require(parts.every(p=>decimal.test(p)) && vector(raw), 'MATCH_XML_INVALID', where, 'Position must have three finite numbers in mm');
    const xyz = FRAMES[frame](raw);
    if (includeBore) {
      const od = children(element,'OutsideDiameter');
      const raw = od.length===1 && !od[0].children.length && !od[0].cdata ? text(doc,od[0]).value : '';
      const outsideDiameter = decimal.test(raw) && Number.isFinite(Number(raw)) && Number(raw)>0 ? Number(raw) : null;
      return {ref,xyz,outsideDiameter,...(od.length>1?{boreIssue:'MATCH_BORE_DUPLICATE_TAG'}:{})};
    }
    return {ref,xyz};
  });
  return {profile:'PSI116',sha256:await sha256Hex(bytes),nodes,branchCount:index.branches.length,frame};
}

// Shared by both PSI116 geometry matchers; no change to P1.2b grouping.
export function groupPsi116Points(nodes) {
  const epsilon = 0.001;
  // Union-find over the epsilon-neighbour graph; validate each component's diameter.
  const parent = nodes.map((_,i)=>i);
  const root = i => { while (parent[i]!==i) {parent[i]=parent[parent[i]];i=parent[i];} return i; };
  for (let i=0;i<nodes.length;i++) for(let j=0;j<i;j++) {
    const a=nodes[i].xyz,b=nodes[j].xyz;
    if (Math.abs(a[0]-b[0])<=epsilon && Math.abs(a[1]-b[1])<=epsilon && Math.abs(a[2]-b[2])<=epsilon && distance(a,b)<=epsilon)
      parent[root(i)]=root(j);
  }
  const points=new Map();
  for (let i=0;i<nodes.length;i++) {
    const k=root(i);
    if(!points.has(k)) points.set(k,{nodes:[],hits:[],issues:[]});
    points.get(k).nodes.push(nodes[i]);
  }
  for (const point of points.values()) {
    const ns=point.nodes;
    if(ns.some((n,i)=>ns.slice(0,i).some(m=>distance(n.xyz,m.xyz)>epsilon)))
      point.issues.push('coincident group spans more than 0.001 mm');
  }
  return points;
}

export function matchPsi116Cii(xml, cii, {toleranceMm=1}={}) {
  require(typeof toleranceMm === 'number' && Number.isFinite(toleranceMm) && toleranceMm > 0,
    'MATCH_TOLERANCE_INVALID','toleranceMm',String(toleranceMm));
  require(xml?.profile==='PSI116' && Array.isArray(xml.nodes) && xml.nodes.length && Array.isArray(cii?.nodes) && cii.nodes.length,
    'MATCH_GRAPH_INVALID','PSI116/CII','two nonempty node lists required');
  const ids = new Set(), cids = new Set(), nodes = xml.nodes, epsilon = 0.001;
  for (const n of nodes) {
    require(n?.ref?.kind==='xml' && vector(n.xyz) && !ids.has(key(n.ref)), 'MATCH_GRAPH_INVALID','PSI116','invalid or repeated node identity');
    ids.add(key(n.ref));
  }
  for (const c of cii.nodes) {
    require(typeof c?.id==='string' && c.id && vector(c.xyz) && !cids.has(c.id),'MATCH_GRAPH_INVALID','CII','invalid or repeated node');
    cids.add(c.id);
  }
  const points=groupPsi116Points(nodes);
  const claims=new Map(), ambiguities=[], nodePairs=[], unmatchedNodesXml=[], used=new Set();
  for (const point of points.values()) {
    const ns=point.nodes;
    // Every member contributes candidates; do not hide competitors at the tolerance boundary.
    for (const c of cii.nodes) {
      const ds=ns.map(n=>distance(n.xyz,c.xyz));
      if(ds.some(d=>d<=toleranceMm)) point.hits.push({c,ds});
    }
    if(point.hits.length>1) point.issues.push('multiple CII nodes within tolerance');
    // All candidate claims participate in conflict detection, including ambiguous groups.
    for(const {c} of point.hits) {
      if(!claims.has(c.id)) claims.set(c.id,[]);
      claims.get(c.id).push(point);
    }
  }
  for (const [id,ps] of claims) if(ps.length>1)
    for(const p of ps) p.issues.push(`distinct points share CII node ${id}`);
  for (const point of points.values()) {
    const {nodes:ns,hits,issues}=point;
    if(issues.length) ambiguities.push({code:'MATCH_NODE_AMBIGUOUS',where:label(ns[0].ref),
      detail:issues.join('; '),xmlNodes:ns.map(n=>n.ref),ciiNodes:hits.map(h=>h.c.id)});
    if(issues.length || hits.length!==1 || hits[0].ds.some(d=>d>toleranceMm)) {
      unmatchedNodesXml.push(...ns.map(n=>({ref:n.ref,xyz:n.xyz})));continue;
    }
    const {c,ds}=hits[0];used.add(c.id);
    for(let i=0;i<ns.length;i++) {
      const d=ds[i];nodePairs.push({xml:ns[i].ref,cii:c.id,rule:d<=epsilon?'same-position':'nearest-within-tolerance',distanceMm:d});
    }
  }
  const unmatchedNodesCii=cii.nodes.filter(c=>!used.has(c.id)).map(c=>c.id);
  return {mode:'geometry',inputs:{xml:{sha256:xml.sha256},cii:{sha256:cii.sha256}},nodePairs,unmatchedNodesXml,unmatchedNodesCii,ambiguities,
    loopClosures:cii.loopClosures||[],summary:{toleranceMm,xmlNodes:xml.nodes.length,xmlPoints:points.size,ciiNodes:cii.nodes.length,
      paired:nodePairs.length,pairedCii:used.size,unmatchedXml:unmatchedNodesXml.length,unmatchedCii:unmatchedNodesCii.length,ambiguous:ambiguities.length}};
}

export function psi116MatchToMapFile(result,{xmlFile,ciiFile,createdAt=new Date().toISOString()}={}) {
  require(result?.mode==='geometry' && result.ok!==false && Array.isArray(result.nodePairs),'MAP_EXPORT_INVALID','PSI116 match','complete match required');
  require(Array.isArray(result.ambiguities) && result.ambiguities.length===0 && result.summary?.ambiguous===0,
    'MATCH_NODE_AMBIGUOUS','PSI116 match','Map export requires zero ambiguous points');
  const file=(kind,f)=>{
    require(f && f.sha256===result.inputs?.[kind]?.sha256,'MAP_EXPORT_INVALID',kind,'descriptor must match input graph');
    return {kind,fileName:f.fileName,sha256:f.sha256};
  };
  const pairs=result.nodePairs.map(p=>{
    require(p.xml?.kind==='xml' && Number.isFinite(p.distanceMm) && p.distanceMm>=0 && ['same-position','nearest-within-tolerance'].includes(p.rule),
      'MAP_EXPORT_INVALID','node pair','invalid ref, distance or rule');
    const {branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo}=p.xml;
    return {pairId:'psi116-'+key(p.xml),source:{kind:'xml',branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo},
      target:{kind:'cii-node',node:p.cii},status:'candidate',evidence:{rule:p.rule,detail:`${p.distanceMm} mm`}};
  });
  addLoopNotes(pairs,(result.loopClosures||[]).map(closure=>({side:'target',closure})));
  return validateMap({format:'topofix.map',version:1,createdAt,source:file('xml',xmlFile),target:file('cii',ciiFile),method:'geometry-pair',pairs});
}
