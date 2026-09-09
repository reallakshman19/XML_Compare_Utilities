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
const PIPE_SIZE_KEYS = Object.freeze([
  'ABORE', 'BORE', 'NOMINAL_BORE', 'NOMINAL_DIAMETER', 'DN', 'NPS', 'PIPE_SIZE', 'SIZE',
]);
const PIPE_SCHEDULE_KEYS = Object.freeze(['PIPE_SCHEDULE', 'SCHEDULE', 'SCH', 'WALL_SCHEDULE', 'PIPE_SCH']);
const INSULATION_THICKNESS_KEYS = Object.freeze([
  'PIPE_INSULATION_THICKNESS', 'INSULATION_THICKNESS', 'INS_THK', 'ITHK', 'THICKNESS_INSULATION',
]);
const INSULATION_TYPE_KEYS = Object.freeze(['PIPE_INSULATION_TYPE', 'INSULATION_TYPE', 'INS_TYPE', 'ITYPE']);
const STRESS_SYSTEM_KEYS = Object.freeze([
  'STRESS_SYSTEM_NUMBER', 'STRESS_SYS_NO', 'STRESS_SYSTEM', 'SYSTEM_NUMBER', 'SYSTEM_NO',
]);
const NODE_NUMBER_KEYS = Object.freeze(['NODE_NO', 'NODE_NUMBER', 'STRESS_NODE', 'CAESAR_NODE']);
const REVISION_KEYS = Object.freeze(['REVISION', 'REVISION_NO', 'REVISION_NUMBER', 'REV_NO', 'REV']);
const CARRIER_FIELD_SPECS = Object.freeze([
  Object.freeze({ field: 'size', keys: PIPE_SIZE_KEYS }),
  Object.freeze({ field: 'pipeSchedule', keys: PIPE_SCHEDULE_KEYS }),
  Object.freeze({ field: 'pipeInsulationThickness', keys: INSULATION_THICKNESS_KEYS }),
  Object.freeze({ field: 'pipeInsulationType', keys: INSULATION_TYPE_KEYS }),
  Object.freeze({ field: 'stressSystemNumber', keys: STRESS_SYSTEM_KEYS }),
  Object.freeze({ field: 'nodeNumber', keys: NODE_NUMBER_KEYS }),
  Object.freeze({ field: 'revision', keys: REVISION_KEYS }),
]);

export function projectSupportReportFields({ group, reportMembers, carrierRows, coordinatePoint }) {
  const primaryPath = choosePrimaryPath(group?.primaryPaths || []);
  const size = resolveCarrierAttribute(carrierRows, PIPE_SIZE_KEYS);
  const schedule = resolveCarrierAttribute(carrierRows, PIPE_SCHEDULE_KEYS);
  const insulationThickness = resolveCarrierAttribute(carrierRows, INSULATION_THICKNESS_KEYS);
  const insulationType = resolveCarrierAttribute(carrierRows, INSULATION_TYPE_KEYS);
  const stressSystem = resolveCarrierAttribute(carrierRows, STRESS_SYSTEM_KEYS);
  const nodeNumber = resolveCarrierAttribute(carrierRows, NODE_NUMBER_KEYS);
  const revision = resolveCarrierAttribute(carrierRows, REVISION_KEYS);
  return Object.freeze({
    previousName: joinMemberValues(reportMembers, (member) => memberAttribute(member, PREVIOUS_NAME_KEYS)),
    scope: group?.scope || deriveScope(group?.fullLineTag),
    civilSecondarySupport: group?.secondarySupportFamilyId ? `${group.secondarySupportFamilyId}(REF)` : '',
    pipe: stripLeadingSlash(group?.fullLineTag),
    size: size.conflict ? '' : (size.value || deriveNominalSizeMm(group?.fullLineTag)),
    pipingPrimarySupport: joinMemberValues(reportMembers, (member) => normalizeMemberId(member.memberId)),
    supportType: joinMemberValues(reportMembers, supportType),
    pipingPrimarySupportReference: joinMemberValues(reportMembers, (member) => memberAttribute(member, SUPPORT_REFERENCE_KEYS)),
    eastWest: formatHorizontalCoordinate(coordinatePoint?.x, 'E', 'W'),
    northSouth: formatHorizontalCoordinate(coordinatePoint?.y, 'N', 'S'),
    bopElevation: formatVerticalCoordinate(coordinatePoint?.z),
    totalSupportPointsOnSecondary: group?.totalSupportPointsOnSecondary ?? 0,
    remarks: joinMemberValues(reportMembers, (member) => memberAttribute(member, REMARK_KEYS), { keepBlanks: true }),
    primarySupportDescription: joinMemberValues(reportMembers, (member) => memberAttribute(member, DESCRIPTION_KEYS)),
    primarySupportZone: derivePrimarySupportZone(primaryPath, reportMembers),
    primarySupportSite: derivePrimarySupportSite(primaryPath, reportMembers),
    pipeSchedule: schedule.value,
    pipeInsulationThickness: insulationThickness.value,
    pipeInsulationType: insulationType.value,
    pipeInsulationTypeAndThickness: [insulationType.value, insulationThickness.value].filter(Boolean).join(' '),
    stressSystemNumber: stressSystem.value,
    nodeNumber: nodeNumber.value,
    revision: revision.value,
  });
}

export function supportReportCarrierAttributeConflicts(carrierRows = []) {
  return CARRIER_FIELD_SPECS.map((spec) => {
    const resolved = resolveCarrierAttribute(carrierRows, spec.keys);
    if (!resolved.conflict) return null;
    return Object.freeze({
      field: spec.field,
      values: resolved.values,
      carrierValues: resolved.carrierValues,
    });
  }).filter(Boolean);
}

function resolveCarrierAttribute(carrierRows, keys) {
  const carrierValues = (carrierRows || []).map((row) => ({
    carrierObjectId: clean(row?.carrierObjectId),
    value: firstAttribute([row?.attributes || {}], keys),
  })).filter((row) => row.value)
    .sort((left, right) => left.carrierObjectId.localeCompare(right.carrierObjectId)
      || left.value.localeCompare(right.value));
  const values = [...new Set(carrierValues.map((row) => row.value))].sort((a, b) => a.localeCompare(b));
  return Object.freeze({
    value: values.length === 1 ? values[0] : '',
    conflict: values.length > 1,
    values,
    carrierValues,
  });
}

function memberAttribute(member, keys) { return firstAttribute([member?.attributes || {}], keys); }
function supportType(member) { return memberAttribute(member, SUPPORT_TYPE_KEYS); }
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
function choosePrimaryPath(paths) { return [...(paths || [])].sort((a, b) => b.length - a.length)[0] || []; }
function derivePrimarySupportZone(path, members) {
  const fromPath = [...(path || [])].reverse().find((node) => /-CU-PL-S(?:-|$)/i.test(node));
  return fromPath ? stripLeadingSlash(fromPath) : derivePathAncestor(members, /-CU-PL-S(?:-|$)/i);
}
function derivePrimarySupportSite(path, members) {
  const fromPath = [...(path || [])].find((node) => /-CU-PL(?:-|$)/i.test(node) && !/-CU-PL-S(?:-|$)/i.test(node));
  return fromPath ? stripLeadingSlash(fromPath) : derivePathAncestor(members, /-CU-PL(?:-|$)/i, /-CU-PL-S(?:-|$)/i);
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
function flattenPath(value) { return Array.isArray(value) ? value.flatMap(flattenPath) : value == null ? [] : [value]; }
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
function formatVerticalCoordinate(value) { return Number.isFinite(value) ? `U ${formatNumber(value)}mm` : ''; }
function formatNumber(value) {
  const rounded = Math.round(Number(value) * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/u, '').replace(/\.$/u, '');
}
function normalizeMemberId(value) {
  const text = clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase();
  return text ? `/${text}` : '';
}
function deriveScope(lineTag) { return stripLeadingSlash(lineTag).split('-')[0] || ''; }
function stripLeadingSlash(value) { return clean(value).replace(/^\/+/, ''); }
function clean(value) { return value == null ? '' : String(value).trim(); }

export const _test = Object.freeze({
  firstAttribute,
  resolveCarrierAttribute,
  deriveNominalSizeMm,
  formatHorizontalCoordinate,
  formatVerticalCoordinate,
});
