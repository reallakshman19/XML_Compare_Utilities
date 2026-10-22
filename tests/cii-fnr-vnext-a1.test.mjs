import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { sha256, validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
const encoder = new TextEncoder();
const row = (values) => values.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
const elem = (from, to, pointer) => Array.from({ length: 15 }, (_, i) => i === 0 ? row([`${from}.0`, `${to}.0`, 120, 0, 0, 0]) :
  i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));
function fixture({ crlf = true, shared = false } = {}) {
  const lines = ['#$ VERSION', row([5, 14, 1252]), '#$ CONTROL', row([2, 0, 0, shared ? 1 : 2, 0, 0]),
    '#$ ELEMENTS', ...elem(100, 110, 1), ...elem(110, 120, shared ? 1 : 2), '#$ NODENAME',
    '  ' + 'OLD-A'.padEnd(26) + 'OLD-B'.padEnd(25)];
  if (!shared) lines.push('  ' + 'OLD-B'.padEnd(26) + 'OLD-D'.padEnd(25));
  return encoder.encode(lines.join(crlf ? '\r\n' : '\n') + (crlf ? '\r\n' : '\n'));
}
const hash = (v) => createHash('sha256').update(v).digest('hex');
const make = (original, rules) => planNormal({ tab:'NORMAL', targetBytes:original, originalTargetSha256:hash(original), rules, options:{} });
const rule = (find, replace, overrides = {}) => ({ id:'A', find, replace, mode:'LITERAL', flags:'g', field:'NODENAME.BOTH', scope:'DOCUMENT', ...overrides });
async function expectBlocked(input, original, plan, approvals, code) {
  await assert.rejects(validatePostimage({ original:input, originalHash:hash(original), plan, approvedIds:approvals }), new RegExp(code));
}
for (const crlf of [true, false]) {
  const original = fixture({ crlf });
  assert.equal(parseCii(original).elements.length, 2);
  assert.equal(await sha256(original), hash(original));
  const p = make(original, [rule('OLD', 'NEW')]);
  assert.equal(p.schema, 'CiiFnrVnext.Proposals.v1');
  assert.equal(p.claims.length, 4);
  const originalBefore = Buffer.from(original);
  const res = await validatePostimage({ original, originalHash:hash(original), plan:p, approvedIds:p.claims.slice(0,3).map(x=>x.id) });
  assert.equal(Buffer.from(original).equals(originalBefore), true, 'TARGET0 unchanged');
  assert.equal(hash(res.bytes), res.target1Hash, 'independent output hash');
  assert.equal(res.audit.length, 3);
  await expectBlocked(original, original, p, p.claims.slice(0,2).map(x=>x.id), 'NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE');
  const changed = [...original].map((v,i) => v === res.bytes[i] ? -1 : i).filter((i) => i >= 0);
  assert(changed.length > 0);
  assert(changed.every((i) => res.audit.some((c) => i >= c.byteStart && i < c.byteEnd)), 'diff only approved fields');
  assert.equal(Buffer.from(original).subarray(0, Buffer.from(original).indexOf('#$ NODENAME')).equals(
    Buffer.from(res.bytes).subarray(0, Buffer.from(original).indexOf('#$ NODENAME'))), true, 'no numeric 120 or section mutation');
  assert.equal(parseCii(res.bytes).nonam, 2);
  await expectBlocked(original, original, p, [], 'EXPLICIT_APPROVAL_REQUIRED');
  await expectBlocked(original, original, p, [p.claims[0].id,p.claims[0].id], 'CLAIM_ID_DUPLICATE_OR_UNKNOWN');
  const stale = new Uint8Array(original); stale[p.claims[0].byteStart] = '!'.charCodeAt(0);
  await expectBlocked(stale, original, p, [p.claims[0].id], 'TARGET0_HASH_STALE');
  const forged = structuredClone(p); forged.claims[0].before = 'X' + forged.claims[0].before.slice(1);
  await expectBlocked(original, original, forged, [p.claims[0].id], 'FIELD_OWNERSHIP_OR_PREIMAGE_INVALID');
  const duplicate = make(original, [rule('OLD', 'NEW'), rule('OLD', 'ALT', { id:'B' })]);
  assert(duplicate.claims.every(x=>x.status === 'CONFLICT'), 'collision flagged');
  await expectBlocked(original, original, duplicate, [duplicate.claims[0].id], 'PLAN_HAS_BLOCKING_DIAGNOSTICS|CLAIM_OVERLAP_OR_UNSUPPORTED');
  assert(make(original,[rule('NOT_PRESENT','NEW')]).diagnostics.some(x=>x.code === 'ZERO_MATCHES'));
  assert(make(original,[rule('OLD','X'.repeat(40))]).diagnostics.some(x=>x.code === 'FIELD_WIDTH_OR_EMPTY_OVERFLOW'));
  assert(make(original,[rule('OLD','NEW',{mode:'REGEX',flags:'zz'})]).diagnostics.some(x=>x.code === 'REGEX_UNSAFE_OR_FLAGS_UNSUPPORTED'));
  assert(make(original,[rule('([','NEW',{mode:'REGEX',flags:'g'})]).diagnostics.some(x=>x.severity === 'ERROR'));
  assert.equal(make(original,[rule('OLD.*#\\$ CONTROL','HI',{mode:'REGEX',flags:'g'})]).claims.length, 0,
    'regex cannot span record or section');
  const named = make(original,[rule('OLD-(?<part>[A-D])','$<part>-REPLACED',{mode:'REGEX',flags:'g'})]);
  assert.equal(named.claims.length,4);
  const scoped = make(original,[rule('OLD','NEW',{scope:'BLOCK',block:'NODENAME',from:'100',to:'110'})]);
  assert.equal(scoped.claims.length,2);
}
const alias = fixture({shared:true});
assert.equal(make(alias,[rule('OLD','NEW')]).claims.length,0,'shared pointer never edited');
assert(make(alias,[rule('OLD','NEW')]).diagnostics.some(x=>x.code === 'NODENAME_POINTER_ALIAS_OR_ORPHAN'));
console.log('PASS [SYNTHETIC] byte patch, exact SHA, scoped regex, alias, CRLF/LF, stale, collisions, overflow and capture adversaries');
