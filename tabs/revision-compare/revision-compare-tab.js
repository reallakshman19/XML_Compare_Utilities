/** Utilities launcher for the staged-JSON Revision Compare foundation. */

import { mountRevisionCompareWorkspace } from './revision-compare-workspace.js?v=20260717-rc-001';

const STYLE_ID = 'revision-compare-foundation-style';

function ensureStylesheet(documentRef) {
  if (documentRef.getElementById(STYLE_ID)) return;
  const link = documentRef.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./revision-compare.css?v=20260717-rc-001', import.meta.url).href;
  documentRef.head.appendChild(link);
}

/** Install one Utilities tile and return a complete destroy function. */
export function installRevisionCompareTile(container, context) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-revc-open]')) return () => {};
  const tile = container.ownerDocument.createElement('section');
  tile.className = 'psmap-card psmap-tile revc-launcher';
  tile.innerHTML = '<button type="button" data-revc-open><span class="revc-launcher-icon">A↔B</span><span><strong>Revision Compare</strong><small>Load and validate Rev A / Rev B staged JSON</small></span></button>';
  container.appendChild(tile);
  let active = null;
  let overlay = null;
  const close = () => { active?.destroy(); active = null; overlay?.remove(); overlay = null; };
  const open = () => {
    if (active) return;
    overlay = container.ownerDocument.createElement('div');
    overlay.className = 'revc-backdrop';
    container.ownerDocument.body.appendChild(overlay);
    active = mountRevisionCompareWorkspace(overlay, { close, showToast: context?.showToast });
  };
  tile.querySelector('[data-revc-open]').addEventListener('click', open);
  return () => { tile.querySelector('[data-revc-open]')?.removeEventListener('click', open); close(); tile.remove(); };
}

export const _test = Object.freeze({ ensureStylesheet });

