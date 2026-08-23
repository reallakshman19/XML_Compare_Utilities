# PR1027 — Writer 2 partial H>1 HANGER physical compaction

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1026
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1026
PR: #1027
BRANCH: agent/cii-writer2-hanger-partial-physical
BASE_MAIN: ae1de402db129e32cd6d7811a4e4707d64512bd4
GROUNDING_EPOCH: GE-1027-002
CURRENT_STAGE: PRE_MERGE_AUDIT_FIX_VALIDATED_REVIEW_READY
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
REMAINING_LIMITATION: NATIVE_EXACT_CHECKOUT_AND_GLOBAL_REGRESSION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is inherited read-only.

## Current engineering transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix bytes
   - preserve two default rows
   - repack exact raw 13-byte IHGRNODE fields
   - retain HGRDAT/TAG/GUID in qualified original order class
   - retain IHGRFREE by the same positional record sequence
   - repack exact raw 13-byte IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN fields
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> independent complete-postimage reconstruction
-> exact final-byte equality
```

`countAfter == 0` remains the existing delete-all writer path. Semantic authority remains `NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY`.

## Pre-merge audit finding

On 2026-08-23 the review diff was re-audited before merge authorization.

Finding:

```text
TOP_LEVEL_DELETED_RECORD_TESTIMONY_UNCHECKED
```

The validator checked retained-record and old-to-new testimony and the nested delete-plan deleted indices, but did not separately compare the writer result's top-level `deletedRecordIndices`.

Fixed at:

```text
8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84
CII: validate deleted HANGER record testimony
```

The validator now requires:

```text
writerResult.deletedRecordIndices  == independently rebuilt deleted records
writerResult.retainedRecordIndices == independently rebuilt retained records
writerResult.oldToNewRecordIndex   == independently rebuilt old-to-new map
```

Mismatch raises:

```text
WRITER_2_HANGER_PARTIAL_RECORD_TESTIMONY_MISMATCH
```

Dedicated regression:

```text
172467f96f4f417dc2639adeec2a5d8ba558fa61
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

Executed behavior:

```text
H=3, delete record 2
valid deletedRecordIndices=[2] -> validator PASS
forged deletedRecordIndices=[1] -> validator FAIL_CLOSED
```

Result: `PASS_FAIL_CLOSED_RECONSTRUCTED_CURRENT_HEAD_SOURCE`.

The PR was intentionally converted back to draft during correction.

## Qualification state

```text
frozen independent TARGET0/final SHA oracles       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
mandatory H=2/3/6/7/8/12/13 matrix                 PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED representative cases                   PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
GROUPED representative cases                       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 lexical +12 preservation                    PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
independent complete-postimage validator           PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27                                             PASS / FAIL_CLOSED as expected
F28 product/composite gate                         PASS_SOURCE_INSPECTION_CURRENT_HEAD
F29-F30                                             PASS
pre-merge deleted-record testimony falsifier       PASS_FAIL_CLOSED_RECONSTRUCTED_CURRENT_HEAD_SOURCE
```

Critical packing boundaries remain H=7->6 (2 packed rows to 1) and H=13->12 (3 to 2).

## Predecessor regression after audit fix

```text
synthetic inherited HANGER planner/delete-all cases       PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
synthetic delete-all writer + independent validator       PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
real BM_CII_SOURCE HANGER CONTROL/MISCEL_1 slice          PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

Benchmark HANGER custody exercised:

```text
NUMELT=40
NUMNOZ=0
NOHGRS=1
IHGRNODE=205
RRMAT rows=7
MISCEL_1 before=23 rows
MISCEL_1 after=11 rows
```

This is not a full-file exact-intake claim.

## Original runtime finding retained

The first frozen-oracle execution exposed a test-harness error: nonexistent `spec.targetSha256` was passed instead of immutable `spec.target0Sha256`. Production correctly failed closed. The test-only fix is `85b38416adbb09f680b1f8122b2f82b77a8927f3`.

## Changed-file ledger

Current Issue #1026 paths:

```text
agents/MASTER_INDEX.md
agents/PR1027_workreport.md
agents/claims/PR1027.yaml
agents/status/PR1027.yaml
docs/cii-writer2-hanger-partial-physical.md
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

```text
actual: 11
intended: 11
unexplained: 0
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
```

## Explicit NOT_RUN

```text
focused PR1027 tests on a native exact private-repository checkout
full-file BM_CII_SOURCE.CII intake -> write -> re-intake
broader Writer2/product integration regression
repository-wide npm test
```

The execution container cannot resolve GitHub hosts and cannot create a native private-repository checkout. No PR-triggered engineering-test workflow exists for this head. Unavailable checks are not represented as PASS.

## Negative assurance

PR1027 does not add authority for product/core partial-HANGER apply, composite partial HANGER, UI execution, HANGER CREATE/value editing, HGRDAT semantics, SIF CREATE, Writer3 topology, protected parsers/converters, package scripts or workflows.

Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Review / merge disposition

```text
COMPONENT IMPLEMENTATION             COMPLETE
COMPONENT QUALIFICATION              PASS_WITH_EXPLICIT_OBSERVATION_CLASS
PRE_MERGE AUDIT DEFECT               FIXED
DELETED-RECORD TESTIMONY FALSIFIER   PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
DIRECT PREDECESSOR REGRESSION        PASS_RECONSTRUCTED
RUNTIME ADOPTION                     NONE / COMPONENT_ISOLATED
HANDOVER READINESS                   READY
REVIEW READINESS                     READY
MERGE AUTHORITY                      OWNER_ONLY
MERGE AUTHORIZED                     FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Explain why retained I13 fields are copied lexically and derive H=7->6.
2. Derive GROUPED H=3 delete-record-2 retained HGRDAT/TAG/GUID row order.
3. Explain H'=1 `SINGLE_RECORD_ORDER_EQUIVALENT` versus preimage tail-order testimony.
4. Explain independent detection of unrelated-byte tamper, mutation-ledger tamper, deleted/retained record testimony tamper and tail-order testimony tamper.
5. Explain why countAfter==0 remains delete-all and why product/composite partial HANGER remains blocked.

Threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as single stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production code.
- 2026-08-22: component writer, independent validator, packing/falsifier tests and frozen SHA oracles authored.
- 2026-08-22: frozen-oracle target-hash harness defect fixed without weakening production.
- 2026-08-22/23: packing matrix, F01-F30 coverage and predecessor slices qualified under explicit observation classes.
- 2026-08-23: pre-merge audit found top-level deleted-record testimony gap; PR returned to draft.
- 2026-08-23: validator fixed at `8ea0c9df...`; dedicated falsifier added at `172467f9...`; valid transaction PASS and forged deleted-record testimony FAIL_CLOSED; predecessor regression remained green.
