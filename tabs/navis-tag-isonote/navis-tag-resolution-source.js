import { normalizeConfig, normalizeReference, supportRoot, text } from './navis-tag-isonote-contracts.js';

function stagedEntryToResolutionRecord(entry, index) {
  const identity = text(entry?.identity);
  const identityRaw = text(entry?.identityRaw || identity);
  const referenceRaw = text(entry?.referenceRaw || entry?.reference);
  const reference = text(entry?.reference) || normalizeReference(referenceRaw);
  const inputPipe = text(entry?.resolvedPipe || entry?.resolvedBranch);
  const identityColumn = entry?.identityPath || 'STAGED_JSON_IDENTITY';
  const referenceColumn = entry?.referencePath || '';
  const pipeColumn = entry?.resolvedPipePath || entry?.resolvedBranchPath || '';

  return {
    rowId: `STAGED-${index + 1}`,
    rowIndex: index + 1,
    rawRow: {
      'Name of the element': identityRaw,
      'Reference of the element': referenceRaw,
      PIPE: inputPipe,
      POS: entry?.positionRaw ?? '',
      'Staged JSON Source File': entry?.sourceFile || '',
      'Staged JSON Path': entry?.jsonPath || '',
    },
    identityRaw,
    identity,
    supportRoot: entry?.supportRoot || supportRoot(identity),
    identityColumn,
    identityValues: identity ? [{ column: identityColumn, value: identityRaw || identity }] : [],
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
    stagedNodeId: entry?.nodeId || '',
    stagedSourceFile: entry?.sourceFile || '',
    stagedJsonPath: entry?.jsonPath || '',
  };
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

  const records = (stagedIndex?.entries || [])
    .filter((entry) => text(entry?.identity))
    .map(stagedEntryToResolutionRecord);
  const diagnostics = [...(tableBuild?.diagnostics || [])];

  if (records.length) {
    diagnostics.push({
      severity: 'INFO',
      code: 'STAGED_JSON_RESOLUTION_ROWS_SYNTHESIZED',
      message: `${records.length} resolution rows were created from the refined staged JSON support index because no support table was provided.`,
      context: { resolutionRowCount: records.length },
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
    ],
    records,
    diagnostics,
    sourceKind: 'STAGED_JSON',
    summary: {
      rowCount: records.length,
      resolutionRowCount: records.length,
      resolutionSource: 'STAGED_JSON',
      identityCount: records.filter((row) => row.identity).length,
      referenceCount: records.filter((row) => row.inputReference).length,
      positionedRowCount: (stagedIndex?.entries || []).filter((entry) => entry.position).length,
      pipeCount: records.filter((row) => row.inputPipe).length,
      tableRowCount: tableRecords.length,
    },
  };
}

export const _test = Object.freeze({ stagedEntryToResolutionRecord });
