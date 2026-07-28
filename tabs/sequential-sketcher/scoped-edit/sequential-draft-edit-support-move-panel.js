/** Contained numeric UI for non-publishing support move drafts. */
export const SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_PANEL_SCHEMA =
  'SequentialDraftEditSupportMovePanel.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function required(root, selector) {
  const value = root.querySelector(selector);
  if (!value) throw new Error(`Support move panel element missing: ${selector}`);
  return value;
}
function setHidden(element, hidden) {
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (hidden) element.setAttribute('inert', ''); else element.removeAttribute('inert');
}
function panelMarkup() {
  return `<section data-ssk-support-move-panel hidden aria-hidden="true" inert>
<header><strong>Support move draft</strong><span>Exact XYZ preview only</span></header>
<output data-ssk-support-move-target>No confirmed support selected.</output>
<div data-ssk-support-move-coordinates>
<label>X<input type="number" step="any" data-ssk-support-move-coordinate="x"></label>
<label>Y<input type="number" step="any" data-ssk-support-move-coordinate="y"></label>
<label>Z<input type="number" step="any" data-ssk-support-move-coordinate="z"></label>
</div>
<div><button type="button" data-ssk-support-move-preview disabled>Preview move draft</button><button type="button" data-ssk-support-move-cancel disabled>Cancel draft</button></div>
<output data-ssk-support-move-status role="status" aria-live="polite">Preview does not publish authority.</output>
</section>`;
}
function install(root) {
  const host = required(root, '[data-ssk-visual-stack]');
  if (!root.querySelector('[data-ssk-support-move-panel]')) {
    host.insertAdjacentHTML('beforeend', panelMarkup());
  }
  const panel = required(root, '[data-ssk-support-move-panel]');
  panel.style.cssText = [
    'position:absolute', 'left:12px', 'top:12px', 'z-index:8',
    'width:min(330px,calc(100% - 24px))', 'padding:12px',
    'border:1px solid rgba(250,204,21,.45)', 'border-radius:12px',
    'background:rgba(7,16,31,.96)', 'color:#e2e8f0',
    'box-shadow:0 18px 50px rgba(0,0,0,.38)',
  ].join(';');
  panel.querySelector('[data-ssk-support-move-coordinates]').style.cssText =
    'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0';
  panel.querySelectorAll('input').forEach((input) => {
    input.style.cssText = 'box-sizing:border-box;width:100%;padding:6px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#07101f;color:#e2e8f0';
  });
  panel.querySelectorAll('button').forEach((button) => {
    button.style.cssText = 'margin-right:6px;padding:7px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#172337;color:#dbeafe';
  });
  return panel;
}
function pointFromInputs(elements) {
  return Object.freeze(Object.fromEntries(['x', 'y', 'z'].map((axis) => [
    axis, elements.coordinates[axis].value,
  ])));
}
function render(state) {
  setHidden(state.elements.panel, !state.active);
  state.elements.preview.disabled = !state.active || !state.target || state.destroyed;
  state.elements.cancel.disabled = !state.preview;
  state.elements.target.textContent = state.target
    ? `Support: ${state.target.supportId}\nFamily: ${state.target.familyId}\nCarrier: ${state.target.carrierId}\nEntity: ${state.target.entityId}`
    : 'No confirmed support selected.';
  state.elements.status.textContent = state.notice
    || (state.preview
      ? `Draft ${state.preview.operationId}\nDelta: ${state.preview.delta.magnitude}`
      : 'Preview does not publish authority.');
}

export function createSequentialDraftEditSupportMovePanel(options = {}) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Support move panel requires a root.');
  const panel = install(root);
  const elements = {
    panel,
    target: required(root, '[data-ssk-support-move-target]'),
    status: required(root, '[data-ssk-support-move-status]'),
    preview: required(root, '[data-ssk-support-move-preview]'),
    cancel: required(root, '[data-ssk-support-move-cancel]'),
    actor: required(root, '[data-ssk-draft-edit-actor]'),
    reason: required(root, '[data-ssk-draft-edit-reason]'),
    evidence: required(root, '[data-ssk-draft-edit-evidence]'),
    coordinates: Object.fromEntries(['x', 'y', 'z'].map((axis) => [
      axis, required(root, `[data-ssk-support-move-coordinate="${axis}"]`),
    ])),
  };
  const state = {
    elements,
    onPreview: requiredFunction(options.onPreview, 'onPreview'),
    onCancel: requiredFunction(options.onCancel, 'onCancel'),
    active: false, destroyed: false, target: null, preview: null, notice: null,
  };
  async function preview() {
    try {
      state.preview = await state.onPreview({
        position: pointFromInputs(elements),
        actorId: elements.actor.value,
        reason: elements.reason.value,
        evidenceNote: elements.evidence.value,
      });
      state.notice = `Draft preview created. Nothing has been applied or published.`;
    } catch (error) {
      state.notice = `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`;
    }
    render(state);
  }
  function cancel() {
    state.onCancel('operator-cancel');
    state.preview = null; state.notice = 'Draft cancelled without authority mutation.';
    render(state);
  }
  elements.preview.addEventListener('click', preview);
  elements.cancel.addEventListener('click', cancel);
  render(state);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_PANEL_SCHEMA,
    setActive(value) { state.active = value === true && !state.destroyed; render(state); },
    setTarget(target) {
      state.target = target; state.preview = null; state.notice = null;
      for (const axis of ['x', 'y', 'z']) elements.coordinates[axis].value = String(target.originalPosition[axis]);
      render(state);
    },
    clearTarget(reason = null) {
      state.target = null; state.preview = null; state.notice = reason; render(state);
    },
    setPreview(value) { state.preview = value; render(state); },
    getState: () => Object.freeze({
      active: state.active, targetId: state.target?.supportMoveTargetId || null,
      supportId: state.target?.supportId || null,
      operationId: state.preview?.operationId || null,
      destroyed: state.destroyed,
    }),
    destroy() {
      if (state.destroyed) return false;
      state.destroyed = true;
      elements.preview.removeEventListener('click', preview);
      elements.cancel.removeEventListener('click', cancel);
      panel.remove();
      return true;
    },
  });
}
