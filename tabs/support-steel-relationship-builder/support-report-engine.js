import {
  SUPPORT_REPORT_DIAGNOSTICS,
  SUPPORT_REPORT_ROW_SCHEMA,
  SUPPORT_REPORT_SCHEMA,
} from './support-report-contract.js';
import {
  groupSupportReportClashEvidence,
  parseSupportReportClashXml,
} from './support-report-clash-evidence.js';

const SYMBOLIC_ROLES = new Set(['DATUM', 'STRUCTURAL_REFERENCE']);

const SUPPORT_TYPE_KEYS = Object.freeze([
  'CMPSUPTYPE', 'MDSSUPPTYPE', 'SUPPORT_TYPE', 'SUPTYPE', 'TYPE_TEXT', 'STYPE',
]);
const SUPPORT_REFERENCE_KEYS = Object.freeze([
  'PIPING_PRIMARY_SUPPORT_REFERENCE', 'PRIMARY_SUPPORT_REFERENCE', 'SUPPORT_REFERENCE',
  'SUPPORT_REF', 'DBREF', 'REFNO', 'REFERENCE', 'REF',
]);
const DESCRIPTION_KEYS = Object.freeze(['DTXR', 'DESCRIPTION', 'DESC', 'LONG_DESCRIPTION']);
const PREVIOUS_NAME_KEYS = Object.freeze([
  'PREV_PRIMARY_SUPPORT_NAME', 'PREV_NAME', 'PREVIOUS_NAME', 'OLD_NAME', 'PREVIOUS_SUPPORT_NAME',
]);
const REMARK_KEYS = Object.freeze(['REMARKS', 'REMARK', 'STATUS_NOTE', 'COMMENTS', 'COMMENT']);
const PIPE_SIZE_KEYS = Object.freeze(['ABORE', 'BORE', 'NOMINAL_BORE', 'NOMINAL_DIAMETER', 'DN', 'NPS', 'PIPE_SIZE', 'SIZE']);
const PIPE_SCHEDULE_KEYS = Object.freeze(['PIPE_SCHEDULE', 'SCHEDULE', 'SCH', 'WALL_SCHEDULE', 'PIPE_SCH']);
const INSULATION_THICKNESS_KEYS = Object.freeze(['PIPE_INSULATION_THICKNESS', 'INSULATION_THICKNESS', 'INS_THK', 'ITHK', 'THICKNESS_INSULATION']);
const INSULATION_TYPE_KEYS = Object.freeze(['PIPE_INSULATION_TYPE', 'INSULATION_TYPE', 'INS_TYPE', 'ITYPE']);
const STRESS_SYSTEM_KEYS = Object.freeze(['STRESS_SYSTEM_NUMBER', 'STRESS_SYS_NO', 'STRESS_SYSTEM', 'SYSTEM_NUMBER', 'SYSTEM_NO']);
const NODE_NUMBER_KEYS = Object.freeze(['NODE_NO', 'NODE_NUMBER', 'STRESS_NODE', 'CAESAR_NODE']);

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
  const projections = groups.map((group, groupIndex) => {
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

    const primaryPath = choosePrimaryPath(group.primaryPaths || []);
    const pipeAttrs = carrierRows.map((row) => row.attributes || {});
    const row = Object.freeze({
      schema: SUPPORT_REPORT_ROW_SCHEMA,
      rowId: group.groupId,
      scope: group.scope || deriveScope(group.fullLineTag),
      civilSecondarySupport: group.secondarySupportFamilyId ? `${group.secondarySupportFamilyId}(REF)` : '',
      pipe: stripLeadingSlash(group.fullLineTag),
      size: firstAttribute(pipeAttrs, PIPE_SIZE_KEYS) || deriveNominalSizeMm(group.fullLineTag),
      pipeSchedule: firstAttribute(pipeAttrs, PIPE_SCHEDULE_KEYS),
      pipeInsulationThickness: firstAttribute(pipeAttrs, INSULATION_THICKNESS_KEYS),
      pipeInsulationType: firstAttribute(pipeAttrs, INSULATION_TYPE_KEYS),
      pipingPrimarySupport: joinMemberValues(reportMembers, (member) => normalizeMemberId(member.memberId)),
      supportType: joinMemberValues(reportMembers, (member) => supportType(member)),
      pipingPrimarySupportReference: joinMemberValues(reportMembers, (member) => firstAttribute([member.attributes || {}], SUPPORT_REFERENCE_KEYS)),
      eastWest: formatHorizontalCoordinate(coordinatePoint?.x, 'E', 'W'),
      northSouth: formatHorizontalCoordinate(coordinatePoint?.y, 'N', 'S'),
      bopElevation: formatVerticalCoordinate(coordinatePoint?.z),
      stressSystemNumber: firstAttribute(pipeAttrs, STRESS_SYSTEM_KEYS),
      nodeNumber: firstAttribute(pipeAttrs, NODE_NUMBER_KEYS),
      totalSupportPointsOnSecondary: group.totalSupportPointsOnSecondary,
      previousName: joinMemberValues(reportMembers, (member) => firstAttribute([member.attributes || {}], PREVIOUS_NAME_KEYS)),
      primarySupportDescription: joinMemberValues(reportMembers, (member) => firstAttribute([member.attributes || {}], DESCRIPTION_KEYS)),
      primarySupportZone: derivePrimarySupportZone(primaryPath, reportMembers),
      primarySupportSite: derivePrimarySupportSite(primaryPath, reportMembers),
      remarks: joinMemberValues(reportMembers, (member) => firstAttribute([member.attributes || {}], REMARK_KEYS), { keepBlanks: true }),
      evidence: Object.freeze({
        evidenceMode: relationshipBundle ? 'CLASH_XML_PLUS_RELATIONSHIP_BUNDLE' : 'CLASH_XML_ONLY',
        clashCount: group.clashCount,
        clashMemberIds: clashIds,
        selectedNativeMemberIds: selectedIds,
        nativeOnlyMemberIds: nativeOnlyMembers,
        missingClashMemberIds: missingClashMembers,
        branchNodes: group.branchNodes,
        carrierObjectIds: carrierRows.map((row) => row.carrierObjectId).filter(Boolean),
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
  });
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

function selectMembersForGroup(family, group) {
  if (!family) return [];
  const candidates = (family.members || []).filter(isReportableMember);
  const exactLine = candidates.filter((member) => memberMatchesLine(member, group.fullLineTag));
  const branchMatches = candidates.filter((member) => memberMatchesBranches(member, group.branchNodes));
  const directClash = candidates.filter((member) => group.primarySupportMemberIds.some((id) => token(id) === token(member.memberId)));
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
  const branchLine = lineFromBranch(context.branchNode || member?.sourceParentBranch);
  return sameLine(branchLine, fullLineTag);
}
function memberMatchesBranches(member, branchNodes) {
  const candidates = [member?.lineContext?.branchNode, member?.sourceParentBranch].filter(Boolean).map(token);
  const branchTokens = new Set((branchNodes || []).map(token));
  return candidates.some((candidate) => branchTokens.has(candidate));
}
function isReportableMember(member) {
  if (!member) return false;
  if (SYMBOLIC_ROLES.has(String(member.semanticRole || '').toUpperCase())) return false;
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
  if (direct) return direct;
  return (members || []).find((member) => member.positionGlobal) || null;
}
function choosePrimaryPath(paths) {
  return [...(paths || [])].sort((a, b) => b.length - a.length)[0] || [];
}
function derivePrimarySupportZone(path, members) {
  const fromPath = [...(path || [])].reverse().find((node) => /-CU-PL-S(?:-|$)/i.test(node));
  if (fromPath) return stripLeadingSlash(fromPath);
  return derivePathAncestor(members, /-CU-PL-S(?:-|$)/i);
}
function derivePrimarySupportSite(path, members) {
  const fromPath = [...(path || [])].find((node) => /-CU-PL(?:-|$)/i.test(node) && !/-CU-PL-S(?:-|$)/i.test(node));
  if (fromPath) return stripLeadingSlash(fromPath);
  return derivePathAncestor(members, /-CU-PL(?:-|$)/i, /-CU-PL-S(?:-|$)/i);
}
function derivePathAncestor(members, include, exclude = null) {
  for (const member of members || []) {
    for (const value of flattenPath(member.sourcePath)) {
      const text = String(value || '');
      if (include.test(text) && (!exclude || !exclude.test(text))) return stripLeadingSlash(text);
    }
  }
  return '';
}
function flattenPath(value) {
  if (Array.isArray(value)) return value.flatMap(flattenPath);
  return value == null ? [] : [value];
}
function supportType(member) {
  const value = firstAttribute([member?.attributes || {}], SUPPORT_TYPE_KEYS);
  if (value) return value;
  const role = String(member?.semanticRole || '');
  return role && role !== 'OTHER_FAMILY_MEMBER' ? role : '';
}
function firstAttribute(attributeRows, keys) {
  for (const attrs of attributeRows || []) {
    const normalized = normalizeAttributeMap(attrs);
    for (const key of keys || []) {
      const value = clean(normalized.get(normalizeKey(key)));
      if (value) return value;
    }
  }
  return '';
}
function normalizeAttributeMap(attrs) {
  const map = new Map();
  for (const [key, value] of Object.entries(attrs || {})) map.set(normalizeKey(key), value);
  return map;
}
function normalizeKey(value) { return String(value || '').replace(/[\s./-]+/g, '_').toUpperCase(); }
function joinMemberValues(members, selector, options = {}) {
  const values = (members || []).map((member) => clean(selector(member)));
  if (options.keepBlanks) {
    if (!values.length) return '';
    return values.length === 1 ? values[0] : values.join(', ');
  }
  return values.filter(Boolean).join(', ');
}
function deriveNominalSizeMm(lineTag) {
  const match = String(lineTag || '').match(/-(\d+(?:\.\d+)?)"-/);
  if (!match) return '';
  const inch = Number(match[1]);
  const standard = new Map([[0.5, 15], [0.75, 20], [1, 25], [1.5, 40], [2, 50], [2.5, 65], [3, 80], [4, 100], [6, 150], [8, 200], [10, 250], [12, 300], [14, 350], [16, 400], [18, 450], [20, 500], [24, 600]]);
  return standard.get(inch) ?? Math.round(inch * 25.4);
}
function formatHorizontalCoordinate(value, positivePrefix, negativePrefix) {
  if (!Number.isFinite(value)) return '';
  return `${value >= 0 ? positivePrefix : negativePrefix} ${formatNumber(Math.abs(value))}mm`;
}
function formatVerticalCoordinate(value) {
  return Number.isFinite(value) ? `U ${formatNumber(value)}mm` : '';
}
function formatNumber(value) {
  const rounded = Math.round(Number(value) * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/u, '').replace(/\.$/u, '');
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
function sameLine(left, right) { return token(lineFromBranch(left)) === token(lineFromBranch(right)) && Boolean(token(lineFromBranch(left))); }
function lineFromBranch(value) { return stripLeadingSlash(value).replace(/\/B(?:RANCH)?[-_A-Z0-9.]*$/iu, ''); }
function deriveScope(lineTag) { return stripLeadingSlash(lineTag).split('-')[0] || ''; }
function stripLeadingSlash(value) { return clean(value).replace(/^\/+/, ''); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function token(value) { return stripLeadingSlash(value).replace(/\(REF\)$/iu, '').toUpperCase(); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }
function diagnostic(severity, code, message, extra = {}) { return Object.freeze({ severity, code, message, ...extra }); }

export const _test = Object.freeze({
  selectMembersForGroup,
  deriveNominalSizeMm,
  formatHorizontalCoordinate,
  formatVerticalCoordinate,
  firstAttribute,
});
