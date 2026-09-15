export const SUPPORT_REPORT_ZONE_SCOPE_SCHEMA = 'SupportReportZoneScope.v1';

const SUPPORT_MEMBER_RE = /^\/(?:PS|SL)-\d+[A-Z]?(?:\.\d+|\/(?:DATUM|STRUCTURAL_REFERENCE))?$/iu;
const BRANCH_RE = /\/B(?:RANCH)?[-_A-Z0-9.]*$/iu;
const PIPE_LINE_RE = /-\d+(?:\.\d+)?"-[A-Z]/iu;

export function normalizeSupportReportZoneScope(input = {}) {
  const primaryZoneIds = canonicalZoneList(input.primaryZoneIds || input.primaryZones || []);
  const secondaryZoneIds = canonicalZoneList(input.secondaryZoneIds || input.secondaryZones || []);
  return Object.freeze({
    schema: SUPPORT_REPORT_ZONE_SCOPE_SCHEMA,
    primaryZoneIds: Object.freeze(primaryZoneIds),
    secondaryZoneIds: Object.freeze(secondaryZoneIds),
    active: primaryZoneIds.length > 0 || secondaryZoneIds.length > 0,
  });
}

export function discoverSupportReportZones(rows = []) {
  return Object.freeze({
    schema: SUPPORT_REPORT_ZONE_SCOPE_SCHEMA,
    primaryZones: Object.freeze(discoverSide(rows, 'primaryPaths')),
    secondaryZones: Object.freeze(discoverSide(rows, 'secondaryPaths')),
  });
}

export function scopeSupportReportRows(rows = [], scopeInput = {}) {
  const scope = normalizeSupportReportZoneScope(scopeInput);
  if (!scope.active) return Object.freeze([...(rows || [])]);
  const primarySet = new Set(scope.primaryZoneIds);
  const secondarySet = new Set(scope.secondaryZoneIds);
  return Object.freeze((rows || []).filter((row) => {
    const primaryPass = !primarySet.size || pathsContainAny(row?.primaryPaths || [], primarySet);
    const secondaryPass = !secondarySet.size || pathsContainAny(row?.secondaryPaths || [], secondarySet);
    return primaryPass && secondaryPass;
  }));
}

export function scopeSupportRelationshipRows(rows = [], scopeInput = {}) {
  const scope = normalizeSupportReportZoneScope(scopeInput);
  const selected = new Set([...scope.primaryZoneIds, ...scope.secondaryZoneIds]);
  if (!selected.size) return Object.freeze([...(rows || [])]);
  return Object.freeze((rows || []).filter((row) => {
    const paths = [row?.objectA?.path, row?.objectB?.path]
      .filter((path) => Array.isArray(path) && path.length);
    return pathsContainAny(paths, selected);
  }));
}

export function supportReportZoneScopeSummary(rows = [], scopeInput = {}) {
  const scope = normalizeSupportReportZoneScope(scopeInput);
  const included = scopeSupportReportRows(rows, scope);
  return Object.freeze({
    schema: SUPPORT_REPORT_ZONE_SCOPE_SCHEMA,
    active: scope.active,
    inputRowCount: (rows || []).length,
    includedRowCount: included.length,
    excludedRowCount: Math.max(0, (rows || []).length - included.length),
    primaryZoneIds: scope.primaryZoneIds,
    secondaryZoneIds: scope.secondaryZoneIds,
  });
}

function discoverSide(rows, field) {
  const counts = new Map();
  for (const row of rows || []) {
    const seenForRow = new Set();
    for (const path of row?.[field] || []) {
      for (const node of path || []) {
        const zoneId = canonicalZoneId(node);
        if (!zoneId || !isZoneCandidate(zoneId) || seenForRow.has(zoneId)) continue;
        seenForRow.add(zoneId);
        counts.set(zoneId, (counts.get(zoneId) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([zoneId, evidenceRowCount]) => Object.freeze({ zoneId, evidenceRowCount }))
    .sort((left, right) => left.zoneId.localeCompare(right.zoneId));
}

function pathsContainAny(paths, selected) {
  for (const path of paths || []) {
    for (const node of path || []) {
      const zoneId = canonicalZoneId(node);
      if (zoneId && selected.has(zoneId)) return true;
    }
  }
  return false;
}

function isZoneCandidate(zoneId) {
  if (!zoneId || SUPPORT_MEMBER_RE.test(zoneId) || BRANCH_RE.test(zoneId) || PIPE_LINE_RE.test(zoneId)) return false;
  return /(?:^|-)CU(?:-|$)/iu.test(zoneId)
    || /(?:^|[-_/])(?:ZONE|AREA|UNIT)(?:[-_/]|$)/iu.test(zoneId);
}

function canonicalZoneList(values) {
  return [...new Set((values || []).map(canonicalZoneId).filter(Boolean))].sort();
}

function canonicalZoneId(value) {
  const text = String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/u, '').toUpperCase();
  return text ? `/${text}` : '';
}

export const _test = Object.freeze({
  canonicalZoneId,
  isZoneCandidate,
  pathsContainAny,
});
