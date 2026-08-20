# WIP-CII-W1C-EXACT-CUSTODY-20260820 — Writer 1C exact ELEMENT custody hardening

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / NEW IMPLEMENTATION WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: owner instruction 2026-08-20 following Writer 1C audit
PR_OR_WIP: WIP-CII-W1C-EXACT-CUSTODY-20260820
BRANCH: agent/cii-writer1c-exact-custody-hardening

PR_HEAD_OBSERVED: N/A
REPORT_BASIS_HEAD: 692be3fd536b7c62576c443f5f831984e4de66a2
MAIN_HEAD_LAST_CHECKED: 692be3fd536b7c62576c443f5f831984e4de66a2
MERGE_BASE: 692be3fd536b7c62576c443f5f831984e4de66a2
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-W1C-HARDEN-001
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: BASELINE / PLAN
LAST_COMPLETED_STAGE: LIVE GROUNDING + COORDINATION CHECK
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Writer1C NODENAME physical custody currently permits a FROM/TO-only fallback after exact parsed-index matching fails; duplicate/parallel elements could bind mutation authority to the wrong physical ELEMENT block.
LAST_DURABLE_CHECKPOINT: branch created from current main

EXACT_NEXT_ACTION: implement exact physical ELEMENT-block custody in cii-workspace-nodename.js, preserve tolerant semantic evidence separately, add adversarial duplicate/index-drift tests, then execute focused qualification available in the runtime.
```

## 2. Handover in 60 Seconds

### What is now true

Merged PR1004 implements original-byte Writer1C NODENAME mutation with independent byte-negative assurance. Audit found one remaining physical-custody seam: `matchDescriptor()` first matches parsed element index + FROM/TO, then falls back to the first unused physical block with the same FROM/TO. That fallback is acceptable only for read-only semantic recovery, not mutation authority.

### What is currently being worked on

Make Writer1C custody fail closed unless every parsed element used for mutation maps to the same canonical 15-row physical block index and the same FROM/TO identity.

### What remains unfinished

Production patch, adversarial tests, focused execution, PR allocation/recovery-file migration, changed-file reconciliation, review/check refresh.

### What has been proven

Current main source inspection proves the fallback exists. Current physical scanner already retains absolute bytes and 15-row ELEMENT rows; no new parser abstraction is required.

### What has NOT been proven / NOT_RUN

No new test has executed yet. Repository-wide `npm test` is NOT_RUN for this WIP. No claim is made about SIF/TEE production readiness.

### What must not be assumed

PR1006 semantic qualification does not authorize SIF mutation. FROM/TO equality alone is not unique physical ELEMENT identity.

### Highest-risk remaining item

Accidentally breaking tolerant read-only NODENAME evidence while hardening Writer custody, or allowing exact-custody status to remain QUALIFIED when parsed and physical element cardinality/index identity diverge.

### Exact next action

Patch `tabs/cii-workspace/cii-workspace-nodename.js` and extend `tests/cii-workspace-writer1c-byte-custody.test.js` / `tests/cii-workspace-writer1c-nodename.test.js` with duplicate-element and index-drift falsifiers.

## 3. Repository Ground Truth

```text
verified_at: 2026-08-20T16:19+04:00
repository: reallaksh19/XML_Compare_Utilities
default_branch: main
main: 692be3fd536b7c62576c443f5f831984e4de66a2
branch: agent/cii-writer1c-exact-custody-hardening
branch_base: 692be3fd536b7c62576c443f5f831984e4de66a2
open_related_pr: PR1006
PR1006_head: 096b7ccbaf773ebe7d5df8e23fa6d7eee21a063b
PR1006_scope: SIF/TEE qualification-only, no production Writer files
coordination: COORDINATION_REQUIRED_BUT_SAFE
workflow_changes_authorized: NO
merge_authority: OWNER_ONLY
```

`agents/MASTER_INDEX.md` on main is stale relative to merged PR1004; PR1006 updates it on its branch. This WIP avoids depending on that stale state and records live GitHub truth here.

## 4. Mission / Scope / Acceptance

Mission: close the exact physical ELEMENT-custody gap before any additional Writer1C auxiliary family is enabled.

Approved scope:
- exact parsed-index -> physical 15-row ELEMENT block custody for Writer1C NODENAME;
- preserve read-only semantic NODENAME recovery separately when exact custody cannot be proven;
- block Writer1C physical custody on block-count/index/FROM/TO mismatch;
- adversarial regressions for duplicate FROM/TO elements and deliberately shifted parsed indices;
- no whole-file reserialization.

Explicit non-goals:
- no SIF/TEE writer;
- no SIF transfer-policy relaxation;
- no Writer2/3;
- no NODENAME pointer/cardinality creation;
- no parser numeric semantics change;
- no protected converter change;
- no workflow change;
- no merge without owner authorization.

Acceptance:
1. canonical current TARGET1 custody remains QUALIFIED;
2. exact physical block mapping uses index+FROM+TO only for Writer authority;
3. FROM/TO-only fallback cannot create Writer spans/owners;
4. duplicate/parallel FROM/TO + index drift fails physical custody;
5. semantic name evidence may remain recoverable without granting Writer authority;
6. existing shared-span, redundant FROM/TO, stale-target and anti-drift behavior remains intact.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Exact block custody | NOT_STARTED | N/A | NOT_RUN | `cii-workspace-nodename.js` | implement |
| Semantic fallback separation | NOT_STARTED | N/A | NOT_RUN | `cii-workspace-nodename.js` | implement |
| Duplicate/index-drift falsifier | NOT_STARTED | N/A | NOT_RUN | Writer1C tests | author/execute |
| Canonical benchmark non-regression | EXISTING | EXISTING | HISTORICAL_PASS_ONLY | TARGET1 Writer1C tests | re-run on new HEAD |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-W1C-001 | ISS | HIGH | P0 | OPEN | Physical custody falls back from exact index+FROM/TO to FROM/TO-only | source inspection `matchDescriptor()` | YES |
| RISK-W1C-001 | RISK | HIGH | P0 | Duplicate/parallel elements can make FROM/TO non-unique | fixed-record topology semantics | YES |
| DEC-W1C-001 | DEC | HIGH | P0 | Tolerant semantic recovery and mutation physical authority must be separate | Writer1C authority contract | YES |
| DEBT-W1C-001 | DEBT | MEDIUM | P2 | full repository `npm test` remains historical debt from PR1004 | PR1004 durable record | inherited |
| QST-W1C-001 | QST | MEDIUM | P1 | whether any legacy noncanonical ELEMENT fixture relies on semantic fallback | not yet executed | YES |

## 7. Current Technical Diagnosis

```text
Observed symptom:
matchDescriptor(element, descriptors, used) first uses exact parsed index+FROM+TO, then searches the first unused descriptor with only matching FROM+TO.

Current hypothesis:
The fallback can preserve read-only names, but it is too weak for byte-mutation custody because duplicate physical elements can share FROM/TO while owning different pointer rows.

Supporting evidence:
cii-workspace-nodename.js source on main; parser element identity is block-index based for canonical 15-row records.

Alternative hypotheses:
FROM/TO may be globally unique in current benchmark corpus, but Writer authority must be format-safe rather than fixture-dependent.

Already ruled out:
No need to change Writer patcher or independent S_auth algorithm if custody itself is made exact.

Falsifier:
Construct two physical ELEMENT blocks with the same FROM/TO but different NODENAME pointers, then supply parsed element indices that do not exactly correspond. Writer physical custody must BLOCK rather than select the first matching FROM/TO block.

Next isolating experiment:
Add synthetic duplicate/index-drift test and verify canonical exact-index fixture remains QUALIFIED.
```

## 8. Authority and Invariants

Authority chain:

```text
original TARGET bytes
 -> canonical 15-row ELEMENT physical blocks
 -> exact parsed element index + FROM/TO identity
 -> ELEMENT row13 pointer bytes/value
 -> existing NODENAME row
 -> exact FROM/TO byte field
 -> complete owner set
 -> explicit APPLY
 -> independently derived S_auth
```

Invariants:
- no FROM/TO-only mapping may grant Writer physical custody;
- pointer value/index unchanged;
- NODENAME row count unchanged;
- CONTROL unchanged;
- line endings/byte length unchanged;
- node/element/connectivity unchanged;
- existing anti-drift validator remains authoritative.

## 9. Current Validation

VAL-HARDEN-001
```text
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: main@692be3fd536b7c62576c443f5f831984e4de66a2
Evidence: cii-workspace-nodename.js current matchDescriptor fallback
Expected: identify unsafe authority seam
Actual: exact match is followed by FROM/TO-only fallback
Limitations: source inspection only
Origin: PREEXISTING
```

All implementation validations: NOT_RUN.

## 10. Changed-File Ledger

Planned:

| File | Intended? | First stage | Latest stage | Purpose | Sensitive? | Validation |
|---|---:|---|---|---|---:|---|
| `tabs/cii-workspace/cii-workspace-nodename.js` | YES | IMPLEMENT | IMPLEMENT | exact physical custody | YES | pending |
| `tests/cii-workspace-writer1c-byte-custody.test.js` | YES | VALIDATE | VALIDATE | exact-custody falsifier | YES | pending |
| `tests/cii-workspace-writer1c-nodename.test.js` | MAYBE | VALIDATE | VALIDATE | planner fail-closed integration | YES | pending |
| recovery metadata | YES | BOOTSTRAP | HANDOVER | durable continuity | NO | current |

## 11. Review / CI State

No PR allocated yet. No checks applicable yet. No workflow modification authorized.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES, main snapshot stale for PR1004; PR1006 branch has active update
STATUS_RECORD: this WIP to be created
CLAIM_RECORD: this WIP to be created
LAST_OVERLAP_CHECK: 2026-08-20T16:19+04:00
FILE_OVERLAP: no intended production/test overlap with PR1006; recovery MASTER_INDEX may later overlap
AUTHORITY_OVERLAP: Writer1C domain shared; PR1006 is qualification-only SIF authority, this WIP is Phase1 NODENAME custody hardening
DEPENDENCY_OVERLAP: future SIF Writer should depend on this hardening
COORDINATION_STATE: COORDINATION_REQUIRED_BUT_SAFE
```

## 13. Continuation State

```text
Start here: tabs/cii-workspace/cii-workspace-nodename.js
Exact function: matchDescriptor / extractCiiNodeNameEvidence
Current value/path under investigation: fallback matching by FROM/TO only
Do not redo: original-byte storage, alias arbitration, independent S_auth, Writer patcher
Do not change: SIF transfer policy, converters, workflows, Writer2/3
Validation still required: synthetic exact-custody falsifiers + canonical benchmark non-regression
Highest-risk remaining item: preserving semantic recovery without granting physical mutation authority
Exact next action: implement exactDescriptor and semanticFallbackDescriptor separation, with blockers tied only to Writer custody.
```

## 14. Takeover / Custody Chain

GE-W1C-HARDEN-001: live main and PR1006 re-grounded before modification. No takeover; new owner-authorized WIP.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Qualification basis:

```text
PR_HEAD: N/A
MAIN_HEAD: 692be3fd536b7c62576c443f5f831984e4de66a2
GROUNDING_EPOCH: GE-W1C-HARDEN-001
Generated from: ISS-W1C-001, RISK-W1C-001, QST-W1C-001
PARTIAL implementation: none yet
NOT_RUN validation: all new hardening tests
Next intended stage: IMPLEMENT
APPENDIX_A_STATUS: CURRENT
```

A1 Production Trace (20): Trace a canonical TARGET NODENAME mutation from parsed element index through physical ELEMENT row13 pointer bytes to the exact NODENAME field and independent `S_auth`; identify which object owns each boundary.

A2 Current Failure Isolation (20): Construct a concrete duplicate-FROM/TO case where the existing fallback can bind the wrong block; predict pointer/row effects and the exact condition that must block Writer custody while allowing read-only semantic evidence if possible.

A3 Authority / Invariant (20): Explain why FROM/TO equality is insufficient physical identity for Writer1C and list the minimum exact block, pointer, byte-span, cardinality, and alias invariants required before mutation.

A4 Independent Validation (20): Design a falsifier that would still parse successfully after a wrong physical association and explain how custody qualification plus existing byte-negative assurance detects or prevents it without trusting Writer-reported spans.

A5 Next-Commit / Minimal Patch (20): Identify the smallest source/test changes needed to separate semantic fallback from Writer custody, with explicit statements of files that must not change.

Threshold for engineering-critical takeover: >=92/100 and every question >=17/20.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log

- BOOTSTRAP: owner requested coding under Engineering PR Delivery.
- GE-W1C-HARDEN-001: main@692be3fd and PR1006 qualification-only overlap re-grounded.
