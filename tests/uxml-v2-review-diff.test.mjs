// UXML revamp step 2: revision diff, stage pipeline and review session on GOLDEN-30.
// Expected values are the Owner checks of step 2, not output copied from the code.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {diffRevisions, groupChanges} from '../uxml/v2/UxmlV2Diff.js';
import {openPsi116, latest, runRepair, setValue, splitNode, undoLast, openDelta, psi116Of, messageOf} from '../uxml/v2/UxmlV2ReviewSession.js';
import {runStages, STAGE_REGISTRY} from '../uxml/v2/UxmlV2Stages.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';

const TEXT = readFileSync(new URL('../fixtures/uxml-v2/golden-30.xml', import.meta.url), 'utf8');
const T1 = 'Temperature.Temperature1';
const fresh = () => openPsi116(TEXT, 'GOLDEN-30.xml');
const firstBranch = s => s.revisions[0].doc.pipelines[0];
const diffLast = (s, from = s.revisions.length - 2) => diffRevisions(s.revisions[from].doc, latest(s).doc);

test('an Owner edit of T1 on one branch is exactly 1 change, source owner, before and after shown', () => {
  const s = setValue(fresh(), {uid: firstBranch(fresh()).uid, key: T1, v: 777});
  const {changes} = diffLast(s);
  assert.equal(changes.length, 1);
  assert.deepEqual([changes[0].type, changes[0].key, changes[0].before, changes[0].after, changes[0].src],
    ['set', T1, '340', '777', 'owner']);
  assert.equal(changes[0].layer, 'engineering');
  assert.equal(changes[0].stage, 'test-set-value');
});

test('a node split is exactly 1 new node, linked to the node it came from', () => {
  const base = fresh();
  const source = firstBranch(base).components[3];
  const s = splitNode(base, {uid: source.uid});
  const {changes} = diffLast(s);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'split');
  assert.deepEqual(changes[0].from, [source.uid]);
  assert.deepEqual(changes[0].fromLabels, [String(source.values.NodeNumber.v)]);
  const undone = undoLast(s);
  assert.deepEqual(diffLast(undone).changes.map(c => c.type), ['remove']);
  assert.equal(diffLast(undone, 0).changes.length, 0);
});

test('the repair placeholder makes 0 changes and says it is not connected', () => {
  const s = runRepair(fresh());
  assert.equal(diffLast(s).changes.length, 0);
  assert.deepEqual(latest(s).diagnostics.map(d => d.code), ['TOPOFIX_NOT_INTEGRATED']);
  assert.match(messageOf(latest(s).diagnostics[0]), /not connected/);
});

test('undoing an edit gives an empty diff against the read; an undo is not undone again', () => {
  let s = setValue(fresh(), {uid: firstBranch(fresh()).uid, key: T1, v: 500});
  s = undoLast(s);
  assert.equal(diffLast(s, 0).changes.length, 0);
  assert.equal(psi116Of(latest(s)), TEXT);
  assert.throws(() => undoLast(s), {code: 'NOTHING_TO_UNDO'});
  assert.throws(() => undoLast(fresh()), {code: 'NOTHING_TO_UNDO'});
});

test('a locked value is marked, and a later edit of it is refused with 0 changes', () => {
  const uid = firstBranch(fresh()).uid;
  let s = setValue(fresh(), {uid, key: T1, v: 610, lock: true});
  const types = diffLast(s).changes.map(c => c.type).sort();
  assert.deepEqual(types, ['lock', 'set']);
  assert.ok(diffLast(s).changes.every(c => c.lock));
  s = setValue(s, {uid, key: T1, v: 1});
  assert.equal(diffLast(s).changes.length, 0);
  assert.deepEqual(latest(s).refusals.map(r => r.code), ['UXML_LOCKED_VALUE']);
});

test('a delta saved as JSON and opened again gives the same revision and the same diff', () => {
  const edited = setValue(fresh(), {uid: firstBranch(fresh()).uid, key: T1, v: 777});
  const saved = JSON.parse(JSON.stringify(latest(edited).delta));
  const reopened = openDelta(fresh(), saved);
  assert.equal(latest(reopened).doc.revision.id, latest(edited).doc.revision.id);
  assert.deepEqual(diffLast(reopened), diffLast(edited));
  assert.throws(() => openDelta(fresh(), {...saved, base: 'r:0'}), {code: 'UXML_DELTA_BASE_MISMATCH'});
});

test('the diff counts value moves, not rev stamps, and reads any two revisions', () => {
  const s = splitNode(setValue(fresh(), {uid: firstBranch(fresh()).uid, key: T1, v: 777}),
    {uid: firstBranch(fresh()).components[3].uid});
  const all = diffRevisions(s.revisions[0].doc, latest(s).doc);
  assert.deepEqual(all.counts, {set: 1, split: 1});
  const same = readPsi116V2(TEXT, {fileSha256: sha256Hex(TEXT)});
  assert.equal(diffRevisions(s.revisions[0].doc, same).changes.length, 0);
  const groups = groupChanges(all.changes);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].nodes.map(n => n.changes.length), [1, 1]);
});

test('runStages runs the registry in order; the repair step keeps the model and records the stage', () => {
  const doc = fresh().revisions[0].doc;
  const steps = runStages(doc);
  assert.deepEqual(steps.map(x => x.stage), STAGE_REGISTRY.map(x => x.id));
  assert.equal(steps[0].uxml.revision.stage, 'repair');
  assert.deepEqual(steps[0].uxml.revision.parents, [doc.revision.id]);
  assert.equal(diffRevisions(doc, steps.at(-1).uxml).changes.length, 0);
});
