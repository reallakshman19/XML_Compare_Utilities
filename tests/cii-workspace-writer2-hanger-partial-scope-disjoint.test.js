import assert from 'node:assert/strict';
import {
  applyCiiWriter2HangerPartialDelete,
  _test as writerTest,
} from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js';
import {
  validateCiiWriter2HangerPartialRoundTrip,
  _test as validatorTest,
} from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js';

const SOURCE_SHA = 'source-sha';
const TARGET_SHA = 'target-sha';
const OPERATION_ID = 'HANGER-210';

function operation(scopeDecision) {
  return Object.freeze({
    operationId: OPERATION_ID,
    family: 'HANGER',
    property: 'Hanger presence',
    action: 'DELETE',
    status: 'PREVIEW_READY',
    scopeDecision,
  });
}
function scope({ excludedInPlan = false, excludedInScope = false } = {}) {
  const sourceDocument = Object.freeze({ contentSha256: SOURCE_SHA });
  const targetDocument = Object.freeze({ contentSha256: TARGET_SHA });
  return Object.freeze({
    sourceDocument,
    targetDocument,
    operations: Object.freeze([operation('APPLY')]),
    excludedOperations: Object.freeze(excludedInPlan ? [operation('EXCLUDE')] : []),
    transferScope: Object.freeze({
      status: 'BOUND',
      mode: 'EXPLICIT_APPLY_EXCLUDE',
      authority: 'USER_EXPLICIT_OPERATION_SCOPE',
      scopeId: 'partial-hanger-scope-disjoint',
      sourceSha256: SOURCE_SHA,
      targetSha256: TARGET_SHA,
      candidateOperationIds: Object.freeze([OPERATION_ID]),
      appliedOperationIds: Object.freeze([OPERATION_ID]),
      excludedOperationIds: Object.freeze(excludedInScope ? [OPERATION_ID] : []),
    }),
  });
}

const targetDocument = Object.freeze({ contentSha256: TARGET_SHA });
const canonical = scope();
assert.deepEqual(writerTest.assertBoundScopeCustody(canonical, targetDocument), {
  scopeId: 'partial-hanger-scope-disjoint',
  sourceSha256: SOURCE_SHA,
  targetSha256: TARGET_SHA,
  appliedOperationIds: [OPERATION_ID],
  excludedOperationIds: [],
  candidateOperationIds: [OPERATION_ID],
});
assert.deepEqual(validatorTest.independentlyValidateScope(canonical, targetDocument), {
  scopeId: 'partial-hanger-scope-disjoint',
  appliedIds: [OPERATION_ID],
  excludedIds: [],
  candidates: [OPERATION_ID],
  sourceSha: SOURCE_SHA,
  targetSha: TARGET_SHA,
});

const planOverlap = scope({ excludedInPlan: true, excludedInScope: true });
assert.throws(
  () => applyCiiWriter2HangerPartialDelete({ targetDocument, transferPlan: planOverlap }),
  /CII_WRITER_2_HANGER_PARTIAL_PLAN_APPLY_EXCLUDE_OVERLAP:HANGER-210/,
);
assert.throws(
  () => validateCiiWriter2HangerPartialRoundTrip(targetDocument, Object.freeze({}), planOverlap, Object.freeze({})),
  /WRITER_2_HANGER_PARTIAL_VALIDATOR_PLAN_APPLY_EXCLUDE_OVERLAP:HANGER-210/,
);

const scopeOverlap = scope({ excludedInPlan: false, excludedInScope: true });
assert.throws(
  () => applyCiiWriter2HangerPartialDelete({ targetDocument, transferPlan: scopeOverlap }),
  /CII_WRITER_2_HANGER_PARTIAL_SCOPE_APPLY_EXCLUDE_OVERLAP:HANGER-210/,
);
assert.throws(
  () => validateCiiWriter2HangerPartialRoundTrip(targetDocument, Object.freeze({}), scopeOverlap, Object.freeze({})),
  /WRITER_2_HANGER_PARTIAL_VALIDATOR_SCOPE_APPLY_EXCLUDE_OVERLAP:HANGER-210/,
);

console.log('Writer2 partial HANGER scope custody rejects APPLY/EXCLUDE overlap in both plan and bound-scope testimony.');
