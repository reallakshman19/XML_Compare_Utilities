// [SIMULATED] Independently specified expected dispositions for Oracle #141 counterexample.
// Does not use the planner to construct expected status/bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planLineNodeRules } from '../tabs/cii-workspace/cii-fnr-vnext/line-node/index.js';

const row = fields => fields.map((n,i) => String(n).padStart(i ? 13 : 15, ' ')).join('');
const pair = (a,b) => '  ' + a.padEnd(26,' ') + b.padEnd(25,' ');
function element(from,to,pointer) {
  const records = Array.from({length:15}, () => row([0,0,0,0,0,0]));
  records[0] = row([from,to,0,0,0,0]);
  records[10] = '           1 L    ';
  records[13] = row([0,0,0,0,0,pointer]);
  return records;
}
function original() {
  const physical = ['#$ VERSION','    5.00000      14.0000        1256',
    '#$ ELEMENTS',...element(10,20,1),...element(20,30,2),
    ...element(90,100,3),'#$ NODENAME',
    pair('A','SHARED'),pair('SHARED','B'),pair('SOLO','SINK'),'#$ BEND'];
  return new TextEncoder().encode(physical.join('\r\n') + '\r\n');
}
function selector(value,endpoint,replacement='RENAMED') {
  return {mode:'literal',value,endpoint,replace:replacement};
}
const broad = () => ({id:'R1',node:selector('SHARED','EITHER')});
const duplicateTo = (replacement='RENAMED') =>
  ({id:'R2',node:selector('SHARED','TO',replacement)});
const solo = () => ({id:'R3',node:selector('SOLO','FROM','SOLO-NEW')});
function plan(rules) {
  const targetBytes = original();
  const originalTargetSha256 = createHash('sha256').update(targetBytes).digest('hex');
  return planLineNodeRules({tab:'LINE_NODE',targetBytes,originalTargetSha256,rules,options:{}});
}
const selected = (p,status) => p.claims.filter(c=>c.status === status);
const reason = (p,code) => p.diagnostics.some(d=>d.code===code);

test('Oracle R1 EITHER + R2 duplicate TO: collision cannot leave dangling FROM proposal', () => {
  const p = plan([broad(),duplicateTo()]);
  assert.equal(selected(p,'PROPOSED').length,0);
  assert.equal(selected(p,'CONFLICT').length,2);
  const dangling = p.claims.find(c=>c.ruleId==='R1'&&c.fieldIdentity==='NODENAME_FROM');
  assert.equal(dangling.status,'HOLD');
  assert.equal(dangling.evidence.reason,'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE');
  assert.equal(dangling.evidence.logicalNodeAliasScopePreserved,false);
  assert.equal(reason(p,'OVERLAPPING_RULE_CLAIMS'),true);
  assert.equal(reason(p,'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE'),true);
});

test('reversed rule ordering still prevents partial final-state logical aliases', () => {
  const p = plan([duplicateTo(),broad()]);
  assert.equal(selected(p,'PROPOSED').length,0);
  assert.equal(selected(p,'CONFLICT').length,2);
  assert.equal(selected(p,'HOLD').length,1);
  assert.equal(selected(p,'HOLD')[0].evidence.logicalNodeAliasScopePreserved,false);
});

test('unrelated TARGET node remains eligible when shared aliases are held', () => {
  const p = plan([broad(),duplicateTo(),solo()]);
  assert.equal(selected(p,'PROPOSED').length,1);
  assert.equal(selected(p,'PROPOSED')[0].ruleId,'R3');
  assert.equal(selected(p,'PROPOSED')[0].after.trim(),'SOLO-NEW');
  assert.equal(selected(p,'HOLD').length,1);
  assert.equal(selected(p,'CONFLICT').length,2);
});

test('single consistent complete R1 rename remains eligible, with original byte spans', () => {
  const bytes=original(), p = plan([broad()]);
  assert.equal(selected(p,'PROPOSED').length,2);
  assert.equal(new Set(p.claims.map(c=>c.byteStart)).size,2);
  for(const c of p.claims) {
    const raw=Buffer.from(bytes.subarray(c.byteStart,c.byteEnd)).toString('latin1');
    assert.equal(c.before,raw);
    assert.equal(c.after.length,c.before.length);
    assert.equal(c.after.trim(),'RENAMED');
    assert.equal(c.evidence.logicalNodeAliasScopePreserved,true);
  }
});

test('different cross-rule replacements still HOLD surviving alias after conflicts', () => {
  const p = plan([broad(),duplicateTo('DIFFERENT')]);
  assert.equal(selected(p,'PROPOSED').length,0);
  assert.equal(selected(p,'CONFLICT').length,2);
  assert.equal(selected(p,'HOLD').length,1);
  assert.equal(reason(p,'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE'),true);
});
