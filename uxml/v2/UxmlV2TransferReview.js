/**
 * Review page section 5 (UXML plan step 6, Owner 17 Nov): a property transfer as a UXML change with locks.
 * Supports from CAESAR II, step 3 (Owner 18 Nov): the receipt's support changes are applied and locked too.
 * Open the Enriched XML the transfer wrote to (its target) and the transfer receipt (U2d); the page applies the receipt
 * as locked values, runs the supports + engineering stage under those locks, and lists every transferred value and
 * every value the masters were stopped from changing. Uses the staged JSON, support config and material map rows
 * chosen in section 4. Downloads: the final XML (with the protection note today's step 10 reads) and the transfer delta.
 * Nothing is uploaded.
 * Group 2 (Owner 19 Nov): a pipe broken in CAESAR II first becomes a new XML node (transfer/CiiNewNodes.js), then the
 * transfer runs node-wise; the page lists each new node's values and where each came from.
 */
import {runStage, sha256Hex} from './UxmlV2Kernel.js';
import {readPsi116V2} from './UxmlV2Psi116Reader.js';
import {runSupportsStage} from './supports/SupportsStage.js';
import {transferStage} from './transfer/TransferStage.js';
import {runUnderLocksOrExplain, NOT_THROUGH_STEP_10} from './transfer/NotThroughStep10.js';
import {transferWithNewNodes} from './transfer/TransferWithNewNodes.js';
import {newNodeValueRows} from './transfer/CiiNewNodes.js';
import {supportRows, supportsLine} from './transfer/SupportLines.js';
import {byIdLine} from './transfer/ByIdLine.js';
import {branchChoices, branchMapFrom, branchTableRows} from './transfer/BranchTableView.js';
import {materialFollowRows} from './transfer/MaterialFollowRows.js';

const $ = id => document.getElementById(id);
const BENCH = '../../fixtures/';
const SAMPLE = {xml: 'uxml-v2-transfer/BM2/base.xml', receipt: 'uxml-v2-transfer/BM2/receipt.json', cii: 'uxml-v2-transfer/BM2/source.cii'};
// EF-05 (Owner 18 Nov): step 10's Enriched XML and its CII with Temperature 1 raised by 10 on every element (fixtures/uxml-v2-transfer/EF05/README.md).
const SAMPLE_EF05 = {xml: 'uxml-v2-transfer/EF05/base.xml', cii: 'uxml-v2-transfer/EF05/source.cii'};
// Supports from CAESAR II, step 4 (Owner 18 Nov): the same CII with four scripted support edits (EF05/README.md).
const SAMPLE_EF05_SUPPORTS = {xml: SAMPLE_EF05.xml, cii: 'uxml-v2-transfer/EF05/supports-edits.cii'};
// Group 2 (Owner 19 Nov): step 10's CII of the same XML with pipe 2490 -> 2520 broken at its midpoint, node 2505 with +Y (EF05/README.md).
const SAMPLE_EF05_BROKEN = {xml: SAMPLE_EF05.xml, cii: 'uxml-v2-transfer/EF05/broken-pipe.cii'};
// T2 (Owner 22 Nov 2026): step 10 with "Engine reads UXML" on, its CII sidecar, and a CII changed at the 45 points
// where several XML records sit (fixtures/uxml-v2-transfer/EF05-on; tests/test_u2d_by_id.py made the CII).
const SAMPLE_EF05_BY_ID = {xml: 'uxml-v2-transfer/EF05-on/enriched.xml', cii: 'uxml-v2-transfer/EF05-on/shared-points.cii',
  sidecar: 'uxml-v2-transfer/EF05-on/step10.cii.sidecar.json'};
const DEFAULT_ROWS = 'uxml-v2-supports/bench/default-material-map-rows.json';
let out = null, name = 'model', u2d = null, last = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node[k] = v;
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}
const say = (text, isNotice = true) => $('trMessage').replaceChildren(text ? el('div', {className: isNotice ? 'notice' : 'muted', textContent: text}) : '');
const fileText = async id => { const f = $(id).files[0]; return f ? f.text() : ''; };
// XML keeps a UTF-8 byte-order mark: the receipt names the file by the SHA-256 of its bytes (review 17 Nov, EF-05).
const decodeXml = bytes => new TextDecoder('utf-8', {ignoreBOM: true}).decode(bytes);
const xmlFileText = async id => { const f = $(id).files[0]; return f ? decodeXml(await f.arrayBuffer()) : ''; };
async function fetchText(file) {
  const res = await fetch(BENCH + file);
  if (!res.ok) throw new Error(`could not load ${file} (${res.status})`);
  return res.text();
}
const parseJson = (text, what) => {
  if (!text.trim()) return undefined;
  try { return JSON.parse(text); } catch { throw new Error(`the ${what} is not valid JSON`); }
};
const table = (head, rows) => el('table', {}, el('tr', {}, ...head.map(h => el('th', {textContent: h}))),
  ...rows.map(r => el('tr', {}, ...r.map(c => el('td', {textContent: c ?? ''})))));

/** Receipt -> locked revision -> stage under locks. */
function run({xmlText, receiptText, stagedJsonText, configText, rowsText, doc: given, newNodes = null}) {
  const receipt = parseJson(receiptText, 'transfer receipt');
  const supportConfig = parseJson(configText, 'support config') || {};
  const materialMapRows = parseJson(rowsText, 'material map rows');
  const doc = given || readPsi116V2(xmlText, {fileSha256: sha256Hex(xmlText)});
  const transfer = runStage(transferStage, doc, {receipt, receiptSha256: sha256Hex(receiptText)});
  const stage = text => runSupportsStage({xmlText: text, stagedJsonText, supportConfig, masters: {materialMapRows}}).xmlText;
  // An XML that has not been through step 10 gets a plain refusal, not a structure code (Owner 18 Nov).
  out = {transfer, receipt, newNodes, ownMaterial: materialFollowRows(doc, receipt), ...runUnderLocksOrExplain(transfer.uxml, doc, stage)};
  render();
}

function render() {
  const {transfer, receipt, conflicts, delta, ownMaterial, newNodes} = out;
  const splits = newNodes?.splits || [], notMade = newNodes?.refused || [];
  // Where a value came from in CAESAR II (Owner 19 Nov 2026: "more traceable"): its CII elements, and how many of them had
  // the line number left empty by CAESAR II (read as the element's it was written on).
  const from = c => !c.cii ? '' : `${c.cii.elements.length} element(s), ${c.cii.elements.slice(0, 2).join(', ')}${c.cii.elements.length > 2 ? '…' : ''}`
    + (Object.keys(c.cii.lineNumberCarried || {}).length ? `; line number carried on ${Object.keys(c.cii.lineNumberCarried || {}).length} (written on ${[...new Set(Object.values(c.cii.lineNumberCarried || {}))].slice(0, 2).join(', ')})` : '');
  const moved = receipt.changes.map(c => [c.ref?.branchName, c.ref?.nodeNumber, c.field, c.before, c.after, from(c)]);
  const follows = transfer.delta.ops.filter(o => o.op === 'set' && o.after?.rule === 'material-follows-branch').length;
  $('trSummary').replaceChildren(
    el('span', {textContent: `${splits.length} new node(s) from a pipe broken in CAESAR II`}),
    el('span', {textContent: `${moved.length} value(s) transferred and locked`}),
    el('span', {textContent: `${follows} node material value(s) follow the branch material`}),
    el('span', {textContent: `${ownMaterial.length} node(s) had their own material, now the branch's (listed below)`}),
    el('span', {textContent: `${receipt.supports?.changes.length ?? 0} support change(s) transferred and locked`}),
    el('span', {textContent: `${transfer.diagnostics.length} refused by the transfer`}),
    el('span', {textContent: `${delta.ops.length} value(s) changed by the stage`}),
    el('span', {textContent: `${conflicts.length} change(s) stopped by a lock`}));
  $('trNewNodes').replaceChildren(splits.length
    ? el('div', {}, el('div', {className: 'muted', textContent: splits.map(s => `Node ${s.ciiNode} on ${s.branch}, pipe ${s.between.join(' -> ')}: `
      + `${s.alongMm.toFixed(1)} of ${s.lengthMm.toFixed(1)} mm along, CAESAR II's point ${s.offMm.toFixed(1)} mm off the line (put on it).`).join(' ')}),
    table(['Branch', 'Node', 'Pipe', 'Field', 'Value', 'Came from'], newNodeValueRows(out.uxml || transfer.uxml, splits)))
    : el('div', {className: 'muted', textContent: newNodes ? 'CAESAR II broke no pipe of this XML.' : 'Only a transfer from the CAESAR II file can add nodes.'}),
  ...(notMade.length ? [el('h4', {textContent: 'New CAESAR II nodes not made'}), table(['Nodes', 'Why'], notMade.map(r => [r.ciiNodes.join(', '), r.detail]))] : []));
  $('trMoved').replaceChildren(table(['Branch', 'Node', 'Field', 'Before', 'Transferred', 'From CAESAR II'], moved));
  $('trOwnMaterial').replaceChildren(ownMaterial.length
    ? table(['Branch', 'Node', 'Node material before', 'Branch material before', 'Now (branch)'], ownMaterial)
    : el('div', {className: 'muted', textContent: 'No node had a material of its own: every node material followed the branch as before.'}));
  $('trConflicts').replaceChildren(conflicts.length
    ? table(['Branch', 'Node', 'Field', 'Kept (transfer)', 'The stage wanted'], conflicts.map(c => [c.branch, c.node ?? 'branch', c.key.replace(/\./g, '/'), c.kept, c.stageWanted]))
    : el('div', {className: 'muted', textContent: 'The stage did not try to change any transferred value.'}));
  const sup = supportRows(receipt.supports, receipt.summary?.supports?.comparedWith);
  $('trSupports').replaceChildren(sup.rows.length
    ? table(['Branch', 'Node', 'Change', 'In the XML', 'In CAESAR II'], sup.rows)
    : el('div', {className: 'muted', textContent: sup.none}),
  ...(sup.refused.length ? [el('h4', {textContent: 'Support differences not listed'}), table(['Where', 'Why'], sup.refused)] : []),
  // Support locks in step 10 (Owner 18 Nov): a node the protection note cannot name is said, never protected silently.
  ...((out.supportsNotKeyed || []).length ? [el('div', {className: 'notice', textContent: `${out.supportsNotKeyed.length} node(s) keep their transferred supports here, `
    + 'but the protection note in the file cannot name them, so step 10 will not protect them: '
    + out.supportsNotKeyed.map(u => `${u.branchName} node ${u.nodeNumber} (${u.why})`).join('; ')})] : []));
  $('trResult').hidden = false;
  $('trDlReceipt').hidden = $('trDlU2dXml').hidden = !u2d;
  say('');
}

function download(text, file, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  el('a', {href: url, download: file}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function guarded(fn) {
  say('Running the transfer and the stage under its locks…', false);
  try { await fn(); } catch (error) {
    $('trResult').hidden = true;
    if (error?.code === NOT_THROUGH_STEP_10) { u2d = null; $('trU2d').replaceChildren(); }
    say('Could not run: ' + String(error?.message || error) + (error?.details && Object.keys(error.details).length ? ' ' + JSON.stringify(error.details) : '')); }
}

/** T3: the branch table of a transfer by node id, one select per CII line; "Transfer again" runs with your changes. */
function showBranchTable(rows) {
  if (!rows) return;
  const choices = branchChoices(rows);
  const picks = {};
  const pick = r => {
    const s = el('select', {onchange: () => { picks[r.line] = s.value; }},
      el('option', {value: '', textContent: 'as found'}), el('option', {value: 'skip', textContent: 'skip this line'}),
      ...choices.map(c => el('option', {value: String(c.ordinal), textContent: c.name})));
    return s;
  };
  const shown = branchTableRows(rows);
  $('trBranches').replaceChildren(el('h3', {textContent: 'Branch table (CII line -> XML branch, by node id)'}),
    el('div', {className: 'scroll'}, el('table', {},
      el('tr', {}, ...['CII line', 'XML branch', 'Found', 'Change'].map(h => el('th', {textContent: h}))),
      ...rows.map((r, i) => el('tr', {}, ...shown[i].map(c => el('td', {textContent: c})), el('td', {}, pick(r)))))),
    el('button', {textContent: 'Transfer again with this branch table',
      onclick: () => guarded(() => fromCii(last.xmlFile, last.ciiFile, last.sidecarFile,
        branchMapFrom(rows, picks)))}));
}

/** Section 5 without a receipt: the page runs the transfer from the CAESAR II file, then the usual run under locks.
 * branchMap (T3): your rows of the branch table, for a transfer by node id. */
async function fromCii(xmlFile, ciiFile, sidecarFile = null, branchMap = null) {
  u2d = null;
  last = {xmlFile, ciiFile, sidecarFile};
  $('trU2d').replaceChildren();
  $('trBranches').replaceChildren();
  if (!xmlFile || !ciiFile) throw new Error('open the Enriched XML and the CAESAR II file first');
  if (!$('trScale').value) throw new Error('choose the unit of the CII weights first (N for a file from the XML to CII tab)');
  name = xmlFile.name.replace(/\.[^.]+$/, '');
  const targetBytes = new Uint8Array(await xmlFile.arrayBuffer());
  const sidecarBytes = sidecarFile ? new Uint8Array(await sidecarFile.arrayBuffer()) : null;
  const ciiBytes = new Uint8Array(await ciiFile.arrayBuffer());
  const made = await transferWithNewNodes({targetBytes, ciiBytes, sidecarBytes, branchMap,
    weightScale: Number($('trScale').value),
    names: {cii: ciiFile.name, target: xmlFile.name, revised: `${name}_transferred.xml`, sidecar: sidecarFile?.name}, onStatus: text => say(text, false)});
  u2d = made.u2d;
  const {summary} = u2d.receipt;
  const refused = Object.entries(summary.refused).map(([code, n]) => `${code} ${n}`).join(', ') || 'none';
  $('trU2d').textContent = `Transfer from ${ciiFile.name}: ${summary.edits} value(s) differ and were transferred, ${summary.pairs} node pairs, `
    + `${summary.ciiElements} CII elements; refused: ${refused}. ${(u2d.ms / 1000).toFixed(1)} s in this browser.`;
  if (summary.supports) $('trU2d').textContent += ' ' + supportsLine(summary.supports);
  if (u2d.receipt.byId) $('trU2d').textContent += ' ' + byIdLine(u2d.receipt.byId);
  showBranchTable(u2d.receipt.branchTable);
  run({xmlText: made.xmlText, doc: made.doc, newNodes: made.newNodes, receiptText: u2d.receiptText, stagedJsonText: await fileText('supStaged'),
    configText: await fileText('supConfig'), rowsText: (await fileText('supRows')) || await fetchText(DEFAULT_ROWS)});
}

function wire() {
  $('trRun').addEventListener('click', () => guarded(async () => {
    const xmlText = await xmlFileText('trXml');
    const receiptText = await fileText('trReceipt');
    if (!xmlText || !receiptText) throw new Error('open the Enriched XML and the transfer receipt first');
    name = $('trXml').files[0].name.replace(/\.[^.]+$/, '');
    u2d = null;
    $('trU2d').replaceChildren();
    run({xmlText, receiptText, stagedJsonText: await fileText('supStaged'), configText: await fileText('supConfig'),
      rowsText: (await fileText('supRows')) || await fetchText(DEFAULT_ROWS)});
  }));
  $('trFromCii').addEventListener('click', () => guarded(() => fromCii($('trXml').files[0], $('trCii').files[0], $('trSidecar').files[0])));
  const file = async (path, fileName) => {
    const res = await fetch(BENCH + path);
    if (!res.ok) throw new Error(`could not load ${path} (${res.status})`);
    return new File([await res.arrayBuffer()], fileName);
  };
  $('trCiiSample').addEventListener('click', () => guarded(async () => {
    await fromCii(await file(SAMPLE.xml, 'BM2-transfer.xml'), await file(SAMPLE.cii, 'BM2.cii'));
  }));
  $('trCiiSampleEf05').addEventListener('click', () => guarded(async () => {
    await fromCii(await file(SAMPLE_EF05.xml, 'EF-05-step10-enriched.xml'), await file(SAMPLE_EF05.cii, 'EF-05-step10-T1plus10.cii'));
  }));
  $('trCiiSampleEf05Supports').addEventListener('click', () => guarded(async () => {
    await fromCii(await file(SAMPLE_EF05_SUPPORTS.xml, 'EF-05-step10-enriched.xml'), await file(SAMPLE_EF05_SUPPORTS.cii, 'EF-05-supports-edits.cii'));
  }));
  $('trCiiSampleEf05Broken').addEventListener('click', () => guarded(async () => {
    await fromCii(await file(SAMPLE_EF05_BROKEN.xml, 'EF-05-step10-enriched.xml'), await file(SAMPLE_EF05_BROKEN.cii, 'EF-05-broken-pipe.cii'));
  }));
  $('trCiiSampleEf05ById').addEventListener('click', () => guarded(async () => {
    await fromCii(await file(SAMPLE_EF05_BY_ID.xml, 'EF-05-step10-on-enriched.xml'), await file(SAMPLE_EF05_BY_ID.cii, 'EF-05-shared-points.cii'),
      await file(SAMPLE_EF05_BY_ID.sidecar, 'EF-05-PRO.TEST_xml_to_cii2019_standalone.cii.sidecar.json'));
  }));
  $('trSample').addEventListener('click', () => guarded(async () => {
    u2d = null;
    $('trU2d').replaceChildren();
    name = 'BM2-transfer';
    run({xmlText: await fetchText(SAMPLE.xml), receiptText: await fetchText(SAMPLE.receipt), stagedJsonText: '', configText: '',
      rowsText: await fetchText(DEFAULT_ROWS)});
  }));
  $('trDlXml').addEventListener('click', () => download(out.xmlText, `${name}_transfer-locked.xml`, 'application/xml'));
  $('trDlReceipt').addEventListener('click', () => download(u2d.receiptText, `${name}_transfer-receipt.json`, 'application/json'));
  $('trDlU2dXml').addEventListener('click', () => download(u2d.revisedBytes, `${name}_transferred.xml`, 'application/xml'));
  $('trDlDelta').addEventListener('click', () => download(JSON.stringify(out.transfer.delta, null, 1), `${name}_transfer.delta.json`, 'application/json'));
}

wire();
