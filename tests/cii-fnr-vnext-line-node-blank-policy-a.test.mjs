// [SIMULATED] Owner policy A: an empty physical NODENAME slot does not declare an alias.
// Blank TARGET0 slots stay blank; named aliases remain subject to complete-group closure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planLineNodeRules } from '../tabs/cii-workspace/cii-fnr-vnext/line-node/index.js';

const packed = fields => fields.map((v, i) => String(v).padStart(i ? 13 : 15, ' ')).join('');
const named = (from, to) => '  ' + from.padEnd(26, ' ') + to.padEnd(25, ' ');

function element(from, to, pointer) {
  const records = Array.from({ length: 15 }, () => packed([0, 0, 0, 0, 0, 0]));
  records[0] = packed([from, to, 0, 0, 0, 0]);
  records[10] = '           1 L    ';
  records[13] = packed([0, 0, 0, 0, 0, pointer]);
  return records;
}

function target(eol, firstTo, secondFrom) {
  const record1 = named('FROM_A', firstTo);
  const record2 = named(secondFrom, 'TO_C');
  const rows = ['#$ VERSION', '    5.00000      14.0000        1256',
    '#$ ELEMENTS', ...element(10, 20, 1), ...element(20, 30, 2),
    '#$ NODENAME', record1, record2, '#$ BEND'];
  const text = rows.join(eol) + eol;
  const bytes = new TextEncoder().encode(text);
  const empty = firstTo === ''
    ? { start: text.indexOf(record1) + 28, width: 25 }
    : secondFrom === ''
      ? { start: text.indexOf(record2) + 2, width: 26 }
      : null;
  return { bytes, empty };
}

function plan(bytes, endpoint = 'EITHER', value = 'SHARED', replacement = 'RENAMED') {
  const digest = createHash('sha256').update(bytes).digest('hex');
  return planLineNodeRules({ tab: 'LINE_NODE', targetBytes: bytes,
    originalTargetSha256: digest, rules: [{ id: 'POLICY_A',
      node: { mode: 'literal', value, endpoint, replace: replacement } }], options: {} });
}

for (const eol of ['\n', '\r\n']) {
  const label = eol === '\n' ? 'LF' : 'CRLF';
  for (const [caseName, firstTo, secondFrom] of [
    ['named TO, blank FROM', 'SHARED', ''],
    ['blank TO, named FROM', '', 'SHARED'],
  ]) {
    test('policy A ' + label + ': ' + caseName + ' proposes the sole name, never blank', () => {
      const { bytes, empty } = target(eol, firstTo, secondFrom);
      const snapshot = Buffer.from(bytes);
      const p = plan(bytes);
      assert.equal(p.incompleteSearch, false);
      assert.equal(p.claims.length, 1);
      const claim = p.claims[0];
      assert.equal(claim.section, 'NODENAME');
      assert.equal(claim.status, 'PROPOSED');
      assert.equal(claim.before.trim(), 'SHARED');
      assert.equal(claim.after.trim(), 'RENAMED');
      assert.equal(claim.before.length, claim.after.length);
      assert.equal(claim.evidence.logicalNodeAliases.length, 1);
      assert.equal(claim.evidence.logicalNodeAliasScopePreserved, true);
      assert.equal(claim.evidence.logicalNodeAliases[0].nodeId, '20');
      assert.ok(claim.byteEnd <= empty.start || claim.byteStart >= empty.start + empty.width);
      assert.equal(Buffer.from(bytes.subarray(empty.start, empty.start + empty.width)).toString('ascii').trim(), '');
      assert.deepEqual(Buffer.from(bytes), snapshot, 'planner must not mutate TARGET0');
      assert.ok(!p.diagnostics.some(d => d.code === 'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE'));
    });
  }
  test('policy A ' + label + ': two named aliases still hold incomplete scope', () => {
    const { bytes } = target(eol, 'SHARED', 'SHARED');
    const partial = plan(bytes, 'TO');
    assert.equal(partial.claims.length, 1);
    assert.equal(partial.claims[0].status, 'HOLD');
    assert.equal(partial.claims[0].evidence.reason, 'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE');
    assert.equal(partial.claims[0].evidence.logicalNodeAliases.length, 2);
    const complete = plan(bytes);
    assert.equal(complete.claims.length, 2);
    assert.deepEqual(complete.claims.map(c => c.status), ['PROPOSED', 'PROPOSED']);
  });
  test('policy A ' + label + ': regex must not target a blank field for implicit fill', () => {
    const { bytes } = target(eol, 'SHARED', '');
    const snapshot = Buffer.from(bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    const p = planLineNodeRules({ tab: 'LINE_NODE', targetBytes: bytes,
      originalTargetSha256: digest, rules: [{ id: 'NO_BLANK_FILL',
        node: { mode: 'regex', pattern: '^\\s*$', flags: '', endpoint: 'FROM', replace: 'FILLED' } }],
      options: {} });
    assert.equal(p.incompleteSearch, false);
    assert.equal(p.claims.length, 0);
    assert.deepEqual(Buffer.from(bytes), snapshot);
  });
}
