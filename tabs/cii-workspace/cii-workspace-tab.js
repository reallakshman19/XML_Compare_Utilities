import { mountCiiWorkspaceEngineeringShell } from './cii-workspace-engineering-ui.js';

const STYLE_ID = 'cii-workspace-style';
const ENGINEERING_STYLE_ID = 'cii-workspace-engineering-style';
function stylesheet(documentRef, id, relativeUrl) {
  if (documentRef.getElementById(id)) return;
  const link = documentRef.createElement('link'); link.id = id; link.rel = 'stylesheet';
  link.href = new URL(relativeUrl, import.meta.url).href; documentRef.head.appendChild(link);
}
function ensureStylesheet(documentRef) {
  stylesheet(documentRef, STYLE_ID, './cii-workspace.css');
  stylesheet(documentRef, ENGINEERING_STYLE_ID, './cii-workspace-engineering-ui.css');
}

export function installCiiWorkspaceTile(container, context = {}) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-ciiw-open]')) return () => {};
  const tile = container.ownerDocument.createElement('button'); tile.type = 'button';
  tile.className = 'psmap-card psmap-tile'; tile.setAttribute('data-ciiw-open', '1');
  tile.innerHTML = '<b>CII Workspace</b><span>Method-qualified model correspondence and target transfer review</span>';
  container.appendChild(tile);
  let overlay = null; let active = null;
  const close = () => { active?.destroy(); overlay?.remove(); active = null; overlay = null; };
  const open = () => {
    if (active) return;
    overlay = container.ownerDocument.createElement('div'); overlay.className = 'ciiw-backdrop';
    container.ownerDocument.body.appendChild(overlay);
    active = mountCiiWorkspaceEngineeringShell(overlay, { close, showToast: context.showToast });
  };
  tile.addEventListener('click', open);
  return () => { tile.removeEventListener('click', open); close(); tile.remove(); };
}

export const _test = Object.freeze({ ensureStylesheet });