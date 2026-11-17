/**
 * Review page section 5 (UXML plan step 6, Owner 17 Nov): a property transfer as a UXML change with locks.
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
import {runEngineeringUnderLocks} from './transfer/LockedEngineering.js';

const $ = id => document.getElementById(id);
const BENCH = '../../fixtures/';
const SAMPLE = {xml: 'uxml-v2-transfer/BM2/base.xml', receipt: 'uxml-v2-transfer/BM2/receipt.json'};
const DEFAULT_ROWS = 'uxml-v2-supports/bench/default-material-map-rows.json';
let out = null, name = 'model';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node[k] = v;
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}
const say = (text, isNotice = true) => $('trMessage').replaceChildren(text ? el('div', {className: isNotice ? 'notice' : 'muted', textContent: text}) : '');
const fileText = async id => { const f = $(id).files[0]; return f ? f.text() : ''; };
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
  out = {transfer, receipt, ...runEngineeringUnderLocks(transfer.uxml, stage)};
  render();
}

function render() {
  const {transfer, receipt, conflicts, delta} = out;
  const moved = receipt.changes.map(c => [c.ref?.branchName, c.ref?.nodeNumber, c.field, c.before, c.after]);
  const follows = transfer.delta.ops.filter(o => o.op === 'set' && o.after?.rule === 'material-follows-branch').length;
  $('trSummary').replaceChildren(
    el('span', {textContent: `${moved.length} value(s) transferred and locked`}),
    el('span', {textContent: `${follows} node material value(s) follow the branch material`}),
    el('span', {textContent: `${transfer.diagnostics.length} refused by the transfer`}),
    el('span', {textContent: `${delta.ops.length} value(s) changed by the stage`}),
    el('span', {textContent: `${conflicts.length} change(s) stopped by a lock`}));
  $('trMoved').replaceChildren(table(['Branch', 'Node', 'Field', 'Before', 'Transferred'], moved));
  $('trConflicts').replaceChildren(conflicts.length
    ? table(['Branch', 'Node', 'Field', 'Kept (transfer)', 'The stage wanted'], conflicts.map(c => [c.branch, c.node ?? 'branch', c.key.replace(/\./g, '/'), c.kept, c.stageWanted]))
    : el('div', {className: 'muted', textContent: 'The stage did not try to change any transferred value.'}));
  $('trResult').hidden = false;
  say('');
}

function download(text, file, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  el('a', {href: url, download: file}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function guarded(fn) {
  say('Running the transfer and the stage under its locks…', false);
  try { await fn(); } catch (error) { $('trResult').hidden = true; say('Could not run: ' + String(error?.code || '') + ' ' + String(error?.message || error)); }
}

function wire() {
  $('trRun').addEventListener('click', () => guarded(async () => {
    const xmlText = await fileText('trXml');
    const receiptText = await fileText('trReceipt');
    if (!xmlText || !receiptText) throw new Error('open the Enriched XML and the transfer receipt first');
    name = $('trXml').files[0].name.replace(/\.[^.]+$/, '');
    run({xmlText, receiptText, stagedJsonText: await fileText('supStaged'), configText: await fileText('supConfig'),
      rowsText: (await fileText('supRows')) || await fetchText(DEFAULT_ROWS)});
  }));
  $('trSample').addEventListener('click', () => guarded(async () => {
    name = 'BM2-transfer';
    run({xmlText: await fetchText(SAMPLE.xml), receiptText: await fetchText(SAMPLE.receipt), stagedJsonText: '', configText: '',
      rowsText: await fetchText(DEFAULT_ROWS)});
  }));
  $('trDlXml').addEventListener('click', () => download(out.xmlText, `${name}_transfer-locked.xml`, 'application/xml'));
  $('trDlDelta').addEventListener('click', () => download(JSON.stringify(out.transfer.delta, null, 1), `${name}_transfer.delta.json`, 'application/json'));
}

wire();
