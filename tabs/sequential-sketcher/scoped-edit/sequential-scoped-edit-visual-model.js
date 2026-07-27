/** Pure EngineeringScene.v1 to VisualGeometryModel.v2 projection for Sequential Draft Edit 3D. */
import { createVisualGeometryModelV2 } from '../../../contracts/visual-geometry-model.js';
import { validateEngineeringScene } from '../../../core/engineering-scene/engineering-contract-validation.js';
import { assertSequentialScopedEditReadModel } from './sequential-scoped-edit-read-model.js';
import { assertSequentialScopedEditSceneAncestry } from './sequential-scoped-edit-scene-adapter.js';

export const SEQUENTIAL_SCOPED_EDIT_VISUAL_MODEL_V1 = 'SequentialScopedEditVisualModel.v1';

const CATEGORY_STYLE = Object.freeze({
  confirmed: Object.freeze({ colorInt: 0x64748b, radiusMm: 12, markerKind: 'NODE' }),
  repair: Object.freeze({ colorInt: 0xf59e0b, radiusMm: 7, markerKind: 'NODE' }),
  candidate: Object.freeze({ colorInt: 0x60a5fa, radiusMm: 5, markerKind: 'NODE' }),
  support: Object.freeze({ colorInt: 0x22d3ee, radiusMm: 8, markerKind: 'SUPPORT' }),
  activePort: Object.freeze({ colorInt: 0x22c55e, radiusMm: 7, markerKind: 'NODE' }),
  rejectedCandidate: Object.freeze({ colorInt: 0xef4444, radiusMm: 4, markerKind: 'ISSUE_BADGE' }),
});

function xyz(point) {
  return [point?.x, point?.y, point?.z].every(Number.isFinite)
    ? [point.x, point.y, point.z] : null;
}

function category(entity) {
  return String(entity.domainRef?.category || entity.metadata?.sequential?.category || '').trim();
}

function componentKind(entity) {
  const value = entity.metadata?.sequential?.component?.canonicalType;
  const kind = String(value || '').trim().toUpperCase();
  const aliases = { ELBO: 'ELBOW', BEND: 'ELBOW', REDU: 'REDUCER', FLAN: 'FLANGE', VALV: 'VALVE' };
  const normalized = aliases[kind] || kind;
  if (['PIPE', 'VALVE', 'FLANGE', 'GASK', 'INST', 'ELBOW', 'TEE', 'OLET', 'REDUCER'].includes(normalized)) {
    return normalized;
  }
  return 'PIPE';
}

function style(entity) {
  return CATEGORY_STYLE[category(entity)] || CATEGORY_STYLE.confirmed;
}

function segmentRecord(entity, start, end, suffix = '0') {
  const visual = style(entity);
  return {
    primitiveId: `ssk3d:segment:${entity.id}:${suffix}`,
    objectId: entity.id,
    start,
    end,
    radiusMm: visual.radiusMm,
    kind: componentKind(entity),
    colorInt: visual.colorInt,
    pathId: String(entity.domainRef?.componentId || entity.domainRef?.connectionId || ''),
  };
}

function segments(entity) {
  const geometry = entity.geometry;
  if (geometry?.kind === 'segment') {
    const start = xyz(geometry.start); const end = xyz(geometry.end);
    return start && end ? [segmentRecord(entity, start, end)] : [];
  }
  if (geometry?.kind !== 'polyline') return [];
  const points = (geometry.points || []).map(xyz).filter(Boolean);
  return points.slice(1).map((end, index) => segmentRecord(entity, points[index], end, String(index)));
}

function marker(entity) {
  if (entity.geometry?.kind !== 'point') return null;
  const position = xyz(entity.geometry.position);
  if (!position) return null;
  const visual = style(entity);
  const rejected = category(entity) === 'rejectedCandidate';
  return {
    primitiveId: `ssk3d:marker:${entity.id}`,
    objectId: entity.id,
    nodeId: entity.id,
    kind: visual.markerKind,
    position,
    sizeMm: category(entity) === 'support' ? 28 : 22,
    colorInt: visual.colorInt,
    ...(rejected ? { label: 'REJECTED' } : {}),
    isObjectMarker: true,
  };
}

function bounds(segmentsInput, markersInput) {
  const points = [
    ...segmentsInput.flatMap((row) => [row.start, row.end]),
    ...markersInput.map((row) => row.position),
  ];
  const values = points.length ? points : [[0, 0, 0], [1, 1, 1]];
  return {
    min: [0, 1, 2].map((axis) => Math.min(...values.map((point) => point[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...values.map((point) => point[axis]))),
  };
}

export function createSequentialScopedEditVisualModel(input = {}) {
  const readModel = assertSequentialScopedEditReadModel(input.readModel);
  const scene = assertSequentialScopedEditSceneAncestry(
    validateEngineeringScene(input.scene),
    readModel,
  );
  const visible = scene.entities.filter((entity) => entity.visible !== false);
  const segmentRows = visible.flatMap(segments);
  const markerRows = visible.map(marker).filter(Boolean);
  return createVisualGeometryModelV2({
    modelId: `sequential-draft-edit:${readModel.authorityId}`,
    documentId: `sequential-document:${readModel.branchId}`,
    revisionId: readModel.authorityId,
    unit: scene.coordinateSystem.unit,
    coordinateFrame: scene.coordinateSystem.frame,
    verticalAxis: scene.coordinateSystem.verticalAxis,
    origin: [0, 0, 0],
    segments: segmentRows,
    markers: markerRows,
    bounds: bounds(segmentRows, markerRows),
  });
}

export const _test = Object.freeze({ xyz, category, componentKind, segments, marker, bounds });
