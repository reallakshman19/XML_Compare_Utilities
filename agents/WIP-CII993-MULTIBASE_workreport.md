# WIP-CII993-MULTIBASE — CII independent multi-base Method A/B core

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY_FOR_TAKEOVER
PR_RECOVERY_STATE: NEW_PR_REQUIRED / BRANCH_INITIALIZED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: NOT_APPLICABLE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993
PR_OR_WIP: WIP-CII993-MULTIBASE
BRANCH: agent/cii-multi-base-core
PR_HEAD_OBSERVED: NOT_ALLOCATED
REPORT_BASIS_HEAD: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MAIN_HEAD_LAST_CHECKED: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_BASE: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
REPORT_SYNC: CURRENT_TO_GROUNDING_EPOCH_GE-001
APPENDIX_A_STATUS: QUALIFIED_FOR_CORE_A_B_IMPLEMENTATION
GROUNDING_EPOCH: GE-001 / 2026-08-19
CURRENT_TAKEOVER: NONE
CURRENT_STAGE: IMPLEMENT
LAST_COMPLETED_STAGE: BASELINE_AND_APPENDIX_A
CURRENT_BLOCKER: NONE
HIGHEST_RISK: accidental reintroduction of one-global-transform authority or one-axis Method B confidence
LAST_DURABLE_CHECKPOINT: this workreport
EXACT_NEXT_ACTION: implement Method A multi-basis fail-closed geometry, Method B two-axis run qualification, independent OR-loop core, and focused sample regressions.
```

## 2. Handover in 60 Seconds

### What is now true
Issue #993 is the controlling engineering-critical task. Live `main` is `168d21bd9e9c198d22009f62b6203e4f60fd4ba1`. Existing geometry uses the first qualified non-collinear triplet; existing anchor suggestions are topology-salience based and can currently return HIGH without a two-axis run gate. The owner has clarified that multiple Method A bases and multiple Method B bases are **OR**, because separate source/target revision regions may undergo independent geometry changes.

### What is currently being worked on
Core only: independent multi-base authority for Method A + Method B and sample qualification. UI, transfer selection, Writer 1B, SIF/Tee and NodeName transfer are out of this increment.

### What remains unfinished
Production files/tests are not yet committed. Full CII Workspace/browser/regression execution is NOT_RUN because this environment cannot clone GitHub; connector-backed source is available and a synthetic local Node/Python harness is used for focused numerical proof.

### What has been proven
Current main/source behavior was re-read. The synthetic policy cases in Appendix A have independent analytical expectations.

### What has NOT been proven / NOT_RUN
Full repository suite, real CII benchmark files, browser UI, CI, Writer 1A/1B lifecycle.

### What must not be assumed
OR does not mean first-success-wins. Compatible independent loops accumulate; explicit node-identity conflicts veto automatic authority. OD, WT and node-number offsets remain excluded from Method B identity.

### Highest-risk remaining item
Method A ambiguity must be detected inside one local base without requiring separate local bases to share one transform.

### Exact next action
Implement and locally execute the focused JS + independent Python sample.

## 3. Repository Ground Truth

- repository: `reallaksh19/XML_Compare_Utilities`
- default branch: `main`
- live main: `168d21bd9e9c198d22009f62b6203e4f60fd4ba1`
- branch: `agent/cii-multi-base-core`, created from exact live main
- source task: Issue #993
- open CII multi-anchor PR/branch: none found at GE-001
- `agents/MASTER_INDEX.md` is stale about PR992 draft state; live GitHub is authoritative and main already contains merge commit #992
- no workflow change authorized

## 4. Mission / Scope / Acceptance

### Mission
Create the first production-core increment for independent multi-base CII matching:

1. Method A: evaluate all mathematically qualified non-collinear 3-anchor hypotheses inside one local base, validate each against every anchor in that base, and fail that base closed when credible hypotheses imply materially different transforms.
2. Method A multi-base: allow separate local bases to remain independently READY even when their rigid transforms differ; combine bases as OR with explicit anchor-identity conflict veto.
3. Method B: construct executable straight-pipe runs, merge opposite collinear rays into one undirected run, require at least two independent axes for MEDIUM/HIGH eligibility, and preserve OD/WT/node-number exclusions.
4. Provide focused synthetic JS regressions and an independent Python analytical reproduction.

### Explicit non-goals
- no full-screen/UI work;
- no transfer APPLY/EXCLUDE implementation;
- no Writer 1A/1B changes;
- no protected external writer changes;
- no SIF/Tee or NodeName mutation changes;
- no workflow files.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Method A multi-basis geometry | PLANNED | existing geometry consumer will use it | analytical case defined | `cii-workspace-geometry.js` | code + focused tests |
| Method B pipe-run core | PLANNED | anchor suggestions consumer | B1/B2 cases defined | new pipe-run module | code + tests |
| Independent A/B OR loop core | PLANNED | first core/API slice | A1/A2 sample defined | new multi-base module | code + tests |
| UI/transfer | OUT_OF_SCOPE | none | NOT_APPLICABLE | none | successor increment |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| DEC-001 | DEC | high | P0 | ACCEPTED | independent base loops use OR + conflict veto | owner instruction 2026-08-19 | yes |
| RISK-001 | RISK | high | P0 | OPEN | one global rigid transform would reject legitimate clustered revisions | owner scenario | yes |
| RISK-002 | RISK | high | P0 | OPEN | one-axis repetitive piping can manufacture false Method B confidence | Issue #993 A2 | yes |
| RISK-003 | RISK | high | P0 | OPEN | first-valid-triplet Method A can hide alternative admissible basis ambiguity | current geometry source | yes |
| DEC-002 | DEC | high | P0 | ACCEPTED | no majority vote / no first-success selection on identity conflict | fail-closed policy | yes |

## 7. Current Technical Diagnosis

```text
Observed symptom:
- Method A chooses first usable triplet and does not diagnose alternate admissible triplets.
- Method B anchor suggestions can be HIGH from topology salience without proving two independent geometric runs.

Current hypothesis:
A local independent-loop architecture fixes both without changing Writer authority.

Supporting evidence:
Current cii-workspace-geometry.js and cii-workspace-anchor-suggestions.js on main; Issue #993; owner clarification that A and B are OR across revision regions.

Alternative hypotheses:
One global all-anchor transform; Method A AND Method B; score-only two-axis bonus.

Already ruled out:
All three conflict with the owner's revision-change model or Issue #993 fail-closed requirements.

Falsifier:
If focused samples cannot retain two different local Method A transforms while also rejecting the ambiguous 4-anchor local basis and one-axis Method B case, the architecture is wrong.

Next isolating experiment:
Run the four synthetic cases in focused JS and independent Python.
```

## 8. Authority and Invariants

- base-loop union: `L1 OR L2 OR ...`, with explicit source/target node identity conflict veto;
- one local Method A base: every admissible 3-anchor hypothesis must satisfy **all anchors in that base** within residual tolerance;
- no arbitrary coordinate averaging, scale, shear or reflection;
- separate local bases do **not** need equal transforms;
- Method B direction authority is undirected run geometry, not global X/Y/Z labels;
- OD, WT, process values and node-number offsets do not enter Method B identity;
- Writer 1B and transfer authority remain unchanged.

## 9. Current Validation

Initial validation is pre-commit synthetic execution and must be repeated/reconciled after branch publication.

- full repository regression: `NOT_RUN`
- browser: `NOT_RUN`
- CI: `NOT_RUN`
- real CII benchmark: `NOT_RUN`

## 10. Changed-File Ledger

Current durable branch change before implementation: this workreport only. Intended implementation paths:

- `tabs/cii-workspace/cii-workspace-contracts.js`
- `tabs/cii-workspace/cii-workspace-geometry.js`
- `tabs/cii-workspace/cii-workspace-pipe-runs.js` (new)
- `tabs/cii-workspace/cii-workspace-multi-base-anchor.js` (new)
- `tabs/cii-workspace/cii-workspace-anchor-suggestions.js`
- focused CII tests and independent Python qualification script
- agent status/claim/index records

## 11. Review / CI State

No PR allocated yet. No review or CI state exists for this branch.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: pending WIP record
CLAIM_RECORD: pending WIP record
LAST_OVERLAP_CHECK: GE-001
FILE_OVERLAP: no active CII multi-anchor PR discovered
AUTHORITY_OVERLAP: successor to merged CII PR989/992; Writer authority explicitly excluded
DEPENDENCY_OVERLAP: geometry + topology adapter contracts only
COORDINATION_STATE: SAFE_WITH_LIVE_GITHUB_OVERRIDING_STALE_PR992_INDEX_ROW
```

## 13. Continuation State

```text
Start here: Appendix A below, then cii-workspace-geometry.js and new pipe-run module.
Do not redo: owner OR-vs-AND decision.
Do not change: Writer 1B, transfer policy, fixed-field parser, protected external writer.
Validation still required: exact published focused JS, independent Python, inherited relevant tests where executable.
Highest-risk remaining item: distinguish local Method A ambiguity from legitimate different transforms in separate independent bases.
Exact next action: implement focused core and sample.
```

## 14. Takeover / Custody Chain

- `GE-001`: re-grounded to live main `168d21bd...`; Issue #993 read; current geometry, topology adapter, anchor suggestion, Writer pipeline and existing tests inspected.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

## A1 — Method A authoritative multi-base 3D registration policy

**Answer:** independent local base loops use **OR**. Within one local Method A base, qualified non-collinear 3-anchor triplets are independent hypotheses; each hypothesis must validate against all anchors assigned to that base. Do not average transforms. If multiple admissible hypotheses within that same base imply material transform disagreement, that base returns `METHOD_A_AMBIGUOUS_BASES / REVIEW`. Separate local bases may retain materially different transforms and both remain READY.

Proposed numerical defaults for this core slice:

```text
anchorResidualToleranceMm = 2.0            existing default
nonCollinearSinTolerance = 1e-4            existing default
basisTransformAgreementToleranceMm = 2.0   new explicit fail-closed default
```

Material transform disagreement is evaluated using relative rotation plus displacement at the source-base centroid over the source-base radius; optional registration probe points can increase the observed disagreement. This detects rotational ambiguity that anchor residuals alone can hide.

**4-anchor ambiguity case:**

```text
SOURCE A1=(0,0,0)       TARGET A1=(0,0,0)
SOURCE A2=(1000,0,0)    TARGET A2=(1000,0,0)
SOURCE A3=(2000,1,0)    TARGET A3=(2000,1,0)
SOURCE A4=(3000,0,1)    TARGET A4=(3000,1,0)
```

Triplet A1-A2-A3 gives identity rotation; residuals `[0,0,0,sqrt(2)]`, max `1.414214 mm` <= 2 mm. Triplet A1-A2-A4 gives an approximately 90-degree X-axis rotation; residuals `[0,0,sqrt(2),0]`, max `1.414214 mm` <= 2 mm. Both triplets are non-collinear above `1e-4`, yet their rotations differ by 90 degrees, so the local base is `AMBIGUOUS`, not first-triplet READY.

**Independent OR example:** local Base A1 may resolve translation `(0,+100,0) mm`; local Base A2 may resolve `(0,-200,0) mm`. If their explicit node claims do not conflict, both are independently READY. No `T1 == T2` condition exists across bases.

## A2 — Method B executable two-axis pipe-run policy

A pipe run is a maximal connected sequence of straight `PIPE` edges. Starting at a candidate node, walk each incident PIPE ray and continue only through degree-2 nodes while the outgoing direction remains collinear. Stop on terminal, branch, non-PIPE component transition, direction change, invalid geometry or traversal cap.

```text
runCollinearAngleDeg = 0.5°
axisLabelSnapDeg = 2.0°       presentation only
independentAxisAngleDeg = 15°
maxRunElements = 256
```

Opposite collinear rays are merged into one **undirected** run; therefore a long straight line through the anchor is one run, not two. Two runs are independent only when their acute undirected included angle is at least 15°. The 15° gate corresponds to orientation-conditioning amplification `1/sin(15°)=3.864`; at 5° it would be `11.474`, so near-parallel evidence is deliberately not promoted.

Cross-revision run compatibility uses rotation-invariant included angle, run length and terminator structure. Global axis labels are display-only. OD, WT, process values and node-number magnitude/offset are excluded.

**B1:** 20 m repetitive straight line with anchor in the middle produces left/right rays with `acos(abs(dot(-X,+X)))=0°`; they merge to one run, `independentAxisRunCount=1`, so Method B is REVIEW maximum regardless of topology score.

**B2:** SOURCE runs X (12,000 mm) + Z (7,000 mm); TARGET runs Y (12,000 mm) + Z (7,000 mm). Both included angles are 90°. With compatible terminators and existing mutual-best/winner-gap gates, Method B is eligible for MEDIUM/HIGH.

## A3 — UI/authority partial transfer

Not implemented in this core slice. Required successor authority remains:

```text
correspondence
 -> engineering deltas
 -> explicit transfer scope APPLY / EXCLUDE
 -> filtered immutable Writer plan
 -> Writer 1B readiness
 -> mutation / reparse / negative assurance
```

Blocked-but-EXCLUDE SIF/Tee and NodeName deltas remain visible/audited but do not enter Writer readiness. Global identity/structure blockers, stale target SHA, selected unsupported operations, preimage/pointer/cardinality drift, duplicate write claims, reparse failure and unexpected semantic mutation remain global. The expected mixed scenario is `READY · PARTIAL SCOPE`, never silent skipping and never weakening Writer 1B.

**Qualification verdict:** PASS for the approved core Method A/B increment. A3 is answered as an invariant but explicitly outside this implementation slice.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- GE-001 / BASELINE: live source and task grounded; Appendix A completed before production mutation.
