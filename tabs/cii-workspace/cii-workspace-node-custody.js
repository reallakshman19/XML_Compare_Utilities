import { deepFreeze } from './cii-workspace-contracts.js';

function riskySourceElements(correspondence) {
  const risky = new Set();
  for (const row of correspondence?.elementRows || []) {
    if (!['REVIEW', 'UNRESOLVED', 'CONFLICT'].includes(row.status)) continue;
    for (const id of row.sourceElementIds || (row.sourceElementId ? [row.sourceElementId] : [])) risky.add(id);
  }
  return risky;
}

function uniqueNodeRows(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const previous = byId.get(row.correspondenceId);
    if (!previous || row.status === 'LOCKED' || previous.status !== 'LOCKED') byId.set(row.correspondenceId, row);
  }
  return [...byId.values()].sort((a, b) => String(a.correspondenceId).localeCompare(String(b.correspondenceId), undefined, { numeric: true }));
}

export function applyCiiNodeCustodyGates(correspondence, sourceGraph) {
  const risky = riskySourceElements(correspondence);
  const nodeRows = uniqueNodeRows(correspondence?.nodeRows).map((row) => {
    if (!risky.size || row.status === 'LOCKED' || !row.sourceNodeId) return row;
    const incident = sourceGraph?.adjacency?.get(String(row.sourceNodeId)) || [];
    const affected = incident.filter((edge) => risky.has(edge.elementId)).map((edge) => edge.elementId).sort();
    if (!affected.length) return row;
    return deepFreeze({
      ...row,
      status: row.status === 'CONFLICT' ? 'CONFLICT' : 'REVIEW',
      evidence: deepFreeze({
        ...(row.evidence || {}),
        nodeCustodyGate: Object.freeze({
          status: 'REVIEW_REQUIRED', blocker: 'ADJACENT_ELEMENT_CANDIDATE_AMBIGUITY',
          sourceElementIds: Object.freeze(affected),
        }),
      }),
    });
  });
  return deepFreeze({ ...correspondence, nodeRows: Object.freeze(nodeRows) });
}
