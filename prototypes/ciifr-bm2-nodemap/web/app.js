import { stats, candidates, selectedPairs, catalogue, preview } from './render.js';

const el = id => document.getElementById(id);
const state = { epoch: 0, files: {}, analysis: null, pairs: [], preview: null, urls: [] };
const MAX_FILE = 16 * 1024 * 1024;

function invalidatePreview() {
  state.epoch += 1; state.preview = null;
  state.urls.forEach(url => URL.revokeObjectURL(url)); state.urls = [];
  el('preview').replaceChildren(); el('preview-summary').hidden = true; el('save').disabled = true;
  el('compare').disabled = !state.analysis || !state.pairs.length;
}

function invalidateAnalysis() {
  invalidatePreview(); state.analysis = null; state.pairs = [];
  ['models', 'work', 'catalogues', 'reference-result'].forEach(id => { el(id).hidden = true; });
  el('analyse').disabled = !state.files.source || !state.files.target; el('compare').disabled = true;
  el('badge').textContent = 'READY'; el('badge').className = 'badge';
  el('status').textContent = 'Inputs or proposal basis changed. Inspect models again.';
}

function message(text, error = false) {
  el('status').textContent = text;
  el('badge').textContent = error ? 'BLOCKED' : 'INSPECTED'; el('badge').className = error ? 'badge error' : 'badge pass';
}

function encode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}

function payload() {
  const result = { mode: el('mode').value, source_b64: encode(state.files.source), target_b64: encode(state.files.target) };
  if (state.files.reference) result.reference_b64 = encode(state.files.reference);
  return result;
}

async function request(route, body) {
  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Local request failed');
  return result;
}

async function loadFile(role) {
  state.files[role] = null; invalidateAnalysis(); const epoch = state.epoch;
  const file = el(role).files[0]; el(`${role}-name`).textContent = file ? `${file.name} · ${file.size.toLocaleString()} bytes` : 'No file selected';
  if (!file) return;
  try {
    if (!file.size || file.size > MAX_FILE) throw new Error('Choose a nonempty CII up to16MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (epoch !== state.epoch) return;
    state.files[role] = bytes; el('analyse').disabled = !state.files.source || !state.files.target;
  } catch (error) { if (epoch === state.epoch) message(error.message, true); }
}

function renderSelection() {
  selectedPairs(el('selected'), state.pairs, (a, b) => togglePair([a, b], false));
  candidates(el('candidates'), state.analysis.proposals, state.pairs, el('candidate-filter').value, togglePair);
  el('compare').disabled = !state.pairs.length;
}

function togglePair(pair, checked) {
  invalidatePreview();
  if (checked && state.pairs.some(([a, b]) => a === pair[0] || b === pair[1])) {
    message('Choose one-to-one pairs. Remove an existing source/target selection first.', true); renderSelection(); return;
  }
  state.pairs = checked ? [...state.pairs, pair] : state.pairs.filter(([a, b]) => a !== pair[0] || b !== pair[1]);
  renderSelection();
}

async function inspectModels() {
  if (!state.files.source || !state.files.target) return;
  invalidateAnalysis(); const epoch = state.epoch; el('analyse').disabled = true;
  message('Reading full CII models and building scoped catalogues…');
  try {
    const result = await request('/api/analyse', payload());
    if (epoch !== state.epoch) return;
    state.analysis = result; stats(el('source-stats'), result.source, 'Source'); stats(el('target-stats'), result.target, 'Target');
    ['models', 'work', 'catalogues'].forEach(id => { el(id).hidden = false; });
    el('candidate-count').textContent = `${result.proposals.length} PROPOSED`;
    renderSelection(); renderCatalogues();
    if (result.reference) {
      const r = result.reference; el('reference-result').hidden = false;
      el('reference-result').textContent = `REFERENCE · ${r.changed_records} changed name records · ${r.changed_bytes} differing bytes · ${r.outside_name_bytes} outside name fields. ${r.status}. This is a separate unapproved name-edit reference.`;
    }
    message('Models inspected. Candidate pairs remain unapproved; select pairs to inspect values.');
  } catch (error) { if (epoch === state.epoch) message(error.message, true); }
  finally { if (epoch === state.epoch) el('analyse').disabled = !state.files.source || !state.files.target; }
}

function renderCatalogues() {
  if (!state.analysis) return;
  for (const role of ['source', 'target']) catalogue(el(`${role}-catalogue`), state.analysis[role], el(`${role}-filter`).value);
}

async function inspectSelection() {
  if (!state.analysis || !state.pairs.length) return;
  invalidatePreview(); const epoch = state.epoch; el('compare').disabled = true;
  try {
    const body = { ...payload(), pairs: state.pairs, source_vector: Number(el('source-vector').value), target_vector: Number(el('target-vector').value), components: ['DX', 'DY', 'DZ'].filter(id => el(id).checked), input_digests: { source: state.analysis.source.cii_sha256, target: state.analysis.target.cii_sha256 } };
    const result = await request('/api/preview', body);
    if (epoch !== state.epoch) return;
    state.preview = result; preview(el('preview'), result); el('preview-summary').hidden = false;
    const blocked = result.decisions.filter(d => d.status === 'BLOCKED').length;
    el('preview-summary').textContent = `${result.decisions.length} cells inspected · ${blocked} blocked. Informational only. Mapping unapproved; global basis unverified; export disabled.`;
    el('save').disabled = false; message('Current values inspected. No mapping accepted and no model changed.');
  } catch (error) { if (epoch === state.epoch) message(error.message, true); }
  finally { if (epoch === state.epoch) el('compare').disabled = !state.pairs.length; }
}

for (const role of ['source', 'target', 'reference']) el(role).addEventListener('change', () => loadFile(role));
el('mode').addEventListener('change', invalidateAnalysis); el('analyse').addEventListener('click', inspectModels);
el('compare').addEventListener('click', inspectSelection); el('candidate-filter').addEventListener('input', () => { if (state.analysis) renderSelection(); });
for (const role of ['source', 'target']) el(`${role}-filter`).addEventListener('input', renderCatalogues);
for (const id of ['source-vector', 'target-vector', 'DX', 'DY', 'DZ']) el(id).addEventListener('change', invalidatePreview);
for (const id of ['source-vector', 'target-vector']) for (let v = 1; v <= 9; v += 1) { const option = document.createElement('option'); option.value = v; option.textContent = `Vector ${v}`; el(id).append(option); }
el('clear-pairs').addEventListener('click', () => { state.pairs = []; invalidatePreview(); renderSelection(); });
el('add-pair').addEventListener('click', () => {
  const a = Number(el('manual-source').value); const b = Number(el('manual-target').value);
  if (!state.analysis || !state.analysis.source.nodes.some(n => n.node === a) || !state.analysis.target.nodes.some(n => n.node === b)) { message('Both node numbers must exist in the current catalogues.', true); return; }
  togglePair([a, b], true);
});
el('clear').addEventListener('click', () => { state.files = {}; for (const role of ['source', 'target', 'reference']) { el(role).value = ''; el(`${role}-name`).textContent = 'No file selected'; } invalidateAnalysis(); });
el('save').addEventListener('click', () => {
  if (!state.preview) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.preview, null, 2)], { type: 'application/json' })); state.urls.push(url);
  const link = document.createElement('a'); link.href = url; link.download = 'bm2-unapproved-inspection.json'; link.click();
});
