const DEFAULT_DIRECTIVE_REGEX = '^(.*?)\\s*\\(\\s*applies\\s+to\\s+([\\s\\S]+?)\\s*\\)\\s*\\.?\\s*$';
const DEFAULT_LINE_KEY_REGEX = '(?:^|[-/])([A-Z]\\d{7})(?=-|/|$)';
const DEFAULT_TARGET_SEPARATOR_REGEX = '\\s*[,;\\n]\\s*';

export const DEFAULT_APPLIES_TO_CONFIG = Object.freeze({
  appliesToEnabled: true,
  appliesToDirectiveRegex: DEFAULT_DIRECTIVE_REGEX,
  appliesToTargetSeparatorRegex: DEFAULT_TARGET_SEPARATOR_REGEX,
  appliesToLineKeyRegex: DEFAULT_LINE_KEY_REGEX,
  appliesToLineKeyCaptureGroup: 1,
  appliesToParallelOffsetToleranceMm: 500,
  appliesToAlongAxisToleranceMm: 100,
  appliesToElevationToleranceMm: 700,
  appliesToAxisDominanceRatio: 1.25,
  appliesToMinimumAxisSpanMm: 1,
  appliesToDerivedNoteTemplate: '{note} (Based on Tag {tagId})',
});

function text(value) { return String(value ?? '').trim(); }
function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
function integer(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}
function bool(value, fallback) {
  if (value === false || value === 'false') return false;
  if (value === true || value === 'true') return true;
  return fallback;
}
function compileRegex(source, fallback, flags = 'i') {
  try { return { regex: new RegExp(text(source) || fallback, flags), error: '' }; }
  catch (error) { return { regex: new RegExp(fallback, flags), error: error?.message || String(error) }; }
}
function finitePoint(point) {
  return [point?.x, point?.y, point?.z].every((value) => Number.isFinite(Number(value)));
}
function normalizePipeName(value) {
  return text(value).replace(/^\/+|\/+$/g, '').replace(/\s+/g, '').toUpperCase();
}
function unique(values) {
  return [...new Set((values || []).map(text).filter(Boolean))];
}

export function normalizeAppliesToConfig(input = {}) {
  const defaults = DEFAULT_APPLIES_TO_CONFIG;
  return {
    appliesToEnabled: bool(input.appliesToEnabled, defaults.appliesToEnabled),
    appliesToDirectiveRegex: text(input.appliesToDirectiveRegex) || defaults.appliesToDirectiveRegex,
    appliesToTargetSeparatorRegex: text(input.appliesToTargetSeparatorRegex) || defaults.appliesToTargetSeparatorRegex,
    appliesToLineKeyRegex: text(input.appliesToLineKeyRegex) || defaults.appliesToLineKeyRegex,
    appliesToLineKeyCaptureGroup: integer(input.appliesToLineKeyCaptureGroup, defaults.appliesToLineKeyCaptureGroup),
    appliesToParallelOffsetToleranceMm: nonNegative(input.appliesToParallelOffsetToleranceMm, defaults.appliesToParallelOffsetToleranceMm),
    appliesToAlongAxisToleranceMm: nonNegative(input.appliesToAlongAxisToleranceMm, defaults.appliesToAlongAxisToleranceMm),
    appliesToElevationToleranceMm: nonNegative(input.appliesToElevationToleranceMm, defaults.appliesToElevationToleranceMm),
    appliesToAxisDominanceRatio: positive(input.appliesToAxisDominanceRatio, defaults.appliesToAxisDominanceRatio),
    appliesToMinimumAxisSpanMm: nonNegative(input.appliesToMinimumAxisSpanMm, defaults.appliesToMinimumAxisSpanMm),
    appliesToDerivedNoteTemplate: text(input.appliesToDerivedNoteTemplate) || defaults.appliesToDerivedNoteTemplate,
  };
}

export function parseAppliesToDirective(commentBody, inputConfig = {}) {
  const config = normalizeAppliesToConfig(inputConfig);
  const directive = compileRegex(config.appliesToDirectiveRegex, DEFAULT_DIRECTIVE_REGEX, 'i');
  const separator = compileRegex(config.appliesToTargetSeparatorRegex, DEFAULT_TARGET_SEPARATOR_REGEX, 'i');
  const source = text(commentBody);
  const match = source.match(directive.regex);
  if (!match) return { matched: false, note: source, targets: [], rawTargetText: '', regexError: directive.error || separator.error };
  const note = text(match[1]) || source;
  const rawTargetText = text(match[2]);
  const targets = unique(rawTargetText.split(separator.regex).map((value) => text(value).replace(/\s*\.\s*$/, '')));
  return { matched: Boolean(targets.length), note, targets, rawTargetText, regexError: directive.error || separator.error };
}

export function extractLineKey(pipeName, inputConfig = {}) {
  const config = normalizeAppliesToConfig(inputConfig);
  const compiled = compileRegex(config.appliesToLineKeyRegex, DEFAULT_LINE_KEY_REGEX, 'i');
  const match = text(pipeName).match(compiled.regex);
  return {
    key: text(match?.[config.appliesToLineKeyCaptureGroup] ?? match?.[0]).toUpperCase(),
    regexError: compiled.error,
  };
}

function axisFromDelta(deltaE, deltaN, config, basis) {
  const e = Math.abs(Number(deltaE) || 0);
  const n = Math.abs(Number(deltaN) || 0);
  const span = Math.max(e, n);
  if (span < config.appliesToMinimumAxisSpanMm) return { axis: 'UNKNOWN', spanE: e, spanN: n, basis };
  if (e >= n * config.appliesToAxisDominanceRatio) return { axis: 'E-W', spanE: e, spanN: n, basis };
  if (n >= e * config.appliesToAxisDominanceRatio) return { axis: 'N-S', spanE: e, spanN: n, basis };
  return { axis: 'AMBIGUOUS', spanE: e, spanN: n, basis };
}

export function inferPipeAxis(rows = [], anchorPoint = null, inputConfig = {}) {
  const config = normalizeAppliesToConfig(inputConfig);
  const points = [];
  const seen = new Set();
  for (const row of rows || []) {
    const point = row?.supportPosition || row?.position || row;
    if (!finitePoint(point)) continue;
    const key = [point.x, point.y, point.z].map((value) => Number(value).toFixed(3)).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ x: Number(point.x), y: Number(point.y), z: Number(point.z) });
  }
  if (points.length < 2) return { axis: 'UNKNOWN', spanE: 0, spanN: 0, pointCount: points.length, basis: 'INSUFFICIENT_SUPPORT_POINTS' };
  if (finitePoint(anchorPoint)) {
    const ranked = [...points].sort((a, b) => Math.hypot(a.x - anchorPoint.x, a.y - anchorPoint.y) - Math.hypot(b.x - anchorPoint.x, b.y - anchorPoint.y));
    const first = ranked[0];
    const second = ranked.find((point) => point.x !== first.x || point.y !== first.y);
    if (second) return { ...axisFromDelta(second.x - first.x, second.y - first.y, config, 'LOCAL_NEAREST_SUPPORT_VECTOR'), pointCount: points.length };
  }
  const eastings = points.map((point) => point.x);
  const northings = points.map((point) => point.y);
  return {
    ...axisFromDelta(Math.max(...eastings) - Math.min(...eastings), Math.max(...northings) - Math.min(...northings), config, 'PIPE_SUPPORT_EXTENT'),
    pointCount: points.length,
  };
}

function pipeGroups(decisions) {
  const groups = new Map();
  for (const decision of decisions || []) {
    if (!finitePoint(decision?.supportPosition) || !text(decision?.resolvedPipe)) continue;
    const key = normalizePipeName(decision.resolvedPipe);
    if (!groups.has(key)) groups.set(key, { key, pipeName: decision.resolvedPipe, decisions: [] });
    groups.get(key).decisions.push(decision);
  }
  return [...groups.values()];
}

function resolveTargetGroups(requestedPipe, groups, config) {
  const normalized = normalizePipeName(requestedPipe);
  const exact = groups.filter((group) => group.key === normalized);
  if (exact.length) return { groups: exact, basis: 'FULL_PIPE_NAME_EXACT', requestedLineKey: '', regexError: '' };
  const requested = extractLineKey(requestedPipe, config);
  if (!requested.key) return { groups: [], basis: 'LINE_KEY_UNAVAILABLE', requestedLineKey: '', regexError: requested.regexError };
  const fallback = groups.filter((group) => extractLineKey(group.pipeName, config).key === requested.key);
  return { groups: fallback, basis: fallback.length ? 'LINE_KEY_FALLBACK' : 'LINE_KEY_NOT_FOUND', requestedLineKey: requested.key, regexError: requested.regexError };
}

function derivedNote(note, tagId, template) {
  return text(template)
    .replaceAll('{note}', text(note))
    .replaceAll('{tagId}', text(tagId))
    .replaceAll('{tag}', text(tagId));
}

function coordinateWindow(axis, source, target, config) {
  const deltaE = Number(target.x) - Number(source.x);
  const deltaN = Number(target.y) - Number(source.y);
  const deltaEl = Number(target.z) - Number(source.z);
  const alongAxisDeltaMm = axis === 'N-S' ? Math.abs(deltaN) : Math.abs(deltaE);
  const parallelOffsetMm = axis === 'N-S' ? Math.abs(deltaE) : Math.abs(deltaN);
  const elevationDeltaMm = Math.abs(deltaEl);
  const rejectionReasons = [];
  if (alongAxisDeltaMm > config.appliesToAlongAxisToleranceMm) rejectionReasons.push('ALONG_AXIS_OUTSIDE_TOLERANCE');
  if (parallelOffsetMm > config.appliesToParallelOffsetToleranceMm) rejectionReasons.push('PARALLEL_OFFSET_OUTSIDE_TOLERANCE');
  if (elevationDeltaMm > config.appliesToElevationToleranceMm) rejectionReasons.push('ELEVATION_OUTSIDE_TOLERANCE');
  return { deltaE, deltaN, deltaEl, alongAxisDeltaMm, parallelOffsetMm, elevationDeltaMm, rejectionReasons };
}

function addDiagnostic(diagnostics, severity, code, message, context = {}) {
  diagnostics.push({ severity, code, message, ...context });
}

export function applyAppliesToPropagation(inputAudit, inputConfig = {}) {
  const audit = inputAudit || {};
  const config = normalizeAppliesToConfig({ ...(audit.config || {}), ...inputConfig });
  const decisions = (audit.decisions || []).map((decision) => ({
    ...decision,
    directSupportIsonote: decision.supportIsonote || '',
    propagatedIsonotes: [],
    propagatedFromTagIds: [],
    appliesToDirective: null,
    isonoteSource: decision.supportIsonote ? 'DIRECT' : 'NONE',
  }));
  const decisionById = new Map(decisions.map((decision) => [decision.tableRowId, decision]));
  const groups = pipeGroups(decisions);
  const propagationLedger = [];
  const diagnostics = [];
  const sourceDirectives = [];

  if (config.appliesToEnabled) {
    for (const sourceDecision of decisions) {
      if (sourceDecision.status !== 'RESOLVED' || !sourceDecision.selectedCandidate?.commentBody) continue;
      const directive = parseAppliesToDirective(sourceDecision.selectedCandidate.commentBody, config);
      if (directive.regexError) addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_REGEX_INVALID_FALLBACK_USED', directive.regexError, { tableRowId: sourceDecision.tableRowId, tagId: sourceDecision.selectedTagId });
      if (!directive.matched) continue;
      sourceDecision.appliesToDirective = directive;
      sourceDecision.directSupportIsonote = directive.note;
      sourceDecision.supportIsonote = directive.note;
      sourceDecision.isonoteSource = 'DIRECT';
      sourceDirectives.push({ sourceDecision, directive });
    }

    for (const { sourceDecision, directive } of sourceDirectives) {
      const sourcePoint = sourceDecision.selectedNavisPosition || sourceDecision.selectedCandidate?.tagPosition || sourceDecision.supportPosition;
      const sourceGroup = groups.find((group) => group.key === normalizePipeName(sourceDecision.resolvedPipe));
      const sourceAxis = inferPipeAxis(sourceGroup?.decisions || [], sourcePoint, config);
      if (!['N-S', 'E-W'].includes(sourceAxis.axis)) {
        addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_SOURCE_PIPE_AXIS_UNPROVEN', `Tag ${sourceDecision.selectedTagId || '(unknown)'} could not prove the axis of ${sourceDecision.resolvedPipe || '(unknown pipe)'}.`, { tableRowId: sourceDecision.tableRowId, tagId: sourceDecision.selectedTagId, sourcePipe: sourceDecision.resolvedPipe, sourceAxis });
      }
      for (const requestedPipe of directive.targets) {
        const resolved = resolveTargetGroups(requestedPipe, groups, config);
        if (resolved.regexError) addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_LINE_KEY_REGEX_INVALID_FALLBACK_USED', resolved.regexError, { requestedPipe });
        if (!resolved.groups.length) {
          propagationLedger.push({
            sourceTableRowId: sourceDecision.tableRowId, sourceTagId: sourceDecision.selectedTagId, sourcePipe: sourceDecision.resolvedPipe,
            sourceAxis: sourceAxis.axis, requestedTargetPipe: requestedPipe, requestedLineKey: resolved.requestedLineKey,
            pipeMatchBasis: resolved.basis, outcome: 'TARGET_PIPE_NOT_FOUND', applied: false, rejectionReasons: ['TARGET_PIPE_NOT_FOUND'],
          });
          addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_TARGET_PIPE_NOT_FOUND', `No staged pipe matched ${requestedPipe}; exact full-name matching and line-key fallback were both exhausted.`, { tableRowId: sourceDecision.tableRowId, tagId: sourceDecision.selectedTagId, requestedPipe, requestedLineKey: resolved.requestedLineKey });
          continue;
        }
        if (resolved.basis === 'LINE_KEY_FALLBACK' && resolved.groups.length > 1) {
          addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_LINE_KEY_MATCHED_MULTIPLE_PIPES', `Line key ${resolved.requestedLineKey} matched ${resolved.groups.length} staged pipe names.`, { requestedPipe, matchedPipes: resolved.groups.map((group) => group.pipeName) });
        }
        let appliedForRequestedPipe = 0;
        for (const targetGroup of resolved.groups) {
          const targetAxis = inferPipeAxis(targetGroup.decisions, sourcePoint, config);
          const axesParallel = ['N-S', 'E-W'].includes(sourceAxis.axis) && targetAxis.axis === sourceAxis.axis;
          for (const targetDecision of targetGroup.decisions) {
            const window = coordinateWindow(sourceAxis.axis === 'N-S' ? 'N-S' : 'E-W', sourcePoint, targetDecision.supportPosition, config);
            const rejectionReasons = [...window.rejectionReasons];
            if (!axesParallel) rejectionReasons.unshift('TARGET_PIPE_NOT_PARALLEL');
            if (targetDecision.tableRowId === sourceDecision.tableRowId) rejectionReasons.push('SOURCE_ROW_EXCLUDED');
            const applied = rejectionReasons.length === 0;
            const note = derivedNote(directive.note, sourceDecision.selectedTagId, config.appliesToDerivedNoteTemplate);
            const ledgerRow = {
              sourceTableRowId: sourceDecision.tableRowId,
              sourceTagId: sourceDecision.selectedTagId,
              sourceCommentId: sourceDecision.selectedCommentId,
              sourcePipe: sourceDecision.resolvedPipe,
              sourceAxis: sourceAxis.axis,
              sourceAxisBasis: sourceAxis.basis,
              requestedTargetPipe: requestedPipe,
              requestedLineKey: resolved.requestedLineKey,
              matchedTargetPipe: targetGroup.pipeName,
              pipeMatchBasis: resolved.basis,
              targetPipeAxis: targetAxis.axis,
              targetAxisBasis: targetAxis.basis,
              targetTableRowId: targetDecision.tableRowId,
              targetTableRowIndex: targetDecision.tableRowIndex,
              targetIdentity: targetDecision.canonicalIdentity,
              targetSupportRoot: targetDecision.supportRoot,
              sourcePosition: sourcePoint,
              targetPosition: targetDecision.supportPosition,
              ...window,
              alongAxisToleranceMm: config.appliesToAlongAxisToleranceMm,
              parallelOffsetToleranceMm: config.appliesToParallelOffsetToleranceMm,
              elevationToleranceMm: config.appliesToElevationToleranceMm,
              baseIsonote: directive.note,
              derivedIsonote: note,
              applied,
              outcome: applied ? 'APPLIED' : 'REJECTED',
              rejectionReasons,
            };
            propagationLedger.push(ledgerRow);
            if (!applied) continue;
            appliedForRequestedPipe += 1;
            const target = decisionById.get(targetDecision.tableRowId);
            target.propagatedIsonotes.push({
              sourceTagId: sourceDecision.selectedTagId,
              sourceCommentId: sourceDecision.selectedCommentId,
              sourceTableRowId: sourceDecision.tableRowId,
              sourcePipe: sourceDecision.resolvedPipe,
              requestedTargetPipe: requestedPipe,
              matchedTargetPipe: targetGroup.pipeName,
              pipeMatchBasis: resolved.basis,
              sourceAxis: sourceAxis.axis,
              targetPipeAxis: targetAxis.axis,
              note,
              baseIsonote: directive.note,
              deltaEMm: window.deltaE,
              deltaNMm: window.deltaN,
              deltaElMm: window.deltaEl,
              alongAxisDeltaMm: window.alongAxisDeltaMm,
              parallelOffsetMm: window.parallelOffsetMm,
            });
          }
        }
        if (!appliedForRequestedPipe) {
          addDiagnostic(diagnostics, 'WARN', 'APPLIES_TO_NO_PARALLEL_SUPPORT_IN_WINDOW', `No support on ${requestedPipe} was parallel and inside the configured coordinate window for Tag ${sourceDecision.selectedTagId || '(unknown)'}.`, { tableRowId: sourceDecision.tableRowId, tagId: sourceDecision.selectedTagId, requestedPipe, sourceAxis: sourceAxis.axis });
        }
      }
    }
  }

  for (const decision of decisions) {
    const propagated = [];
    const seen = new Set();
    for (const evidence of decision.propagatedIsonotes || []) {
      const key = `${evidence.sourceTagId}|${evidence.note}`;
      if (seen.has(key)) continue;
      seen.add(key);
      propagated.push(evidence);
    }
    decision.propagatedIsonotes = propagated;
    decision.propagatedFromTagIds = unique(propagated.map((item) => item.sourceTagId));
    const notes = unique([decision.directSupportIsonote, ...propagated.map((item) => item.note)]);
    decision.supportIsonote = notes.join(' | ');
    decision.isonoteSource = decision.directSupportIsonote && propagated.length ? 'DIRECT_AND_PROPAGATED'
      : decision.directSupportIsonote ? 'DIRECT'
        : propagated.length ? 'PROPAGATED' : 'NONE';
  }

  const augmentedRows = (audit.augmentedRows || []).map((row, index) => {
    const decision = decisions[index];
    if (!decision) return { ...row };
    return {
      ...row,
      'Support ISONOTE': decision.supportIsonote,
      'ISONOTE Source': decision.isonoteSource,
      'Direct Support ISONOTE': decision.directSupportIsonote,
      'Propagated From Tag IDs': decision.propagatedFromTagIds.join('|'),
      'Propagated ISONOTE Count': decision.propagatedIsonotes.length,
      'Applies-To Target Pipes': decision.appliesToDirective?.targets?.join('|') || '',
    };
  });
  const matchedRows = decisions.filter((row) => row.status === 'RESOLVED');
  const ambiguousRows = decisions.filter((row) => row.status === 'AMBIGUOUS');
  const rejectedRows = decisions.filter((row) => row.status === 'UNRESOLVED');
  const appliedRows = propagationLedger.filter((row) => row.applied);

  return {
    ...audit,
    config: { ...(audit.config || {}), ...config },
    decisions,
    augmentedRows,
    matchedRows,
    ambiguousRows,
    rejectedRows,
    propagationLedger,
    diagnostics: [...(audit.diagnostics || []), ...diagnostics],
    summary: {
      ...(audit.summary || {}),
      appliesToDirectiveCount: sourceDirectives.length,
      propagationLedgerCount: propagationLedger.length,
      propagatedApplicationCount: appliedRows.length,
      propagatedTargetRowCount: new Set(appliedRows.map((row) => row.targetTableRowId)).size,
      exactTargetPipeMatchCount: new Set(appliedRows.filter((row) => row.pipeMatchBasis === 'FULL_PIPE_NAME_EXACT').map((row) => row.requestedTargetPipe)).size,
      lineKeyFallbackTargetPipeMatchCount: new Set(appliedRows.filter((row) => row.pipeMatchBasis === 'LINE_KEY_FALLBACK').map((row) => row.requestedTargetPipe)).size,
    },
  };
}

export const _test = Object.freeze({ normalizePipeName, resolveTargetGroups, coordinateWindow, derivedNote });
