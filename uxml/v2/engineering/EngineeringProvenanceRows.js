// Flat rows for people (Owner 16 Nov, "close step 4"): one row per engineering value the supports stage changed (process
// block, class, rating, material, wall, corrosion, insulation, bore, weight), in plain words, with where it came from.
// Reads runSupportsStage's engineeringProvenance only; changes nothing.

export const ENGINEERING_COLUMNS = Object.freeze(['Branch', 'NodeNumber', 'NodeName', 'Type', 'What', 'Value', 'Set by', 'Came from',
  "Today's label", 'Key']);
const SET_BY = {
  branchPass: '1 branch pass', parentLoop: '1 parent support loop', preview: '1 preview rows', parentFinish: '1 finish',
  dtxr: '2 DTXR enrichment', process: '2b process parity', boreFromOd: '2b bore from node OD', sourceWall: '2b source wall kept',
  transferKept: '2b transferred value kept', atta: '3 ATTA default', mds: '4 MDS closure',
};
export const ENGINEERING_CAME_FROM = Object.freeze({
  popup: 'Run popup (rigid weight)', override: 'override', lineList: 'line list', pipingClass: 'piping class master',
  branchName: 'branch name', materialMap: 'material map', staged: 'staged JSON (DTXR)', auto: 'derived from class or regex',
  default: 'default', psi116: 'input XML', weightTable: 'weight table', split: 'node made by a split', stage: 'unexplained',
});

/** @param {{engineeringProvenance: {rows: object[]}}} stageResult runSupportsStage's result. */
export function engineeringTableRows(stageResult) {
  return stageResult.engineeringProvenance.rows.map((r) => ({
    Branch: r.branch, NodeNumber: r.scope === 'node' ? r.NodeNumber : '', NodeName: r.NodeName || '', Type: r.scope === 'node' ? r.ComponentType || '' : 'branch',
    What: r.field, Value: r.value, 'Set by': SET_BY[r.step] || r.step, 'Came from': ENGINEERING_CAME_FROM[r.src] || r.src,
    "Today's label": r.label || '', Key: r.key || '',
  }));
}

const cell = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** CSV text (with a byte-order mark so spreadsheet programs read it as UTF-8). */
export function engineeringCsv(rows) {
  return `﻿${[ENGINEERING_COLUMNS, ...rows.map((r) => ENGINEERING_COLUMNS.map((c) => r[c]))].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
