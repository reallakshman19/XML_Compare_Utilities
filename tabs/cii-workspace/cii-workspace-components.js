import { deepFreeze, stableId } from './cii-workspace-contracts.js';

function edgeMap(graph) { return new Map((graph?.edges || []).map((edge) => [edge.elementId, edge])); }

export function attachCiiComponentCorrespondence(correspondence, sourceGraph, targetGraph) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const componentRows = [];
  for (const row of correspondence?.elementRows || []) {
    const sourceId = row.sourceElementId || (row.sourceElementIds?.length === 1 ? row.sourceElementIds[0] : null);
    const targetId = row.targetElementIds?.length === 1 ? row.targetElementIds[0] : null;
    const source = sourceEdges.get(sourceId); const target = targetEdges.get(targetId);
    if (!source || !target || source.componentKind !== 'RIGID' || target.componentKind !== 'RIGID') continue;
    const sourceUnique = source.rigidEvidence?.status === 'UNIQUE_TERMINAL_RECORD';
    const targetUnique = target.rigidEvidence?.status === 'UNIQUE_TERMINAL_RECORD';
    const blockers = [];
    if (!sourceUnique || !targetUnique) blockers.push('RIGID_COMPONENT_EVIDENCE_NOT_UNIQUE');
    componentRows.push(deepFreeze({
      correspondenceId: stableId('component', 'RIGID', source.rigidEvidence?.nodeId, target.rigidEvidence?.nodeId),
      kind: 'COMPONENT', componentKind: 'RIGID', sourceElementId: sourceId, targetElementIds: Object.freeze([targetId]),
      sourceComponentId: sourceUnique ? `RIGID@${source.rigidEvidence.nodeId}` : null,
      targetComponentId: targetUnique ? `RIGID@${target.rigidEvidence.nodeId}` : null,
      status: blockers.length ? 'CONFLICT' : row.status,
      authority: 'RIGID_COMPONENT_CONTEXT',
      parentElementCorrespondenceId: row.correspondenceId,
      evidence: deepFreeze({
        source: source.rigidEvidence, target: target.rigidEvidence,
        sourceLengthMm: source.lengthMm, targetLengthMm: target.lengthMm,
        blockers: Object.freeze(blockers),
      }),
    }));
  }
  return deepFreeze({ ...correspondence, componentRows: Object.freeze(componentRows) });
}
