import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCii, scanLines } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { sha256 } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { parseNodalCsv, planNodalTransfer, validateNodalTransfer }
  from '../tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js';

const row = values => values.map((v, i) => String(v).padStart(i ? 13 : 15)).join('');
const element = pointer => Array.from({ length: 15 }, (_, i) =>
  i === 0 ? row([280, 285, 100, 0, 0, 0]) :
  i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));

function makeFixture({ declaredNumelt, elements = 1, eol = '\r\n' } = {}) {
  const elemBlocks = [];
  for (let i = 0; i < elements; i++) {
    elemBlocks.push(...element(0));
  }
  const controlLine = row([declaredNumelt, 0, 0, 0, 0, 0]);
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', controlLine,
    '#$ ELEMENTS', ...elemBlocks,
    '#$ BEND', row([1, 2, 3, 4, 5, 6])
  ];
  return new Uint8Array(Buffer.from(lines.join(eol) + eol, 'ascii'));
}

test('F3: NUMELT=2 and NUMELT=99 with 1 physical element are HELD and fail closed', async () => {
  for (const declared of [2, 99]) {
    const bytes = makeFixture({ declaredNumelt: declared, elements: 1 });
    const parsed = parseCii(bytes);
    assert.equal(parsed.elements.length, 1);

    const plan = planNodalTransfer(parsed, parseNodalCsv('Node,Replace\n285,NEW'));
    assert.equal(plan.counts.ready, 0, `declared NUMELT=${declared} must have 0 ready rows`);
    assert.equal(plan.counts.held, 1);
    assert.equal(plan.records[0].status, 'HELD');
    assert.equal(plan.records[0].reason, 'CONTROL_NUMELT_MISMATCH');

    const originalHash = await sha256(bytes);
    await assert.rejects(
      validateNodalTransfer({
        targetBytes: bytes,
        originalHash,
        plan,
        approvedIds: ['N1']
      }),
      /NODAL_APPROVED_ROW_NOT_READY|NODAL_CONTROL_NUMELT_MISMATCH/
    );
  }
});

test('F3: invalid NUMELT (0, negative, non-integer) is HELD as invalid', async () => {
  const invalidCases = [
    { label: 'zero', numelt: 0 },
    { label: 'negative', numelt: -1 },
    { label: 'non-integer', numelt: 'ABC' }
  ];

  for (const c of invalidCases) {
    const bytes = makeFixture({ declaredNumelt: c.numelt, elements: 1 });
    const parsed = parseCii(bytes);
    const plan = planNodalTransfer(parsed, parseNodalCsv('Node,Replace\n285,NEW'));
    assert.equal(plan.counts.ready, 0, `invalid ${c.label} must have 0 ready rows`);
    assert.equal(plan.records[0].status, 'HELD');
    assert.equal(plan.records[0].reason, 'CONTROL_NUMELT_INVALID');

    const originalHash = await sha256(bytes);
    await assert.rejects(
      validateNodalTransfer({
        targetBytes: bytes,
        originalHash,
        plan,
        approvedIds: ['N1']
      }),
      /NODAL_APPROVED_ROW_NOT_READY|NODAL_CONTROL_NUMELT_INVALID/
    );
  }
});

test('F3: positive control NUMELT=1 with 1 element passes with independent byte verification', async () => {
  const bytes = makeFixture({ declaredNumelt: 1, elements: 1 });
  const before = Uint8Array.from(bytes);
  const parsed = parseCii(bytes);
  assert.equal(parsed.elements.length, 1);

  const plan = planNodalTransfer(parsed, parseNodalCsv('Node,Replace\n285,NEW'));
  assert.equal(plan.counts.ready, 1);
  assert.equal(plan.records[0].status, 'READY');

  const originalHash = await sha256(bytes);
  const result = await validateNodalTransfer({
    targetBytes: bytes,
    originalHash,
    plan,
    approvedIds: ['N1']
  });

  assert.equal(result.insertedRecords, 1);
  assert.deepEqual(bytes, before, 'TARGET0 immutable');

  // Independent verification of TARGET1 physical bytes
  const postLines = scanLines(result.bytes);
  const marker = line => /^\s*#\$\s*([^\s]+)/i.exec(line?.text)?.[1]?.toUpperCase();
  const cAt = postLines.findIndex(l => marker(l) === 'CONTROL');
  assert.ok(cAt >= 0, 'CONTROL section exists');
  const cLine = postLines[cAt + 1];
  const postNumelt = Number(cLine.text.slice(0, 15).trim());
  assert.equal(postNumelt, 1, 'independent TARGET1 NUMELT must be 1');

  // Count physical element blocks independently
  const eAt = postLines.findIndex(l => marker(l) === 'ELEMENTS');
  const nextAt = postLines.findIndex((l, i) => i > eAt && !!marker(l));
  const elemRows = postLines.slice(eAt + 1, nextAt < 0 ? postLines.length : nextAt).filter(l => l.text.trim());
  assert.equal(elemRows.length, 15, 'independent element rows must equal 15');
  assert.equal(elemRows.length / 15, postNumelt, 'cardinality matches NUMELT');
});

test('F1: Nodal preview and Apply fail closed on noncanonical section markers', async () => {
  const canonical = makeFixture({ declaredNumelt: 1, elements: 1 });
  for (const [before, after] of [
    ['#$ CONTROL', '  #$ control'],
    ['#$ CONTROL', '#$ control'],
    ['#$ CONTROL', '#$CONTROL'],
    ['#$ ELEMENTS', '  #$ ELEMENTS'],
    ['#$ VERSION', '#$ version'],
    ['#$ BEND', '#$ bend']
  ]) {
    const input = new Uint8Array(Buffer.from(Buffer.from(canonical).toString('ascii').replace(before, after), 'ascii'));
    const parsed = parseCii(input);
    const rows = parseNodalCsv('Node,Replace\n285,RENAME285');
    assert.throws(() => planNodalTransfer(parsed, rows), /NODAL_SECTION_MARKER_NONCANONICAL/);
    const approved = planNodalTransfer(parseCii(canonical), rows);
    await assert.rejects(validateNodalTransfer({
      targetBytes: input, originalHash: await sha256(input),
      plan: approved, approvedIds: ['N1']
    }), /NODAL_SECTION_MARKER_NONCANONICAL/);
  }
});
