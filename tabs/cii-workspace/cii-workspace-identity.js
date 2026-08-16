import { deepFreeze, stableId, stableStringify } from './cii-workspace-contracts.js';

function rowIdentity(row) {
  return {
    correspondenceId: row.correspondenceId,
    kind: row.kind,
    status: row.status,
    authority: row.authority || '',
    sourceNodeId: row.sourceNodeId || null,
    targetNodeId: row.targetNodeId || null,
    sourceElementId: row.sourceElementId || null,
    sourceElementIds: row.sourceElementIds || [],
    targetElementIds: row.targetElementIds || [],
    sourceComponentId: row.sourceComponentId || null,
    targetComponentId: row.targetComponentId || null,
    evidence: row.evidence || null,
  };
}

export function bindCiiCorrespondenceIdentity(correspondence, sourceDocument, targetDocument, anchors) {
  const material = {
    sourceContentSha256: sourceDocument?.contentSha256 || '',
    targetContentSha256: targetDocument?.contentSha256 || '',
    anchors: (anchors || []).map((pair) => ({ sourceNodeId: String(pair.sourceNodeId), targetNodeId: String(pair.targetNodeId), status: pair.status || 'LOCKED' })),
    nodeRows: (correspondence?.nodeRows || []).map(rowIdentity),
    elementRows: (correspondence?.elementRows || []).map(rowIdentity),
    componentRows: (correspondence?.componentRows || []).map(rowIdentity),
    blockers: correspondence?.blockers || [],
    status: correspondence?.status || 'UNRESOLVED',
  };
  return deepFreeze({ ...correspondence, correspondenceIdentity: stableId('correspondence-v1', stableStringify(material)) });
}
