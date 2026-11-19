// Step 10's gasket drop as a UXML stage (Owner 19 Nov 2026, end-to-end plan E1): the same nodes as today's
// dropGasketNodesFromXmlText, each removal recorded in the delta, and the written XML equal on every value to today's
// XML after the drop (oracle engineering-pass-start.xml, recorded from today's live step-10 chain). All 5 models:
// node scripts/uxml-v2-gasket-gate.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {applyDelta, sha256Hex, undoDelta} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {documentRemovedRows, runRecordFacts} from '../uxml/v2/UxmlV2RunRecord.js';
import {documentRecord, GASKET_DROP_RULE, step10Document} from '../uxml/v2/topology/GasketDropStage.js';

const RMS = 'fixtures/uxml-v2-supports/bench/RMS-BLOW-1.xml';
const TODAY = 'fixtures/uxml-v2-supports/oracle/RMS-BLOW-1/xml/engineering-pass-start.xml';
const read = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});
const nodeValues = doc => doc.pipelines.flatMap(p => p.components.map(c =>
  JSON.stringify(Object.fromEntries(Object.entries(c.values).map(([k, v]) => [k, v.v])))));

test('RMS-BLOW-1: 40 GASK nodes removed and recorded; the XML equals today\'s after the drop', () => {
  const text = readFileSync(RMS, 'utf8');
  const out = step10Document(text);
  assert.equal(out.removed.length, 40);
  for (const op of out.delta.ops) {
    assert.equal(op.op, 'remove');
    assert.equal(op.rule, GASKET_DROP_RULE);
    assert.equal(op.before.values.ComponentType.v, 'GASK', 'the delta keeps the removed node with its values');
    assert.ok(op.parent, 'and its branch');
  }
  assert.deepEqual(out.result.retiredUids, out.removed.map(r => r.uid).sort());
  assert.deepEqual(nodeValues(read(out.xmlText)), nodeValues(read(readFileSync(TODAY, 'utf8'))));
  assert.equal(applyDelta(out.source, out.delta).revision.id, out.result.revision.id, 'the delta replays');
  const back = undoDelta(out.result, out.delta).uxml;
  assert.deepEqual(nodeValues(back), nodeValues(out.source), 'undo brings every gasket back');
});

test('drop off (step 10 options): nothing removed, the XML written back unchanged', () => {
  const text = readFileSync(RMS, 'utf8');
  const out = step10Document(text, {drop: false});
  assert.equal(out.delta.ops.length, 0);
  assert.equal(out.xmlText, text);
});

test('the Run record keeps the removals and the review page lists them', () => {
  const record = {document: documentRecord(step10Document(readFileSync(RMS, 'utf8'))), parity: {}, compare: {}};
  assert.equal(documentRemovedRows(record).length, 40);
  assert.deepEqual(documentRemovedRows(record)[0].slice(0, 2).map(String).map(Boolean), [true, true], 'branch and node number');
  assert.match(runRecordFacts(record).at(-1), /gasket drop removed 40 node\(s\)/);
  assert.deepEqual(documentRemovedRows({}), []);
});

test('a file the UXML reader refuses: the Run record says so, and lists no removals', () => {
  const record = {document: {made: false, refusal: 'PSI116_VERIFIED_NAMESPACE_REQUIRED'}, parity: {}, compare: {}};
  assert.match(runRecordFacts(record).at(-1), /UXML document not made \(PSI116_VERIFIED_NAMESPACE_REQUIRED\)/);
  assert.deepEqual(documentRemovedRows(record), []);
});
