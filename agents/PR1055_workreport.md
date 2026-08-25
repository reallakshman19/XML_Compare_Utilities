# PR1055 work report — Writer2 W2.18 RESTRAINT product/runtime qualification

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_ISSUE: #1052
PR: #1055
BRANCH: agent/cii-writer2-restraint-product-runtime-w218
BASE_MAIN: 297fb37a0e894a3aac91de9188ebf30e810781fb
PREDECESSOR: PR #1054 / W2.17 / squash merged
WORK_INTENT: INVESTIGATE / VALIDATE
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: READ_ONLY_QUALIFICATION
PRODUCTION_CHANGE_AUTHORITY: FALSE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
CURRENT_GATE: W2_13_SYNTHETIC_PRODUCT_RUNTIME_DEPENDENCY_CLOSURE
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

## Observed qualification truth

```text
W2.11 RESTRAINT focused runtime = PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                  = PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product        = NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
W2.13 retained-real-CII        = NOT_RUN_ENVIRONMENT
inherited Writer2 regressions  = PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                 = NOT_RUN_ENVIRONMENT
engineering failure            = NONE_OBSERVED
```

No module-load stop is an engineering FAIL. No source inspection is runtime PASS.

## W2.18 execution environment

Fresh exact clone remains unavailable:

```text
fatal: unable to access GitHub: Could not resolve host: github.com
exit 128
```

Direct GitHub HTTPS from the execution container is also unavailable. No exact-main, W2.13-merge, or W2.13-head Actions run/artifact exists. The archive endpoint is not exposed by the connector. Workflow/path manipulation was not used.

Exact sparse mirror:

```text
/mnt/data/w218
Node v22.16.0
```

Admission rule:

```text
local git hash-object(file) == Git blob SHA at BASE_MAIN
```

No stubs, import rewrites, modified authored tests, or fake checkout markers.

## Current exact sparse progress

The unchanged authored entrypoint is:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
blob 9922377ddeda86fc9167d65f33c97095346e79fa
```

Current result:

```text
STATUS = NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
ASSERTION_FAILURE_OBSERVED = false
CURRENT_MISSING_MODULE = tabs/cii-workspace/cii-workspace-topology.js
```

W2.18 has rebuilt and crossed W2.17's prior `anchor-suggestions` frontier. Exact local JS count is 18.

Important exact blobs admitted in this tranche:

```text
tests/cii-workspace-writer2-restraint-product-routing.test.js  9922377ddeda86fc9167d65f33c97095346e79fa
tests/cii-workspace-writer2-composite-restraint-fixture.js       b725d56be579e7a2d7c40995ca2e13af7e702cbc
tabs/cii-workspace/cii-workspace-core.js                        cee2858a63992648edf5e61b8f63b3837a937f9e
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js   2e7a21bd17aa9af405f1a2f93201d4a45bb09e4b
tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js c007c91e1ac73a3ba5003f59ccdfa027eb5156a0
tabs/cii-workspace/cii-workspace-writer2-product-validation.js  05fcb594a3be5e360ce804c77872319730a16b53
tabs/cii-workspace/cii-workspace-writer2-restraint-delete-compaction-plan.js aedfb3ac78eed2294a88a64af261386f0db65085
tabs/cii-workspace/cii-workspace-contracts.js                   6ab30d8dd088225fd89bb729bf9ffdebefe652f6
tabs/cii-workspace/cii-workspace-byte-sha256.js                 6435e0eaadc382a18aac6a0bd46318ab6c27c714
tabs/cii-workspace/cii-workspace-physical-file.js                0c4c445fbd3d4b929b1f9288b789b244547c8867
parser/fixed-field.js                                           485daa43553681ca54f488499e57f36d2239be58
tabs/cii-workspace/cii-workspace-intake.js                      3939ff6866191bca0ccf6d27264ecd1f2549ddd5
tabs/cii-workspace/cii-workspace-topology-adapter.js            57b8d2d6e8335887b962e09085cc93ece2e36d68
tabs/cii-workspace/cii-workspace-geometry.js                    86fbb79cb859225b1f980f8d3709dc5286f15c26
tabs/cii-workspace/cii-workspace-multi-base-anchor.js           c782f2c64338845960a7f2d52d8ce25510d849ec
tabs/cii-workspace/cii-workspace-multi-base-correspondence.js   fdedb84add2faac6b38bff9300fe79224c8808e5
tabs/cii-workspace/cii-workspace-landmarks.js                   cc8d8e0861987357386e105ca164ceac23162594
tabs/cii-workspace/cii-workspace-anchor-suggestions.js          6aebbf63afa65a2001413365671827aa3a27299e
```

### Hash-gate incident

`cii-workspace-writer2-restraint-delete-compaction-plan.js` initially differed only by a locally-added terminal LF. Its wrong blob was rejected before admissible execution. Removing the terminal LF produced the exact required blob `aedfb3ac...`. This is evidence that the byte-custody gate is active.

## Binding authority / negative assurance

```text
CONTROL row1 / field4 / I13 = NONAM       -> preserve byte-identically
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified block-count mutation
RESTRAINT CREATE = BLOCKED
SIF CREATE       = BLOCKED
HANGER CREATE    = BLOCKED
Writer3 topology = unchanged / blocked
production files = unchanged by PR1055
workflow files   = unchanged
```

## Mandatory execution order

1. continue exact synthetic dependency closure until the authored assertions execute;
2. execute `cii-workspace-writer2-restraint-product-real-cii.test.js`;
3. execute the five inherited Writer2 regression entrypoints;
4. execute `npm ci && npm test` only on a complete exact checkout;
5. issue READY/NOT_READY solely from observed evidence.

## Changed-file ledger

PR #1055 remains evidence-only:

```text
agents/PR1055_workreport.md
agents/status/PR1055.yaml
agents/claims/PR1055.yaml
```

No production, test, benchmark, workflow, parser/converter, UI, or Writer3 repository file is changed.

## Appendix A — takeover gate

A1 Trace RESTRAINT DELETE from product routing through W2.11 physical compaction, W2.12 one-TARGET0 arbitration, public core dispatch, canonical re-intake, and independent complete-postimage validation.

A2 Explain why current `ERR_MODULE_NOT_FOUND` remains NOT_RUN and identify the first reached authored assertion that could establish FAIL.

A3 Preserve #1042 row1/NONAM vs row2/RESTRAINTS physical authority separation.

A4 Require exact Git object equality for every loaded repository file; do not admit reconstructed near-matches.

A5 On an authored failure, preserve raw output and isolate the smallest authority-preserving correction before any production mutation.

## EXACT NEXT ACTION

Materialize `tabs/cii-workspace/cii-workspace-topology.js` from exact `main@297fb37a0e894a3aac91de9188ebf30e810781fb`, verify its Git object, rerun the unchanged synthetic entrypoint, and continue only through dependencies Node proves necessary. Do not merge PR #1055 without new explicit owner authorization.
