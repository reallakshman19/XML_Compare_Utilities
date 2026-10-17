// Original signed ELEMENTS geometry. No inference from NodeName equality or golden rows.
const ROWS_PER_ELEMENT = 15;
const CII_FIELD_WIDTH = 13;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const same = (a, b, epsilon = 1e-4) => a.every((v, i) => Math.abs(v - b[i]) <= epsilon);
const plus = (a, b, sign = 1) => a.map((v, i) => v + sign * b[i]);

export function sectionLines(text, section) {
  let active = false;
  const result = [];
  for (const row of String(text).split(/\r?\n/)) {
    const match = row.match(/^\s*#\$\s+(\S+)/);
    if (match) { active = match[1].toUpperCase() === section.toUpperCase(); continue; }
    if (active) result.push(row);
  }
  return result;
}
function field(row, index) {
  const part = String(row).slice(2 + index * CII_FIELD_WIDTH, 2 + (index + 1) * CII_FIELD_WIDTH).trim();
  if (!part) throw new Error('MISSING_CII_FIELD_' + index);
  const number = Number(part.replace(/[dD]/g, 'E'));
  if (!finite(number)) throw new Error('NONFINITE_CII_FIELD_' + index);
  return number;
}
function nodeId(number) {
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('INVALID_PHYSICAL_NODE_ID');
  return String(number);
}
function nativeCoordinateSeeds(text) {
  const rows = sectionLines(text, 'COORDS').filter((row) => row.trim());
  if (!rows.length) return [];
  const count = Number(rows[0].trim());
  if (!Number.isSafeInteger(count) || count < 0 || count !== rows.length - 1) throw new Error('INVALID_CII_COORDS_SEED_COUNT');
  return rows.slice(1).map((row) => {
    // Neutral COORDS may concatenate a negative XYZ immediately after the NODE ID
    // (actual original S2: '40-1.520000E+02 ...'); tokenize signed numbers, not whitespace.
    const values = row.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?/g) || [];
    const parts = values.map((v) => Number(v.replace(/[dD]/g, 'E')));
    if (parts.length !== 4 || parts.some((v) => !finite(v))) throw new Error('INVALID_CII_COORDS_SEED');
    return { node: nodeId(parts[0]), xyz: parts.slice(1) };
  });
}
function assertNativeMillimetres(text) {
  const rows = sectionLines(text, 'UNITS');
  if (!rows.some((row) => /\bSI\s*\(mm\)/i.test(row)))
    throw new Error('UNSUPPORTED_OR_MISSING_CII_NATIVE_MM_UNITS');
}
function originalElements(text) {
  const rows = sectionLines(text, 'ELEMENTS');
  if (!rows.length || rows.length % ROWS_PER_ELEMENT) throw new Error('INVALID_15_ROW_ELEMENTS_SECTION');
  const control = sectionLines(text, 'CONTROL');
  if (!control.length || field(control[0], 0) !== rows.length / ROWS_PER_ELEMENT)
    throw new Error('CII_CONTROL_ELEMENTS_COUNT_MISMATCH');
  const nameRows = sectionLines(text, 'NODENAME').filter((row) => row.trim());
  const edges = [];
  for (let index = 0; index < rows.length / ROWS_PER_ELEMENT; index++) {
    const i = index * ROWS_PER_ELEMENT;
    const from = nodeId(field(rows[i], 0));
    const to = nodeId(field(rows[i], 1));
    const delta = [2, 3, 4].map((j) => field(rows[i], j));
    const od = field(rows[i], 5);
    const wall = field(rows[i + 1], 0);
    // Native v14 NODENAME pointer: first numeric field of row 13 (zero-based +12).
    const pointer = field(rows[i + 12], 0);
    if (!Number.isSafeInteger(pointer) || pointer < 0 || pointer > nameRows.length) throw new Error('BAD_NODENAME_POINTER_' + index);
    const names = pointer ? nameRows[pointer - 1].padEnd(53, ' ') : '';
    edges.push({ index, from, to, delta, od, wall, pointer,
      fromName: names ? names.slice(2, 28).trim() : '',
      toName: names ? names.slice(28, 53).trim() : '',
      witness: 'ELEMENTS#' + (index + 1) + ':15rows:' + (i + 1) + '-' + (i + 15) });
  }
  return edges;
}
export function buildOriginalGraph({ text, member, sha256, expectedSha256 } = {}) {
  if (!member || !sha256 || !/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('SOURCE_MEMBER_AND_RAW_SHA_REQUIRED');
  if (expectedSha256 && expectedSha256.toLowerCase() !== sha256.toLowerCase()) throw new Error('ORIGINAL_SHA256_MISMATCH');
  assertNativeMillimetres(text);
  const edges = originalElements(text);
  const adjacency = new Map(), names = new Map(), nameConflicts = [];
  const add = (from, to, sign, edge) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, sign, edge });
  };
  for (const edge of edges) {
    add(edge.from, edge.to, 1, edge); add(edge.to, edge.from, -1, edge);
    for (const [id, name] of [[edge.from, edge.fromName], [edge.to, edge.toName]]) {
      if (!name) continue;
      if (names.has(id) && names.get(id) !== name) nameConflicts.push({ node: id, names: [names.get(id), name], witness: edge.witness });
      if (!names.has(id)) names.set(id, name);
    }
  }
  const points = new Map(), componentOf = new Map(), components = [], closureErrors = [];
  for (const root of adjacency.keys()) {
    if (points.has(root)) continue;
    const component = components.length, queue = [root];
    points.set(root, [0, 0, 0]); componentOf.set(root, component);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      for (const { to, sign, edge } of adjacency.get(node)) {
        const next = plus(points.get(node), edge.delta, sign);
        if (!points.has(to)) { points.set(to, next); componentOf.set(to, component); queue.push(to); }
        else if (!same(next, points.get(to))) closureErrors.push({ node: to, witness: edge.witness, discrepancy: plus(next, points.get(to), -1) });
      }
    }
    components.push(queue);
  }
  if (closureErrors.length) throw new Error('CII_SIGNED_VECTOR_CYCLE_CONFLICT:' + JSON.stringify(closureErrors.slice(0, 3)));
  const seedShifts = new Map(), seeds = nativeCoordinateSeeds(text);
  for (const seed of seeds) {
    if (!points.has(seed.node)) throw new Error('COORDS_SEED_NOT_PHYSICAL_NODE:' + seed.node);
    const component = componentOf.get(seed.node), shift = plus(seed.xyz, points.get(seed.node), -1);
    if (seedShifts.has(component) && !same(shift, seedShifts.get(component), 0.25))
      throw new Error('INCONSISTENT_CII_COORDS_SEEDS:' + component);
    if (!seedShifts.has(component)) seedShifts.set(component, shift);
  }
  const coordinateFrames = components.map((ids, component) => ({ component, nodeCount: ids.length,
    coordinateFrame: seedShifts.has(component) ? 'ORIGINAL_CII_COORDS_SEED' : 'RELATIVE_NO_ORIGINAL_CII_SEED',
    witnesses: seeds.filter((seed) => componentOf.get(seed.node) === component).map((seed) => seed.node) }));
  for (const [node, xyz] of points) {
    const shift = seedShifts.get(componentOf.get(node));
    if (shift) points.set(node, plus(xyz, shift));
  }
  const nodes = [...points].map(([id, xyz]) => ({ id, xyz, member, sha256, nodeName: names.get(id) || '',
    component: componentOf.get(id), degree: adjacency.get(id).length,
    incident: adjacency.get(id).map(({ edge }) => edge.index).sort((a, b) => a - b),
    od: adjacency.get(id)[0].edge.od, wall: adjacency.get(id)[0].edge.wall }));
  return { member, sha256, nodes, edges, components, coordinateFrames, nameConflicts, adjacency, nodeIndex: new Map(nodes.map((n) => [n.id, n])) };
}
export function graphFromSegments({ member, sha256, nodes, edges }) {
  const source = nodes.map((node) => ({ ...node, member, sha256, component: node.component ?? 0 }));
  const normalized = edges.map((e, index) => ({ ...e, index, witness: e.witness || 'DERIVED_SEGMENT#' + (index + 1) }));
  return { member, sha256, nodes: source, edges: normalized,
    components: [[...source.map((n) => n.id)]],
    coordinateFrames: [{ component: 0, nodeCount: source.length, coordinateFrame: 'DERIVED_PROFILE_NO_RAW_SEED' }],
    nameConflicts: [], nodeIndex: new Map(source.map((n) => [n.id, n])) };
}
export function graphRoute(graph, first, last) {
  const adjacency = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ next: edge.to, edge });
    adjacency.get(edge.to)?.push({ next: edge.from, edge });
  }
  const queue = [String(first)], previous = new Map([[String(first), null]]);
  for (let i = 0; i < queue.length; i++) {
    for (const { next, edge } of adjacency.get(queue[i]) || []) {
      if (!previous.has(next)) { previous.set(next, { from: queue[i], edge }); queue.push(next); }
    }
  }
  if (!previous.has(String(last))) throw new Error('ENDPOINT_NOT_CONNECTED');
  const ids = []; let developedLength = 0;
  for (let current = String(last); current !== String(first); current = previous.get(current).from) {
    ids.unshift(current); developedLength += Math.hypot(...previous.get(current).edge.delta);
  }
  ids.unshift(String(first));
  return { ids, developedLength, elementCount: ids.length - 1 };
}
export async function sha256RawBytes(bytes, cryptoRef = globalThis.crypto) {
  if (!(bytes instanceof Uint8Array || bytes instanceof ArrayBuffer)) throw new TypeError('ORIGINAL_CII_BYTES_REQUIRED');
  if (!cryptoRef?.subtle?.digest) throw new Error('NATIVE_SHA256_UNAVAILABLE');
  const actualBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await cryptoRef.subtle.digest('SHA-256', actualBytes);
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export async function buildOriginalGraphFromBytes({ bytes, member, expectedSha256, cryptoRef } = {}) {
  if (!(bytes instanceof Uint8Array || bytes instanceof ArrayBuffer)) throw new TypeError('ORIGINAL_CII_BYTES_REQUIRED');
  const original = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes.slice(0));
  if (!original.length) throw new Error('EMPTY_ORIGINAL_CII_BYTES');
  const sha256 = await sha256RawBytes(original, cryptoRef);
  if (expectedSha256 && expectedSha256.toLowerCase() !== sha256) throw new Error('ORIGINAL_SHA256_MISMATCH');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(original);
  const graph = buildOriginalGraph({ text, member, sha256, expectedSha256 });
  return { ...graph, byteAuthority: 'ORIGINAL_BYTES', byteLength: original.length };
}
