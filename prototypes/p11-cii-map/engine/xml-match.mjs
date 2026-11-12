// InputXML <-> CII: read-only matching in one coordinate frame, no fit.
import { refuse, require } from '../kit/core.mjs';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const nodeId = v => typeof v === 'string' && v.length > 0;

function indexGraph(graph, side) {
  require(Array.isArray(graph?.nodes) && Array.isArray(graph?.edges), 'MATCH_GRAPH_INVALID', side, 'nodes and elements required');
  const nodes = new Map();
  graph.nodes.forEach((n, ordinal) => {
    require(nodeId(n?.id) && vector(n.xyz) && !nodes.has(n.id), 'MATCH_GRAPH_INVALID', side, 'invalid or repeated node at ' + ordinal);
    nodes.set(n.id, { ...n, ordinal });
  });
  graph.edges.forEach((e, k) => {
    require(nodes.has(e?.from) && nodes.has(e.to) && e.from !== e.to && vector(e.delta), 'MATCH_GRAPH_INVALID', side, 'invalid element ' + k);
    require(e.index === k && (side !== 'CII' || e.ciiElementIndex === undefined || e.ciiElementIndex === k), 'MATCH_GRAPH_INVALID', side, 'element index differs at ' + k);
  });
  return nodes;
}

export function matchXmlCii(xmlGraph, ciiGraph, { mode = 'same-run', toleranceMm = mode === 'same-run' ? 0.01 : 1 } = {}) {
  require(mode === 'same-run' || mode === 'geometry', 'MATCH_MODE_INVALID', 'mode', String(mode));
  const tol = toleranceMm;
  require(typeof tol === 'number' && Number.isFinite(tol) && tol > 0, 'MATCH_TOLERANCE_INVALID', 'toleranceMm', String(tol));
  const xn = indexGraph(xmlGraph, 'XML'), cn = indexGraph(ciiGraph, 'CII');
  const xe = xmlGraph.edges, ce = ciiGraph.edges;
  const elementPairs = [], nodePairs = [], unmatchedElementsXml = [], unmatchedNodesXml = [];
  const pairedNodes = new Map(), usedNodes = new Set(), usedEdges = new Set();
  const addNode = (x, c, rule, d) => {
    require(!usedNodes.has(c.id), 'MATCH_NODE_AMBIGUOUS', 'XML node ' + x.id, 'CII node ' + c.id + ' already paired');
    const p = { xml: x.id, cii: c.id, nodeOrdinal: x.ordinal, rule, distanceMm: d };
    pairedNodes.set(x.id, p); usedNodes.add(c.id); nodePairs.push(p);
  };
  const addEdge = (k, j, rule, reversed = false) => {
    const x = xe[k], c = ce[j];
    elementPairs.push({ k, xml: {from: x.from, to: x.to}, cii: {elementIndex: j, fromNode: c.from, toNode: c.to}, rule, ...(mode === 'geometry' ? {reversed} : {}) });
    usedEdges.add(j);
  };
  if (mode === 'same-run') {
    require(xe.length === ce.length, 'MATCH_SAME_RUN_BROKEN', 'element count', `XML ${xe.length}, CII ${ce.length}`);
    for (let k = 0; k < xe.length; k++) {
      const x = xe[k], c = ce[k], where = `element ${k} (${x.from}->${x.to})`;
      require(x.from === c.from && x.to === c.to, 'MATCH_SAME_RUN_BROKEN', where, `end nodes differ: CII ${c.from}->${c.to}`);
      for (let i = 0; i < 3; i++) require(Math.abs(x.delta[i] - c.delta[i]) <= tol, 'MATCH_SAME_RUN_BROKEN', where, `delta ${'XYZ'[i]} differs: XML ${x.delta[i]}, CII ${c.delta[i]}`);
      for (const id of [x.from, x.to]) require(distance(xn.get(id).xyz, cn.get(id).xyz) <= tol, 'MATCH_SAME_RUN_BROKEN', where, `node ${id} position differs by ${distance(xn.get(id).xyz, cn.get(id).xyz)} mm`);
      addEdge(k, k, 'same-run');
    }
    require(xn.size === cn.size, 'MATCH_SAME_RUN_BROKEN', 'node count', `XML ${xn.size}, CII ${cn.size}`);
    for (const x of xn.values()) {
      const c = cn.get(x.id);
      require(c && distance(x.xyz, c.xyz) <= tol, 'MATCH_SAME_RUN_BROKEN', 'XML node ' + x.id, 'node missing or position differs');
      addNode(x, c, 'same-run', distance(x.xyz, c.xyz));
    }
  } else {
    for (const x of xn.values()) {
      const candidates = [...cn.values()].map(c => ({c, d: distance(x.xyz, c.xyz)})).filter(o => o.d <= tol);
      if (candidates.length > 1) refuse('MATCH_NODE_AMBIGUOUS', 'XML node ' + x.id, 'multiple CII nodes within tolerance: ' + candidates.map(o => o.c.id).join(', '));
      if (!candidates.length) { unmatchedNodesXml.push(x.id); continue; }
      const {c, d} = candidates[0];
      addNode(x, c, d <= 0.001 ? 'same-position' : 'nearest-within-tolerance', d);
    }
    const ends = (a, b) => JSON.stringify([a, b].sort());
    const byEnds = new Map();
    ce.forEach((c, j) => { const key = ends(c.from, c.to); if (!byEnds.has(key)) byEnds.set(key, []); byEnds.get(key).push(j); });
    xe.forEach((x, k) => {
      const a = pairedNodes.get(x.from), b = pairedNodes.get(x.to);
      const hits = a && b ? (byEnds.get(ends(a.cii, b.cii)) || []) : [];
      if (!hits.length) { unmatchedElementsXml.push(k); return; }
      require(hits.length === 1 && !usedEdges.has(hits[0]), 'MATCH_ELEMENT_AMBIGUOUS', 'element ' + k, 'more than one possible pairing for these end nodes');
      const j = hits[0];
      addEdge(k, j, a.rule === 'same-position' && b.rule === 'same-position' ? 'same-position' : 'nearest-within-tolerance', ce[j].from !== a.cii);
    });
  }
  return {mode, toleranceMm: tol, inputs: {xml: {sha256: xmlGraph.sha256}, cii: {sha256: ciiGraph.sha256}}, elementPairs, nodePairs,
    unmatchedElementsXml, unmatchedElementsCii: ce.map((_, j) => j).filter(j => !usedEdges.has(j)),
    unmatchedNodesXml, unmatchedNodesCii: [...cn.keys()].filter(id => !usedNodes.has(id)),
    loopClosures: ciiGraph.loopClosures || []};
}
