/** Explicit per-controller 3D canvas runtime for Topology Edit Draft. */

import { createVisualGeometryModelV2 } from '../../contracts/visual-geometry-model.js';
import { wireTopologyEditGestures } from './topology-edit-3d-gestures.js?v=20260717-ttv-components-v1';
import { COMPONENT_COLORS, buildBoreIndex, componentKindForEdge, visualGeometry } from './topology-edit-3d-geometry.js';
import { createTopologyMeasurement, formatTopologyMeasurement } from './topology-edit-measurement.js?v=20260717-phase1-runtime';
import { asArray, cleanText } from './topology-validator-values.js';

export { COMPONENT_COLORS, buildBoreIndex, visualGeometry } from './topology-edit-3d-geometry.js';

function canvasMarkup() {
  return '<div class="ttv-edit-3d-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></div>'
    + '<div class="ttv-edit-3d-controls" style="position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:6px;z-index:10;">'
    + '<button type="button" class="ttv-3d-btn" data-view="fit">Fit</button><button type="button" class="ttv-3d-btn" data-view="iso">ISO</button></div>'
    + '<aside class="ttv-measure-panel" data-ttv-measure-panel hidden><header><b>Measure</b><span data-ttv-measure-state></span></header>'
    + '<div class="ttv-measure-summary"><span data-ttv-measure-count>0 points</span><strong data-ttv-measure-total>0 mm</strong></div>'
    + '<table><tbody data-ttv-measure-segments><tr><td colspan="2">No segments yet.</td></tr></tbody></table>'
    + '<button type="button" data-ttv-measure-clear>Clear</button></aside>';
}

function createVisualModel(canonical, validation, input, boreIndex, role) {
  const primitives = visualGeometry(canonical, validation, input.verticalAxis, boreIndex, input.supportScale);
  const hash = cleanText(canonical.canonicalTopologyHash) || cleanText(canonical.schema);
  return createVisualGeometryModelV2({
    modelId: `topology:${role}:${hash}`, documentId: input.platformDocument.documentId,
    revisionId: `${role}:${hash}`, unit: input.platformDocument.unit,
    coordinateFrame: input.platformDocument.coordinateFrame, verticalAxis: input.verticalAxis,
    origin: [0, 0, 0], segments: primitives.segments, markers: primitives.markers, bounds: primitives.bounds,
  });
}

function wireViewButtons(host, state) {
  host.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    if (button.getAttribute('data-view') === 'fit') state.viewer?.fitAll();
    else state.viewer?.setStandardView('iso');
  }));
}

function createRuntimeState() {
  return {
    viewer: null, host: null, pending: null, disposeGestures: () => {}, callbacks: null, currentInput: null,
    mountSequence: 0, renderSequence: 0, measurement: createTopologyMeasurement(),
  };
}

function teardownRuntime(state) {
  state.mountSequence += 1; state.disposeGestures(); state.disposeGestures = () => {}; state.measurement.reset();
  state.viewer?.dispose(); state.viewer = null; state.host = null; state.pending = null;
  state.callbacks = null; state.currentInput = null;
}

async function mountViewer(state, host, sequence) {
  const canvasHost = host.querySelector('.ttv-edit-3d-canvas');
  const { createWorkbenchViewer } = await import('../../workbench3d/viewer/workbench-viewer.js?v=20260717-ttv-components-v1');
  const created = await createWorkbenchViewer(canvasHost, {});
  if (sequence !== state.mountSequence || state.host !== host) { created.dispose(); return null; }
  state.viewer = created;
  state.disposeGestures = wireTopologyEditGestures({
    host: canvasHost, viewer: () => state.viewer, callbacks: () => state.callbacks, input: () => state.currentInput,
  });
  wireViewButtons(host, state); state.measurement.bind(state.viewer, host);
  return state.viewer;
}

async function ensureViewer(state, host) {
  if (state.viewer && state.host === host) return state.viewer;
  if (state.pending && state.host === host) return state.pending;
  teardownRuntime(state); state.host = host; host.innerHTML = canvasMarkup();
  if (!host.style.position) host.style.position = 'relative';
  const sequence = state.mountSequence;
  state.pending = mountViewer(state, host, sequence).finally(() => { if (sequence === state.mountSequence) state.pending = null; });
  return state.pending;
}

async function renderCanvas(state, host, input) {
  if (!input?.platformDocument) throw new TypeError('Topology canvas requires a ProjectDocument.v1 platform document.');
  const sequence = ++state.renderSequence;
  const nextCallbacks = Object.freeze({ ...input.callbacks, onMeasurePoint: state.measurement.addPoint });
  const viewer = await ensureViewer(state, host);
  if (!viewer || sequence !== state.renderSequence) return;
  state.callbacks = nextCallbacks; state.currentInput = input; viewer.setVerticalAxis(input.verticalAxis);
  const boreIndex = buildBoreIndex(input.sourceBranches);
  viewer.setModels({
    source: createVisualModel(input.original, null, input, boreIndex, 'original'),
    target: createVisualModel(input.draft, input.validation, input, boreIndex, 'draft'),
    registrationTranslation: [0, 0, 0],
  });
  viewer.setGhostModel(input.ghost ?? null); state.measurement.sync();
  const ids = input.selection.map((row) => row.id); viewer.setSelection(ids.at(-1) ?? '', ids.slice(0, -1));
  if (!host.dataset.fitted) { viewer.fitAll(); host.dataset.fitted = 'true'; }
}

function runtimeNavigation(state) {
  return Object.freeze({
    fit: () => state.viewer?.fitAll(), zoomIn: () => state.viewer?.zoomBy(1 / 1.2), zoomOut: () => state.viewer?.zoomBy(1.2),
    fitObjectKey: (key) => { const id = cleanText(key).split(':').pop(); if (id) state.viewer?.fitObject(id); },
    setStandardView: (view) => state.viewer?.setStandardView(view), destroy: () => {},
    toggleCameraType: () => {
      if (state.viewer) {
        state.viewer.toggleCameraType();
        return state.viewer.activeCameraType;
      }
      return 'Perspective';
    },
    setPivot: (xyz) => state.viewer?.controls?.setPivot(xyz),
    setPivotToSelection: () => state.viewer?.setPivotToSelection(),
  });
}

/** Create one isolated viewer/gesture/measurement lifecycle for one Edit controller. */
export function createTopologyEditCanvasRuntime() {
  const state = createRuntimeState();
  return Object.freeze({
    render: (host, input) => renderCanvas(state, host, input), navigation: () => runtimeNavigation(state),
    setMeasurementActive: state.measurement.setActive, addMeasurementPoint: state.measurement.addPoint, clearMeasurement: state.measurement.clear,
    selectObjects: (ids) => { const clean = asArray(ids).map(cleanText).filter(Boolean); state.viewer?.setSelection(clean.at(-1) ?? '', clean.slice(0, -1)); },
    setGhostModel: (model) => state.viewer?.setGhostModel(model ?? null), projectPoint: (xyz) => state.viewer?.projectPoint(xyz) ?? null,
    viewer: () => state.viewer, evidence: () => Object.freeze({ mounted: Boolean(state.viewer), measurement: state.measurement.evidence() }),
    dispose: () => teardownRuntime(state),
  });
}

export const _test = Object.freeze({ componentKindForEdge, formatTopologyMeasurement });
