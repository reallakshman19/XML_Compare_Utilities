# PR1007 — CII Writer 1C Exact Physical ELEMENT Custody Hardening

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / IMPLEMENTATION ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: owner instruction 2026-08-20 following Writer 1C audit
PR_OR_WIP: PR1007
BRANCH: agent/cii-writer1c-exact-custody-hardening

PR_HEAD_OBSERVED: 2caeacd2e4ec7bcb27b1e4a3fefabafbe7ff46b5
REPORT_BASIS_HEAD: 2caeacd2e4ec7bcb27b1e4a3fefabafbe7ff46b5
MAIN_HEAD_LAST_CHECKED: 692be3fd536b7c62576c443f5f831984e4de66a2
MERGE_BASE: 692be3fd536b7c62576c443f5f831984e4de66a2
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-W1C-HARDEN-002
CURRENT_TAKEOVER: NONE
CURRENT_STAGE: IMPLEMENT
LAST_COMPLETED_STAGE: BOOTSTRAP / COORDINATION / PR ALLOCATION
CURRENT_BLOCKER: NONE
HIGHEST_RISK: current merged NODENAME physical-custody mapper can fall back from exact parsed-index identity to FROM/TO-only matching, which is not unique for duplicate/parallel physical elements.
LAST_DURABLE_CHECKPOINT: PR1007 allocated from WIP bootstrap
EXACT_NEXT_ACTION: patch cii-workspace-nodename.js to separate tolerant semantic fallback from exact Writer physical custody, then add adversarial duplicate/index-drift tests and execute focused validation.
```

## 2. Handover in 60 Seconds

PR1007 hardens merged Writer1C Phase-1 NODENAME custody only. Current main `matchDescriptor()` first binds a parsed element to a physical 15-row ELEMENT block by exact `element.index + FROM + TO`, but if that fails it chooses the first unused physical block with only matching FROM/TO. FROM/TO is not a unique physical-record key when duplicate/parallel elements exist.

The required change is intentionally narrow: read-only semantic NODENAME recovery may still use a deterministic fallback, but **no fallback may populate Writer1C physical spans, pointer custody, or alias ownership**. Writer authority must require exact block index, exact FROM/TO, canonical 15-row physical cardinality, and complete parsed/physical block coverage.

PR1006 is concurrently active in the Writer1C domain but changes only SIF/TEE qualification/recovery artifacts. It enables zero SIF production writes. PR1007 must not relax any SIF blocker or use PR1006 as mutation authority.

No new implementation validation has run yet. Existing PR1004 qualification remains historical evidence only until re-run against the new HEAD.

## 3. Repository Ground Truth

```text
verified_at: 2026-08-20T16:23+04:00
main: 692be3fd536b7c62576c443f5f831984e4de66a2
PR1007: OPEN / DRAFT / UNMERGED
PR1007 head: 2caeacd2e4ec7bcb27b1e4a3fefabafbe7ff46b5
PR1007 base: main@692be3fd536b7c62576c443f5f831984e4de66a2
changed files: 3 recovery bootstrap files before WIP->PR migration
PR1006: OPEN / READY-FOR-REVIEW metadata / qualification-only
PR1006 head: 096b7ccbaf773ebe7d5df8e23fa6d7eee21a063b
review threads PR1007: not yet observed
checks PR1007: not yet observed
workflow modifications: prohibited by scope
```

## 4. Mission / Scope / Acceptance

Mission: make physical ELEMENT ownership fail closed before Writer1C receives any additional auxiliary-family capability.

In scope:
- exact `parsed element index == physical 15-row block index` plus exact FROM/TO as Writer custody;
- physical block count / parsed element count consistency gate;
- retain read-only semantic recovery separately where deterministic;
- no Writer spans or owners from semantic-only fallback;
- tests for duplicate FROM/TO, wrong parsed index, cardinality mismatch, and canonical non-regression.

Out of scope:
- SIF/TEE mutation or policy relaxation;
- NODENAME create/delete/reindex;
- Writer2/3;
- protected converter changes;
- workflows;
- merge without explicit owner authorization.

Acceptance:
1. canonical TARGET1 remains `physicalCustody.status=QUALIFIED`;
2. exact block identity is mandatory for every Writer owner binding;
3. duplicate FROM/TO cannot be resolved into mutation authority by iteration order;
4. semantic fallback, if used, is explicitly non-writable and produces a physical blocker;
5. existing shared-span canonicalization, unapproved-alias blocking, stale-target and byte anti-drift rules remain unchanged.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Exact Writer block custody | NOT_STARTED | N/A | NOT_RUN | `cii-workspace-nodename.js` | implement |
| Semantic fallback separation | NOT_STARTED | N/A | NOT_RUN | `cii-workspace-nodename.js` | implement |
| Duplicate/index drift regressions | NOT_STARTED | N/A | NOT_RUN | Writer1C tests | implement/run |
| TARGET1 benchmark | EXISTING | EXISTING | HISTORICAL_PASS | benchmark Writer1C test | re-run |
| WIP->PR recovery migration | IN_PROGRESS | N/A | SOURCE_INSPECTION | agents metadata | finish this commit |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-W1C-001 | ISS | HIGH | P0 | OPEN | FROM/TO-only fallback can grant physical custody after exact match failure | merged main source | YES |
| RISK-W1C-001 | RISK | HIGH | P0 | duplicate/parallel ELEMENTs can share FROM/TO but own different pointer rows | fixed-record model semantics | YES |
| DEC-W1C-001 | DEC | HIGH | P0 | tolerant semantic recovery and mutation custody are separate authority layers | Writer1C authority contract | YES |
| IMP-W1C-001 | IMP | HIGH | P0 | require exact index+FROM+TO and full cardinality for Writer spans | planned | YES |
| DEBT-W1C-001 | DEBT | MEDIUM | P2 | repository-wide npm test historical debt remains | PR1004 record | inherited |

## 7. Current Technical Diagnosis

```text
Observed symptom:
matchDescriptor() uses exact block identity first, then FROM/TO-only fallback.

Current hypothesis:
The fallback is useful only as semantic evidence compatibility. If it feeds physicalCustody.byElementIndex/bySpan, Writer1C can attach a node-name span to the wrong physical ELEMENT pointer record when endpoints are duplicated.

Supporting evidence:
main cii-workspace-nodename.js and canonical parser block-index semantics.

Alternative hypothesis:
Current benchmark may have unique endpoints, but qualification cannot rely on fixture uniqueness.

Falsifier:
Two physical 100->200 elements with distinct NODENAME pointers and a deliberately mismatched parsed index. Read-only name extraction may recover evidence, but physical custody must BLOCK and must expose no writable span ownership from the fallback.

Minimal patch implication:
Do not touch patcher/S_auth algorithms; fix custody authority at intake and add regressions.
```

## 8. Authority and Invariants

```text
original TARGET bytes
 -> canonical 15-row physical ELEMENT blocks
 -> exact parsed block index + FROM/TO
 -> exact row13 NODENAME pointer bytes/value
 -> existing NODENAME row
 -> exact FROM/TO field bytes
 -> complete alias owner set
 -> explicit APPLY scope
 -> independent S_auth
```

Invariants: original bytes, line endings, pointer values, row counts, CONTROL, nodes, element connectivity, and independent validator semantics remain unchanged by this PR.

## 9. Current Validation

VAL-1007-001
```text
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: main@692be3fd536b7c62576c443f5f831984e4de66a2
Evidence: merged matchDescriptor fallback
Expected: identify physical authority seam
Actual: FROM/TO-only fallback exists after exact match failure
Limitations: no runtime execution yet
Origin: PREEXISTING
```

All new implementation checks: NOT_RUN.

## 10. Changed-File Ledger

Expected implementation scope:

| File | Intended? | Purpose | Sensitive? | Validation |
|---|---:|---|---:|---|
| `tabs/cii-workspace/cii-workspace-nodename.js` | YES | exact physical custody | YES | pending |
| `tests/cii-workspace-writer1c-byte-custody.test.js` | YES | physical-custody falsifiers | YES | pending |
| `tests/cii-workspace-writer1c-nodename.test.js` | IF NEEDED | planner integration blocker | YES | pending |
| `agents/PR1007_workreport.md` | YES | recovery authority | NO | source inspection |
| `agents/status/PR1007.yaml` | YES | state | NO | source inspection |
| `agents/claims/PR1007.yaml` | YES | coordination | NO | source inspection |
| `agents/MASTER_INDEX.md` | LATER | repo coordination after PR1006 reconciliation | NO | pending |

WIP bootstrap files will be deleted during migration and must not remain in final ledger.

## 11. Review / CI State

PR1007 is draft. Review/check state must be refreshed after implementation commit. No workflow changes authorized.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: PR1007 after migration
CLAIM_RECORD: PR1007 after migration
LAST_OVERLAP_CHECK: 2026-08-20T16:23+04:00
FILE_OVERLAP_WITH_PR1006: none in production/test scope; MASTER_INDEX only if later synchronized
AUTHORITY_OVERLAP: related Writer1C domain; PR1006 qualification-only SIF, PR1007 Phase1 custody hardening
DEPENDENCY_OVERLAP: future Phase2B should inherit PR1007 exact-custody rule
COORDINATION_STATE: COORDINATION_REQUIRED_BUT_SAFE
```

## 13. Continuation State

```text
Start here: tabs/cii-workspace/cii-workspace-nodename.js
Function: matchDescriptor / rawElementDescriptors / extractCiiNodeNameEvidence
Do not redo: byte storage, node-name field layout, alias arbitration, writer patcher, independent S_auth
Do not change: SIF policy, converters, workflows, Writer2/3
Validation required: synthetic duplicate/index-drift cases + existing focused Writer1C + TARGET1 benchmark where executable
Exact next action: introduce exact custody matching and separate semantic fallback without granting spans.
```

## 14. Takeover / Custody Chain

- GE-W1C-HARDEN-001: new WIP grounded on main and PR1006.
- GE-W1C-HARDEN-002: draft PR1007 allocated at head `2caeacd2`; scope unchanged; migration to PR-numbered recovery records initiated.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

```text
PR_HEAD: 2caeacd2e4ec7bcb27b1e4a3fefabafbe7ff46b5
MAIN_HEAD: 692be3fd536b7c62576c443f5f831984e4de66a2
GROUNDING_EPOCH: GE-W1C-HARDEN-002
Generated from: ISS-W1C-001 / RISK-W1C-001
PARTIAL implementation: none
NOT_RUN validation: all new tests
Next intended stage: IMPLEMENT
APPENDIX_A_STATUS: CURRENT
```

A1 Production Trace (20): Trace a Writer1C node-name mutation from parsed element index to exact physical block, row13 pointer, NODENAME span and validator-derived S_auth. Identify each custody boundary.

A2 Current Failure Isolation (20): Build a duplicate-FROM/TO example that defeats uniqueness and show exactly how the current fallback could associate a different pointer row.

A3 Authority / Invariant (20): State why FROM/TO is semantic topology evidence but not sufficient physical-record identity, and enumerate exact writer preconditions.

A4 Independent Validation (20): Design a parseable wrong-association falsifier and explain why preventing unauthorized custody must happen before byte-negative assurance.

A5 Next-Commit / Minimal Patch (20): Identify the smallest exact source and test changes, including how read-only semantic fallback can remain without granting Writer spans.

Engineering-critical takeover threshold: total >=92/100 and every question >=17/20.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- owner instructed coding under Engineering PR Delivery;
- branch created from `main@692be3fd`;
- WIP recovery checkpoint committed at `2caeacd2`;
- draft PR1007 allocated; WIP-to-PR migration started.
