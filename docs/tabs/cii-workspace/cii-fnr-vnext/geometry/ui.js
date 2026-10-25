import { buildOriginalGraphFromBytes } from '../../cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../../cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../../cii-workspace-method-c-candidates.js';
import { methodCSvgScene } from '../../cii-workspace-method-c-svg.js';
import { methodCEvidence, methodCCsvExport, methodCJsonExport, methodCSvgExport } from '../../cii-workspace-method-c-exports.js';
import { pairedMethodCViews, sharedViewBox } from './scene.js';

const entry = (key, label, value, type = 'number') => `<label>${label} <input data-param="${key}" type="${type}" value="${value}"></label>`;
const text = (node, value) => { node.textContent = String(value ?? ''); };
const fmt = value => Number.isFinite(value) ? Number(value).toFixed(2) : '—';
const btn = (action, label) => `<button type="button" data-geom-action="${action}">${label}</button>`;
const columns = ['S NODE', 'S NodeName', 'SOURCE ELEMENT witnesses', 'T NODE / nearest',
  'TARGET ELEMENT witnesses', 'Status', 'ΔX mm', 'ΔY mm', 'ΔZ mm', 'Distance mm', 'All alternatives / collisions'];
function shell() {
  return `<h2>Geometry · original physical NODE review</h2>
  <p class="g1-warning">REVIEW ONLY — coordinate proximity ≠ physical NODE identity; no Writer2, Validate, Apply or TARGET1 authority.</p>
  <p class="hint">Use SOURCE and TARGET0 CII files in the common intake above. One manual anchor is translation-only with rotation undetermined.</p>
  <div class="g1-controls">
    ${entry('source', 'SOURCE physical NODE', '3910', 'text')}
    ${entry('target', 'TARGET physical NODE', '875', 'text')}
    ${['x', 'y', 'z'].map(a => entry(a, '±' + a.toUpperCase() + ' tolerance (mm)', '100')).join('')}
    <label>Projection <select data-param="projection"><option value="XZ">XZ metric</option><option value="YZ">YZ metric</option><option value="XY">XY metric</option><option value="ISO">ISO NON-METRIC</option></select></label>
    ${btn('run', 'Run registered Method C')}
  </div>
  <div class="g1-status" role="status" aria-live="polite" data-geom-status>Original SOURCE and TARGET0 files required.</div>
  <p class="g1-custody" data-geom-custody>Evidence not computed.</p>
  <div class="g1-actions">${btn('zoom-in', 'Zoom +')}${btn('zoom-out', 'Zoom −')}${btn('reset', 'Reset common-mm view')}
    ${btn('json', 'Evidence JSON')}${btn('csv', 'Evidence CSV')}${btn('svg', 'Evidence SVG (overlay)')}</div>
  <div class="g1-pair" aria-label="Linked original CII SVG canvases">
    <section><h3>SOURCE · transformed coordinates</h3><div data-geom-svg="source" class="g1-svg"></div></section>
    <section><h3>TARGET · original coordinates</h3><div data-geom-svg="target" class="g1-svg"></div></section>
  </div>
  <div class="g1-selection" data-geom-selected>Select a correspondence row or original physical NODE.</div>
  <div class="g1-filter"><label>Status filter <select data-geom-filter><option value="">All source rows and exceptions</option>
    <option value="CANDIDATE">Near physical NODEs</option><option value="EXCEPTION">Unresolved / segment-only</option></select></label></div>
  <div class="g1-table" role="region" tabindex="0" aria-label="Original Method C correspondence ledger">
    <table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody data-geom-rows></tbody></table></div>`;
}
export function mountGeometry(root) {
  if (!root) return {setFiles() {}, activate() {}}; // Legacy Node fixture without Geometry host.
  root.innerHTML = shell();
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const state = {source: null, target: null, epoch: 0, evidence: null, selected: null,
    zoom: 1, dx: 0, dy: 0, active: false};
  const status = msg => text($('[data-geom-status]'), msg);
  const controls = () => Object.fromEntries($$('[data-param]').map(el => [el.dataset.param, el.value]));
  function buttonsEnabled(enabled) {
    for (const action of ['json', 'csv', 'svg', 'zoom-in', 'zoom-out', 'reset'])
      $(`[data-geom-action="${action}"]`).disabled = !enabled;
  }
  function revoke(reason) {
    state.epoch++; state.evidence = null; state.selected = null;
    state.zoom = 1; state.dx = 0; state.dy = 0;
    $('[data-geom-svg="source"]').replaceChildren();
    $('[data-geom-svg="target"]').replaceChildren();
    $('[data-geom-rows]').replaceChildren();
    text($('[data-geom-selected]'), 'No current correspondence selection.');
    text($('[data-geom-custody]'), 'Evidence revoked; rerun with current inputs and settings.');
    buttonsEnabled(false); status(reason);
  }
  function setFiles(source, target) {
    if (state.source === source && state.target === target) return;
    state.source = source; state.target = target;
    revoke('Original file change or pending load: stale Geometry evidence and exports revoked.');
    if (source && target) status('Original files loaded. Choose anchor and run registered Method C.');
  }
  function selection(sourceId) {
    const ev = state.evidence;
    if (!ev) return;
    const row = ev.candidates.rows.find(r => r.source === String(sourceId));
    if (!row) return;
    state.selected = row.source;
    const alternatives = row.alternatives.map(a => `${a.target} (${fmt(a.distance)} mm)`);
    const segment = row.segment && !row.alternatives.length ?
      ` TARGET ELEMENT ${row.segment.between.join('→')} projection t=${fmt(row.segment.t)}; SEGMENT_ONLY, not physical NODE.` : '';
    text($('[data-geom-selected]'), `SOURCE ${row.source}: ${row.status}. ${row.explanation} ` +
      `Nearest TARGET ${row.nearest?.target ?? 'none'}; signed ΔXYZ=${(row.residual || []).map(fmt).join(', ')} mm. ` +
      `All targets: ${alternatives.join('; ') || 'none'}. ${segment}`);
    $$('[data-geom-rows] tr').forEach(tr => tr.classList.toggle('g1-picked', tr.dataset.source === row.source));
    const tr = $('[data-geom-rows] tr.g1-picked');
    tr?.scrollIntoView?.({block:'nearest'});
    draw();
  }
  function viewUpdate() {
    if (!state.evidence) return;
    const e = state.evidence;
    const values = sharedViewBox(e.base, state.zoom, state.dx, state.dy).join(' ');
    for (const svg of $$('[data-geom-svg] svg')) svg.setAttribute('viewBox', values);
  }
  function draw() {
    const e = state.evidence;
    if (!e) return;
    const scene = methodCSvgScene({source:e.source, target:e.target, transform:e.transform,
      candidates:e.candidates, projection:e.projection, selectedSource:state.selected});
    const pair = pairedMethodCViews(scene, root.ownerDocument);
    e.scene = scene; e.base = pair.viewBox;
    $('[data-geom-svg="source"]').replaceChildren(pair.source);
    $('[data-geom-svg="target"]').replaceChildren(pair.target);
    // Every physical NODE alternative remains visibly distinct, never auto-admitted.
    const selected = e.candidates.rows.find(r => r.source === state.selected);
    const ids = new Set(selected?.alternatives.map(a => String(a.target)) || []);
    for (const el of $$('[data-geom-svg="target"] [data-kind="TARGET"][data-node]'))
      el.classList.toggle('g1-alternative', ids.has(el.dataset.node));
    viewUpdate();
  }
  function renderRows() {
    const e = state.evidence, body = $('[data-geom-rows]');
    body.replaceChildren();
    if (!e) return;
    const filter = $('[data-geom-filter]').value;
    for (const row of e.candidates.rows) {
      if (filter === 'CANDIDATE' && !row.alternatives.length) continue;
      if (filter === 'EXCEPTION' && row.alternatives.length) continue;
      const tr = root.ownerDocument.createElement('tr');
      tr.dataset.source = row.source; tr.tabIndex = 0;
      const target = row.alternatives[0];
      const td = [row.source, row.nodeName, row.originalElements.join(' | '),
        target?.target ?? ('nearest ' + (row.nearest?.target || 'none')),
        target?.originalElements?.join(' | ') || (row.segment?.witness || '—'),
        row.segment && !row.alternatives.length ? row.status + ' / SEGMENT_ONLY' : row.status,
        ...(row.residual || [null, null, null]).map(fmt), fmt(row.distance),
        row.alternatives.map(a => `${a.target} (${fmt(a.distance)} mm)`).join(' | ') +
          (row.contestedTargets.length ? ' COLLISION: ' + row.contestedTargets.join(',') : '')];
      for (const value of td) { const cell = root.ownerDocument.createElement('td'); text(cell, value); tr.append(cell); }
      if (row.source === state.selected) tr.classList.add('g1-picked');
      body.append(tr);
    }
  }
  async function run() {
    revoke('Computing fresh original-byte geometry evidence...');
    const ticket = state.epoch, s = state.source, t = state.target, params = controls();
    if (!s?.bytes || !t?.bytes) { status('Both original SOURCE and TARGET0 CII files required.'); return; }
    try {
      const graphs = await Promise.all([['source', s], ['target', t]].map(async ([kind, file]) =>
        buildOriginalGraphFromBytes({bytes: new Uint8Array(file.bytes), member: file.name,
          cryptoRef: globalThis.crypto})));
      if (ticket !== state.epoch) return;
      const [source, target] = graphs;
      const transform = registerMethodC(source, target, [{source: params.source.trim(), target: params.target.trim()}]);
      if (!transform.rotation) throw new Error('UNOBSERVABLE_REGISTRATION_POSE');
      const tolerance = Object.fromEntries(['x', 'y', 'z'].map(k => [k, Number(params[k])]));
      const candidates = findMethodCCandidates(source, target, transform, tolerance);
      const projection = params.projection;
      const scene = methodCSvgScene({source, target, transform, candidates, projection});
      if (ticket !== state.epoch) return;
      state.evidence = {source, target, transform, candidates, projection, scene};
      state.selected = candidates.rows[0]?.source || null;
      renderRows(); draw(); if (state.selected) selection(state.selected);
      text($('[data-geom-custody]'), `SOURCE ${source.member}: SHA-256 ${source.sha256} · TARGET ${target.member}: SHA-256 ${target.sha256}. ` +
        `${transform.status}; ${candidates.nearSourceCount}/${candidates.rows.length} proximity rows; ` +
        `registered components S:${transform.sourceComponent}, T:${transform.targetComponent}; rotation not certified.`);
      buttonsEnabled(true); status('Review only: all candidate alternatives and original witnesses retained; no Writer action exists.');
    } catch (error) { if (ticket === state.epoch) revoke('Geometry rejected inputs: ' + (error.message || String(error))); }
  }
  function download(kind) {
    const e = state.evidence;
    if (!e) throw new Error('STALE_GEOMETRY_EVIDENCE');
    const context = {source:e.source, target:e.target, transform:e.transform, candidates:e.candidates,
      projection:e.projection, scene:e.scene};
    const output = kind === 'json' ? methodCJsonExport(context) :
      kind === 'csv' ? methodCCsvExport(context) : methodCSvgExport(context);
    // Native Method C exporter rechecks all snapshot, SHA and projection invariants.
    methodCEvidence(context);
    const blob = new Blob([output], {type:kind === 'json' ? 'application/json' : kind === 'csv' ? 'text/csv' : 'image/svg+xml'});
    const uri = URL.createObjectURL(blob), a = root.ownerDocument.createElement('a');
    a.href = uri; a.download = `G1-original-MethodC-${kind}.${kind}`; a.click();
    setTimeout(() => URL.revokeObjectURL(uri), 5000);
  }
  root.addEventListener('input', ev => { if (ev.target.matches('[data-param]')) revoke('Geometry setting changed. Rerun required.'); });
  root.addEventListener('change', ev => {
    if (ev.target.matches('[data-param]')) revoke('Geometry setting changed. Rerun required.');
    if (ev.target.matches('[data-geom-filter]')) renderRows();
  });
  root.addEventListener('click', ev => {
    const action = ev.target.closest('[data-geom-action]')?.dataset.geomAction;
    if (action === 'run') { void run(); return; }
    if (['json', 'csv', 'svg'].includes(action)) {
      try { download(action); } catch (error) { revoke('Evidence export blocked: ' + error.message); } return;
    }
    if (action === 'reset') {state.zoom = 1; state.dx = 0; state.dy = 0; viewUpdate();}
    if (action === 'zoom-in' || action === 'zoom-out') {
      state.zoom = Math.max(0.15, Math.min(25, state.zoom * (action === 'zoom-in' ? 1.3 : 1 / 1.3)));
      viewUpdate();
    }
    const tr = ev.target.closest('tr[data-source]'); if (tr) selection(tr.dataset.source);
    const node = ev.target.closest('svg [data-node]');
    if (node?.dataset.kind === 'SOURCE') selection(node.dataset.node);
    if (node?.dataset.kind === 'TARGET') {
      const rows = state.evidence?.candidates.rows.filter(r => r.alternatives.some(a => a.target === node.dataset.node)) || [];
      if (rows.length) selection(rows.some(r => r.source === state.selected) ? state.selected : rows[0].source);
    }
  });
  root.addEventListener('keydown', ev => {
    const node = ev.target.closest('tr[data-source], svg [data-node]');
    if (node && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); node.click(); }
  });
  let drag = null;
  root.addEventListener('pointerdown', ev => {
    const svg = ev.target.closest('[data-geom-svg] svg');
    if (svg && ev.target === svg && state.evidence) drag = {x:ev.clientX, y:ev.clientY, width:svg.clientWidth, height:svg.clientHeight, dx:state.dx, dy:state.dy};
  });
  root.addEventListener('pointermove', ev => {
    if (!drag || !state.evidence) return;
    const view = sharedViewBox(state.evidence.base, state.zoom);
    state.dx = drag.dx - (ev.clientX - drag.x) * view[2] / Math.max(1, drag.width);
    state.dy = drag.dy - (ev.clientY - drag.y) * view[3] / Math.max(1, drag.height);
    viewUpdate();
  });
  root.addEventListener('pointerup', () => {drag = null;});
  root.addEventListener('pointercancel', () => {drag = null;});
  root.addEventListener('wheel', ev => {
    if (!ev.target.closest('[data-geom-svg] svg') || !state.evidence) return;
    ev.preventDefault(); state.zoom = Math.max(.15, Math.min(25, state.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12))); viewUpdate();
  }, {passive: false});
  buttonsEnabled(false);
  return {setFiles, activate(visible) {state.active = Boolean(visible);}, state};
}
