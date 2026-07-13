const STYLE_ID = 'pipeline-3d-cad-layout-hardening-style';
const HOST_SELECTOR = '[data-p3d-split="table2x-preview"], [data-p3d-split="table3x-preview"]';

function ensureStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-cad-host{position:relative!important;min-height:340px;overflow:hidden;contain:layout paint}
.p3d-cad-host>.p3d-cad-stage{position:absolute!important;inset:0;width:auto!important;height:auto!important;min-height:0!important}
.p3d-cad-host>.p3d-cad-stage>canvas{width:100%!important;height:100%!important;min-height:0!important}
`;
  doc.head.appendChild(style);
}

export function stabilizePipelineCadHosts(doc = globalThis.document) {
  if (!doc?.querySelectorAll) return 0;
  ensureStyle(doc);
  let changed = 0;
  doc.querySelectorAll(HOST_SELECTOR).forEach((holder) => {
    if (!holder.querySelector(':scope > [data-p3d-cad-stage]')) return;
    if (!holder.classList.contains('p3d-cad-host')) {
      holder.classList.add('p3d-cad-host');
      changed += 1;
    }
  });
  return changed;
}

export function installPipelineCadLayoutHardening(doc = globalThis.document) {
  if (!doc?.body) return null;
  ensureStyle(doc);
  stabilizePipelineCadHosts(doc);
  if (doc.body.dataset.p3dCadLayoutObserver === '1') return null;
  doc.body.dataset.p3dCadLayoutObserver = '1';
  const MutationObserverCtor = globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  const observer = new MutationObserverCtor(() => stabilizePipelineCadHosts(doc));
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}

if (globalThis.document?.body) installPipelineCadLayoutHardening(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCadLayoutHardening(globalThis.document), { once: true });
