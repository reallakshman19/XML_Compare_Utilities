import assert from 'node:assert/strict';
import { _test as previewTest } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { ciiExpectedNodeNameOperation } from '../tabs/cii-workspace/cii-workspace-multisource-scope.js';
import { _test as readinessTest } from '../tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';
import { ciiMsBm001AliasSet } from '../tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js';

const aliasSet = ciiMsBm001AliasSet();
function operation(sourceValue, targetValue) {
  return {
    sourceEvidence: { value: sourceValue },
    targetEvidence: { value: targetValue },
  };
}
function eligibleOperation(acceptance) {
  return {
    family: 'NODE_NAME',
    property: 'Node name / to-name',
    action: 'CREATE',
    status: 'PREVIEW_READY',
    policyAuthority: CII_WRITER_2_NODENAME_RELOCATION_POLICY,
    matchAuthority: { status: 'REVIEWED' },
    bm001Acceptance: { benchmark: 'BM-001', status: 'BOUND', ...acceptance },
  };
}

const exact = previewTest.inferredAcceptanceBinding(operation('SL-106.3', 'PS02494.1'), aliasSet);
assert(exact, 'raw CII source name without Owner-table slash must bind its exact BM-001 alias');
assert.deepStrictEqual(exact.sourceNames, ['SL-106.3']);
assert.strictEqual(exact.targetName, 'PS02494.1');
assert.equal(ciiExpectedNodeNameOperation(eligibleOperation(exact), aliasSet), true);

const decorated = previewTest.inferredAcceptanceBinding(operation('/SL-106.3', 'PS02494.1'), aliasSet);
assert(decorated, 'Owner-table slash notation must remain accepted as the same lexical source alias');

assert.strictEqual(
  previewTest.inferredAcceptanceBinding(operation('SL-106', 'PS02494.1'), aliasSet),
  null,
  'family-only SL-106 must not bind an exact dotted BM-001 identity',
);
assert.strictEqual(
  previewTest.inferredAcceptanceBinding(operation('SL-106.4', 'PS02494.1'), aliasSet),
  null,
  'a dotted sibling must not bind another sibling target merely because the canonical family matches',
);

const sibling = previewTest.inferredAcceptanceBinding(operation('SL-106.4', 'PS02482.1'), aliasSet);
assert(sibling, 'the correct dotted sibling must bind its own exact target');
assert.deepStrictEqual(sibling.sourceNames, ['SL-106.4']);

for (const sourceAlias of ['SL-104.8', 'X6']) {
  const grouped = previewTest.inferredAcceptanceBinding(operation(sourceAlias, 'PS02497.1'), aliasSet);
  assert(grouped, `${sourceAlias} must bind as an exact member of its multi-alias BM-001 row`);
  const scoped = eligibleOperation(grouped);
  assert.equal(
    ciiExpectedNodeNameOperation(scoped, aliasSet),
    true,
    `${sourceAlias} exact alias membership must qualify scope even when groupedKey contains only the observed alias`,
  );
  assert.equal(
    readinessTest.isQualifiedExpectedApply({ ...scoped, scopeDecision: 'APPLY' }, aliasSet),
    true,
    `${sourceAlias} exact alias membership must remain qualified at Writer2 readiness`,
  );
}

const forgedGroup = eligibleOperation({ sourceNames: ['SL-104'], targetName: 'PS02497.1', groupedKey: 'SL-104\tPS02497.1' });
assert.equal(ciiExpectedNodeNameOperation(forgedGroup, aliasSet), false, 'family-only forged acceptance must remain excluded');
assert.equal(readinessTest.isQualifiedExpectedApply({ ...forgedGroup, scopeDecision: 'APPLY' }, aliasSet), false);

console.log('CII multi-source BM-001 exact dotted/grouped alias binding checks passed.');
