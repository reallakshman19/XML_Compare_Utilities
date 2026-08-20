import { mountCiiWorkspaceScopedEngineeringShell } from './cii-workspace-transfer-scope-ui.js';

const STYLE_ID = 'cii-workspace-style';
const ENGINEERING_STYLE_ID = 'cii-workspace-engineering-style';
const SIF_CONTEXT_AUTHORITY = 'ENGINEER_ATTESTED_SAME_ACTIVE_PIPING_CODE';
function stylesheet(documentRef, id, relativeUrl) {
  if (documentRef.getElementById(id)) return;
  const link = documentRef.createElement('link'); link.id = id; link.rel = 'stylesheet';
  link.href = new URL(relativeUrl, import.meta.url).href; documentRef.head.appendChild(link);
}
function ensureStylesheet(documentRef) {
  stylesheet(documentRef, STYLE_ID, './cii-workspace.css');
  stylesheet(documentRef, ENGINEERING_STYLE_ID, './cii-workspace-engineering-ui.css');
}
function installWriter1CSifContextControls(root, state) {
  const panel = root.querySelector('[data-ciiw-panel="inputs"]'); if (!panel) return () => {};
  const section = root.ownerDocument.createElement('section'); section.className = 'ciiw-sif-context'; section.setAttribute('data-ciiw-sif-context', '1');
  section.innerHTML = `<h3>Writer 1C SIF engineering context</h3><p>Required only for Version-11 item3/item4 ii/io mutation. Enter the active piping-code basis on both models and explicitly attest that the basis is the same.</p><div class="ciiw-intake"><label>SOURCE active piping code <input type="text" data-ciiw-sif-source-code placeholder="e.g. ASME B31.3-2018"></label><label>TARGET active piping code <input type="text" data-ciiw-sif-target-code placeholder="e.g. ASME B31.3-2018"></label><label><input type="checkbox" data-ciiw-sif-code-attest> I attest that SOURCE and TARGET use the same active piping-code basis for these SIF values.</label></div><small>Changing this context invalidates the current mutation authorization. Run Compare models again before binding APPLY / EXCLUDE scope.</small>`;
  panel.appendChild(section);
  const source = section.querySelector('[data-ciiw-sif-source-code]'); const target = section.querySelector('[data-ciiw-sif-target-code]'); const attest = section.querySelector('[data-ciiw-sif-code-attest]');
  source.value = state.sourceCode || ''; target.value = state.targetCode || ''; attest.checked = state.authority === SIF_CONTEXT_AUTHORITY;
  const update = () => {
    state.sourceCode = source.value.trim(); state.targetCode = target.value.trim();
    state.authority = attest.checked ? SIF_CONTEXT_AUTHORITY : null;
    const apply = root.querySelector('[data-ciiw-apply-target]'); if (apply) apply.disabled = true;
    const status = root.querySelector('[data-ciiw-status]'); if (status) status.textContent = 'SIF piping-code context changed. Run Compare models again before Writer 1C authorization.';
  };
  source.addEventListener('input', update); target.addEventListener('input', update); attest.addEventListener('change', update);
  return () => { source.removeEventListener('input', update); target.removeEventListener('input', update); attest.removeEventListener('change', update); section.remove(); };
}

export function installCiiWorkspaceTile(container, context = {}) {
  ensureStylesheet(container.ownerDocument);
  if (container.querySelector('[data-ciiw-open]')) return () => {};
  const tile = container.ownerDocument.createElement('button'); tile.type = 'button';
  tile.className = 'psmap-card psmap-tile'; tile.setAttribute('data-ciiw-open', '1');
  tile.innerHTML = '<b>CII Workspace</b><span>Method-qualified model correspondence and explicitly scoped target transfer review</span>';
  container.appendChild(tile);
  let overlay = null; let active = null; let disposeSifContext = null;
  const close = () => { disposeSifContext?.(); active?.destroy(); overlay?.remove(); disposeSifContext = null; active = null; overlay = null; };
  const open = () => {
    if (active) return;
    overlay = container.ownerDocument.createElement('div'); overlay.className = 'ciiw-backdrop';
    container.ownerDocument.body.appendChild(overlay);
    const sifEngineeringContext = {
      authority: context.sifEngineeringContext?.authority || null,
      sourceCode: String(context.sifEngineeringContext?.sourceCode || ''),
      targetCode: String(context.sifEngineeringContext?.targetCode || ''),
    };
    active = mountCiiWorkspaceScopedEngineeringShell(overlay, {
      close, showToast: context.showToast,
      ...(context.writerVersion ? { writerVersion: context.writerVersion } : {}),
      ...(context.writerVersion === '1C' ? { sifEngineeringContext } : {}),
    });
    if (context.writerVersion === '1C') disposeSifContext = installWriter1CSifContextControls(overlay, sifEngineeringContext);
  };
  tile.addEventListener('click', open);
  return () => { tile.removeEventListener('click', open); close(); tile.remove(); };
}

export const _test = Object.freeze({ ensureStylesheet, installWriter1CSifContextControls });
