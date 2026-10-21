import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';

const row = vs => vs.map((v, i) => String(v).padStart(i ? 13 : 15)).join('');
const element = (a, b, pointer) => Array.from({ length: 15 }, (_, i) =>
  i === 0 ? row([`${a}.0`, `${b}.0`, 120, 0, 0, 0]) :
  i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));
function fixture({ second = 'SHARED', single = false, lf = false } = {}) {
  const lines = ['#$ VERSION', row([5, 14, 1252]), '#$ CONTROL', row([2, 0, 0, single ? 1 : 2, 0, 0]),
    '#$ ELEMENTS', ...element(10, 20, 1), ...element(20, 30, single ? 0 : 2),
    '#$ NODENAME', '  ' + 'LEFT'.padEnd(26) + 'SHARED'.padEnd(25)];
  if (!single) lines.push('  ' + second.padEnd(26) + 'RIGHT'.padEnd(25));
  return new TextEncoder().encode(lines.join(lf ? '\n' : '\r\n') + (lf ? '\n' : '\r\n'));
}
const hash = b => createHash('sha256').update(b).digest('hex');
function plan(bytes, field = 'NODENAME.BOTH') {
  return planNormal({ tab: 'NORMAL', targetBytes: bytes, originalTargetSha256: hash(bytes),
    rules: [{ id: 'R1', find: 'SHARED', replace: 'RENAMED', mode: 'LITERAL', flags: 'g',
      field, scope: 'DOCUMENT' }], options: {} });
}
async function apply(bytes, proposal, ids) {
  return validatePostimage({ original: bytes, originalHash: hash(bytes), plan: proposal,
    approvedIds: ids, tab: 'NORMAL' });
}
for (const lf of [false, true]) {
  const bytes = fixture({ lf }), before = Uint8Array.from(bytes), proposal = plan(bytes);
  assert.equal(proposal.claims.length, 2);
  const full = await apply(bytes, proposal, proposal.claims.map(c => c.id));
  assert.deepEqual(bytes, before, 'TARGET0 stays immutable');
  const parsed = parseCii(full.bytes);
  assert.equal(parsed.fields.filter(f => f.before.trim() === 'RENAMED').length, 2);
  await assert.rejects(apply(bytes, proposal, [proposal.claims[0].id]), /NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE/);
  for (const endpoint of ['NODENAME.FROM', 'NODENAME.TO']) {
    const partial = plan(bytes, endpoint);
    await assert.rejects(apply(bytes, partial, partial.claims.map(c => c.id)),
      /NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE/);
  }
  for (const second of ['', 'DIFFERENT']) {
    const candidate = fixture({ second, lf }), p = plan(candidate);
    await assert.rejects(apply(candidate, p, p.claims.map(c => c.id)),
      /NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE|NORMAL_NODE_ALIAS_VALUES_CONFLICT/);
  }
  const one = fixture({ single: true, lf }), p = plan(one);
  const allowed = await apply(one, p, p.claims.map(c => c.id));
  assert.equal(parseCii(allowed.bytes).fields.find(f => f.fieldIdentity === 'NODENAME.TO').before.trim(), 'RENAMED');
}
console.log('PASS Normal logical-node alias closure: complete, partial, FROM/TO only, blank, disagreement, singleton, CRLF/LF');
