export const PIPELINE_CAD_PREVIEW_MODE_HARDENING_BUILD = '2026.07.13-preview-modes-hardening-1';

const INSTALLED = Symbol.for('pipeline3d.cad.preview-modes.hardening.installed.v1');
const OVERLAY_MODE = 'overlay';

function overlayModalFrom(target) {
  const modal = target?.closest?.('[data-p3d-split="x-modal"]');
  return modal?.dataset?.p3dCadPreviewMode === OVERLAY_MODE ? modal : null;
}

function promoteOriginInput(event) {
  const input = event.target?.closest?.('[data-p3d-cad-z-origin]');
  if (!input || !overlayModalFrom(input)) return;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  input.removeAttribute('aria-invalid');
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function reassertOverlayInspector(event) {
  const canvas = event.target?.closest?.('[data-p3d-cad-overlay-canvas]');
  const modal = canvas ? overlayModalFrom(canvas) : null;
  if (!canvas || !modal) return;
  const inspector = modal.querySelector('[data-p3d-cad-coordinate-inspector]');
  if (!inspector) return;
  const projected = inspector.querySelector('[data-p3d-cad-inspector-field="projectedElevation"]');
  const schedule = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout?.(callback, 0));
  schedule(() => {
    if (modal.dataset.p3dCadPreviewMode !== OVERLAY_MODE) return;
    if (String(projected?.textContent || '').trim() === '—') return;
    inspector.dataset.active = 'true';
  });
}

function clearOverlayInspector(event) {
  const canvas = event.target?.closest?.('[data-p3d-cad-overlay-canvas]');
  const modal = canvas ? overlayModalFrom(canvas) : null;
  const inspector = modal?.querySelector?.('[data-p3d-cad-coordinate-inspector]');
  if (inspector) inspector.dataset.active = 'false';
}

export function installPipelineCadPreviewModeHardening(doc = globalThis.document) {
  if (!doc?.addEventListener || doc[INSTALLED]) return false;
  Object.defineProperty(doc, INSTALLED, { configurable: true, value: true });
  doc.addEventListener('input', promoteOriginInput, true);
  doc.addEventListener('pointermove', reassertOverlayInspector, true);
  doc.addEventListener('pointerleave', clearOverlayInspector, true);
  return true;
}

if (globalThis.document) installPipelineCadPreviewModeHardening(globalThis.document);
