/** Utilities launcher for RC-001 trusted revision intake and scope approval. */

import { bindRevisionCompareIntakeInteractions } from './revision-compare-intake-interactions.js';
import { mountRevisionCompareWorkspace } from './revision-compare-workspace.js?v=20260718-rc001';

const STYLESHEETS = Object.freeze([
  Object.freeze({ id: 'revision-compare-style', href: './revision-compare.css?v=20260718-rc001' }),
  Object.freeze({ id: 'revision-compare-layout-style', href: './revision-compare-layout.css?v=20260729-ui-layout' }),
  Object.freeze({ id: 'revision-compare-review-containment-style', href: './revision-compare-review-containment.css?v=20260729-ui-containment' }),
  Object.freeze({ id: 'revision-compare-intake-style', href: './revision-compare-intake.css?v=20260729-rc-ux-001' }),
]);

function ensureStylesheet(documentRef) {
  for (const stylesheet of STYLESHEETS) {
    if (documentRef.getElementById(stylesheet.id)) continue;
    const link = documentRef.createElement('link');
    link.id = stylesheet.id;
    link.rel = 'stylesheet';
    link.href = new URL(stylesheet.href, import.meta.url).href;
    documentRef.head.appendChild(link);
  }
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
  let intakeCleanup = null;
  let overlay = null;
  const close = () => {
    intakeCleanup?.();
    intakeCleanup = null;
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
    intakeCleanup = bindRevisionCompareIntakeInteractions(overlay);
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
