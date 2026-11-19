/**
 * Review page section 4 (Owner 16 Nov): run the supports stage in the browser and show where each support value and
 * restraint came from (step, source, rule, staged item), the warnings for staged supports that became no restraint, and
 * the duplicate supports removed. Download as CSV (same columns as the GOLDEN-30 provenance CSV). Nothing is uploaded.
 * Then the engineering values (UxmlV2EngineeringReview.js).
 */
import {runSupportsStage} from './supports/SupportsStage.js';
import {provenanceTableRows, provenanceCsv, PROVENANCE_COLUMNS} from './supports/SupportProvenanceRows.js';
import {showEngineering} from './UxmlV2EngineeringReview.js';
import {asStageResult, documentRemovedRows, readRunRecordFile, runOutcome, runRecordFacts, runRecordXmlMatch, transferKeptRows} from './UxmlV2RunRecord.js';

const $ = id => document.getElementById(id);
const SHOW_AT_MOST = 400;
const BENCH = '../../fixtures/uxml-v2-supports/';
const SAMPLE = {xml: 'oracle/G30/xml/engineering-pass-start.xml', staged: 'bench/golden-30_staged.json', config: 'bench/golden-30-job-config.json'};
// The same job with the 5 rigid weights today's Run popup suggests (Use All Best), as in the weight gate.
const SAMPLE_WEIGHTS = 'weights/G30/choices.json';
const DEFAULT_ROWS = 'bench/default-material-map-rows.json';
let result = null, rows = [], name = 'model', hadStaged = false, records = [];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node[k] = v;
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}
const say = (text, isNotice = true) => $('supMessage').replaceChildren(text ? el('div', {className: isNotice ? 'notice' : 'muted', textContent: text}) : '');
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

function run({xmlText, stagedJsonText, configText, rowsText}) {
  const supportConfig = parseJson(configText, 'support config') || {};
  const materialMapRows = parseJson(rowsText, 'material map rows');
  if (materialMapRows !== undefined && !Array.isArray(materialMapRows)) throw new Error('the material map rows file must hold a list of rows');
  $('supRecordInfo').replaceChildren();
  show(runSupportsStage({xmlText, stagedJsonText, supportConfig, masters: {materialMapRows}}), Boolean(stagedJsonText.trim()));
}

function show(stageResult, staged) {
  result = stageResult;
  rows = provenanceTableRows(result);
  hadStaged = staged;
  $('supBranch').replaceChildren(el('option', {value: '', textContent: 'all branches'}),
    ...[...new Set(rows.map(r => r.Branch))].map(b => el('option', {value: b, textContent: b})));
  $('supResult').hidden = false;
  say('');
  render();
  showEngineering(result, name);
}

const table = (head, body) => el('table', {}, el('tr', {}, ...head.map(h => el('th', {textContent: h}))),
  ...body.map(r => el('tr', {}, ...r.map(c => el('td', {textContent: c ?? ''})))));

/** A Run record from 3D_Converters step 10: that Run's own provenance (nothing is re-run). */
async function showRecord(index) {
  const record = records[index];
  name = record.model.replace(/\.[^.]+$/, '') + '-run';
  const xmlText = await fileText('supXml');
  const match = xmlText ? runRecordXmlMatch(record, xmlText) : undefined;
  const check = match === undefined ? 'Open the model XML too to check this record is for it.'
    : match ? `The model XML opened is the Run's ${match === 'source' ? 'input file' : 'CII input XML'}.`
      // Review note N1.2: a branch-subset Run hashes only the branches it ran, so the full model file differs too.
      : 'The model XML opened is not the input file or the CII input XML of this Run (its hash differs). If the Run used only some branches, the full model file differs as well.';
  const kept = transferKeptRows(record);
  const removed = documentRemovedRows(record);
  $('supRecordInfo').replaceChildren(...runRecordFacts(record).map(t => el('div', {className: 'muted', textContent: t})),
    el('div', {className: match === null ? 'notice' : 'muted', textContent: check}),
    kept.length ? el('div', {}, el('h3', {textContent: `Transfer-protected values (${kept.filter(r => r[5] === 'kept').length} of ${kept.length} kept)`}),
      table(['Branch', 'Node', 'Field', 'Transferred', runOutcome(record) === 'held' ? 'In the held XML' : 'In the CII input XML', ''], kept)) : '',
    removed.length ? el('div', {}, el('h3', {textContent: `Nodes the UXML document removed before the supports stage (${removed.length})`}),
      table(['Branch', 'Node number', 'Node name', 'Stage'], removed)) : '');
  show(asStageResult(record), Boolean(record.hashes?.stagedJson));
}

function renderSummary() {
  const c = result.provenance.counts;
  const from = Object.entries(rows.reduce((m, r) => ({...m, [r['Came from']]: (m[r['Came from']] || 0) + 1}), {}));
  $('supSummary').replaceChildren(el('span', {textContent: `${c.values} support values, ${c.restraints} restraints`}),
    ...from.map(([k, n]) => el('span', {textContent: `${k}: ${n}`})),
    c.rewritten ? el('span', {textContent: `rewritten in place: ${c.rewritten}`}) : null);
  const notes = [];
  if (c.unexplained) notes.push(el('div', {className: 'notice', textContent: `${c.unexplained} value(s) changed by a step that recorded no reason (Came from: unexplained).`}));
  const unmatched = result.diagnostics.filter(d => d.type === 'staged-support-unmatched');
  for (const w of unmatched) notes.push(el('div', {className: 'notice', textContent: `${w.code === 'SUPPORT_ORPHAN' ? 'Support with no node' : 'Support just out of reach'}: ${w.message}.`}));
  const removed = result.diagnostics.filter(d => d.type === 'duplicate-support-removed');
  if (removed.length) {
    notes.push(el('details', {}, el('summary', {textContent: `${removed.length} duplicate support node(s) removed at the same position`}),
      el('div', {className: 'mono', textContent: removed.map(d => `node ${d.removedNode} removed, node ${d.keptNode} kept (${d.reason})`).join('\n'), style: 'white-space:pre-line'})));
  }
  if (hadStaged && !unmatched.length) notes.push(el('div', {className: 'muted', textContent: 'Every staged support on a line of this model became a restraint or a label.'}));
  $('supWarnings').replaceChildren(...notes);
}

function render() {
  renderSummary();
  const branch = $('supBranch').value, came = $('supFrom').value, find = $('supFind').value.trim().toLowerCase();
  const shown = rows.filter(r => (!branch || r.Branch === branch) && (!came || r['Came from'] === came)
    && (!find || `${r.NodeNumber} ${r.NodeName} ${r.What} ${r['Staged item']}`.toLowerCase().includes(find)));
  const cols = PROVENANCE_COLUMNS.filter(c => c !== 'Branch');
  $('supTable').replaceChildren(el('thead', {}, el('tr', {}, ...cols.map(c => el('th', {textContent: c})))),
    el('tbody', {}, ...shown.slice(0, SHOW_AT_MOST).map(r => el('tr', {}, ...cols.map(c => el('td', {textContent: r[c], className: c === 'Value' || c === 'Was' ? 'mono' : ''}))))));
  $('supShown').textContent = shown.length > SHOW_AT_MOST ? `Showing ${SHOW_AT_MOST} of ${shown.length} rows; the CSV has all ${rows.length}.` : `${shown.length} of ${rows.length} rows.`;
}

async function guarded(fn) {
  say('Running the supports stage…', false);
  try { await fn(); } catch (error) { $('supResult').hidden = true; say('Could not run the supports stage: ' + String(error?.message || error)); }
}

function wire() {
  $('supRun').addEventListener('click', () => guarded(async () => {
    const xmlText = await fileText('supXml');
    if (!xmlText) throw new Error('open the model XML first');
    name = $('supXml').files[0].name.replace(/\.[^.]+$/, '');
    run({xmlText, stagedJsonText: await fileText('supStaged'), configText: await fileText('supConfig'),
      rowsText: (await fileText('supRows')) || await fetchText(DEFAULT_ROWS)});
  }));
  $('supSample').addEventListener('click', () => guarded(async () => {
    name = 'GOLDEN-30';
    run({xmlText: await fetchText(SAMPLE.xml), stagedJsonText: await fetchText(SAMPLE.staged), configText: await fetchText(SAMPLE.config),
      rowsText: await fetchText(DEFAULT_ROWS)});
  }));
  $('supSampleWeights').addEventListener('click', () => guarded(async () => {
    name = 'GOLDEN-30-popup-weights';
    run({xmlText: await fetchText(SAMPLE.xml), stagedJsonText: await fetchText(SAMPLE.staged), configText: await fetchText(SAMPLE_WEIGHTS),
      rowsText: await fetchText(DEFAULT_ROWS)});
  }));
  $('supOpenRecord').addEventListener('click', () => guarded(async () => {
    const text = await fileText('supRecord');
    if (!text) throw new Error('open a Run record (from 3D_Converters step 10) first');
    records = readRunRecordFile(text);
    $('supRecordModel').replaceChildren(...records.map((r, i) => el('option', {value: String(i), textContent: r.model})));
    $('supRecordModel').hidden = records.length < 2;
    await showRecord(0);
  }));
  $('supRecordModel').addEventListener('change', () => guarded(() => showRecord(Number($('supRecordModel').value))));
  for (const id of ['supBranch', 'supFrom']) $(id).addEventListener('change', render);
  $('supFind').addEventListener('input', render);
  $('supCsv').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([provenanceCsv(rows)], {type: 'text/csv'}));
    el('a', {href: url, download: `${name}-support-provenance.csv`}).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

wire();
