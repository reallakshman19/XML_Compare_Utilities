// [SIMULATED] Engineering expectations fixed independently of planner outputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planLineNodeRules } from '../tabs/cii-workspace/cii-fnr-vnext/line-node/index.js';
const utf8 = new TextEncoder();
const row = a => a.map((v,i) => String(v).padStart(i ? 13 : 15, ' ')).join('');
function element(from, to, pointer) {
  const lines = Array.from({length:15}, () => row([0,0,0,0,0,0]));
  lines[0] = row([from,to,0,0,0,0]);
  lines[10] = '           1 L    ';
  lines[13] = row([0,0,0,0,0,pointer]);
  return lines;
}
function data(names) {
  const rows = ['#$ VERSION','    5.00000      14.0000        1256',
    '#$ ELEMENTS',...element(10,20,1),...element(20,30,2),
    '#$ NODENAME',
    '  '+'A'.padEnd(26)+'SHARED'.padEnd(25),
    '  '+names[1].padEnd(26)+'B'.padEnd(25),
    '#$ BEND'];
  return utf8.encode(rows.join('\r\n')+'\r\n');
}
function run(bytes, endpoint, replacement='RENAMED') {
  return planLineNodeRules({tab:'LINE_NODE',targetBytes:bytes,
    originalTargetSha256:createHash('sha256').update(bytes).digest('hex'),
    rules:[{id:'alias',node:{mode:'literal',value:'SHARED',endpoint,replace:replacement}}],
    options:{}});
}

test('different physical NODENAME records for same TARGET node HOLD partial scope', () => {
  const p = run(data(['SHARED','SHARED']), 'FROM');
  assert.equal(p.claims.length, 1);
  assert.equal(p.claims[0].status, 'HOLD');
  assert.equal(p.claims[0].evidence.reason, 'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE');
  assert.equal(p.claims[0].evidence.logicalNodeAliases.length, 2);
  assert.notEqual(p.claims[0].evidence.logicalNodeAliases[0].byteStart,
    p.claims[0].evidence.logicalNodeAliases[1].byteStart);
});
test('complete rename across FROM and TO physical records may propose consistent slices', () => {
  const p = run(data(['SHARED','SHARED']), 'EITHER');
  assert.equal(p.claims.length, 2);
  assert.deepEqual(p.claims.map(c => c.status), ['PROPOSED','PROPOSED']);
  assert.deepEqual(p.claims.map(c => c.after.trim()), ['RENAMED','RENAMED']);
  assert.equal(new Set(p.claims.map(c => c.byteStart)).size, 2);
  for (const c of p.claims) assert.equal(c.after.length, c.before.length);
});
test('preexisting contradictory names for the same TARGET node HOLD', () => {
  const p = run(data(['SHARED','DIFFERENT']), 'TO');
  assert.equal(p.claims[0].status, 'HOLD');
  assert.ok(p.diagnostics.some(d => d.code === 'NODE_NAME_EXISTING_ALIAS_CONFLICT'));
});
test('no other named physical alias permits one endpoint replacement', () => {
  const p = run(data(['SHARED','']), 'TO');
  assert.equal(p.claims.length, 1);
  assert.equal(p.claims[0].status, 'PROPOSED');
});
