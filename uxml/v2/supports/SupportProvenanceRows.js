// Flat rows for people (Owner 16 Nov, review page shows where each support value came from): one row per support value and
// per restraint of the stage's final XML, in plain words, the same columns as the GOLDEN-30 provenance CSV the Owner has.
// Reads runSupportsStage's result only; changes nothing.
import { plainSupportTable } from './SupportProvenance.js';

export const PROVENANCE_COLUMNS = Object.freeze(['Branch', 'NodeNumber', 'NodeName', 'Type', 'What', 'Value', 'Set by', 'Came from', 'Rule',
  'Staged item', 'Staged JSON path', 'Matched by', 'Match key', 'Was']);
const SET_BY = { input: 'already in the input XML', parent: '1 parent support match', dtxr: '2 DTXR enrichment', atta: '3 ATTA default', mds: '4 MDS closure' };
const CAME_FROM = { psi116: 'input XML', staged: 'staged JSON', supportMapper: 'configured default profile', stage: 'unexplained' };

const restraintText = (fields) => Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(' ');

function line(row, what, value, rec) {
  const e = rec.evidence || {};
  return {
    Branch: row.branch, NodeNumber: row.NodeNumber, NodeName: row.NodeName || '', Type: row.ComponentType || '', What: what, Value: value,
    'Set by': SET_BY[rec.step] || rec.step, 'Came from': CAME_FROM[rec.src] || rec.src, Rule: rec.rule, 'Staged item': e.staged || '',
    'Staged JSON path': (e.paths || []).join(' '), 'Matched by': e.matchedBy || '', 'Match key': e.key ?? '', Was: e.from ? JSON.stringify(e.from) : '',
  };
}

/** @param {{stages: Record<string,string>, provenance: {rows: object[]}}} stageResult runSupportsStage's result. */
export function provenanceTableRows(stageResult) {
  const final = plainSupportTable(stageResult.stages['04-mds-closure']);
  const out = [];
  for (const row of stageResult.provenance.rows) {
    const facts = final[row.row];
    for (const [tag, rec] of Object.entries(row.values)) out.push(line(row, tag, facts.support[tag], rec));
    row.restraints.forEach((rec, j) => out.push(line(row, `Restraint ${j + 1}`, restraintText(facts.restraints[j]), rec)));
  }
  return out;
}

const cell = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** CSV text (with a byte-order mark so spreadsheet programs read it as UTF-8). */
export function provenanceCsv(rows) {
  return `﻿${[PROVENANCE_COLUMNS, ...rows.map((r) => PROVENANCE_COLUMNS.map((c) => r[c]))].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
