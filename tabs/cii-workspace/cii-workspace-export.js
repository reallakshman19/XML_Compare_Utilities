import { stableStringify } from './cii-workspace-contracts.js';

function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function correspondenceRowsToCsv(correspondence) {
  const rows = [
    ...(correspondence?.nodeRows || []).map((row) => ({
      kind: row.kind, status: row.status, source: row.sourceNodeId || '', target: row.targetNodeId || '', correspondenceId: row.correspondenceId,
    })),
    ...(correspondence?.elementRows || []).map((row) => ({
      kind: row.kind, status: row.status, source: (row.sourceElementIds || [row.sourceElementId]).filter(Boolean).join('|'), target: (row.targetElementIds || []).join('|'), correspondenceId: row.correspondenceId,
    })),
  ];
  const headers = ['kind', 'status', 'source', 'target', 'correspondenceId'];
  return [headers.join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\n');
}

export function ciiWorkspaceAuditToJson(audit) {
  return stableStringify(audit);
}

export function ciiWorkspaceArtifactBundle(result) {
  return Object.freeze({
    correspondenceCsv: correspondenceRowsToCsv(result?.correspondence),
    auditJson: ciiWorkspaceAuditToJson(result?.audit),
    modifiedTargetCii: null,
  });
}
