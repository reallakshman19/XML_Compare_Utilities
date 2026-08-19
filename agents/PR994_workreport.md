# PR994 — CII independent multi-base Method A/B core

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE_FOCUSED_VALIDATION_PASS
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — first core increment only
PR_OR_WIP: PR994
BRANCH: agent/cii-multi-base-core
PR_HEAD_OBSERVED: 97f5d79ac3adc660ff6201dff76afe480f5e9ab3 before this report-only reconciliation
REPORT_BASIS_HEAD: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1 + exact PR994 production/test blobs below
MAIN_HEAD_LAST_CHECKED: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_BASE: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
REPORT_SYNC: GE-004
APPENDIX_A_STATUS: PASS_FOR_APPROVED_CORE_A_B_INCREMENT
GROUNDING_EPOCH: GE-004 / 2026-08-19
CURRENT_STAGE: HANDOVER_READY
LAST_COMPLETED_STAGE: IMPLEMENT_VALIDATE_RECONCILE
CURRENT_BLOCKER: NONE_FOR_REVIEW; COMPLETE_CHECKOUT_VALIDATION_NOT_RUN_ENVIRONMENT
HIGHEST_RISK: successor workspace orchestration must preserve independent-loop provenance and conflict veto
LAST_DURABLE_CHECKPOINT: PR994 draft + 14-path reconciled diff + exact-blob focused validation
EXACT_NEXT_ACTION: owner review of core/sample; keep draft and do not merge without explicit authorization.
```

## 2. Handover in 60 Seconds

PR994 is the first core slice of Issue #993. Its authority model is:

```text
METHOD A local base loop
       OR
METHOD B local base loop
       OR
additional independent local loops
       ↓
compatible READY claims accumulate
conflicting READY identity claims veto automatic authority
```

This is **OR**, not first-success-wins and not majority voting.

Implemented and focused-tested:

- Method A no longer selects only the first usable non-collinear triplet. Every qualified triplet inside one local base is evaluated, and each hypothesis is checked against every anchor assigned to that local base.
- Two residual-qualified but materially different rigid hypotheses make that local base `METHOD_A_AMBIGUOUS_BASES`.
- Separate local Method A bases may retain different rigid transforms and both remain READY.
- Method B derives maximal undirected straight-pipe runs and requires at least two independent compatible runs on SOURCE and TARGET before Base Anchor confidence can reach MEDIUM/HIGH.
- Base Anchor suggestions now obtain Method B evidence through the common multi-base OR authority module, providing a real production consumer for the new core seam.
- READY cross-loop claims are fail-closed for source->multiple-target and target->multiple-source collisions.

Focused JS checks and an independent Python numerical oracle pass. Full repository/browser/real-CII execution is `NOT_RUN_ENVIRONMENT`. No Writer, transfer, fixed-field parser, workflow or protected external writer authority was changed.

## 3. Repository Ground Truth

```text
repository: reallaksh19/XML_Compare_Utilities
PR: 994
state: OPEN / DRAFT / UNMERGED
base: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
working branch: agent/cii-multi-base-core
latest code checkpoint observed: 97f5d79ac3adc660ff6201dff76afe480f5e9ab3
mergeability last observed before final report commit: TRUE
status checks last observed: none
changed paths before final report commit: 14 / reconciled
merge authority: OWNER_ONLY
```

`agents/MASTER_INDEX.md` now records PR994 and reconciles PR992 to its actual merged state. Temporary WIP report/status were removed after PR allocation. Connector deletion of the temporary WIP claim was blocked, so `agents/claims/WIP-CII993-MULTIBASE.yaml` is retained as a seven-line historical `SUPERSEDED_BY_PR994` pointer with `active_authority: false`; `agents/claims/PR994.yaml` is the sole active claim.

## 4. Mission / Scope / Acceptance

Approved first increment:

1. Method A local multi-basis rigid registration diagnostics.
2. Independent Method A bases combined as OR.
3. Method B executable pipe-run extraction.
4. Method B minimum two-axis hard confidence gate.
5. Independent Method B loops combined as OR.
6. Cross-loop identity conflict veto.
7. Method-B-qualified Base Anchor suggestion evidence.
8. Synthetic JS regressions and independent numerical reproduction.

Explicit non-goals:

```text
full-screen/UI implementation
workspace-level multi-loop propagation/orchestration
transfer APPLY/EXCLUDE
Writer 1A / Writer 1B
transfer policy / transfer plan
fixed-field parser
SIF/Tee or NodeName mutation
protected external CII writer/converter
workflow changes
```

## 5. Current Implementation State

| Item | Implementation | Integration | Validation | Remaining |
|---|---|---|---|---|
| Method A alternate local triplets | COMPLETE | geometry API | PASS | real CII/full suite |
| Method A local ambiguity | COMPLETE | geometry API | PASS | candidate-loop UI |
| independent Method A OR bases | COMPLETE | multi-base core | PASS | workspace orchestration |
| Method B pipe runs | COMPLETE | multi-base core | PASS | real-model calibration |
| Method B two-axis confidence gate | COMPLETE | Base Anchor suggestions via multi-base core | PASS | UI evidence card |
| cross-loop identity veto | COMPLETE | multi-base core | PASS | broader candidate arbitration |
| full Issue #993 UI/transfer work | NOT_IMPLEMENTED | none | NOT_RUN | successor PR(s) |

## 6. Active Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | DEC | ACCEPTED | A/B independent local loops use OR + conflict veto |
| DEC-002 | DEC | ACCEPTED | no first-success / majority-vote identity authority |
| IMP-001 | IMP | COMPLETE | Method A alternate-basis diagnostics |
| IMP-002 | IMP | COMPLETE | Method B two-axis gate |
| IMP-003 | IMP | COMPLETE | cross-loop source/target collision veto |
| IMP-004 | IMP | COMPLETE | Base Anchor suggestions consume common multi-base core |
| RISK-001 | RISK | OPEN_SUCCESSOR | existing full workspace remains single-global-transform shaped until successor orchestration |
| RISK-002 | RISK | OPEN_SUCCESSOR | Method B thresholds are explicit policy defaults requiring real-model calibration; no silent loosening |

## 7. Current Technical Diagnosis

Baseline:

```text
Method A: first usable non-collinear triplet could hide another acceptable but materially different basis.
Method B: topology salience could promote HIGH without proving two independent geometric directions.
```

Current core:

```text
LOCAL METHOD A BASE
  enumerate qualified triplet hypotheses
  -> validate every hypothesis against all anchors assigned to the base
  -> none admissible: INCOMPATIBLE
  -> admissible transforms materially disagree: METHOD_A_AMBIGUOUS_BASES
  -> admissible transforms materially agree: READY

LOCAL METHOD B BASIS
  extract maximal undirected straight PIPE runs
  -> independentAxisRunCount < 2: REVIEW maximum
  -> >=2 compatible independent runs: READY evidence

MULTI-BASE UNION
  A1 OR A2 OR ... OR B1 OR B2 ...
  -> at least one READY and no identity collision: READY
  -> READY source/target collision: AMBIGUOUS
```

## 8. Authority and Invariants

### Method A defaults

```text
anchorResidualToleranceMm = 2.0 mm                 existing default
nonCollinearSinTolerance = 1e-4                     existing default
basisTransformAgreementToleranceMm = 2.0 mm         new fail-closed default; otherwise inherits residual tolerance
```

Transform disagreement uses relative rotation, source-centroid displacement, source-radius rotation bound `2*r*sin(theta/2)`, and optional probe-point disagreement. No averaging between independent local bases; no scale, shear or reflection.

### Method B defaults

```text
runCollinearAngleDeg = 0.5 deg
axisLabelSnapDeg = 2.0 deg              display only
independentAxisAngleDeg = 15.0 deg
runIncludedAngleToleranceDeg = 2.0 deg
runLengthRelativeTolerance = 0.10
maxRunElements = 256
```

Opposite collinear rays are one undirected run. Cross-revision run basis uses rotation-invariant included angle, run length and terminator structure. OD, WT, process values and node-number magnitude/offset remain excluded from Method B identity.

These thresholds are explicit engineering policy defaults, not truths inferred from one passing test. They must not be loosened to make a benchmark pass without separate qualification.

### Negative assurance

Unchanged by PR994:

```text
Writer 1A / Writer 1B
transfer policy / transfer plan
parser/fixed-field.js
protected external writer/converter
SIF/Tee and NodeName mutation authority
workflow files
```

The legacy M1/full-workspace orchestration is also intentionally not rewritten in this slice. Successor integration must use independent-loop provenance rather than silently collapsing to one global registration.

## 9. Current Validation

### V-001 — syntax

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: NONE
Evidence: node --check on focused production modules + JS tests
```

### V-002 — Method A geometry

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-geometry-authority.test.js
Actual: CII Workspace multi-basis geometry authority checks passed.
```

### V-003 — Method B Base Anchor qualification

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-base-anchor-suggestions.test.js
Actual: CII method-qualified paired base-anchor suggestion checks passed.
```

### V-004 — independent OR authority

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-multi-base-authority.test.js
Actual: CII independent multi-base A/B OR authority checks passed.
```

Proven in V-004:

```text
Method A local A1 t=(0,+100,0) mm READY
Method A local A2 t=(0,-200,0) mm READY
A1 OR A2 => READY; no T1==T2 requirement
Method B two-axis alone => READY union
Method A READY + one-axis Method B REVIEW => READY union
same SOURCE claimed by READY loops for two TARGETs => CROSS_LOOP_ANCHOR_IDENTITY_CONFLICT / AMBIGUOUS
```

### V-005 — independent Python numerical oracle

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Command: python tests/qualification/cii-workspace-multi-base-oracle.py
Production JS imports: NONE
Actual: Independent CII multi-base Method A/B oracle passed.
```

Independent numerical expectations:

```text
A1 translation = (0,+100,0) mm
A2 translation = (0,-200,0) mm
ambiguous local basis max residuals = sqrt(2)=1.414213562... mm <= 2 mm
relative ambiguous basis rotation ~= 90 deg
one-axis undirected angle = 0 deg
SOURCE X+Z and TARGET Y+Z included angles = 90 deg
```

### Exact production/test Git blobs executed

```text
8e9385de9cdb7b167600a2c857b46c54e2665c25  tabs/cii-workspace/cii-workspace-contracts.js
3d05c06d1918d1d622c58cce72ea31932d92a162  tabs/cii-workspace/cii-workspace-geometry.js
5f293cb41f9a61ff94c225034407389036940385  tabs/cii-workspace/cii-workspace-pipe-runs.js
9466209a2b3ee276bb93666c7ca31dd4e7fd9b99  tabs/cii-workspace/cii-workspace-multi-base-anchor.js
b8ceb198584604c89c3c2b6adde638c8af1abca5  tabs/cii-workspace/cii-workspace-anchor-suggestions.js
e8f1d2c4a793af89998537ef6cf49dbd9e9c071e  tests/cii-workspace-geometry-authority.test.js
d8df36cb42ac48617456c3223c9fa1aeab68ae02  tests/cii-workspace-base-anchor-suggestions.test.js
e64925672b3ca8f43381ff3e9c43c051804ec370  tests/cii-workspace-multi-base-authority.test.js
ad225090ef763fa0d85a5be06df8f7f0ed41ade9  tests/qualification/cii-workspace-multi-base-oracle.py
```

After routing suggestions through the multi-base core, V-003/V-004 and the complete focused set were rerun and remained PASS.

### NOT_RUN

```text
full repository npm test: NOT_RUN_ENVIRONMENT
full inherited CII Workspace suite: NOT_RUN_ENVIRONMENT
browser / Chromium: NOT_RUN_ENVIRONMENT
real CII benchmark: NOT_RUN_ENVIRONMENT
Writer 1A/1B lifecycle: NOT_RUN_OUT_OF_SCOPE
GitHub Actions / CI: NOT_RUN; current head reported no status checks
```

No unexecuted check is represented as PASS.

## 10. Changed-File Ledger

Final pre-report reconciliation against exact base: **14 changed paths, all explained**.

| Path | Intended | Purpose |
|---|---:|---|
| `agents/MASTER_INDEX.md` | yes | PR994 coordination + PR992 merge truth |
| `agents/PR994_workreport.md` | yes | living recovery report |
| `agents/status/PR994.yaml` | yes | active status |
| `agents/claims/PR994.yaml` | yes | sole active claim |
| `agents/claims/WIP-CII993-MULTIBASE.yaml` | yes | inactive historical superseded pointer; deletion connector blocked |
| `tabs/cii-workspace/cii-workspace-contracts.js` | yes | schemas |
| `tabs/cii-workspace/cii-workspace-geometry.js` | yes | Method A local multi-basis |
| `tabs/cii-workspace/cii-workspace-pipe-runs.js` | yes | Method B runs |
| `tabs/cii-workspace/cii-workspace-multi-base-anchor.js` | yes | OR/conflict core |
| `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` | yes | production consumer + two-axis confidence gate |
| `tests/cii-workspace-geometry-authority.test.js` | yes | Method A regression |
| `tests/cii-workspace-base-anchor-suggestions.test.js` | yes | Method B regression |
| `tests/cii-workspace-multi-base-authority.test.js` | yes | OR/conflict regression |
| `tests/qualification/cii-workspace-multi-base-oracle.py` | yes | independent reproduction |

Production line counts after final code integration:

```text
geometry: 177
pipe-runs: 175
multi-base: 70
anchor-suggestions: 114
```

All remain below the 300-physical-line module heuristic.

## 11. Review / CI State

```text
PR994: OPEN / DRAFT / UNMERGED
mergeable last observed: TRUE
reviews: none observed
status checks: none on observed head
merge authority: OWNER_ONLY
```

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: agents/status/PR994.yaml
CLAIM_RECORD: agents/claims/PR994.yaml
WIP_CLAIM: SUPERSEDED / active_authority=false
FILE_OVERLAP: no active CII multi-base PR found at grounding
AUTHORITY_OVERLAP: successor to merged PR989/PR992; Writer authority excluded
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: PR994 diff and this report.
Do not redo: owner OR-vs-AND decision, A1/A2 policy, focused numerical sample.
Do not change in this PR: Writer, transfer policy/plan, fixed-field parser, external writer, workflows.
Validation still required for wider product authority: complete checkout CII suite, real CII benchmark, later workspace/UI orchestration tests.
Highest-risk remaining item: successor must use independent-loop provenance and conflict veto; do not collapse to one global transform.
Exact next action: owner review of sample/core; keep draft/unmerged.
```

## 14. Takeover / Custody Chain

- `GE-001`: re-grounded live main/Issue #993/source boundaries; Appendix A completed before code mutation.
- `GE-002`: implemented Method A/B core and focused tests.
- `GE-003`: draft PR994 created; WIP report/status migrated to PR-numbered authority.
- `GE-004`: production consumer routed through multi-base core; 14-path final scope reconciled; focused checks remained PASS.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

## A1 — Method A: authoritative local multi-basis policy

Independent local Method A bases combine as OR. Within one base, each mathematically qualified non-collinear triplet is an independent rigid hypothesis and is validated against all anchors assigned to that base. Residual-qualified hypotheses that materially disagree make that local base `METHOD_A_AMBIGUOUS_BASES`; no iteration-order, lower-RMS voting or majority selection overrides the conflict.

Numerical ambiguity sample:

```text
SOURCE: (0,0,0), (1000,0,0), (2000,1,0), (3000,0,1)
TARGET: (0,0,0), (1000,0,0), (2000,1,0), (3000,1,0)
Basis 0-1-2 max residual = sqrt(2)=1.414214 mm
Basis 0-1-3 max residual = sqrt(2)=1.414214 mm
relative rotation ~=90 deg
=> both residual-qualified but materially inconsistent => AMBIGUOUS
```

Independent-region sample:

```text
A1 t=(0,+100,0) mm READY
A2 t=(0,-200,0) mm READY
no explicit identity collision => both survive OR
```

## A2 — Method B: executable two-axis pipe-run policy

A run is a maximal connected straight `PIPE` sequence. Continue through degree-2 nodes only while the outgoing direction remains within 0.5°; stop at terminal, branch, non-PIPE component transition, direction change, invalid geometry, or 256-edge cap. Opposite collinear rays merge into one undirected run. Independent axes require an acute undirected angle >=15°. Cross-revision two-run compatibility uses <=2° included-angle difference, <=10% run-length relative delta, and compatible terminators. OD, WT, process values and node-number offsets are not identity evidence.

```text
B1: 20 m straight repetitive run; midpoint left=-X/right=+X; acos(abs(dot))=0° -> one run -> REVIEW maximum.
B2: SOURCE X12m+Z7m; TARGET Y12m+Z7m; both included angles=90° -> compatible two-axis Method B basis.
```

## A3 — UI/transfer invariant retained, not implemented here

```text
correspondence
 -> engineering deltas
 -> explicit APPLY / EXCLUDE transfer scope
 -> selected immutable Writer plan
 -> Writer 1B readiness
 -> mutation -> reparse -> negative assurance
```

Excluded blocked SIF/Tee or NodeName changes must remain visible but not enter Writer readiness. Global stale-target, preimage, pointer/cardinality, duplicate-write and post-write negative-assurance blockers remain global. Writer 1B is not weakened.

**APPENDIX A VERDICT: PASS for PR994 core scope.**

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- GE-001 BASELINE / Appendix A before mutation.
- GE-002 IMPLEMENT / focused JS + independent oracle.
- GE-003 PR ALLOCATION / custody migration.
- GE-004 FINAL CORE RECONCILIATION / production consumer + 14-path ledger.
