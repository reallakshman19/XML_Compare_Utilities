import assert from 'node:assert/strict';
import { test } from 'node:test';
import { noMatchAssessment } from '../tabs/cii-workspace/cii-fnr-vnext/ui/no-match-advice.js';

const rule = (id, find, replace) => ({ id, find, replace, mode: 'LITERAL', scope: 'DOCUMENT' });
const zero = (id) => ({ severity: 'INFO', code: 'ZERO_MATCHES', ruleId: id });

test('622 zero matches produce one accurate TARGET0 warning and retain source evidence as advisory', () => {
  const rules = Array.from({ length: 622 }, (_, i) =>
    rule('rule-' + (i + 1), i < 127 ? 'PS02687.1' : 'PS02' + i, 'SL-' + i));
  const plan = { claims: [], diagnostics: rules.map(r => zero(r.id)) };
  const source = { fields: [{ before: 'PS02687.1                         ' }] };
  const advice = noMatchAssessment(plan, rules, source);
  assert.equal(advice.zeroCount, 622);
  assert.equal(advice.total, 622);
  assert.equal(advice.completelyUnmatched, true);
  assert.equal(advice.ambiguousFindCount, 1);
  assert.equal(advice.sourceMatchedLabelCount, 1);
  assert.match(advice.advice, /all 622 Find rule\(s\) have zero matches/);
  assert.match(advice.advice, /SOURCE CII is reference-only/);
  assert.match(advice.advice, /PS02687.1/);
  assert.equal(plan.diagnostics.length, 622, 'writer audit diagnostics remain unchanged');
});

test('blocking plan is not incorrectly diagnosed as only a wrong-target problem', () => {
  const rules = [rule('a', 'A', 'B'), rule('b', 'C', 'D')];
  const plan = { claims: [], diagnostics: [zero('a'),
    { severity: 'ERROR', code: 'BRANCH_NODE_CROSSES_SCOPE', ruleId: 'b' }] };
  const advice = noMatchAssessment(plan, rules);
  assert.equal(advice.completelyUnmatched, false);
  assert.match(advice.advice, /review other diagnostics/);
});

test('partial matches stay distinguishable from zero-match failure', () => {
  const rules = [rule('a', 'A', 'B'), rule('b', 'C', 'D')];
  const plan = { claims: [{ id: 'a:10' }], diagnostics: [zero('b')] };
  const advice = noMatchAssessment(plan, rules);
  assert.equal(advice.completelyUnmatched, false);
  assert.match(advice.advice, /only the actual proposals may be reviewed/);
  assert.equal(advice.ambiguousFindCount, 0);
});

test('no no-match diagnostics means no advisory or fabricated source claim', () => {
  const rules = [rule('a', 'A', 'B')];
  assert.equal(noMatchAssessment({ claims: [], diagnostics: [] }, rules), null);
  assert.equal(noMatchAssessment(null, rules), null);
});
