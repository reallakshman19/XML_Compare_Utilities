import { PS_FAMILY_CLASH_AUDIT_SCHEMA, PS_FAMILY_COVERAGE_ROW_SCHEMA, PS_FAMILY_STATUS } from './ps-family-clash-audit-contract.js';
import { extractFamilyRoot, uniqueSorted } from './ps-family-token-utils.js';

function firstSourceFamily(expectedRows, config) {
  if (config?.sourceFamily) return String(config.sourceFamily).toUpperCase();
  return expectedRows.find((row) => row.familyRoot)?.familyRoot || '';
}

function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function detailFields(detail) {
  return {
    detailAvailable: Boolean(detail), posFamilyId: detail?.posFamilyId || '', p1bore: detail?.p1bore ?? null,
    pipe: detail?.pipe || '', lineFamily: detail?.lineFamily || '', supportText: detail?.supportText || '',
    supportGap: detail?.supportGap || '', reference: detail?.reference || '', position: detail?.position || null,
    positionText: detail?.positionText || '', isometricNotes: detail?.isometricNotes || '',
  };
}

function summarizeMatches(matches) {
  return {
    clashNames: matches.map((row) => row.clashName),
    lineFamilies: uniqueSorted(matches.map((row) => row.against.pipe?.lineFamily)),
    fullLineTags: uniqueSorted(matches.map((row) => row.against.pipe?.fullLineTag)),
    branchNodes: uniqueSorted(matches.map((row) => row.against.pipe?.fullBranchNode)),
    sourceObjects: uniqueSorted(matches.map((row) => row.source.objectName)),
    minDistance: matches.reduce((min, row) => (row.distance == null ? min : Math.min(min, row.distance)), Infinity),
  };
}

function sourceRoot(row, config, sourceFamily) {
  return row.source.familyRoot || extractFamilyRoot(row.source.objectName, config) || extractFamilyRoot((row.source.path || []).join('/'), config) || sourceFamily;
}

export function rowLocalFamilyStatus(row, config = {}, sourceFamily = '') {
  const leftRoot = sourceRoot(row, config, sourceFamily);
  const rightRoot = row.against.familyRoot || extractFamilyRoot(row.against.memberName, config);
  return leftRoot && rightRoot && leftRoot !== rightRoot ? PS_FAMILY_STATUS.OUT_OF_FAMILY : 'IN_FAMILY';
}

function createCoverageRows(expectedRows, actualInFamilyByKey, detailByKey, sourceFamily) {
  return expectedRows.map((expected, index) => {
    const matches = actualInFamilyByKey.get(expected.exactMemberKey) || [];
    const summary = summarizeMatches(matches);
    const status = matches.length > 1 ? PS_FAMILY_STATUS.FOUND_DUPLICATE_CLASH : matches.length === 1 ? PS_FAMILY_STATUS.FOUND : PS_FAMILY_STATUS.MISSING;
    return {
      schema: PS_FAMILY_COVERAGE_ROW_SCHEMA, no: index + 1, sourceFamily, expectedMember: expected.displayName,
      expectedRawName: expected.rawItemName, exactMemberKey: expected.exactMemberKey, status, found: matches.length > 0,
      clashCount: matches.length, clashNames: summary.clashNames, againstMembers: uniqueSorted(matches.map((row) => row.against.memberName)),
      lineFamilies: summary.lineFamilies, fullLineTags: summary.fullLineTags, branchNodes: summary.branchNodes,
      sourceObjects: summary.sourceObjects, minDistance: Number.isFinite(summary.minDistance) ? summary.minDistance : null,
      ...detailFields(detailByKey.get(expected.exactMemberKey)),
      remarks: matches.length ? 'Expected member found in clash XML.' : 'Expected member not found in clash XML.',
    };
  });
}

function createLineFamilyRows(clashRows) {
  const map = groupBy(clashRows, (row) => row.against.pipe?.lineFamily || 'NO_LINE_FAMILY');
  return Array.from(map.entries()).map(([lineFamily, rows]) => ({
    lineFamily,
    fullLineTags: uniqueSorted(rows.map((row) => row.against.pipe?.fullLineTag)),
    branches: uniqueSorted(rows.map((row) => row.against.pipe?.branch)),
    members: uniqueSorted(rows.map((row) => row.against.memberName)),
    clashNames: rows.map((row) => row.clashName),
    clashCount: rows.length,
  })).sort((a, b) => a.lineFamily.localeCompare(b.lineFamily));
}

function createSourceVsPosFamilyRows(detailRows, coverageRows, clashRows, posFamilies, config) {
  const bySource = groupBy(detailRows, (row) => row.sourceFamily || extractFamilyRoot(row.displayName, config));
  return Array.from(bySource.entries()).map(([source, rows]) => {
    const sourceCoverage = coverageRows.filter((row) => row.sourceFamily === source || extractFamilyRoot(row.expectedMember, config) === source);
    const sourceClashes = clashRows.filter((row) => row.source.familyRoot === source);
    const posFamilyIds = uniqueSorted(rows.map((row) => row.posFamilyId));
    const sourcePosFamilies = posFamilies.filter((family) => posFamilyIds.includes(family.posFamilyId));
    return {
      source, posFamilyCount: posFamilyIds.length, elementCount: rows.length,
      foundElementCount: sourceCoverage.filter((row) => row.found).length,
      missingElementCount: sourceCoverage.filter((row) => !row.found).length,
      clashCount: sourceClashes.length, outOfFamilyCount: sourceClashes.filter((row) => row.familyStatus === PS_FAMILY_STATUS.OUT_OF_FAMILY).length,
      posFamilyIds, lineFamilies: uniqueSorted(sourcePosFamilies.flatMap((family) => family.lineFamilies)),
      remarks: posFamilyIds.length ? 'POSFamily count derived from Element Detail CSV.' : 'No POSFamily rows available for this source.',
    };
  }).sort((a, b) => a.source.localeCompare(b.source));
}

function createCoverageLookup(clashRows) {
  const map = new Map();
  clashRows.forEach((row) => {
    if (!row.against.exactMemberKey || map.has(row.against.exactMemberKey)) return;
    map.set(row.against.exactMemberKey, row);
  });
  return map;
}

export function buildPsClashReportRows(psClashRows = [], clashRows = []) {
  const coverage = createCoverageLookup(clashRows);
  return Array.from(groupBy(psClashRows, (row) => row.groupKey).values()).flatMap((rows) => {
    const sorted = [...rows].sort((a, b) => a.sourceObject.localeCompare(b.sourceObject, undefined, { numeric: true }));
    const representative = sorted[0];
    const covered = sorted.map((row) => coverage.get(row.exactMemberKey)).find(Boolean);
    return sorted.map((row, index) => ({
      psClashName: row.psClashName, source: row.source, sourceObject: row.sourceObject, pipe: row.pipe,
      lineFamily: row.lineFamily, fullLineTag: row.fullLineTag, branchNode: row.branchNode,
      coverageInClashReport: index === 0 && covered ? 'Yes' : 'No',
      clashNo: index === 0 && covered ? covered.clashName : '',
      remarks: index === 0 ? (covered ? 'None' : 'No matching Clash Rows member') : `Same PSClashGroup ${representative.sourceObject}`,
    }));
  });
}

export function buildPsFamilyClashAudit(input) {
  const config = input?.config || {};
  const expectedRows = input?.expectedRows || [];
  const detailRows = input?.elementDetailRows || [];
  const posFamilies = input?.posFamilies || [];
  const sourceFamily = firstSourceFamily(expectedRows, config);
  const detailByKey = new Map(detailRows.map((row) => [row.exactMemberKey, row]));
  const diagnostics = [...(input?.diagnostics || [])];
  const clashRows = (input?.clashRows || []).map((row) => {
    const familyStatus = rowLocalFamilyStatus(row, config, sourceFamily);
    const detail = detailByKey.get(row.against.exactMemberKey);
    if (!detail) diagnostics.push({ level: 'WARN', code: 'DETAIL_ROW_NOT_FOUND_FOR_CLASH_MEMBER', message: `${row.against.memberName} has no Element Detail CSV row.` });
    return { ...row, familyStatus, elementDetail: detailFields(detail) };
  });
  const actualInFamilyByKey = groupBy(clashRows.filter((row) => row.familyStatus !== PS_FAMILY_STATUS.OUT_OF_FAMILY), (row) => row.against.exactMemberKey);
  const expectedKeySet = new Set(expectedRows.map((row) => row.exactMemberKey));
  const coverageRows = createCoverageRows(expectedRows, actualInFamilyByKey, detailByKey, sourceFamily);
  const missingRows = coverageRows.filter((row) => row.status === PS_FAMILY_STATUS.MISSING);
  const duplicateRows = Array.from(actualInFamilyByKey.entries()).filter(([, rows]) => rows.length > 1)
    .map(([exactMemberKey, rows]) => ({ exactMemberKey, member: rows[0].against.memberName, clashCount: rows.length, clashNames: rows.map((row) => row.clashName), sourceObjects: uniqueSorted(rows.map((row) => row.source.objectName)) }));
  const outOfFamilyRows = clashRows.filter((row) => row.familyStatus === PS_FAMILY_STATUS.OUT_OF_FAMILY);
  const unexpectedInFamilyRows = clashRows.filter((row) => row.familyStatus !== PS_FAMILY_STATUS.OUT_OF_FAMILY && !expectedKeySet.has(row.against.exactMemberKey));
  const lineFamilyRows = createLineFamilyRows(clashRows);
  const sourceVsPosFamilyRows = createSourceVsPosFamilyRows(detailRows, coverageRows, clashRows, posFamilies, config);
  const psClashRows = input?.psClashRows || [];
  const psClashReportRows = buildPsClashReportRows(psClashRows, clashRows);
  const summary = {
    sourceFamily, expectedCount: expectedRows.length, clashCount: clashRows.length, psClashCount: psClashRows.length,
    foundExactCount: coverageRows.filter((row) => row.found).length, missingCount: missingRows.length,
    outOfFamilyCount: outOfFamilyRows.length, duplicateMemberCount: duplicateRows.length,
    unexpectedInFamilyCount: unexpectedInFamilyRows.length, posFamilyCount: posFamilies.length,
    psClashReportCount: psClashReportRows.length,
    coveragePct: expectedRows.length ? Number(((coverageRows.filter((row) => row.found).length / expectedRows.length) * 100).toFixed(2)) : 0,
  };
  return { schema: PS_FAMILY_CLASH_AUDIT_SCHEMA, summary, coverageRows, clashRows, psClashRows, psClashReportRows, missingRows, outOfFamilyRows, duplicateRows, unexpectedInFamilyRows, lineFamilyRows, posFamilyRows: posFamilies, sourceVsPosFamilyRows, diagnostics };
}
