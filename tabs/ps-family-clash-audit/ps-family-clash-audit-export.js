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
  return rowsToCsv(headers, (audit.coverageRows || []).map((row) => ({ SourceFamily: row.sourceFamily, ExpectedMember: row.expectedMember, Status: row.status, ClashCount: row.clashCount, ClashRows: row.clashNames, POSFamilyId: row.posFamilyId, p1bore: row.p1bore, Pipe: row.pipe, LineFamily: row.lineFamily || row.lineFamilies, SupportText: row.supportText, SupportGap: row.supportGap, Reference: row.reference, PositionE: row.position?.e, PositionS: row.position?.s, PositionU: row.position?.u, AgainstMembers: row.againstMembers, LineFamilies: row.lineFamilies, FullLineTags: row.fullLineTags, BranchNodes: row.branchNodes, SourceObjects: row.sourceObjects, Remarks: row.remarks })));
}

export function exportPsFamilyClashRowsCsv(audit) {
  const headers = ['ClashName', 'Source', 'SourceObject', 'AgainstMember', 'FamilyStatus', 'POSFamilyId', 'p1bore', 'Pipe', 'LineFamily', 'FullLineTag', 'BranchNode', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS', 'PositionU', 'Distance', 'PointX', 'PointY', 'PointZ', 'SourcePath', 'AgainstPath'];
  return rowsToCsv(headers, (audit.clashRows || []).map((row) => ({ ClashName: row.clashName, Source: row.source.familyRoot, SourceObject: row.source.objectName, AgainstMember: row.against.memberName, FamilyStatus: row.familyStatus, POSFamilyId: row.elementDetail.posFamilyId, p1bore: row.elementDetail.p1bore, Pipe: row.elementDetail.pipe || row.against.pipe?.fullLineTag, LineFamily: row.elementDetail.lineFamily || row.against.pipe?.lineFamily, FullLineTag: row.against.pipe?.fullLineTag, BranchNode: row.against.pipe?.fullBranchNode, SupportText: row.elementDetail.supportText, SupportGap: row.elementDetail.supportGap, Reference: row.elementDetail.reference, PositionE: row.elementDetail.position?.e, PositionS: row.elementDetail.position?.s, PositionU: row.elementDetail.position?.u, Distance: row.distance, PointX: row.point?.x, PointY: row.point?.y, PointZ: row.point?.z, SourcePath: row.source.path, AgainstPath: row.against.path })));
}

export function exportSupportSummaryCsv(audit) {
  const headers = ['No', 'Line', 'BranchNode', 'LineFamily', 'PSRoot', 'SupportGroup', 'StructuralGroupCount', 'SupportCount', 'SupportMembers', 'EvidenceClashes', 'Status', 'Remarks'];
  return rowsToCsv(headers, (audit.supportSummaryRows || []).map((row) => ({ No: row.no, Line: row.line, BranchNode: row.branchNode, LineFamily: row.lineFamily, PSRoot: row.psRoot, SupportGroup: row.supportGroup, StructuralGroupCount: row.structuralGroupCount, SupportCount: row.supportCount, SupportMembers: row.supportMembers, EvidenceClashes: row.evidenceClashes, Status: row.status, Remarks: row.remarks })));
}

export function exportLineSupportTreeText(audit) { return `${(audit.lineSupportTreeRows || []).map((row) => row.treeText).join('\n\n')}\n`; }

export function exportStructureLineProximityCsv(audit) {
  const headers = ['StructuralGroupRoot', 'StructuralGroupNames', 'LineNo', 'LineFamily', 'BranchNode', 'SupportGroup', 'SupportsWithin250mm', 'SupportCount', 'TotalSupportCount', 'RepresentativeSupport', 'RepresentativeCoordinate', 'EvidenceClashes', 'Remarks'];
  return rowsToCsv(headers, (audit.structureLineProximityRows || []).map((row) => ({ StructuralGroupRoot: row.structuralGroupRoot, StructuralGroupNames: row.structuralGroupNames, LineNo: row.lineNo, LineFamily: row.lineFamily, BranchNode: row.branchNode, SupportGroup: row.supportGroup, SupportsWithin250mm: row.supportsWithin250mm, SupportCount: row.supportCount, TotalSupportCount: row.totalSupportCount, RepresentativeSupport: row.representativeSupport, RepresentativeCoordinate: row.representativeCoordinate, EvidenceClashes: row.evidenceClashes, Remarks: row.remarks })));
}

export function exportStructureContactsCsv(audit) {
  const headers = ['SupportGroup', 'StructuralGroup', 'Support', 'Line', 'LineFamily', 'BranchNode', 'ContactClash', 'Distance', 'Point', 'Remarks'];
  return rowsToCsv(headers, (audit.structureContactRows || []).map((row) => ({ SupportGroup: row.supportGroup, StructuralGroup: row.structuralGroup, Support: row.support, Line: row.line, LineFamily: row.lineFamily, BranchNode: row.branchNode, ContactClash: row.contactClash, Distance: row.distance, Point: row.point, Remarks: row.remarks })));
}

export function exportSupportChainCsv(audit) {
  const headers = ['SupportGroup', 'SupportA', 'SupportB', 'Line', 'LineFamily', 'BranchNode', 'SupportClash', 'Distance', 'Point', 'Remarks'];
  return rowsToCsv(headers, (audit.supportChainRows || []).map((row) => ({ SupportGroup: row.supportGroup, SupportA: row.supportA, SupportB: row.supportB, Line: row.line, LineFamily: row.lineFamily, BranchNode: row.branchNode, SupportClash: row.supportClash, Distance: row.distance, Point: row.point, Remarks: row.remarks })));
}

export function exportSupportMembersCsv(audit) {
  const headers = ['SupportGroup', 'RepresentativeSupport', 'Support', 'MemberType', 'ConnectedTo', 'EvidenceClashes', 'CoverageRole', 'Remarks'];
  return rowsToCsv(headers, (audit.supportMemberRows || []).map((row) => ({ SupportGroup: row.supportGroup, RepresentativeSupport: row.representativeSupport, Support: row.support, MemberType: row.memberType, ConnectedTo: row.connectedTo, EvidenceClashes: row.evidenceClashes, CoverageRole: row.coverageRole, Remarks: row.remarks })));
}

export function exportSupportExceptionsCsv(audit) {
  const headers = ['ExceptionCode', 'Severity', 'SupportGroup', 'LineFamily', 'FullLineTag', 'BranchNode', 'StructuralGroup', 'Support', 'SupportA', 'SupportB', 'SourceInput', 'EvidenceClash', 'Reason'];
  return rowsToCsv(headers, (audit.supportExceptionRows || []).map((row) => ({ ExceptionCode: row.exceptionCode, Severity: row.severity, SupportGroup: row.supportGroup, LineFamily: row.lineFamily, FullLineTag: row.fullLineTag, BranchNode: row.branchNode, StructuralGroup: row.structuralGroup, Support: row.support, SupportA: row.supportA, SupportB: row.supportB, SourceInput: row.sourceInput, EvidenceClash: row.evidenceClash, Reason: row.reason })));
}

export function exportInputEvidenceCsv(audit) {
  const headers = ['SourceInput', 'ClashName', 'ObjectAType', 'ObjectBType', 'LineFamily', 'BranchNode', 'SupportGroup', 'Distance', 'ParsedEdge'];
  return rowsToCsv(headers, (audit.inputEvidenceRows || []).map((row) => ({ SourceInput: row.sourceInput, ClashName: row.clashName, ObjectAType: row.objectAType, ObjectBType: row.objectBType, LineFamily: row.lineFamily, BranchNode: row.branchNode, SupportGroup: row.supportGroup, Distance: row.distance, ParsedEdge: row.parsedEdge })));
}

export function exportConnectivityMatrixCsv(audit) {
  const headers = ['SupportGroup', 'From', 'To', 'EdgeType', 'Clash', 'SourceInput', 'Status'];
  return rowsToCsv(headers, (audit.connectivityMatrixRows || []).map((row) => ({ SupportGroup: row.supportGroup, From: row.from, To: row.to, EdgeType: row.edgeType, Clash: row.clash, SourceInput: row.sourceInput, Status: row.status })));
}

export function exportPsFamilyMissingCsv(audit) { return rowsToCsv(['SourceFamily', 'ExpectedMember', 'Remarks'], (audit.missingRows || []).map((row) => ({ SourceFamily: row.sourceFamily, ExpectedMember: row.expectedMember, Remarks: row.remarks }))); }
export function exportPsFamilyOutOfFamilyCsv(audit) { return rowsToCsv(['ClashName', 'Source', 'AgainstMember', 'AgainstRoot'], (audit.outOfFamilyRows || []).map((row) => ({ ClashName: row.clashName, Source: row.source.familyRoot, AgainstMember: row.against.memberName, AgainstRoot: row.against.familyRoot }))); }
export function exportPsFamilyDuplicatesCsv(audit) { return rowsToCsv(['Member', 'ExactMemberKey', 'ClashCount'], (audit.duplicateRows || []).map((row) => ({ Member: row.member, ExactMemberKey: row.exactMemberKey, ClashCount: row.clashCount }))); }
export function exportPsFamilyLineFamiliesCsv(audit) { return rowsToCsv(['LineFamily', 'ClashCount'], (audit.lineFamilyRows || []).map((row) => ({ LineFamily: row.lineFamily, ClashCount: row.clashCount }))); }
export function exportPsFamilyPosFamiliesCsv(audit) { return rowsToCsv(['POSFamilyId', 'ElementCount'], (audit.posFamilyRows || []).map((row) => ({ POSFamilyId: row.posFamilyId, ElementCount: row.elementCount }))); }
export function exportPsFamilySourceVsPosFamilyCsv(audit) {
  const headers = ['Source', 'POSFamilyCount', 'ElementCount', 'FoundElementCount', 'MissingElementCount', 'ClashCount', 'OutOfFamilyCount', 'POSFamilyIds', 'LineFamilies', 'Remarks'];
  return rowsToCsv(headers, (audit.sourceVsPosFamilyRows || []).map((row) => ({ Source: row.source, POSFamilyCount: row.posFamilyCount, ElementCount: row.elementCount, FoundElementCount: row.foundElementCount, MissingElementCount: row.missingElementCount, ClashCount: row.clashCount, OutOfFamilyCount: row.outOfFamilyCount, POSFamilyIds: row.posFamilyIds, LineFamilies: row.lineFamilies, Remarks: row.remarks })));
}
export function exportPsFamilyDiagnosticsCsv(audit) { return rowsToCsv(['Level', 'Code', 'Message'], (audit.diagnostics || []).map((row) => ({ Level: row.level, Code: row.code, Message: row.message }))); }
export function exportPsFamilyPsClashReportCsv(audit) { return exportSupportMembersCsv(audit); }
export function exportPsFamilyAuditJson(audit) { return `${JSON.stringify(audit, null, 2)}\n`; }

export const PS_FAMILY_ACTIVE_EXPORTS = Object.freeze({
  supportSummary: Object.freeze({ exportKey: 'supportSummaryCsv', suffix: 'supportgroup-summary' }),
  lineSupportTree: Object.freeze({ exportKey: 'lineSupportTreeText', suffix: 'line-support-tree' }),
  structureLineProximity: Object.freeze({ exportKey: 'structureLineProximityCsv', suffix: 'structure-line-proximity' }),
  supportExceptions: Object.freeze({ exportKey: 'supportExceptionsCsv', suffix: 'supportchange-exceptions' }),
  inputEvidence: Object.freeze({ exportKey: 'inputEvidenceCsv', suffix: 'input-evidence' }),
});

export function createPsFamilyAuditExports(audit) {
  return { supportSummaryCsv: exportSupportSummaryCsv(audit), lineSupportTreeText: exportLineSupportTreeText(audit), structureLineProximityCsv: exportStructureLineProximityCsv(audit), supportExceptionsCsv: exportSupportExceptionsCsv(audit), inputEvidenceCsv: exportInputEvidenceCsv(audit), structureContactsCsv: exportStructureContactsCsv(audit), supportChainCsv: exportSupportChainCsv(audit), supportMembersCsv: exportSupportMembersCsv(audit), connectivityMatrixCsv: exportConnectivityMatrixCsv(audit), coverageCsv: exportPsFamilyCoverageCsv(audit), clashRowsCsv: exportPsFamilyClashRowsCsv(audit), psClashReportCsv: exportPsFamilyPsClashReportCsv(audit), missingCsv: exportPsFamilyMissingCsv(audit), outOfFamilyCsv: exportPsFamilyOutOfFamilyCsv(audit), duplicatesCsv: exportPsFamilyDuplicatesCsv(audit), lineFamiliesCsv: exportPsFamilyLineFamiliesCsv(audit), posFamiliesCsv: exportPsFamilyPosFamiliesCsv(audit), sourceVsPosFamilyCsv: exportPsFamilySourceVsPosFamilyCsv(audit), diagnosticsCsv: exportPsFamilyDiagnosticsCsv(audit), auditJson: exportPsFamilyAuditJson(audit) };
}

export function createPsFamilyActiveReportExport(audit, activeTab = 'supportSummary') {
  const report = PS_FAMILY_ACTIVE_EXPORTS[activeTab];
  if (!report) return null;
  const exports = createPsFamilyAuditExports(audit);
  return Object.freeze({ activeTab, exportKey: report.exportKey, suffix: report.suffix, mime: report.exportKey.endsWith('Text') ? 'text/plain' : 'text/csv', text: exports[report.exportKey] });
}
