import {fail} from './xml-utils.js';

const add = (a, b, sign = 1) => a.map((value, i) => value + sign * b[i]);
const close = (a, b, tolerance) => a.every((value, i) => Math.abs(value - b[i]) <= tolerance);
function incidence(elements) {
  const adjacency = new Map();
  const push = (from, to, sign, edge) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({to, sign, edge});
  };
  for (const edge of elements) {
    if (edge.from === edge.to) fail('XML_ELEMENT_SELF_LOOP:' + edge.witness);
    push(edge.from, edge.to, 1, edge); push(edge.to, edge.from, -1, edge);
  }
  return adjacency;
}
function reconstruct(adjacency) {
  const points = new Map(), components = [], componentOf = new Map();
  for (const root of adjacency.keys()) {
    if (points.has(root)) continue;
    const index = components.length, queue = [root];
    points.set(root, [0,0,0]); componentOf.set(root, index);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      for (const {to, sign, edge} of adjacency.get(node)) {
        const next = add(points.get(node), edge.delta, sign);
        if (!next.every(Number.isFinite)) fail('XML_COORDINATE_OVERFLOW');
        if (!points.has(to)) { points.set(to, next); componentOf.set(to, index); queue.push(to); }
        else if (!close(next, points.get(to), 1e-4)) fail('XML_SIGNED_VECTOR_CYCLE_CONFLICT:' + edge.witness);
      }
    }
    components.push(queue);
  }
  return {points, components, componentOf};
}
function applySeeds(state, seeds) {
  const shifts = new Map(), seen = new Map();
  for (const seed of seeds) {
    if (!state.points.has(seed.node)) fail('XML_COORDS_SEED_NOT_ENDPOINT:' + seed.node);
    if (seen.has(seed.node) && !close(seen.get(seed.node), seed.xyz, 1e-4)) fail('XML_CONTRADICTORY_DUPLICATE_SEED');
    seen.set(seed.node, seed.xyz);
    const component = state.componentOf.get(seed.node), shift = add(seed.xyz, state.points.get(seed.node), -1);
    if (!shift.every(Number.isFinite)) fail('XML_COORDINATE_OVERFLOW');
    if (shifts.has(component) && !close(shifts.get(component), shift, 0.25))
      fail('XML_INCONSISTENT_COORDS_SEEDS:' + component);
    if (!shifts.has(component)) shifts.set(component, shift);
  }
  for (const [node, point] of state.points) {
    if (shifts.has(state.componentOf.get(node))) {
      const xyz = add(point, shifts.get(state.componentOf.get(node)));
      if (!xyz.every(Number.isFinite)) fail('XML_COORDINATE_OVERFLOW');
      state.points.set(node, xyz);
    }
  }
  return shifts;
}
export function buildXmlGraph(profile, {member, sha256, byteLength}) {
  if (!member || !/^[a-f0-9]{64}$/.test(sha256 || '')) fail('XML_MEMBER_AND_MEASURED_SHA_REQUIRED');
  if (!profile.elements.length || profile.elements.length > 50000) fail('XML_ELEMENT_COUNT_LIMIT');
  const adjacency = incidence(profile.elements), state = reconstruct(adjacency);
  const shifts = applySeeds(state, profile.seeds);
  const nodes = [...state.points].map(([id, xyz]) => {
    const incident = adjacency.get(id).map(item => item.edge.index);
    const first = adjacency.get(id)[0].edge;
    return {id, xyz, member, sha256, component: state.componentOf.get(id),
      degree: incident.length, incident, od: first.od, wall: first.wall, nodeName: '',
      xmlIdentity: member + ':' + sha256 + ':NODE:' + id};
  });
  const coordinateFrames = state.components.map((ids, component) => ({component, nodeCount: ids.length,
    coordinateFrame: shifts.has(component) ? 'XML_EXPLICIT_COORDS_SEED' : 'RELATIVE_NO_XML_SEED',
    witnesses: profile.seeds.filter(seed => state.componentOf.get(seed.node) === component)}));
  return {member, sha256, byteLength, byteAuthority: 'XML_BYTES_MEASURED', profile: profile.profile,
    units: profile.units, claimedCii: profile.claimedCii, nodes, edges: profile.elements,
    components: state.components, coordinateFrames, adjacency, nameConflicts: [],
    nodeIndex: new Map(nodes.map(node => [node.id, node])),
    authority: 'XML_GEOMETRY_PREVIEW_ONLY', writerEligible: false, physicalIdentityQualified: false};
}
