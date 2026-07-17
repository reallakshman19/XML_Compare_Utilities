export function exportCarrierCatalogCsv(audit) {
  const headers = [
    'CarrierObjectId', 'CarrierObjectClass', 'SourceRecordType',
    'BranchNode', 'FullLineTag', 'LineFamily', 'PositionGlobal',
    'PhysicalCarrierObjectAvailable', 'ContactEvidenceStatus', 'SourcePath',
  ];
  return rowsToCsv(headers, (audit?.carrierObjectRows || []).map((row) => ({
    CarrierObjectId: row.carrierObjectId,
    CarrierObjectClass: row.carrierObjectClass,
    SourceRecordType: row.sourceRecordType,
    BranchNode: row.lineContext?.branchNode,
    FullLineTag: row.lineContext?.fullLineTag,
    LineFamily: row.lineContext?.lineFamily,
    PositionGlobal: row.positionGlobal,
    PhysicalCarrierObjectAvailable: row.physicalCarrierObjectAvailable,
    ContactEvidenceStatus: row.contactEvidenceStatus,
    SourcePath: row.sourcePath,
  })));
}

export function exportCarrierResolutionCsv(audit) {
  const headers = [
    'EvidenceId', 'SupportFamilyId', 'SupportMemberId', 'SupportMemberRole',
    'ResolutionStatus', 'CarrierObjectId', 'BranchContextId', 'BranchNode',
    'ExplicitCarrierReference', 'HierarchyCarrierReference',
    'CandidateCarrierObjectIds', 'RelationshipBasis', 'RelationshipCardinality',
    'Confidence', 'PhysicalCarrierObjectAvailable', 'ContactEvidenceStatus',
  ];
  return rowsToCsv(headers, (audit?.carrierResolutionRows || []).map((row) => ({
    EvidenceId: row.evidenceId,
    SupportFamilyId: row.supportFamilyId,
    SupportMemberId: row.supportMemberId,
    SupportMemberRole: row.supportMemberRole,
    ResolutionStatus: row.resolutionStatus,
    CarrierObjectId: row.carrierObjectId,
    BranchContextId: row.branchContextId,
    BranchNode: row.branchNode,
    ExplicitCarrierReference: row.explicitCarrierReference,
    HierarchyCarrierReference: row.hierarchyCarrierReference,
    CandidateCarrierObjectIds: row.candidateCarrierObjectIds,
    RelationshipBasis: row.relationshipBasis,
    RelationshipCardinality: row.relationshipCardinality,
    Confidence: row.confidence,
    PhysicalCarrierObjectAvailable: row.physicalCarrierObjectAvailable,
    ContactEvidenceStatus: row.contactEvidenceStatus,
  })));
}

export function exportSupportCarrierEdgesCsv(audit) {
  const headers = [
    'EdgeId', 'EdgeType', 'SupportFamilyId', 'SupportMemberId',
    'CarrierObjectId', 'BranchContextId', 'RelationshipStatus',
    'RelationshipBasis', 'Confidence', 'EvidenceId', 'EvidenceClass',
    'ContactEvidenceStatus',
  ];
  const rows = [
    ...(audit?.supportCarrierEdgeRows || []),
    ...(audit?.branchContextEdgeRows || []),
  ];
  return rowsToCsv(headers, rows.map((row) => ({
    EdgeId: row.edgeId,
    EdgeType: row.edgeType,
    SupportFamilyId: row.supportFamilyId,
    SupportMemberId: row.supportMemberId,
    CarrierObjectId: row.carrierObjectId,
    BranchContextId: row.branchContextId,
    RelationshipStatus: row.relationshipStatus,
    RelationshipBasis: row.relationshipBasis,
    Confidence: row.confidence,
    EvidenceId: row.evidenceId,
    EvidenceClass: row.evidenceClass,
    ContactEvidenceStatus: row.contactEvidenceStatus,
  })));
}

function rowsToCsv(headers, rows) {
  return `${[
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ].join('\n')}\n`;
}

function csvCell(value) {
  const text = Array.isArray(value)
    ? value.join('|')
    : value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
