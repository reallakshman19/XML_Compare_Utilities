import { mountSequentialSketcherWorkspace } from './sequential-sketcher-workspace.js?v=20260717-ssk-branch-switch-1';

const STYLE_ID = 'sequential-sketcher-style';

function ensureStylesheet(documentRef) {
  if (documentRef.getElementById(STYLE_ID)) return;
  const link = documentRef.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = './tabs/sequential-sketcher/sequential-sketcher.css?v=20260717-ssk-branch-switch-1';
  documentRef.head.appendChild(link);
}

export function installSequentialSketcherTile(container, context = {}) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-ssk-open]')) return () => {};
  const tile = container.ownerDocument.createElement('section');
  tile.className = 'psmap-card psmap-tile ssk-launcher';
  tile.innerHTML = '<button type="button" data-ssk-open="1"><span class="ssk-launcher-icon">✎</span><span><strong>Sequential Sketcher</strong><small>Compile pipe + fittings into an auditable pen sequence</small></span></button>';
  container.appendChild(tile);
  let active = null;
  const open = () => {
    if (active) return;
    const overlay = container.ownerDocument.createElement('div');
    overlay.className = 'ssk-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sequential Sketcher');
    container.ownerDocument.body.appendChild(overlay);
    const close = () => { active?.destroy(); active = null; overlay.remove(); };
    active = mountSequentialSketcherWorkspace(overlay, { ...context, close });
  };
  tile.querySelector('[data-ssk-open]').addEventListener('click', open);
  return () => {
    tile.querySelector('[data-ssk-open]')?.removeEventListener('click', open);
    active?.destroy();
    tile.remove();
  };
}

export { mountSequentialSketcherWorkspace };
