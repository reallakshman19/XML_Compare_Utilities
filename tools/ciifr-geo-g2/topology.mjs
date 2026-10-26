// WBS3.2/G2: source-only topology witness, not a physical NodeMap.
export const G2_VERSION = 'CIIFR.GEO.G2.PoseFree.v1';
const HASH = /^[0-9a-f]{64}$/;
const nodeId = value => {
  if (value === null || value === undefined || !String(value).trim()) throw Error('G2_NODE_ID_INVALID');
  return String(value).trim();
};
export function normalizeGraph(input) {
  const sha256 = String(input?.sha256 || input?.xmlSha256 || '').toLowerCase();
  if (!HASH.test(sha256)) throw Error('G2_MEASURED_XML_SHA_REQUIRED');
  if (!Array.isArray(input.nodes) || !Array.isArray(input.edges) ||
      input.nodes.length > 50000 || input.edges.length > 50000) throw Error('G2_GRAPH_LIMIT');
  const ids = input.nodes.map(n => nodeId(n.id)), seen = new Set(ids);
  if (seen.size !== ids.length) throw Error('G2_DUPLICATE_NODE');
  const adjacency = new Map(ids.map(id => [id, []]));
  for (const edge of input.edges) {
    const from = nodeId(edge.from), to = nodeId(edge.to), d = edge.delta;
    if (!seen.has(from) || !seen.has(to) || from === to) throw Error('G2_EDGE_ENDPOINT_INVALID');
    if (!Array.isArray(d) || d.length !== 3 || !d.every(Number.isFinite))
      throw Error('G2_EDGE_DELTA_INVALID');
    const length = Math.hypot(...d);
    if (!Number.isFinite(length)) throw Error('G2_EDGE_LENGTH_INVALID');
    adjacency.get(from).push({to, length});
    adjacency.get(to).push({to: from, length});
  }
  return {sha256, ids, adjacency, inputAuthority: input.byteAuthority || 'XML_BYTES_MEASURED'};
}
function signature(graph, id) {
  const incident = graph.adjacency.get(id);
  const tokens = incident.map(({to, length}) =>
    `${length.toFixed(3)}:${graph.adjacency.get(to).length}`).sort();
  return `${incident.length}|${tokens.join('|')}`;
}
export function topologyCandidates(sourceInput, targetInput, maxPairs = 2000000) {
  const source = normalizeGraph(sourceInput), target = normalizeGraph(targetInput);
  if (source.ids.length * target.ids.length > maxPairs) throw Error('G2_PAIR_WORK_LIMIT');
  const bins = new Map();
  for (const targetId of target.ids) {
    const s = signature(target, targetId);
    if (!bins.has(s)) bins.set(s, []);
    bins.get(s).push(targetId);
  }
  const pairs = [], bySource = [];
  for (const sourceId of source.ids) {
    const sig = signature(source, sourceId), options = bins.get(sig) || [];
    bySource.push({source: sourceId, signature: sig, alternatives: options.length,
      state: options.length === 0 ? 'NO_TOPOLOGY_CANDIDATE' :
        options.length === 1 ? 'ONE_CANDIDATE_NOT_IDENTITY' : 'AMBIGUOUS'});
    for (const targetId of options) pairs.push({source: sourceId, target: targetId,
      role: 'T', witness: sig});
  }
  return {schema: G2_VERSION, sourceSha256: source.sha256, targetSha256: target.sha256,
    toleranceMm: 0.001, spatialResidual: 'NOT_EVALUATED', pairs, bySource,
    authority: 'POSE_FREE_WEAK_SIGNATURE_ONLY', physicalIdentityQualified: false,
    writerEligible: false};
}
