import { buildInputReadinessAudit } from './build-input-readiness-audit.js';

function sideModel(workspace = {}, side = 'a') {
  return side === 'b' ? workspace.target : workspace.source;
}

function fileNameOf(state = {}, model = {}, side = 'a') {
  const file = side === 'b' ? state.fileB : state.fileA;
  return String(file?.name || model?.fileName || '').trim();
}

function rawTextOf(state = {}, side = 'a') {
  return side === 'b' ? state.textB || '' : state.textA || '';
}

function sourceIdOf(side = 'a') {
  return side === 'b' ? 'B' : 'A';
}

function sideLabelOf(side = 'a') {
  return side === 'b' ? 'Target B' : 'Source A';
}

function recordsOf(model = {}) {
  if (Array.isArray(model?.baseRecords)) return model.baseRecords;
  if (Array.isArray(model?.records)) return model.records;
  return [];
}

function diagnosticsOf(model = {}) {
  return Object.freeze([
    ...(Array.isArray(model?.diagnostics) ? model.diagnostics : []),
    ...(Array.isArray(model?.intake?.diagnostics) ? model.intake.diagnostics : []),
  ]);
}

export function createReadinessSideInputFromWorkspace({ state = {}, workspace = {}, side = 'a' } = {}) {
  const model = sideModel(workspace, side) || {};
  return Object.freeze({
    sourceId: sourceIdOf(side),
    side: sideLabelOf(side),
    fileName: fileNameOf(state, model, side),
    rawText: rawTextOf(state, side),
    profile: model.profile,
    dataset: model,
    records: recordsOf(model),
    diagnostics: diagnosticsOf(model),
  });
}

export function createInputReadinessAuditFromWorkspace({ state = {}, workspace = {}, generatedAt = '' } = {}) {
  return buildInputReadinessAudit({
    generatedAt,
    sourceA: createReadinessSideInputFromWorkspace({ state, workspace, side: 'a' }),
    targetB: createReadinessSideInputFromWorkspace({ state, workspace, side: 'b' }),
  });
}

export function serializeInputReadinessAuditJson(audit = {}) {
  return `${JSON.stringify(audit, null, 2)}\n`;
}
