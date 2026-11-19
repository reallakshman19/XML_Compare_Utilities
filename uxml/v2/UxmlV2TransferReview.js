/**
 * Review page section 5 (UXML plan step 6, Owner 17 Nov): a property transfer as a UXML change with locks.
 * Supports from CAESAR II, step 3 (Owner 18 Nov): the receipt's support changes are applied and locked too.
 * Open the Enriched XML the transfer wrote to (its target) and the transfer receipt (U2d); the page applies the receipt
 * as locked values, runs the supports + engineering stage under those locks, and lists every transferred value and
 * every value the masters were stopped from changing. Uses the staged JSON, support config and material map rows
 * chosen in section 4. Downloads: the final XML (with the protection note today's step 10 reads) and the transfer delta.
 * Nothing is uploaded.
 */
import {runStage, sha256Hex} from './UxmlV2Kernel.js';
import {readPsi116V2} from './UxmlV2Psi116Reader.js';
import {runSupportsStage} from './supports/SupportsStage.js';
import {transferStage} from './transfer/TransferStage.js';
import {runUnderLocksOrExplain, NOT_THROUGH_STEP_10} from './transfer/NotThroughStep10.js';
import {transferCiiIntoXml} from './transfer/U2dInBrowser.js';
import {supportRows, supportsLine} from './transfer/SupportLines.js';
import {materialFollowRows} from './transfer/MaterialFollowRows.js';

const $ = id => document.getElementById(id);
const BENCH = '../../fixtures/';
const SAMPLE = {xml: 'uxml-v2-transfer/BM2/base.xml', receipt: 'uxml-v2-transfer/BM2/receipt.json', cii: 'uxml-v2-transfer/BM2/source.cii'};
// EF-05 (Owner 18 Nov): step 10's Enriched XML and its CII with Temperature 1 raised by 10 on every element (fixtures/uxml-v2-transfer/EF05/README.md).
const SAMPLE_EF05 = {xml: 'uxml-v2-transfer/EF05/base.xml', cii: 'uxml-v2-transfer/EF05/source.cii'};
// Supports from CAESAR II, step 4 (Owner 18 Nov): the same CII with four scripted support edits (EF05/README.md).
const SAMPLE_EF05_SUPPORTS = {xml: SAMPLE_EF05.xml, cii: 'uxml-v2-transfer/EF05/supports-edits.cii'};
const DEFAULT_ROWS = 'uxml-v2-supports/bench/default-material-map-rows.json';
let out = null, name = 'model', u2d = null;

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
function run({xmlText, receiptText, stagedJsonText, configText, rowsText}) {
  const receipt = parseJson(receiptText, 'transfer receipt');
  const supportConfig = parseJson(configText, 'support config') || {};
  const materialMapRows = parseJson(rowsText, 'material map rows');
  const doc = readPsi116V2(xmlText, {fileSha256: sha256Hex(xmlText)});
  const transfer = runStage(transferStage, doc, {receipt, receiptSha256: sha256Hex(receiptText)});
  const stage = text => runSupportsStage({xmlText: text, stagedJsonText, supportConfig, masters: {materialMapRows}}).xmlText;
  // An XML that has not been through step 10 gets a plain refusal, not a structure code (Owner 18 Nov).
  out = {transfer, receipt, ownMaterial: materialFollowRows(doc, receipt), ...runUnderLocksOrExplain(transfer.uxml, doc, stage)};
  render();
}

function render() {
  const {transfer, receipt, conflicts, delta, ownMaterial} = out;
  // Where a value came from in CAESAR II (Owner 19 Nov 2026: "more traceable"): its CII elements, and how many of them had
  // the line number left empty by CAESAR II (read as the element's it was written on).
  const from = c => !c.cii ? '' : `${c.cii.elements.length} element(s), ${c.cii.elements.slice(0, 2).join(', ')}${c.cii.elements.length > 2 ? '…' : ''}`
    + (Object.keys(c.cii.lineNumberCarried || {}).length ? `; line number carried on ${Object.keys(c.cii.lineNumberCarried || {}).length} (written on ${[...new Set(Object.values(c.cii.lineNumberCarried || {}))].slice(0, 2).join(', ')})` : '');
  const moved = receipt.changes.map(c => [c.ref?.branchName, c.ref?.nodeNumber, c.field, c.before, c.after, from(c)]);
  const follows = transfer.delta.ops.filter(o => o.op === 'set' && o.after?.rule === 'material-follows-branch').length;
  $('trSummary').replaceChildren(
    el('span', {textContent: `${moved.length} value(s) transferred and locked`}),
    el('span', {textContent: `${follows} node material value(s) follow the branch material`}),
    el('span', {textContent: `${ownMaterial.length} node(s) had their own material, now the branch's (listed below)`}),
    el('span', {textContent: `${receipt.supports?.changes.length ?? 0} support change(s) transferred and locked`}),
    el('span', {textContent: `${transfer.diagnostics.length} refused by the transfer`}),
    el('span', {textContent: `${delta.ops.length} value(s) changed by the stage`}),
    el('span', {textContent: `${conflicts.length} change(s) stopped by a lock`}));
  $('trMoved').replaceChildren(table(['Branch', 'Node', 'Field', 'Before', 'Transferred', 'From CAESAR II'], moved));
  $('trOwnMaterial').replaceChildren(ownMaterial.length
    ? table(['Branch', 'Node', 'Node material before', 'Branch material before', 'Now (branch)'], ownMaterial)
    : el('div', {className: 'muted', textContent: 'No node had a material of its own: every node material followed the branch as before.'}));
  $('trConflicts').replaceChildren(conflicts.length
    ? table(['Branch', 'Node', 'Field', 'Kept (transfer)', 'The stage wanted'], conflicts.map(c => [c.branch, c.node ?? 'branch', c.key.replace(/\./g, '/'), c.kept, c.stageWanted]))
    : el('div', {className: 'muted', textContent: 'The stage did not try to change any transferred value.'}));
  const sup = supportRows(receipt.supports);
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

/** Section 5 without a receipt: the page runs the transfer from the CAESAR II file, then the usual run under locks. */
async function fromCii(xmlFile = $('trXml').files[0], ciiFile = $('trCii').files[0]) {
  u2d = null;
  $('trU2d').replaceChildren();
  if (!xmlFile || !ciiFile) throw new Error('open the Enriched XML and the CAESAR II file first');
  if (!$('trScale').value) throw new Error('choose the unit of the CII weights first (N for a file from the XML to CII tab)');
  name = xmlFile.name.replace(/\.[^.]+$/, '');
  const targetBytes = new Uint8Array(await xmlFile.arrayBuffer());
  u2d = await transferCiiIntoXml({targetBytes, ciiBytes: new Uint8Array(await ciiFile.arrayBuffer()), weightScale: Number($('trScale').value),
    names: {cii: ciiFile.name, target: xmlFile.name, revised: `${name}_transferred.xml`}, onStatus: text => say(text, false)});
  const {summary} = u2d.receipt;
  const refused = Object.entries(summary.refused).map(([code, n]) => `${code} ${n}`).join(', ') || 'none';
  $('trU2d').textContent = `Transfer from ${ciiFile.name}: ${summary.edits} value(s) differ and were transferred, ${summary.pairs} node pairs, `
    + `${summary.ciiElements} CII elements; refused: ${refused}. ${(u2d.ms / 1000).toFixed(1)} s in this browser.`;
  if (summary.supports) $('trU2d').textContent += ' ' + supportsLine(summary.supports);
  run({xmlText: decodeXml(targetBytes), receiptText: u2d.receiptText, stagedJsonText: await fileText('supStaged'),
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
  $('trFromCii').addEventListener('click', () => guarded(() => fromCii()));
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
