import { NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, normalizeConfig } from './navis-tag-isonote-contracts.js';
import { applyAppliesToPropagation } from './navis-tag-applies-to.js';
import {
  NAVIS_CANDIDATE_SCORE_MODEL,
  axisFailures,
  candidateFromTag,
  candidateScore,
  decision,
  evaluateCandidates,
  unresolvedDecision,
  verticalResidual,
} from './navis-tag-candidate-ranking.js';
import {
  appendCandidateLedger,
  appendNearestRejected,
  buildAugmentedRow,
  buildDecisionRow,
  createLedgerBase,
} from './navis-tag-candidate-evidence.js';
import { applyAnchorTransformation } from './navis-tag-xml-parser.js';

export { NAVIS_CANDIDATE_SCORE_MODEL } from './navis-tag-candidate-ranking.js';

function chooseSupportPosition(trace, config) {
  const tablePoint = trace.tableRecord?.position || null;
  const jsonPoint = trace.position || null;
  const mode = config.supportCoordinateSource;
  const comparison = tablePoint && jsonPoint ? Math.hypot(tablePoint.x - jsonPoint.x, tablePoint.y - jsonPoint.y, tablePoint.z - jsonPoint.z) : null;
  if (mode === 'table-only') return { point: tablePoint, source: tablePoint ? 'TABLE' : 'NONE', comparison, sourcePath: trace.tableRecord?.positionColumn || '' };
  if (mode === 'json-only') return { point: jsonPoint, source: jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: trace.positionSourcePath || '' };
  if (mode === 'prefer-json-fallback-table') return { point: jsonPoint || tablePoint, source: jsonPoint ? 'STAGED_JSON' : tablePoint ? 'TABLE' : 'NONE', comparison, sourcePath: jsonPoint ? trace.positionSourcePath || '' : trace.tableRecord?.positionColumn || '' };
  if (mode === 'compare-table-json') return { point: tablePoint || jsonPoint, source: tablePoint && jsonPoint ? 'TABLE_AND_STAGED_JSON' : tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: tablePoint ? trace.tableRecord?.positionColumn || '' : trace.positionSourcePath || '' };
  return { point: tablePoint || jsonPoint, source: tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: tablePoint ? trace.tableRecord?.positionColumn || '' : trace.positionSourcePath || '' };
}

function effectiveConfig(tableBuild, identityTrace, navisParse, inputConfig) {
  let config = normalizeConfig({ ...(tableBuild?.config || {}), ...(identityTrace?.config || {}), ...inputConfig });
  const configuredSupportCoordinateSource = config.supportCoordinateSource;
  if (navisParse && identityTrace) {
    applyAnchorTransformation(navisParse, identityTrace, config);
    if (navisParse.anchor?.active) config = {
      ...config,
      navisEastingDatumMm: navisParse.anchor.deltaEMm,
      navisNorthingDatumMm: navisParse.anchor.deltaNMm,
      navisElevationDatumMm: navisParse.anchor.deltaElMm,
      supportCoordinateSource: 'prefer-json-fallback-table',
    };
  }
  return { config, configuredSupportCoordinateSource };
}

function appendCoordinateSourceDiagnostic(diagnostics, navisParse, configuredSource, appliedSource) {
  if (!navisParse?.anchor?.active || configuredSource === appliedSource) return;
  diagnostics.push({
    severity: 'INFO',
    code: 'ANCHOR_JSON_COORDINATE_SOURCE_OVERRIDE',
    anchorTagId: navisParse.anchor.tagId,
    anchorSupportIdentity: navisParse.anchor.supportIdentity,
    configuredSupportCoordinateSource: configuredSource,
    appliedSupportCoordinateSource: appliedSource,
    message: `Anchor mode changed the Stage 3 support coordinate source from ${configuredSource} to ${appliedSource} so matching uses the staged JSON frame that defined the anchor.`,
  });
}

function positionChoiceFor(record, trace, config) {
  if (trace) return chooseSupportPosition(trace, config);
  return {
    point: record.position,
    source: record.position ? 'TABLE' : 'NONE',
    comparison: null,
    sourcePath: record.positionColumn || '',
  };
}

function appendCoordinateDisagreement(diagnostics, record, positionChoice, config) {
  if (!Number.isFinite(positionChoice.comparison) || positionChoice.comparison <= config.coordinateDisagreementToleranceMm) return;
  diagnostics.push({
    severity: 'WARN',
    code: 'TABLE_JSON_COORDINATE_DISAGREEMENT',
    rowId: record.rowId,
    identity: record.identity,
    distanceMm: positionChoice.comparison,
    message: `Table and staged coordinates differ by ${positionChoice.comparison.toFixed(3)} mm.`,
  });
}

function resolveRecord(record, trace, navisParse, config, candidateLedger, diagnostics) {
  const positionChoice = positionChoiceFor(record, trace, config);
  appendCoordinateDisagreement(diagnostics, record, positionChoice, config);
  const evaluation = positionChoice.point
    ? evaluateCandidates(trace || {}, positionChoice.point, navisParse?.tags || [], config)
    : { candidates: [], nearestRejected: null };
  const result = positionChoice.point ? decision(evaluation.candidates, config, evaluation.nearestRejected) : {
    ...unresolvedDecision(null, config),
    ambiguity: trace?.status || 'SUPPORT_POSITION_UNAVAILABLE',
    decisionReason: 'SUPPORT_POSITION_UNAVAILABLE',
    confidenceReasons: ['SUPPORT_POSITION_UNAVAILABLE'],
  };
  const base = createLedgerBase(record, trace, positionChoice);
  appendCandidateLedger(candidateLedger, base, evaluation.candidates, result);
  appendNearestRejected(candidateLedger, diagnostics, base, result, config);
  const decisionRow = buildDecisionRow(record, trace, positionChoice, evaluation.candidates, result, config);
  return { decisionRow, augmentedRow: buildAugmentedRow(record, decisionRow, result, evaluation.candidates) };
}

function auditSummary(tableBuild, identityTrace, navisParse, decisions, candidateLedger) {
  return {
    tableRowCount: tableBuild?.records?.length || 0,
    identityResolvedCount: identityTrace?.summary?.resolvedCount || 0,
    navisTagCount: navisParse?.summary?.tagCount || 0,
    resolvedCount: decisions.filter((row) => row.status === 'RESOLVED').length,
    ambiguousCount: decisions.filter((row) => row.status === 'AMBIGUOUS').length,
    unresolvedCount: decisions.filter((row) => row.status === 'UNRESOLVED').length,
    nearestRejectedCount: decisions.filter((row) => row.nearestRejectedTagId).length,
    candidateLedgerCount: candidateLedger.length,
    scoringModel: NAVIS_CANDIDATE_SCORE_MODEL,
  };
}

export function resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, inputConfig = {}) {
  const resolvedConfig = effectiveConfig(tableBuild, identityTrace, navisParse, inputConfig);
  const config = resolvedConfig.config;
  const traceByRow = new Map((identityTrace?.rows || []).map((row) => [row.tableRowId, row]));
  const candidateLedger = [];
  const decisions = [];
  const augmentedRows = [];
  const diagnostics = [...(tableBuild?.diagnostics || []), ...(identityTrace?.diagnostics || []), ...(navisParse?.diagnostics || [])];
  appendCoordinateSourceDiagnostic(diagnostics, navisParse, resolvedConfig.configuredSupportCoordinateSource, config.supportCoordinateSource);
  for (const record of tableBuild?.records || []) {
    const resolved = resolveRecord(record, traceByRow.get(record.rowId), navisParse, config, candidateLedger, diagnostics);
    decisions.push(resolved.decisionRow);
    augmentedRows.push(resolved.augmentedRow);
  }
  const matchedRows = decisions.filter((row) => row.status === 'RESOLVED');
  const ambiguousRows = decisions.filter((row) => row.status === 'AMBIGUOUS');
  const rejectedRows = decisions.filter((row) => row.status === 'UNRESOLVED');
  const directAudit = {
    schema: NAVIS_TAG_ISONOTE_AUDIT_SCHEMA,
    config,
    summary: auditSummary(tableBuild, identityTrace, navisParse, decisions, candidateLedger),
    augmentedRows,
    decisions,
    matchedRows,
    ambiguousRows,
    rejectedRows,
    candidateLedger,
    diagnostics,
  };
  return applyAppliesToPropagation(directAudit, inputConfig);
}

export const _test = Object.freeze({
  axisFailures,
  candidateFromTag,
  candidateScore,
  chooseSupportPosition,
  decision,
  evaluateCandidates,
  verticalResidual,
});
