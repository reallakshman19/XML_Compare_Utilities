import { normalizeConfig, normalizeReference, supportRoot, text } from './navis-tag-isonote-contracts.js';

function uniqueText(values = []) {
  return [...new Set(values.map((value) => text(value)).filter(Boolean))];
}

function coordinateGroupKey(entry, index) {
  const point = entry?.position;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
    return `UNPOSITIONED:${entry?.nodeId || index}`;
  }
  return `E=${Number(point.x)}|N=${Number(point.y)}|EL=${Number(point.z)}`;
}

function groupStagedEntriesByCoordinate(entries = []) {
  const groups = new Map();
  entries.forEach((entry, index) => {
    const key = coordinateGroupKey(entry, index);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return [...groups.entries()].map(([key, groupedEntries]) => ({ key, entries: groupedEntries }));
}

function stagedEntriesToResolutionRecord(entries, index, coordinateKey = '') {
  const groupedEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const primary = groupedEntries[0] || {};
  const identities = uniqueText(groupedEntries.map((entry) => entry?.identity));
  const identityRaws = uniqueText(groupedEntries.map((entry) => entry?.identityRaw || entry?.identity));
  const referencesRaw = uniqueText(groupedEntries.map((entry) => entry?.referenceRaw || entry?.reference));
  const references = uniqueText(groupedEntries.map((entry) => entry?.reference || normalizeReference(entry?.referenceRaw)));
  const supportRoots = uniqueText(groupedEntries.map((entry) => entry?.supportRoot || supportRoot(entry?.identity)));
  const pipes = uniqueText(groupedEntries.map((entry) => entry?.resolvedPipe || entry?.resolvedBranch));
  const identityColumns = uniqueText(groupedEntries.map((entry) => entry?.identityPath || 'STAGED_JSON_IDENTITY'));
  const referenceColumns = uniqueText(groupedEntries.map((entry) => entry?.referencePath));
  const pipeColumns = uniqueText(groupedEntries.map((entry) => entry?.resolvedPipePath || entry?.resolvedBranchPath));
  const sourceFiles = uniqueText(groupedEntries.map((entry) => entry?.sourceFile));
  const jsonPaths = uniqueText(groupedEntries.map((entry) => entry?.jsonPath));
  const nodeIds = uniqueText(groupedEntries.map((entry) => entry?.nodeId));
  const identity = identities[0] || '';
  const identityRaw = identityRaws.join('|') || identity;
  const referenceRaw = referencesRaw.join('|');
  const reference = references[0] || normalizeReference(referencesRaw[0]);
  const inputPipe = pipes[0] || '';
  const identityColumn = identityColumns.join('|') || 'STAGED_JSON_IDENTITY';
  const referenceColumn = referenceColumns.join('|');
  const pipeColumn = pipeColumns.join('|');

  return {
    rowId: `STAGED-${index + 1}`,
    rowIndex: index + 1,
    rawRow: {
      'Name of the element': identityRaw,
      'Reference of the element': referenceRaw,
      PIPE: pipes.join('|'),
      POS: primary?.positionRaw ?? '',
      'Staged JSON Source File': sourceFiles.join('|'),
      'Staged JSON Path': jsonPaths.join('|'),
      'Coordinate Group Key': coordinateKey,
      'Grouped Identity Count': groupedEntries.length,
    },
    // The first canonical identity remains the resolver anchor. All raw identities
    // sharing the coordinate are retained and displayed as a pipe-delimited value.
    identityRaw,
    identity,
    supportRoot: supportRoots[0] || supportRoot(identity),
    identityColumn,
    identityValues: groupedEntries.map((entry) => ({
      column: entry?.identityPath || 'STAGED_JSON_IDENTITY',
      value: text(entry?.identityRaw || entry?.identity),
      canonicalIdentity: text(entry?.identity),
      nodeId: entry?.nodeId || '',
      jsonPath: entry?.jsonPath || '',
    })),
    inputReferenceRaw: referenceRaw,
    inputReference: reference,
    inputReferenceColumn: referenceColumn,
    // The staged position is intentionally kept on the selected identity-trace entry.
    // Leaving the synthetic table position empty preserves correct source attribution.
    position: null,
    positionRaw: '',
    positionColumn: '',
    inputPipe,
    inputPipeColumn: pipeColumn,
    existingIsometricNotes: '',
    sourceKind: 'STAGED_JSON',
    stagedNodeId: primary?.nodeId || '',
    stagedSourceFile: primary?.sourceFile || '',
    stagedJsonPath: primary?.jsonPath || '',
    coordinateGroupKey: coordinateKey,
    groupedIdentityCount: groupedEntries.length,
    groupedIdentityRaws: identityRaws,
    groupedCanonicalIdentities: identities,
    groupedSupportRoots: supportRoots,
    groupedReferencesRaw: referencesRaw,
    groupedNodeIds: nodeIds,
    groupedJsonPaths: jsonPaths,
    stagedEntries: groupedEntries,
  };
}

function stagedEntryToResolutionRecord(entry, index) {
  return stagedEntriesToResolutionRecord([entry], index, coordinateGroupKey(entry, index));
}

export function buildResolutionSupportRecords(tableBuild, stagedIndex, inputConfig = {}) {
  const config = normalizeConfig({ ...(tableBuild?.config || {}), ...(stagedIndex?.config || {}), ...inputConfig });
  const tableRecords = tableBuild?.records || [];

  if (tableRecords.length || config.supportCoordinateSource === 'table-only') {
    return {
      ...(tableBuild || {}),
      config,
      sourceKind: 'SUPPORT_TABLE',
      summary: {
        ...(tableBuild?.summary || {}),
        resolutionRowCount: tableRecords.length,
        resolutionSource: 'SUPPORT_TABLE',
      },
    };
  }

  const eligibleEntries = (stagedIndex?.entries || []).filter((entry) => text(entry?.identity));
  const coordinateGroups = groupStagedEntriesByCoordinate(eligibleEntries);
  const records = coordinateGroups.map((group, index) => stagedEntriesToResolutionRecord(group.entries, index, group.key));
  const diagnostics = [...(tableBuild?.diagnostics || [])];
  const groupedIdentityCount = Math.max(0, eligibleEntries.length - records.length);

  if (records.length) {
    diagnostics.push({
      severity: 'INFO',
      code: 'STAGED_JSON_RESOLUTION_ROWS_SYNTHESIZED',
      message: `${records.length} coordinate-grouped resolution rows were created from ${eligibleEntries.length} refined staged JSON identities because no support table was provided.`,
      context: {
        resolutionRowCount: records.length,
        stagedIdentityEntryCount: eligibleEntries.length,
        groupedIdentityCount,
      },
    });
  }
  if (groupedIdentityCount) {
    diagnostics.push({
      severity: 'INFO',
      code: 'STAGED_IDENTITIES_GROUPED_BY_COORDINATE',
      message: `${groupedIdentityCount} additional staged identities share coordinates with another identity and were concatenated into coordinate groups using "|".`,
      context: {
        coordinateGroupCount: records.length,
        stagedIdentityEntryCount: eligibleEntries.length,
        groupedIdentityCount,
      },
    });
  }

  return {
    config,
    headers: [
      'Name of the element',
      'Reference of the element',
      'PIPE',
      'POS',
      'Staged JSON Source File',
      'Staged JSON Path',
      'Coordinate Group Key',
      'Grouped Identity Count',
    ],
    records,
    diagnostics,
    sourceKind: 'STAGED_JSON',
    summary: {
      rowCount: records.length,
      resolutionRowCount: records.length,
      resolutionSource: 'STAGED_JSON',
      identityCount: eligibleEntries.length,
      coordinateGroupCount: records.length,
      groupedIdentityCount,
      referenceCount: records.filter((row) => row.inputReference).length,
      positionedRowCount: eligibleEntries.filter((entry) => entry.position).length,
      pipeCount: records.filter((row) => row.inputPipe).length,
      tableRowCount: tableRecords.length,
    },
  };
}

export const _test = Object.freeze({ coordinateGroupKey, groupStagedEntriesByCoordinate, stagedEntryToResolutionRecord, stagedEntriesToResolutionRecord });
