# PR999 — CII Compare Review / Delta / Transfer clarity

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_REVIEW
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE_FOCUSED_PRESENTATION_PASS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_UI_PRESENTATION
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — Compare Review / Engineering Delta / Transfer Preview clarity
PR: 999
BRANCH: agent/cii-review-transfer-clarity
BASE: main@7d63abe83a2fe4307ea518986683d823926d281c
PREDECESSORS: PR997 merged a2b8b055; PR998 merged 7d63abe8
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: VALIDATE / RECONCILE
GROUNDING_EPOCH: GE-001 / 2026-08-19
APPENDIX_A_STATUS: PASS_FOR_CURRENT_INCREMENT
CURRENT_BLOCKER: COMPLETE-CHECKOUT SHELL/BROWSER/FULL-SUITE EXECUTION NOT_RUN_ENVIRONMENT
EXACT_NEXT_ACTION: reconcile final head/diff/checks; owner review; do not merge without explicit authorization
```

## Handover in 60 Seconds

PR997/998 made Method A/B evidence visible and wired engineer-selected independent bases into `baseLoops[]`. PR999 addresses the next presentation defect only: the underlying engineering delta and transfer contracts were correct, but the shell rendered structured values through generic JSON stringification and did not distinguish a SOURCE proposal from what TARGET would actually contain after an approved Writer operation.

PR999 adds a read-only presentation layer:

```text
engineering delta
   |
   +-- SOURCE candidate
   +-- Current TARGET
   +-- Effective TARGET after apply
              |
              +-- pending/rejected -> current TARGET
              +-- approval not rebound -> current TARGET / REBUILD PREVIEW
              +-- no qualified operation -> current TARGET
              +-- KEEP/PROTECTED/BLOCKED -> current TARGET
              +-- PREVIEW_READY + Writer blocked -> current TARGET + proposal
              +-- PREVIEW_READY + Writer ready -> proposed value / WILL APPLY
```

No Writer readiness, transfer classification, delta calculation, correspondence, Method A/B, parser, converter, or mutation rule is changed.

---

# 1. Live ground truth at grounding

```text
main: 7d63abe83a2fe4307ea518986683d823926d281c
PR997: MERGED by squash -> a2b8b055e858d0cc324257de1c51a21e75ca5205
PR998: normalized after squash ancestry, then MERGED by squash -> 7d63abe83a2fe4307ea518986683d823926d281c
PR999: open / draft / unmerged
PR999 initial head: 9146420ef6426c2239464da939d4f85ef8880e94
initial production/test diff: 3 files, 0 behind main
coordination: no overlapping active CII review/delta branch discovered
```

Live GitHub state overrides this snapshot.

---

# 2. Mission and acceptance

## Mission

Make Compare Review, Engineering Delta and Transfer Preview readable and authority-correct for an engineer without changing any engineering or Writer authority.

## Acceptance result

| Requirement | Result |
|---|---|
| Structured engineering values are human-readable | IMPLEMENTED |
| No raw JSON object dump in Delta/Transfer presentation | IMPLEMENTED |
| Delta Grid distinguishes SOURCE candidate / Current TARGET / Effective TARGET | IMPLEMENTED |
| Transfer Preview distinguishes SOURCE candidate / Current TARGET / Effective TARGET | IMPLEMENTED |
| Pending decision cannot look applied | IMPLEMENTED |
| Local approval not rebound to transfer plan cannot look applied | IMPLEMENTED (`REBUILD PREVIEW`) |
| Protected/blocked operation keeps current TARGET effective | IMPLEMENTED |
| PREVIEW_READY row with overall Writer blocker keeps current TARGET effective | IMPLEMENTED |
| Effective TARGET changes only when row is PREVIEW_READY and Writer 1B is ready | IMPLEMENTED |
| Writer/transfer/delta authority unchanged | VERIFIED BY DIFF/SOURCE REVIEW |
| APPLY/EXCLUDE transfer-scope authority | OUT OF SCOPE / NEXT SEPARATE SLICE |

---

# 3. Root cause and falsifier

## ISS-999-01 — generic stringification obscured engineering meaning

`cii-workspace-shell.js` used generic `stableStringify()` for object-valued engineering data. Valid values such as XYZ coordinates, direction-cosine records and restraint records were technically present but visually presented as JSON-like serialization rather than engineering information.

## ISS-999-02 — proposal and effective TARGET were conflated in presentation

The Transfer Plan already contains `before`, `proposed`, `status`, `blockers`, `engineeringDeltaId` and `matchAuthority`. The UI showed `Target before` and `Proposed target`, but did not state whether the proposal would actually be applied under current Writer readiness.

### Falsifier

The fix fails if any of these are possible:

```text
Writer blocked
  -> UI shows proposed SOURCE value as effective TARGET

operation PROTECTED/BLOCKED
  -> UI shows proposed value as effective TARGET

live Accept decision not rebound through Transfer Preview
  -> UI shows proposed value as effective TARGET

structured XYZ/restraint value
  -> primary Delta/Transfer UI dumps JSON
```

Focused regression covers all four boundaries.

---

# 4. Production implementation

## 4.1 `cii-workspace-review-presentation.js`

New read-only presentation module.

### Human-readable value formatting

- numbers retain engineering precision without unnecessary trailing zeros;
- XYZ: `X ... · Y ... · Z ...`;
- element vector: `ΔX ... · ΔY ... · ΔZ ...`;
- numeric arrays: comma-delimited engineering set/list;
- structured records: labelled field groups rather than JSON;
- boolean: YES/NO;
- nested depth is bounded.

### Effective TARGET derivation

The module does not invent transfer authority. It consumes the existing bound review ledger, `transferPlan.operations[]`, operation status/blockers and overall `writerReadiness.ready`.

```text
PENDING / REJECTED                  -> current TARGET
approved UI decision but unbound    -> current TARGET / REBUILD PREVIEW
bound approval, no operation        -> current TARGET / NO QUALIFIED OPERATION
KEEP                                -> current TARGET
PROTECTED                           -> current TARGET
BLOCKED                             -> current TARGET
PREVIEW_READY + writer blocked      -> current TARGET / proposal separately visible
PREVIEW_READY + writer ready        -> proposed value / WILL APPLY
```

Numeric delta sign is explicitly labelled `TARGET − SOURCE`, matching `numberDelta()` in the engineering-delta authority.

## 4.2 `cii-workspace-shell.js`

The existing shell remains the workflow owner. It imports the read-only presentation functions and delegates:

- correspondence inspector engineering changes;
- Engineering Delta Grid;
- Transfer Preview table.

No decision handler, review ledger, transfer plan, Writer apply handler, base-loop input, or mutation function is changed.

---

# 5. Protected authority / negative assurance

Explicitly unchanged:

```text
tabs/cii-workspace/cii-workspace-geometry.js
tabs/cii-workspace/cii-workspace-pipe-runs.js
tabs/cii-workspace/cii-workspace-anchor-method-a.js
tabs/cii-workspace/cii-workspace-anchor-suggestions.js
tabs/cii-workspace/cii-workspace-multi-base-anchor.js
tabs/cii-workspace/cii-workspace-multi-base-correspondence.js
tabs/cii-workspace/cii-workspace-correspondence-arbitration.js
tabs/cii-workspace/cii-workspace-engineering-delta.js
tabs/cii-workspace/cii-workspace-transfer-policy.js
tabs/cii-workspace/cii-workspace-transfer-plan.js
tabs/cii-workspace/cii-workspace-target-writer.js
tabs/cii-workspace/cii-workspace-target-writer-1b.js
fixed-field parser
protected 3D_Converters core writer
GitHub workflows
```

PR999 does not add per-delta APPLY/EXCLUDE authority. That is a separate product/authority slice.

---

# 6. Validation ledger

| Check | Status | Observation | Oracle / Evidence |
|---|---|---|---|
| presentation module syntax | PASS | LOCAL_EXECUTION | Node `--check` |
| focused presentation regression | PASS | LOCAL_EXECUTION | exact GitHub blob hashes verified |
| module Git blob custody | PASS | ARTIFACT_INSPECTION | `525798bfda60c6c2ab85719d507524e7b679ac16` |
| test Git blob custody | PASS | ARTIFACT_INSPECTION | `5c95a0e18a2a90d3c16801b90ce197dc3282d6b3` |
| initial changed-file authority boundary | PASS | GIT_COMPARE | exactly 3 production/test files; 0 behind main |
| modified shell integration | PASS | SOURCE_INSPECTION | presentation delegation only; existing workflow/apply handlers retained |
| full shell lifecycle | NOT_RUN | NOT_OBSERVED | complete checkout unavailable in current runtime |
| SOURCE 3 / TARGET 3-1 browser workflow | NOT_RUN | NOT_OBSERVED | browser/complete checkout unavailable |
| Chromium full-screen UX | NOT_RUN | NOT_OBSERVED | browser unavailable |
| full repository suite | NOT_RUN | NOT_OBSERVED | complete checkout unavailable |

Focused test proves:

- XYZ/list/structured record output is not JSON;
- bound READY COPY + Writer ready => `WILL APPLY`;
- Writer blocked => effective TARGET remains current;
- PROTECTED => effective TARGET remains current;
- PENDING => effective TARGET remains current;
- approval not rebound => `REBUILD PREVIEW`;
- Delta Grid contains SOURCE/current/effective columns;
- Transfer Preview contains SOURCE/current/effective columns;
- evidence authority remains visible.

No NOT_RUN check is represented as PASS.

---

# 7. Changed-file ledger

Expected implementation files:

```text
tabs/cii-workspace/cii-workspace-review-presentation.js
tabs/cii-workspace/cii-workspace-shell.js
tests/cii-workspace-review-presentation.test.js
```

Custody files to be present at handover:

```text
agents/PR999_workreport.md
agents/status/PR999.yaml
agents/claims/PR999.yaml
agents/MASTER_INDEX.md
```

Final reconciliation target: **7 expected / 7 actual / 0 unexplained**.

---

# 8. Risks / decisions / debt

## DEC-999-01 — effective TARGET is conservative

A proposal becomes the displayed effective value only when the operation is `PREVIEW_READY` and overall Writer 1B readiness is true. This prevents a partially qualified plan from visually implying a partial mutation that the Writer will not execute.

## DEC-999-02 — live approval does not rewrite bound plan presentation

Changing a correspondence decision updates the Delta Grid approval label immediately, but the existing Transfer Preview is still bound to the old review ledger until the engineer clicks `Apply approvals to Transfer Preview`. The effective-value column therefore reports `REBUILD PREVIEW` and keeps current TARGET effective.

## RISK-999-01 — full browser layout not executed

Wide engineering tables can have browser-specific layout issues. Chromium remains a validation gate, not a claimed PASS.

## DEBT-999-01 — per-delta APPLY/EXCLUDE is intentionally deferred

The next authority slice may allow engineers to include/exclude individual approved transfer operations. That requires explicit selection custody in the transfer plan and Writer readiness; it must not be implemented as UI-only filtering.

---

# 9. Exact continuation state

If continuing PR999:

1. re-fetch live `main`, PR999 head, diff, checks, reviews and threads;
2. verify `agents/MASTER_INDEX.md` and the 7-file ledger;
3. execute focused/full shell/browser suites if a complete checkout/runtime becomes available;
4. do not weaken Writer readiness because of presentation expectations;
5. do not add APPLY/EXCLUDE authority to PR999;
6. do not merge without explicit owner authorization.

If PR999 is later merged, the recommended next coherent increment is a separate transfer-scope PR where selected approved deltas/operations have explicit APPLY/EXCLUDE custody before Writer readiness.

---

# Appendix A — implementation takeover qualification

A takeover agent must answer repository-specifically before changing engineering-critical production behavior.

### A1 — Production Trace — 20 marks
Trace one changed `engineeringDeltaId` from `engineeringDeltas.changedRows` through `transferPlan.operations` into the PR999 effective-TARGET cell. Identify the exact modules and fields used, and explain why live UI approval alone is insufficient.

### A2 — Failure Isolation — 20 marks
Construct a case where an operation is `PREVIEW_READY` but Writer 1B overall readiness is blocked by another selected operation. State what PR999 must display for the first row and provide a falsifier for an unsafe implementation.

### A3 — Authority / Invariant — 20 marks
Identify the exact production modules that own delta calculation, transfer classification and Writer readiness. Explain why PR999 must not modify any of them to make a presentation test pass.

### A4 — Independent Validation — 20 marks
Using a synthetic P1 example with SOURCE=10 and TARGET=20, show the correct signed engineering delta and effective TARGET for: pending approval, bound ready Writer, protected operation, and Writer-blocked plan.

### A5 — Minimal Next Commit — 20 marks
If a browser test exposes poor rendering for a direction-cosine set, identify the smallest safe presentation-only change, the files it should touch, and the negative-assurance checks required.

Qualification threshold for new engineering-critical implementation authority: total >=92/100 and every question >=17/20. Generic answers without repository anchors fail the gate.
