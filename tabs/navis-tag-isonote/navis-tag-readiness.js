import { NAVIS_TAG_READINESS_SCHEMA, normalizeConfig } from './navis-tag-isonote-contracts.js';

function record(severity, code, message, context = {}) {
  return { severity, code, message, context };
}

function requiresJson(config, tableRecords) {
  if (config.supportCoordinateSource === 'json-only' || config.supportCoordinateSource === 'prefer-json-fallback-table') return true;
  if (config.supportCoordinateSource === 'table-only') return false;
  return (tableRecords || []).some((row) => !row.position);
}

function tablePositionMappingStatus(config, headers = []) {
  if (config.tablePositionMode === 'separate') {
    const columns = [config.tableEastingColumn, config.tableNorthingColumn, config.tableElevationColumn];
    const missingConfigured = columns.some((column) => !column);
    const missingHeaders = columns.filter(Boolean).filter((column) => !headers.includes(column));
    return {
      valid: !missingConfigured && !missingHeaders.length,
      code: missingConfigured ? 'TABLE_SEPARATE_POSITION_COLUMNS_INCOMPLETE' : missingHeaders.length ? 'TABLE_SEPARATE_POSITION_COLUMNS_NOT_FOUND' : '',
      message: missingConfigured
        ? 'Separate table coordinate mode requires configured Easting, Northing and Elevation columns.'
        : missingHeaders.length
          ? `Configured separate table coordinate columns are not present: ${missingHeaders.join(', ')}.`
          : '',
    };
  }
  const valid = Boolean(config.tablePositionColumn && headers.includes(config.tablePositionColumn));
  return {
    valid,
    code: valid ? '' : 'TABLE_SINGLE_POSITION_COLUMN_NOT_FOUND',
    message: valid ? '' : `Configured table position column "${config.tablePositionColumn || '(blank)'}" is not present.`,
  };
}

export function buildNavisTagIsonoteReadiness(input = {}) {
  const config = normalizeConfig(input.config || {});
  const tableBuild = input.tableBuild || null;
  const tableImport = input.tableImport || null;
  const tree = input.tree || null;
  const stagedIndex = input.stagedIndex || null;
  const identityTrace = input.identityTrace || null;
  const navisParse = input.navisParse || null;

  const records = tableBuild?.records || [];
  const headers = tableBuild?.headers || [];
  const blockers = [];
  const warnings = [];

  if (!records.length) {
    if (tableImport?.kind === 'workbook') {
      const selected = tableImport.selectedSheetName || '(none)';
      blockers.push(record('ERROR', 'WORKBOOK_SUPPORT_TABLE_ROWS_MISSING', `Workbook was loaded, but selected worksheet "${selected}" produced no support-table data rows. Review the selected worksheet, header row and table identity columns.`, {
        selectedSheetName: tableImport.selectedSheetName || '',
        headerRowNumber: tableImport.headerRowNumber || 0,
        candidateDataRowCount: tableImport.candidateDataRowCount || 0,
        selectionMode: tableImport.selectionMode || '',
      }));
    } else {
      blockers.push(record('ERROR', 'TABLE_ROWS_MISSING', 'No support-table rows are available.'));
    }
  }
  const identityRows = records.filter((row) => row.identity);
  if (records.length && !identityRows.length) blockers.push(record('ERROR', 'TABLE_IDENTITY_MAPPING_INVALID', `Configured table identity columns produce no support identities. Available headers: ${headers.join(', ') || '(none)'}.`, {
    configuredIdentityColumns: config.tableIdentityColumns,
    availableHeaders: headers,
    selectedSheetName: tableImport?.selectedSheetName || '',
  }));
  else if (identityRows.length < records.length) warnings.push(record('WARN', 'TABLE_IDENTITIES_PARTIAL', `${records.length - identityRows.length} table rows have no configured identity.`));

  const tablePositionMapping = tablePositionMappingStatus(config, headers);
  const tableModeRequired = config.supportCoordinateSource === 'table-only';
  if (!tablePositionMapping.valid) {
    const item = record(tableModeRequired ? 'ERROR' : 'WARN', tablePositionMapping.code, tablePositionMapping.message);
    (tableModeRequired ? blockers : warnings).push(item);
  }

  const jsonRequired = requiresJson(config, records);
  if (jsonRequired && !tree?.summary?.nodeCount) blockers.push(record('ERROR', 'STAGED_JSON_REQUIRED', 'The selected coordinate mode requires staged JSON hierarchy evidence.'));
  if (tree?.summary?.nodeCount && !stagedIndex?.entries?.length) blockers.push(record('ERROR', 'STAGED_IDENTITY_INDEX_EMPTY', 'The staged hierarchy was parsed, but configured JSON identity paths produced no support index entries.'));
  if (stagedIndex?.entries?.length && !stagedIndex.entries.some((entry) => entry.position)) {
    const item = record(jsonRequired ? 'ERROR' : 'WARN', 'STAGED_POSITION_INDEX_EMPTY', 'Configured JSON proximity paths produced no staged support coordinates.');
    (jsonRequired ? blockers : warnings).push(item);
  }

  if (tree?.summary?.nodeCount && !tree.summary.branchResolvedNodeCount) warnings.push(record('WARN', 'STAGED_BRANCH_ANCESTOR_UNRESOLVED', 'No staged hierarchy node has a resolved branch ancestor.'));
  if (tree?.summary?.nodeCount && !tree.summary.pipeResolvedNodeCount) warnings.push(record('WARN', 'STAGED_PIPE_ANCESTOR_UNRESOLVED', 'No staged hierarchy node has a resolved pipe ancestor.'));
  if (tree?.summary?.nodeCount && !tree.summary.zoneResolvedNodeCount) warnings.push(record('WARN', 'STAGED_ZONE_ANCESTOR_UNRESOLVED', 'No staged hierarchy node has a resolved zone ancestor.'));

  if (config.boreToOdLookupEnabled && !Object.keys(config.boreToOdLookup || {}).length) {
    blockers.push(record('ERROR', 'BORE_TO_OD_LOOKUP_ENABLED_WITHOUT_DATA', 'Explicit bore-to-OD lookup is enabled, but no lookup entries are configured.'));
  }

  const validTags = navisParse?.tags?.filter((tag) => tag.position && tag.commentBody) || [];
  if (!validTags.length) blockers.push(record('ERROR', 'NAVIS_VALID_TAGS_MISSING', 'No Navis tag has both a comment body and usable 3D position.'));

  if (config.supportCoordinateSource === 'table-only' && records.length && !records.some((row) => row.position)) {
    blockers.push(record('ERROR', 'TABLE_POSITION_MAPPING_INVALID', 'Table-only mode is selected, but no table row has a parsed position.'));
  }

  if (identityTrace?.rows?.length) {
    const positionReady = identityTrace.rows.filter((row) => row.position || row.tableRecord?.position).length;
    if (!positionReady && config.supportCoordinateSource !== 'table-only') {
      blockers.push(record('ERROR', 'IDENTITY_POSITION_UNRESOLVED', 'Identity trace contains no row with a usable table or staged coordinate.'));
    }
    if (identityTrace.summary?.ambiguousCount) warnings.push(record('WARN', 'IDENTITY_AMBIGUITIES_PRESENT', `${identityTrace.summary.ambiguousCount} identities require review.`));
  }

  const status = blockers.length ? 'BLOCKED' : warnings.length ? 'READY_WITH_WARNINGS' : 'READY';
  return {
    schema: NAVIS_TAG_READINESS_SCHEMA,
    status,
    canBuild: Boolean(records.length || input.hasSourceText),
    canResolve: blockers.length === 0,
    blockers,
    warnings,
    summary: {
      tableRowCount: records.length,
      tableIdentityCount: identityRows.length,
      tableSourceKind: tableImport?.kind || '',
      workbookSheetCount: tableImport?.sheetCount || 0,
      selectedSheetName: tableImport?.selectedSheetName || '',
      selectedSheetHeaderRow: tableImport?.headerRowNumber || 0,
      selectedSheetCandidateDataRows: tableImport?.candidateDataRowCount || 0,
      workbookSelectionMode: tableImport?.selectionMode || '',
      tablePositionMode: config.tablePositionMode,
      tablePositionMappingValid: tablePositionMapping.valid,
      stagedJsonRequired: jsonRequired,
      hierarchyNodeCount: tree?.summary?.nodeCount || 0,
      stagedIndexCount: stagedIndex?.entries?.length || 0,
      branchResolvedNodeCount: tree?.summary?.branchResolvedNodeCount || 0,
      pipeResolvedNodeCount: tree?.summary?.pipeResolvedNodeCount || 0,
      zoneResolvedNodeCount: tree?.summary?.zoneResolvedNodeCount || 0,
      identityResolvedCount: identityTrace?.summary?.resolvedCount || 0,
      identityAmbiguousCount: identityTrace?.summary?.ambiguousCount || 0,
      navisTagCount: navisParse?.summary?.tagCount || 0,
      validNavisTagCount: validTags.length,
      boreToOdLookupEnabled: config.boreToOdLookupEnabled,
      boreToOdLookupEntryCount: Object.keys(config.boreToOdLookup || {}).length,
    },
  };
}