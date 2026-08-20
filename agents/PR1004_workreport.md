# PR1004 — CII Writer 1C Phase-1 NODENAME Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1003
PR_OR_WIP: PR1004
BRANCH: agent/cii-writer-1c
PR_HEAD_OBSERVED: 994934e72069d3f571d6ac7933671efc13d99881
REPORT_BASIS_HEAD: 994934e72069d3f571d6ac7933671efc13d99881
MAIN_HEAD_LAST_CHECKED: 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
MERGE_BASE: stacked base PR1002 head 1dd7a4fc8823c54ef38f5f938167d13076d49c65
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-001 / 2026-08-20T06:24+04:00
CURRENT_TAKEOVER: NOT_APPLICABLE_NEW_FOLLOW_ON
CURRENT_STAGE: BASELINE / IMPLEMENTATION READY
LAST_COMPLETED_STAGE: BOOTSTRAP + COORDINATION + EXPERT GATE
CURRENT_BLOCKER: NONE FOR PHASE-1 CORE
HIGHEST_RISK: false byte authority from text re-encoding or Writer-declared spans
LAST_DURABLE_CHECKPOINT: PR1004 allocated draft with WIP recovery state committed
EXACT_NEXT_ACTION: implement original-byte physical-file custody and NODENAME physical span extraction before any mutation patcher
```

## 2. Handover in 60 Seconds

PR1004 is the implementation follow-on to documentation-only PR1002. It is intentionally stacked on `agent/cii-writer-1c-roadmap` until PR1002 receives owner merge authorization; planned production paths are byte-identical to live main at branch start.

Phase-1 scope is existing TARGET NODENAME COPY only: non-zero existing pointer, same pointer/cardinality, explicit APPLY, exact preimage, shared physical-span arbitration, equal-width byte patch, independently derived byte authorization, structural invariants and expected semantic delta only.

The implementation gate is already resolved in Issue1003 and PR1002 comments. Writer-reported spans are audit testimony, not authority. Original TARGET bytes must be retained at intake; decoded/re-encoded text is insufficient for byte-negative assurance. SIF field 2 remains semantically unqualified and is not writable.

Nothing in production has been changed yet. No Writer1C runtime test has been executed. First code checkpoint is physical-file custody + NODENAME physical ownership only.

## 3. Repository Ground Truth

```text
main: 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PR1002: OPEN / DRAFT / documentation-only / head 1dd7a4fc8823c54ef38f5f938167d13076d49c65
PR1004: OPEN / DRAFT / stacked base PR1002 / head 994934e72069d3f571d6ac7933671efc13d99881 at allocation
Issue1003: OPEN
coordination: SAFE for production paths; PR1002 owns only five documentation/custody paths and explicitly excludes production Writer paths
workflows: no modification authorized
```

## 4. Mission / Scope / Acceptance

Mission: implement Writer 1C Phase-1 existing-row NODENAME COPY without crossing into Writer2.

Approved scope:
- original-byte physical-file custody;
- NODENAME pointer/row/FROM/TO physical custody;
- narrow existing-row COPY policy authority;
- shared physical-span and unselected-alias arbitration;
- equal-width byte patching;
- validator-derived byte authorization;
- structural and semantic negative assurance;
- independent Python oracle;
- explicit Writer1C routing only after core qualification.

Explicit non-goals: SIF/TEE mutation, hanger mutation, NODENAME row create/delete, pointer reindex, CONTROL/cardinality change, topology mutation, workflows, or protected converter changes.

Acceptance requires:
```text
unauthorized changed-byte count = 0
pointer/cardinality/topology drift count = 0
unexpected semantic delta count = 0
independent oracle = PASS
```

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Remaining |
|---|---|---|---|---|
| original-byte custody | NOT_STARTED | NOT_STARTED | NOT_RUN | all |
| NODENAME physical custody | NOT_STARTED | NOT_STARTED | NOT_RUN | all |
| shared-span planner | NOT_STARTED | NOT_STARTED | NOT_RUN | all |
| byte patcher | NOT_STARTED | NOT_STARTED | NOT_RUN | all |
| independent validation | NOT_STARTED | NOT_STARTED | NOT_RUN | all |
| Python oracle | NOT_STARTED | N/A | NOT_RUN | all |
| core/UI Writer1C routing | NOT_STARTED | NOT_STARTED | NOT_RUN | after core qualification |

## 6. Active Engineering Item Register

| ID | Type | Severity | Status | Summary |
|---|---|---|---|---|
| ISS-1C-001 | ISS | HIGH | OPEN | intake currently hashes/operates on decoded text rather than original file bytes |
| ISS-1C-002 | ISS | HIGH | OPEN | NODENAME evidence lacks absolute byte spans and reverse alias ownership |
| ISS-1C-003 | ISS | HIGH | OPEN | existing validator uses Writer mutation reports to define permitted semantic changes |
| ISS-1C-004 | ISS | MEDIUM | OPEN | core/scope routing is binary 1A/1B |
| RISK-1C-001 | RISK | HIGH | OPEN | full-file string reconstruction may normalize bytes/line endings |
| DEC-1C-001 | DEC | HIGH | ACTIVE | validator independently derives authorized spans; Writer reports are testimony only |
| DEC-1C-002 | DEC | HIGH | ACTIVE | Phase-1 is NODENAME-only; SIF field2 remains blocked |
| DEC-1C-003 | DEC | HIGH | ACTIVE | unselected alias semantic effect blocks |

## 7. Current Technical Diagnosis

```text
Observed: no Writer1C exists; NODENAME read custody is string/semantic and current validation trusts Writer mutation descriptions.
Hypothesis: a byte-preserving intake/custody layer must precede the patcher to make anti-drift independent and exact.
Evidence: CII UI uses File.text(); intake SHA uses TextEncoder(decoded text); NODENAME pointer parser tokenizes whitespace; current writer validator derives allowed maps from writerResult.mutations.
Ruled out: parseability-only PASS; raw SIF copy; sequential last-writer-wins shared records.
Falsifier: an authoritative proof that current text path reproduces original bytes/line endings exactly for every qualified CII encoding would remove the need for new byte custody. No such proof is present.
Next experiment: byte scanner with CRLF/LF/CR/no-final-newline exact offsets.
```

## 8. Authority and Invariants

Authoritative chain:
```text
original TARGET bytes
 -> immutable physical custody
 -> production parser semantic model
 -> bound APPLY operation
 -> independently derived authorized span
 -> canonical equal-width patch
 -> independent byte/structure/semantic validation
```

Phase-1 invariants: file byte length, physical line count and exact line-ending sequence, section order, CONTROL, ELEMENT count/15-row cardinality/all pointers, NODENAME/SIF/RESTRANT/RIGID/MISCEL_1 row counts, node IDs/count, element IDs/count/connectivity, and every byte outside authorized NODENAME spans.

## 9. Current Validation

`VAL-1C-GROUND`: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE against live main + PR1002 + Issue1003. Confirms NODENAME existing-row scope and SIF semantic exclusion. Limitation: no runtime execution.

All implementation/runtime/browser/full-suite checks: `NOT_RUN / NOT_OBSERVED`.

## 10. Changed-File Ledger

At PR allocation the implementation diff contains only recovery metadata inherited from WIP migration. No production/test change yet. WIP records must be removed after PR-number records are installed.

## 11. Review / CI State

PR1004 is draft. No reviews/checks executed for Writer1C yet. No workflows will be modified. Never merge without explicit owner authorization.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: main + PR1002 branch
STATUS_RECORD: agents/status/PR1004.yaml
CLAIM_RECORD: agents/claims/PR1004.yaml
FILE_OVERLAP: PR1002 documentation metadata only; production none
AUTHORITY_OVERLAP: PR1002 contract only
DEPENDENCY_OVERLAP: FOLLOW_ON / stacked until PR1002 owner merge
COORDINATION_STATE: SAFE_PRODUCTION / COORDINATED_DOCUMENTATION
```

## 13. Continuation State

```text
Start here: original-byte physical custody
Exact area: new physical-file scanner -> intake -> NODENAME physical custody
Do not redo: Issue1003 expert gate
Do not change: protected converter, SIF/hanger semantics, Writer1A/1B authority, topology
Validation still required: focused JS, independent Python, round-trip anti-drift, product/browser after core
Exact next action: implement byte scanner + NODENAME physical custody and checkpoint before patcher
```

## 14. Custody Chain

`GE-001`: live main, PR1002, Issue1003, open PRs and claims re-grounded; PR1004 created as clean stacked follow-on.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Qualification basis: PR1004 initial head, main `5a5fa0ae`, GE-001, open ISS-1C-001..004/RISK-1C-001. Threshold >=92/100 total and >=17/20 each.

### A1 — Production Trace: NODENAME physical ownership
Trace one TARGET element from exact fixed-field ELEMENT pointer through 1-based NODENAME row to FROM/TO absolute byte span. Require exact row/field indices, widths, offset arithmetic and a falsifier fixture. Whitespace-token location authority is prohibited.

### A2 — Failure Isolation: byte custody
Trace UI file read -> intake hash/parser input and identify earliest loss/reconstruction of original bytes. Predict CRLF/no-final-newline behavior and define a falsifying experiment for the proposed byte layer.

### A3 — Authority/Invariant: shared aliases
For two elements sharing one pointer, derive owner set, physical-span key, identical-collapse condition, conflict blocker, unselected-alias blocker and unchanged invariants. Operation-ID sequential writes are prohibited.

### A4 — Independent Validation
Design the independent span oracle without importing Writer code or trusting `writerResult.mutations`; include the unrelated-SIF-pointer digit falsifier and exact byte-set PASS rule.

### A5 — Minimal Next Commit
Identify the smallest production commit that creates usable physical custody without exposing mutation authority. Require exact files, tests, rollback boundary and prohibited diff. Empty SIF/Writer2 abstractions are prohibited.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- 2026-08-20: Engineering PR Delivery skill read; live re-ground completed; PR1002/Issue1003 byte-authority addenda posted; WIP records created; PR1004 allocated draft.
