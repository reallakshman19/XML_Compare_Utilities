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
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

## Handover in 60 seconds

PR #1054 merged only an evidence checkpoint. It did not promote W2.13 or repository-wide runtime qualification.

Inherited truth:

```text
W2.11 RESTRAINT focused runtime = PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                  = PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product        = NOT_RUN_DEPENDENCY_CLOSURE_IN_PROGRESS
W2.13 retained-real-CII        = NOT_RUN_ENVIRONMENT
inherited Writer2 regressions  = PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                 = NOT_RUN_ENVIRONMENT
engineering failure            = NONE_OBSERVED
```

W2.17's prior sparse mirror admitted 54 exact repository JS files and reduced the static frontier to 31 modules. The unchanged W2.13 synthetic entrypoint reached `tabs/cii-workspace/cii-workspace-auxiliary.js` without an authored assertion failure.

The W2.17 local mirror was not retained in the current execution container. A fresh exact clone attempt for W2.18 failed again with:

```text
fatal: unable to access 'https://github.com/reallaksh19/XML_Compare_Utilities.git/': Could not resolve host: github.com
exit 128
```

This remains `NOT_RUN_ENVIRONMENT`; it is not a product FAIL.

## W2.18 exact restart

New main is verified at:

```text
297fb37a0e894a3aac91de9188ebf30e810781fb
```

First dependency carried forward from W2.17 is grounded on this exact main:

```text
tabs/cii-workspace/cii-workspace-auxiliary.js
blob = 7459677eccb2ca460b1971ac6d75c22f2f5ae870
imports:
  ../../parser/fixed-field.js
  ./cii-workspace-contracts.js
```

No new Writer2 engineering authority is introduced. Every repository file admitted into any rebuilt sparse mirror must satisfy:

```text
local git hash-object(file) == Git blob SHA at BASE_MAIN
```

No stubs, rewritten imports, modified authored entrypoints, fake checkout markers, or workflow-trigger gaming are permitted.

## Binding authority / negative assurance

```text
CONTROL row1 / field4 / I13 = NONAM       -> preserve byte-identically
CONTROL row2 / field4 / I13 = RESTRAINTS  -> qualified block-count mutation
RESTRAINT CREATE = BLOCKED
SIF CREATE       = BLOCKED
HANGER CREATE    = BLOCKED
Writer3 topology = unchanged / blocked
parser/converter semantics = unchanged
```

## Mandatory execution order

1. reconstruct exact W2.13 synthetic dependency graph and execute `node tests/cii-workspace-writer2-restraint-product-routing.test.js` until authored assertions run;
2. execute `node tests/cii-workspace-writer2-restraint-product-real-cii.test.js`;
3. execute inherited Writer2 regression slice;
4. execute `npm ci && npm test` only on a complete exact checkout;
5. issue READY/NOT_READY solely from observed evidence.

## Current changed-file ledger

PR #1055 is evidence-only. Permanent expected paths:

```text
agents/PR1055_workreport.md
agents/status/PR1055.yaml
agents/claims/PR1055.yaml
```

The temporary `agents/WIP-w218-restraint-runtime_workreport.md` must be deleted after permanent records are installed.

## Appendix A — takeover gate

A1 Trace W2.13 RESTRAINT DELETE from product preview/scope through core dispatch, W2.12 one-TARGET0 writer, canonical re-intake, and independent complete-postimage validation.

A2 Explain why `ERR_MODULE_NOT_FOUND` during exact sparse closure is NOT_RUN rather than product FAIL, and name the first reached authored assertion that would change that classification.

A3 Preserve #1042 CONTROL custody: row1/NONAM and row2/RESTRAINTS are separate physical authorities.

A4 Reconstruct validation independently from final bytes; writer testimony alone is insufficient.

A5 On a real authored failure, retain raw output and isolate the smallest authority-preserving defect before any production mutation.

## EXACT NEXT ACTION

Rebuild the exact W2.13 synthetic sparse mirror from `main@297fb37a0e894a3aac91de9188ebf30e810781fb`, starting with exact `cii-workspace-auxiliary.js@7459677e...` and its unchanged dependencies; run the unchanged authored entrypoint after every admitted dependency tranche until assertions execute.
