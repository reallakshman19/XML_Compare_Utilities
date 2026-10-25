import {createPreviewSession} from './compare.js';
import {exportPreview} from './evidence.js';
import {graphInfo, renderAnchors, renderRows, selectedDetails, mountScene} from './view.js';

const session = createPreviewSession(), byId = id => document.getElementById(id);
let viewport = null, selected = null, selectedElement = null;
function status(message, error = false) {
  byId('status').textContent = message; byId('status').classList.toggle('error', error);
}
function revoke(message = 'Inputs changed. Run Method C again for current evidence.') {
  session.invalidate(); viewport = null; selected = null; selectedElement = null;
  document.querySelectorAll('[data-export]').forEach(button => { button.disabled = true; });
  byId('canvas').replaceChildren(); byId('rows').replaceChildren();
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
    // load() revokes old graph/anchors before either file reading or hashing finishes.
    const pending = session.load(side, file.arrayBuffer().then(buffer => new Uint8Array(buffer)), file.name);
    anchors();
    const loaded = await pending;
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
function select(source, element = null) {
  if (!session.state.result) return;
  selected = source; selectedElement = element;
  const result = session.current();
  renderRows(result, byId('rows'), select, selected);
  viewport = mountScene(result, byId('canvas'), select, selected, selectedElement);
  byId('details').textContent = element ? JSON.stringify((element.startsWith('SOURCE:') ? result.source : result.target)
    .edges[Number(element.split(':')[1])], null, 2) : selectedDetails(result, selected);
}
function run() {
  revoke();
  try {
    parameters(); const result = session.run(); select(result.candidates.rows[0]?.source || null);
    byId('projection-label').textContent = result.projection === 'ISO' ? 'ISO · NON-METRIC oblique' : result.projection + ' metric overlay · mm';
    byId('summary').textContent = result.candidates.rows.length + ' SOURCE nodes · ' +
      result.candidates.nearSourceCount + ' with nearby TARGET node(s) · ' + JSON.stringify(result.candidates.counts);
    status(result.transform.status + '\n' + result.transform.anchors.length + ' experimental anchor(s); max residual ' +
      result.transform.maxResidualMm.toFixed(6) + ' mm. Physical identities qualified: 0. CII provenance not reverified.');
    document.querySelectorAll('[data-export]').forEach(button => { button.disabled = false; });
  } catch (error) { status(error.message, true); }
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
byId('zoom-in').addEventListener('click', () => viewport?.zoom(0.8));
byId('zoom-out').addEventListener('click', () => viewport?.zoom(1.25));
byId('reset-view').addEventListener('click', () => viewport?.reset());
document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => download(button.dataset.export)));
