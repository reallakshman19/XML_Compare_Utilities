// Sample table text loaded by the "New" (Load Sample) button.

export const SAMPLE_TABLE_1 = `Point\tX\tY\tZ\tOriginGlobalX\tOriginGlobalY\tOriginGlobalZ\tAngleDeg
IP3-IP Start\t0\t0\t0\t301614.82\t2038115\t0\t0
IP3-IP-01\t384\t0\t0\t301614.82\t2038115\t0\t0
IP3-IP-02\t428\t44\t0\t301614.82\t2038115\t0\t0
Match line\t464\t98\t0\t301614.82\t2038115\t0\t0
Match line\t0\t0\t0\t301614.82\t2038115\t0\t329.84
IP-02AA\t303\t-176.5\t0\t301614.82\t2038115\t0\t329.84`;

export const SAMPLE_TABLE_2 = `Horizontal (m)\tGrade Elevation (m)
0.0\t231.32
6.7\t230.95
19.0\t230.82
31.9\t230.82
42.6\t231.38
54.1\t231.79
66.3\t232.28
77.8\t231.92
88.9\t231.08
98.5\t231.08
105.1\t231.66
118.7\t231.57
132.2\t231.81
141.3\t231.44
153.0\t232.33
164.0\t231.77
176.2\t231.31
187.4\t230.89
194.6\t230.87
207.7\t230.83
219.2\t230.83
225.5\t231.12
240.2\t231.52
249.4\t232.14
259.4\t231.74
275.8\t231.10
276.9\t231.04
289.0\t230.89
302.7\t230.85
312.6\t231.18
328.9\t231.33
342.3\t231.38
352.9\t231.33
365.1\t231.42
376.9\t231.85
386.0\t232.08
393.2\t232.75
404.3\t232.91
417.4\t232.83
429.9\t232.99
441.1\t232.11
446.4\t232.06
458.6\t232.98
467.3\t232.84
478.1\t232.95
487.7\t232.62
495.3\t232.59
503.3\t232.87
511.1\t233.17`;

export const SAMPLE_TABLE_3 = `Marker\tSegment Length (m)\tHorizontal Distance (m)
Marker 1\t20.5\t20.5
Marker 2\t34.3\t54.8
Marker 3\t16.0\t70.8
Marker 4\t111.5\t182.3
Marker 5\t48.1\t230.4
Marker 6\t154.5\t384.9
Marker 7\t56.0\t440.9
Marker 8\t12.5\t453.4
Marker 9\t18.7\t472.1
Marker 10\t38.9\t511.0`;

// Multi-sheet alt-format Table 1 sample: two blank-line-separated
// "Constant width / area / length / at point X= Y= Z=" blocks. Sheet 2's
// Angle is auto-derived from sheet 1's on Run — nothing here specifies it.
export const SAMPLE_TABLE_1_MULTISHEET = `    Constant width     0.300
              area   19179.305
            length   511.100
          at point  X=  661.549  Y= -160.249  Z=    0.000
          at point  X= 1045.626  Y= -160.249  Z=    0.000
          at point  X= 1089.468  Y= -116.407  Z=    0.000
          at point  X= 1125.687  Y=  -62.406  Z=    0.000

    Constant width    0.3000
              area   112231.6379
            length   1271.0677
          at point  X= 620.6918  Y=-241.5160  Z=   0.0000
          at point  X= 622.5026  Y=-243.1093  Z=   0.0000
          at point  X= 981.9652  Y=-452.2784  Z=   0.0000
          at point  X=1180.0855  Y=-557.5981  Z=   0.0000
          at point  X=1282.7178  Y=-554.6324  Z=   0.0000
          at point  X=1807.3639  Y=-521.1176  Z=   0.0000`;

export const SAMPLE_TABLE_2A_RAW = `H(coor)\tV(coor)\t[H vs V] Length\tStation Text\tElevation Text
659.791\t—\t—\t0+000.0\t231.32
661.791 → 682.337\t—\t—\t—\t—
665.621\t—\t—\t—\t—
668.540\t-715.825 → -650.258\t65.567\t0+006.7\t230.95
680.803\t-715.825 → -650.258\t65.567\t0+019.0\t230.82
682.337 → 716.683\t—\t—\t—\t—
682.337 → 732.683\t—\t—\t—\t—
688.135\t—\t—\t—\t—
693.658\t-715.825 → -650.258\t65.567\t0+031.9\t230.82
704.382\t-715.825 → -650.258\t65.567\t0+042.6\t231.38
715.911\t-715.825 → -650.258\t65.567\t0+054.1\t231.79
716.683 → 732.683\t—\t—\t—\t—
728.077\t-715.825 → -650.258\t65.567\t0+066.3\t232.28
739.546\t-715.825 → -650.258\t65.567\t0+077.8\t231.92`;

export const SAMPLE_TABLE_3A_RAW = `From H(coor)\tTo H(coor)\tText Position X\tHLength Text
661.791\t682.337\t671.704\t20.5
682.337\t716.683\t700.435\t34.3
716.683\t732.683\t723.927\t16.0`;

export const SAMPLE_TABLE_3B_RAW = `From H(coor)\tTo H(coor)\tText Position X\tZ Text
—\t—\t665.621\tA/G
682.337\t732.683\t708.374\t1.5M`;

export const SAMPLE_TABLE_3C_RAW = `Text Position X\tMarker Text
688.135\tPM-001`;

const DASH = '—';
const SPLIT_TABLES_PATCHED = new WeakSet();

function splitCells(line) {
  return String(line || '').split(/\t|\s{2,}|\|/).map((part) => part.trim());
}

function lines(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function numberFrom(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numbersFrom(value) {
  return (String(value ?? '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

function fmt(value, places = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DASH;
  return number.toFixed(places).replace(/\.0$/, '.0');
}

function fmt3(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DASH;
  return String(Math.round(number * 1000) / 1000);
}

function stationValue(text) {
  const match = String(text || '').match(/(\d+)\s*\+\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return (Number(match[1]) * 1000) + Number(match[2]);
}

function parseTable2A(rawText) {
  return lines(rawText).slice(1).map((line, index) => {
    const [hCoor = DASH, vCoor = DASH, length = DASH, station = DASH, elevation = DASH] = splitCells(line);
    return {
      row: index + 1,
      hCoor,
      vCoor,
      length,
      station,
      elevation,
      h: stationValue(station),
      v: numberFrom(elevation),
    };
  });
}

function interpolateByRow(rows, field) {
  const anchors = rows.filter((row) => Number.isFinite(row[field]));
  return rows.map((row) => {
    if (Number.isFinite(row[field])) return row[field];
    const prev = [...anchors].reverse().find((anchor) => anchor.row < row.row);
    const next = anchors.find((anchor) => anchor.row > row.row);
    const a = prev || anchors[0];
    const b = next || anchors[anchors.length - 1];
    if (!a || !b || a.row === b.row) return a?.[field] ?? b?.[field] ?? null;
    return a[field] + ((row.row - a.row) / (b.row - a.row)) * (b[field] - a[field]);
  });
}

function buildTable2X(rawText) {
  const rows = parseTable2A(rawText);
  const hInt = interpolateByRow(rows, 'h');
  const vInt = interpolateByRow(rows, 'v');
  const header = ['Row', 'H(coor)', 'V(coor)', '[H vs V] Length', 'Station Text', 'Elevation Text', 'H', 'V', 'H_Int', 'V_Int'];
  const body = rows.map((row, index) => [
    row.row,
    row.hCoor,
    row.vCoor,
    row.length,
    row.station,
    row.elevation,
    Number.isFinite(row.h) ? fmt(row.h, 1) : DASH,
    Number.isFinite(row.v) ? fmt(row.v, 2) : DASH,
    fmt(hInt[index], 1),
    fmt(vInt[index], 2),
  ]);
  return [header, ...body].map((row) => row.join('\t')).join('\n');
}

function buildTable2ModelInput(rawText) {
  const rows = parseTable2A(rawText).filter((row) => Number.isFinite(row.h) && Number.isFinite(row.v));
  return ['Horizontal (m)\tGrade Elevation (m)', ...rows.map((row) => `${fmt(row.h, 1)}\t${fmt(row.v, 2)}`)].join('\n');
}

function parseLengthRows(rawText) {
  return lines(rawText).slice(1).map((line) => {
    const [from = '', to = '', textX = '', length = ''] = splitCells(line);
    return { from, to, textX, length: numberFrom(length) };
  }).filter((row) => Number.isFinite(row.length));
}

function parseZRows(rawText) {
  return lines(rawText).slice(1).map((line) => {
    const [from = '', to = '', textX = '', zText = ''] = splitCells(line);
    return { from, to, textX, zText };
  }).filter((row) => row.zText && row.zText !== DASH);
}

function parseMarkerRows(rawText) {
  return lines(rawText).slice(1).map((line) => {
    const [textX = '', markerText = ''] = splitCells(line);
    return { textX, markerText };
  }).filter((row) => row.markerText && row.markerText !== DASH);
}

function hBasisFromHCoor(hCoor) {
  const nums = numbersFrom(hCoor);
  return nums.length ? nums[nums.length - 1] : null;
}

function rangeLabel(from, to, fallback) {
  const start = numberFrom(from);
  const end = numberFrom(to);
  if (Number.isFinite(start) && Number.isFinite(end)) return `${fmt3(start)} → ${fmt3(end)}`;
  return fallback || DASH;
}

function makeTable3Skeleton(table2Rows) {
  return table2Rows.map((row) => ({
    row: row.row,
    basis: hBasisFromHCoor(row.hCoor),
    hlengthRef: DASH,
    hlengthText: DASH,
    zRef: DASH,
    zText: DASH,
    markerRef: DASH,
    markerText: DASH,
    hlength: null,
    hlengthCum: null,
  }));
}

function findRowByBasis(rows, target, used = new Set()) {
  let best = null;
  let bestDelta = Infinity;
  rows.forEach((row, index) => {
    if (used.has(index) || !Number.isFinite(row.basis) || !Number.isFinite(target)) return;
    const delta = Math.abs(row.basis - target);
    if (delta < bestDelta) {
      best = { row, index };
      bestDelta = delta;
    }
  });
  return bestDelta < 0.01 ? best : null;
}

function applyLengthRows(table3Rows, lengthRows) {
  let cumulative = 0;
  const used = new Set();
  lengthRows.forEach((lengthRow) => {
    cumulative += lengthRow.length;
    const target = numberFrom(lengthRow.to);
    const match = findRowByBasis(table3Rows, target, used);
    if (!match) return;
    used.add(match.index);
    match.row.hlengthRef = rangeLabel(lengthRow.from, lengthRow.to, lengthRow.textX);
    match.row.hlengthText = fmt(lengthRow.length, 1);
    match.row.hlength = lengthRow.length;
    match.row.hlengthCum = Number(fmt(cumulative, 1));
  });
}

function applyZRows(table3Rows, zRows) {
  zRows.forEach((zRow) => {
    const target = numberFrom(zRow.to) ?? numberFrom(zRow.textX);
    const match = findRowByBasis(table3Rows, target);
    if (!match) return;
    match.row.zRef = rangeLabel(zRow.from, zRow.to, zRow.textX);
    match.row.zText = zRow.zText;
  });
}

function applyMarkerRows(table3Rows, markerRows) {
  markerRows.forEach((markerRow) => {
    const target = numberFrom(markerRow.textX);
    const match = findRowByBasis(table3Rows, target);
    if (!match) return;
    match.row.markerRef = markerRow.textX;
    match.row.markerText = markerRow.markerText;
  });
}

function interpolateCumByRow(rows) {
  const anchors = rows
    .filter((row) => Number.isFinite(row.hlengthCum))
    .map((row) => ({ row: row.row, value: row.hlengthCum }));
  if (!anchors.find((anchor) => anchor.row === 1)) anchors.unshift({ row: 1, value: 0 });
  return rows.map((row) => {
    const exact = anchors.find((anchor) => anchor.row === row.row);
    if (exact) return exact.value;
    const prev = [...anchors].reverse().find((anchor) => anchor.row < row.row);
    const next = anchors.find((anchor) => anchor.row > row.row);
    const a = prev || anchors[0];
    const b = next || anchors[anchors.length - 1];
    if (!a || !b || a.row === b.row) return a?.value ?? b?.value ?? null;
    return a.value + ((row.row - a.row) / (b.row - a.row)) * (b.value - a.value);
  });
}

function buildTable3X(table2Raw, table3ARaw, table3BRaw, table3CRaw) {
  const rows = makeTable3Skeleton(parseTable2A(table2Raw));
  applyLengthRows(rows, parseLengthRows(table3ARaw));
  applyZRows(rows, parseZRows(table3BRaw));
  applyMarkerRows(rows, parseMarkerRows(table3CRaw));
  const cumInt = interpolateCumByRow(rows);
  const header = [
    'Row',
    'H(coor basis used)',
    '[H vs HLength] Text Position X',
    'HLength Text',
    '[H vs Z] Text Position X',
    'Z Text',
    '[H vs Markers] Text Position X',
    'Marker Text',
    'Hlength',
    'Hlength_Cum',
    'Hlength_Cum_Int',
    'Z',
    'MarkerText',
  ];
  const body = rows.map((row, index) => [
    row.row,
    fmt3(row.basis),
    row.hlengthRef,
    row.hlengthText,
    row.zRef,
    row.zText || DASH,
    row.markerRef,
    row.markerText || DASH,
    Number.isFinite(row.hlength) ? fmt(row.hlength, 1) : DASH,
    Number.isFinite(row.hlengthCum) ? fmt(row.hlengthCum, 1) : DASH,
    fmt(cumInt[index], 1),
    row.zText || DASH,
    row.markerText || DASH,
  ]);
  return { rows, cumInt, text: [header, ...body].map((row) => row.join('\t')).join('\n') };
}

function buildTable3ModelInput(table3X) {
  const rows = table3X.rows
    .map((row, index) => ({ marker: row.markerText, cumulative: table3X.cumInt[index] }))
    .filter((row) => row.marker && row.marker !== DASH && Number.isFinite(row.cumulative));
  return ['Marker\tSegment Length (m)\tHorizontal Distance (m)', ...rows.map((row) => `${row.marker}\t0\t${fmt(row.cumulative, 1)}`)].join('\n');
}

function findSlot(dialog, name) {
  return dialog.querySelector(`[data-p3d-split="${name}"]`);
}

function setTextAndInput(element, value) {
  if (!element) return;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncSplitTables(dialog) {
  const table2Raw = findSlot(dialog, 'table2a-raw')?.value || '';
  const table3ARaw = findSlot(dialog, 'table3a-raw')?.value || '';
  const table3BRaw = findSlot(dialog, 'table3b-raw')?.value || '';
  const table3CRaw = findSlot(dialog, 'table3c-raw')?.value || '';
  const table2X = buildTable2X(table2Raw);
  const table3X = buildTable3X(table2Raw, table3ARaw, table3BRaw, table3CRaw);
  const table2Preview = findSlot(dialog, 'table2x-preview');
  const table3Preview = findSlot(dialog, 'table3x-preview');
  const table2Output = dialog.querySelector('[data-p3d="table2x-output"]');
  const table3Output = dialog.querySelector('[data-p3d="table3x-output"]');
  if (table2Preview) table2Preview.textContent = table2X;
  if (table3Preview) table3Preview.textContent = table3X.text;
  if (table2Output) table2Output.textContent = table2X;
  if (table3Output) table3Output.textContent = table3X.text;
  setTextAndInput(dialog.querySelector('[data-p3d="table2"]'), buildTable2ModelInput(table2Raw));
  setTextAndInput(dialog.querySelector('[data-p3d="table3"]'), buildTable3ModelInput(table3X));
}

function applyMultiSheetSplitSample(dialog) {
  const defaults = {
    'table2a-raw': SAMPLE_TABLE_2A_RAW,
    'table3a-raw': SAMPLE_TABLE_3A_RAW,
    'table3b-raw': SAMPLE_TABLE_3B_RAW,
    'table3c-raw': SAMPLE_TABLE_3C_RAW,
  };
  Object.entries(defaults).forEach(([name, value]) => {
    const slot = findSlot(dialog, name);
    if (slot) slot.value = value;
  });
  syncSplitTables(dialog);
}

function rawPanel(title, name, placeholder) {
  return `<div class="p3d-input-panel" data-p3d-split-panel="${name}">
<label class="p3d-input-title">${title}</label>
<textarea data-p3d-split="${name}" placeholder="${placeholder}"></textarea>
<details class="p3d-raw-details" open><summary>Preview</summary><pre data-p3d-split="${name.replace('-raw', 'x-preview')}">Paste raw data to preview.</pre></details>
</div>`;
}

function markerRawPanel() {
  return `<div class="p3d-input-panel" data-p3d-split-panel="table3c-raw">
<label class="p3d-input-title">Table 3C Raw — H vs Markers</label>
<textarea data-p3d-split="table3c-raw" placeholder="Text Position X&#9;Marker Text"></textarea>
</div>`;
}

function patchPipelineDialog(dialog) {
  if (!dialog || SPLIT_TABLES_PATCHED.has(dialog)) return;
  SPLIT_TABLES_PATCHED.add(dialog);
  const table3Panel = dialog.querySelector('[data-p3d="table3-panel"]');
  if (table3Panel) {
    table3Panel.insertAdjacentHTML('afterend', `
${rawPanel('Table 2A Raw — H vs V', 'table2a-raw', 'H(coor)&#9;Station Text&#9;Elevation Text')}
${rawPanel('Table 3A Raw — H vs HLength', 'table3a-raw', 'From H&#9;To H&#9;Text Position X&#9;HLength Text')}
${rawPanel('Table 3B Raw — H vs Z', 'table3b-raw', 'From H&#9;To H&#9;Text Position X&#9;Z Text')}
${markerRawPanel()}
<details class="p3d-raw-details" open><summary>Table 3X Preview</summary><pre data-p3d-split="table3x-preview">Paste Table 3A/3B/3C raw data to preview.</pre></details>`);
  }
  const table1Output = dialog.querySelector('[data-p3d="table1-output"]');
  if (table1Output) {
    table1Output.insertAdjacentHTML('afterend', `
<h4>Table 2X — H vs V</h4>
<pre data-p3d="table2x-output">Run or load the multi-sheet sample to generate.</pre>
<h4>Table 3X — HLength / Z / Markers</h4>
<pre data-p3d="table3x-output">Run or load the multi-sheet sample to generate.</pre>`);
  }
  dialog.addEventListener('input', (event) => {
    if (event.target instanceof Element && event.target.matches('[data-p3d-split$="-raw"]')) syncSplitTables(dialog);
  });
  dialog.querySelector('[data-p3d="run"]')?.addEventListener('click', () => syncSplitTables(dialog), { capture: true });
  dialog.querySelector('[data-p3d="new-multisheet"]')?.addEventListener('click', () => queueMicrotask(() => applyMultiSheetSplitSample(dialog)), { capture: true });
}

function installPipeline3dSplitTableEnhancer(doc = globalThis.document) {
  if (!doc?.body || doc.body.dataset.p3dSplitTableEnhancer === '1') return;
  doc.body.dataset.p3dSplitTableEnhancer = '1';
  const patchAll = () => doc.querySelectorAll('.pipeline-3d-model-dialog').forEach(patchPipelineDialog);
  patchAll();
  const observer = new MutationObserver(patchAll);
  observer.observe(doc.body, { childList: true, subtree: true });
}

installPipeline3dSplitTableEnhancer();

export const _pipeline3dSplitTableSamples = Object.freeze({
  buildTable2X,
  buildTable3X,
  buildTable2ModelInput,
  buildTable3ModelInput,
  parseTable2A,
});
