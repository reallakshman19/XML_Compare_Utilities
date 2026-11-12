// Bounded enumeration of oriented paths along ORIGINAL signed physical ELEMENTs.
// Derived previews and synthetic graph profiles cannot authenticate provenance.
const sub = (a, b) => a.map((v, i) => v - b[i]);
const norm = (a) => Math.hypot(...a);
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const add = (a, b) => a.map((v, i) => v + b[i]);

export function methodCOriginalPaths(graph, anchorId, { maxDepth = 5, maxPaths = 4000 } = {}) {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 7 ||
      !Number.isSafeInteger(maxPaths) || maxPaths < 1 || maxPaths > 20000)
    throw new Error('METHOD_C_PATH_BUDGET_POLICY_INVALID');
  const id = String(anchorId);
  if (graph?.byteAuthority !== 'ORIGINAL_BYTES' || !graph.nodeIndex?.has(id) ||
      !graph.adjacency?.has(id) || !Array.isArray(graph.edges))
    throw new Error('METHOD_C_ORIGINAL_SIGNED_GRAPH_REQUIRED');
  const result = [], start = { id, displacement: [0,0,0], elements: [], visited: [id] };
  const stack = [start]; let expanded = 0;
  while (stack.length) {
    const path = stack.pop();
    if (path.elements.length) {
      if (result.length >= maxPaths) return { paths: result, complete: false,
        stopReason: 'PATH_BUDGET_EXCEEDED', expanded };
      result.push(path);
    }
    if (path.elements.length >= maxDepth) continue;
    const neighbors = graph.adjacency.get(path.id) || [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const { to, sign, edge } = neighbors[i];
      if (path.visited.includes(String(to))) continue;
      if (!Number.isInteger(edge?.index) || !String(edge.witness).startsWith('ELEMENTS#') ||
          !Array.isArray(edge.delta) || edge.delta.length !== 3 ||
          edge.delta.some(x => !Number.isFinite(x)) || ![-1, 1].includes(sign))
        throw new Error('METHOD_C_MISSING_ORIGINAL_SIGNED_ELEMENT');
      const delta = edge.delta.map(x => x * sign);
      const element = { index: edge.index, witness: edge.witness,
        from: path.id, to: String(to), sign, delta,
        lengthMm: norm(delta), od: edge.od, wall: edge.wall };
      stack.push({ id: String(to), displacement: add(path.displacement, delta),
        elements: [...path.elements, element], visited: [...path.visited, String(to)] });
      expanded++;
    }
  }
  return { paths: result, complete: true, stopReason: null, expanded };
}

export function methodCIndependentPathPairs(paths, minimumSine = 0.01) {
  const pairs = [];
  for (let i = 0; i < paths.length; i++) for (let j = i+1; j < paths.length; j++) {
    const a = paths[i], b = paths[j];
    const used = new Set(a.elements.map(e => e.index));
    if (b.elements.some(e => used.has(e.index))) continue;
    const al = norm(a.displacement), bl = norm(b.displacement);
    if (al * bl <= 1e-9 || norm(cross(a.displacement, b.displacement)) / (al*bl) < minimumSine)
      continue;
    pairs.push([a, b]);
  }
  return pairs;
}

export function methodCOriginalPathCompatible(source, target, lengthToleranceMm = 0.025,
  odToleranceMm = 0.01) {
  if (source.elements.length !== target.elements.length) return false;
  return source.elements.every((e, i) => {
    const t = target.elements[i];
    return Math.abs(e.lengthMm - t.lengthMm) <= lengthToleranceMm &&
      Number.isFinite(e.od) && Number.isFinite(t.od) &&
      Math.abs(e.od - t.od) <= odToleranceMm;
  });
}

export function methodCVectorNonparallel(vectors, minimumSine=0.01) {
  for (let i=0;i<vectors.length;i++)for(let j=i+1;j<vectors.length;j++){
    const a=vectors[i],b=vectors[j],den=norm(a)*norm(b);
    if(den>1e-9 && norm(cross(a,b))/den >= minimumSine)return true;
  }
  return false;
}
export function methodCScalarTriple(a,b,c) { return dot(cross(a,b),c); }
export function methodCVectorSubtract(a,b) { return sub(a,b); }
