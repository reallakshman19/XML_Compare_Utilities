import {createPreviewSession} from './compare.js';
import {exportPreview} from './evidence.js';
import {graphInfo, renderAnchors, renderRows, selectedDetails, mountScene, selectedGeometryObjects} from './view.js';
import {createGeoViewerBridge} from './geo-viewer-bridge.js';

import {setupReviewViewport} from './review-viewport.js';

const session = createPreviewSession(), byId = id => document.getElementById(id);
setupReviewViewport({byId, documentRef:document});
let viewport = null, selected = [], selectedElement = null, selectedPick = null, gpuRequested = false;
let viewerRequest = 0; // UI ownership token; the bridge independently rejects stale scene/picks.
function status(message, error = false) {
  byId('status').textContent = message; byId('status').classList.toggle('error', error);
}
const bridge = createGeoViewerBridge({host:byId('gpu-host'),session,
  onSelect:pick => select(pick.sourceRows, pick.kind === 'ELEMENT' ? pick.side + ':' + pick.elementIndex : null,pick),
  onError: error => { disableGpu(); status('3D viewer: ' + error.message, true); }});
function disableGpu() {
  viewerRequest++; // Revokes every older asynchronous UI continuation, even while a viewer is pending.
  gpuRequested = false; bridge.disable(); byId('gpu-host').hidden = true;
  byId('svg-layer').hidden = false; byId('toggle-gpu').textContent = 'Use existing 3D viewer';
  byId('viewer-layout').disabled = true;
  for (const id of ['zoom-in','zoom-out','reset-view']) byId(id).disabled = false;
}
function revoke(message = 'Inputs changed. Run Method C again for current evidence.') {
  session.invalidate(); disableGpu(); viewport = null; selected = []; selectedElement = null; selectedPick = null;
  document.querySelectorAll('[data-export]').forEach(button => { button.disabled = true; });
  byId('svg-layer').replaceChildren(); byId('rows').replaceChildren();
  byId('toggle-gpu').disabled = true;
  byId('summary').textContent = ''; byId('details').textContent = 'Current comparison required.';
  status(message);
}
function anchors() {
  renderAnchors(session, byId('anchors'), index => {
    session.removeAnchor(index); revoke('Anchor removed. Run again.'); anchors();
  });
}
async function load(side, file) {
  revoke('Loading ' + side + ' XML; previous results and exports revoked.');
  byId(side.toLowerCase() + '-info').textContent = 'Loading…';
  if (!file) {
    await session.load(side, new Uint8Array(), '').catch(() => {});
    byId(side.toLowerCase() + '-info').textContent = 'No XML selected.'; anchors(); return;
  }
  try {
    const pending = session.load(side, file.arrayBuffer().then(buffer => new Uint8Array(buffer)), file.name);
    anchors(); const loaded = await pending;
    if (!loaded) return;
    byId(side.toLowerCase() + '-info').textContent = graphInfo(session.state.graphs[side]);
    anchors(); status('XML geometry loaded. Add manual node pairs, then run Method C.');
  } catch (error) {
    byId(side.toLowerCase() + '-info').textContent = 'Load failed: ' + error.message;
    anchors(); status(error.message, true);
  }
}
function parameters() {
  session.configure({projection: byId('projection').value,
    tolerance: Object.fromEntries(['x','y','z'].map(axis => [axis, byId('tol-' + axis).value === '' ? NaN : Number(byId('tol-' + axis).value)]))});
}
function select(sources, element = null, pick = null) {
  let result;
  try { result = session.current(); } catch { return; }
  selected = [...new Set((Array.isArray(sources) ? sources : [sources]).filter(Boolean))];
  selectedElement = element; selectedPick = pick;
  renderRows(result, byId('rows'), select, selected);
  viewport = mountScene(result, byId('svg-layer'), select, selected, selectedElement);
  byId('details').textContent = selectedElement && !selectedPick ?
    JSON.stringify((element.startsWith('SOURCE:') ? result.source : result.target)
      .edges[Number(element.split(':')[1])], null, 2) : selectedDetails(result, selected, selectedPick);
  if (bridge.isActive()) {
    const ids = selectedGeometryObjects(result, selected, selectedPick);
    bridge.setSelection(ids[0] || null, ids.slice(1));
  }
}
function run() {
  revoke();
  try {
    parameters(); const result = session.run(); select(result.candidates.rows[0]?.source || null);
    byId('projection-label').textContent = result.projection === 'ISO' ? 'ISO · NON-METRIC oblique' :
      result.projection + ' metric orthographic overlay · mm';
    byId('summary').textContent = result.candidates.rows.length + ' SOURCE nodes · ' +
      result.candidates.nearSourceCount + ' with nearby TARGET node(s) · ' + JSON.stringify(result.candidates.counts);
    status(result.transform.status + '\n' + result.transform.anchors.length + ' experimental anchor(s); max residual ' +
      result.transform.maxResidualMm.toFixed(6) + ' mm. Physical identities qualified: 0. CII provenance not reverified.');
    document.querySelectorAll('[data-export]').forEach(button => { button.disabled = false; });
    byId('toggle-gpu').disabled = false;
  } catch (error) { status(error.message, true); }
}
async function toggleViewer() {
  if (gpuRequested) { disableGpu(); return; }
  let result;
  try { result = session.current(); } catch { status('Run Method C before switching viewers.', true); return; }
  const request = ++viewerRequest;
  gpuRequested = true; byId('toggle-gpu').disabled = true;
  byId('gpu-host').hidden = false; // Renderer needs measured container dimensions during startup.
  let cleanedOwnRequest = false;
  try {
    const ok = await bridge.enable({mode:byId('viewer-layout').value,projection:result.projection});
    if (request !== viewerRequest) return; // Obsolete A must not clean up live/pending B.
    if (!ok || !gpuRequested || session.current() !== result) {
      disableGpu(); cleanedOwnRequest = true; return;
    }
    byId('svg-layer').hidden = true; byId('gpu-host').hidden = false;
    byId('viewer-layout').disabled = false;
    byId('toggle-gpu').textContent = 'Use SVG viewer';
    for (const id of ['zoom-in','zoom-out','reset-view']) byId(id).disabled = false;
    status('Existing 3D Edit viewer · ' + (result.projection === 'ISO' ?
      'perspective NON-METRIC' : result.projection + ' orthographic · mm') +
      ' · centerline-only display; no physical correspondence certified.');
    select(selected, selectedElement, selectedPick);
  } catch (error) {
    if (request !== viewerRequest) return; // Stale rejection cannot alter current B status/UI.
    disableGpu(); cleanedOwnRequest = true;
    status('3D viewer unavailable; SVG remains usable. ' + error.message, true);
  } finally {
    if (request === viewerRequest || cleanedOwnRequest)
      byId('toggle-gpu').disabled = !session.state.result;
  }
}
function download(kind) {
  try {
    const content = exportPreview(session, kind), type = {svg:'image/svg+xml',json:'application/json',csv:'text/csv'}[kind];
    const uri = URL.createObjectURL(new Blob([content], {type})), anchor = document.createElement('a');
    anchor.href = uri; anchor.download = 'CIIFR-XML-Geometry-Preview.' + kind;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(uri), 1000);
  } catch (error) { revoke(); status(error.message, true); }
}
['SOURCE','TARGET'].forEach(side => byId(side.toLowerCase() + '-file').addEventListener('change',
  event => load(side, event.target.files[0])));
byId('add-anchor').addEventListener('click', () => {
  revoke();
  try { session.addAnchor(byId('anchor-source').value, byId('anchor-target').value); anchors(); status('Anchor added. Run Method C.'); }
  catch (error) { status(error.message, true); }
});
['anchor-source','anchor-target','tol-x','tol-y','tol-z','projection'].forEach(id =>
  byId(id).addEventListener('input', () => revoke()));
byId('run').addEventListener('click', run);
byId('toggle-gpu').addEventListener('click', toggleViewer);
byId('viewer-layout').addEventListener('change', event => bridge.setMode(event.target.value));
byId('zoom-in').addEventListener('click', () => bridge.isActive() ? bridge.command('zoom', 0.8) : viewport?.zoom(0.8));
byId('zoom-out').addEventListener('click', () => bridge.isActive() ? bridge.command('zoom', 1.25) : viewport?.zoom(1.25));
byId('reset-view').addEventListener('click', () => bridge.isActive() ? bridge.command('fit') : viewport?.reset());
window.addEventListener('pagehide', () => bridge.disable());
document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => download(button.dataset.export)));

for (const button of document.querySelectorAll('[data-viewer-command]'))
  button.addEventListener('click', () => bridge.command(button.dataset.viewerCommand));
byId('camera-view').addEventListener('change', event => {
  bridge.command('view', event.target.value);
});
byId('orbit-left').addEventListener('click', () => bridge.command('orbit', [0.2, 0]));
byId('orbit-right').addEventListener('click', () => bridge.command('orbit', [-0.2, 0]));
byId('select-node').addEventListener('click', () => {
  try {
    const objects = Object.values(session.current().viewerScene.objects);
    const object = objects.find(o => o.kind === 'NODE' && o.side === byId('node-side').value &&
      o.nodeId === byId('node-id').value.trim());
    if (!object) { status('No physical NODE with that ID in the current registered component.', true); return; }
    select(object.sourceRows, null, object);
  } catch { status('Run Method C before selecting a physical NODE.', true); }
});
