/**
 * Projects TopologySvgScene.v1 into an immutable SVG view model. Topology comes
 * only from the scene contract. Parsed InputXML and parity mismatches are
 * overlays/evidence and never alter route continuity.
 */

import { calculateTopologyBounds, projectTopologyPoint } from './topology-svg-projections.js';
import { asArray, cleanText, deepFreeze, objectRecord, uniqueText } from './topology-validator-values.js';

function projectPoint(value, projection) {
  return projectTopologyPoint(value, projection);
}

function branchVisible(row, branch) {
  return !branch || asArray(row.branchIds).map(cleanText).includes(branch);
}

function sceneNode(row, projection) {
  return deepFreeze({
    ...row,
    objectKey: `scene:node:${cleanText(row.canonicalNodeId)}`,
    projectedPosition: projectPoint(row.position, projection),
  });
}

function sceneEdge(row, projection) {
  return deepFreeze({
    ...row,
    objectKey: `scene:edge:${cleanText(row.canonicalEdgeId)}`,
    projectedStart: projectPoint(row.fromPosition, projection),
    projectedEnd: projectPoint(row.toPosition, projection),
  });
}

function scenePoint(row, kind, projection, positionField = 'position') {
  return deepFreeze({
    ...row,
    objectKey: `scene:${kind}:${cleanText(row.id)}`,
    projectedPosition: projectPoint(row[positionField], projection),
  });
}

function supportView(row, projection) {
  return deepFreeze({
    ...row,
    objectKey: `scene:support:${cleanText(row.canonicalSupportId || row.id)}`,
    projectedPosition: projectPoint(row.attachmentPosition ?? row.position, projection),
    projectedSourcePosition: projectPoint(row.sourcePosition, projection),
    projectedAttachmentPosition: projectPoint(row.attachmentPosition ?? row.position, projection),
  });
}

function parsedEdge(row, projection) {
  return deepFreeze({
    ...row,
    objectKey: `inputxml:edge:${cleanText(row.id)}`,
    projectedStart: projectPoint(row.fromPosition, projection),
    projectedEnd: projectPoint(row.toPosition, projection),
  });
}

function identityTexts(value) {
  return asArray(value).flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') return [cleanText(item)];
    return [];
  }).filter(Boolean);
}

function mismatchIdentityKeys(row) {
  const keys = [];
  for (const canonical of identityTexts(row.canonicalIdentity)) {
    if (canonical.startsWith('CE-')) keys.push(`scene:edge:${canonical}`);
    else if (canonical.startsWith('CN-')) keys.push(`scene:node:${canonical}`);
    else if (canonical.startsWith('CJ-')) keys.push(`scene:junction:${canonical}`);
    else if (canonical.startsWith('CB-')) keys.push(`scene:boundary:${canonical}`);
    else if (canonical.startsWith('SUP-')) keys.push(`scene:support:${canonical}`);
  }
  for (const input of identityTexts(row.inputXmlIdentity)) keys.push(`inputxml:edge:${input}`);
  for (const svg of identityTexts(row.svgIdentity)) keys.push(svg.startsWith('scene:') ? svg : `scene:edge:${svg}`);
  return uniqueText(keys);
}

function buildSelectionLookup(input) {
  const byObjectKey = {};
  const register = (row, kind, links = []) => {
    const key = cleanText(row.objectKey);
    if (!key) return;
    byObjectKey[key] = deepFreeze({ objectKey: key, kind, object: row, linkedObjectKeys: Object.freeze(uniqueText(links)) });
  };
  for (const row of input.nodes) register(row, 'scene-node');
  for (const row of input.edges) register(row, 'scene-edge', [`inputxml:edge:${cleanText(row.inputXmlElementId)}`]);
  for (const row of input.inputEdges) register(row, 'inputxml-edge', [`scene:edge:${cleanText(row.canonicalEdgeId)}`]);
  for (const row of input.supports) register(row, 'scene-support', asArray(row.inputXmlRestraintIds).map((id) => `inputxml:restraint:${cleanText(id)}`));
  for (const row of input.deferredSupports) register(row, 'deferred-support');
  for (const row of input.rigids) register(row, 'scene-rigid', [`scene:edge:${cleanText(row.canonicalEdgeId)}`]);
  for (const row of input.junctions) register(row, 'scene-junction', asArray(row.participatingCanonicalEdgeIds).map((id) => `scene:edge:${cleanText(id)}`));
  for (const row of input.boundaries) register(row, 'scene-boundary', asArray(row.participatingCanonicalEdgeIds).map((id) => `scene:edge:${cleanText(id)}`));
  for (const row of input.pointFeatures) register(row, 'scene-point-feature');
  for (const row of input.mismatches) register(row, 'parity-mismatch', row.objectKeys);
  return deepFreeze({ byObjectKey });
}

function mismatchView(row) {
  return deepFreeze({
    ...row,
    objectKey: `parity:mismatch:${cleanText(row.id)}`,
    objectKeys: Object.freeze(mismatchIdentityKeys(row)),
  });
}

export function buildTopologySceneViewModel(input) {
  const scene = objectRecord(input.scene), parsed = objectRecord(input.parsed), report = objectRecord(input.report);
  if (cleanText(scene.schema) !== 'TopologySvgScene.v1') throw new TypeError('Topology scene view model requires TopologySvgScene.v1.');
  const state = objectRecord(input.state), projection = cleanText(state.projection) || 'ISO', branch = cleanText(state.branch);
  const fullNodes = asArray(scene.nodes).map(objectRecord).map((row) => sceneNode(row, projection));
  const fullEdges = asArray(scene.edges).map(objectRecord).map((row) => sceneEdge(row, projection));
  const visibleEdges = fullEdges.filter((row) => branchVisible(row, branch));
  const visibleNodeIds = new Set(visibleEdges.flatMap((row) => [cleanText(row.fromCanonicalNodeId), cleanText(row.toCanonicalNodeId)]));
  const nodes = fullNodes.filter((row) => visibleNodeIds.has(cleanText(row.canonicalNodeId)));
  const activeEdges = branch ? visibleEdges : fullEdges;
  const unaffectedEdges = branch ? fullEdges.filter((row) => !branchVisible(row, branch)) : [];
  const supports = asArray(scene.supports).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => supportView(row, projection));
  const deferredSupports = asArray(scene.deferredSupports).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => scenePoint(row, 'deferred', projection));
  const rigids = asArray(scene.rigids).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => deepFreeze({ ...row, objectKey: `scene:rigid:${cleanText(row.id)}` }));
  const junctions = asArray(scene.junctions).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => scenePoint(row, 'junction', projection));
  const boundaries = asArray(scene.boundaries).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => scenePoint(row, 'boundary', projection));
  const pointFeatures = asArray(scene.pointFeatures).map(objectRecord).filter((row) => branchVisible(row, branch)).map((row) => scenePoint(row, 'pointFeature', projection));
  const inputEdges = asArray(parsed.elements).map(objectRecord).map((row) => parsedEdge(row, projection));
  const mismatches = asArray(report.mismatches).map(objectRecord).map(mismatchView);
  const points = [
    ...fullEdges.flatMap((row) => [row.projectedStart, row.projectedEnd]),
    ...supports.flatMap((row) => [row.projectedPosition, row.projectedSourcePosition]),
    ...deferredSupports.map((row) => row.projectedPosition),
    ...junctions.map((row) => row.projectedPosition),
    ...boundaries.map((row) => row.projectedPosition),
    ...pointFeatures.map((row) => row.projectedPosition),
  ];
  const selectionLookup = buildSelectionLookup({ nodes: fullNodes, edges: fullEdges, inputEdges, supports, deferredSupports, rigids, junctions, boundaries, pointFeatures, mismatches });
  return deepFreeze({
    schema: 'TopologyParitySvgViewModel.v1', projection, branch,
    canonicalTopologyHash: scene.canonicalTopologyHash, svgSceneHash: scene.svgSceneHash,
    bounds: calculateTopologyBounds(points), nodes, activeEdges, unaffectedEdges, inputEdges,
    supports, deferredSupports, rigids, junctions, boundaries, pointFeatures, mismatches,
    selectedMismatchId: cleanText(state.selectedMismatchId), labels: state.labels === true,
    selectionLookup,
    summary: objectRecord(report.summary),
  });
}

export const _test = Object.freeze({ branchVisible, sceneNode, sceneEdge, scenePoint, supportView, parsedEdge, identityTexts, mismatchIdentityKeys, buildSelectionLookup, mismatchView });
