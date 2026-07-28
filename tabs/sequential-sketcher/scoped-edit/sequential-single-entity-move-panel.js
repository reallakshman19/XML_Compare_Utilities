/** Contained preview/cancel UI for one confirmed Sequential component translation. */
export const SEQUENTIAL_SINGLE_ENTITY_MOVE_PANEL_SCHEMA =
  'SequentialSingleEntityMovePanel.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function required(root, selector) {
  const value = root.querySelector(selector);
  if (!value) throw new Error(`Single-entity move panel element missing: ${selector}`);
  return value;
}
function setHidden(element, hidden) {
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (hidden) element.setAttribute('inert', ''); else element.removeAttribute('inert');
}
function markup() {
  return `<section data-ssk-single-move-panel hidden aria-hidden="true" inert>
<header><strong>Component move preview</strong><span>Preview / cancel only</span></header>
<output data-ssk-single-move-target>No confirmed pipe or fitting selected.</output>
<label>Constraint<select data-ssk-single-move-constraint>
<option value="X">Axis X</option><option value="Y">Axis Y</option><option value="Z">Axis Z</option>
<option value="XY" selected>Plane XY</option><option value="XZ">Plane XZ</option><option value="YZ">Plane YZ</option>
</select></label>
<div data-ssk-single-move-delta>
<label>ΔX<input type="number" step="any" value="0" data-ssk-single-move-axis="x"></label>
<label>ΔY<input type="number" step="any" value="0" data-ssk-single-move-axis="y"></label>
<label>ΔZ<input type="number" step="any" value="0" data-ssk-single-move-axis="z"></label>
</div>
<div><button type="button" data-ssk-single-move-preview disabled>Preview numeric</button>
<button type="button" data-ssk-single-move-cancel disabled>Cancel preview</button></div>
<pre data-ssk-single-move-diagnosis>No move preview is active.</pre>
<output data-ssk-single-move-status role="status" aria-live="polite">Select a confirmed component, then drag it or enter an exact delta.</output>
</section>`;
}
function install(root) {
  const host = required(root, '[data-ssk-visual-stack]');
  if (!root.querySelector('[data-ssk-single-move-panel]')) host.insertAdjacentHTML('beforeend', markup());
  const panel = required(root, '[data-ssk-single-move-panel]');
  panel.style.cssText = [
    'position:absolute', 'right:12px', 'top:12px', 'z-index:9',
    'width:min(390px,calc(100% - 24px))', 'padding:12px',
    'border:1px solid rgba(56,189,248,.5)', 'border-radius:12px',
    'background:rgba(7,16,31,.96)', 'color:#e2e8f0',
    'box-shadow:0 18px 50px rgba(0,0,0,.38)',
  ].join(';');
  panel.querySelector('[data-ssk-single-move-delta]').style.cssText =
    'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0';
  panel.querySelectorAll('input,select').forEach((element) => {
    element.style.cssText = 'box-sizing:border-box;width:100%;padding:6px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#07101f;color:#e2e8f0';
  });
  panel.querySelectorAll('button').forEach((button) => {
    button.style.cssText = 'margin:6px 6px 6px 0;padding:7px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#172337;color:#dbeafe';
  });
  return panel;
}
function numericDelta(elements) {
  return Object.freeze(Object.fromEntries(['x', 'y', 'z'].map((axis) => [
    axis,
    elements.axes[axis].value,
  ])));
}
function diagnosisText(preview) {
  if (!preview) return 'No move preview is active.';
  const rows = preview.boundaryDiagnosis.rows.map((row) => (
    `${row.selectedPortId} → ${row.stationaryPortId}: ${row.disposition} · gap ${row.separation.magnitude}`
  ));
  return [
    `Operation: ${preview.operationId}`,
    `Constraint: ${preview.constraint.kind === 'axis' ? preview.constraint.axis : preview.constraint.plane}`,
    `Delta: ${preview.delta.x}, ${preview.delta.y}, ${preview.delta.z}`,
    `Disposition: ${preview.previewDisposition}`,
    ...(rows.length ? rows : ['No stationary topology boundary cuts.']),
  ].join('\n');
}
function targetText(target) {
  if (!target) return 'No confirmed pipe or fitting selected.';
  return [
    `Component: ${target.componentId}`,
    `Type: ${target.canonicalType}`,
    `Parts: ${target.geometryPartIds.length}`,
    `Boundary cuts: ${target.boundaryCuts.length}`,
    `Application evidence: ${target.rigidMoveEligible ? 'RIGID_MOVE_ELIGIBLE' : 'PREVIEW_DIAGNOSIS_ONLY'}`,
  ].join('\n');
}
function render(state) {
  setHidden(state.elements.panel, !state.active);
  state.elements.preview.disabled = !state.active || !state.target || state.destroyed;
  state.elements.cancel.disabled = !state.preview || state.destroyed;
  state.elements.target.textContent = targetText(state.target);
  state.elements.diagnosis.textContent = diagnosisText(state.preview);
  state.elements.status.textContent = state.notice
    || (state.preview
      ? 'Draft overlay is active. Pointer release did not publish geometry.'
      : 'Select a confirmed component, then drag it or enter an exact delta.');
}
function elements(root, panel) {
  return {
    panel,
    target: required(root, '[data-ssk-single-move-target]'),
    constraint: required(root, '[data-ssk-single-move-constraint]'),
    preview: required(root, '[data-ssk-single-move-preview]'),
    cancel: required(root, '[data-ssk-single-move-cancel]'),
    diagnosis: required(root, '[data-ssk-single-move-diagnosis]'),
    status: required(root, '[data-ssk-single-move-status]'),
    axes: Object.fromEntries(['x', 'y', 'z'].map((axis) => [
      axis,
      required(root, `[data-ssk-single-move-axis="${axis}"]`),
    ])),
  };
}
function previewNumeric(state) {
  try {
    state.preview = state.onPreview({
      constraint: state.elements.constraint.value,
      delta: numericDelta(state.elements),
    });
    state.notice = 'Exact numeric draft created. Nothing was published.';
  } catch (error) {
    state.notice = `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`;
  }
  render(state);
}
function cancelPreview(state) {
  state.onCancel('operator-cancel');
  state.preview = null;
  state.notice = 'Move preview cancelled without authority mutation.';
  render(state);
}
function setPanelTarget(state, target) {
  state.target = target;
  state.preview = null;
  state.notice = 'Target selected. Drag the selected component or preview an exact delta.';
  ['x', 'y', 'z'].forEach((axis) => { state.elements.axes[axis].value = '0'; });
  render(state);
}
function destroyPanel(state) {
  if (state.destroyed) return false;
  state.destroyed = true;
  state.elements.preview.removeEventListener('click', state.previewHandler);
  state.elements.cancel.removeEventListener('click', state.cancelHandler);
  state.elements.panel.remove();
  return true;
}

export function createSequentialSingleEntityMovePanel(options = {}) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Single-entity move panel requires a root.');
  const panel = install(root);
  const state = {
    elements: elements(root, panel),
    onPreview: requiredFunction(options.onPreview, 'onPreview'),
    onCancel: requiredFunction(options.onCancel, 'onCancel'),
    active: false, destroyed: false, target: null, preview: null, notice: null,
  };
  state.previewHandler = () => previewNumeric(state);
  state.cancelHandler = () => cancelPreview(state);
  state.elements.preview.addEventListener('click', state.previewHandler);
  state.elements.cancel.addEventListener('click', state.cancelHandler);
  render(state);
  return Object.freeze({
    schema: SEQUENTIAL_SINGLE_ENTITY_MOVE_PANEL_SCHEMA,
    setActive(value) { state.active = value === true && !state.destroyed; render(state); },
    setTarget: (target) => setPanelTarget(state, target),
    clearTarget(reason = null) {
      state.target = null; state.preview = null; state.notice = reason; render(state);
    },
    setPreview(preview, notice = null) {
      state.preview = preview; state.notice = notice; render(state);
    },
    getConstraint: () => state.elements.constraint.value,
    getState: () => Object.freeze({
      active: state.active,
      targetId: state.target?.moveTargetId || null,
      operationId: state.preview?.operationId || null,
      constraint: state.elements.constraint.value,
      destroyed: state.destroyed,
    }),
    destroy: () => destroyPanel(state),
  });
}
