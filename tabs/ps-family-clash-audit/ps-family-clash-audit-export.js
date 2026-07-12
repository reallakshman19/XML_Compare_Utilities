function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join('; '));
  if (value && typeof value === 'object') return csvEscape(JSON.stringify(value));
  const text = value == null ? '' : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(headers, rows) {
  const lines = [headers.join(',')];
  rows.forEach((row) => { lines.push(headers.map((header) => csvEscape(row[header])).join(',')); });
  return `${lines.join('\n')}\n`;
}

export function exportPsFamilyCoverageCsv(audit) {
  const headers = ['SourceFamily', 'ExpectedMember', 'Status', 'ClashCount', 'ClashRows', 'POSFamilyId', 'p1bore', 'Pipe', 'LineFamily', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS', 'PositionU', 'AgainstMembers', 'LineFamilies', 'FullLineTags', 'BranchNodes', 'SourceObjects', 'Remarks'];
  return rowsToCsv(headers, audit.coverageRows.map((row) => ({ SourceFamily: row.sourceFamily, ExpectedMember: row.expectedMember, Status: row.status, ClashCount: row.clashCount, ClashRows: row.clashNames, POSFamilyId: row.posFamilyId, p1bore: row.p1bore, Pipe: row.pipe, LineFamily: row.lineFamily || row.lineFamilies, SupportText: row.supportText, SupportGap: row.supportGap, Reference: row.reference, PositionE: row.position?.e, PositionS: row.position?.s, PositionU: row.position?.u, AgainstMembers: row.againstMembers, LineFamilies: row.lineFamilies, FullLineTags: row.fullLineTags, BranchNodes: row.branchNodes, SourceObjects: row.sourceObjects, Remarks: row.remarks })));
}

export function exportPsFamilyClashRowsCsv(audit) {
  const headers = ['ClashName', 'Source', 'SourceObject', 'AgainstMember', 'FamilyStatus', 'POSFamilyId', 'p1bore', 'Pipe', 'LineFamily', 'FullLineTag', 'BranchNode', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS', 'PositionU', 'Distance', 'PointX', 'PointY', 'PointZ', 'SourcePath', 'AgainstPath'];
  return rowsToCsv(headers, audit.clashRows.map((row) => ({ ClashName: row.clashName, Source: row.source.familyRoot, SourceObject: row.source.objectName, AgainstMember: row.against.memberName, FamilyStatus: row.familyStatus, POSFamilyId: row.elementDetail.posFamilyId, p1bore: row.elementDetail.p1bore, Pipe: row.elementDetail.pipe || row.against.pipe?.fullLineTag, LineFamily: row.elementDetail.lineFamily || row.against.pipe?.lineFamily, FullLineTag: row.against.pipe?.fullLineTag, BranchNode: row.against.pipe?.fullBranchNode, SupportText: row.elementDetail.supportText, SupportGap: row.elementDetail.supportGap, Reference: row.elementDetail.reference, PositionE: row.elementDetail.position?.e, PositionS: row.elementDetail.position?.s, PositionU: row.elementDetail.position?.u, Distance: row.distance, PointX: row.point?.x, PointY: row.point?.y, PointZ: row.point?.z, SourcePath: row.source.path, AgainstPath: row.against.path })));
}

export function exportPsFamilyPsClashReportCsv(audit) {
  const headers = ['PSClashName', 'Source', 'SourceObject', 'Pipe', 'LineFamily', 'FullLineTag', 'BranchNode', 'CoverageInClashReport', 'ClashNo', 'Remarks'];
  return rowsToCsv(headers, (audit.psClashReportRows || []).map((row) => ({ PSClashName: row.psClashName, Source: row.source, SourceObject: row.sourceObject, Pipe: row.pipe, LineFamily: row.lineFamily, FullLineTag: row.fullLineTag, BranchNode: row.branchNode, CoverageInClashReport: row.coverageInClashReport, ClashNo: row.clashNo, Remarks: row.remarks })));
}

export function exportPsFamilyMissingCsv(audit) {
  const headers = ['SourceFamily', 'ExpectedMember', 'POSFamilyId', 'Pipe', 'LineFamily', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS', 'PositionU', 'Remarks'];
  return rowsToCsv(headers, audit.missingRows.map((row) => ({ SourceFamily: row.sourceFamily, ExpectedMember: row.expectedMember, POSFamilyId: row.posFamilyId, Pipe: row.pipe, LineFamily: row.lineFamily, SupportText: row.supportText, SupportGap: row.supportGap, Reference: row.reference, PositionE: row.position?.e, PositionS: row.position?.s, PositionU: row.position?.u, Remarks: row.remarks })));
}

export function exportPsFamilyOutOfFamilyCsv(audit) {
  const headers = ['ClashName', 'Source', 'AgainstMember', 'AgainstRoot', 'LineFamily', 'FullLineTag', 'BranchNode', 'Distance', 'Reason'];
  return rowsToCsv(headers, audit.outOfFamilyRows.map((row) => ({ ClashName: row.clashName, Source: row.source.familyRoot, AgainstMember: row.against.memberName, AgainstRoot: row.against.familyRoot, LineFamily: row.against.pipe?.lineFamily, FullLineTag: row.against.pipe?.fullLineTag, BranchNode: row.against.pipe?.fullBranchNode, Distance: row.distance, Reason: `Against root ${row.against.familyRoot} differs from source root ${row.source.familyRoot || audit.summary.sourceFamily}` })));
}

export function exportPsFamilyDuplicatesCsv(audit) {
  const headers = ['Member', 'ExactMemberKey', 'ClashCount', 'ClashRows', 'SourceObjects'];
  return rowsToCsv(headers, audit.duplicateRows.map((row) => ({ Member: row.member, ExactMemberKey: row.exactMemberKey, ClashCount: row.clashCount, ClashRows: row.clashNames, SourceObjects: row.sourceObjects })));
}

export function exportPsFamilyLineFamiliesCsv(audit) {
  const headers = ['LineFamily', 'FullLineTags', 'Branches', 'Members', 'ClashRows', 'ClashCount'];
  return rowsToCsv(headers, audit.lineFamilyRows.map((row) => ({ LineFamily: row.lineFamily, FullLineTags: row.fullLineTags, Branches: row.branches, Members: row.members, ClashRows: row.clashNames, ClashCount: row.clashCount })));
}

export function exportPsFamilyPosFamiliesCsv(audit) {
  const headers = ['POSFamilyId', 'ElementCount', 'SourceFamilies', 'LineFamilies', 'Pipes', 'CenterE', 'CenterS', 'CenterU', 'SpreadE', 'SpreadS', 'SpreadU', 'Members'];
  return rowsToCsv(headers, audit.posFamilyRows.map((row) => ({ POSFamilyId: row.posFamilyId, ElementCount: row.elementCount, SourceFamilies: row.sourceFamilies, LineFamilies: row.lineFamilies, Pipes: row.pipes, CenterE: row.center?.e, CenterS: row.center?.s, CenterU: row.center?.u, SpreadE: row.spread?.maxDeltaE, SpreadS: row.spread?.maxDeltaS, SpreadU: row.spread?.maxDeltaU, Members: row.members })));
}

export function exportPsFamilySourceVsPosFamilyCsv(audit) {
  const headers = ['Source', 'POSFamilyCount', 'ElementCount', 'FoundElementCount', 'MissingElementCount', 'ClashCount', 'OutOfFamilyCount', 'POSFamilyIds', 'LineFamilies', 'Remarks'];
  return rowsToCsv(headers, audit.sourceVsPosFamilyRows.map((row) => ({ Source: row.source, POSFamilyCount: row.posFamilyCount, ElementCount: row.elementCount, FoundElementCount: row.foundElementCount, MissingElementCount: row.missingElementCount, ClashCount: row.clashCount, OutOfFamilyCount: row.outOfFamilyCount, POSFamilyIds: row.posFamilyIds, LineFamilies: row.lineFamilies, Remarks: row.remarks })));
}

export function exportPsFamilyDiagnosticsCsv(audit) {
  const headers = ['Level', 'Code', 'Message'];
  return rowsToCsv(headers, (audit.diagnostics || []).map((row) => ({ Level: row.level, Code: row.code, Message: row.message })));
}

export function exportPsFamilyAuditJson(audit) { return `${JSON.stringify(audit, null, 2)}\n`; }

export const PS_FAMILY_ACTIVE_EXPORTS = Object.freeze({
  coverage: Object.freeze({ exportKey: 'coverageCsv', suffix: 'coverage' }),
  clashRows: Object.freeze({ exportKey: 'clashRowsCsv', suffix: 'clashRows' }),
  psClashReport: Object.freeze({ exportKey: 'psClashReportCsv', suffix: 'psClashReport' }),
  missing: Object.freeze({ exportKey: 'missingCsv', suffix: 'missing' }),
  outOfFamily: Object.freeze({ exportKey: 'outOfFamilyCsv', suffix: 'outOfFamily' }),
  duplicates: Object.freeze({ exportKey: 'duplicatesCsv', suffix: 'duplicates' }),
  lineFamilies: Object.freeze({ exportKey: 'lineFamiliesCsv', suffix: 'lineFamilies' }),
  posFamilies: Object.freeze({ exportKey: 'posFamiliesCsv', suffix: 'posFamilies' }),
  sourceVsPosFamily: Object.freeze({ exportKey: 'sourceVsPosFamilyCsv', suffix: 'sourceVsPosFamily' }),
  diagnostics: Object.freeze({ exportKey: 'diagnosticsCsv', suffix: 'diagnostics' }),
});

export function createPsFamilyAuditExports(audit) {
  return {
    coverageCsv: exportPsFamilyCoverageCsv(audit),
    clashRowsCsv: exportPsFamilyClashRowsCsv(audit),
    psClashReportCsv: exportPsFamilyPsClashReportCsv(audit),
    missingCsv: exportPsFamilyMissingCsv(audit),
    outOfFamilyCsv: exportPsFamilyOutOfFamilyCsv(audit),
    duplicatesCsv: exportPsFamilyDuplicatesCsv(audit),
    lineFamiliesCsv: exportPsFamilyLineFamiliesCsv(audit),
    posFamiliesCsv: exportPsFamilyPosFamiliesCsv(audit),
    sourceVsPosFamilyCsv: exportPsFamilySourceVsPosFamilyCsv(audit),
    diagnosticsCsv: exportPsFamilyDiagnosticsCsv(audit),
    auditJson: exportPsFamilyAuditJson(audit),
  };
}

export function createPsFamilyActiveReportExport(audit, activeTab = 'coverage') {
  const report = PS_FAMILY_ACTIVE_EXPORTS[activeTab] || PS_FAMILY_ACTIVE_EXPORTS.coverage;
  const exports = createPsFamilyAuditExports(audit);
  return Object.freeze({ activeTab: PS_FAMILY_ACTIVE_EXPORTS[activeTab] ? activeTab : 'coverage', exportKey: report.exportKey, suffix: report.suffix, mime: 'text/csv', text: exports[report.exportKey] });
}
