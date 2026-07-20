import { CommandHistory, SnapshotCommand } from './pipeline-3d-model-cad-commands.js';
import {
  createPipelineCadMarkupDocument,
  parsePipelineCadMarkupDocument,
  serializePipelineCadMarkupDocument,
} from './pipeline-3d-model-cad-markup-contracts.js';
import { createPipelineCadMarkupModel } from './pipeline-3d-model-cad-markup-model.js';
import {
  buildPipelineCadMarkupEntityIndex,
  reconcilePipelineCadMarkupDocument,
} from './pipeline-3d-model-cad-markup-reconciliation.js';
import {
  buildPipelineCadMarkupProjection,
  emptyPipelineCadMarkupProjection,
} from './pipeline-3d-model-cad-markup-renderer.js';

function command(model, description, mutation) {
  return new SnapshotCommand(model, description, mutation);
}
export function createPipelineCadDimensionCommand(model, payload) {
  return command(model, 'Create Pipeline CAD dimension', (target) => target.createDimension(payload));
}
export function updatePipelineCadDimensionCommand(model, id, patch) {
  return command(model, `Update Pipeline CAD dimension ${id}`, (target) => target.updateDimension(id, patch));
}
export function deletePipelineCadDimensionCommand(model, id) {
  return command(model, `Delete Pipeline CAD dimension ${id}`, (target) => target.deleteDimension(id));
}
export function createPipelineCadAnnotationCommand(model, payload) {
  return command(model, 'Create Pipeline CAD annotation', (target) => target.createAnnotation(payload));
}
export function updatePipelineCadAnnotationCommand(model, id, patch) {
  return command(model, `Update Pipeline CAD annotation ${id}`, (target) => target.updateAnnotation(id, patch));
}
export function deletePipelineCadAnnotationCommand(model, id) {
  return command(model, `Delete Pipeline CAD annotation ${id}`, (target) => target.deleteAnnotation(id));
}
export function replacePipelineCadMarkupDocumentCommand(model, document) {
  return command(model, 'Replace imported Pipeline CAD markup',
    (target) => target.replaceDocument(document, 'import'));
}
export function reconcilePipelineCadMarkupCommand(model, document) {
  return command(model, 'Reconcile Pipeline CAD markup source',
    (target) => target.replaceDocument(document, 'reconcile'));
}

function setProjection(graphs, projection) {
  graphs?.table2x?.setMarkupProjection?.(projection);
  graphs?.table3x?.setMarkupProjection?.(projection);
}
function initialDocument(getProfileModel, document) {
  const index = buildPipelineCadMarkupEntityIndex(getProfileModel());
  if (!document) return createPipelineCadMarkupDocument({ sourceFingerprint: index.sourceFingerprint });
  return reconcilePipelineCadMarkupDocument(document, index).document;
}
export function createPipelineCadMarkupRuntime(options = {}) {
  const getProfileModel = typeof options.getProfileModel === 'function'
    ? options.getProfileModel : () => options.profileModel;
  if (!getProfileModel()) throw new TypeError('Pipeline CAD markup requires a current profile model.');
  const model = createPipelineCadMarkupModel(initialDocument(getProfileModel, options.initialDocument));
  const history = options.history || new CommandHistory(options.historyLimit || 100);
  const listeners = new Set(); const graphs = options.graphs || {};
  let destroyed = false; let report = null; let projection = null;
  const publish = (reason) => {
    projection = buildPipelineCadMarkupProjection(model.getDocument(), graphs);
    setProjection(graphs, projection);
    const detail = Object.freeze({
      reason, document: model.getDocument(), evidence: projection.evidence, report,
    });
    listeners.forEach((listener) => listener(detail)); options.onPublish?.(detail); return detail;
  };
  const onHistory = (event) => publish(event.detail?.action || 'history');
  history.addEventListener('historyChanged', onHistory); publish('mount');
  const execute = (next) => {
    if (destroyed) throw new Error('Pipeline CAD markup runtime is destroyed.');
    history.execute(next); return model.getDocument();
  };
  const reconcile = () => {
    const result = reconcilePipelineCadMarkupDocument(model.getDocument(), getProfileModel());
    report = result.report;
    if (!result.report.changed) return false;
    execute(reconcilePipelineCadMarkupCommand(model, result.document)); return report;
  };
  return Object.freeze({
    getDocument: () => model.getDocument(),
    getEvidence: () => projection?.evidence || Object.freeze([]),
    getReconciliationReport: () => report,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Markup listener must be a function.');
      listeners.add(listener); return () => listeners.delete(listener);
    },
    createDimension: (payload) => execute(createPipelineCadDimensionCommand(model, payload)),
    updateDimension: (id, patch) => execute(updatePipelineCadDimensionCommand(model, id, patch)),
    deleteDimension: (id) => execute(deletePipelineCadDimensionCommand(model, id)),
    createAnnotation: (payload) => execute(createPipelineCadAnnotationCommand(model, payload)),
    updateAnnotation: (id, patch) => execute(updatePipelineCadAnnotationCommand(model, id, patch)),
    deleteAnnotation: (id) => execute(deletePipelineCadAnnotationCommand(model, id)),
    export: () => serializePipelineCadMarkupDocument(model.getDocument()),
    import(text) {
      const parsed = parsePipelineCadMarkupDocument(text);
      const result = reconcilePipelineCadMarkupDocument(parsed, getProfileModel()); report = result.report;
      return execute(replacePipelineCadMarkupDocumentCommand(model, result.document));
    },
    reconcile, undo: () => history.undo(), redo: () => history.redo(),
    get canUndo() { return history.canUndo; }, get canRedo() { return history.canRedo; },
    destroy() {
      if (destroyed) return false; destroyed = true;
      history.removeEventListener('historyChanged', onHistory);
      listeners.clear(); setProjection(graphs, emptyPipelineCadMarkupProjection()); return true;
    },
  });
}
