// PSI116 nodes have structural identities, not unique converter node numbers.
import { require, RefusalList, sha256Hex } from '../kit/core.mjs';
import { scanXml, psi116Index, child, text } from '../kit/xmlspan.mjs';
import { validateMap } from './map-validation.mjs';
import { addLoopNotes } from './loop-notes.mjs';

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const label = r => `branch ${r.branchOrdinal} (${r.branchName}) node ${r.nodeOrdinal} (${r.nodeNumber})`;
const key = r => `${r.branchOrdinal}:${r.nodeOrdinal}`;
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));

export async function readPsi116Graph(bytes) {
  const doc = scanXml(bytes), index = psi116Index(doc);
  require(index.nodes.length > 0, 'MATCH_XML_INVALID', 'PSI116', 'no direct Branch/Node records');
  const nodes = index.nodes.map(({branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo,element}) => {
    const ref = {kind:'xml',branchOrdinal,branchName,nodeOrdinal,nodeNumber,componentRefNo};
    const where = label(ref), position = child(element,'Position',true);
    require(position, 'MATCH_XML_INVALID', where, 'missing Position');
    const parts = text(doc,position).value.split(/\s+/), xyz = parts.map(Number);
    require(parts.every(p=>decimal.test(p)) && vector(xyz), 'MATCH_XML_INVALID', where, 'Position must have three finite numbers in mm');
    return {ref,xyz};
  });
  return {profile:'PSI116',sha256:await sha256Hex(bytes),nodes,branchCount:index.branches.length};
}

export function matchPsi116Cii(xml, cii, {toleranceMm=1}={}) {
  require(typeof toleranceMm === 'number' && Number.isFinite(toleranceMm) && toleranceMm > 0,
    'MATCH_TOLERANCE_INVALID','toleranceMm',String(toleranceMm));
  require(xml?.profile==='PSI116' && Array.isArray(xml.nodes) && xml.nodes.length && Array.isArray(cii?.nodes) && cii.nodes.length,
    'MATCH_GRAPH_INVALID','PSI116/CII','two nonempty node lists required');
  const points = new Map(), ids = new Set(), cids = new Set();
  for (const n of xml.nodes) {
    require(n?.ref?.kind==='xml' && vector(n.xyz) && !ids.has(key(n.ref)), 'MATCH_GRAPH_INVALID','PSI116','invalid or repeated node identity');
    ids.add(key(n.ref));
    const k=JSON.stringify(n.xyz);
    if (!points.has(k)) points.set(k,{xyz:n.xyz,nodes:[]});
    points.get(k).nodes.push(n);
  }
  for (const c of cii.nodes) {
    require(typeof c?.id==='string' && c.id && vector(c.xyz) && !cids.has(c.id),'MATCH_GRAPH_INVALID','CII','invalid or repeated node');
    cids.add(c.id);
  }
  const nodePairs=[], unmatchedNodesXml=[], used=new Map(), refusals=new RefusalList();
  for (const point of points.values()) {
    const hits=cii.nodes.map(c=>({c,d:distance(point.xyz,c.xyz)})).filter(h=>h.d<=toleranceMm);
    const where=label(point.nodes[0].ref);
    if (hits.length>1) {refusals.add('MATCH_NODE_AMBIGUOUS',where,'multiple CII nodes within tolerance: '+hits.map(h=>h.c.id).join(', '));continue;}
    if (!hits.length) {unmatchedNodesXml.push(...point.nodes.map(n=>({ref:n.ref,xyz:n.xyz})));continue;}
    const {c,d}=hits[0];
    if (used.has(c.id)) {refusals.add('MATCH_NODE_AMBIGUOUS',where,`distinct points share CII node ${c.id}; first point: ${used.get(c.id)}`);continue;}
    used.set(c.id,where);
    for (const n of point.nodes) nodePairs.push({xml:n.ref,cii:c.id,rule:d<=0.001?'same-position':'nearest-within-tolerance',distanceMm:d});
  }
  refusals.throwIfAny();
  const unmatchedNodesCii=cii.nodes.filter(c=>!used.has(c.id)).map(c=>c.id);
  return {mode:'geometry',inputs:{xml:{sha256:xml.sha256},cii:{sha256:cii.sha256}},nodePairs,unmatchedNodesXml,unmatchedNodesCii,
    loopClosures:cii.loopClosures||[],summary:{toleranceMm,xmlNodes:xml.nodes.length,xmlPoints:points.size,ciiNodes:cii.nodes.length,
      paired:nodePairs.length,pairedCii:used.size,unmatchedXml:unmatchedNodesXml.length,unmatchedCii:unmatchedNodesCii.length,ambiguous:0}};
}

export function psi116MatchToMapFile(result,{xmlFile,ciiFile,createdAt=new Date().toISOString()}={}) {
  require(result?.mode==='geometry' && result.ok!==false && Array.isArray(result.nodePairs),'MAP_EXPORT_INVALID','PSI116 match','complete match required');
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
