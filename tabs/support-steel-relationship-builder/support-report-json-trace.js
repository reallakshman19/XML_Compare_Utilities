export const SUPPORT_REPORT_JSON_TRACE_SCHEMA = 'SupportReportJsonTrace.v1';

const PREVIOUS_NAME_KEYS = Object.freeze([
  'PREV_NAME', 'PREVIOUS_NAME', 'PREV_PRIMARY_SUPPORT_NAME', 'OLD_NAME', 'PREVIOUS_SUPPORT_NAME',
]);
const SUPPORT_TYPE_KEYS = Object.freeze(['CMPSUPTYPE', 'MDSSUPPTYPE', 'SUPPORT_TYPE', 'SUPTYPE']);
const SUPPORT_REFERENCE_KEYS = Object.freeze([
  'PIPING_PRIMARY_SUPPORT_REFERENCE', 'PRIMARY_SUPPORT_REFERENCE', 'SUPPORT_REFERENCE', 'SUPPORT_REF', 'DBREF', 'REFNO', 'REFERENCE', 'REF',
]);
const DESCRIPTION_KEYS = Object.freeze(['DTXR', 'DESCRIPTION', 'DESC', 'LONG_DESCRIPTION']);
const INSULATION_THICKNESS_KEYS = Object.freeze([
  'PIPE_INSULATION_THICKNESS', 'INSULATION_THICKNESS', 'INS_THK', 'ITHK', 'THICKNESS_INSULATION', 'INSU',
]);

export function resolveSupportReportObservedMembers(relationshipBundle, observedMemberIds = [], group = {}) {
  const index = buildMemberIndex(relationshipBundle);
  const matches = observedMemberIds.map((observedMemberId) => resolveObservedMember(index, observedMemberId, group));
  const members = uniqueMembers(matches.map((match) => match.member).filter(Boolean));
  return Object.freeze({ matches: Object.freeze(matches), members: Object.freeze(members) });
}

export function buildSupportReportJsonTrace({ group, observedMatches = [], reportMembers = [] } = {}) {
  const resolvedIds = new Set(observedMatches.filter((match) => match.member).map((match) => token(match.member.memberId)));
  const memberRows = observedMatches.map(traceObservedMatch);
  for (const member of reportMembers || []) {
    if (!member?.memberId || resolvedIds.has(token(member.memberId))) continue;
    memberRows.push(traceNativeMember(member, 'FAMILY_LINE_ENRICHMENT', ''));
  }
  return Object.freeze({
    schema: SUPPORT_REPORT_JSON_TRACE_SCHEMA,
    secondarySupportFamilyId: group?.secondarySupportFamilyId || '',
    fullLineTag: group?.fullLineTag || '',
    members: Object.freeze(memberRows),
  });
}

export function supportReportFamilyMismatchMemberIds(group = {}) {
  const family = familyRoot(group.secondarySupportFamilyId);
  return (group.primarySupportMemberIds || []).filter((memberId) => {
    const memberFamily = familyRoot(memberId);
    return family && memberFamily && memberFamily !== family;
  });
}

function buildMemberIndex(bundle) {
  const direct = new Map();
  const previous = new Map();
  for (const family of bundle?.supportFamilies || []) {
    for (const member of family?.members || []) {
      addIndex(direct, token(member.memberId), member);
      for (const alias of previousNames(member)) addIndex(previous, token(alias), member);
    }
  }
  return { direct, previous };
}

function resolveObservedMember(index, observedMemberId, group) {
  const observed = normalizeMemberId(observedMemberId);
  const direct = compatible(index.direct.get(token(observed)) || [], group);
  if (direct.length === 1) return match(observed, direct[0], 'DIRECT_MEMBER_ID');
  if (direct.length > 1) return match(observed, null, 'AMBIGUOUS_DIRECT_MEMBER_ID');
  const directAny = index.direct.get(token(observed)) || [];
  if (directAny.length) return match(observed, null, 'DIRECT_MEMBER_ID_LINE_CONFLICT');
  const aliases = compatible(index.previous.get(token(observed)) || [], group);
  if (aliases.length === 1) return match(observed, aliases[0], 'PREVIOUS_NAME_ALIAS');
  if (aliases.length > 1) return match(observed, null, 'AMBIGUOUS_PREVIOUS_NAME_ALIAS');
  return match(observed, null, 'UNRESOLVED');
}

function traceObservedMatch(value) {
  if (!value.member) return Object.freeze({
    observedMemberId: value.observedMemberId,
    resolvedMemberId: '',
    matchBasis: value.matchBasis,
    positionBasis: 'UNRESOLVED',
    positionGlobal: null,
    sourcePath: [],
    lineContext: null,
    attributeEvidence: Object.freeze({}),
  });
  return traceNativeMember(value.member, value.matchBasis, value.observedMemberId);
}

function traceNativeMember(member, matchBasis, observedMemberId) {
  return Object.freeze({
    observedMemberId,
    resolvedMemberId: normalizeMemberId(member.memberId),
    matchBasis,
    positionBasis: validPoint(member.positionGlobal) ? 'NATIVE_MEMBER_POSITION' : 'UNRESOLVED',
    positionGlobal: validPoint(member.positionGlobal) ? Object.freeze({ ...member.positionGlobal }) : null,
    sourcePath: Object.freeze([...(member.sourcePath || [])]),
    lineContext: member.lineContext ? Object.freeze({ ...member.lineContext }) : null,
    attributeEvidence: Object.freeze(curatedAttributes(member.attributes || {})),
  });
}

function curatedAttributes(attrs) {
  return {
    previousName: attribute(attrs, PREVIOUS_NAME_KEYS),
    supportType: attribute(attrs, SUPPORT_TYPE_KEYS),
    primarySupportReference: attribute(attrs, SUPPORT_REFERENCE_KEYS),
    description: attribute(attrs, DESCRIPTION_KEYS),
    insulationThickness: attribute(attrs, INSULATION_THICKNESS_KEYS),
  };
}

function compatible(members, group) {
  return members.filter((member) => !memberContextConflicts(member, group));
}
function memberContextConflicts(member, group) {
  const context = member?.lineContext || {};
  const explicitLine = clean(context.fullLineTag);
  if (explicitLine && token(explicitLine) !== token(group.fullLineTag)) return true;
  const memberBranches = [context.branchNode, member?.sourceParentBranch].filter(Boolean).map(token);
  const groupBranches = new Set((group.branchNodes || []).map(token));
  return !explicitLine && memberBranches.length > 0 && groupBranches.size > 0
    && !memberBranches.some((branch) => groupBranches.has(branch));
}

function previousNames(member) {
  const value = attribute(member?.attributes || {}, PREVIOUS_NAME_KEYS);
  return value ? String(value).split(/[,;]+/u).map((item) => normalizeMemberId(item)).filter(Boolean) : [];
}
function attribute(attrs, keys) {
  const normalized = new Map(Object.entries(attrs || {}).map(([key, value]) => [normalizeKey(key), value]));
  for (const key of keys) {
    const value = clean(normalized.get(normalizeKey(key)));
    if (value) return value;
  }
  return '';
}
function addIndex(index, key, member) {
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(member);
}
function uniqueMembers(members) {
  const seen = new Set();
  return members.filter((member) => {
    const key = token(member.memberId);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function match(observedMemberId, member, matchBasis) { return Object.freeze({ observedMemberId, member, matchBasis }); }
function familyRoot(value) { return token(value).match(/^\/?((?:PS|SL)-\d+[A-Z]?)/u)?.[1] || ''; }
function normalizeMemberId(value) { const text = clean(value).replace(/^\/+/, '').toUpperCase(); return text ? `/${text}` : ''; }
function normalizeKey(value) { return String(value || '').replace(/[\s./-]+/g, '_').toUpperCase(); }
function validPoint(point) { return Boolean(point && [point.x, point.y, point.z].every(Number.isFinite)); }
function token(value) { return clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase(); }
function clean(value) { return value == null ? '' : String(value).trim(); }
