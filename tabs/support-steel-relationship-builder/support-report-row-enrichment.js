import { SUPPORT_REPORT_MULTI_LOCATION_REMARK } from './support-report-location-grouping.js?v=20260911-support-report-location-attribution-22';
import {
  supportReportPreviousName,
} from './support-report-field-normalization.js?v=20260911-prevname-semantic-22';
import {
  buildSupportReportJsonTrace,
  resolveSupportReportObservedMembers,
  supportReportFamilyMismatchMemberIds,
} from './support-report-json-trace.js?v=20260911-prevname-semantic-22';

const INSULATION_THICKNESS_KEYS = Object.freeze([
  'PIPE_INSULATION_THICKNESS', 'INSULATION_THICKNESS', 'INS_THK', 'ITHK', 'THICKNESS_INSULATION', 'INSU',
]);

export function resolveSupportReportRowMembers({ relationshipBundle, group, familyMembers = [] } = {}) {
  const observed = resolveSupportReportObservedMembers(
    relationshipBundle,
    group?.primarySupportMemberIds || [],
    group,
  );
  const attribution = locationScopedFamilyMembers(group, familyMembers);
  const members = uniqueMembers([...attribution.members, ...observed.members]);
  const resolvedObservedIds = new Set(observed.matches.filter((match) => match.member).map((match) => token(match.observedMemberId)));
  const reportRemarks = rowRemarks(group, observed.matches);
  return Object.freeze({
    members: Object.freeze(members),
    observedMatches: observed.matches,
    resolvedObservedIds,
    reportRemarks: Object.freeze(reportRemarks),
    memberAttributionBasis: attribution.basis,
  });
}

export function enrichSupportReportProjectedFields(fields, input = {}) {
  const { reportMembers = [], reportRemarks = [] } = input;
  const nativeRemarks = clean(fields?.remarks);
  const derivedRemarks = reportRemarks.filter(Boolean).join('; ');
  return Object.freeze({
    ...fields,
    previousName: reportablePreviousNames(reportMembers),
    pipeInsulationThickness: fields?.pipeInsulationThickness || consistentMemberAttribute(reportMembers, INSULATION_THICKNESS_KEYS),
    remarks: [nativeRemarks, derivedRemarks].filter(Boolean).join('; '),
  });
}

export function enrichSupportReportFieldProvenance(provenance, fields, enriched, input = {}) {
  const { reportMembers = [], reportRemarks = [] } = input;
  const output = { ...(provenance || {}) };
  const previousNameMemberIds = reportMembers.filter((member) => supportReportPreviousName(member))
    .map((member) => normalizeMemberId(member.memberId));
  output.previousName = previousNameMemberIds.length
    ? source('AUTHORITATIVE_NATIVE_MEMBER_ATTRIBUTE', previousNameMemberIds)
    : unresolvedSource();
  if (!clean(fields?.pipeInsulationThickness) && clean(enriched?.pipeInsulationThickness)) {
    output.pipeInsulationThickness = source('AUTHORITATIVE_NATIVE_MEMBER_ATTRIBUTE', memberIdsWithAttribute(reportMembers, INSULATION_THICKNESS_KEYS));
  }
  if (reportRemarks.length && !clean(fields?.remarks)) output.remarks = source('CLASH_GROUP_DERIVATION');
  if (reportRemarks.length && clean(fields?.remarks)) output.remarks = source('DETERMINISTIC_FIELD_COMPOSITION');
  return Object.freeze(output);
}

export function buildRowJsonTrace({ group, resolution, nativeMembers = [] } = {}) {
  const trace = buildSupportReportJsonTrace({
    group,
    observedMatches: resolution?.observedMatches || [],
    nativeMembers,
  });
  return Object.freeze({
    ...trace,
    locationGroupingBasis: Object.freeze([...(group?.locationGroupingBasis || [])]),
    memberAttributionBasis: resolution?.memberAttributionBasis || '',
  });
}

function locationScopedFamilyMembers(group, familyMembers) {
  const members = familyMembers || [];
  if (Number(group?.locationCountOnPipe || 1) <= 1) {
    return {
      members,
      basis: members.length ? 'SINGLE_LOCATION_FAMILY_LINE_ENRICHMENT' : 'OBSERVED_MEMBER_RESOLUTION_ONLY',
    };
  }
  const observed = new Set((group?.primarySupportMemberIds || []).map(token).filter(Boolean));
  const direct = members.filter((member) => observed.has(token(member?.memberId)));
  return {
    members: direct,
    basis: direct.length ? 'MULTI_LOCATION_OBSERVED_MEMBER_ONLY' : 'MULTI_LOCATION_OBSERVED_RESOLUTION_ONLY',
  };
}

function rowRemarks(group, matches) {
  const remarks = [];
  if (group?.multipleLocationsOnPipe) remarks.push(SUPPORT_REPORT_MULTI_LOCATION_REMARK);
  const mismatches = supportReportFamilyMismatchMemberIds(group);
  for (const memberId of mismatches) {
    const resolved = matches.find((match) => token(match.observedMemberId) === token(memberId));
    if (resolved?.matchBasis === 'PREVIOUS_NAME_ALIAS' && resolved.member) {
      remarks.push(`Primary support renamed from ${normalizeMemberId(memberId)}`);
    } else {
      remarks.push(`Primary support family mismatch: ${normalizeMemberId(memberId)} under ${group.secondarySupportFamilyId}; rename required`);
    }
  }
  return unique(remarks);
}

function reportablePreviousNames(members) {
  return (members || []).map(supportReportPreviousName).map(clean).filter(Boolean).join(', ');
}
function consistentMemberAttribute(members, keys) {
  const values = unique((members || []).map((member) => attribute(member?.attributes || {}, keys)).filter(Boolean));
  return values.length === 1 ? values[0] : '';
}
function memberIdsWithAttribute(members, keys) {
  return (members || []).filter((member) => attribute(member?.attributes || {}, keys)).map((member) => normalizeMemberId(member.memberId));
}
function attribute(attrs, keys) {
  const normalized = new Map(Object.entries(attrs || {}).map(([key, value]) => [normalizeKey(key), value]));
  for (const key of keys) {
    const value = clean(normalized.get(normalizeKey(key)));
    if (value) return value;
  }
  return '';
}
function source(sourceClass, sourceIds = []) {
  return Object.freeze({
    sourceClass,
    confidenceClass: sourceClass.startsWith('AUTHORITATIVE_') ? 'AUTHORITATIVE'
      : sourceClass.startsWith('DETERMINISTIC_') ? 'DETERMINISTIC' : 'EVIDENCE',
    valueStatus: 'RESOLVED',
    sourceIds: Object.freeze(unique(sourceIds)),
  });
}
function unresolvedSource() {
  return Object.freeze({
    sourceClass: 'UNRESOLVED', confidenceClass: 'UNRESOLVED', valueStatus: 'UNRESOLVED', sourceIds: Object.freeze([]),
  });
}
function uniqueMembers(members) {
  const seen = new Set();
  return members.filter((member) => {
    const key = token(member?.memberId);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function normalizeMemberId(value) { const text = clean(value).replace(/^\/+/, '').toUpperCase(); return text ? `/${text}` : ''; }
function normalizeKey(value) { return String(value || '').replace(/[\s./-]+/g, '_').toUpperCase(); }
function token(value) { return clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase(); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }

export const _test = Object.freeze({ locationScopedFamilyMembers, reportablePreviousNames });
