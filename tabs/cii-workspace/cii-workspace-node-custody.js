import { deepFreeze } from './cii-workspace-contracts.js';

function riskySourceElements(correspondence) {
  const risky = new Set();
  for (const row of correspondence?.elementRows || []) {
    if (!['REVIEW', 'UNRESOLVED', 'CONFLICT'].includes(row.status)) continue;
    for (const id of row.sourceElementIds || (row.sourceElementId ? [row.sourceElementId] : [])) risky.add(id);
  }
  return risky;
}

export function applyCiiNodeCustodyGates(correspondence, sourceGraph) {
  const risky = riskySourceElements(correspondence);
  if (!risky.size) return correspondence;
  const nodeRows = (correspondence?.nodeRows || []).map((row) => {
    if (row.status === 'LOCKED' || !row.sourceNodeId) return row;
    const incident = sourceGraph?.adjacency?.get(String(row.sourceNodeId)) || [];
    const affected = incident.filter((edge) => risky.has(edge.elementId)).map((edge) => edge.elementId).sort();
    if (!affected.length) return row;
    return deepFreeze({
      ...row,
      status: row.status === 'CONFLICT' ? 'CONFLICT' : 'REVIEW',
      evidence: deepFreeze({
        ...(row.evidence || {}),
        nodeCustodyGate: Object.freeze({
          status: 'REVIEW_REQUIRED',
          blocker: 'ADJACENT_ELEMENT_CANDIDATE_AMBIGUITY',
          sourceElementIds: Object.freeze(affected),
        }),
      }),
    });
  });
  return deepFreeze({ ...correspondence, nodeRows: Object.freeze(nodeRows) });
}
