/** Utilities launcher for RC-001 trusted revision intake and scope approval. */

import { mountRevisionCompareWorkspace } from './revision-compare-workspace.js?v=20260718-rc001';

const STYLE_ID = 'revision-compare-style';

function ensureStylesheet(documentRef) {
  if (documentRef.getElementById(STYLE_ID)) return;
  const link = documentRef.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./revision-compare.css?v=20260718-rc001', import.meta.url).href;
  documentRef.head.appendChild(link);
}

/** Install one Utilities tile and return a complete destroy function. */
export function installRevisionCompareTile(container, context = {}) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-revc-open]')) return () => {};
  const tile = container.ownerDocument.createElement('button');
  tile.type = 'button';
  tile.className = 'psmap-card psmap-tile';
  tile.setAttribute('data-revc-open', '1');
  tile.innerHTML = '<span class="revc-launcher-icon">A↔B</span><b>Revision Compare</b><span>Load two revisions and approve the exact branch scope</span>';
  container.appendChild(tile);

  let active = null;
  let overlay = null;
  const close = () => {
    active?.destroy();
    active = null;
    overlay?.remove();
    overlay = null;
  };
  const open = () => {
    if (active) return;
    overlay = container.ownerDocument.createElement('div');
    overlay.className = 'revc-backdrop';
    container.ownerDocument.body.appendChild(overlay);
    active = mountRevisionCompareWorkspace(overlay, { close, showToast: context.showToast });
  };
  tile.addEventListener('click', open);
  return () => {
    tile.removeEventListener('click', open);
    close();
    tile.remove();
  };
}

export const _test = Object.freeze({ ensureStylesheet });
