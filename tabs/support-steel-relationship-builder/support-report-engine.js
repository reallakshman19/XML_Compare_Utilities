import {
  SUPPORT_REPORT_DIAGNOSTICS,
  SUPPORT_REPORT_ROW_SCHEMA,
  SUPPORT_REPORT_SCHEMA,
} from './support-report-contract.js?v=20260909-support-report-parity-2';
import {
  groupSupportReportClashEvidence,
  parseSupportReportClashXml,
} from './support-report-clash-safety.js?v=20260909-support-report-parser-primitives-8';
import { projectSupportReportFields } from './support-report-field-projection.js?v=20260909-support-report-parity-2';

const SYMBOLIC_ROLES = new Set(['DATUM', 'STRUCTURAL_REFERENCE']);

export function buildSupportReportBundle(input = {}) {
  const relationshipBundle = normalizeBundle(input.relationshipBundle);
  const parsedEvidence = input.clashEvidence?.groups
    ? input.clashEvidence
    : parseSupportReportClashXml(input.clashXmlText || '', input.config || {});
  const groups = parsedEvidence.groups || groupSupportReportClashEvidence(parsedEvidence.rows || []);
  const diagnostics = [...(parsedEvidence.diagnostics || [])];
  if (!relationshipBundle) {
    diagnostics.push(diagnostic('INFO', SUPPORT_REPORT_DIAGNOSTICS.RELATIONSHIP_BUNDLE_UNAVAILABLE,
      'Support report was built from clash XML only. Load/build the relationship bundle to enrich complete member lists and native attributes.'));
  }

  const familyIndex = indexFamilies(relationshipBundle?.supportFamilies || []);
  const carriers = relationshipBundle?.supportCarrierResolution?.carrierObjects || [];
  const projections = groups.map((group, groupIndex) => projectGroup({
    group, groupIndex, relationshipBundle, familyIndex, carriers, diagnostics,
  }));
  const rows = projections
    .sort((left, right) => left.familyRank - right.familyRank
      || left.familyToken.localeCompare(right.familyToken)
      || left.memberRank - right.memberRank
      || left.groupIndex - right.groupIndex)
    .map((projection) => projection.row);

  return Object.freeze({
    schema: SUPPORT_REPORT_SCHEMA,
    sourceEvidenceSchema: parsedEvidence.schema,
    relationshipBundleSchema: relationshipBundle?.schema || null,
    evidenceMode: relationshipBundle ? 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE' : 'CLASH_XML_ONLY',
    summary: Object.freeze({
      clashEvidenceCount: parsedEvidence.rows?.length || 0,
      reportRowCount: rows.length,
      secondarySupportFamilyCount: unique(rows.map((row) => normalizeFamilyId(row.civilSecondarySupport))).length,
      enrichedRowCount: rows.filter((row) => row.evidence.selectedNativeMemberIds.length > 0).length,
      xmlOnlyRowCount: rows.filter((row) => row.evidence.selectedNativeMemberIds.length === 0).length,
      nativeOnlyMemberCount: rows.reduce((sum, row) => sum + row.evidence.nativeOnlyMemberIds.length, 0),
      diagnosticCount: diagnostics.length,
    }),
    rows,
    diagnostics,
  });
}

function projectGroup({ group, groupIndex, relationshipBundle, familyIndex, carriers, diagnostics }) {
  const rowDiagnostics = [];
  const familyEntry = familyIndex.get(token(group.secondarySupportFamilyId)) || null;
  const family = familyEntry?.family || null;
  if (relationshipBundle && !family) {
    rowDiagnostics.push(diagnostic('WARN', SUPPORT_REPORT_DIAGNOSTICS.FAMILY_NOT_FOUND,
      `${group.secondarySupportFamilyId} is present in clash XML but not in the relationship bundle.`, {
        secondarySupportFamilyId: group.secondarySupportFamilyId,
        fullLineTag: group.fullLineTag,
      }));
  }

  const selectedMembers = selectMembersForGroup(family, group);
  const selectedIds = selectedMembers.map((member) => normalizeMemberId(member.memberId)).filter(Boolean);
  const clashIds = unique(group.primarySupportMemberIds.map(normalizeMemberId));
  const missingClashMembers = clashIds.filter((id) => !selectedIds.some((selected) => token(selected) === token(id)));
  const nativeOnlyMembers = selectedIds.filter((id) => !clashIds.some((clash) => token(clash) === token(id)));
  if (family && !selectedMembers.length) {
    rowDiagnostics.push(diagnostic('WARN', SUPPORT_REPORT_DIAGNOSTICS.MEMBER_ENRICHMENT_INCOMPLETE,
      `No native family members could be line-matched for ${group.secondarySupportFamilyId} on ${group.fullLineTag}; clash members are retained as fallback.`, {
        secondarySupportFamilyId: group.secondarySupportFamilyId,
        fullLineTag: group.fullLineTag,
      }));
  }

  const reportMembers = selectedMembers.length
    ? selectedMembers
    : clashIds.map((memberId) => ({ memberId, semanticRole: '', attributes: {}, lineContext: {}, positionGlobal: null }));
  const carrierRows = selectCarriersForGroup(carriers, group);
  if (relationshipBundle && !carrierRows.length) {
    rowDiagnostics.push(diagnostic('INFO', SUPPORT_REPORT_DIAGNOSTICS.CARRIER_ENRICHMENT_UNAVAILABLE,
      `No authoritative carrier object was line-matched for ${group.fullLineTag}; pipe metadata may be incomplete.`, {
        fullLineTag: group.fullLineTag,
      }));
  }

  const representativeMember = chooseRepresentativeMember(reportMembers, clashIds);
  const nativePoint = representativeMember?.positionGlobal || null;
  const coordinatePoint = nativePoint || group.representativeClashPointGlobalMm || null;
  if (!nativePoint && coordinatePoint) {
    rowDiagnostics.push(diagnostic('INFO', SUPPORT_REPORT_DIAGNOSTICS.COORDINATE_FROM_CLASH_FALLBACK,
      `Coordinates for ${group.secondarySupportFamilyId} / ${group.fullLineTag} use the clash point because no native support position was available.`, {
        secondarySupportFamilyId: group.secondarySupportFamilyId,
        fullLineTag: group.fullLineTag,
      }));
  }

  const row = Object.freeze({
    schema: SUPPORT_REPORT_ROW_SCHEMA,
    rowId: group.groupId,
    ...projectSupportReportFields({ group, reportMembers, carrierRows, coordinatePoint }),
    evidence: Object.freeze({
      evidenceMode: relationshipBundle ? 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE' : 'CLASH_XML_ONLY',
      clashCount: group.clashCount,
      clashMemberIds: clashIds,
      selectedNativeMemberIds: selectedIds,
      nativeOnlyMemberIds: nativeOnlyMembers,
      missingClashMemberIds: missingClashMembers,
      branchNodes: group.branchNodes,
      carrierObjectIds: carrierRows.map((carrier) => carrier.carrierObjectId).filter(Boolean),
      nativeCoordinateAvailable: Boolean(nativePoint),
      clashCoordinateFallbackUsed: !nativePoint && Boolean(coordinatePoint),
    }),
    diagnostics: rowDiagnostics,
  });
  diagnostics.push(...rowDiagnostics);
  return {
    row,
    familyRank: familyEntry?.index ?? Number.MAX_SAFE_INTEGER,
    familyToken: token(group.secondarySupportFamilyId),
    memberRank: memberOrderRank(family, selectedMembers),
    groupIndex,
  };
}

function selectMembersForGroup(family, group) {
  if (!family) return [];
  const candidates = (family.members || []).filter(isReportableMember);
  const exactLine = candidates.filter((member) => memberMatchesLine(member, group.fullLineTag));
  const branchMatches = candidates.filter((member) => memberMatchesBranches(member, group.branchNodes));
  const directClash = candidates.filter((member) => group.primarySupportMemberIds
    .some((id) => token(id) === token(member.memberId)));
  const selected = exactLine.length ? exactLine : branchMatches.length ? branchMatches : directClash;
  return uniqueMembers([...selected, ...directClash]);
}

function selectCarriersForGroup(carriers, group) {
  const exact = (carriers || []).filter((carrier) => sameLine(carrier.lineContext?.fullLineTag, group.fullLineTag));
  if (exact.length) return exact;
  const branchTokens = new Set((group.branchNodes || []).map(token));
  return (carriers || []).filter((carrier) => branchTokens.has(token(carrier.lineContext?.branchNode)));
}
function memberMatchesLine(member, fullLineTag) {
  const context = member?.lineContext || {};
  if (sameLine(context.fullLineTag, fullLineTag)) return true;
  return sameLine(lineFromBranch(context.branchNode || member?.sourceParentBranch), fullLineTag);
}
function memberMatchesBranches(member, branchNodes) {
  const candidates = [member?.lineContext?.branchNode, member?.sourceParentBranch].filter(Boolean).map(token);
  const branchTokens = new Set((branchNodes || []).map(token));
  return candidates.some((candidate) => branchTokens.has(candidate));
}
function isReportableMember(member) {
  if (!member || SYMBOLIC_ROLES.has(String(member.semanticRole || '').toUpperCase())) return false;
  return /\/(?:PS|SL)-\d+[A-Z]?\.\d+$/iu.test(normalizeMemberId(member.memberId));
}
function uniqueMembers(members) {
  const seen = new Set();
  return (members || []).filter((member) => {
    const key = token(member.memberId);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function chooseRepresentativeMember(members, clashMemberIds) {
  const direct = (members || []).find((member) => member.positionGlobal
    && clashMemberIds.some((id) => token(id) === token(member.memberId)));
  return direct || (members || []).find((member) => member.positionGlobal) || null;
}
function indexFamilies(families) {
  const map = new Map();
  (families || []).forEach((family, index) => {
    const key = token(family.familyId);
    if (key && !map.has(key)) map.set(key, { family, index });
  });
  return map;
}
function memberOrderRank(family, selectedMembers) {
  if (!family || !selectedMembers?.length) return Number.MAX_SAFE_INTEGER;
  const order = new Map((family.members || []).map((member, index) => [token(member.memberId), index]));
  const ranks = selectedMembers.map((member) => order.get(token(member.memberId))).filter(Number.isFinite);
  return ranks.length ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER;
}
function normalizeBundle(bundle) {
  if (!bundle) return null;
  if (typeof bundle === 'string') {
    try { return JSON.parse(bundle); } catch { return null; }
  }
  return typeof bundle === 'object' ? bundle : null;
}
function normalizeMemberId(value) {
  const text = clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase();
  return text ? `/${text}` : '';
}
function normalizeFamilyId(value) { return clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase(); }
function sameLine(left, right) {
  const leftToken = token(lineFromBranch(left));
  return Boolean(leftToken) && leftToken === token(lineFromBranch(right));
}
function lineFromBranch(value) { return stripLeadingSlash(value).replace(/\/B(?:RANCH)?[-_A-Z0-9.]*$/iu, ''); }
function stripLeadingSlash(value) { return clean(value).replace(/^\/+/, ''); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function token(value) { return stripLeadingSlash(value).replace(/\(REF\)$/iu, '').toUpperCase(); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }
function diagnostic(severity, code, message, extra = {}) { return Object.freeze({ severity, code, message, ...extra }); }

export const _test = Object.freeze({ selectMembersForGroup, selectCarriersForGroup });
