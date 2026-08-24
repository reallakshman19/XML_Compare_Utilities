# PR1051 work report — Writer2 W2.15 runtime qualification continuation

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1050
PR: #1051
BRANCH: agent/cii-writer2-restraint-runtime-w215
BASE_MAIN: 710db4bb0af2286fef7ca48b09256ba8cd769344
PREDECESSOR: PR #1049 / W2.14 / merged evidence checkpoint
PREDECESSOR_VERDICT: NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
TAKEOVER_AUTHORITY: READ_ONLY_QUALIFICATION
PRODUCTION_CHANGE_AUTHORITY: FALSE_BY_DEFAULT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
```

## Inherited observed evidence

```text
W2.11 RESTRAINT P01-P06                     PASS_RUNTIME_EXACT_BLOB
W2.11 #1042 CONTROL P19                     PASS_RUNTIME_EXACT_BLOB
W2.11 RESTRAINT falsifiers P07-P18          PASS_RUNTIME_EXACT_BLOB
RESTRAINT CREATE block                      PASS_RUNTIME_NEGATIVE_ASSURANCE
W2.12 support probe                         PASS_RUNTIME_EXACT_BLOB_NONQUALIFYING
```

The nonqualifying support probe must not substitute for W2.12 R01-R22.

## Binding engineering authority

```text
CONTROL row1 / field4 / I13 = NONAM       -> preserve
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified RESTRAINT count mutation
W2.12 authority = CII_WRITER_2_RESTRAINT_ONE_TARGET0_COMPOSITE
RESTRAINT CREATE = BLOCKED
SIF CREATE = BLOCKED
HANGER CREATE = BLOCKED
Writer3 topology = unchanged
```

## W2.15 mandatory order

1. Finish exact-Git-blob closure for W2.12 authored entrypoints.
2. Execute W2.12 R01-R22.
3. Execute W2.13 synthetic and retained-real-CII product tests.
4. Execute remaining inherited Writer2 regression slice.
5. Execute repository npm gate only on a complete exact checkout/runner.
6. Produce current release/freeze verdict from observed evidence only.

## Exact sparse-mirror custody rule

Runtime evidence is admissible only when every transitively loaded repository file satisfies:

```text
local git hash-object(file) == Git blob SHA at BASE_MAIN
```

Synthetic module-mode scaffolding may select ESM only; it may not provide engineering behavior.

## Required W2.12 entrypoints

```text
node tests/cii-workspace-writer2-composite-restraint.test.js
node tests/cii-workspace-writer2-composite-restraint-partial-hanger.test.js
node tests/cii-workspace-writer2-composite-restraint-falsifiers.test.js
```

Explicit regression anchors:

```text
R02 = mixed NODENAME + RESTRAINT original-coordinate separation
R09 = CONTROL row1/NONAM unchanged while row2/RESTRAINTS changes
R20 = unrelated-byte drift rejected by independent complete-postimage oracle
```

## Required W2.13 entrypoints

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
node tests/cii-workspace-writer2-restraint-product-real-cii.test.js
```

## Required inherited Writer2 slice

```text
node tests/cii-workspace-writer2-composite-product-routing.test.js
node tests/cii-workspace-writer2-hanger-partial-product.test.js
node tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
node tests/cii-workspace-writer2-real-benchmark-roundtrip.test.js
node tests/cii-workspace-writer2-trifamily-real-benchmark-roundtrip.test.js
```

## Current validation ledger

```text
base grounding                              PASS_REMOTE_GITHUB
W2.11 inherited runtime                     PASS_RUNTIME_EXACT_BLOB
W2.12 focused R01-R22                       NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
W2.13 synthetic                             NOT_RUN
W2.13 retained-real-CII                     NOT_RUN
remaining inherited Writer2 regression      PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                              NOT_RUN_ENVIRONMENT
engineering failure                         NONE_OBSERVED
release/freeze                              NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

## Production mutation rule

Default is no production mutation. If runtime exposes a real defect, record exact failure first, isolate the smallest correction, and document authority impact before any production change. Do not widen CREATE/topology/parser/converter authority.

## Changed-file ledger — current intended

```text
agents/PR1051_workreport.md
agents/status/PR1051.yaml
agents/claims/PR1051.yaml
```

Qualification evidence may update these records. No production/test/workflow file should change unless an observed defect requires a separately documented minimal correction.

## Appendix A — expert takeover gate

1. Why does W2.14 merge not imply release/freeze READY?
2. State the #1042 CONTROL row1/row2 custody correction.
3. Why is the W2.12 support probe nonqualifying?
4. What must R02 prove about original-coordinate spans?
5. What must R09 prove byte-for-byte?
6. Why is R20 a primary independent-oracle falsifier?
7. Why must every transitively loaded sparse-mirror blob be hash verified?
8. Which W2.13 real product behavior must be observed?
9. Why can sparse focused execution not replace repository-wide npm test?
10. What is the mutation rule if a runtime defect is observed?

## Exact next action

Complete W2.12 dependency closure from exact `main@710db4bb0af2286fef7ca48b09256ba8cd769344` blobs and execute the three authored W2.12 entrypoints. Preserve exact Node output and failing error names, if any, before proceeding to W2.13.
