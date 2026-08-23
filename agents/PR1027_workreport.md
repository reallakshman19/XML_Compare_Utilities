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

## 2. Current engineering result

Implemented transaction:

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix bytes
   - preserve two default rows
   - repack exact raw 13-byte IHGRNODE fields
   - retain HGRDAT/TAG/GUID in the qualified original order class
   - retain IHGRFREE rows by the same positional record sequence
   - repack exact raw 13-byte IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN fields
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> independent complete-postimage reconstruction
-> exact final-byte equality
```

`countAfter == 0` remains the existing delete-all writer path.

Semantic authority remains:

```text
NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

No HGRDAT engineering semantics are invented by PR1027.

## 3. Pre-merge audit finding and correction

On 2026-08-23 the exact 10-file review diff was re-audited before merge authorization.

Finding:

```text
ISS-1027-002 TOP_LEVEL_DELETED_RECORD_TESTIMONY_UNCHECKED
```

The independent validator already checked:
- retained-record testimony;
- old-to-new record mapping testimony;
- nested `writerResult.deletePlan.deletedRecordIndices`.

It did **not** separately compare the writer result's top-level `deletedRecordIndices` against the independently rebuilt plan. Therefore correct final bytes plus forged top-level deleted-record testimony could pass that testimony layer.

This violated the Issue #1026 requirement that deleted/retained/old-to-new Writer testimony be independently compared after expected bytes are constructed.

Production correction:

```text
8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84
CII: validate deleted HANGER record testimony
```

The validator now requires all three top-level record testimonies to match:

```text
writerResult.deletedRecordIndices  == independently rebuilt plan.deletedRecordIndices
writerResult.retainedRecordIndices == independently rebuilt retained sequence
writerResult.oldToNewRecordIndex   == independently rebuilt old-to-new map
```

Any mismatch raises:

```text
WRITER_2_HANGER_PARTIAL_RECORD_TESTIMONY_MISMATCH
```

Dedicated behavioral falsifier:

```text
172467f96f4f417dc2639adeec2a5d8ba558fa61
CII: falsify deleted HANGER record testimony

tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

Case:

```text
H = 3
records/nodes = 1/200, 2/210, 3/220
delete record 2
valid writer testimony deletedRecordIndices = [2] -> validator PASS
forged top-level deletedRecordIndices = [1]  -> validator FAIL_CLOSED
```

Executed in the reconstructed exact current-head dependency closure:

```text
Writer2 partial HANGER validator rejects forged top-level deleted-record testimony.
PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
```

The PR was converted back to draft while this review finding was corrected. It may return to ready-for-review only after repository evidence is synchronized.

## 4. Focused qualification

Current executed evidence classes:

```text
frozen independent TARGET0/final SHA oracles       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
mandatory H=2/3/6/7/8/12/13 packing matrix        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED representative cases                   PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
GROUPED representative cases                       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 lexical +12 preservation                    PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
independent exact complete-postimage validator     PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27                                             PASS / FAIL_CLOSED AS EXPECTED
F28 product/composite gate                         PASS_SOURCE_INSPECTION_CURRENT_HEAD
F29 H=7 -> 6 packed boundary                       PASS
F30 H=13 -> 12 packed boundary                     PASS
pre-merge forged deleted-record testimony          PASS_FAIL_CLOSED_RECONSTRUCTED_CURRENT_HEAD_SOURCE
```

Critical packing boundaries:

```text
H=7  delete 1 or 7 -> H'=6   packed rows 2 -> 1
H=13 delete 1      -> H'=12  packed rows 3 -> 2
```

Retained packed tokens are relocated lexically. For example:

```text
"          +12" remains "          +12"
```

It must not become a numerically equivalent reserialization.

## 5. Independent validator boundary

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js` does not import the partial writer or its payload/repacking helpers.

It independently reconstructs:
- canonical BOUND APPLY/EXCLUDE scope and hashes;
- merged PR1025 partial-delete plan;
- deleted and retained record map;
- CONTROL replacement;
- five raw-I13 packed families;
- HGRDAT/TAG/GUID retained rows;
- IHGRFREE retained rows;
- complete MISCEL_1 postimage;
- complete final CII bytes.

Primary oracle:

```text
actual final bytes === independently reconstructed expected final bytes
```

Only after that expected postimage exists are Writer mutation, count, record-map, packed-row, tail-order, scope and nested-plan testimonies compared.

## 6. Inherited predecessor regression

Re-executed after the deleted-record testimony correction:

```text
synthetic inherited HANGER planner/delete-all cases           PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
synthetic HANGER delete-all writer + validator cases          PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
real BM_CII_SOURCE HANGER CONTROL/MISCEL_1 slice              PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

The benchmark slice uses actual repository HANGER custody:

```text
CONTROL.NUMELT = 40
CONTROL.NUMNOZ = 0
CONTROL.NOHGRS = 1
IHGRNODE       = 205
RRMAT rows     = 7
MISCEL_1 rows before = 23
MISCEL_1 rows after  = 11
```

This is not represented as a full-file exact-intake result because connector range transport normalizes text and the private repository cannot be cloned into the execution container.

## 7. Original runtime finding retained

The first frozen-oracle execution failed with:

```text
CII_WRITER_2_HANGER_PARTIAL_SCOPE_TARGET_HASH_MISMATCH
```

Root cause was a test-harness mistake: it supplied nonexistent `spec.targetSha256`; the immutable fixture field is `spec.target0Sha256`.

Corrected at:

```text
85b38416adbb09f680b1f8122b2f82b77a8927f3
CII: bind frozen partial-HANGER oracle to TARGET0 hash
```

Production correctly failed closed; no production authority was weakened.

## 8. Changed-file ledger

Current intended Issue #1026 paths:

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

Last engineering reconciliation after the audit fix:

```text
actual: 11
intended: 11
unexplained: 0
production modules: 2
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
```

## 9. Explicit NOT_RUN / observation limits

The following are **not** represented as PASS:

```text
both focused PR1027 tests on a native exact private-repository checkout
full-file BM_CII_SOURCE.CII intake -> write -> re-intake roundtrip
broader Writer2/product integration regression
repository-wide npm test
```

The execution container cannot resolve GitHub hosts and cannot create a native private-repository checkout. No PR-triggered engineering-test workflow exists for this head.

`package.json` is unchanged and the broad repository `npm test` command does not invoke the CII Workspace/HANGER qualification tests. This is an observation about test registration, not a claim that the broad suite passed.

## 10. Negative assurance

PR1027 does not add or modify authority for:
- product/core partial-HANGER apply;
- tri-family composite partial HANGER;
- UI execution;
- HANGER CREATE;
- HANGER value editing;
- HGRDAT semantic interpretation;
- SIF CREATE;
- restraint/process cardinality;
- Writer3 topology;
- protected parser/converter code;
- workflows.

Existing product/composite partial HANGER remains blocked by:

```text
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

## 11. Review / merge disposition

Engineering disposition after the pre-merge audit fix:

```text
COMPONENT IMPLEMENTATION             COMPLETE
COMPONENT QUALIFICATION              PASS_WITH_EXPLICIT_OBSERVATION_CLASS
PRE_MERGE_AUDIT DEFECT               FIXED
DELETED-RECORD TESTIMONY FALSIFIER   PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE
DIRECT PREDECESSOR REGRESSION        PASS_RECONSTRUCTED
RUNTIME ADOPTION                     NONE / COMPONENT_ISOLATED
HANDOVER READINESS                   READY
REVIEW READINESS                     READY_AFTER_METADATA_SYNC
MERGE AUTHORITY                      OWNER_ONLY
MERGE AUTHORIZED                     FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

A takeover engineer should answer all five before changing production behavior.

1. Explain why retained I13 fields must be copied lexically rather than parsed/reformatted, and derive the H=7 -> 6 packed-row transition.
2. For GROUPED H=3 deleting record 2, derive the retained HGRDAT/TAG/GUID physical row sequence from TARGET0.
3. Explain why H'=1 can only prove `SINGLE_RECORD_ORDER_EQUIVALENT` from the postimage while writer testimony retains the qualified preimage order.
4. Explain how the validator detects unrelated-byte tamper, forged mutation testimony, forged retained/deleted record testimony and forged tail-order testimony without importing writer helpers.
5. Explain why countAfter==0 belongs to the existing delete-all writer and why product/composite partial HANGER remains blocked in this PR.

Qualification threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single stack.
- 2026-08-22: PR1025 hard dependency merged at `ae1de402...`; PR1027 re-grounded on exact merged main.
- 2026-08-22: component writer, independent validator, frozen SHA oracles, packing/falsifier suite authored.
- 2026-08-22: H'=1 order-equivalence handling and F22 diagnostic corrected during source audit.
- 2026-08-22: first frozen execution exposed test TARGET-hash defect; fixed at `85b38416...`; production remained fail-closed.
- 2026-08-22/23: focused matrix/falsifiers and inherited predecessor slices passed in reconstructed execution; unavailable native/global checks remained NOT_RUN.
- 2026-08-23: PR transitioned to ready-for-review, then pre-merge audit found missing top-level deleted-record testimony verification.
- 2026-08-23: PR returned to draft; validator fixed at `8ea0c9df...`; dedicated falsifier added at `172467f9...` and passed end-to-end in the reconstructed current-head closure.
