import { DEFAULT_TOLERANCE_MM } from './sequential-sketcher-contract.js';
import { sequentialSketcherMarkup } from './sequential-sketcher-markup.js';
import { buildBranchInventory, listBranchIds, parseStagedJson, parseSupportBundle, selectExactBranch } from './sequential-sketcher-source.js';
import { buildBranchTopology } from './sequential-sketcher-topology.js';
import { planSequentialTraversal } from './sequential-sketcher-traversal.js';
import { renderInspector, renderMetrics, renderSequence, renderSketchSvg } from './sequential-sketcher-renderer.js';

function readFile(file) { return file ? file.text() : Promise.resolve(''); }
function required(root, selector) { const element = root.querySelector(selector); if (!element) throw new Error(`Sequential Sketcher element missing: ${selector}`); return element; }

export function mountSequentialSketcherWorkspace(root, context = {}) {
  root.innerHTML = sequentialSketcherMarkup();
  const elements = {
    source: required(root, '[data-ssk-source]'), supports: required(root, '[data-ssk-supports]'), branch: required(root, '[data-ssk-branch]'),
    tolerance: required(root, '[data-ssk-tolerance]'), status: required(root, '[data-ssk-status]'), canvas: required(root, '[data-ssk-canvas]'),
    metrics: required(root, '[data-ssk-metrics]'), sequence: required(root, '[data-ssk-sequence]'), inspector: required(root, '[data-ssk-inspector]'), stepLabel: required(root, '[data-ssk-step-label]'),
  };
  const model = { records: null, topology: null, traversal: null, mode: 'ISO', step: -1 };
  const setStatus = (message, state = 'info') => { elements.status.textContent = message; elements.status.dataset.state = state; };

  function inspect() {
    model.records = parseStagedJson(elements.source.value);
    const ids = listBranchIds(model.records);
    elements.branch.innerHTML = `<option value="">Select exact branch (${ids.length})</option>${ids.map(() => '<option></option>').join('')}`;
    [...elements.branch.options].slice(1).forEach((option, index) => { option.value = ids[index]; option.textContent = ids[index]; });
    setStatus(`${ids.length} branch records indexed. Select one exact branch.`, 'ok');
  }

  function repaint() {
    if (!model.topology || !model.traversal) return;
    renderSketchSvg(elements.canvas, model.topology, model.traversal, { mode: model.mode, step: model.step });
    renderMetrics(elements.metrics, model.topology, model.traversal);
    renderSequence(elements.sequence, model.traversal, model.step);
    renderInspector(elements.inspector, model.topology, model.traversal);
    elements.stepLabel.textContent = `${Math.max(0, model.step + 1)} / ${model.traversal.commands.length}`;
  }

  function compile() {
    if (!model.records) inspect();
    const branch = selectExactBranch(model.records, elements.branch.value);
    const inventory = buildBranchInventory(branch);
    const supportBundle = parseSupportBundle(elements.supports.value);
    model.topology = buildBranchTopology(inventory, { toleranceMm: Number(elements.tolerance.value || DEFAULT_TOLERANCE_MM), supportBundle });
    model.traversal = planSequentialTraversal(model.topology);
    model.step = model.traversal.commands.length - 1;
    repaint();
    const errors = model.traversal.issues.filter((issue) => issue.severity === 'ERROR').length;
    setStatus(`Compiled ${model.topology.components.length} components into ${model.traversal.routeSections.length} route sections${errors ? ` with ${errors} blocking diagnostics` : ''}.`, errors ? 'warning' : 'ok');
  }

  async function onChange(event) {
    const fileKind = event.target?.dataset?.sskFile;
    if (!fileKind) return;
    const value = await readFile(event.target.files?.[0]);
    if (fileKind === 'source') { elements.source.value = value; model.records = null; inspect(); }
    if (fileKind === 'supports') elements.supports.value = value;
  }

  function onClick(event) {
    const view = event.target?.closest?.('[data-ssk-view]')?.dataset?.sskView;
    if (view) { model.mode = view; root.querySelectorAll('[data-ssk-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.sskView === view)); repaint(); return; }
    const step = event.target?.closest?.('[data-ssk-step]')?.dataset?.sskStep;
    if (step !== undefined) { model.step = Number(step); repaint(); return; }
    const action = event.target?.closest?.('[data-ssk-action]')?.dataset?.sskAction;
    if (!action) return;
    try {
      if (action === 'inspect') inspect();
      if (action === 'compile') compile();
      if (action === 'previous' && model.traversal) { model.step = Math.max(-1, model.step - 1); repaint(); }
      if (action === 'next' && model.traversal) { model.step = Math.min(model.traversal.commands.length - 1, model.step + 1); repaint(); }
      if (action === 'all' && model.traversal) { model.step = model.traversal.commands.length - 1; repaint(); }
      if (action === 'close') context.close?.();
    } catch (error) { setStatus(error.message || String(error), 'error'); context.showToast?.(error.message || String(error), 'error'); }
  }

  root.addEventListener('click', onClick); root.addEventListener('change', onChange);
  return Object.freeze({
    getModel: () => model,
    destroy: () => { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); root.innerHTML = ''; },
  });
}
