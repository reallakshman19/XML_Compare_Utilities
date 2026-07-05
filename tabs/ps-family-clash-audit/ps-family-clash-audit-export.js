function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join('; '));
  if (value && typeof value === 'object') return csvEscape(JSON.stringify(value));
  const text = value == null ? '' : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(headers, rows) {
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  });
  return `${lines.join('\n')}\n`;
}

export function exportPsFamilyCoverageCsv(audit) {
  const headers = [
    'SourceFamily', 'ExpectedMember', 'Status', 'ClashCount', 'ClashRows', 'POSFamilyId', 'p1bore', 'Pipe',
    'LineFamily', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS', 'PositionU',
    'AgainstMembers', 'LineFamilies', 'FullLineTags', 'BranchNodes', 'SourceObjects', 'Remarks',
  ];
  return rowsToCsv(headers, audit.coverageRows.map((row) => ({
    SourceFamily: row.sourceFamily,
    ExpectedMember: row.expectedMember,
    Status: row.status,
    ClashCount: row.clashCount,
    ClashRows: row.clashNames,
    POSFamilyId: row.posFamilyId,
    p1bore: row.p1bore,
    Pipe: row.pipe,
    LineFamily: row.lineFamily || row.lineFamilies,
    SupportText: row.supportText,
    SupportGap: row.supportGap,
    Reference: row.reference,
    PositionE: row.position?.e,
    PositionS: row.position?.s,
    PositionU: row.position?.u,
    AgainstMembers: row.againstMembers,
    LineFamilies: row.lineFamilies,
    FullLineTags: row.fullLineTags,
    BranchNodes: row.branchNodes,
    SourceObjects: row.sourceObjects,
    Remarks: row.remarks,
  })));
}

export function exportPsFamilyClashRowsCsv(audit) {
  const headers = [
    'ClashName', 'Source', 'SourceObject', 'AgainstMember', 'FamilyStatus', 'POSFamilyId', 'p1bore', 'Pipe',
    'LineFamily', 'FullLineTag', 'BranchNode', 'SupportText', 'SupportGap', 'Reference', 'PositionE', 'PositionS',
    'PositionU', 'Distance', 'PointX', 'PointY', 'PointZ', 'SourcePath', 'AgainstPath',
  ];
  return rowsToCsv(headers, audit.clashRows.map((row) => ({
    ClashName: row.clashName,
    Source: row.source.familyRoot,
    SourceObject: row.source.objectName,
    AgainstMember: row.against.memberName,
    FamilyStatus: row.familyStatus,
    POSFamilyId: row.elementDetail.posFamilyId,
    p1bore: row.elementDetail.p1bore,
    Pipe: row.elementDetail.pipe || row.against.pipe?.fullLineTag,
    LineFamily: row.elementDetail.lineFamily || row.against.pipe?.lineFamily,
    FullLineTag: row.against.pipe?.fullLineTag,
    BranchNode: row.against.pipe?.fullBranchNode,
    SupportText: row.elementDetail.supportText,
    SupportGap: row.elementDetail.supportGap,
    Reference: row.elementDetail.reference,
    PositionE: row.elementDetail.position?.e,
    PositionS: row.elementDetail.position?.s,
    PositionU: row.elementDetail.position?.u,
    Distance: row.distance,
    PointX: row.point?.x,
    PointY: row.point?.y,
    PointZ: row.point?.z,
    SourcePath: row.source.path,
    AgainstPath: row.against.path,
  })));
}

export function exportPsFamilySourceVsPosFamilyCsv(audit) {
  const headers = ['Source', 'POSFamilyCount', 'ElementCount', 'FoundElementCount', 'MissingElementCount', 'ClashCount', 'OutOfFamilyCount', 'POSFamilyIds', 'LineFamilies', 'Remarks'];
  return rowsToCsv(headers, audit.sourceVsPosFamilyRows.map((row) => ({
    Source: row.source,
    POSFamilyCount: row.posFamilyCount,
    ElementCount: row.elementCount,
    FoundElementCount: row.foundElementCount,
    MissingElementCount: row.missingElementCount,
    ClashCount: row.clashCount,
    OutOfFamilyCount: row.outOfFamilyCount,
    POSFamilyIds: row.posFamilyIds,
    LineFamilies: row.lineFamilies,
    Remarks: row.remarks,
  })));
}

export function exportPsFamilyAuditJson(audit) {
  return `${JSON.stringify(audit, null, 2)}\n`;
}

export function createPsFamilyAuditExports(audit) {
  return {
    coverageCsv: exportPsFamilyCoverageCsv(audit),
    clashRowsCsv: exportPsFamilyClashRowsCsv(audit),
    sourceVsPosFamilyCsv: exportPsFamilySourceVsPosFamilyCsv(audit),
    auditJson: exportPsFamilyAuditJson(audit),
  };
}
