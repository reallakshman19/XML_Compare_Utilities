import assert from 'node:assert/strict';
import { _test as previewTest } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { ciiMsBm001AliasSet } from '../tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js';

const aliasSet = ciiMsBm001AliasSet();
function operation(sourceValue, targetValue) {
  return {
    sourceEvidence: { value: sourceValue },
    targetEvidence: { value: targetValue },
  };
}

const exact = previewTest.inferredAcceptanceBinding(operation('SL-106.3', 'PS02494.1'), aliasSet);
assert(exact, 'raw CII source name without Owner-table slash must bind its exact BM-001 alias');
assert.deepStrictEqual(exact.sourceNames, ['SL-106.3']);
assert.strictEqual(exact.targetName, 'PS02494.1');

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

console.log('CII multi-source BM-001 exact dotted alias binding checks passed.');
