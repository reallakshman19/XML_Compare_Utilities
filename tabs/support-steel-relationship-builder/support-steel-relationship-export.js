export function supportSteelRelationshipsToCsv(bundle) {
  const headers = [
    'evidenceId',
    'evidenceSource',
    'evidenceClass',
    'sourceSchema',
    'geometryEngineSchema',
    'relationshipSemantic',
    'contactEvidenceStatus',
    'supportFamilyId',
    'steelGroupId',
    'structuralMemberId',
    'relationshipStatus',
    'relationshipCardinality',
    'confidence',
    'relationshipBasis',
    'analyticalGeometryAvailable',
    'geometryMethod',
    'geometryQuality',
    'distanceMm',
    'projectionToleranceMm',
    'withinProjectionTolerance',
    'nearestPointOnSteelGlobal',
    'branchIds',
    'carrierIds',
    'memberCount',
    'candidateSteelGroupIds',
  ];
  const rows = (bundle?.relationships || []).map((relationship) => ({
    evidenceId: relationship.evidenceId,
    evidenceSource: relationship.evidenceSource,
    evidenceClass: relationship.evidenceClass,
    sourceSchema: relationship.sourceSchema,
    geometryEngineSchema: relationship.geometryEngineSchema,
    relationshipSemantic: relationship.relationshipSemantic,
    contactEvidenceStatus: relationship.contactEvidenceStatus,
    supportFamilyId: relationship.supportFamilyId,
    steelGroupId: relationship.steelGroupId || '',
    structuralMemberId: relationship.structuralMemberId || '',
    relationshipStatus: relationship.relationshipStatus,
    relationshipCardinality: relationship.relationshipCardinality,
    confidence: relationship.confidence,
    relationshipBasis: (relationship.relationshipBasis || []).join('|'),
    analyticalGeometryAvailable: relationship.analyticalGeometryAvailable,
    geometryMethod: relationship.geometryMethod,
    geometryQuality: relationship.geometryQuality,
    distanceMm: relationship.distanceMm ?? '',
    projectionToleranceMm: relationship.projectionToleranceMm ?? '',
    withinProjectionTolerance: relationship.withinProjectionTolerance,
    nearestPointOnSteelGlobal: pointText(relationship.nearestPointOnSteelGlobal),
    branchIds: (relationship.branchIds || []).join('|'),
    carrierIds: (relationship.carrierIds || []).join('|'),
    memberCount: relationship.memberCount ?? 0,
    candidateSteelGroupIds: (relationship.candidateSteelGroupIds || []).join('|'),
  }));
  return rowsToCsv(headers, rows);
}

export function supportMemberChainToCsv(bundle) {
  const headers = [
    'edgeId',
    'edgeType',
    'supportFamilyId',
    'supportA',
    'supportB',
    'supportMemberId',
    'steelGroupId',
    'structuralMemberId',
    'relationshipStatus',
    'relationshipBasis',
    'evidenceSource',
    'evidenceClass',
    'contactEvidenceStatus',
    'confidence',
    'geometryMethod',
    'geometryQuality',
    'distanceMm',
    'contactPointGlobal',
  ];
  const chain = bundle?.supportMemberChain || {};
  const edges = [
    ...(chain.supportChainEdges || []),
    ...(chain.nearbyCandidateEdges || []),
    ...(chain.referenceEdges || []),
    ...(chain.structuralTerminalEdges || []),
  ];
  const rows = edges.map((edge) => ({
    edgeId: edge.edgeId,
    edgeType: edge.edgeType,
    supportFamilyId: edge.supportFamilyId,
    supportA: edge.supportA || edge.fromMemberId || '',
    supportB: edge.supportB || edge.toMemberId || '',
    supportMemberId: edge.supportMemberId || '',
    steelGroupId: edge.steelGroupId || '',
    structuralMemberId: edge.structuralMemberId || '',
    relationshipStatus: edge.relationshipStatus,
    relationshipBasis: (edge.relationshipBasis || []).join('|'),
    evidenceSource: edge.evidenceSource,
    evidenceClass: edge.evidenceClass,
    contactEvidenceStatus: edge.contactEvidenceStatus,
    confidence: edge.confidence,
    geometryMethod: edge.geometryMethod || '',
    geometryQuality: edge.geometryQuality || '',
    distanceMm: edge.distanceMm ?? '',
    contactPointGlobal: pointText(edge.contactPointGlobal),
  }));
  return rowsToCsv(headers, rows);
}

export function supportSteelHierarchyToText(bundle) {
  const lines = [];
  lines.push(`schema: ${bundle?.schema || 'SupportSteelRelationshipBundle.v1'}`);
  lines.push(`geometry engine: ${bundle?.geometryEngineSchema || 'UNAVAILABLE'}`);
  lines.push(`member chain engine: ${bundle?.memberChainEngineSchema || 'UNAVAILABLE'}`);
  lines.push(`purpose: ${bundle?.bundlePurpose || 'RELATIONSHIP_INFERENCE'}`);
  lines.push(`confirmed physical contact: ${bundle?.contactEvidenceAvailable ? 'AVAILABLE' : 'NOT_PROVEN'}`);
  lines.push(`analytical member contact candidates: ${bundle?.analyticalMemberContactEvidenceAvailable ? 'AVAILABLE' : 'NONE'}`);
  lines.push('');
  for (const family of bundle?.supportFamilies || []) {
    const familyChain = bundle?.supportMemberChain?.familyChains?.find((row) => row.familyId === family.familyId);
    lines.push(family.familyId);
    lines.push(`├── branches: ${(family.branchIds || []).join(', ') || 'none'}`);
    lines.push(`├── carriers: ${(family.carrierIds || []).join(', ') || 'none'}`);
    lines.push('├── members');
    family.members.forEach((member, index) => {
      const last = index === family.members.length - 1;
      const geometry = member.analyticalGeometry?.physicalGeometryAvailable
        ? (member.analyticalGeometry.geometryMethods || []).join('+')
        : 'symbolic/no-geometry';
      lines.push(`│   ${last ? '└──' : '├──'} ${member.memberId || '(unresolved member)'} [${member.semanticRole || 'OTHER'}] · ${geometry}`);
    });
    lines.push('├── support member contact edges');
    if (familyChain?.supportChainEdges?.length) {
      familyChain.supportChainEdges.forEach((edge, index) => {
        const last = index === familyChain.supportChainEdges.length - 1;
        lines.push(`│   ${last ? '└──' : '├──'} ${edge.supportA} ↔ ${edge.supportB} · ${edge.geometryMethod} · ${edge.distanceMm} mm`);
      });
    } else {
      lines.push('│   └── none');
    }
    lines.push('├── symbolic reference edges');
    if (familyChain?.referenceEdges?.length) {
      familyChain.referenceEdges.forEach((edge, index) => {
        const last = index === familyChain.referenceEdges.length - 1;
        lines.push(`│   ${last ? '└──' : '├──'} ${edge.fromMemberId} → ${edge.toMemberId} · NOT_PROVEN`);
      });
    } else {
      lines.push('│   └── none');
    }
    lines.push('├── structural terminal edges');
    if (familyChain?.structuralTerminalEdges?.length) {
      familyChain.structuralTerminalEdges.forEach((edge, index) => {
        const last = index === familyChain.structuralTerminalEdges.length - 1;
        const target = edge.structuralMemberId || edge.steelGroupId || 'UNRESOLVED';
        lines.push(`│   ${last ? '└──' : '├──'} ${edge.supportMemberId} → ${target} · ${edge.relationshipStatus} · ${edge.distanceMm ?? '—'} mm`);
      });
    } else {
      lines.push('│   └── none');
    }
    lines.push('└── inferred steel relationships');
    family.steelRelationships.forEach((relationship, index) => {
      const last = index === family.steelRelationships.length - 1;
      const target = relationship.steelGroupId || relationship.nearestSteelGroupId || 'UNRESOLVED';
      const member = relationship.structuralMemberId || 'no analytical member';
      const method = relationship.geometryMethod || 'UNAVAILABLE';
      lines.push(`    ${last ? '└──' : '├──'} ${target} — ${relationship.relationshipStatus} — ${relationship.relationshipCardinality}`);
      lines.push(`        geometry: ${member} · ${method} · ${relationship.distanceMm ?? '—'} mm`);
    });
  }
  return lines.join('\n');
}

export function supportSteelBundleToJson(bundle) {
  return JSON.stringify(bundle, null, 2);
}

function rowsToCsv(headers, rows) {
  return [headers.join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\n');
}

function pointText(point) {
  return point ? `${point.x} ${point.y} ${point.z}` : '';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
