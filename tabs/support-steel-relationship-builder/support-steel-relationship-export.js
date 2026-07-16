export function supportSteelRelationshipsToCsv(bundle) {
  const headers = [
    'supportFamilyId',
    'steelGroupId',
    'relationshipStatus',
    'confidence',
    'relationshipBasis',
    'distanceMm',
    'branchIds',
    'carrierIds',
    'memberCount',
    'candidateSteelGroupIds',
  ];
  const rows = (bundle?.relationships || []).map((relationship) => ({
    supportFamilyId: relationship.supportFamilyId,
    steelGroupId: relationship.steelGroupId || '',
    relationshipStatus: relationship.relationshipStatus,
    confidence: relationship.confidence,
    relationshipBasis: (relationship.relationshipBasis || []).join('|'),
    distanceMm: relationship.distanceMm ?? '',
    branchIds: (relationship.branchIds || []).join('|'),
    carrierIds: (relationship.carrierIds || []).join('|'),
    memberCount: relationship.memberCount ?? 0,
    candidateSteelGroupIds: (relationship.candidateSteelGroupIds || []).join('|'),
  }));
  return [headers.join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\n');
}

export function supportSteelHierarchyToText(bundle) {
  const lines = [];
  for (const family of bundle?.supportFamilies || []) {
    lines.push(family.familyId);
    lines.push(`├── branches: ${(family.branchIds || []).join(', ') || 'none'}`);
    lines.push(`├── carriers: ${(family.carrierIds || []).join(', ') || 'none'}`);
    lines.push('├── members');
    family.members.forEach((member, index) => {
      const last = index === family.members.length - 1;
      lines.push(`│   ${last ? '└──' : '├──'} ${member.memberId || '(unresolved member)'} [${member.semanticRole || 'OTHER'}]`);
    });
    lines.push('└── steel relationships');
    family.steelRelationships.forEach((relationship, index) => {
      const last = index === family.steelRelationships.length - 1;
      const target = relationship.steelGroupId || 'UNRESOLVED';
      lines.push(`    ${last ? '└──' : '├──'} ${target} — ${relationship.relationshipStatus}`);
    });
  }
  return lines.join('\n');
}

export function supportSteelBundleToJson(bundle) {
  return JSON.stringify(bundle, null, 2);
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
