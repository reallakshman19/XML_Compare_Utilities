# WIP-CII993-MULTIBASE — CII independent multi-base Method A/B core

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTATION_COMPLETE_FOCUSED_VALIDATION_PASS_PR_PENDING
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: NOT_APPLICABLE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — first core increment only
PR_OR_WIP: WIP-CII993-MULTIBASE
BRANCH: agent/cii-multi-base-core
PR_HEAD_OBSERVED: NOT_ALLOCATED
REPORT_BASIS_HEAD: branch@5780ace04f2a8ee879dd97e804e987cd1023601b
MAIN_HEAD_LAST_CHECKED: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_BASE: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
REPORT_SYNC: CURRENT_TO_GE-002
APPENDIX_A_STATUS: PASS_FOR_APPROVED_CORE_A_B_INCREMENT
GROUNDING_EPOCH: GE-002 / 2026-08-19
CURRENT_TAKEOVER: NONE
CURRENT_STAGE: VALIDATE_RECONCILE
LAST_COMPLETED_STAGE: IMPLEMENT_AND_FOCUSED_VALIDATE
CURRENT_BLOCKER: NONE_FOR_DRAFT_PR
HIGHEST_RISK: successor orchestration must not fall back to one-global-transform or treat OR as first-success-wins
LAST_DURABLE_CHECKPOINT: exact branch blobs + focused local execution + independent oracle
EXACT_NEXT_ACTION: create draft PR, migrate WIP custody to PR-numbered records, reconcile exact changed files, do not merge.
```

## 2. Handover in 60 Seconds

### What is now true
The first core slice for Issue #993 is implemented. The owner-authoritative architecture is **independent Method A/Method B OR loops with conflict veto**. Separate local Method A bases may produce materially different rigid transforms and remain READY simultaneously. Within one local Method A base, all qualified non-collinear triplet hypotheses are evaluated; every admissible hypothesis must satisfy all anchors assigned to that base, and materially conflicting admissible transforms return `METHOD_A_AMBIGUOUS_BASES` instead of iteration-order selection. Method B now has an executable two-independent-run gate before anchor confidence can reach MEDIUM/HIGH.

### What is currently being worked on
Reconciliation and draft PR publication only.

### What remains unfinished
This is deliberately **not the full Issue #993**. Multi-base UI/orchestration, Method A suggestion cards, full-screen UX, selective transfer APPLY/EXCLUDE, SIF/Tee normalization, and Writer integration are successor increments. Full repository/browser/real-CII execution is NOT_RUN in this connector-only environment.

### What has been proven
Exact published production/test blobs for the core slice were reconstructed locally and executed. Three focused JS checks pass. The independent Python oracle, which imports no production JS, passes the analytical Method A/Method B sample values. Cross-loop identity conflict veto is regression-tested.

### What has NOT been proven / NOT_RUN
Full repository regression, browser UI, real TARGET1/TARGET2 or other CII benchmark files, CI/GitHub Actions, Writer 1A/1B lifecycle.

### What must not be assumed
OR is not first-success-wins and not majority voting. A READY loop contributes authority; a conflicting READY identity claim vetoes automatic authority. Method A ambiguity inside one local base is not the same as different transforms across independent local bases. OD, WT, process values and node-number offsets remain excluded from Method B identity.

### Highest-risk remaining item
Successor integration must route candidate correspondence through the independent-loop result; it must not resurrect ambiguous Method A evidence through an implicit global transform choice.

### Exact next action
Open the draft PR and convert WIP custody records to PR-numbered records.

## 3. Repository Ground Truth

- repository: `reallaksh19/XML_Compare_Utilities`
- default/base: `main`
- exact base/main at implementation start: `168d21bd9e9c198d22009f62b6203e4f60fd4ba1`
- working branch: `agent/cii-multi-base-core`, created from exact base
- current exact implementation checkpoint before this report update: `5780ace04f2a8ee879dd97e804e987cd1023601b`
- source task: Issue #993
- open multi-anchor CII PR before this work: none found
- `agents/MASTER_INDEX.md` was stale about PR992; live GitHub is authority and main already contains PR992 merge
- no workflow mutation authorized or performed

## 4. Mission / Scope / Acceptance

### Approved mission
Create the first production-core increment for independent multi-base CII matching and prove it on synthetic numerical samples:

1. Method A local multi-basis qualification.
2. Independent Method A base loops combined as OR.
3. Method B executable pipe-run extraction and two-axis hard gate.
4. Independent Method B loops combined as OR.
5. Cross-loop source/target identity conflict veto.
6. Method-qualified anchor suggestion confidence for Method B.
7. Focused JS regressions plus independent Python numerical oracle.

### Explicit non-goals
- no full-screen/UI implementation;
- no transfer APPLY/EXCLUDE implementation;
- no Writer 1A/1B changes;
- no transfer policy/plan changes;
- no fixed-field parser changes;
- no protected external writer/converter changes;
- no SIF/Tee or NodeName mutation changes;
- no workflows.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Method A alternate triplet hypotheses | COMPLETE | existing geometry API | focused PASS + independent oracle | `cii-workspace-geometry.js` | real CII/full-suite |
| Method A local ambiguity | COMPLETE | existing geometry API returns `AMBIGUOUS` | 4-anchor PASS | same | successor UI/orchestration |
| Method A independent OR bases | COMPLETE | core authority module | two-transform PASS | `cii-workspace-multi-base-anchor.js` | workspace wiring |
| Method B run extraction | COMPLETE | anchor suggestions | B1/B2 PASS | `cii-workspace-pipe-runs.js` | real CII benchmark |
| Method B two-axis hard gate | COMPLETE | anchor confidence | focused PASS | `cii-workspace-anchor-suggestions.js` | UI evidence card |
| Cross-loop conflict veto | COMPLETE | core authority module | focused PASS | multi-base module/test | broader candidate arbitration |
| UI/transfer/writer | OUT_OF_SCOPE | none | NOT_APPLICABLE | none | successor increments |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| DEC-001 | DEC | high | P0 | ACCEPTED | independent A/B base loops use OR + conflict veto | owner instruction 2026-08-19 | yes |
| DEC-002 | DEC | high | P0 | ACCEPTED | no majority vote / first-success identity selection | core + regression | yes |
| IMP-001 | IMP | high | P0 | COMPLETE | enumerate Method A local basis hypotheses | focused test | yes |
| IMP-002 | IMP | high | P0 | COMPLETE | Method B two-run hard gate | B1/B2 test | yes |
| IMP-003 | IMP | high | P0 | COMPLETE | cross-loop source/target collision veto | focused regression | yes |
| RISK-001 | RISK | high | P1 | OPEN_SUCCESSOR | old workspace orchestration is still single global geometry-transform shaped | source inspection | successor |
| RISK-002 | RISK | medium | P1 | OPEN_SUCCESSOR | Method B numerical thresholds require real-model calibration; do not weaken silently | synthetic-only qualification | successor/benchmark |

## 7. Current Technical Diagnosis

```text
Observed baseline:
- geometry selected the first usable non-collinear triplet;
- anchor suggestion confidence could reach HIGH without two independent geometric runs.

Implemented correction:
- all qualified triplets within one local Method A base become independent hypotheses;
- every hypothesis is validated against every anchor assigned to that base;
- conflicting admissible hypotheses fail the local base closed;
- separate local bases are OR, not forced to one transform;
- Method B extracts undirected straight runs and requires >=2 independent axes before MEDIUM/HIGH;
- READY loop identity collisions fail cross-loop arbitration closed.

Falsifier exercised:
- two different local translations must both survive;
- 4-anchor near-collinear ambiguity must not choose the first triplet;
- 20 m one-axis run must remain REVIEW;
- compatible X+Z vs Y+Z two-axis basis must qualify;
- same SOURCE claimed by two READY loops for different TARGETs must be AMBIGUOUS.
```

## 8. Authority and Invariants

### Method A
- local base residual tolerance: `anchorResidualToleranceMm = 2.0 mm` existing default;
- non-collinearity: `nonCollinearSinTolerance = 1e-4` existing default;
- local alternate-transform agreement: `basisTransformAgreementToleranceMm = 2.0 mm` new fail-closed default, otherwise inherits anchor residual tolerance;
- transform disagreement includes centroid displacement + source-radius rotational displacement bound, plus optional probe-point disagreement;
- no coordinate averaging, scale, shear or reflection;
- separate local bases do not need equal transforms.

### Method B
- `runCollinearAngleDeg = 0.5°`;
- `axisLabelSnapDeg = 2.0°` presentation only;
- `independentAxisAngleDeg = 15°`;
- `runIncludedAngleToleranceDeg = 2.0°`;
- `runLengthRelativeTolerance = 0.10`;
- `maxRunElements = 256`;
- opposite collinear rays merge into one undirected run;
- run compatibility uses rotation-invariant included angle, run length and terminator structure;
- OD, WT, process values, node-number magnitude/offset are not Method B identity evidence.

### Cross-loop / downstream
- combination = `OR_WITH_CONFLICT_VETO`;
- source->multiple target or target->multiple source among READY claims = `CROSS_LOOP_ANCHOR_IDENTITY_CONFLICT`;
- existing Writer 1A/1B, transfer policy/plan, fixed-field parser and protected external writer are invariant in this slice.

Thresholds are explicit engineering policy defaults, not benchmark-derived truths. They may only be changed through a separate qualification decision; no test-driven loosening is permitted.

## 9. Current Validation

### V-001 — focused JavaScript syntax
```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: NONE
Basis: exact Git blobs reconstructed from published branch
Commands: node --check on 4 production modules + 3 focused JS tests
Actual: all exit 0
Origin: INTRODUCED_BY_PR
```

### V-002 — Method A geometry authority regression
```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-geometry-authority.test.js
Actual: CII Workspace multi-basis geometry authority checks passed.
Key proof: 4-anchor ambiguity => METHOD_A_AMBIGUOUS_BASES; four consistent anchors => 4 admissible bases.
Origin: INTRODUCED_BY_PR
```

### V-003 — method-qualified anchor suggestions
```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-base-anchor-suggestions.test.js
Actual: CII method-qualified paired base-anchor suggestion checks passed.
Key proof: one-axis topology-salient branch is REVIEW; two-axis compatible branch is METHOD_B_NETWORK/HIGH eligible.
Origin: INTRODUCED_BY_PR
```

### V-004 — independent multi-base OR core
```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-multi-base-authority.test.js
Actual: CII independent multi-base A/B OR authority checks passed.
Key proof: +100 mm and -200 mm Method A local translations coexist READY; Method B alone can satisfy OR; A READY + B REVIEW remains READY; conflicting READY source claims => AMBIGUOUS.
Origin: INTRODUCED_BY_PR
```

### V-005 — independent numerical oracle
```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Command: python tests/qualification/cii-workspace-multi-base-oracle.py
Implementation import: NONE
Actual: Independent CII multi-base Method A/B oracle passed.
Expected numerical evidence:
- local translations exactly (0,+100,0) mm and (0,-200,0) mm;
- ambiguous basis residual maxima sqrt(2)=1.414213562... mm <=2 mm;
- ambiguous basis relative rotation ~=90 degrees;
- one-axis undirected included angle =0 degrees;
- X+Z and Y+Z two-axis included angles =90 degrees.
Origin: INTRODUCED_BY_PR
```

### Exact branch/local Git-blob identity
```text
8e9385de9cdb7b167600a2c857b46c54e2665c25  cii-workspace-contracts.js
3d05c06d1918d1d622c58cce72ea31932d92a162  cii-workspace-geometry.js
5f293cb41f9a61ff94c225034407389036940385  cii-workspace-pipe-runs.js
9466209a2b3ee276bb93666c7ca31dd4e7fd9b99  cii-workspace-multi-base-anchor.js
966611ee786eac5eb0e53aa2344fb4494488db3a  cii-workspace-anchor-suggestions.js
e8f1d2c4a793af89998537ef6cf49dbd9e9c071e  cii-workspace-geometry-authority.test.js
d8df36cb42ac48617456c3223c9fa1aeab68ae02  cii-workspace-base-anchor-suggestions.test.js
e64925672b3ca8f43381ff3e9c43c051804ec370  cii-workspace-multi-base-authority.test.js
ad225090ef763fa0d85a5be06df8f7f0ed41ade9  cii-workspace-multi-base-oracle.py
```

### NOT_RUN
```text
full repository npm test: NOT_RUN_ENVIRONMENT
full inherited CII Workspace suite: NOT_RUN_ENVIRONMENT
browser/Chromium: NOT_RUN_ENVIRONMENT
real CII benchmark files: NOT_RUN_ENVIRONMENT
Writer 1A/1B lifecycle: NOT_RUN_OUT_OF_SCOPE
GitHub Actions/CI: NOT_RUN
```

## 10. Changed-File Ledger

At checkpoint before report reconciliation, compare against exact base showed 12 paths: 3 WIP custody docs, 5 production paths, 3 JS tests, 1 Python oracle. No unexplained path existed.

| File | Intended? | Purpose | Sensitive? | Validation |
|---|---:|---|---:|---|
| `tabs/cii-workspace/cii-workspace-contracts.js` | yes | multi-base schemas | yes | syntax/blob |
| `tabs/cii-workspace/cii-workspace-geometry.js` | yes | Method A multi-basis local qualification | yes | V-001/002/005 |
| `tabs/cii-workspace/cii-workspace-pipe-runs.js` | yes | Method B executable run basis | yes | V-001/003/004/005 |
| `tabs/cii-workspace/cii-workspace-multi-base-anchor.js` | yes | OR + conflict veto | yes | V-001/004 |
| `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` | yes | hard two-axis confidence gate | yes | V-001/003 |
| `tests/cii-workspace-geometry-authority.test.js` | yes | A ambiguity/consensus | no | PASS |
| `tests/cii-workspace-base-anchor-suggestions.test.js` | yes | B one/two-axis gate | no | PASS |
| `tests/cii-workspace-multi-base-authority.test.js` | yes | OR/conflict core | no | PASS |
| `tests/qualification/cii-workspace-multi-base-oracle.py` | yes | independent numerical oracle | no | PASS |
| WIP custody records | yes | recoverability | no | source inspection |

Production physical lines: geometry 177, pipe-runs 175, multi-base 70, anchor-suggestions 110; all below 300-line heuristic.

## 11. Review / CI State

No PR allocated at this checkpoint. No review threads/checks. Draft PR publication is next. No merge authority exists.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: WIP current
CLAIM_RECORD: WIP current
LAST_OVERLAP_CHECK: GE-002
FILE_OVERLAP: no active CII multi-base PR discovered
AUTHORITY_OVERLAP: successor to merged PR989/992; Writer authority excluded
DEPENDENCY_OVERLAP: existing geometry and topology graph contracts only
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: create draft PR; convert WIP records to PR-numbered records.
Do not redo: owner OR-vs-AND decision, Appendix A, focused sample implementation.
Do not change: Writer 1A/1B, transfer policy/plan, fixed-field parser, external writer, workflows.
Validation still required for final product authority: complete checkout CII suite + real CII benchmark + later UI/orchestration tests.
Highest-risk remaining item: successor workspace wiring must preserve independent-loop provenance and conflict veto.
Exact next action: draft PR + custody reconciliation, no merge.
```

## 14. Takeover / Custody Chain

- `GE-001`: grounded live main, Issue #993, existing geometry/topology/anchor/writer boundaries; Appendix A completed before production mutation.
- `GE-002`: implementation complete; exact production/test blobs locally reconstructed and focused checks executed; changed-file scope reconciled.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

## A1 — Method A authoritative policy
Independent local Method A bases are OR. Inside one base, every mathematically qualified non-collinear triplet is an independent rigid hypothesis and is checked against every anchor assigned to that base. An admissible hypothesis has max residual <=2 mm by default. Multiple admissible hypotheses that materially disagree beyond the explicit transform-agreement tolerance make that local base `METHOD_A_AMBIGUOUS_BASES`. Separate local bases may have different transforms without conflict unless their explicit identity claims collide.

Numerical ambiguity case:
```text
S: (0,0,0), (1000,0,0), (2000,1,0), (3000,0,1)
T: (0,0,0), (1000,0,0), (2000,1,0), (3000,1,0)
Basis 0-1-2 max residual = sqrt(2)=1.414214 mm
Basis 0-1-3 max residual = sqrt(2)=1.414214 mm
relative rotation ~=90 degrees
=> both residual-qualified, transform-incompatible => AMBIGUOUS
```

Independent OR case:
```text
Local A1 translation = (0,+100,0) mm READY
Local A2 translation = (0,-200,0) mm READY
No identity collision => overall READY, methodAReadyCount=2
```

## A2 — Method B executable pipe-run policy
A run is a maximal connected straight `PIPE` sequence. Continue through degree-2 nodes only while direction deviation <=0.5°. Stop at terminal, branch, non-PIPE transition, direction change, invalid geometry or 256-edge cap. Opposite collinear rays are one undirected run. Independent runs require acute undirected angle >=15°. `axisLabelSnapDeg=2°` is presentation-only. Cross-revision two-run compatibility uses included-angle delta <=2°, run-length relative delta <=10%, and terminator compatibility. OD/WT/process/node-number offset are excluded.

B1:
```text
20 m straight repetitive line; midpoint anchor
left=-X, right=+X
acos(abs(dot))=0 degrees
=> merged one run => independentAxisRunCount=1 => REVIEW maximum
```

B2:
```text
SOURCE: X 12000 + Z 7000, included angle 90 degrees
TARGET: Y 12000 + Z 7000, included angle 90 degrees
=> two independent compatible runs => Method B READY; existing mutual-best + winner-gap may promote anchor suggestion to MEDIUM/HIGH
```

## A3 — UI/authority invariant retained, not implemented here
Successor transfer architecture remains:
```text
correspondence -> engineering deltas -> explicit APPLY/EXCLUDE scope
-> selected immutable Writer plan -> Writer 1B readiness
-> mutation -> reparse -> negative assurance
```
Excluded blocked SIF/Tee or NodeName differences remain visible/audited but do not enter Writer readiness. Global stale/preimage/pointer/cardinality/duplicate-write/post-write blockers remain global. Writer 1B is not weakened.

**Qualification verdict: PASS for this approved first core Method A/B increment.**

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- GE-001 / BASELINE + Appendix A before mutation.
- GE-002 / IMPLEMENT + focused exact-blob validation + independent oracle.
