import { SUPPORT_REPORT_MULTI_LOCATION_REMARK } from './support-report-location-grouping.js?v=20260910-support-report-location-17';
import {
  buildSupportReportJsonTrace,
  resolveSupportReportObservedMembers,
  supportReportFamilyMismatchMemberIds,
} from './support-report-json-trace.js?v=20260910-support-report-json-trace-18';

const CU_SITE_RE = /-CU-[A-Z0-9]+$/iu;
const CU_ZONE_RE = /-CU-[A-Z0-9]+-[A-Z0-9][A-Z0-9_-]*$/iu;
const INSULATION_THICKNESS_KEYS = Object.freeze([
  'PIPE_INSULATION_THICKNESS', 'INSULATION_THICKNESS', 'INS_THK', 'ITHK', 'THICKNESS_INSULATION', 'INSU',
]);

export function resolveSupportReportRowMembers({ relationshipBundle, group, familyMembers = [] } = {}) {
  const observed = resolveSupportReportObservedMembers(
    relationshipBundle,
    group?.primarySupportMemberIds || [],
    group,
  );
  const members = uniqueMembers([...familyMembers, ...observed.members]);
  const resolvedObservedIds = new Set(observed.matches.filter((match) => match.member).map((match) => token(match.observedMemberId)));
  const reportRemarks = rowRemarks(group, observed.matches);
  return Object.freeze({
    members: Object.freeze(members),
    observedMatches: observed.matches,
    resolvedObservedIds,
    reportRemarks: Object.freeze(reportRemarks),
  });
}

export function enrichSupportReportProjectedFields(fields, input = {}) {
  const { group, reportMembers = [], reportRemarks = [] } = input;
  const primaryPath = choosePrimaryPath(group?.primaryPaths || []);
  const nativeRemarks = clean(fields?.remarks);
  const derivedRemarks = reportRemarks.filter(Boolean).join('; ');
  return Object.freeze({
    ...fields,
    pipeInsulationThickness: fields?.pipeInsulationThickness || consistentMemberAttribute(reportMembers, INSULATION_THICKNESS_KEYS),
    primarySupportZone: fields?.primarySupportZone || pathValue(primaryPath, CU_ZONE_RE),
    primarySupportSite: fields?.primarySupportSite || pathValue(primaryPath, CU_SITE_RE),
    remarks: [nativeRemarks, derivedRemarks].filter(Boolean).join('; '),
  });
}

export function enrichSupportReportFieldProvenance(provenance, fields, enriched, input = {}) {
  const { group, reportMembers = [], reportRemarks = [] } = input;
  const output = { ...(provenance || {}) };
  if (!clean(fields?.pipeInsulationThickness) && clean(enriched?.pipeInsulationThickness)) {
    output.pipeInsulationThickness = source('AUTHORITATIVE_NATIVE_MEMBER_ATTRIBUTE', memberIdsWithAttribute(reportMembers, INSULATION_THICKNESS_KEYS));
  }
  const primaryPath = choosePrimaryPath(group?.primaryPaths || []);
  if (!clean(fields?.primarySupportZone) && pathValue(primaryPath, CU_ZONE_RE)) output.primarySupportZone = source('CLASH_PRIMARY_PATH_DERIVATION');
  if (!clean(fields?.primarySupportSite) && pathValue(primaryPath, CU_SITE_RE)) output.primarySupportSite = source('CLASH_PRIMARY_PATH_DERIVATION');
  if (reportRemarks.length && !clean(fields?.remarks)) output.remarks = source('CLASH_GROUP_DERIVATION');
  if (reportRemarks.length && clean(fields?.remarks)) output.remarks = source('DETERMINISTIC_FIELD_COMPOSITION');
  return Object.freeze(output);
}

export function buildRowJsonTrace({ group, resolution, reportMembers } = {}) {
  return buildSupportReportJsonTrace({
    group,
    observedMatches: resolution?.observedMatches || [],
    reportMembers: reportMembers || [],
  });
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
function pathValue(path, pattern) {
  const value = (path || []).find((node) => pattern.test(clean(node)));
  return value ? clean(value).replace(/^\/+/, '') : '';
}
function choosePrimaryPath(paths) { return [...(paths || [])].sort((left, right) => right.length - left.length)[0] || []; }
function source(sourceClass, sourceIds = []) {
  return Object.freeze({
    sourceClass,
    confidenceClass: sourceClass.startsWith('AUTHORITATIVE_') ? 'AUTHORITATIVE' : sourceClass.startsWith('DETERMINISTIC_') ? 'DETERMINISTIC' : 'EVIDENCE',
    valueStatus: 'RESOLVED',
    sourceIds: Object.freeze(unique(sourceIds)),
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
