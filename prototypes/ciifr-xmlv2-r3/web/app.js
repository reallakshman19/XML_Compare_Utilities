import { showHierarchy, findLoaded } from './inspect.js';

const el = id => document.getElementById(id);
const state = { epoch: 0, cii: null, xml: null, report: null, urls: [] };
const MAX_FILE = 16 * 1024 * 1024;

function clearOutput() {
  state.epoch += 1;
  state.report = null;
  state.urls.forEach(url => URL.revokeObjectURL(url));
  state.urls = [];
  ['metrics', 'comparison', 'downloads', 'digests'].forEach(id => { el(id).hidden = true; });
  el('download').removeAttribute('href');
  el('tree').replaceChildren();
  el('badge').textContent = 'READY';
  el('badge').className = 'badge';
  el('status').textContent = 'Inputs changed. Run conversion to verify the current files.';
  el('to-xml').disabled = !state.cii;
  el('to-cii').disabled = !state.xml;
}

function encode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}

function decode(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function blobUrl(bytes, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  state.urls.push(url);
  return url;
}

async function selectFile(kind) {
  clearOutput();
  state[kind] = null;
  if (kind === 'cii') { state.xml = null; el('xml').value = ''; el('xml-name').textContent = 'No XML loaded'; }
  el('to-xml').disabled = !state.cii;
  el('to-cii').disabled = !state.xml;
  const file = el(kind).files[0];
  el(`${kind}-name`).textContent = file ? `${file.name} · ${file.size.toLocaleString()} bytes` : 'No file selected';
  if (!file) return;
  const epoch = state.epoch;
  try {
    if (file.size === 0 || file.size > MAX_FILE) throw new Error('Choose a nonempty file up to 16 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (epoch !== state.epoch) return;
    state[kind] = { bytes, name: file.name };
    el('to-xml').disabled = !state.cii;
    el('to-cii').disabled = !state.xml;
  } catch (error) { if (epoch === state.epoch) showError(error); }
}

function showError(error) {
  el('badge').textContent = 'REJECTED';
  el('badge').className = 'badge error';
  el('status').textContent = error.message;
}

function metric(value, label) {
  const item = document.createElement('div'); item.className = 'metric';
  const strong = document.createElement('strong'); strong.textContent = value.toLocaleString();
  const caption = document.createElement('span'); caption.textContent = label;
  item.append(strong, caption); return item;
}

function showResult(result, output, input) {
  const { inspection_b64, ...metadata } = result;
  state.report = { ...metadata, output: { bytes: result.output.bytes, sha256: result.output.sha256 },
    evidence_scope: 'Local converter validation and byte comparison; engineering acceptance NOT_RUN' };
  el('badge').textContent = 'CONVERTED'; el('badge').className = 'badge pass';
  el('status').textContent = result.mode === 'cii' ? 'XMLv2 created. Reconstruct CII to verify the complete round trip.' : 'CII reconstructed from the XML fields and lexical metadata.';
  el('metrics').replaceChildren(metric(result.stats.sections, 'CII sections'), metric(result.stats.elements, 'elements'), metric(result.stats.nodes, 'nodes'));
  const comparison = result.comparison;
  el('comparison').className = `comparison${comparison.status === 'CHANGED' ? ' changed' : ''}`;
  el('comparison').textContent = comparison.status === 'IDENTICAL' ? 'BYTE-IDENTICAL · CII bytes and SHA-256 match the original baseline.' : comparison.status === 'CHANGED' ? `CHANGED · ${comparison.different_bytes.toLocaleString()} byte positions differ. First offset: ${comparison.first_difference_zero_based} (zero-based). Engineering authorization has not been assessed.` : 'COMPARISON NOT RUN · Add an original CII baseline to verify byte identity.';
  el('download').href = blobUrl(output, result.mode === 'cii' ? 'application/xml' : 'application/octet-stream');
  el('download').download = result.mode === 'cii' ? 'model.xmlv2.xml' : 'reconstructed.CII';
  el('download').textContent = result.mode === 'cii' ? 'Download XMLv2 ↓' : 'Download CII ↓';
  el('digests').textContent = `INPUT  ${result.input.bytes.toLocaleString()} bytes · SHA-256 ${result.input.sha256}\nOUTPUT ${result.output.bytes.toLocaleString()} bytes · SHA-256 ${result.output.sha256}`;
  ['metrics', 'comparison', 'downloads', 'digests'].forEach(id => { el(id).hidden = false; });
  showHierarchy(el('tree'), result.mode === 'cii' ? output : decode(result.inspection_b64));
}

async function run(mode) {
  const input = state[mode];
  if (!input) return;
  clearOutput();
  const epoch = state.epoch;
  el('to-xml').disabled = true; el('to-cii').disabled = true;
  el('badge').textContent = 'WORKING'; el('status').textContent = 'Validating structure and reconstructing authoritative fields…';
  try {
    const payload = { mode, input_b64: encode(input.bytes) };
    if (mode === 'xml' && state.cii) payload.baseline_b64 = encode(state.cii.bytes);
    const response = await fetch('/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (epoch !== state.epoch) return;
    if (!response.ok || !result.ok) throw new Error(result.error || 'Conversion failed');
    const output = decode(result.output.data_b64);
    if (mode === 'cii') { state.xml = { bytes: output, name: 'generated XMLv2' }; el('xml-name').textContent = 'Generated XMLv2 · ready to reconstruct'; }
    showResult(result, output, input);
  } catch (error) { if (epoch === state.epoch) { clearOutput(); showError(error); } }
  finally {
    if (epoch === state.epoch) { el('to-xml').disabled = !state.cii; el('to-cii').disabled = !state.xml; }
  }
}

el('cii').addEventListener('change', () => selectFile('cii'));
el('xml').addEventListener('change', () => selectFile('xml'));
el('to-xml').addEventListener('click', () => run('cii'));
el('to-cii').addEventListener('click', () => run('xml'));
el('reset').addEventListener('click', () => {
  state.cii = null; state.xml = null; el('cii').value = ''; el('xml').value = '';
  el('cii-name').textContent = 'No file selected · up to 16 MiB'; el('xml-name').textContent = 'No XML loaded'; clearOutput();
});
el('find').addEventListener('input', () => findLoaded(el('tree'), el('find').value));
el('audit').addEventListener('click', () => {
  if (!state.report) return;
  const link = document.createElement('a');
  link.href = blobUrl(JSON.stringify(state.report, null, 2), 'application/json'); link.download = 'xmlv2-verification.json'; link.click();
});
