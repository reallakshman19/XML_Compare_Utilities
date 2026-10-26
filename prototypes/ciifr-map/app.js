import {createPreviewSession} from './compare.js';
import {exportPreview} from './evidence.js';
import {graphInfo, renderAnchors, renderRows, selectedDetails, mountScene} from './view.js';
import {createGeoViewerBridge} from './geo-viewer-bridge.js';

const session = createPreviewSession(), byId = id => document.getElementById(id);
let viewport = null, selected = [], selectedElement = null, selectedPick = null, gpuRequested = false;
function status(message, error = false) {
  byId('status').textContent = message; byId('status').classList.toggle('error', error);
}
const bridge = createGeoViewerBridge({host:byId('gpu-host'),session,
  onSelect:pick => select(pick.sourceRows, pick.kind === 'ELEMENT' ? pick.side + ':' + pick.elementIndex : null,pick),
  onError: error => { disableGpu(); status('3D viewer: ' + error.message, true); }});
function disableGpu() {
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
    const sourceId = Object.values(result.viewerScene.objects).find(item => item.side === 'SOURCE' &&
      item.kind === 'NODE' && item.nodeId === selected[0])?.objectId;
    bridge.setSelection(selectedPick?.objectId || sourceId || null);
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
  gpuRequested = true; byId('toggle-gpu').disabled = true;
  byId('gpu-host').hidden = false; // Renderer needs measured container dimensions during startup.
  try {
    const ok = await bridge.enable({mode:byId('viewer-layout').value,projection:result.projection});
    if (!ok || !gpuRequested || session.current() !== result) { disableGpu(); return; }
    byId('svg-layer').hidden = true; byId('gpu-host').hidden = false;
    byId('viewer-layout').disabled = false;
    byId('toggle-gpu').textContent = 'Use SVG viewer';
    for (const id of ['zoom-in','zoom-out','reset-view']) byId(id).disabled = true;
    status('Existing 3D Edit viewer · ' + (result.projection === 'ISO' ?
      'perspective NON-METRIC' : result.projection + ' orthographic · mm') +
      ' · centerline-only display; no physical correspondence certified.');
    select(selected, selectedElement, selectedPick);
  } catch (error) {
    disableGpu(); status('3D viewer unavailable; SVG remains usable. ' + error.message, true);
  } finally { byId('toggle-gpu').disabled = !session.state.result; }
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
byId('zoom-in').addEventListener('click', () => viewport?.zoom(0.8));
byId('zoom-out').addEventListener('click', () => viewport?.zoom(1.25));
byId('reset-view').addEventListener('click', () => viewport?.reset());
window.addEventListener('pagehide', () => bridge.disable());
document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => download(button.dataset.export)));
