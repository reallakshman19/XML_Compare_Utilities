import { DEFAULT_TOLERANCE_MM } from './sequential-sketcher-contract.js';
import { sequentialSketcherMarkup } from './sequential-sketcher-markup.js';
import { buildBranchInventory, listBranchIds, parseStagedJson, selectExactBranch } from './sequential-sketcher-source.js';
import {
  appendSupportDiagnostics,
  buildSequentialSketcherSupportProjection,
  decorateTopologyWithSupportProjection,
} from './sequential-sketcher-support.js';
import { buildBranchTopology } from './sequential-sketcher-topology.js';
import { planSequentialTraversal } from './sequential-sketcher-traversal.js';
import { renderInspector, renderMetrics, renderSequence, renderSketchSvg } from './sequential-sketcher-renderer.js';

function readFile(file) { return file ? file.text() : Promise.resolve(''); }
function required(root, selector) { const element = root.querySelector(selector); if (!element) throw new Error(`Sequential Sketcher element missing: ${selector}`); return element; }
function numberValue(element, fallback) { const value = Number(element.value); return Number.isFinite(value) ? value : fallback; }

export function mountSequentialSketcherWorkspace(root, context = {}) {
  root.innerHTML = sequentialSketcherMarkup();
  const elements = {
    source: required(root, '[data-ssk-source]'), branch: required(root, '[data-ssk-branch]'),
    tolerance: required(root, '[data-ssk-tolerance]'), supportTolerance: required(root, '[data-ssk-support-tolerance]'),
    onCenterline: required(root, '[data-ssk-on-centerline]'), supportAmbiguity: required(root, '[data-ssk-support-ambiguity]'),
    status: required(root, '[data-ssk-status]'), canvas: required(root, '[data-ssk-canvas]'),
    metrics: required(root, '[data-ssk-metrics]'), sequence: required(root, '[data-ssk-sequence]'),
    inspector: required(root, '[data-ssk-inspector]'), stepLabel: required(root, '[data-ssk-step-label]'),
  };
  const model = { records: null, inventory: null, topology: null, traversal: null, supportBundle: null, mode: 'ISO', step: -1 };
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
    model.inventory = buildBranchInventory(branch);

    // Pipe/fitting topology and pen traversal are authoritative and complete before support projection starts.
    const pipingTopology = buildBranchTopology(model.inventory, {
      toleranceMm: numberValue(elements.tolerance, DEFAULT_TOLERANCE_MM),
    });
    const pipingTraversal = planSequentialTraversal(pipingTopology);

    model.supportBundle = buildSequentialSketcherSupportProjection(
      model.inventory,
      pipingTopology,
      pipingTraversal,
      {
        projectionToleranceMm: numberValue(elements.supportTolerance, 50),
        onCenterlineToleranceMm: numberValue(elements.onCenterline, 0.001),
        ambiguityToleranceMm: numberValue(elements.supportAmbiguity, 1),
      },
    );
    model.topology = decorateTopologyWithSupportProjection(pipingTopology, model.supportBundle);
    model.traversal = appendSupportDiagnostics(pipingTraversal, model.topology);
    model.step = model.traversal.commands.length - 1;
    repaint();

    const errors = model.traversal.issues.filter((issue) => issue.severity === 'ERROR').length;
    const supports = model.topology.supportSummary;
    setStatus(
      `Compiled ${model.topology.components.length} components into ${model.traversal.routeSections.length} route sections; projected ${supports.familyCount} support families${supports.unresolvedCount ? `, ${supports.unresolvedCount} unresolved` : ''}${errors ? `, ${errors} blocking diagnostics` : ''}.`,
      errors ? 'warning' : supports.unresolvedCount ? 'warning' : 'ok',
    );
  }

  async function onChange(event) {
    if (event.target?.dataset?.sskFile !== 'source') return;
    elements.source.value = await readFile(event.target.files?.[0]);
    model.records = null;
    inspect();
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
