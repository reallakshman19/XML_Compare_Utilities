# PR1007 — CII Writer 1C Exact Physical ELEMENT Custody Hardening

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / IMPLEMENTATION COMPLETE / FOCUSED QUALIFICATION PASS / REPOSITORY-WIDE GATES NOT_RUN
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

PR_HEAD_OBSERVED: f0fbcd30bbec133c01531849a3d6032526e7855a
REPORT_BASIS_HEAD: f0fbcd30bbec133c01531849a3d6032526e7855a
MAIN_HEAD_LAST_CHECKED: 692be3fd536b7c62576c443f5f831984e4de66a2
MERGE_BASE: 692be3fd536b7c62576c443f5f831984e4de66a2
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-W1C-HARDEN-003
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: RECONCILE / HANDOVER
LAST_COMPLETED_STAGE: IMPLEMENT + FOCUSED VALIDATE
CURRENT_BLOCKER: exact TARGET1 production benchmark and full repository npm test are NOT_RUN on the current PR head because a complete checkout/fixture set is not available in the execution container
HIGHEST_RISK: repository-wide interaction remains unobserved; exact-custody mechanism itself is covered by direct falsifiers and existing Writer1C round-trip logic
LAST_DURABLE_CHECKPOINT: production/test head f0fbcd30

EXACT_NEXT_ACTION: retain PR1007 as draft; refresh current PR diff/check/review state after recovery-sync commit; when exact repository execution is available run TARGET1 Writer1C benchmark and full npm test without weakening any gate. Do not enable SIF/TEE mutation in this PR and do not merge without explicit owner authorization.
```

## 2. Handover in 60 Seconds

### What is now true

PR1007 closes the audited Phase-1 custody seam. `cii-workspace-nodename.js` no longer lets a FROM/TO-only fallback become physical mutation authority. Writer1C physical ownership now requires:

```text
parsed element index is a safe in-range integer
physical ELEMENT section has canonical 15-row block cardinality
parsed element count == physical block count
physical block at parsed index exists
physical block index == parsed index
physical FROM == parsed FROM
physical TO   == parsed TO
pointer row/field is qualified
```

A deterministic FROM/TO fallback is retained **only** for read-only semantic name evidence. If the fallback is needed, physical custody receives `NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:<elementIndex>` and no `byElementIndex`/`bySpan` mutation custody is created from that fallback.

### What was fixed

The merged PR1004 implementation previously did:

```text
exact index + FROM/TO match
    else
first unused FROM/TO match
```

for the same descriptor that fed physical Writer custody. Duplicate/parallel elements can share FROM/TO but own different NODENAME pointers; therefore selection by iteration order was not sufficient byte-mutation authority.

### What was deliberately not changed

- Writer1C byte patcher;
- independent `S_auth` validator;
- shared-span/alias arbitration;
- transfer policy;
- SIF/TEE semantics or production mutation;
- Writer2/3;
- protected converters;
- workflows.

### What has been proven on this PR

- canonical synthetic exact-index custody remains QUALIFIED;
- swapped parsed index/FROM/TO views remain semantically readable but physically BLOCKED;
- duplicate `100->200` physical elements plus parsed index `9` reproduce the old ambiguity and are physically BLOCKED;
- incomplete parsed/physical block coverage is physically BLOCKED;
- Writer1C planner/readiness reject semantic-only fallback custody;
- existing shared-row canonicalization, redundant FROM/TO atomic mutation, pointer=0 Writer2 blocker, field overflow/non-ASCII blockers, unapproved alias blocker, divergent shared-record blocker and unauthorized-byte falsifier remain PASS in the focused reconstructed suite.

### What is NOT_RUN

- exact `Benchmark/CIICompare/BM_CII_TARGET1.CII` production benchmark on current PR1007 head;
- full repository `npm test`;
- browser/Chromium product lifecycle on current PR1007 head.

Historical PR1004 PASS evidence is not promoted to current-head PASS.

## 3. Repository Ground Truth

```text
verified_at: 2026-08-20T16:35+04:00
repository: reallaksh19/XML_Compare_Utilities
main: 692be3fd536b7c62576c443f5f831984e4de66a2
PR1007: OPEN / DRAFT / MERGEABLE / UNMERGED
PR1007 production/test head: f0fbcd30bbec133c01531849a3d6032526e7855a
PR1007 base: main@692be3fd536b7c62576c443f5f831984e4de66a2
changed files: 6 expected / 6 actual / 0 unexplained
combined commit statuses at f0fbcd30: none present
PR workflow runs at f0fbcd30: none present
review threads: 0
PR1006: OPEN / qualification-only SIF/TEE authority work
PR1006 head last checked: 096b7ccbaf773ebe7d5df8e23fa6d7eee21a063b
workflow changes in PR1007: 0
converter changes in PR1007: 0
SIF transfer/writer changes in PR1007: 0
```

`agents/MASTER_INDEX.md` on main is stale relative to merged PR1004; PR1006 already modifies that shared coordination file. PR1007 intentionally does not edit MASTER_INDEX to avoid a needless active-PR file collision. This report/status/claim record is the durable PR1007 coordination authority until the index is reconciled after PR ordering is known.

## 4. Mission / Scope / Acceptance

Mission: close exact physical ELEMENT ownership before any additional Writer1C auxiliary family is enabled.

Approved scope:
- exact `parsed element index + FROM + TO` physical block custody;
- physical block/cardinality/index completeness gates;
- semantic fallback separation;
- duplicate/index-drift adversarial regressions;
- preserve current Writer1C negative assurance.

Acceptance result:

```text
A1 canonical exact physical custody preserved                      PASS
A2 FROM/TO fallback cannot create physical Writer spans            PASS
A3 duplicate endpoints cannot become order-dependent custody       PASS
A4 parsed/physical cardinality mismatch blocks                     PASS
A5 Writer1C planner/readiness reject semantic-only fallback        PASS
A6 existing focused Writer1C NODENAME safety behaviors preserved   PASS
A7 exact TARGET1 benchmark current head                            NOT_RUN
A8 full npm test current head                                      NOT_RUN
```

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Exact Writer block custody | COMPLETE | ACTIVE | PASS focused | `cii-workspace-nodename.js` | repository-wide execution |
| Semantic fallback separation | COMPLETE | ACTIVE | PASS falsifier | same | none in scope |
| Parsed/physical count/index gates | COMPLETE | ACTIVE | PASS synthetic | same | benchmark execution |
| Duplicate/index-drift regressions | COMPLETE | test suite | PASS local | two Writer1C tests | none in scope |
| TARGET1 benchmark | unchanged test exists | production core | NOT_RUN current head | `cii-workspace-writer1c-benchmark-roundtrip.test.js` | execute when fixture checkout available |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-W1C-001 | ISS | HIGH | P0 | RESOLVED_BY_PR | FROM/TO fallback could feed physical Writer custody | exact gate + regressions | YES |
| RISK-W1C-001 | RISK | HIGH | P0 | MITIGATED | duplicate/parallel endpoint ambiguity | duplicate pointer/index falsifier | YES |
| IMP-W1C-001 | IMP | HIGH | P0 | COMPLETE | exact index+FROM+TO + full block coverage | production source | YES |
| DEC-W1C-001 | DEC | HIGH | P0 | ACTIVE | semantic evidence and mutation custody are distinct authorities | source structure/tests | YES |
| DEBT-W1C-001 | DEBT | MEDIUM | P2 | OPEN | full repository npm test not observed | inherited + current NOT_RUN | inherited/current |
| DEBT-W1C-002 | DEBT | MEDIUM | P1 | OPEN | exact TARGET1 benchmark not rerun on PR1007 | current validation ledger | YES |

## 7. Technical Diagnosis and Final Mechanism

### Before

```javascript
exact parsedIndex + from + to
if not found:
    first unused from + to
```

The returned descriptor then supplied pointer row, NODENAME row, field spans and owner bindings.

### After

```text
exactDescriptor()
    -> only exact physical Writer authority

semanticDescriptor()
    -> exact when available
    -> otherwise deterministic FROM/TO compatibility evidence

fallback used?
    -> semantic names may be populated
    -> physical blocker added
    -> no fallback physical byElementIndex
    -> no fallback physical bySpan / owner claim
```

Additional physical gates:

```text
NODENAME_ELEMENT_BLOCK_ROW_COUNT_NOT_MULTIPLE_OF_15
NODENAME_ELEMENT_BLOCK_HEADER_UNQUALIFIED:<block>
NODENAME_ELEMENT_BLOCK_COUNT_MISMATCH:<parsed>:<physical>
NODENAME_ELEMENT_PARSED_INDEX_OUT_OF_RANGE:<index>
NODENAME_ELEMENT_PARSED_INDEX_DUPLICATE:<index>
NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:<element>
```

The Writer planner already requires `physicalCustody.status === QUALIFIED`, so no lower-layer relaxation was needed.

## 8. Authority and Invariants

Authoritative mutation chain after PR1007:

```text
original TARGET bytes
 -> canonical physical 15-row ELEMENT block array
 -> exact parsed element.index == physical blockIndex
 -> exact FROM/TO identity at that same index
 -> exact row13 NODENAME pointer field
 -> existing pointer-bound NODENAME row
 -> exact fixed FROM/TO byte span
 -> complete physical owner set
 -> explicit APPLY scope
 -> Writer1C planner/arbitration
 -> equal-width original-byte patch
 -> independent validator-derived S_auth
```

Invariant preserved: read-only semantic compatibility must never silently promote itself into physical Writer authority.

## 9. Current Validation

### VAL-1007-001 — source audit / defect confirmation

```text
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: main@692be3fd536b7c62576c443f5f831984e4de66a2
Expected: determine whether physical mapping had a non-exact fallback
Actual: exact match was followed by FROM/TO-only fallback
Origin: PREEXISTING
```

### VAL-1007-002 — exact-custody focused test

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Tested implementation: PR1007 production blob at a3340a1/f0fbcd30; cleanup changes test assertions only
Command: node /tmp/pr1007test/tests/cii-workspace-writer1c-byte-custody.test.js
Expected: exact canonical custody qualifies; swapped, duplicate-index and partial-cardinality cases block physical custody; semantic evidence survives where non-conflicting
Actual: PASS
Output: Writer 1C byte custody, exact ELEMENT identity, semantic fallback isolation and shared NODENAME ownership checks passed.
Limitations: focused reconstruction of exact production modules, not a complete repository checkout
Origin: RESOLVED_BY_PR
```

### VAL-1007-003 — Writer1C planner + NODENAME regression

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node /tmp/pr1007test/tests/cii-workspace-writer1c-nodename.test.js
Expected: semantic-only fallback blocks planner/readiness while inherited Writer1C NODENAME behaviors remain green
Actual: PASS
Output: Writer 1C NODENAME planner, exact block custody, redundant FROM/TO ownership, patcher and independent negative-assurance checks passed.
Limitations: focused reconstructed module tree
Origin: RESOLVED_BY_PR / NON_REGRESSION
```

### VAL-1007-004 — direct planner falsifier

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Command: node /tmp/pr1007test/tests/planner-falsifier.mjs
Expected: target document requiring semantic fallback cannot become Writer1C READY
Actual: PASS; `Writer1C planner correctly rejects semantic-only block fallback.`
Origin: RESOLVED_BY_PR
```

### VAL-1007-005 — old algorithm ambiguity reproduction

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Case: two physical 100->200 descriptors with pointers 1 and 2; parsed element index 9
Expected old behavior: FROM/TO fallback selects one record by order
Expected hardened behavior: exact custody returns no descriptor and blocks
Actual: old fallback selected pointer 1; hardened exact custody rejected parsed index 9
Origin: RESOLVED_BY_PR
```

### VAL-1007-006 — TARGET1 exact production benchmark

```text
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: existing benchmark test / production parser
Current head applicability: REQUIRED
Reason: complete exact benchmark checkout was not available in execution container
Historical evidence: PR1004 ran TARGET1 successfully; historical only, not relabeled PASS here
```

### VAL-1007-007 — full repository regression

```text
Status: NOT_RUN
Observation: NOT_OBSERVED
Command: npm test
Reason: complete repository checkout unavailable in execution runtime
No workflow was added or changed to manufacture evidence.
```

### VAL-1007-008 — GitHub CI / reviews

```text
Status: NOT_RUN / NOT_PRESENT
Observation: REMOTE_SOURCE_INSPECTION
Head: f0fbcd30bbec133c01531849a3d6032526e7855a
Combined statuses: none present
PR workflow runs: none present
Review threads: 0
```

## 10. Changed-File Ledger

Reconciled against GitHub PR file list at production/test head:

| File | Intended? | Purpose | Sensitive? | Validation |
|---|---:|---|---:|---|
| `agents/PR1007_workreport.md` | YES | recovery authority | NO | current sync |
| `agents/status/PR1007.yaml` | YES | machine-readable state | NO | current sync |
| `agents/claims/PR1007.yaml` | YES | multi-agent claim | NO | current sync |
| `tabs/cii-workspace/cii-workspace-nodename.js` | YES | exact physical custody | YES | focused PASS |
| `tests/cii-workspace-writer1c-byte-custody.test.js` | YES | custody falsifiers | YES | PASS |
| `tests/cii-workspace-writer1c-nodename.test.js` | YES | planner/non-regression | YES | PASS |

```text
expected: 6
actual:   6
unexplained: 0
workflow files: 0
protected converter files: 0
SIF writer/policy files: 0
```

## 11. Review / CI State

```text
PR: 1007
state: OPEN
review state: DRAFT
mergeable at last refresh: true
reviews/threads: none
combined statuses: none
PR workflow runs: none
merge authority: OWNER_ONLY
```

Absence of checks is not PASS.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
MASTER_INDEX_MUTATION: DEFERRED to avoid active exact-file collision with PR1006
STATUS_RECORD: agents/status/PR1007.yaml
CLAIM_RECORD: agents/claims/PR1007.yaml
LAST_OVERLAP_CHECK: 2026-08-20T16:35+04:00
FILE_OVERLAP_WITH_PR1006: NONE in production/test/recovery except MASTER_INDEX would overlap, so PR1007 does not touch it
AUTHORITY_OVERLAP: broader Writer1C domain only
DEPENDENCY_OVERLAP: future SIF Phase2B should inherit PR1007 exact physical-custody rule
COORDINATION_STATE: COORDINATION_REQUIRED_BUT_SAFE
```

## 13. Continuation State

```text
Start here: tabs/cii-workspace/cii-workspace-nodename.js
Current implementation: exactDescriptor + semanticDescriptor separation and physical blockers
Do not redo: original-byte layer, shared-span arbitration, patcher, independent S_auth
Do not change in this PR: SIF transfer policy, SIF writer, converters, workflows, Writer2/3
Validation still required: exact TARGET1 benchmark and full npm test when execution environment permits
Highest-risk remaining item: integration regression outside focused modules, not a known custody defect
Exact next action: refresh PR head after recovery-only sync; keep draft pending owner direction and/or current-head full validation. No merge authority.
```

## 14. Takeover / Custody Chain

- GE-W1C-HARDEN-001: new WIP grounded on `main@692be3fd` and active PR1006.
- GE-W1C-HARDEN-002: draft PR1007 allocated; WIP records migrated.
- GE-W1C-HARDEN-003: implementation at `a3340a1`, assertion cleanup at `f0fbcd30`, six-file diff and remote check/review state reconciled; focused validation PASS, full/benchmark gates retained NOT_RUN.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Qualification basis:

```text
PR_HEAD: f0fbcd30bbec133c01531849a3d6032526e7855a
MAIN_HEAD: 692be3fd536b7c62576c443f5f831984e4de66a2
GROUNDING_EPOCH: GE-W1C-HARDEN-003
Generated from: DEBT-W1C-001 / DEBT-W1C-002 and future integration risk
PARTIAL implementation: none in approved mechanism
NOT_RUN validation: TARGET1 current-head benchmark; full npm test; browser
Next intended stage: current-head integration validation / owner review
APPENDIX_A_STATUS: CURRENT
```

A1 Production Trace (20): Trace the current PR1007 Writer1C node-name path from `parsed.elements[n].index` through `exactDescriptor()`, row13 pointer, `physicalCustody.bySpan`, planner claim arbitration and validator `S_auth`. Identify where a semantic fallback is intentionally stopped from gaining mutation authority.

A2 Current Failure Isolation (20): Using two physical elements with identical `FROM=100, TO=200` but different NODENAME pointers, explain the pre-PR ambiguity, the new blockers for an invalid parsed index, and why `physicalCustody.status=BLOCKED` is necessary even if the semantic names are mutually consistent.

A3 Authority / Invariant (20): Enumerate the complete exact physical custody invariants now required by PR1007 and explain why FROM/TO is topology evidence but not a unique fixed-record identity.

A4 Independent Validation (20): Reproduce a case that the old fallback accepts by iteration order but `exactDescriptor()` rejects. Then explain which current tests prove semantic-read compatibility, physical fail-closed behavior, and downstream planner rejection independently of Writer-reported mutation spans.

A5 Next-Commit / Minimal Patch (20): If TARGET1 current-head execution exposes a regression, identify how to classify `PREEXISTING` vs `INTRODUCED_BY_PR` without weakening exact custody, and list the production files that remain out of scope.

Engineering-critical takeover threshold: total >=92/100 and every question >=17/20.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log

- BOOTSTRAP: owner authorized coding under Engineering PR Delivery.
- PR1007 allocated draft before production mutation.
- IMPLEMENT: exact physical custody separated from semantic fallback.
- VALIDATE: synthetic exact/duplicate/index/cardinality and planner/round-trip focused tests PASS.
- RECONCILE: six intended files, zero unexplained; no workflows/checks/review threads; exact benchmark/full repository tests remain NOT_RUN.
