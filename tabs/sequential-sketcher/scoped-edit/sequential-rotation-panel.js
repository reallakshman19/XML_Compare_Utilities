/** Explicit numeric rotation preview panel with scope and boundary evidence. */
import { SEQUENTIAL_ROTATION_SCOPE } from './sequential-rotation-target.js';

export const SEQUENTIAL_ROTATION_PANEL_SCHEMA = 'SequentialRotationPanel.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function required(root, selector) {
  const value = root.querySelector(selector);
  if (!value) throw new Error(`Rotation panel element missing: ${selector}`);
  return value;
}
function setHidden(element, hidden) {
  element.hidden = hidden; element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (hidden) element.setAttribute('inert', ''); else element.removeAttribute('inert');
}
function field(name, label, value) {
  return `<label>${label}<input type="number" step="any" value="${value}" data-ssk-rotation-${name}></label>`;
}
function markup() {
  return `<section data-ssk-rotation-panel hidden aria-hidden="true" inert>
<header><strong>Rotate</strong><span>Rigid preview only</span></header>
<label>Scope<select data-ssk-rotation-scope><option value="COMPONENT_ONLY">Component</option><option value="CONNECTED_SUBGRAPH">Connected subgraph</option></select></label>
<div data-ssk-rotation-target>No rotation target.</div>
<fieldset><legend>Pivot</legend>${field('pivot-x', 'X', 0)}${field('pivot-y', 'Y', 0)}${field('pivot-z', 'Z', 0)}</fieldset>
<fieldset><legend>Axis</legend>${field('axis-x', 'X', 0)}${field('axis-y', 'Y', 0)}${field('axis-z', 'Z', 1)}</fieldset>
${field('angle', 'Angle °', 90)}
<label>Boundary tolerance<input type="number" step="any" value="1e-9" data-ssk-rotation-tolerance></label>
<div><button type="button" data-ssk-rotation-preview disabled>Preview rotation</button><button type="button" data-ssk-rotation-cancel disabled>Cancel preview</button></div>
<pre data-ssk-rotation-diagnosis>No boundary diagnosis.</pre>
<output data-ssk-rotation-status role="status" aria-live="polite">Select confirmed geometry.</output>
</section>`;
}
function install(root) {
  const host = required(root, '[data-ssk-visual-stack]');
  if (!root.querySelector('[data-ssk-rotation-panel]')) host.insertAdjacentHTML('beforeend', markup());
  const panel = required(root, '[data-ssk-rotation-panel]');
  panel.style.cssText = [
    'position:absolute', 'right:12px', 'top:72px', 'z-index:11',
    'width:min(390px,calc(100% - 24px))', 'max-height:calc(100% - 84px)',
    'overflow:auto', 'padding:12px', 'border:1px solid rgba(168,85,247,.5)',
    'border-radius:12px', 'background:rgba(7,16,31,.96)', 'color:#e2e8f0',
  ].join(';');
  panel.querySelectorAll('input,select').forEach((element) => {
    element.style.cssText = 'box-sizing:border-box;width:100%;padding:6px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#07101f;color:#e2e8f0';
  });
  panel.querySelectorAll('button').forEach((button) => {
    button.style.cssText = 'margin:6px 6px 6px 0;padding:7px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#172337;color:#dbeafe';
  });
  return panel;
}
function elements(root, panel) {
  const names = ['pivot-x', 'pivot-y', 'pivot-z', 'axis-x', 'axis-y', 'axis-z'];
  return {
    panel,
    scope: required(root, '[data-ssk-rotation-scope]'),
    target: required(root, '[data-ssk-rotation-target]'),
    values: Object.fromEntries(names.map((name) => [name, required(root, `[data-ssk-rotation-${name}]`)])),
    angle: required(root, '[data-ssk-rotation-angle]'),
    tolerance: required(root, '[data-ssk-rotation-tolerance]'),
    preview: required(root, '[data-ssk-rotation-preview]'),
    cancel: required(root, '[data-ssk-rotation-cancel]'),
    diagnosis: required(root, '[data-ssk-rotation-diagnosis]'),
    status: required(root, '[data-ssk-rotation-status]'),
  };
}
function exactNumber(element, label) {
  if (element.value.trim() === '') throw new TypeError(`${label} is required.`);
  const value = Number(element.value);
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}
function inputValue(state) {
  const value = state.elements.values;
  return {
    pivot: { x: exactNumber(value['pivot-x'], 'Pivot X'),
      y: exactNumber(value['pivot-y'], 'Pivot Y'), z: exactNumber(value['pivot-z'], 'Pivot Z') },
    axis: { x: exactNumber(value['axis-x'], 'Axis X'),
      y: exactNumber(value['axis-y'], 'Axis Y'), z: exactNumber(value['axis-z'], 'Axis Z') },
    angleDegrees: exactNumber(state.elements.angle, 'Angle'),
    profile: { boundaryTolerance: exactNumber(state.elements.tolerance, 'Boundary tolerance') },
  };
}
function diagnosisText(preview) {
  if (!preview) return 'No boundary diagnosis.';
  const rows = preview.boundaryDiagnosis.boundaries.map((row) => (
    `${row.boundaryId}\n  gap=${row.separationMagnitude}\n  ${row.disposition}`
  ));
  return [`Disposition: ${preview.previewDisposition}`,
    `Aggregate: ${preview.boundaryDiagnosis.aggregateDisposition}`, ...rows].join('\n');
}
function targetText(target) {
  if (!target) return 'No rotation target.';
  return `${target.scope} · seed ${target.seedComponentId} · ${target.affectedComponentIds.length} component(s) · ${target.boundaryCuts.length} boundary cut(s)${target.locks.length ? ` · locks: ${target.locks.join(', ')}` : ''}`;
}
function render(state) {
  setHidden(state.elements.panel, !state.active);
  state.elements.target.textContent = targetText(state.target);
  state.elements.preview.disabled = !state.active || !state.target || state.destroyed;
  state.elements.cancel.disabled = !state.preview || state.destroyed;
  state.elements.diagnosis.textContent = diagnosisText(state.preview);
  state.elements.status.textContent = state.notice || (state.target
    ? 'Enter pivot, axis and angle. Preview does not publish.' : 'Select confirmed geometry.');
}
function preview(state) {
  try {
    state.preview = state.onPreview(inputValue(state));
    state.notice = 'Rotation preview created. Boundary evidence must remain preserved before prepare.';
  } catch (error) {
    state.preview = null;
    state.notice = `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`;
  }
  render(state);
}
function cancel(state, reason = 'operator-cancel') {
  state.onCancel(reason); state.preview = null; state.notice = `Rotation preview cleared: ${reason}.`; render(state);
}
function bind(state) {
  state.handlers = {
    preview: () => preview(state), cancel: () => cancel(state),
    scope: () => { state.preview = null; state.notice = null; state.onScopeChange(state.elements.scope.value); },
  };
  state.elements.preview.addEventListener('click', state.handlers.preview);
  state.elements.cancel.addEventListener('click', state.handlers.cancel);
  state.elements.scope.addEventListener('change', state.handlers.scope);
}
function destroy(state) {
  if (state.destroyed) return false;
  state.destroyed = true;
  state.elements.preview.removeEventListener('click', state.handlers.preview);
  state.elements.cancel.removeEventListener('click', state.handlers.cancel);
  state.elements.scope.removeEventListener('change', state.handlers.scope);
  state.elements.panel.remove(); return true;
}
export function createSequentialRotationPanel(options = {}) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Rotation panel requires a root.');
  const panel = install(root);
  const state = {
    elements: elements(root, panel),
    onPreview: requiredFunction(options.onPreview, 'onPreview'),
    onCancel: requiredFunction(options.onCancel, 'onCancel'),
    onScopeChange: requiredFunction(options.onScopeChange, 'onScopeChange'),
    active: false, destroyed: false, target: null, preview: null, notice: null,
  };
  bind(state); render(state);
  return Object.freeze({
    schema: SEQUENTIAL_ROTATION_PANEL_SCHEMA,
    setActive(value) { state.active = value === true && !state.destroyed; render(state); },
    setTarget(target) { state.target = target; state.preview = null; state.notice = null; render(state); },
    clearTarget(reason = null) { state.target = null; state.preview = null; state.notice = reason; render(state); },
    setPreview(value, notice = null) { state.preview = value; state.notice = notice; render(state); },
    getScope: () => state.elements.scope.value || SEQUENTIAL_ROTATION_SCOPE.COMPONENT_ONLY,
    getState: () => Object.freeze({ active: state.active, scope: state.elements.scope.value,
      targetId: state.target?.rotationTargetId || null,
      operationId: state.preview?.operationId || null, destroyed: state.destroyed }),
    destroy: () => destroy(state),
  });
}
