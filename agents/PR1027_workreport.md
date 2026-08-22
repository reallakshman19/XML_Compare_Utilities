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
COMPONENT_VALIDATION_BASIS_HEAD: 85b38416adbb09f680b1f8122b2f82b77a8927f3
GROUNDING_EPOCH: GE-1027-002
CURRENT_STAGE: FOCUSED_COMPONENT_QUALIFICATION_PASS_FULL_REPOSITORY_PENDING
CURRENT_BLOCKER: FULL_EXACT_CHECKOUT_REGRESSION_ENVIRONMENT_UNAVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its planner/record-binding authority is inherited read-only.

## 2. Handover in 60 seconds

What is implemented:

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix
   - preserve two default rows
   - repack IHGRNODE raw I13 fields
   - preserve HGRDAT/TAG/GUID order class
   - preserve retained IHGRFREE rows
   - repack IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN raw I13 fields
   - preserve four execution rows
-> two TARGET0-relative replacements applied once
-> re-intake
-> independent full-postimage reconstruction and exact byte equality
```

What is now proven by focused execution:
- five frozen independent TARGET0/final SHA-256 cases pass;
- independent validator passes those frozen cases;
- mandatory H=2/3/6/7/8/12/13 matrix passes;
- H=7->6 and H=13->12 packed-row boundaries pass;
- retained lexical `+12` I13 token survives exactly;
- F01-F27 and F29-F30 pass in reconstructed dependency-closure execution;
- F28 product/composite delete-all-only gate passes current-head source inspection.

What remains NOT_RUN:
- inherited HANGER/Writer2 runtime suites on a native exact checkout;
- real `BM_CII_SOURCE.CII` H=1 delete-all regression on a native exact checkout;
- full repository `npm test`.

No unexecuted check is represented as PASS.

## 3. Dependency and grounding history

- PR1024 established physical INTERLEAVED/GROUPED tail-order qualification.
- PR1025 established positional record binding and planner partial-delete authority.
- User authorized progression on 2026-08-22.
- PR1025 was made ready and squash-merged at `ae1de402db129e32cd6d7811a4e4707d64512bd4`.
- PR1027 was re-grounded on that exact main before production code.
- Grounding epoch `GE-1027-002` is authoritative for this implementation.

Merged PR1025 record-binding authority:

```text
PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

## 4. Production implementation

### Writer

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js`

Authority gates:
- canonical bound APPLY/EXCLUDE scope;
- exact source/target hash custody;
- merged PR1025 planner READY;
- H>1;
- `0 < countAfter < countBefore`;
- partial-record binding QUALIFIED;
- HANGER CREATE remains blocked;
- semantic authority remains positional/physical only.

Mutation model:

```text
replacement 1 = CONTROL_HANGER_COUNT
replacement 2 = MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
```

Both are original TARGET0 coordinate spans. There is no sequential mutation/reparse offset authority.

### Packed fields

Five packed families:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Every retained field is copied as its exact original 13-byte token. The writer does not parse retained numeric values and format them again.

### Tail and free rows

- INTERLEAVED stays INTERLEAVED.
- GROUPED stays GROUPED.
- H'=1 is physically order-equivalent; Writer testimony still retains the preimage order class.
- IHGRFREE is retained by the same positional record map.

### Delete-all boundary

`countAfter == 0` is rejected by the partial writer and remains owned by `cii-workspace-writer2-hanger-delete-all-write.js`.

## 5. Independent validator

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js`

The validator does not import the partial writer or its payload/repacking helpers.

It independently reconstructs:
- canonical bound scope;
- merged PR1025 planner result;
- deleted/retained record map;
- CONTROL replacement;
- all five raw-I13 packed arrays;
- HGRDAT/TAG/GUID retained rows;
- IHGRFREE retained rows;
- complete MISCEL_1 postimage;
- complete final CII byte string.

Primary oracle:

```text
actual final bytes === independently reconstructed expected final bytes
```

Writer mutation/record/tail testimony is secondary evidence only and is checked after independent expected bytes exist.

## 6. Frozen oracle qualification

Fixture:
`tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json`

Cases:

```text
H3  INTERLEAVED delete2
H3  GROUPED delete2
H7  INTERLEAVED delete2, retained IHGRNUM raw token +12
H7  GROUPED delete2
H13 INTERLEAVED delete1
```

### Finding during first runtime execution

Initial frozen-oracle execution failed correctly with:

```text
CII_WRITER_2_HANGER_PARTIAL_SCOPE_TARGET_HASH_MISMATCH
```

RCA: the test passed nonexistent `spec.targetSha256` into `before.contentSha256`; the immutable fixture field is `spec.target0Sha256`.

Production writer behavior was correct: canonical scope custody rejected the undefined TARGET hash.

Fix committed on PR1027:

```text
85b38416adbb09f680b1f8122b2f82b77a8927f3
CII: bind frozen partial-HANGER oracle to TARGET0 hash
```

After the fix, all five frozen postimage SHA cases pass.

## 7. Mandatory packing matrix — focused runtime result

Executed in the reconstructed dependency closure:

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

Lexical custody:

```text
retained IHGRNUM raw token = "          +12"
postimage raw token         = "          +12"
PASS
```

## 8. F01-F30 falsifier result

Focused reconstructed dependency-closure execution:

```text
F01 wrong oldToNewRecordIndex                 PASS_FAIL_CLOSED
F02 retained record order changed             PASS_FAIL_CLOSED
F03 one packed family different order         PASS_FAIL_CLOSED
F04 wrong packed-row count                    PASS_FAIL_CLOSED
F05 blank packed I13 admitted as zero         PASS_FAIL_CLOSED
F06 retained value numerically reserialized  PASS_FAIL_CLOSED
F07 wrong IHGRFREE record                     PASS_FAIL_CLOSED
F08 INTERLEAVED -> GROUPED                    PASS_FAIL_CLOSED
F09 GROUPED -> INTERLEAVED                    PASS_FAIL_CLOSED
F10 wrong HGRDAT retained record              PASS_FAIL_CLOSED
F11 wrong TAG/GUID retained record            PASS_FAIL_CLOSED
F12 TAG/GUID swapped                          PASS_FAIL_CLOSED
F13 wrong CONTROL.NOHGRS                      PASS_FAIL_CLOSED
F14 default row changed                       PASS_FAIL_CLOSED
F15 RRMAT changed                             PASS_FAIL_CLOSED
F16 VFLEX/nozzle prefix changed               PASS_FAIL_CLOSED
F17 execution row changed                     PASS_FAIL_CLOSED
F18 unrelated CII byte changed                PASS_FAIL_CLOSED
F19 stale TARGET hash                         PASS_FAIL_CLOSED
F20 forged Writer mutation ledger             PASS_FAIL_CLOSED
F21 forged retained-record testimony          PASS_FAIL_CLOSED
F22 forged tail-order testimony               PASS_FAIL_CLOSED
F23 unsupported INPUTXML_CURRENT layout       PASS_FAIL_CLOSED
F24 HANGER CREATE                             PASS_FAIL_CLOSED
F25 HANGER value edit                         PASS_FAIL_CLOSED
F26 no qualified PR1025 record binding        PASS_FAIL_CLOSED
F27 countAfter==0 partial route               PASS; partial rejects, delete-all writer applies
F28 product/composite accepts partial HANGER  PASS_SOURCE_INSPECTION_CURRENT_HEAD
F29 H=7->6 boundary                           PASS
F30 H=13->12 boundary                         PASS
```

F28 was deliberately not executed with a stubbed composite import graph. Current-head production source explicitly keeps:

```text
hangerMutation = EXISTING_HANGER_DELETE_ALL_ONLY
```

and adds:

```text
WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

for any ready HANGER plan that is not delete-all/count-zero.

## 9. Validation observation class / limitation

The runtime environment cannot resolve `github.com`, so a native private-repository checkout is unavailable.

Focused tests were executed from a dependency closure reconstructed from GitHub connector source at the PR component head. Therefore these results are recorded as:

```text
PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
```

They are **not** claimed as:

```text
PASS_EXACT_CHECKOUT
PASS_FULL_REPOSITORY
```

No current-head GitHub Actions test workflow exists for this qualification; the repository workflow inspected is Pages/deploy oriented.

## 10. Changed-file ledger

Expected/actual Issue #1026 paths:

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

Last reconciled before validation metadata:

```text
actual: 10
intended: 10
unexplained: 0
workflow changes: 0
package-script changes: 0
product/UI changes: 0
```

## 11. Negative assurance

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

## 12. Current review / merge state

```text
PR #1027: OPEN / DRAFT / MERGEABLE
merge authority: OWNER_ONLY
```

Do not merge without fresh owner authorization.

## 13. Exact next action

When a native exact checkout becomes available:

```text
1. run tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
2. run tests/cii-workspace-writer2-hanger-partial-physical.test.js
3. run inherited HANGER/Writer2 suites
4. run real BM_CII_SOURCE H=1 delete-all regression
5. run full npm test
6. reconcile changed files / statuses / reviews
```

Until then, keep the PR draft and preserve the fail-closed component boundary.

# APPENDIX A — TAKEOVER QUALIFICATION

A takeover engineer should be able to answer all five before changing production behavior.

1. Explain why retained I13 fields must be copied lexically rather than parsed/reformatted, and identify the H=7->6 failure mode.
2. For a GROUPED H=3 target deleting record 2, derive the exact retained HGRDAT/TAG/GUID row sequence from TARGET0.
3. Explain why H'=1 cannot prove INTERLEAVED vs GROUPED from the postimage and what testimony remains authoritative.
4. Describe how the independent validator detects an unrelated UNITS byte mutation and a forged Writer ledger without trusting Writer helpers.
5. Explain why F27 belongs to the existing delete-all writer and why F28 must remain product/composite blocked in this PR.

Qualification threshold: 92/100 overall, each question >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as single stack.
- 2026-08-22: PR1025 observed hard dependency; production intentionally blocked.
- 2026-08-22: owner authorized progression; PR1025 squash-merged at `ae1de402...`.
- 2026-08-22: PR1027 re-grounded on exact merged main; GE-1027-002 opened.
- 2026-08-22: component writer, independent validator, packing/falsifier suite and frozen SHA oracles authored.
- 2026-08-22: source audit corrected H'=1 order-equivalence handling and F22 diagnostic expectation.
- 2026-08-22: first frozen runtime exposed test TARGET hash bug; production correctly failed closed.
- 2026-08-22: test fixed at `85b38416...` to use immutable `target0Sha256`.
- 2026-08-22: frozen oracles, independent validator cases, complete packing matrix, physical falsifiers, VFLEX custody and delete-all delegation passed in reconstructed dependency-closure execution; F28 current-head source gate confirmed.
