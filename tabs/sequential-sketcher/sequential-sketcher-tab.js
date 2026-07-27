import { mountSequentialSketcherWorkspace } from './sequential-sketcher-workspace.js?v=20260718-ssk-geometry-order-1';
import { mountSequentialEngineeringSvgPreviewController } from './sequential-engineering-svg-preview-controller.js?v=20260721-ssk-esvg-preview-1';
import { mountSequentialRedoController } from './construction/sequential-redo-controller.js?v=20260717-ssk-workspace-apply-receipts-1';
import { mountSequentialProjectExportController } from './platform/sequential-project-export-controller.js?v=20260717-ssk-workspace-apply-receipts-1';
import { mountSequentialWorkspacePersistenceController } from './persistence/sequential-workspace-persistence-controller.js?v=20260717-ssk-workspace-apply-receipts-1';
import { mountSequentialContinuityController } from './continuity/sequential-continuity-controller.js?v=20260717-ssk-continuity-geometry-1';
import { createSequentialScopedEditProductionShadow } from './scoped-edit/sequential-scoped-edit-production-shadow.js?v=20260727-ssk-ts-1b-shadow-1';

const STYLE_ID = 'sequential-sketcher-style';
const CONTINUITY_STYLE_ID = 'sequential-continuity-style';

function ensureLink(documentRef, id, href) {
  if (documentRef.getElementById(id)) return;
  const link = documentRef.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  documentRef.head.appendChild(link);
}

function ensureStylesheet(documentRef) {
  ensureLink(documentRef, STYLE_ID, './tabs/sequential-sketcher/sequential-sketcher.css?v=20260717-ssk-workspace-apply-receipts-1');
  ensureLink(documentRef, CONTINUITY_STYLE_ID, './tabs/sequential-sketcher/continuity/sequential-continuity.css?v=20260717-ssk-continuity-geometry-1');
}

export function installSequentialSketcherTile(container, context = {}) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-ssk-open]')) return () => {};
  const tile = container.ownerDocument.createElement('button');
  tile.type = 'button';
  tile.className = 'psmap-card psmap-tile';
  tile.setAttribute('data-ssk-open', '1');
  tile.innerHTML = '<span class="ssk-launcher-icon">✎</span><b>Sequential Sketcher</b><span>Compile pipe + fittings into an auditable pen sequence</span>';
  container.appendChild(tile);
  let active = null;
  let redoController = null;
  let projectExportController = null;
  let persistenceController = null;
  let continuityController = null;
  let previewController = null;
  let scopedEditShadow = null;
  const open = () => {
    if (active) return;
    const overlay = container.ownerDocument.createElement('div');
    overlay.className = 'ssk-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sequential Sketcher');
    container.ownerDocument.body.appendChild(overlay);
    const close = () => {
      scopedEditShadow?.destroy();
      scopedEditShadow = null;
      previewController?.destroy();
      previewController = null;
      continuityController?.destroy();
      continuityController = null;
      persistenceController?.destroy();
      persistenceController = null;
      projectExportController?.destroy();
      projectExportController = null;
      redoController?.destroy();
      redoController = null;
      active?.destroy();
      active = null;
      overlay.remove();
    };
    active = mountSequentialSketcherWorkspace(overlay, { ...context, close });
    try {
      scopedEditShadow = createSequentialScopedEditProductionShadow({
        snapshotProvider: active.getEngineeringSvgOwnerSnapshot,
        subscribe: active.subscribeEngineeringSvgOwnerState,
        onDiagnostic: context.onSequentialScopedEditShadowDiagnostic,
      });
    } catch (error) {
      scopedEditShadow = null;
      try { context.onSequentialScopedEditShadowFailure?.(error); } catch {}
    }
    previewController = mountSequentialEngineeringSvgPreviewController(overlay, {
      workspace: active,
      failureFactory: context.sequentialEngineeringSvgPreviewFailureFactory,
      onFailure: context.onSequentialEngineeringSvgPreviewFailure,
    });
    redoController = mountSequentialRedoController(overlay, active, context);
    projectExportController = mountSequentialProjectExportController(overlay, active, context);
    persistenceController = mountSequentialWorkspacePersistenceController(overlay, active, context);
    continuityController = mountSequentialContinuityController(overlay, active, context);
  };
  tile.addEventListener('click', open);
  return () => {
    scopedEditShadow?.destroy();
    scopedEditShadow = null;
    previewController?.destroy();
    previewController = null;
    tile.removeEventListener('click', open);
    continuityController?.destroy();
    continuityController = null;
    persistenceController?.destroy();
    persistenceController = null;
    projectExportController?.destroy();
    projectExportController = null;
    redoController?.destroy();
    redoController = null;
    active?.destroy();
    active = null;
    tile.remove();
  };
}

export { mountSequentialSketcherWorkspace };
