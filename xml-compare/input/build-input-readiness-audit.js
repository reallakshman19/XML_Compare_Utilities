import {
  createInputReadinessAudit,
  createInputReadinessSource,
  createReadinessDiagnostic,
} from '../contracts/xml-input-readiness-contracts.js';
import { hashText } from './hash-text.js';

function clean(value) {
  return String(value ?? '').trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function recordCountOf(input = {}) {
  const dataset = input.dataset || {};
  const candidates = [
    input.recordCount,
    input.records?.length,
    dataset.summary?.recordCount,
    dataset.records?.length,
    dataset.baseRecords?.length,
    dataset.components?.length,
    dataset.parsed?.elements?.length,
  ];
  const count = candidates.find((item) => Number.isFinite(Number(item)));
  return Math.max(0, Number(count) || 0);
}

function explicitErrors(input = {}) {
  const dataset = input.dataset || {};
  return [...asArray(input.errors), ...asArray(dataset.errors), ...asArray(dataset.error).filter(Boolean)];
}

function parseOkOf(input = {}) {
  if (!clean(input.rawText)) return false;
  if (input.parseOk === false || input.ok === false || input.dataset?.ok === false) return false;
  return explicitErrors(input).length === 0;
}

function diagnosticFromUnknown(value, fallbackCode = 'input_diagnostic') {
  if (value instanceof Error) {
    return createReadinessDiagnostic({ severity: 'BLOCKER', code: 'parse_error', message: value.message });
  }
  if (typeof value === 'string') {
    return createReadinessDiagnostic({ severity: 'WARNING', code: fallbackCode, message: value });
  }
  return createReadinessDiagnostic({ severity: value?.severity || 'WARNING', ...value });
}

function parseErrorDiagnostic(error) {
  if (error instanceof Error) {
    return createReadinessDiagnostic({ severity: 'BLOCKER', code: 'parse_error', message: error.message });
  }
  if (typeof error === 'string') {
    return createReadinessDiagnostic({ severity: 'BLOCKER', code: 'parse_error', message: error });
  }
  return createReadinessDiagnostic({ severity: 'BLOCKER', code: 'parse_error', ...error });
}

export function normalizeInputProfile(input = {}) {
  if (!clean(input.rawText)) return 'empty';
  return clean(
    input.profile || input.dataset?.profile || input.dataset?.type || input.dataset?.profileId || 'unknown',
  );
}

export function collectInputDiagnostics(input = {}) {
  const rawText = clean(input.rawText);
  const profile = normalizeInputProfile(input);
  const diagnostics = [];
  if (!rawText) diagnostics.push(createReadinessDiagnostic({ severity: 'BLOCKER', code: 'blank_input', message: 'Input text is blank.' }));
  for (const error of explicitErrors(input)) {
    diagnostics.push(parseErrorDiagnostic(error));
  }
  for (const item of [...asArray(input.diagnostics), ...asArray(input.dataset?.diagnostics)]) {
    diagnostics.push(diagnosticFromUnknown(item));
  }
  if (rawText && profile === 'unknown') {
    diagnostics.push(createReadinessDiagnostic({ severity: 'WARNING', code: 'profile_unknown', message: 'Input profile is unknown.' }));
  }
  if (rawText && parseOkOf(input) && recordCountOf(input) <= 0) {
    diagnostics.push(createReadinessDiagnostic({ severity: 'BLOCKER', code: 'zero_records', message: 'No records were available after parse or normalization.' }));
  }
  return Object.freeze(diagnostics);
}

export function buildInputReadinessSource(input = {}) {
  return createInputReadinessSource({
    sourceId: clean(input.sourceId),
    side: clean(input.side),
    fileName: clean(input.fileName || input.dataset?.fileName),
    rawTextHash: hashText(input.rawText || ''),
    profile: normalizeInputProfile(input),
    parseOk: parseOkOf(input),
    recordCount: recordCountOf(input),
    diagnostics: collectInputDiagnostics(input),
  });
}

export function buildInputReadinessAudit({ sourceA = {}, targetB = {}, generatedAt = '' } = {}) {
  return createInputReadinessAudit({
    generatedAt,
    sourceA: buildInputReadinessSource({ sourceId: 'A', side: 'Source A', ...sourceA }),
    targetB: buildInputReadinessSource({ sourceId: 'B', side: 'Target B', ...targetB }),
  });
}
