/**
 * The CAESAR II -> Enriched XML transfer (U2d) in the browser (Owner 17 Nov 2026, "transfer in the app").
 * Same steps and same code as the command line (prototypes/u2d-cii-source/README.md):
 *   CII v11 -> v14 (3D_Converters cii_v11_v14, Python)   -> match-psi116 --tol 1 --frame cii2019 (JavaScript)
 *   -> transfer plan (u2d_plan.py, Python)                 -> U1 write-back (JavaScript)
 *   -> protection note + receipt (u2d.py, Python).
 * The Python runs in Pyodide; every Python file is checked against u2d-py-pin.json before it is used, so the page
 * cannot run code other than the tested files. Nothing is uploaded.
 */
import {readPsi116Graph, matchPsi116Cii} from '../../../prototypes/p11-cii-map/engine/psi116-match.mjs';
import {readCiiGraph} from '../../../prototypes/p11-cii-map/engine/cii-graph.mjs';
import {applyPsi116Edits} from '../../../prototypes/u1-psi116-uxml/engine/psi116-patchback.mjs';

const ROOT = new URL('../../../', import.meta.url);
const PIN_URL = new URL('./u2d-py-pin.json', import.meta.url);
export const MATCH_TOLERANCE_MM = 1;

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const readUrl = async (url, as = 'bytes') => {
  if (url.protocol === 'file:') {
    const {readFile} = await import('node:fs/promises');
    const buf = await readFile(url);
    return as === 'text' ? buf.toString('utf8') : new Uint8Array(buf);
  }
  const res = await fetch(url, {cache: 'no-store'});
  if (!res.ok) throw new Error(`could not load ${url.pathname} (${res.status})`);
  return as === 'text' ? res.text() : new Uint8Array(await res.arrayBuffer());
};

/** Pinned Python files: [{path, to, bytes}]; throws U2D_PIN_MISMATCH when any served file differs from the pin. */
export async function loadPinnedPython(root = ROOT, pinUrl = PIN_URL) {
  const pin = JSON.parse(await readUrl(pinUrl, 'text'));
  const files = [];
  for (const [path, {to, sha256}] of Object.entries(pin.files)) {
    const bytes = await readUrl(new URL(path, root));
    const got = await sha256Hex(bytes);
    if (got !== sha256) throw new Error(`U2D_PIN_MISMATCH: ${path} is not the tested file (${got.slice(0, 12)} vs ${sha256.slice(0, 12)})`);
    files.push({path, to, bytes});
  }
  return {pin, files};
}

/**
 * The Pyodide core files at `base` against pin.pyodideFiles (review note N2.5, Owner 19 Nov 2026): throws
 * U2D_PYODIDE_PIN_MISMATCH when one differs, so the page never runs a changed Pyodide. The page's own JS comes from the
 * same deployment as the pin file, so pinning it would check nothing.
 */
export async function checkPinnedPyodide(base, pin) {
  const files = Object.entries(pin.pyodideFiles || {});
  if (!files.length) throw new Error('U2D_PYODIDE_PIN_MISMATCH: the pin lists no Pyodide files');
  for (const [file, sha256] of files) {
    const got = await sha256Hex(await readUrl(new URL(file, base)));
    if (got !== sha256) throw new Error(`U2D_PYODIDE_PIN_MISMATCH: Pyodide ${file} is not the tested file (${got.slice(0, 12)} vs ${sha256.slice(0, 12)})`);
  }
  return files.length;
}

let ready = null;
/**
 * Pyodide with the pinned files under /u2d/ and u2d_browser imported. loadPyodide is passed in (browser: the pinned CDN
 * build; Node checks: a local build). onStatus gets short progress lines.
 */
export function prepareU2d({loadPyodide, indexURL, onStatus = () => {}} = {}) {
  ready ??= (async () => {
    const started = Date.now();
    const {pin, files} = await loadPinnedPython();
    onStatus(`Loading Python (Pyodide ${pin.pyodide}); the first time takes a while…`);
    let load = loadPyodide, base = indexURL;
    if (!load) {
      // Browser: the pinned CDN build, checked file by file first. (Node checks pass their own local build.)
      base = indexURL || `https://cdn.jsdelivr.net/pyodide/v${pin.pyodide}/full/`;
      onStatus(`Checking Pyodide against the pin (${await checkPinnedPyodide(base, pin)} files)…`);
      load = (await import(/* webpackIgnore: true */ new URL('pyodide.mjs', base).href)).loadPyodide;
    }
    const py = await load(base ? {indexURL: base} : {});
    for (const {to, bytes} of files) {
      const dir = '/u2d/' + to.split('/').slice(0, -1).join('/');
      py.FS.mkdirTree(dir);
      py.FS.writeFile('/u2d/' + to, bytes);
    }
    py.runPython(`import sys\nsys.path[:0] = ["/u2d/u2d-cii-source", "/u2d/cii-v11-v14"]\nimport u2d_browser`);
    onStatus(`Python ready in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
    return {py, browser: py.pyimport('u2d_browser'), pin};
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

const bytesOf = value => value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
const toJs = value => (value?.toJs ? value.toJs() : value);
const pyBytes = (py, bytes) => py.toPy(bytes);
/** A Python refusal as its code line ("U2D_...: ..."), not the traceback. */
function pyCall(fn) {
  try { return fn(); } catch (error) {
    const lines = String(error?.message || error).trim().split(/\r?\n/);
    const code = lines.reverse().find(l => /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+:/.test(l));
    throw new Error(code ? code.replace(/^\w*Error: /, '').trim() : String(error?.message || error));
  }
}

/** match-psi116 --tol 1 --frame cii2019, shaped as the command line prints it. */
export async function matchForU2d(targetBytes, v14Bytes, ciiName) {
  const xml = await readPsi116Graph(targetBytes, {frame: 'cii2019'});
  const cii = await readCiiGraph(v14Bytes, {member: ciiName});
  const m = matchPsi116Cii(xml, cii, {toleranceMm: MATCH_TOLERANCE_MM});
  const r = m.summary ? {...m, seedDrifts: cii.seedDrifts, summary: {...m.summary, frame: xml.frame, seedDrifts: cii.seedDrifts.length,
    maxSeedDriftMm: Math.max(0, ...cii.seedDrifts.map(d => d.missMm))}} : m;
  // Group 2 (Owner 19 Nov): the CII points and elements, for a pipe broken in CAESAR II (CiiNewNodes.js). Not sent to Python.
  Object.defineProperty(r, 'ciiGraph', {value: {nodes: cii.nodes.map(n => ({id: String(n.id), xyz: n.xyz})),
    elements: (cii.ciiElements || []).map(e => ({from: String(e.from), to: String(e.to)}))}, enumerable: false});
  return Object.defineProperty({ok: true, ...r}, 'ciiGraph', {value: r.ciiGraph, enumerable: false});
}

/**
 * Transfer the CAESAR II values into the Enriched XML.
 * names: {cii, target, revised} file names for the receipt. Returns {revisedBytes, receiptText, receipt, ms}.
 * Refusals are thrown as Error with the U2D_/U1_/MATCH_ code at the start of the message; nothing is returned then.
 */
export async function transferCiiIntoXml({targetBytes, ciiBytes, names, weightScale, items = 'name,weight,element', createdAt, ...load}) {
  if (weightScale !== 10 && weightScale !== 1) throw new Error('U2D_WEIGHT_SCALE_REQUIRED: the CII weight unit must be chosen: 10 (N, kg x 10) or 1 (kg)');
  const started = Date.now();
  const {py, browser} = await prepareU2d(load);
  const target = bytesOf(targetBytes), cii = bytesOf(ciiBytes);
  const v14 = toJs(pyCall(() => browser.to_v14(pyBytes(py, cii))));
  const match = await matchForU2d(target, v14, names.cii);
  // Page rule (the command line has no such check): a CII with no node at any point of this XML is another model's file.
  if (!match.nodePairs?.length) throw new Error(`U2D_NO_NODE_PAIRS: no node of ${names.cii} is at a point of ${names.target}; it looks like another model's CAESAR II file. Nothing was transferred.`);
  const planJson = pyCall(() => browser.plan_edits(pyBytes(py, target), pyBytes(py, cii), pyBytes(py, v14), JSON.stringify(match), weightScale, items));
  const {envelope} = JSON.parse(planJson);
  const u1 = await applyPsi116Edits(target, envelope.edits, {fileSha256: envelope.fileSha256});
  const u1Json = JSON.stringify({sha256Before: u1.sha256Before, sha256After: u1.sha256After, changes: u1.changes});
  const out = pyCall(() => browser.finish(pyBytes(py, target), pyBytes(py, cii), pyBytes(py, u1.bytes), u1Json, planJson,
    JSON.stringify([names.cii, names.target, names.revised]), weightScale, items, createdAt ?? null));
  const [revised, receiptText] = out.toJs();
  out.destroy?.();
  return {revisedBytes: revised, receiptText, receipt: JSON.parse(receiptText), match: match.summary, matchFull: {...match, ciiNodes: match.ciiGraph.nodes, ciiElements: match.ciiGraph.elements}, ms: Date.now() - started};
}
