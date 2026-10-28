import './psnm-anchor-selection.js?v=20260613-anchor-selection-no-blocker-1';
// The legacy independent auto-anchor, datum-group and axis benchmark overlays
// are intentionally not loaded. The Master Table resolver is the only
// authority for selected anchor and match results.

const STYLE_ID = 'psnm-context-actions-style';

function installContextActionStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.psnm-modal .psnm-statusbar [data-psnm-action="resolveMasters"],
.psnm-modal .psnm-statusbar [data-psnm-action="runMatch"]{
  display:none!important;
}

.psnm-modal:has([data-psnm-tab="source"].active) .psnm-statusbar [data-psnm-action="resolveMasters"]{
  display:inline-flex!important;
}

.psnm-modal:has([data-psnm-tab="master"].active) .psnm-statusbar [data-psnm-action="resolveMasters"]{
  display:inline-flex!important;
}

.psnm-modal:has([data-psnm-tab="setup"].active) .psnm-statusbar [data-psnm-action="runMatch"]{
  display:inline-flex!important;
}
`;
  document.head.appendChild(style);
}

installContextActionStyle();

export function PSNM_contextActionsInstalled() {
  return true;
}
