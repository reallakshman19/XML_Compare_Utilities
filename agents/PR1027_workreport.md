# PR1027 — Writer 2 partial H>1 HANGER physical compaction

# CURRENT STATE — READ FIRST

## 1. Recovery / authority header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1026
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1026
PR: #1027
BRANCH: agent/cii-writer2-hanger-partial-physical
BASE_MAIN: ae1de402db129e32cd6d7811a4e4707d64512bd4
COMPONENT_IMPLEMENTATION_BASIS_HEAD: 85b38416adbb09f680b1f8122b2f82b77a8927f3
EXPANDED_VALIDATION_BASIS_HEAD: c663f5ec21e130af532adc0f6e0d41169c4aca09
GROUNDING_EPOCH: GE-1027-002
CURRENT_STAGE: COMPONENT_COMPLETE_REVIEW_READY
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
REMAINING_LIMITATION: NATIVE_EXACT_CHECKOUT_AND_GLOBAL_REGRESSION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is inherited read-only.

## 2. Handover in 60 seconds

Implemented component transaction:

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix bytes
   - preserve two default rows
   - repack IHGRNODE raw 13-byte fields
   - preserve HGRDAT/TAG/GUID physical order class
   - preserve retained IHGRFREE rows
   - repack IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN raw 13-byte fields
   - preserve four execution rows
-> two TARGET0-relative replacements applied once
-> independent full-postimage reconstruction
-> exact final-byte equality
```

Component qualification now proven under reconstructed current-head source execution:

- five frozen implementation-independent postimage SHA-256 cases PASS;
- mandatory H=2/3/6/7/8/12/13 packing matrix PASS;
- H=7->6 and H=13->12 packed-row boundaries PASS;
- retained lexical `+12` raw-I13 token survives byte-for-byte;
- F01-F27 and F29-F30 PASS/fail closed;
- F28 product/composite delete-all-only gate PASS by current-head source inspection;
- direct predecessor tail-order and record-binding tests PASS;
- predecessor planner synthetic cases PASS;
- predecessor delete-all writer + independent-validator synthetic cases PASS;
- actual BM_CII_SOURCE CONTROL + 23-row MISCEL_1 HANGER slice for node 205 PASS through writer + validator.

Remaining NOT_RUN is narrow and explicit:

- both new focused tests on a native exact repository checkout;
- full-file `BM_CII_SOURCE.CII` intake/writer/re-intake roundtrip on a native exact checkout;
- broader Writer2/product regressions;
- repository-wide `npm test`.

No unexecuted check is represented as PASS.

## 3. Dependency and grounding

- PR1024 established INTERLEAVED/GROUPED HGRDAT/TAG/GUID physical-order qualification.
- PR1025 established positional record binding and planner partial-delete authority.
- PR1025 accepted head: `a7990ba977a4d68a1ca08a38bdf5c6d68a0491d6`.
- PR1025 squash merge: `ae1de402db129e32cd6d7811a4e4707d64512bd4`.
- PR1027 was re-grounded on that exact merged main before production coding.
- Grounding epoch `GE-1027-002` is authoritative.

Merged PR1025 authority:

```text
PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

## 4. Production implementation

### 4.1 Partial writer

File:

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js`

Authority gates include:

- canonical explicit BOUND APPLY/EXCLUDE scope;
- exact source/target hash custody;
- merged PR1025 planner READY;
- H>1;
- `0 < countAfter < countBefore`;
- qualified positional record binding;
- supported IHGRNODE-first layout;
- HANGER CREATE blocked;
- HANGER value editing blocked;
- semantic authority remains positional/physical only.

Mutation model:

```text
replacement 1 = CONTROL_HANGER_COUNT
replacement 2 = MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
```

Both spans are expressed in original TARGET0 coordinates. There is no mutation/reparse/offset chain.

### 4.2 Packed-field custody

Five packed families:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Every retained value is copied as its exact original 13-byte token. Retained values are not parsed and reformatted.

The same retained-record sequence drives all five families, HGRDAT/TAG/GUID and IHGRFREE.

### 4.3 Tail-order custody

- INTERLEAVED remains INTERLEAVED.
- GROUPED remains GROUPED.
- H'=1 is physically `SINGLE_RECORD_ORDER_EQUIVALENT`; writer testimony retains the preimage order class.
- TAG/GUID and HGRDAT rows are copied from their qualified original record positions.

### 4.4 Delete-all boundary

`countAfter == 0` is rejected by the partial writer and remains owned by the existing PR1020 delete-all path.

## 5. Independent validator

File:

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js`

The validator does not import the partial writer or its repacking/payload helpers.

It independently reconstructs:

- canonical bound scope;
- merged PR1025 planner result;
- deleted/retained record map;
- CONTROL replacement;
- all five packed arrays;
- HGRDAT/TAG/GUID retained rows;
- IHGRFREE retained rows;
- complete MISCEL_1 postimage;
- complete final CII byte string.

Primary oracle:

```text
actual final bytes === independently reconstructed expected final bytes
```

Writer ledger/record/tail testimony is secondary evidence and is checked only after the independent expected bytes exist.

## 6. Frozen-oracle runtime finding

The first frozen-oracle execution failed correctly with:

```text
CII_WRITER_2_HANGER_PARTIAL_SCOPE_TARGET_HASH_MISMATCH
```

RCA: the test passed nonexistent `spec.targetSha256`; the immutable fixture field is `spec.target0Sha256`.

Production behavior was correct: undefined/stale TARGET hash custody was rejected.

Test-only correction:

```text
85b38416adbb09f680b1f8122b2f82b77a8927f3
CII: bind frozen partial-HANGER oracle to TARGET0 hash
```

No production authority was weakened.

After the correction all five frozen postimage cases PASS.

## 7. Mandatory packing matrix

Executed under reconstructed current-head dependency closure:

```text
H=2   delete 1     -> H'=1   packed 1->1 PASS
H=3   delete 2     -> H'=2   packed 1->1 PASS
H=6   delete 1     -> H'=5   packed 1->1 PASS
H=7   delete 1     -> H'=6   packed 2->1 PASS
H=7   delete 7     -> H'=6   packed 2->1 PASS
H=8   delete 2     -> H'=7   packed 2->2 PASS
H=8   delete 2,7   -> H'=6   packed 2->1 PASS
H=12  delete 1     -> H'=11  packed 2->2 PASS
H=13  delete 1     -> H'=12  packed 3->2 PASS
```

Representative GROUPED H=3/H=7/H=13 cases also PASS.

Lexical custody proof:

```text
retained IHGRNUM raw token = "          +12"
postimage raw token         = "          +12"
PASS
```

## 8. F01-F30 falsifier result

```text
F01 wrong oldToNewRecordIndex                 PASS_FAIL_CLOSED
F02 retained record order changed             PASS_FAIL_CLOSED
F03 one packed family different order         PASS_FAIL_CLOSED
F04 wrong packed-row count                    PASS_FAIL_CLOSED
F05 blank packed I13 admitted as zero         PASS_FAIL_CLOSED
F06 retained value numerically reserialized   PASS_FAIL_CLOSED
F07 wrong IHGRFREE record                     PASS_FAIL_CLOSED
F08 INTERLEAVED -> GROUPED                     PASS_FAIL_CLOSED
F09 GROUPED -> INTERLEAVED                     PASS_FAIL_CLOSED
F10 wrong HGRDAT retained record               PASS_FAIL_CLOSED
F11 wrong TAG/GUID retained record             PASS_FAIL_CLOSED
F12 TAG/GUID swapped                           PASS_FAIL_CLOSED
F13 wrong CONTROL.NOHGRS                       PASS_FAIL_CLOSED
F14 default row changed                        PASS_FAIL_CLOSED
F15 RRMAT changed                              PASS_FAIL_CLOSED
F16 VFLEX/nozzle prefix changed                PASS_FAIL_CLOSED
F17 execution row changed                      PASS_FAIL_CLOSED
F18 unrelated CII byte changed                 PASS_FAIL_CLOSED
F19 stale TARGET hash                          PASS_FAIL_CLOSED
F20 forged Writer mutation ledger              PASS_FAIL_CLOSED
F21 forged retained-record testimony           PASS_FAIL_CLOSED
F22 forged tail-order testimony                PASS_FAIL_CLOSED
F23 unsupported INPUTXML_CURRENT layout        PASS_FAIL_CLOSED
F24 HANGER CREATE                              PASS_FAIL_CLOSED
F25 HANGER value edit                          PASS_FAIL_CLOSED
F26 no qualified PR1025 record binding         PASS_FAIL_CLOSED
F27 countAfter==0 partial route                PASS: partial rejects; delete-all applies
F28 product/composite accepts partial HANGER   PASS_SOURCE_INSPECTION_CURRENT_HEAD
F29 H=7->6 boundary                            PASS
F30 H=13->12 boundary                          PASS
```

F28 was intentionally not executed by stubbing unrelated NODENAME/SIF composite imports. Current production source explicitly retains:

```text
hangerMutation = EXISTING_HANGER_DELETE_ALL_ONLY
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

for product/composite partial HANGER.

## 9. Inherited predecessor regression

Executed from exact current-head predecessor source reconstructed through the GitHub connector:

```text
tests/cii-workspace-writer2-hanger-tail-order.test.js
  PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE

tests/cii-workspace-writer2-hanger-record-binding.test.js
  PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE

cii-workspace-writer2-hanger-delete-plan synthetic cases
  PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
  - INTERLEAVED partial planner
  - GROUPED partial planner
  - corrupt tail fail closed
  - corrupt IHGRFREE fail closed
  - delete-all independent of retained tail classification
  - bad packed prefix fail closed
  - HANGER CREATE blocked
  - INPUTXML_CURRENT rejected

cii-workspace-writer2-hanger-delete-all physical synthetic cases
  PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
  - H=1 writer + independent validator
  - H=3 INTERLEAVED writer + validator
  - H=3 GROUPED writer + validator
  - partial H>1 rejected by delete-all writer
  - unrelated postimage tamper rejected
  - forged mutation testimony rejected
  - stale preimage rejected
```

Do not infer broader Writer2 integration PASS from these component/predecessor checks.

## 10. Real BM_CII_SOURCE H=1 evidence

Repository source inspection establishes:

```text
CONTROL.NUMELT = 40
CONTROL.NOHGRS = 1
IHGRNODE       = 205
rrmatRows      = ceil(40/6) = 7
nozzleRows     = 0
MISCEL_1 rows  = 23
post delete-all rows = 7 + 4 = 11
```

The actual repository CONTROL rows and all 23 MISCEL_1 HANGER rows were reconstructed into the execution harness and passed:

```text
planner READY
countBefore = 1
countAfter  = 0
record 1 deleted
oldToNew = {1:0}
tailOrderAuthority = ORDER_EQUIVALENT_FOR_SINGLE_RECORD
writer APPLIED
independent validator PASS
post hanger count = 0
expectedMiscelRowsAfter = 11
```

Evidence class:

```text
PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

This is deliberately **not** labelled full-file exact benchmark PASS. The connector line-range representation is normalized for transport; the execution container cannot materialize the private repository blob directly because GitHub DNS is unavailable.

## 11. Runtime isolation / package test finding

Changed paths are exactly 10 intended files. The only production additions are the two new component modules.

No existing product/composite/UI/router file is changed to import the new component. Therefore this PR does not activate partial HANGER in an existing runtime path.

`package.json` is unchanged. Its repository `npm test` command is an explicit broad suite and does **not** invoke CII Workspace/HANGER tests. Therefore:

- focused Issue #1026 qualification must remain explicit standalone Node execution;
- not modifying package.json is correct scope discipline;
- missing full `npm test` is a global regression limitation, not missing component test registration introduced by this PR.

## 12. Validation observation classes

PASS classes used in this workreport:

```text
PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
PASS_SOURCE_INSPECTION_CURRENT_HEAD
```

These are not claimed as:

```text
PASS_EXACT_CHECKOUT
PASS_FULL_BENCHMARK_INTAKE
PASS_FULL_REPOSITORY
```

No current-head GitHub Actions engineering-test run exists for this PR.

## 13. Changed-file ledger

Expected / actual paths:

```text
agents/MASTER_INDEX.md
agents/PR1027_workreport.md
agents/claims/PR1027.yaml
agents/status/PR1027.yaml
docs/cii-writer2-hanger-partial-physical.md
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js
tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

```text
actual: 10
intended: 10
unexplained: 0
workflow changes: 0
package-script changes: 0
product/UI/composite changes: 0
```

## 14. Negative assurance

PR1027 does not gain or modify authority for:

- product/core partial-HANGER apply;
- tri-family composite partial HANGER;
- UI execution;
- HANGER CREATE;
- HANGER value editing;
- HGRDAT engineering semantics;
- SIF CREATE;
- restraint/process cardinality;
- Writer3 topology;
- protected parser/converter code;
- GitHub workflows.

## 15. Review / merge disposition

Current engineering disposition:

```text
COMPONENT IMPLEMENTATION: COMPLETE
COMPONENT QUALIFICATION: PASS_WITH_EXPLICIT_OBSERVATION_CLASS
DIRECT PREDECESSOR REGRESSION: PASS_RECONSTRUCTED
RUNTIME ADOPTION: NONE / COMPONENT-ISOLATED
REVIEW READINESS: READY
MERGE AUTHORITY: OWNER_ONLY
MERGE AUTHORIZED: FALSE
```

The PR may be submitted for review. Do not merge without fresh owner authorization.

If a native exact checkout becomes available before merge, execute:

```text
1. node tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
2. node tests/cii-workspace-writer2-hanger-partial-physical.test.js
3. full inherited HANGER/Writer2 integration tests
4. full-file BM_CII_SOURCE H=1 delete-all intake roundtrip
5. npm test
```

All such checks remain NOT_RUN until actually executed.

# APPENDIX A — TAKEOVER QUALIFICATION

A takeover engineer should answer all five before modifying production behavior.

1. Explain why retained I13 fields must be copied lexically rather than parsed/reformatted, and derive the H=7->6 failure mode.
2. For GROUPED H=3 deleting record 2, derive the exact retained HGRDAT/TAG/GUID row sequence from TARGET0.
3. Explain why H'=1 cannot prove INTERLEAVED vs GROUPED from the postimage and which preimage testimony remains authoritative.
4. Describe how the independent validator catches both an unrelated postimage-byte mutation and forged Writer testimony without importing Writer helpers.
5. Explain why F27 remains the existing delete-all path and why F28 must remain product/composite blocked in PR1027.

Qualification threshold: 92/100 overall; each question >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single stack.
- 2026-08-22: PR1025 observed as hard dependency; production intentionally blocked.
- 2026-08-22: owner authorized progression; PR1025 squash-merged at `ae1de402...`.
- 2026-08-22: PR1027 re-grounded on exact merged main; GE-1027-002 opened.
- 2026-08-22: partial writer, independent validator, packing/falsifier suite and frozen SHA oracles authored.
- 2026-08-22: source audit corrected H'=1 order-equivalence handling and F22 diagnostic expectation.
- 2026-08-22: first frozen runtime exposed test TARGET-hash bug; production correctly failed closed.
- 2026-08-22: test corrected at `85b38416...` to use immutable `target0Sha256`.
- 2026-08-22: frozen oracles, full packing matrix, F01-F27/F29-F30, VFLEX custody and delete-all delegation passed under reconstructed dependency-closure execution; F28 current-head source gate confirmed.
- 2026-08-22: direct tail-order and record-binding predecessor tests passed under reconstructed current-head execution.
- 2026-08-23: planner synthetic predecessor cases passed against exact current-head planner/helper source.
- 2026-08-23: unchanged delete-all writer + independent-validator synthetic cases passed, including tamper/testimony/preimage falsifiers.
- 2026-08-23: actual BM_CII_SOURCE CONTROL + 23-row MISCEL_1 HANGER slice for node 205 passed writer + independent validator; full-file exact intake remains NOT_RUN.
- 2026-08-23: package/runtime isolation reviewed; no existing runtime adoption and repository npm test does not invoke CII Workspace/HANGER qualification.
- 2026-08-23: component disposition advanced to review-ready; merge remains owner-only and unauthorized.
