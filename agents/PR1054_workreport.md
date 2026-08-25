# PR1054 work report — Writer2 W2.17 RESTRAINT product/runtime qualification

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_ISSUE: #1052
PR: #1054
BRANCH: agent/cii-writer2-restraint-product-runtime-w217
BASE_MAIN: 3a681c1c587ee3c1462a962879e4f79433258105
PREDECESSOR: PR #1053 / W2.16 / squash merged
WORK_INTENT: INVESTIGATE / VALIDATE
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: READ_ONLY_QUALIFICATION
PRODUCTION_CHANGE_AUTHORITY: FALSE_BY_DEFAULT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
CURRENT_GATE: W2_13_SYNTHETIC_PRODUCT_RUNTIME_DEPENDENCY_CLOSURE
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

## Observed qualification truth

```text
W2.11 RESTRAINT P01-P06/P19/P07-P18 = PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                        = PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product              = NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
W2.13 retained-real-CII product      = NOT_RUN_ENVIRONMENT
remaining Writer2 regressions        = PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                       = NOT_RUN_ENVIRONMENT
engineering failure                  = NONE_OBSERVED
```

No module-load stop is classified as an engineering FAIL and no source inspection is promoted to runtime PASS.

## Binding authority / negative assurance

```text
CONTROL row1 / field4 / I13 = NONAM       -> preserve byte-identically
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified block-count mutation
RESTRAINT CREATE = BLOCKED
SIF CREATE       = BLOCKED
HANGER CREATE    = BLOCKED
Writer3 topology = BLOCKED / unchanged
parser/converter = unchanged
workflow files   = unchanged
```

Open PR #1033 remains SIF CREATE qualification only. W2.17 consumes merged SIF DELETE authority read-only and does not widen #1033 authority.

## Runner investigation

The execution container has no GitHub network checkout path: native Git fails DNS and direct raw-GitHub HTTPS cannot connect. Current/prior relevant workflow runs are absent. The repository does have trusted workflows with `workflow_dispatch`, but the connected GitHub action surface exposes no workflow-dispatch write action. Deliberately touching unrelated topology/package paths to trigger a path-filtered workflow was rejected as validation gaming.

Instead, W2.17 is reconstructing an exact sparse mirror from GitHub content under:

```text
/mnt/data/w217
Node v22.16.0
```

Admission rule for every repository file:

```text
local git hash-object(file) == Git blob SHA at BASE_MAIN
```

No stub, rewritten import graph, modified authored entrypoint, or fake checkout is permitted.

## Exact sparse-mirror progress

Verified local Git objects:

```text
tests/cii-workspace-writer2-restraint-product-routing.test.js
  9922377ddeda86fc9167d65f33c97095346e79fa

tests/cii-workspace-writer2-composite-restraint-fixture.js
  b725d56be579e7a2d7c40995ca2e13af7e702cbc

tabs/cii-workspace/cii-workspace-core.js
  cee2858a63992648edf5e61b8f63b3837a937f9e

tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
  2e7a21bd17aa9af405f1a2f93201d4a45bb09e4b

tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js
  c007c91e1ac73a3ba5003f59ccdfa027eb5156a0

tabs/cii-workspace/cii-workspace-writer2-product-validation.js
  05fcb594a3be5e360ce804c77872319730a16b53

tabs/cii-workspace/cii-workspace-writer2-restraint-delete-compaction-plan.js
  aedfb3ac78eed2294a88a64af261386f0db65085

tabs/cii-workspace/cii-workspace-contracts.js
  6ab30d8dd088225fd89bb729bf9ffdebefe652f6

tabs/cii-workspace/cii-workspace-byte-sha256.js
  6435e0eaadc382a18aac6a0bd46318ab6c27c714

tabs/cii-workspace/cii-workspace-physical-file.js
  0c4c445fbd3d4b929b1f9288b789b244547c8867

tabs/cii-workspace/cii-workspace-intake.js
  3939ff6866191bca0ccf6d27264ecd1f2549ddd5

tabs/cii-workspace/cii-workspace-topology-adapter.js
  57b8d2d6e8335887b962e09085cc93ece2e36d68

tabs/cii-workspace/cii-workspace-geometry.js
  86fbb79cb859225b1f980f8d3709dc5286f15c26

tabs/cii-workspace/cii-workspace-multi-base-anchor.js
  c782f2c64338845960a7f2d52d8ce25510d849ec

tabs/cii-workspace/cii-workspace-multi-base-correspondence.js
  fdedb84add2faac6b38bff9300fe79224c8808e5

tabs/cii-workspace/cii-workspace-landmarks.js
  cc8d8e0861987357386e105ca164ceac23162594
```

A topology-adapter reconstruction mismatch was detected before execution because two repository comments were missing. That local file was quarantined, corrected, and admitted only after its hash became exact `57b8d2d6...`. This demonstrates the hash gate is active rather than ceremonial.

## Current authored-entrypoint observation

Repeated command:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

The exact authored entrypoint now resolves through the verified files above and stops at the next static import:

```text
ERR_MODULE_NOT_FOUND:
tabs/cii-workspace/cii-workspace-anchor-suggestions.js
```

Disposition:

```text
STATUS      = NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
OBSERVATION = LOCAL_EXECUTION
ORACLE      = authored source entrypoint, assertions not yet reached
FAILURE     = environment/dependency materialization, not product behavior
```

No authored assertion has failed.

## Current-main execution anchors still pending

```text
W2.13 real-CII product test                c341b99e2786b0034ef672b4efb03d167d9ad26c
BM_CII_SOURCE.CII                          e41cd05603b56837cbb6e31b9d4074ef6106fe9b
composite product regression               9fbddd0fdda5285c8ee8a477a850cf945051a9df
HANGER partial product regression          4696cd24de47650d0757b1313f4ed05d622331f8
HANGER deleted-testimony regression        f02f0775424fabf20fbb70afa5be6090eeb67a0e
real benchmark regression                  94f63368d0620ce22d26429073408d8f4d9f6e8c
tri-family real benchmark regression       3a5fbab24a1de1e887bd13f40784484045f2b047
```

## Mandatory execution order

1. finish exact dependency closure and execute `cii-workspace-writer2-restraint-product-routing.test.js`;
2. execute `cii-workspace-writer2-restraint-product-real-cii.test.js`;
3. execute the five inherited Writer2 regression entrypoints;
4. run `npm ci && npm test` only on a complete exact checkout;
5. issue READY/NOT_READY solely from observed results.

## Changed-file ledger

PR1054 remains evidence-only:

```text
agents/PR1054_workreport.md
agents/status/PR1054.yaml
agents/claims/PR1054.yaml
```

No production, test, benchmark, workflow, parser/converter, UI, or Writer3 repository file is changed.

## Appendix A — takeover gate

A1 Trace RESTRAINT DELETE from qualified slot CLEAR through W2.11 physical compaction, W2.12 one-TARGET0 arbitration, W2.13 core dispatch/product validation, canonical re-intake and final bytes.

A2 Treat missing exact dependencies as NOT_RUN. Only a reached authored assertion can establish product FAIL.

A3 Preserve CONTROL row1/NONAM vs row2/RESTRAINTS custody and all CREATE/topology blockers.

A4 W2.13 qualification must terminate in the independent complete-postimage validator; Writer testimony alone is insufficient.

A5 If an authored assertion fails, retain raw failure first and isolate the smallest authority-preserving correction before any production mutation.

## EXACT_NEXT_ACTION

Materialize `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` from exact `main@3a681c1c587ee3c1462a962879e4f79433258105`, verify its Git object, rerun the unchanged W2.13 synthetic entrypoint, and continue only through dependencies Node proves necessary. Do not merge PR1054 without a new explicit owner merge authorization.
