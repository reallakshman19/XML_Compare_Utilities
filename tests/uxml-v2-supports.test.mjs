// UXML step 3 (supports): table extractor, supports layer in the kernel, view and ops.
// Oracle: fixtures/uxml-v2-supports (today's live step-10 chain, 3D_Converters main f8622395).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {runStage, undoDelta, makeValue, CODES} from '../uxml/v2/UxmlV2Kernel.js';
import {diffRevisions} from '../uxml/v2/UxmlV2Diff.js';
import {supportTableOf} from '../uxml/v2/supports/SupportTable.js';
import {viewOf, tableOfView, opsFromView} from '../uxml/v2/supports/SupportView.js';
import {BENCH_SOURCES} from '../scripts/uxml-v2-benches.mjs';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const FIX = here('../fixtures/uxml-v2-supports/');
const G30 = here('../fixtures/uxml-v2/golden-30.xml');
export const BENCH = Object.fromEntries(Object.entries(BENCH_SOURCES).map(([b, [xml]]) => [b, here('../' + xml)]));
const readFile = path => {
  const bytes = readFileSync(path);
  return readPsi116V2(bytes.toString('utf8'), {fileSha256: createHash('sha256').update(bytes).digest('hex')});
};
const tmp = mkdtempSync(join(tmpdir(), 'uxml-s3-'));
/** Runs the gate tool on (oracle, actual table); returns its exit code and first line. */
function compareTables(oraclePath, table, extra = []) {
  const actual = join(tmp, 'actual.json');
  writeFileSync(actual, JSON.stringify(table));
  const r = spawnSync(process.execPath, [here('../scripts/uxml-v2-supports-compare-tables.mjs'), oraclePath, actual, ...extra], {encoding: 'utf8'});
  return {code: r.status, line: r.stdout.split('\n')[0]};
}
const viewStage = {id: 'supports-test', rulesVersion: 't', reads: [], writes: ['supports'],
  run: (doc, {view}) => ({ops: opsFromView(doc, view)})};
const editable = view => JSON.parse(JSON.stringify(view));
const nodeOf = (view, number) => view.nodes.find(n => n.values.NodeNumber === number);
const reread = doc => readPsi116V2(writePsi116FromUxmlV2(doc).text ?? writePsi116FromUxmlV2(doc), {fileSha256: 'a'.repeat(64)});

test('S1 gate: the support table read from UXML equals today\'s input table on all 7 benchmarks', () => {
  for (const [bench, path] of Object.entries(BENCH)) {
    const r = compareTables(join(FIX, 'oracle', bench, '00-input-table.json'), supportTableOf(readFile(path)));
    assert.equal(r.code, 0, `${bench}: ${r.line}`);
    assert.match(r.line, /^PASS matched=\d+ differing=0 onlyExpected=0 onlyActual=0$/);
  }
});

test('the gate tool fails a wrong table (input vs final on GOLDEN-30)', () => {
  const r = compareTables(join(FIX, 'oracle/G30/99-final-table.json'), supportTableOf(readFile(G30)));
  assert.equal(r.code, 1);
  assert.match(r.line, /^FAIL /);
});

test('kernel: a supports-only stage adds, frames and removes a restraint; undo restores; no topology', () => {
  const doc = readFile(G30);
  const host = doc.pipelines.flatMap(p => p.components).find(c => c.restraints.length);
  const entity = {kind: 'restraint', sourceKey: host.sourceKey + ':S9', lineage: {op: 'add', from: [host.uid], stage: 's', rule: 't'},
    fieldOrder: ['Type'], values: {Type: makeValue('+Y', 'supportMapper', {text: '+Y'})}};
  const add = {id: 'a', rulesVersion: 't', writes: ['supports'], run: () => ({ops: [
    {op: 'add', uid: 'u:s3testrestraint1', parent: host.uid, after: host.restraints.at(-1).uid, kind: 'restraint', entity},
    {op: 'set', uid: 'u:s3testrestraint1', path: 'values.DirectionCosineY', after: makeValue(1, 'supportMapper', {text: '1.000000000'})},
    {op: 'set', uid: 'u:s3testrestraint1', path: 'frame', after: 'CII_XYZ'}]})};
  const r = runStage(add, doc);
  const added = r.uxml.pipelines.flatMap(p => p.components).find(c => c.uid === host.uid).restraints.at(-1);
  assert.equal(added.frame, 'CII_XYZ');
  assert.equal(diffRevisions(doc, r.uxml).changes.find(c => c.type === 'add').layer, 'supports');
  const undone = undoDelta(r.uxml, r.delta).uxml;
  assert.deepEqual(supportTableOf(undone), supportTableOf(doc));
  const remove = {id: 'rm', rulesVersion: 't', writes: ['supports'], run: () => ({ops: [{op: 'remove', uid: host.restraints[0].uid}]})};
  assert.equal(runStage(remove, doc).uxml.pipelines.flatMap(p => p.components).find(c => c.uid === host.uid).restraints.length, host.restraints.length - 1);
  const split = {id: 'sp', rulesVersion: 't', writes: ['supports'], run: () => ({ops: [{op: 'add', uid: 'u:s3testnode0001', parent: doc.pipelines[0].uid, after: null, kind: 'component', entity: {...entity, kind: 'component', restraints: []}}]})};
  assert.throws(() => runStage(split, doc), e => e.code === CODES.LAYER_UNDECLARED_WRITE);
});

test('S2: an unchanged view gives no ops on every benchmark', () => {
  for (const [bench, path] of Object.entries(BENCH)) {
    const doc = readFile(path);
    assert.deepEqual(opsFromView(doc, viewOf(doc)), [], bench);
    assert.deepEqual(tableOfView(viewOf(doc)), supportTableOf(doc), bench);
  }
});

test('S2: a changed restraint (Z -> Y with cosines, as today at node 560) is exactly that, and survives the writer', () => {
  const doc = readFile(G30);
  const view = editable(viewOf(doc));
  const r2 = nodeOf(view, '560').restraints[2];
  assert.equal(r2.fields.Type, 'Z');
  Object.assign(r2, {src: 'supportMapper', rule: 'existing-normalize'});
  Object.assign(r2.fields, {Type: 'Y', DirectionCosineX: '0.000000000', DirectionCosineY: '1.000000000', DirectionCosineZ: '0.000000000'});
  const r = runStage(viewStage, doc, {view});
  assert.deepEqual(supportTableOf(r.uxml), tableOfView(view));
  const sets = diffRevisions(doc, r.uxml).changes;
  assert.deepEqual(sets.map(c => c.key).sort(), ['DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ', 'Type', 'frame']);
  assert.ok(sets.filter(c => c.key !== 'frame').every(c => c.rule === 'existing-normalize' && c.layer === 'supports'));
  assert.deepEqual(supportTableOf(reread(r.uxml)), tableOfView(view));
});

test('S2: an added restraint and a node annotation survive the writer; removing it again gives the input table', () => {
  const doc = readFile(G30);
  const view = editable(viewOf(doc));
  const node = nodeOf(view, '70');
  node.values.DTXR_SOURCE = 'staged-json-position-group & test';
  node.restraints.push({uid: null, src: 'staged', rule: 'coord-match',
    fields: {Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0.3', DirectionCosineX: '0.000000000', DirectionCosineY: '0.000000000', DirectionCosineZ: '-1.000000000'}});
  const r = runStage(viewStage, doc, {view});
  assert.deepEqual(supportTableOf(r.uxml), tableOfView(view));
  const back = reread(r.uxml);
  assert.deepEqual(supportTableOf(back), tableOfView(view));
  const again = runStage(viewStage, r.uxml, {view: viewOf(doc)});
  assert.deepEqual(supportTableOf(again.uxml), supportTableOf(doc));
});

test('S2: the view may not change a non-supports node value', () => {
  const doc = readFile(G30);
  const view = editable(viewOf(doc));
  nodeOf(view, '70').values.Rating = '600';
  assert.throws(() => opsFromView(doc, view), e => e.code === 'UXML_SUPPORTS_NON_SUPPORT_WRITE');
});

/** Today's final support result poured into the view of the input (matched nodes only, as the gate matches). */
function viewWithOracle(doc, oracleRows) {
  const view = editable(viewOf(doc));
  const count = new Map();
  const keyOf = (r, k) => [r.branch, r.NodeNumber, r.NodeName, k].join('|');
  const want = new Map();
  for (const r of oracleRows) {
    const base = [r.branch, r.NodeNumber, r.NodeName].join('|');
    const k = (count.get(base) || 0) + 1; count.set(base, k);
    want.set(keyOf(r, k), r);
  }
  count.clear();
  for (const n of view.nodes) {
    const row = {branch: n.branch, NodeNumber: n.values.NodeNumber ?? '', NodeName: n.values.NodeName ?? ''};
    const base = [row.branch, row.NodeNumber, row.NodeName].join('|');
    const k = (count.get(base) || 0) + 1; count.set(base, k);
    const target = want.get(keyOf(row, k));
    if (!target) continue;
    for (const tag of Object.keys(n.values)) if (/^(DTXR_|CMPSUPGAP)/.test(tag) && !(tag in target.support)) delete n.values[tag];
    Object.assign(n.values, target.support);
    n.restraints = target.restraints.map((fields, i) => ({uid: n.restraints[i]?.uid ?? null, fields, src: 'supportMapper', rule: 'oracle'}));
  }
  return view;
}

test('S2: today\'s whole final result fits through view -> ops -> kernel -> writer -> reader on all 7 benchmarks', () => {
  for (const [bench, path] of Object.entries(BENCH)) {
    const doc = readFile(path);
    const oraclePath = join(FIX, 'oracle', bench, '99-final-table.json');
    const view = viewWithOracle(doc, JSON.parse(readFileSync(oraclePath, 'utf8')));
    const result = runStage(viewStage, doc, {view});
    const report = join(tmp, bench + '.report.json');
    compareTables(oraclePath, supportTableOf(reread(result.uxml)), ['--allow-topology', '--json', report]);
    const gate = spawnSync(process.execPath, [here('../scripts/uxml-v2-supports-check-gate.mjs'), join(FIX, 'GATES.json'), bench, '04-mds-closure', report], {encoding: 'utf8'});
    assert.equal(gate.status, 0, gate.stdout);
  }
});
