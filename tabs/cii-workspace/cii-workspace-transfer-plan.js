import { CII_WORKSPACE_SCHEMAS, deepFreeze, stableId } from './cii-workspace-contracts.js';

function edgeMap(graph) { return new Map((graph?.edges || []).map((edge) => [edge.elementId, edge])); }
function nodeMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node])); }
function reviewed(review, correspondenceId) { return new Set(review?.reviewedCorrespondenceIds || []).has(correspondenceId); }
function blocked(blockers) { return blockers.length ? 'BLOCKED' : 'PREVIEW_READY'; }

function operationBase(property, custody, row, source, target, before, proposed, blockers) {
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.transferOperation,
    operationId: stableId('op', property, row.correspondenceId), direction: 'SOURCE_TO_TARGET',
    property, custody, sourceEvidence: source, targetEvidence: target,
    matchAuthority: Object.freeze({ correspondenceId: row.correspondenceId, kind: row.kind, status: row.status, authority: row.authority || 'REVIEWED_CORRESPONDENCE' }),
    before, proposed, status: blocked(blockers), blockers: Object.freeze(blockers),
  });
}

function nodeNameOperations(sourceGraph, targetGraph, correspondence) {
  const sourceNodes = nodeMap(sourceGraph); const targetNodes = nodeMap(targetGraph); const operations = [];
  for (const row of correspondence?.nodeRows || []) {
    if (!row.sourceNodeId || !row.targetNodeId || !['LOCKED', 'REVIEWED'].includes(row.status)) continue;
    const source = sourceNodes.get(String(row.sourceNodeId)); const target = targetNodes.get(String(row.targetNodeId));
    if (!source?.nodeName) continue;
    const before = target?.nodeName || ''; const blockers = [];
    if (!target) blockers.push('TARGET_NODE_NOT_FOUND');
    if (before && before !== source.nodeName) blockers.push('TARGET_NODENAME_NONBLANK');
    operations.push(operationBase('NodeName', 'NODE', row,
      Object.freeze({ nodeId: source.id, nodeName: source.nodeName }),
      Object.freeze({ nodeId: row.targetNodeId, nodeName: before }), before, source.nodeName, blockers));
  }
  return operations;
}

function sizeBlockers(sourceEdges, targetEdges, toleranceMm) {
  const blockers = [];
  if (!sourceEdges.length || !targetEdges.length) return ['ELEMENT_PATH_EVIDENCE_MISSING'];
  const reference = sourceEdges[0].diameter;
  if (sourceEdges.some((edge) => Math.abs(edge.diameter - reference) > toleranceMm)) blockers.push('SOURCE_PATH_SIZE_TRANSITION');
  if (targetEdges.some((edge) => Math.abs(edge.diameter - reference) > toleranceMm)) blockers.push('TARGET_PATH_SIZE_TRANSITION_UNREPRESENTED_IN_SOURCE');
  return blockers;
}

function operatingOperations(sourceGraph, targetGraph, correspondence, review, options) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const operations = [];
  for (const row of correspondence?.elementRows || []) {
    if (!reviewed(review, row.correspondenceId)) continue;
    const sourceIds = row.sourceElementIds || (row.sourceElementId ? [row.sourceElementId] : []);
    const targetIds = row.targetElementIds || [];
    const sources = sourceIds.map((id) => sourceEdges.get(id)).filter(Boolean);
    const targets = targetIds.map((id) => targetEdges.get(id)).filter(Boolean);
    const baseBlockers = sizeBlockers(sources, targets, Number(options.diameterToleranceMm || 2));
    for (const property of ['P1', 'T1']) {
      const source = sources[0]; if (!source || !Number.isFinite(Number(source[property])) || Number(source[property]) === 0) continue;
      const before = targets.map((edge) => Number(edge[property] || 0));
      const blockers = [...baseBlockers];
      if (row.status === 'CONFLICT' || row.status === 'UNRESOLVED') blockers.push('CORRESPONDENCE_NOT_TRANSFERABLE');
      operations.push(operationBase(property, 'ELEMENT_PATH', row,
        Object.freeze({ elementIds: Object.freeze(sourceIds), value: Number(source[property]), unitAuthority: 'SOURCE_CII_NATIVE' }),
        Object.freeze({ elementIds: Object.freeze(targetIds), values: Object.freeze(before), diameters: Object.freeze(targets.map((edge) => edge.diameter)) }),
        Object.freeze(before), Number(source[property]), blockers));
    }
  }
  return operations;
}

function rigidWeightOperations(sourceGraph, targetGraph, correspondence, review, options) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const operations = [];
  for (const row of correspondence?.elementRows || []) {
    if (!reviewed(review, row.correspondenceId)) continue;
    const sourceId = row.sourceElementId || row.sourceElementIds?.[0]; const targetId = row.targetElementIds?.[0];
    const source = sourceEdges.get(sourceId); const target = targetEdges.get(targetId);
    if (!source || !target || source.componentKind !== 'RIGID' || target.componentKind !== 'RIGID') continue;
    const blockers = [];
    if (source.rigidEvidence?.status !== 'UNIQUE_TERMINAL_RECORD' || target.rigidEvidence?.status !== 'UNIQUE_TERMINAL_RECORD') blockers.push('RIGID_COMPONENT_EVIDENCE_NOT_UNIQUE');
    if (Math.abs(source.lengthMm - target.lengthMm) > Number(options.rigidLengthToleranceMm || 6)) blockers.push('RIGID_LENGTH_INCOMPATIBLE');
    operations.push(operationBase('rigidWeight', 'RIGID_COMPONENT', row,
      Object.freeze({ elementId: sourceId, mass: source.rigidEvidence?.mass ?? null, lengthMm: source.lengthMm }),
      Object.freeze({ elementId: targetId, mass: target.rigidEvidence?.mass ?? null, lengthMm: target.lengthMm }),
      target.rigidEvidence?.mass ?? null, source.rigidEvidence?.mass ?? null, blockers));
  }
  return operations;
}

export function createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review = {}, options = {}) {
  const operations = [
    ...nodeNameOperations(sourceGraph, targetGraph, correspondence),
    ...operatingOperations(sourceGraph, targetGraph, correspondence, review, options),
    ...rigidWeightOperations(sourceGraph, targetGraph, correspondence, review, options),
  ];
  const blockers = [];
  if (!operations.length) blockers.push('NO_REVIEWED_TRANSFER_PREVIEW_OPERATIONS');
  if (correspondence?.status === 'CONFLICT') blockers.push('CORRESPONDENCE_CONTAINS_STRUCTURAL_CONFLICT');
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.transferPlan, direction: 'SOURCE_TO_TARGET',
    sourceDocument: Object.freeze({ fileName: sourceDocument.fileName, contentSha256: sourceDocument.contentSha256 }),
    targetDocument: Object.freeze({ fileName: targetDocument.fileName, contentSha256: targetDocument.contentSha256 }),
    operations: Object.freeze(operations), status: blockers.length ? 'BLOCKED' : 'PREVIEW_READY', blockers: Object.freeze(blockers),
    summary: Object.freeze({ operationCount: operations.length, previewReadyCount: operations.filter((item) => item.status === 'PREVIEW_READY').length, blockedCount: operations.filter((item) => item.status === 'BLOCKED').length }),
  });
}
