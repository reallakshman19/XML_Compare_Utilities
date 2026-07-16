import {
  SUPPORT_STEEL_RELATIONSHIP_SCHEMA,
  resolveSupportSteelConfig,
} from './support-steel-relationship-contracts.js';
import { collectSteelGroups, collectSupportFamilies } from './support-steel-source-reader.js';
import { cleanText, cloneJson } from './support-steel-source-utils.js';

export function buildSupportSteelRelationshipBundle(input = {}) {
  const config = resolveSupportSteelConfig(input.config);
  const supportFamilies = collectSupportFamilies(input.supportInput, config);
  const steelGroups = collectSteelGroups(input.steelInput, config);
  const diagnostics = [];
  const relationships = [];
  const supportOutput = supportFamilies.map((family) => {
    const result = resolveFamilyRelationships(family, steelGroups, config);
    relationships.push(...result.relationships);
    diagnostics.push(...result.diagnostics);
    return { ...cloneJson(family), steelRelationships: result.relationships };
  });
  const steelOutput = projectSteelRelationships(steelGroups, relationships);
  const unresolvedSupportFamilies = supportOutput
    .filter((family) => family.steelRelationships.every((row) => row.relationshipStatus === 'UNRESOLVED'))
    .map((family) => family.familyId);
  return {
    schema: SUPPORT_STEEL_RELATIONSHIP_SCHEMA,
    coordinateSystem: {
      units: 'mm',
      globalAxes: { x: 'EAST', y: 'NORTH', z: 'UP' },
    },
    config: publicConfig(config),
    summary: buildSummary(supportOutput, steelOutput, relationships),
    supportFamilies: supportOutput,
    steelGroups: steelOutput,
    relationships,
    unresolvedSupportFamilies,
    diagnostics,
  };
}

function resolveFamilyRelationships(family, steelGroups, config) {
  const explicit = explicitCandidates(family, steelGroups);
  if (explicit.length) return resolvedExplicit(family, explicit);
  const spatial = spatialCandidates(family, steelGroups, config.projectionToleranceMm);
  if (spatial.length) return resolvedSpatial(family, spatial, config.ambiguityDeltaMm);
  const owners = sharedOwnerCandidates(family, steelGroups);
  if (owners.length === 1) return resolvedOwner(family, owners[0]);
  if (owners.length > 1) return ambiguousRelationships(family, owners, 'SHARED_OWNER');
  return unresolvedRelationship(family, steelGroups);
}

function explicitCandidates(family, steelGroups) {
  const refs = new Set((family.explicitReferences || []).map(normalizeToken));
  const familyToken = normalizeToken(family.familyId);
  return steelGroups.flatMap((steel) => {
    const steelToken = normalizeToken(steel.steelGroupId);
    const bases = [];
    if (steelToken === familyToken) bases.push('SAME_CANONICAL_ID');
    if ([...refs].some((ref) => tokenMatches(ref, steelToken))) bases.push('EXPLICIT_REFERENCE');
    return bases.length ? [{ steel, relationshipBasis: bases, distanceMm: minimumDistance(family, steel) }] : [];
  });
}

function spatialCandidates(family, steelGroups, toleranceMm) {
  return steelGroups
    .map((steel) => ({ steel, relationshipBasis: ['POINT_PROXIMITY'], distanceMm: minimumDistance(family, steel) }))
    .filter((candidate) => Number.isFinite(candidate.distanceMm) && candidate.distanceMm <= toleranceMm)
    .sort((left, right) => left.distanceMm - right.distanceMm);
}

function sharedOwnerCandidates(family, steelGroups) {
  const branches = new Set((family.branchIds || []).map(normalizeToken));
  return steelGroups.flatMap((steel) => {
    const matched = (steel.owners || []).some((owner) => branches.has(normalizeToken(owner)));
    return matched ? [{ steel, relationshipBasis: ['SHARED_OWNER'], distanceMm: minimumDistance(family, steel) }] : [];
  });
}

function resolvedExplicit(family, candidates) {
  const relationships = candidates.map((candidate) => relationshipRecord(
    family,
    candidate,
    'RESOLVED_EXPLICIT',
    'HIGH',
  ));
  return { relationships, diagnostics: [] };
}

function resolvedSpatial(family, candidates, ambiguityDeltaMm) {
  const first = candidates[0];
  const second = candidates[1];
  if (second && second.distanceMm - first.distanceMm <= ambiguityDeltaMm) {
    const tied = candidates.filter((candidate) => candidate.distanceMm - first.distanceMm <= ambiguityDeltaMm);
    return ambiguousRelationships(family, tied, 'POINT_PROXIMITY');
  }
  return {
    relationships: [relationshipRecord(family, first, 'RESOLVED_SPATIAL', 'MEDIUM')],
    diagnostics: [],
  };
}

function resolvedOwner(family, candidate) {
  return {
    relationships: [relationshipRecord(family, candidate, 'RESOLVED_SHARED_OWNER', 'LOW')],
    diagnostics: [{
      severity: 'WARNING',
      code: 'RELATIONSHIP_RESOLVED_BY_SHARED_OWNER_ONLY',
      supportFamilyId: family.familyId,
      steelGroupId: candidate.steel.steelGroupId,
      message: 'Relationship uses shared owner evidence because explicit and spatial evidence were unavailable.',
    }],
  };
}

function ambiguousRelationships(family, candidates, basis) {
  const candidateSteelGroupIds = candidates.map((candidate) => candidate.steel.steelGroupId);
  const relationships = candidates.map((candidate) => ({
    ...relationshipRecord(family, candidate, 'AMBIGUOUS', 'NONE'),
    candidateSteelGroupIds,
  }));
  return {
    relationships,
    diagnostics: [{
      severity: 'WARNING',
      code: 'AMBIGUOUS_SUPPORT_STEEL_RELATIONSHIP',
      supportFamilyId: family.familyId,
      candidateSteelGroupIds,
      relationshipBasis: basis,
      message: 'More than one steel group satisfies the strongest available relationship evidence.',
    }],
  };
}

function unresolvedRelationship(family, steelGroups) {
  const nearest = steelGroups
    .map((steel) => ({ steel, distanceMm: minimumDistance(family, steel) }))
    .filter((row) => Number.isFinite(row.distanceMm))
    .sort((left, right) => left.distanceMm - right.distanceMm)[0];
  const record = {
    relationshipId: `${family.familyId}::UNRESOLVED`,
    supportFamilyId: family.familyId,
    steelGroupId: null,
    relationshipStatus: 'UNRESOLVED',
    relationshipBasis: [],
    confidence: 'NONE',
    distanceMm: nearest?.distanceMm ?? null,
    nearestSteelGroupId: nearest?.steel.steelGroupId ?? null,
    supportPositionGlobal: family.supportPositionGlobal || null,
    steelPositionGlobal: nearest?.steel.steelPositionGlobal || null,
    branchIds: [...(family.branchIds || [])],
    carrierIds: [...(family.carrierIds || [])],
    memberCount: family.members?.length || 0,
    candidateSteelGroupIds: [],
  };
  return {
    relationships: [record],
    diagnostics: [{
      severity: 'WARNING',
      code: 'UNRESOLVED_SUPPORT_STEEL_RELATIONSHIP',
      supportFamilyId: family.familyId,
      nearestSteelGroupId: record.nearestSteelGroupId,
      nearestDistanceMm: record.distanceMm,
      message: 'No explicit, in-tolerance spatial, or unique shared-owner relationship was established.',
    }],
  };
}

function relationshipRecord(family, candidate, status, confidence) {
  return {
    relationshipId: `${family.familyId}::${candidate.steel.steelGroupId}`,
    supportFamilyId: family.familyId,
    steelGroupId: candidate.steel.steelGroupId,
    relationshipStatus: status,
    relationshipBasis: [...candidate.relationshipBasis],
    confidence,
    distanceMm: finiteOrNull(candidate.distanceMm),
    supportPositionGlobal: family.supportPositionGlobal || null,
    steelPositionGlobal: candidate.steel.steelPositionGlobal || null,
    branchIds: [...(family.branchIds || [])],
    carrierIds: [...(family.carrierIds || [])],
    memberCount: family.members?.length || 0,
    candidateSteelGroupIds: [],
  };
}

function projectSteelRelationships(steelGroups, relationships) {
  return steelGroups.map((steel) => ({
    ...cloneJson(steel),
    supportFamilyIds: relationships
      .filter((row) => row.steelGroupId === steel.steelGroupId && row.relationshipStatus !== 'AMBIGUOUS')
      .map((row) => row.supportFamilyId)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort(),
  }));
}

function buildSummary(supportFamilies, steelGroups, relationships) {
  const familyStatuses = supportFamilies.map((family) => strongestFamilyStatus(family.steelRelationships));
  return {
    supportFamilyCount: supportFamilies.length,
    steelGroupCount: steelGroups.length,
    relationshipCount: relationships.filter((row) => row.steelGroupId).length,
    resolvedFamilyCount: familyStatuses.filter((status) => status.startsWith('RESOLVED_')).length,
    ambiguousFamilyCount: familyStatuses.filter((status) => status === 'AMBIGUOUS').length,
    unresolvedFamilyCount: familyStatuses.filter((status) => status === 'UNRESOLVED').length,
  };
}

function strongestFamilyStatus(rows = []) {
  if (rows.some((row) => row.relationshipStatus === 'RESOLVED_EXPLICIT')) return 'RESOLVED_EXPLICIT';
  if (rows.some((row) => row.relationshipStatus === 'RESOLVED_SPATIAL')) return 'RESOLVED_SPATIAL';
  if (rows.some((row) => row.relationshipStatus === 'RESOLVED_SHARED_OWNER')) return 'RESOLVED_SHARED_OWNER';
  if (rows.some((row) => row.relationshipStatus === 'AMBIGUOUS')) return 'AMBIGUOUS';
  return 'UNRESOLVED';
}

function minimumDistance(family, steel) {
  const supportPoints = family.positions?.length ? family.positions : [family.supportPositionGlobal].filter(Boolean);
  const steelPoints = steel.positions?.length ? steel.positions : [steel.steelPositionGlobal].filter(Boolean);
  let best = Infinity;
  for (const supportPoint of supportPoints) {
    for (const steelPoint of steelPoints) best = Math.min(best, pointDistance(supportPoint, steelPoint));
  }
  return best === Infinity ? null : round3(best);
}

function pointDistance(left, right) {
  if (!left || !right) return Infinity;
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}

function tokenMatches(reference, steelToken) {
  return reference === steelToken || reference.startsWith(`${steelToken}/`) || steelToken.startsWith(`${reference}/`);
}

function normalizeToken(value) {
  return cleanText(value).replace(/\(REF\)$/iu, '').toUpperCase();
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function publicConfig(config) {
  return {
    supportFamilyPattern: config.supportFamilyPattern,
    steelGroupPattern: config.steelGroupPattern,
    supportTypes: [...config.supportTypes],
    steelTypes: [...config.steelTypes],
    projectionToleranceMm: config.projectionToleranceMm,
    ambiguityDeltaMm: config.ambiguityDeltaMm,
  };
}
