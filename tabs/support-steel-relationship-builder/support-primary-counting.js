import { SUPPORT_PRIMARY_RELATIONSHIP_SCHEMA } from './support-primary-relationship.js';
import { reconcileSupportPrimaryAssemblies } from './support-primary-reconciliation.js';

export const SUPPORT_PRIMARY_COUNT_SCHEMA = 'SupportPrimaryCountProjection.v1';

export function applySupportPrimaryAssemblyCounts(input = {}) {
  const locationGroups = Array.isArray(input.locationGroups) ? input.locationGroups : [];
  const relationshipBundle = input.relationshipBundle || null;
  const reconciliation = reconcileSupportPrimaryAssemblies({ locationGroups, relationshipBundle });
  const relationshipFamilies = relationshipFamilyIndex(relationshipBundle);
  const assignmentsByFamily = groupAssignments(reconciliation.assignments);
  const groupsByFamily = groupLocationRows(locationGroups);
  const familyIds = unique([
    ...groupsByFamily.keys(),
    ...relationshipFamilies.keys(),
  ]).sort();
  const familySummaries = familyIds.map((familyId) => buildFamilyCountSummary({
    familyId,
    locationGroups: groupsByFamily.get(familyId) || [],
    assignments: assignmentsByFamily.get(familyId) || [],
    relationshipFamily: relationshipFamilies.get(familyId) || null,
  }));
  const summaryByFamily = new Map(familySummaries.map((row) => [row.familyId, row]));
  const assignmentByGroupId = new Map(reconciliation.assignments.map((row) => [clean(row.groupId), row]));
  const groups = locationGroups.map((group) => projectCountedGroup(
    group,
    assignmentByGroupId.get(clean(group?.groupId)) || null,
    summaryByFamily.get(normalizeFamilyId(group?.secondarySupportFamilyId)) || null,
  ));
  const diagnostics = familySummaries.flatMap((row) => row.diagnostics);
  return Object.freeze({
    schema: SUPPORT_PRIMARY_COUNT_SCHEMA,
    relationshipSchema: relationshipBundle?.schema || '',
    relationshipEvidenceAvailable: relationshipBundle?.schema === SUPPORT_PRIMARY_RELATIONSHIP_SCHEMA,
    reconciliation,
    groups: Object.freeze(groups),
    familySummaries: Object.freeze(familySummaries),
    diagnostics: Object.freeze(diagnostics),
    summary: Object.freeze({
      familyCount: familySummaries.length,
      explicitAuthorityFamilyCount: familySummaries.filter((row) => row.explicitRelationshipFamilyAvailable).length,
      ambiguityFamilyCount: familySummaries.filter((row) => row.ambiguityCount > 0).length,
    }),
  });
}

function buildFamilyCountSummary({ familyId, locationGroups, assignments, relationshipFamily }) {
  const legacyGeometryCount = locationGroups.length;
  const explicitAssemblyIds = relationshipFamily
    ? (relationshipFamily.assemblies || []).filter((row) => row?.countable).map((row) => clean(row.assemblyId)).filter(Boolean).sort()
    : [];
  const geometryOnlyAssignments = assignments.filter((row) => row.status === 'GEOMETRY_ONLY');
  const partialAssignments = assignments.filter((row) => row.status === 'PARTIAL_EXPLICIT');
  const conflictAssignments = assignments.filter((row) => row.status === 'CONFLICT');
  const ambiguityCount = partialAssignments.length + conflictAssignments.length;
  const explicitRelationshipFamilyAvailable = Boolean(relationshipFamily);

  if (!explicitRelationshipFamilyAvailable) {
    return freezeFamilySummary({
      familyId,
      totalSupportPointsOnSecondary: legacyGeometryCount,
      countBasis: 'LEGACY_GEOMETRY_GROUP_COUNT',
      legacyGeometryCount,
      explicitAssemblyIds: [],
      geometryOnlyGroupIds: locationGroups.map((row) => clean(row?.groupId)).filter(Boolean),
      ambiguityCount: 0,
      explicitRelationshipFamilyAvailable: false,
      diagnostics: [],
    });
  }

  const geometryOnlyGroupIds = geometryOnlyAssignments.map((row) => clean(row.groupId)).filter(Boolean);
  const derivedMinimumCount = explicitAssemblyIds.length + geometryOnlyAssignments.length;
  const total = ambiguityCount
    ? Math.max(legacyGeometryCount, derivedMinimumCount)
    : derivedMinimumCount;
  const countBasis = ambiguityCount
    ? 'EXPLICIT_ASSEMBLY_PLUS_GEOMETRY_AMBIGUITY_FLOOR'
    : 'EXPLICIT_ASSEMBLY_PLUS_GEOMETRY';
  const diagnostics = ambiguityCount ? [Object.freeze({
    level: 'WARN',
    code: 'PRIMARY_ASSEMBLY_COUNT_AMBIGUITY_FLOOR',
    familyId,
    legacyGeometryCount,
    derivedMinimumCount,
    totalSupportPointsOnSecondary: total,
    partialExplicitGroupIds: Object.freeze(partialAssignments.map((row) => clean(row.groupId)).filter(Boolean)),
    conflictGroupIds: Object.freeze(conflictAssignments.map((row) => clean(row.groupId)).filter(Boolean)),
    message: 'Primary-support topology contains partial/conflicting location evidence; total count is conservatively floored so it cannot fall below existing geometry evidence.',
  })] : [];

  return freezeFamilySummary({
    familyId,
    totalSupportPointsOnSecondary: total,
    countBasis,
    legacyGeometryCount,
    explicitAssemblyIds,
    geometryOnlyGroupIds,
    ambiguityCount,
    explicitRelationshipFamilyAvailable: true,
    diagnostics,
  });
}

function freezeFamilySummary(input) {
  return Object.freeze({
    familyId: input.familyId,
    totalSupportPointsOnSecondary: input.totalSupportPointsOnSecondary,
    multiplePrimarySupport: input.totalSupportPointsOnSecondary > 1,
    countBasis: input.countBasis,
    legacyGeometryCount: input.legacyGeometryCount,
    explicitAssemblyIds: Object.freeze([...(input.explicitAssemblyIds || [])]),
    geometryOnlyGroupIds: Object.freeze([...(input.geometryOnlyGroupIds || [])]),
    ambiguityCount: input.ambiguityCount || 0,
    explicitRelationshipFamilyAvailable: Boolean(input.explicitRelationshipFamilyAvailable),
    diagnostics: Object.freeze([...(input.diagnostics || [])]),
  });
}

function projectCountedGroup(group, assignment, familySummary) {
  const total = familySummary?.totalSupportPointsOnSecondary
    ?? Number(group?.totalSupportPointsOnSecondary || 0);
  return Object.freeze({
    ...group,
    totalSupportPointsOnSecondary: total,
    multiplePrimarySupport: total > 1,
    primarySupportAssemblyId: clean(assignment?.primarySupportAssemblyId),
    primarySupportAssemblyStatus: assignment?.status || 'GEOMETRY_ONLY',
    primarySupportAssemblyBasis: assignment?.assignmentBasis || 'LEGACY_GEOMETRY_GROUP',
    primarySupportAssemblyCandidateIds: Object.freeze([...(assignment?.candidateAssemblyIds || [])]),
    primarySupportAssemblyProvisionalId: clean(assignment?.provisionalAssemblyId),
    primarySupportAssemblyCountBasis: familySummary?.countBasis || 'LEGACY_GEOMETRY_GROUP_COUNT',
    primarySupportFamilyExplicitAssemblyIds: Object.freeze([...(familySummary?.explicitAssemblyIds || [])]),
    primarySupportFamilyGeometryOnlyGroupIds: Object.freeze([...(familySummary?.geometryOnlyGroupIds || [])]),
    primarySupportFamilyAmbiguityCount: familySummary?.ambiguityCount || 0,
  });
}

function relationshipFamilyIndex(bundle) {
  const output = new Map();
  if (bundle?.schema !== SUPPORT_PRIMARY_RELATIONSHIP_SCHEMA) return output;
  for (const family of bundle?.families || []) {
    const familyId = normalizeFamilyId(family?.familyId);
    if (familyId && !output.has(familyId)) output.set(familyId, family);
  }
  return output;
}

function groupAssignments(rows = []) {
  const output = new Map();
  for (const row of rows) {
    const familyId = normalizeFamilyId(row?.familyId);
    if (!familyId) continue;
    if (!output.has(familyId)) output.set(familyId, []);
    output.get(familyId).push(row);
  }
  return output;
}

function groupLocationRows(rows = []) {
  const output = new Map();
  for (const row of rows) {
    const familyId = normalizeFamilyId(row?.secondarySupportFamilyId);
    if (!familyId) continue;
    if (!output.has(familyId)) output.set(familyId, []);
    output.get(familyId).push(row);
  }
  return output;
}

function normalizeFamilyId(value) {
  return clean(value).replace(/^\/+/, '').replace(/\(REF\)$/iu, '').toUpperCase();
}
function clean(value) { return value == null ? '' : String(value).trim(); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }

export const _test = Object.freeze({
  buildFamilyCountSummary,
  relationshipFamilyIndex,
});
