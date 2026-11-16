/**
 * Review page section 4, engineering values (Owner 16 Nov, "close step 4"): after the supports stage runs, list every process,
 * class, material, wall, insulation, bore and weight value it changed, with the step that set it and where it came from
 * (Run popup, line list, piping class, branch name, override, default, input XML). Filter, find, download as CSV.
 */
import {ENGINEERING_CAME_FROM, ENGINEERING_COLUMNS, engineeringCsv, engineeringTableRows} from './engineering/EngineeringProvenanceRows.js';

const $ = id => document.getElementById(id);
const SHOW_AT_MOST = 400;
let rows = [], name = 'model';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node[k] = v;
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}

function render() {
  const came = $('engFrom').value, find = $('engFind').value.trim().toLowerCase();
  const shown = rows.filter(r => (!came || r['Came from'] === came) && (!find || `${r.Branch} ${r.NodeNumber} ${r.What}`.toLowerCase().includes(find)));
  $('engTable').replaceChildren(el('thead', {}, el('tr', {}, ...ENGINEERING_COLUMNS.map(c => el('th', {textContent: c})))),
    el('tbody', {}, ...shown.slice(0, SHOW_AT_MOST).map(r => el('tr', {}, ...ENGINEERING_COLUMNS.map(c => el('td', {textContent: r[c], className: c === 'Value' ? 'mono' : ''}))))));
  $('engShown').textContent = shown.length > SHOW_AT_MOST ? `Showing ${SHOW_AT_MOST} of ${shown.length} rows; the CSV has all ${rows.length}.` : `${shown.length} of ${rows.length} rows.`;
}

/** Show the engineering values of one supports-stage run (`modelName` names the CSV). */
export function showEngineering(result, modelName) {
  name = modelName;
  rows = engineeringTableRows(result);
  const c = result.engineeringProvenance.counts;
  const from = Object.entries(rows.reduce((m, r) => ({...m, [r['Came from']]: (m[r['Came from']] || 0) + 1}), {}));
  $('engSummary').replaceChildren(el('span', {textContent: `${c.values} engineering values changed, ${c.unchanged} kept from the input`}),
    ...from.map(([k, n]) => el('span', {textContent: `${k}: ${n}`})));
  $('engWarnings').replaceChildren(c.unexplained
    ? el('div', {className: 'notice', textContent: `${c.unexplained} value(s) with no source found (Came from: unexplained).`}) : '');
  $('engFrom').replaceChildren(el('option', {value: '', textContent: 'any source'}),
    ...Object.values(ENGINEERING_CAME_FROM).filter(v => rows.some(r => r['Came from'] === v)).map(v => el('option', {value: v, textContent: v})));
  render();
}

$('engFrom').addEventListener('change', render);
$('engFind').addEventListener('input', render);
$('engCsv').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([engineeringCsv(rows)], {type: 'text/csv'}));
  el('a', {href: url, download: `${name}-engineering-provenance.csv`}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
