const PANEL_SELECTOR = '[data-p3d-split="x-modal"]';
const FLOATING_SELECTOR = '[data-p3d-floating-preview="1"]';
const INSTALL_STATE = Symbol.for('pipeline3d.cad.floating-preview.hardening.install-state.v1');

export function restoreNonWindowPipelineCadHosts(doc = globalThis.document) {
  if (!doc?.querySelectorAll) return 0;
  let restored = 0;
  doc.querySelectorAll(`${PANEL_SELECTOR}${FLOATING_SELECTOR}`).forEach((panel) => {
    if (panel.querySelector('.p3d-x-modal-head')) return;
    delete panel.dataset.p3dFloatingPreview;
    delete panel.dataset.p3dFloatingPreviewBuild;
    restored += 1;
  });
  return restored;
}

export function installPipelineCadFloatingPreviewHardening(doc = globalThis.document) {
  if (!doc?.body) return null;
  const target = doc.defaultView || globalThis;
  const state = target[INSTALL_STATE] || { observer: null };
  if (!target[INSTALL_STATE]) {
    Object.defineProperty(target, INSTALL_STATE, { configurable: true, value: state });
  }
  const restore = () => restoreNonWindowPipelineCadHosts(doc);
  restore();
  if (state.observer) return state.observer;
  const MutationObserverCtor = target.MutationObserver || globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  state.observer = new MutationObserverCtor(restore);
  state.observer.observe(doc.body, { childList: true, subtree: true });
  return state.observer;
}

if (globalThis.document?.body) installPipelineCadFloatingPreviewHardening(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCadFloatingPreviewHardening(globalThis.document), { once: true });
