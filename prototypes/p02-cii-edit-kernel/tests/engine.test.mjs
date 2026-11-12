// P0.2 CII edit kernel tests. Titles start with the card's test id (card-check C3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { attempt, requireSha256 } from '../kit/core.mjs';
import { CARD_DIR } from '../kit/node.mjs';
import { readCii14, fieldDiff, rigidOf } from '../kit/cii14.mjs';
import { locate, checkSpansDisjoint } from '../engine/locate.mjs';
import { formatCiiNumber, formatCiiName, weightValue } from '../engine/format.mjs';
import { applyChangeset, planChange, spliceSpans, recheck } from '../engine/apply.mjs';
import { bench, fixture, change, elRef, nodeRef, changeset, expectRefusal } from './helpers.mjs';

const LF = () => fixture('tiny-v14-lf.cii');
const CRLF = () => fixture('tiny-v14-crlf.cii');

/** One RIGID/WEIGHT change for element e of cii. */
const weightChange = (cii, e, newValue, over = {}) =>
  change({ target: elRef(e), oldToken: rigidOf(cii, e.index).weight.token, newValue, ...over });

// ---------------------------------------------------------------- T1 reader on the pinned files
test('T1 readCii14: X-S1 56 elements / 1 rigid / 49 names; X-T 1614 / 124; X-SRC (v11) refused', async () => {
  const s1 = readCii14(await bench('X-S1'));
  assert.equal(s1.counts.NUMELT, 56); assert.equal(s1.rigids.length, 1); assert.equal(s1.nodeNames.length, 49);
  const t = readCii14(await bench('X-T'));
  assert.equal(t.counts.NUMELT, 1614); assert.equal(t.rigids.length, 124);
  const src = await bench('X-SRC');
  const r = await attempt(() => readCii14(src));
  assert.equal(r.ok, false); assert.equal(r.refusals[0].code, 'CII_VERSION_UNSUPPORTED');
  // and the kernel passes the reader's refusal through, with no bytes
  const k = await applyChangeset(src, await changeset(src, []));
  expectRefusal(k, 'CII_VERSION_UNSUPPORTED');
});

// ---------------------------------------------------------------- T2 empty change set
test('T2 an empty Change set gives bytes identical to the input', async () => {
  const s1 = await bench('X-S1');
  const r = await applyChangeset(s1, await changeset(s1, []));
  assert.equal(r.ok, true);
  assert.deepEqual(Buffer.from(r.bytes), Buffer.from(s1));
  assert.deepEqual(r.applied, []);
});

// ---------------------------------------------------------------- T3 checksum lock
test('T3 a base.sha256 one hex digit off is refused with KERNEL_BASE_SHA256_MISMATCH and no bytes', async () => {
  const s1 = await bench('X-S1');
  const cii = readCii14(s1);
  const cs = await changeset(s1, [weightChange(cii, cii.elements[55], 1529)]);
  const h = cs.base.sha256;
  cs.base.sha256 = (h[0] === 'a' ? 'b' : 'a') + h.slice(1);
  expectRefusal(await applyChangeset(s1, cs), 'KERNEL_BASE_SHA256_MISMATCH');
});

// ---------------------------------------------------------------- T4 one rigid weight on X-S1
test('T4 one rigid weight on X-S1: fieldDiff shows exactly 1 field with the formatted new token', async () => {
  const s1 = await bench('X-S1');
  const cii = readCii14(s1);
  const e = cii.elements[55];
  const old = rigidOf(cii, 55).weight;
  const r = await applyChangeset(s1, await changeset(s1, [weightChange(cii, e, 1529)]));
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  const d = fieldDiff(cii, readCii14(r.bytes));
  assert.equal(d.length, 1);
  assert.equal(d[0].section, 'RIGID');
  assert.equal(d[0].start, old.start); assert.equal(d[0].end, old.end);
  assert.equal(d[0].before, ' 1.390000E+03');
  assert.equal(d[0].after.trim(), formatCiiNumber(1529, old.token).trim());
  assert.equal(d[0].after, ' 1.529000E+03');
  assert.deepEqual(r.applied, [{ changeId: r.applied[0].changeId, start: old.start, end: old.end, oldToken: '1.390000E+03', newToken: '1.529000E+03' }]);
  assert.equal(r.bytes.length, s1.length);
});

// ---------------------------------------------------------------- T5 every rigid on X-T
test('T5 every rigid weight on X-T (124 changes, old x 1.1): exactly 124 fields differ and the output reads', async () => {
  const t = await bench('X-T');
  const cii = readCii14(t);
  const changes = cii.rigids.map(rg => {
    const e = cii.elements[rg.element];
    return weightChange(cii, e, Math.round(rg.weight.value * 1.1 * 1000) / 1000);
  });
  assert.equal(changes.length, 124);
  const r = await applyChangeset(t, await changeset(t, changes));
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  const out = readCii14(r.bytes);
  assert.equal(out.counts.NUMELT, 1614);
  const d = fieldDiff(cii, out);
  assert.equal(d.length, 124);
  assert.ok(d.every(x => x.section === 'RIGID'));
  for (const rg of out.rigids) {
    const want = Math.round(cii.rigids[rg.pointer - 1].weight.value * 1.1 * 1000) / 1000;
    assert.equal(rg.weight.token, formatCiiNumber(want, cii.rigids[rg.pointer - 1].weight.token).trim());
  }
});

// ---------------------------------------------------------------- T6 old token
test('T6 a wrong oldToken gives KERNEL_OLD_TOKEN_MISMATCH and refuses the whole set, good changes included', async () => {
  const b = LF();
  const cii = readCii14(b);
  const good = weightChange(cii, cii.elements[1], 1300);
  const bad = weightChange(cii, cii.elements[2], 400, { oldToken: '3.600000E+02' });
  const r = await applyChangeset(b, await changeset(b, [good, bad]));
  expectRefusal(r, 'KERNEL_OLD_TOKEN_MISMATCH');
  assert.equal(r.refusals.length, 1);
  assert.equal(r.refusals[0].where, bad.changeId);
});

// ---------------------------------------------------------------- T7 approval and zero
test('T7 unapproved -> KERNEL_NOT_APPROVED; zero without confirmation refused; with zeroConfirmed applied', async () => {
  const b = LF();
  const cii = readCii14(b);
  const e = cii.elements[1];
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, e, 1300, { approval: { approved: false } })])), 'KERNEL_NOT_APPROVED');
  // Zero written in exponent form passes the P0.1 rule R9 (it only knows plain zeros); the kernel still refuses it.
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, e, '0.000000E+00')])), 'KERNEL_ZERO_NOT_CONFIRMED');
  // A plain 0 is already caught by the Change set rules (R9), which run first.
  const r9 = await applyChangeset(b, await changeset(b, [weightChange(cii, e, 0)]));
  expectRefusal(r9, 'KERNEL_CHANGESET_INVALID');
  assert.match(r9.refusals[0].detail, /^R9 /);
  expectRefusal(await attempt(() => weightValue(0, undefined)), 'KERNEL_ZERO_NOT_CONFIRMED');
  const ok = await applyChangeset(b, await changeset(b, [weightChange(cii, e, 0, { approval: { approved: true, by: 'x', at: 'y', zeroConfirmed: true } })]));
  assert.equal(ok.ok, true, JSON.stringify(ok.refusals));
  assert.equal(ok.applied[0].newToken, '0.000000E+00');
  assert.equal(readCii14(ok.bytes).rigids[0].weight.value, 0);
});

// ---------------------------------------------------------------- T8 ref nodes
test('T8 a cii ref with FROM/TO swapped gives KERNEL_REF_NODES_MISMATCH', async () => {
  const b = LF();
  const cii = readCii14(b);
  const e = cii.elements[1];
  const c = weightChange(cii, e, 1300, { target: { kind: 'cii', elementIndex: 1, fromNode: String(e.to), toNode: String(e.from) } });
  expectRefusal(await applyChangeset(b, await changeset(b, [c])), 'KERNEL_REF_NODES_MISMATCH');
});

// ---------------------------------------------------------------- T9 shared span
test('T9 two changes whose elements share one rigid pointer give KERNEL_SPAN_SHARED', async () => {
  const b = LF();
  // The kit reader already refuses a FILE with a shared rigid pointer (CII_SHARED_POINTER), so the
  // kernel's own check is shown on a model where element 2 is made to point at rigid 1 as well.
  const cii = readCii14(b);
  cii.elements[2] = { ...cii.elements[2], pointers: { ...cii.elements[2].pointers, RIGID: 1 } };
  const c1 = weightChange(cii, cii.elements[1], 1300), c2 = weightChange(cii, cii.elements[2], 1400);
  const plan = [planChange(cii, c1), planChange(cii, c2)];
  expectRefusal(await attempt(() => checkSpansDisjoint(plan)), 'KERNEL_SPAN_SHARED');
  // On a real file: two refs that differ only by an extra key pass rule R7 but land on the same bytes.
  const real = readCii14(b);
  const a = weightChange(real, real.elements[1], 1300);
  const twin = weightChange(real, real.elements[1], 1400, { target: { ...elRef(real.elements[1]), note: 'same element' } });
  expectRefusal(await applyChangeset(b, await changeset(b, [a, twin])), 'KERNEL_SPAN_SHARED');
});

// ---------------------------------------------------------------- T10 line endings
test('T10 CRLF and LF copies of one invented fixture give identical results and keep their line endings', async () => {
  const results = [];
  for (const b of [LF(), CRLF()]) {
    const cii = readCii14(b);
    const cs = await changeset(b, [
      weightChange(cii, cii.elements[1], 1312.5),
      weightChange(cii, cii.elements[2], 333),
      change({ target: nodeRef(30), field: 'NODENAME/NAME', oldToken: 'V-30', newValue: 'VALVE-30' }),
    ]);
    const r = await applyChangeset(b, cs);
    assert.equal(r.ok, true, JSON.stringify(r.refusals));
    const out = readCii14(r.bytes);
    assert.equal(out.eol, cii.eol);
    results.push({ eol: out.eol, diff: fieldDiff(cii, out).map(d => [d.section, d.row, d.before, d.after]), text: new TextDecoder().decode(r.bytes) });
  }
  assert.deepEqual(results.map(x => x.eol), ['LF', 'CRLF']);
  assert.deepEqual(results[0].diff, results[1].diff);
  assert.equal(results[1].text.replace(/\r\n/g, '\n'), results[0].text);
});

// ---------------------------------------------------------------- T11 node name on X-S1
test('T11 renaming one node on X-S1 changes exactly its name entries', async () => {
  const s1 = await bench('X-S1');
  const cii = readCii14(s1);
  // node 3870 is the TO node of element 2 and is named SL-097.19
  const node = String(cii.elements[2].to);
  const loc = locate(cii, nodeRef(node), 'NODENAME/NAME');
  assert.ok(loc.spans.length >= 1);
  const r = await applyChangeset(s1, await changeset(s1, [change({ target: nodeRef(node), field: 'NODENAME/NAME', oldToken: 'SL-097.19', newValue: 'SL-097.19-NEW' })]));
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  const out = readCii14(r.bytes);
  const d = fieldDiff(cii, out);
  assert.ok(d.length >= 1 && d.every(x => x.section === 'NODENAME'));
  for (const x of d) assert.ok(loc.spans.some(s => x.start >= s.start && x.end <= s.end));
  assert.deepEqual(locate(out, nodeRef(node), 'NODENAME/NAME').spans.map(s => s.token), loc.spans.map(() => 'SL-097.19-NEW'));
  assert.equal(r.applied.length, loc.spans.length);
  // every other name is unchanged
  const names = c => c.nodeNames.map(n => n.from.token + '|' + n.to.token);
  const before = names(cii), after = names(out);
  const changedRows = before.map((x, i) => x !== after[i]).filter(Boolean).length;
  const rowOf = s => cii.nodeNames.findIndex(n => n.from.start === s.start || n.to.start === s.start);
  assert.equal(changedRows, new Set(loc.spans.map(rowOf)).size);
});

// ---------------------------------------------------------------- number style table
test('format: 20 values written in the v14 style, matching tokens in X-S1, X-S3C and X-T', async () => {
  const table = [
    [1390, ' 1.390000E+03'], [950, ' 9.500000E+02'], [397.88, ' 3.978800E+02'], [80, ' 8.000000E+01'],
    [133.85, ' 1.338500E+02'], [737.77, ' 7.377700E+02'], [349.9827, ' 3.499827E+02'], [3200, ' 3.200000E+03'],
    [1659.918, ' 1.659918E+03'], [15500, ' 1.550000E+04'], [0, ' 0.000000E+00'], [-1500, '-1.500000E+03'],
    [2.1e-4, ' 2.100000E-04'], [6.7e-5, ' 6.700000E-05'], [25.4, ' 2.540000E+01'], [273, ' 2.730000E+02'],
    [9999.99, ' 9.999990E+03'], [22035, ' 2.203500E+04'], [1529.0000004, ' 1.529000E+03'], [1.23456789, ' 1.234568E+00'],
  ];
  for (const [v, want] of table) assert.equal(formatCiiNumber(v, '1.390000E+03'), want, String(v));
  // every number field token found in the files is written back byte-for-byte
  let checked = 0;
  for (const id of ['X-S1', 'X-S3C', 'X-T']) {
    const cii = readCii14(await bench(id));
    const fields = [...cii.rigids.map(r => r.weight), ...cii.elements.slice(0, 40).flatMap(e => Object.values(e.fields))];
    for (const f of fields) {
      if (!/E[+-]\d\d$/.test(f.token)) continue;
      assert.equal(formatCiiNumber(f.value, f.token), f.raw, id + ' ' + f.raw);
      checked++;
    }
  }
  assert.ok(checked >= 15, 'checked ' + checked);
});

// ---------------------------------------------------------------- refusals not covered above
test('refusal KERNEL_CHANGESET_INVALID carries the rule code (R3 duplicate id)', async () => {
  const b = LF(); const cii = readCii14(b);
  const c = weightChange(cii, cii.elements[1], 1300, { changeId: 'DUP' });
  const r = await applyChangeset(b, await changeset(b, [c, { ...weightChange(cii, cii.elements[2], 300), changeId: 'DUP' }]));
  expectRefusal(r, 'KERNEL_CHANGESET_INVALID');
  assert.match(r.refusals[0].detail, /^R3 /);
});

test('refusal KERNEL_BASE_KIND when base.kind is not cii', async () => {
  const b = LF();
  expectRefusal(await applyChangeset(b, await changeset(b, [], { kind: 'xml' })), 'KERNEL_BASE_KIND');
});

test('refusal KERNEL_TARGET_NOT_FOUND for a missing element or node', async () => {
  const b = LF(); const cii = readCii14(b);
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: { kind: 'cii', elementIndex: 9, fromNode: '1', toNode: '2' }, oldToken: '1', newValue: 2 })])), 'KERNEL_TARGET_NOT_FOUND');
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(99), field: 'NODENAME/NAME', oldToken: '', newValue: 'X' })])), 'KERNEL_TARGET_NOT_FOUND');
  assert.ok(cii);
});

test('refusal KERNEL_NO_RIGID for an element without a rigid', async () => {
  const b = LF(); const cii = readCii14(b);
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: elRef(cii.elements[0]), oldToken: '1.000000E+00', newValue: 2 })])), 'KERNEL_NO_RIGID');
});

test('refusal KERNEL_NO_NODENAME when an element at the node has no name record', async () => {
  const b = LF();
  // node 20 is the TO of element 0 (no name record) and the FROM of element 1
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(20), field: 'NODENAME/NAME', oldToken: '', newValue: 'N-20' })])), 'KERNEL_NO_NODENAME');
});

test('refusal KERNEL_FIELD_UNSUPPORTED for another field or the wrong ref kind', async () => {
  const b = LF(); const cii = readCii14(b);
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: elRef(cii.elements[1]), field: 'DIAMETER', oldToken: '1.683000E+02', newValue: 200 })])), 'KERNEL_FIELD_UNSUPPORTED');
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(30), field: 'RIGID/WEIGHT', oldToken: '1.250000E+03', newValue: 200 })])), 'KERNEL_FIELD_UNSUPPORTED');
});

test('refusal KERNEL_NEGATIVE_WEIGHT and KERNEL_VALUE_INVALID', async () => {
  const b = LF(); const cii = readCii14(b);
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, cii.elements[1], -5)])), 'KERNEL_NEGATIVE_WEIGHT');
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, cii.elements[1], '12 kg')])), 'KERNEL_VALUE_INVALID');
});

test('refusal KERNEL_VALUE_DOES_NOT_FIT for a 3-digit exponent or a too-long name', async () => {
  const b = LF(); const cii = readCii14(b);
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, cii.elements[1], 1e100)])), 'KERNEL_VALUE_DOES_NOT_FIT');
  expectRefusal(await attempt(() => formatCiiNumber(-1500, '1.390000E+03', 12)), 'KERNEL_VALUE_DOES_NOT_FIT');
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(30), field: 'NODENAME/NAME', oldToken: 'V-30', newValue: 'A'.repeat(26) })])), 'KERNEL_VALUE_DOES_NOT_FIT');
});

test('refusal KERNEL_TOKEN_FORM_UNKNOWN for an old token not in v14 exponent form', async () => {
  expectRefusal(await attempt(() => formatCiiNumber(1, '1390.0')), 'KERNEL_TOKEN_FORM_UNKNOWN');
});

test('refusal KERNEL_NAME_INVALID and KERNEL_NAME_IN_USE', async () => {
  const b = LF();
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(30), field: 'NODENAME/NAME', oldToken: 'V-30', newValue: ' V-31' })])), 'KERNEL_NAME_INVALID');
  expectRefusal(await attempt(() => formatCiiName('', 25)), 'KERNEL_NAME_INVALID');
  expectRefusal(await applyChangeset(b, await changeset(b, [change({ target: nodeRef(40), field: 'NODENAME/NAME', oldToken: 'N-40-END', newValue: 'V-30' })])), 'KERNEL_NAME_IN_USE');
  // swapping two names in one set is fine
  const swap = await applyChangeset(b, await changeset(b, [
    change({ target: nodeRef(40), field: 'NODENAME/NAME', oldToken: 'N-40-END', newValue: 'V-30' }),
    change({ target: nodeRef(30), field: 'NODENAME/NAME', oldToken: 'V-30', newValue: 'N-40-END' })]));
  assert.equal(swap.ok, true, JSON.stringify(swap.refusals));
});

test('refusal KERNEL_SPAN_HINT_MISMATCH when the span hint is not where the old token is', async () => {
  const b = LF(); const cii = readCii14(b);
  const w = rigidOf(cii, 1).weight;
  const at = w.start + 1;
  const ok = await applyChangeset(b, await changeset(b, [weightChange(cii, cii.elements[1], 1300, { span: { start: at, end: at + 12 } })]));
  assert.equal(ok.ok, true, JSON.stringify(ok.refusals));
  expectRefusal(await applyChangeset(b, await changeset(b, [weightChange(cii, cii.elements[1], 1300, { span: { start: at + 13, end: at + 25 } })])), 'KERNEL_SPAN_HINT_MISMATCH');
});

test('refusal KERNEL_RECHECK_FAILED for a deliberately bad span (M3 guard)', async () => {
  const b = LF(); const cii = readCii14(b);
  const good = planChange(cii, weightChange(cii, cii.elements[1], 1300));
  // bad 1: the span is shifted one field right, onto the rigid TYPE; the weight itself never changes
  const shifted = { ...good, spans: good.spans.map(s => ({ ...s, start: s.start + 13, end: s.end + 13 })) };
  expectRefusal(await attempt(() => recheck(cii, spliceSpans(b, [shifted]), [shifted])), 'KERNEL_RECHECK_FAILED');
  // bad 2: the bytes were changed outside the planned span
  const tampered = spliceSpans(b, [good]); tampered[5] = 0x58;
  expectRefusal(await attempt(() => recheck(cii, tampered, [good])), 'KERNEL_RECHECK_FAILED');
  // the good plan passes
  assert.equal(recheck(cii, spliceSpans(b, [good]), [good]).length, 1);
});

test('refusal INPUT_SHA256_MISMATCH from the kit for a wrong benchmark file', async () => {
  expectRefusal(await attempt(() => requireSha256(LF(), '0'.repeat(64))), 'INPUT_SHA256_MISMATCH');
});

// ---------------------------------------------------------------- T12 every README code is tested
test('T12 every refusal code in the README table has a test, and every engine code is in the README', () => {
  const readme = readFileSync(join(CARD_DIR, 'README.md'), 'utf8');
  const sec = readme.split(/^##\s+Refusal codes\s*$/m)[1].split(/^##\s/m)[0];
  const documented = [...sec.matchAll(/^\|\s*`([A-Z][A-Z0-9_]+)`/gm)].map(m => m[1]);
  assert.ok(documented.length >= 15, 'documented ' + documented.length);
  const tests = readdirSync(join(CARD_DIR, 'tests')).filter(f => f.endsWith('.test.mjs'))
    .map(f => readFileSync(join(CARD_DIR, 'tests', f), 'utf8')).join('\n');
  for (const code of documented) assert.ok(new RegExp("expectRefusal\\([^\\n]*'" + code + "'\\)").test(tests), code + ' has no expectRefusal test');
  const engine = readdirSync(join(CARD_DIR, 'engine')).map(f => readFileSync(join(CARD_DIR, 'engine', f), 'utf8')).join('\n');
  const used = new Set([...engine.matchAll(/'(KERNEL_[A-Z0-9_]+)'/g)].map(m => m[1]));
  for (const code of used) assert.ok(documented.includes(code), code + ' is used in engine/ but not in the README');
});
