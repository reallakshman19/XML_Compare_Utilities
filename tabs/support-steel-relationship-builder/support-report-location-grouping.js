import { stripLeadingSlash } from '../ps-family-clash-audit/ps-family-token-utils.js';

export const SUPPORT_REPORT_LOCATION_MERGE_TOLERANCE_MM = 50;
export const SUPPORT_REPORT_MULTI_LOCATION_REMARK = 'Pipe supported at multiple locations';

export function groupSupportReportEvidenceByLocation(rows = [], options = {}) {
  const toleranceMm = locationTolerance(options);
  const baseGroups = groupByFamilyAndLine(rows);
  const located = [];
  for (const base of baseGroups.values()) {
    const clusters = clusterRows(base.rows, toleranceMm);
    clusters.forEach((cluster, index) => located.push(buildLocationGroup(base, cluster, index, clusters.length, toleranceMm)));
  }
  return applyFamilyCounts(located);
}

export function clusterSupportReportRowsByLocation(rows = [], toleranceMm = SUPPORT_REPORT_LOCATION_MERGE_TOLERANCE_MM) {
  return clusterRows(rows, nonNegative(toleranceMm, SUPPORT_REPORT_LOCATION_MERGE_TOLERANCE_MM));
}

function groupByFamilyAndLine(rows) {
  const groups = new Map();
  for (const [rowIndex, row] of (rows || []).entries()) {
    if (!row?.secondarySupportFamilyId || !row?.fullLineTag) continue;
    const key = `${token(row.secondarySupportFamilyId)}::${token(row.fullLineTag)}`;
    if (!groups.has(key)) groups.set(key, {
      key,
      secondarySupportFamilyId: row.secondarySupportFamilyId,
      fullLineTag: row.fullLineTag,
      scope: row.scope,
      rows: [],
    });
    groups.get(key).rows.push({ row, rowIndex });
  }
  return groups;
}

function clusterRows(indexedRows, toleranceMm) {
  if (!indexedRows.length) return [];
  const withPoint = indexedRows.filter(({ row }) => validPoint(row.clashPointGlobalMm));
  if (!withPoint.length) return [indexedRows];
  const components = connectedComponents(withPoint, toleranceMm);
  const clusters = components.map((component) => component.map((index) => withPoint[index]));
  attachPointlessRows(clusters, indexedRows.filter(({ row }) => !validPoint(row.clashPointGlobalMm)));
  return clusters.sort((left, right) => minimumIndex(left) - minimumIndex(right));
}

function connectedComponents(rows, toleranceMm) {
  const visited = new Set();
  const components = [];
  for (let start = 0; start < rows.length; start += 1) {
    if (visited.has(start)) continue;
    const queue = [start];
    const component = [];
    visited.add(start);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (let next = 0; next < rows.length; next += 1) {
        if (visited.has(next) || !withinTolerance(rows[current].row, rows[next].row, toleranceMm)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function attachPointlessRows(clusters, rows) {
  if (!rows.length) return;
  if (!clusters.length) { clusters.push([...rows]); return; }
  for (const entry of rows) {
    const matched = clusters.find((cluster) => cluster.some(({ row }) => sameContext(row, entry.row)));
    (matched || clusters[0]).push(entry);
  }
}

function buildLocationGroup(base, cluster, locationIndex, locationCount, toleranceMm) {
  const rows = cluster.sort((left, right) => left.rowIndex - right.rowIndex).map((entry) => entry.row);
  const points = rows.map((row) => row.clashPointGlobalMm).filter(validPoint);
  const primaryPaths = uniquePaths(rows.map((row) => row.primaryPath));
  const secondaryPaths = uniquePaths(rows.map((row) => row.secondaryPath));
  const members = unique(rows.map((row) => normalizeMemberId(row.primarySupportMemberId))).sort(memberCompare);
  const branchNodes = unique(rows.map((row) => row.branchNode)).sort();
  return Object.freeze({
    groupId: locationCount > 1 ? `${base.key}::LOC-${locationIndex + 1}` : base.key,
    secondarySupportFamilyId: base.secondarySupportFamilyId,
    fullLineTag: base.fullLineTag,
    scope: base.scope,
    branchNodes,
    primarySupportMemberIds: members,
    clashPointsGlobalMm: points,
    representativeClashPointGlobalMm: averagePoint(points),
    primaryPaths,
    secondaryPaths,
    evidenceRows: rows,
    clashCount: rows.length,
    locationIndex,
    locationCountOnPipe: locationCount,
    locationMergeToleranceMm: toleranceMm,
    multipleLocationsOnPipe: locationCount > 1,
    totalSupportPointsOnSecondary: 0,
  });
}

function applyFamilyCounts(groups) {
  const counts = new Map();
  groups.forEach((group) => counts.set(token(group.secondarySupportFamilyId), (counts.get(token(group.secondarySupportFamilyId)) || 0) + 1));
  return groups.map((group) => Object.freeze({
    ...group,
    totalSupportPointsOnSecondary: counts.get(token(group.secondarySupportFamilyId)) || 0,
  }));
}

function withinTolerance(left, right, toleranceMm) {
  const a = left.clashPointGlobalMm;
  const b = right.clashPointGlobalMm;
  if (!validPoint(a) || !validPoint(b)) return false;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= toleranceMm;
}

function sameContext(left, right) {
  if (token(left.primarySupportMemberId) === token(right.primarySupportMemberId)) return true;
  return token(left.branchNode) === token(right.branchNode);
}

function locationTolerance(options) {
  return nonNegative(options.locationMergeToleranceMm, SUPPORT_REPORT_LOCATION_MERGE_TOLERANCE_MM);
}
function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function validPoint(point) {
  return Boolean(point && [point.x, point.y, point.z].every(Number.isFinite));
}
function averagePoint(points) {
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
  };
}
function uniquePaths(paths) {
  const seen = new Set();
  return (paths || []).filter((path) => {
    const signature = (path || []).join('\u0000');
    if (!signature || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  }).map((path) => [...path]);
}
function normalizeMemberId(value) {
  const clean = stripLeadingSlash(value).toUpperCase();
  return clean ? `/${clean}` : '';
}
function memberCompare(left, right) {
  const a = Number(String(left || '').match(/\.(\d+)$/)?.[1]);
  const b = Number(String(right || '').match(/\.(\d+)$/)?.[1]);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return String(left || '').localeCompare(String(right || ''));
}
function minimumIndex(cluster) { return Math.min(...cluster.map((entry) => entry.rowIndex)); }
function token(value) { return stripLeadingSlash(value).replace(/\(REF\)$/iu, '').toUpperCase(); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }
