import {registeredMethodCPoint} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {methodCEvidence} from '../../tabs/cii-workspace/cii-workspace-method-c-exports.js';

export const GEOMETRY_SCENE_CONTRACT = 'CIIFR.GeometryDisplaySnapshot.v1';
const objectId = (side, graph, kind, id) => JSON.stringify([side, graph.member, graph.sha256, kind, String(id)]);
const copy = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function point(value) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(n => !Number.isFinite(n)))
    throw new Error('GEO_SCENE_NONFINITE_POINT');
  return [...value];
}
export function geometrySceneBinding(context) {
  const {source, target, transform, candidates, epoch, projection} = context;
  if (!Number.isSafeInteger(epoch) || epoch < 0 || !source || !target || !transform || !candidates)
    throw new Error('GEO_SCENE_CURRENT_CONTEXT_REQUIRED');
  return JSON.stringify([GEOMETRY_SCENE_CONTRACT, epoch, projection,
    source.member, source.sha256, target.member, target.sha256,
    transform.sourceComponent, transform.targetComponent, transform.anchors,
    transform.rotation, transform.translation, candidates.tolerance, candidates.snapshot]);
}
function ledgerLinks(rows) {
  const links = new Map();
  const add = (side, kind, id, source) => {
    const key = JSON.stringify([side, kind, String(id)]);
    if (!links.has(key)) links.set(key, new Set());
    links.get(key).add(source);
  };
  for (const row of rows) {
    add('SOURCE', 'NODE', row.source, row.source);
    for (const edge of row.sourceWitness || []) add('SOURCE', 'ELEMENT', edge, row.source);
    for (const alternative of row.alternatives) {
      add('TARGET', 'NODE', alternative.target, row.source);
      for (const edge of alternative.targetWitness || []) add('TARGET', 'ELEMENT', edge, row.source);
    }
    if (row.segment) add('TARGET', 'ELEMENT', row.segment.element, row.source);
  }
  return (side, kind, id) => [...(links.get(JSON.stringify([side, kind, String(id)])) || [])];
}
function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const xyz of positions) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], xyz[axis]); max[axis] = Math.max(max[axis], xyz[axis]);
  }
  return {min, max};
}
function sideModel(side, graph, component, coordinate, links, objects) {
  if (graph.byteAuthority !== 'XML_BYTES_MEASURED' || graph.units?.length !== 'mm' ||
      !/^[a-f0-9]{64}$/.test(graph.sha256 || '') || !graph.member)
    throw new Error('GEO_SCENE_MEASURED_MM_GRAPH_REQUIRED');
  const allowed = new Set(graph.components[component]?.map(String));
  if (!allowed.size) throw new Error('GEO_SCENE_REGISTERED_COMPONENT_REQUIRED');
  const positions = new Map(), markers = [], segments = [];
  const addObject = (kind, id, extra) => {
    const key = objectId(side, graph, kind, id);
    if (Object.hasOwn(objects, key)) throw new Error('GEO_SCENE_DUPLICATE_IDENTITY');
    objects[key] = {objectId: key, side, member: graph.member, xmlSha256: graph.sha256,
      kind, ...extra, sourceRows: links(side, kind, id)};
    return key;
  };
  for (const node of graph.nodes) {
    if (!allowed.has(String(node.id))) continue;
    const xyz = point(coordinate(point(node.xyz)));
    positions.set(String(node.id), xyz);
    const key = addObject('NODE', node.id, {nodeId: String(node.id)});
    markers.push({objectId: key, kind: 'NODE', nodeId: String(node.id), position: xyz, sizeMm: 20});
  }
  if (positions.size !== allowed.size) throw new Error('GEO_SCENE_MISSING_ENDPOINT');
  for (const edge of graph.edges) {
    if (!allowed.has(String(edge.from)) || !allowed.has(String(edge.to))) continue;
    const key = addObject('ELEMENT', edge.index, {elementIndex: edge.index,
      from: String(edge.from), to: String(edge.to), witness: edge.witness});
    segments.push({objectId: key, kind: 'PIPE', start: [...positions.get(String(edge.from))],
      end: [...positions.get(String(edge.to))], radiusMm: 5});
  }
  return {contract: 'VisualGeometryModel.v1', modelId: JSON.stringify([side, graph.member, graph.sha256]),
    unit: 'mm', segments, markers, bounds: boundsOf(positions.values())};
}
function scopeOf(graph, component) {
  return {member: graph.member, xmlSha256: graph.sha256, profile: graph.profile,
    byteAuthority: graph.byteAuthority, originalCiiClaim: copy(graph.claimedCii),
    registeredComponent: component, coordinateFrame: copy(graph.coordinateFrames[component]),
    unregisteredComponents: graph.components.flatMap((nodes, index) => index === component ? [] :
      [{component: index, nodeCount: nodes.length, coordinateFrame: graph.coordinateFrames[index]?.coordinateFrame}])};
}
/** Derive display data only from a current, already validated Method C result. */
export function createGeometryScene(context) {
  methodCEvidence(context); // Reuse existing file/pose/tolerance/projection custody checks.
  const binding = geometrySceneBinding(context), {source, target, transform} = context;
  const objects = {}, links = ledgerLinks(context.candidates.rows);
  const models = {
    source: sideModel('SOURCE', source, transform.sourceComponent,
      xyz => registeredMethodCPoint(transform, xyz), links, objects),
    target: sideModel('TARGET', target, transform.targetComponent, xyz => xyz, links, objects),
    registrationTranslation: [0, 0, 0], // Complete SOURCE R*p+t was applied exactly once above.
  };
  return freeze({contract: GEOMETRY_SCENE_CONTRACT, binding, epoch: context.epoch,
    models, objects, inputs: {source: scopeOf(source, transform.sourceComponent),
      target: scopeOf(target, transform.targetComponent)},
    displayDimensions: {meaning: 'CENTERLINE_DISPLAY_ONLY_NOT_ENGINEERING_DIMENSIONS', radiusMm: 5, markerSizeMm: 20},
    writerEligible: false, physicalIdentityQualified: false});
}
export function assertGeometrySceneCurrent(context) {
  const scene = context.viewerScene;
  if (scene?.contract !== GEOMETRY_SCENE_CONTRACT || scene.binding !== geometrySceneBinding(context))
    throw new Error('GEO_SCENE_STALE_OR_INCOMPLETE');
  return scene;
}
