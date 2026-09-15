import {
  buildSupportReportTypicalityAudit,
  normalizePipeClass,
} from './support-report-typicality.js?v=20260911-support-report-typicality-member-count-1';
import {
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  mergeSupportReportTypicalityProfile,
} from './support-report-typicality-profile.js?v=20260911-support-report-typicality-profile-rca-1';
import {
  buildCanonicalTypicalityLocations,
  buildTypicalityLocationAssignmentsForMatches,
} from './support-report-typicality-location.js?v=20260911-support-report-location-rca-1';
import {
  buildSupportReportRelationshipTopologyAudit,
} from './support-report-relationship-typicality.js?v=20260915-relationship-topology-v1';

export { SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL };
export const SUPPORT_REPORT_TYPICALITY_COMPARISON_SCHEMA = 'SupportReportTypicalityComparison.v1';
export const SUPPORT_REPORT_TYPICALITY_CONSENSUS_SCHEMA = 'TypicalityConsensusV1';

export function buildSupportReportTypicalityComparison(leftEvidence, rightEvidence, options = {}) {
  const profile = comparisonProfile(options.profile);
  const leftReportBundle = withLocationRowAliases(options.leftReportBundle, leftEvidence);
  const rightReportBundle = withLocationRowAliases(options.rightReportBundle, rightEvidence);
  const familyAudit = buildSupportReportTypicalityAudit(leftEvidence, rightEvidence, { ...options, profile });
  const locationAssignments = buildTypicalityLocationAssignmentsForMatches(
    leftEvidence,
    rightEvidence,
    familyAudit.matches,
    { ...options, profile, leftReportBundle, rightReportBundle },
  );
  const assignmentsByFamily = new Map(locationAssignments.map((item) => [token(item.leftFamilyId), item]));
  const resolvedMatches = familyAudit.matches.map((match) => resolveFamilyMatch(
    match,
    assignmentsByFamily.get(token(match.leftFamilyId)),
  ));
  const relationshipTopologyAudit = buildSupportReportRelationshipTopologyAudit(leftReportBundle, rightReportBundle);
  const relationshipMatchByFamily = new Map((relationshipTopologyAudit.matches || [])
    .map((item) => [token(item.leftFamilyId), item]));
  const consensusMatches = resolvedMatches.map((match) => applyRelationshipTopologyConsensus(
    match,
    relationshipMatchByFamily.get(token(match.leftFamilyId)) || null,
    relationshipTopologyAudit,
  ));
  return Object.freeze({
    ...familyAudit,
    comparisonSchema: SUPPORT_REPORT_TYPICALITY_COMPARISON_SCHEMA,
    profileId: profile.profileId,
    profileSnapshot: profile,
    structuralMatches: familyAudit.matches,
    arrangementResolvedStructuralMatches: Object.freeze(resolvedMatches),
    relationshipTopologyAudit,
    relationshipTopologyMatches: relationshipTopologyAudit.matches,
    typicalityConsensusSchema: SUPPORT_REPORT_TYPICALITY_CONSENSUS_SCHEMA,
    matches: Object.freeze(consensusMatches),
    locationAssignments,
  });
}

export function projectTypicalityOntoSupportReportBundle(reportBundle, typicalityAudit, leftEvidence) {
  const locations = buildCanonicalTypicalityLocations(
    leftEvidence,
    withLocationRowAliases(reportBundle, leftEvidence),
  );
  const selectedByLocation = new Map();
  for (const assignment of typicalityAudit?.locationAssignments || []) {
    for (const pair of assignment.selectedAssignments || []) {
      selectedByLocation.set(String(pair.leftLocationId), { assignment, pair });
    }
  }
  const matchByFamily = new Map((typicalityAudit?.matches || [])
    .map((item) => [token(item.leftFamilyId), item]));
  const rows = (reportBundle?.rows || []).map((row) => {
    const familyId = token(row.civilSecondarySupport);
    const match = matchByFamily.get(familyId) || null;
    const location = resolveRowLocation(row, locations);
    const selected = location ? selectedByLocation.get(String(location.locationId)) : null;
    return Object.freeze({
      ...row,
      typicalStructure: ['TYPICAL', 'REVIEW'].includes(match?.result) ? match.rightFamilyId : '',
      pipingSupportArrangementMatch: arrangementLabel(match, selected?.assignment, selected?.pair),
      typicalityAuditId: selected?.pair?.auditId
        || match?.auditId
        || (match?.candidateAuditIds || []).join(' | ')
        || '',
    });
  });
  return Object.freeze({
    ...reportBundle,
    rows: Object.freeze(rows),
    typicalityAudit,
  });
}

function comparisonProfile(override = {}) {
  return mergeSupportReportTypicalityProfile(override);
}

function resolveFamilyMatch(match, assignment) {
  if (!match || !['TYPICAL', 'REVIEW'].includes(match.result)) return match;
  if (!assignment) {
    if (match.result === 'REVIEW') return match;
    return Object.freeze({
      ...match,
      result: 'REVIEW',
      reasonCode: 'TYPICAL_LOCATION_ASSIGNMENT_UNAVAILABLE',
    });
  }
  const lineage = {
    locationAssignmentResult: assignment.result,
    locationCorrespondenceStatus: assignment.correspondenceStatus,
    locationMatchingMode: assignment.matchingMode,
  };
  if (assignment.result === 'AMBIGUOUS') return Object.freeze({
    ...match,
    ...lineage,
    result: 'AMBIGUOUS',
    reasonCode: 'TYPICAL_LOCATION_ASSIGNMENT_AMBIGUOUS_MATERIAL',
  });
  if (match.result === 'REVIEW') return Object.freeze({ ...match, ...lineage });
  if (assignment.result === 'PARTIAL') return Object.freeze({
    ...match,
    ...lineage,
    result: 'REVIEW',
    reasonCode: 'TYPICAL_REVIEW_SUPPORT_CONFIGURATION',
  });
  return Object.freeze({ ...match, ...lineage });
}

function applyRelationshipTopologyConsensus(match, relationshipMatch, relationshipAudit) {
  if (!match) return match;
  const pair = relationshipComparisonForMatch(match, relationshipAudit);
  const channelResult = pair?.result || relationshipMatch?.result || 'UNAVAILABLE';
  const channelReasonCode = pair?.reasonCode || relationshipMatch?.reasonCode || 'REL_TOPOLOGY_UNAVAILABLE';
  const relationshipTopology = Object.freeze({
    result: channelResult,
    reasonCode: channelReasonCode,
    auditId: pair?.auditId || relationshipMatch?.auditId || '',
    selectedResult: relationshipMatch?.result || 'UNAVAILABLE',
    selectedFamilyId: relationshipMatch?.rightFamilyId || '',
    selectedCandidateFamilyIds: Object.freeze([...(relationshipMatch?.candidateFamilyIds || [])]),
    failedReasonCodes: Object.freeze([...(pair?.failedReasonCodes || relationshipMatch?.failedReasonCodes || [])]),
  });

  if (!['TYPICAL', 'REVIEW'].includes(match.result) || !match.rightFamilyId) {
    const relationshipOnlyMatch = relationshipMatch?.result === 'MATCH';
    return Object.freeze({
      ...match,
      relationshipTopology,
      typicalityConsensus: freezeConsensus(
        relationshipOnlyMatch ? 'STRUCTURAL_RESULT_RETAINED_RELATIONSHIP_ONLY_MATCH_WITHHELD' : 'STRUCTURAL_RESULT_RETAINED',
        relationshipOnlyMatch ? 'LOW' : 'UNAVAILABLE',
        relationshipOnlyMatch
          ? 'Relationship topology found a candidate, but this conservative integration does not promote a structural rejection/ambiguity.'
          : 'No structural candidate is eligible for relationship-topology confirmation.',
      ),
    });
  }

  if (channelResult === 'NO_MATCH') return Object.freeze({
    ...match,
    result: 'REVIEW',
    reasonCode: 'TYPICAL_CONSENSUS_RELATIONSHIP_CONFLICT',
    relationshipTopology,
    typicalityConsensus: freezeConsensus(
      'CONFLICT',
      'LOW',
      'Structural/location comparison selected a candidate that relationship topology rejects.',
    ),
  });

  if (channelResult === 'REVIEW') return Object.freeze({
    ...match,
    result: 'REVIEW',
    reasonCode: 'TYPICAL_CONSENSUS_RELATIONSHIP_REVIEW',
    relationshipTopology,
    typicalityConsensus: freezeConsensus(
      'REVIEW_REQUIRED',
      'LOW',
      'Relationship topology is partial, ambiguous or missing a required intrinsic signal.',
    ),
  });

  if (channelResult === 'MATCH') {
    const uniquelyAgrees = relationshipMatch?.result === 'MATCH'
      && token(relationshipMatch.rightFamilyId) === token(match.rightFamilyId);
    return Object.freeze({
      ...match,
      relationshipTopology,
      typicalityConsensus: freezeConsensus(
        uniquelyAgrees ? 'AGREE' : 'COMPATIBLE_NOT_UNIQUE',
        uniquelyAgrees && match.result === 'TYPICAL' ? 'HIGH' : 'MEDIUM',
        uniquelyAgrees
          ? 'Structural/location and relationship-topology channels independently select the same candidate.'
          : 'The structural candidate is relationship-topology compatible, but relationship topology does not uniquely select it.',
      ),
    });
  }

  return Object.freeze({
    ...match,
    relationshipTopology,
    typicalityConsensus: freezeConsensus(
      'RELATIONSHIP_UNAVAILABLE',
      match.result === 'TYPICAL' ? 'MEDIUM' : 'LOW',
      'Structural/location result retained because explicit relationship-topology evidence is unavailable.',
    ),
  });
}

function freezeConsensus(result, confidence, basis) {
  return Object.freeze({
    schema: SUPPORT_REPORT_TYPICALITY_CONSENSUS_SCHEMA,
    result,
    confidence,
    basis,
  });
}

function relationshipComparisonForMatch(match, audit) {
  if (!match?.rightFamilyId) return null;
  return (audit?.familyComparisons || []).find((item) => token(item.leftFamilyId) === token(match.leftFamilyId)
    && token(item.rightFamilyId) === token(match.rightFamilyId)) || null;
}

function withLocationRowAliases(reportBundle, evidence) {
  if (!reportBundle?.rows?.length) return reportBundle;
  const locationByGroupId = new Map((evidence?.groups || []).map((group) => [
    token(group.groupId),
    String(group.locationId || group.groupId || ''),
  ]));
  const rows = reportBundle.rows.map((row) => {
    const locationId = locationByGroupId.get(token(row.rowId));
    if (!locationId || token(locationId) === token(row.rowId)) return row;
    return Object.freeze({ ...row, rowId: locationId, sourceReportRowId: row.rowId });
  });
  return Object.freeze({ ...reportBundle, rows: Object.freeze(rows) });
}

function resolveRowLocation(row, locations) {
  const sourceGroupExact = locations.find((item) => token(item.sourceGroupId) === token(row.rowId));
  if (sourceGroupExact) return sourceGroupExact;
  const exact = locations.find((item) => token(item.locationId) === token(row.rowId));
  if (exact) return exact;
  const familyId = token(row.civilSecondarySupport);
  const pipeClass = normalizePipeClass(row.pipe);
  const candidates = locations.filter((item) => item.familyId === familyId
    && item.normalizedPipeClass === pipeClass);
  return candidates.length === 1 ? candidates[0] : null;
}

function arrangementLabel(match, assignment, pair) {
  if (!match) return '';
  if (match.reasonCode === 'TYPICAL_CONSENSUS_RELATIONSHIP_CONFLICT'
    || match.reasonCode === 'TYPICAL_CONSENSUS_RELATIONSHIP_REVIEW') return reviewLabel(match);
  if (match.result === 'AMBIGUOUS') return ambiguousLabel(match);
  if (match.result === 'REVIEW' && assignment?.result === 'AMBIGUOUS') return ambiguousAssignmentLabel(match);
  if (!pair) {
    if (match.result === 'NO_MATCH') return noMatchLabel(match);
    if (match.result === 'REVIEW') return reviewLabel(match);
    return match.result === 'TYPICAL' ? 'NOT MATCHED — No location counterpart was assigned.' : match.result;
  }
  const equivalent = assignment?.correspondenceStatus === 'AMBIGUOUS_EQUIVALENT';
  if (pair.arrangementResult === 'EXACT') return matchedLabel(match, equivalent);
  if (pair.arrangementResult === 'TOPOLOGY_ONLY') return limitedCheckLabel(equivalent);
  if (pair.arrangementResult !== 'PARTIAL') return pair.arrangementResult || '';
  const details = [];
  for (const item of pair.supportTypeComparison?.missingFromRight || []) {
    details.push(`${item.type}${item.count > 1 ? ` x${item.count}` : ''} missing from candidate`);
  }
  for (const item of pair.supportTypeComparison?.extraInRight || []) {
    details.push(`${item.type}${item.count > 1 ? ` x${item.count}` : ''} extra in candidate`);
  }
  if (pair.signals?.memberMultiplicity?.result === 'FAIL') details.push('member count per support location differs');
  if (pair.signals?.geometry?.result === 'FAIL') details.push('relative support spacing is outside tolerance');
  return details.length ? `PARTIAL MATCH — Differences: ${details.join('; ')}.` : 'PARTIAL MATCH — Review required.';
}

function matchedLabel(match, equivalent = false) {
  const candidate = match?.rightFamilyId ? ` ${match.rightFamilyId}` : '';
  const suffix = equivalent ? ' Multiple equivalent location assignments remain.' : '';
  return `MATCHED — Support arrangement matches${candidate}.${suffix}`;
}

function limitedCheckLabel(equivalent = false) {
  const suffix = equivalent ? ' Multiple equivalent location assignments remain.' : '';
  return `LIMITED CHECK — Support type unavailable; topology-only comparison used.${suffix}`;
}

function reviewLabel(match) {
  if (match?.reasonCode === 'TYPICAL_CONSENSUS_RELATIONSHIP_CONFLICT') {
    return 'REVIEW — Structural and relationship-topology comparisons disagree.';
  }
  if (match?.reasonCode === 'TYPICAL_CONSENSUS_RELATIONSHIP_REVIEW') {
    return 'REVIEW — Relationship-topology evidence is incomplete or ambiguous.';
  }
  if (match?.reasonCode === 'TYPICAL_REVIEW_MEMBER_MULTIPLICITY_CHANGED') {
    return 'REVIEW — Member count per support location differs.';
  }
  if (match?.reasonCode === 'TYPICAL_REVIEW_UNIQUE_MEMBER_COUNT_CHANGED') {
    return 'REVIEW — Unique primary-member count differs.';
  }
  if (match?.reasonCode === 'TYPICAL_REVIEW_MEMBER_TOPOLOGY_CHANGED') {
    return 'REVIEW — Primary-member topology differs.';
  }
  if (match?.reasonCode === 'TYPICAL_LOCATION_ASSIGNMENT_UNAVAILABLE') {
    return 'REVIEW — Typical family found, but no location counterpart could be assigned.';
  }
  return 'REVIEW — Comparison requires engineering review.';
}

function noMatchLabel(match) {
  const candidate = match?.bestCandidateFamilyId || '';
  const failures = (match?.failedReasonCodes || []).map(rejectionLabel).filter(Boolean);
  if (candidate && failures.length) return `NOT MATCHED — Closest candidate ${candidate} was rejected: ${sentenceList(failures)}.`;
  if (candidate) return `NOT MATCHED — Closest candidate ${candidate} was rejected.`;
  return 'NOT MATCHED — No structurally acceptable candidate was found.';
}

function ambiguousLabel(match) {
  const candidates = match?.candidateFamilyIds || [];
  if (!candidates.length) return 'AMBIGUOUS — Multiple structural candidates remain.';
  return `AMBIGUOUS — ${candidates.length} candidate${candidates.length === 1 ? '' : 's'} remain: ${candidates.join(', ')}.`;
}

function ambiguousAssignmentLabel(match) {
  const candidate = match?.rightFamilyId ? ` for ${match.rightFamilyId}` : '';
  return `AMBIGUOUS — Multiple equivalent support-location assignments remain${candidate}.`;
}

function rejectionLabel(code) {
  const labels = {
    STRUCT_LOCATION_COUNT_EQUAL: 'support-location count',
    STRUCT_UNIQUE_PRIMARY_MEMBER_COUNT_EQUAL: 'unique primary-member count',
    STRUCT_MEMBER_MULTIPLICITY_EQUAL: 'member count per support location',
    STRUCT_PIPE_CLASS_POPULATION_EQUAL: 'pipe class population',
    STRUCT_GEOMETRY_ENVELOPE_WITHIN_TOLERANCE: 'overall geometry envelope',
    STRUCT_PAIR_DISTANCE_WITHIN_TOLERANCE: 'relative spacing',
  };
  return labels[code] || String(code || '').toLowerCase().replace(/^struct_/u, '').replaceAll('_', ' ');
}

function sentenceList(values) {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function token(value) {
  return String(value || '').trim().replace(/^\/+/, '').replace(/\(REF\)$/iu, '').toUpperCase();
}

export const _test = Object.freeze({
  ambiguousAssignmentLabel,
  ambiguousLabel,
  applyRelationshipTopologyConsensus,
  arrangementLabel,
  comparisonProfile,
  limitedCheckLabel,
  matchedLabel,
  noMatchLabel,
  rejectionLabel,
  relationshipComparisonForMatch,
  resolveFamilyMatch,
  resolveRowLocation,
  reviewLabel,
  sentenceList,
  withLocationRowAliases,
});