/** Utilities launcher for the staged-JSON Revision Compare foundation. */

import { mountRevisionCompareWorkspace } from './revision-compare-workspace.js?v=20260717-rc-001';

const STYLE_ID = 'revision-compare-foundation-style';

function ensureStylesheet(documentRef) {
  const sheets = [
    { id: STYLE_ID, href: new URL('./revision-compare.css?v=20260718-rc-002', import.meta.url).href },
    { id: `${STYLE_ID}-wb3d`, href: new URL('../../workbench3d/ui/workbench3d-tab.css?v=20260718-rc-002', import.meta.url).href },
  ];
  for (const sheet of sheets) {
    if (documentRef.getElementById(sheet.id)) continue;
    const link = documentRef.createElement('link');
    link.id = sheet.id;
    link.rel = 'stylesheet';
    link.href = sheet.href;
    documentRef.head.appendChild(link);
  }
}

/** Install one Utilities tile and return a complete destroy function. */
export function installRevisionCompareTile(container, context) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-revc-open]')) return () => {};
  const tile = container.ownerDocument.createElement('button');
  tile.type = 'button';
  tile.className = 'psmap-card psmap-tile';
  tile.setAttribute('data-revc-open', '1');
  tile.innerHTML = '<span class="revc-launcher-icon">A↔B</span><b>Revision Compare</b><span>Load and validate Rev A / Rev B staged JSON</span>';
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
  tile.addEventListener('click', open);
  return () => { tile.removeEventListener('click', open); close(); tile.remove(); };
}

export const _test = Object.freeze({ ensureStylesheet });

