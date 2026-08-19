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
PR_HEAD_OBSERVED: e291d938a51984fa0893d7c9f80e086cf9ed8fa5 at PR creation; later custody commits advance head
REPORT_BASIS_HEAD: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1 + PR994 branch diff
MAIN_HEAD_LAST_CHECKED: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_BASE: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
REPORT_SYNC: GE-003
APPENDIX_A_STATUS: PASS_FOR_APPROVED_CORE_A_B_INCREMENT
GROUNDING_EPOCH: GE-003 / 2026-08-19
CURRENT_STAGE: HANDOVER_RECONCILE
LAST_COMPLETED_STAGE: IMPLEMENT_AND_FOCUSED_VALIDATE
CURRENT_BLOCKER: NONE_FOR_REVIEW; COMPLETE_CHECKOUT_VALIDATION_NOT_RUN
HIGHEST_RISK: successor workspace orchestration must preserve independent-loop provenance and conflict veto
EXACT_NEXT_ACTION: owner review of PR994 core policy/sample; do not merge without explicit authorization.
```

## 2. Handover in 60 Seconds

PR994 is the first engineering-critical core slice of Issue #993. It establishes **independent Method A and Method B base loops combined as OR with conflict veto**. Separate local Method A bases may have different rigid transforms and both remain READY. Inside one local Method A base, every qualified non-collinear triplet hypothesis is checked against all anchors in that base; materially different residual-qualified transforms return `METHOD_A_AMBIGUOUS_BASES`. Method B now derives executable undirected straight-pipe runs and cannot promote a Base Anchor to MEDIUM/HIGH unless SOURCE and TARGET each have at least two independent compatible runs.

Focused JS validation and an independent Python numerical reproduction pass against exact published production/test Git blobs. Full repository, browser and real-CII benchmark execution remains `NOT_RUN_ENVIRONMENT`. This PR does not implement full-screen UI, workspace multi-loop orchestration, transfer APPLY/EXCLUDE, SIF/Tee normalization, or Writer changes.

## 3. Repository Ground Truth

```text
repository: reallaksh19/XML_Compare_Utilities
PR: 994
state: OPEN / DRAFT / UNMERGED
branch: agent/cii-multi-base-core
base: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
source task: Issue #993
merge authority: OWNER_ONLY
```

At PR creation GitHub reported 12 changed paths. Temporary WIP custody files are being replaced by these PR-numbered records; final changed-file reconciliation must use the latest head.

## 4. Mission / Scope / Acceptance

Approved core scope:

1. Method A local multi-basis 3D rigid qualification.
2. Independent Method A local bases combined as OR.
3. Method B straight-pipe-run extraction and hard two-axis confidence gate.
4. Independent Method B loops combined as OR.
5. Cross-loop source/target identity conflict veto.
6. Method B evidence integration into Base Anchor suggestions.
7. Synthetic regression samples plus independent numerical oracle.

Explicitly out of scope: full-screen/UI, transfer selection, Writer 1A/1B, transfer policy/plan, fixed-field parser, external converter/writer, SIF/Tee and NodeName mutation, workflows.

## 5. Current Implementation State

| Item | State | Validation |
|---|---|---|
| Method A enumerate local triplet hypotheses | COMPLETE | PASS |
| Method A validate every hypothesis against all local anchors | COMPLETE | PASS |
| Method A local ambiguity fail-closed | COMPLETE | PASS |
| independent Method A bases with different transforms | COMPLETE | PASS |
| Method B run extraction | COMPLETE | PASS |
| Method B two-axis hard gate | COMPLETE | PASS |
| Method B anchor-suggestion confidence gate | COMPLETE | PASS |
| OR union + cross-loop conflict veto | COMPLETE | PASS |
| complete workspace orchestration/UI | NOT_IMPLEMENTED_THIS_SLICE | NOT_RUN |

## 6. Active Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | DEC | ACCEPTED | A/B independent loops use OR + conflict veto |
| DEC-002 | DEC | ACCEPTED | no first-success or majority-vote identity authority |
| IMP-001 | IMP | COMPLETE | Method A alternate-basis diagnostics |
| IMP-002 | IMP | COMPLETE | Method B two-axis gate |
| IMP-003 | IMP | COMPLETE | cross-loop source/target collision veto |
| RISK-001 | RISK | OPEN_SUCCESSOR | existing workspace remains globally transform-shaped until successor orchestration |
| RISK-002 | RISK | OPEN_SUCCESSOR | Method B policy thresholds need real-model qualification; no silent loosening permitted |

## 7. Current Technical Diagnosis

Baseline defects:

```text
Method A: first usable non-collinear triplet could hide another acceptable but materially different basis.
Method B: topology salience could produce HIGH without proving two independent geometric directions.
```

Implemented policy:

```text
LOCAL METHOD A BASE
  enumerate qualified triplets
  -> validate each on all local anchors
  -> no admissible transform: INCOMPATIBLE
  -> multiple admissible materially different transforms: AMBIGUOUS
  -> compatible admissible family: READY

INDEPENDENT BASE LOOPS
  A1 OR A2 OR ... OR B1 OR B2 ...
  compatible READY claims accumulate
  conflicting READY source/target identity claims => AMBIGUOUS
```

## 8. Authority and Invariants

### Method A numerical policy

```text
anchorResidualToleranceMm = 2.0 mm                existing default
nonCollinearSinTolerance = 1e-4                    existing default
basisTransformAgreementToleranceMm = 2.0 mm        new fail-closed default/inherits residual tolerance
```

Transform disagreement uses relative rotation, displacement at source-base centroid, source-base radius rotation bound `2*r*sin(theta/2)`, and optional probe-point disagreement. No arbitrary averaging, scale, shear or reflection.

### Method B numerical policy

```text
runCollinearAngleDeg = 0.5 deg
axisLabelSnapDeg = 2.0 deg              presentation only
independentAxisAngleDeg = 15.0 deg
runIncludedAngleToleranceDeg = 2.0 deg
runLengthRelativeTolerance = 0.10
maxRunElements = 256
```

Opposite collinear rays merge into one undirected run. Run compatibility uses rotation-invariant included angle, run length and terminator structure. OD, WT, process values and node-number magnitude/offset remain excluded from Method B identity.

These are explicit engineering policy defaults, not truths inferred from one test. Do not loosen them to make a benchmark pass without separate qualification.

### Negative assurance

Unchanged:

```text
Writer 1A / Writer 1B
transfer policy / transfer plan
parser/fixed-field.js
protected external CII writer/converter
SIF/Tee and NodeName mutation authority
workflow files
```

## 9. Current Validation

### V-001 — syntax
`PASS / LOCAL_EXECUTION / NONE` — `node --check` on 4 focused production modules and 3 JS tests.

### V-002 — Method A geometry
`PASS / LOCAL_EXECUTION / IMPLEMENTATION_COUPLED`

```text
node tests/cii-workspace-geometry-authority.test.js
=> CII Workspace multi-basis geometry authority checks passed.
```

### V-003 — Method B anchor qualification
`PASS / LOCAL_EXECUTION / IMPLEMENTATION_COUPLED`

```text
node tests/cii-workspace-base-anchor-suggestions.test.js
=> CII method-qualified paired base-anchor suggestion checks passed.
```

### V-004 — independent OR core
`PASS / LOCAL_EXECUTION / IMPLEMENTATION_COUPLED`

```text
node tests/cii-workspace-multi-base-authority.test.js
=> CII independent multi-base A/B OR authority checks passed.
```

Proof includes:
- Method A local translations `(0,+100,0)` and `(0,-200,0)` both READY;
- Method B alone can make union READY;
- Method A READY + one-axis Method B REVIEW remains READY;
- same SOURCE claimed by READY loops for different TARGETs => `CROSS_LOOP_ANCHOR_IDENTITY_CONFLICT`.

### V-005 — independent Python oracle
`PASS / LOCAL_EXECUTION / INDEPENDENT_REPRODUCTION`

```text
python tests/qualification/cii-workspace-multi-base-oracle.py
=> Independent CII multi-base Method A/B oracle passed.
```

No production JS import. Independently proves:

```text
A1 translation = (0,+100,0) mm
A2 translation = (0,-200,0) mm
ambiguous basis max residuals = sqrt(2) = 1.414213562... mm <= 2 mm
relative ambiguous basis rotation ~= 90 deg
one-axis undirected angle = 0 deg
X+Z and Y+Z two-axis included angles = 90 deg
```

### Exact production/test Git blobs executed

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
browser / Chromium: NOT_RUN_ENVIRONMENT
real CII benchmark: NOT_RUN_ENVIRONMENT
Writer 1A/1B lifecycle: NOT_RUN_OUT_OF_SCOPE
GitHub Actions / CI: NOT_RUN
```

No unexecuted check is represented as PASS.

## 10. Changed-File Ledger

Intended production/test paths:

| File | Purpose | Validation |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-contracts.js` | schemas | syntax/blob |
| `tabs/cii-workspace/cii-workspace-geometry.js` | Method A local multi-basis | V-001/V-002/V-005 |
| `tabs/cii-workspace/cii-workspace-pipe-runs.js` | Method B runs | V-001/V-003/V-004/V-005 |
| `tabs/cii-workspace/cii-workspace-multi-base-anchor.js` | OR/conflict veto | V-001/V-004 |
| `tabs/cii-workspace/cii-workspace-anchor-suggestions.js` | two-axis confidence gate | V-001/V-003 |
| `tests/cii-workspace-geometry-authority.test.js` | Method A regression | PASS |
| `tests/cii-workspace-base-anchor-suggestions.test.js` | Method B regression | PASS |
| `tests/cii-workspace-multi-base-authority.test.js` | OR/conflict regression | PASS |
| `tests/qualification/cii-workspace-multi-base-oracle.py` | independent oracle | PASS |
| `agents/PR994_workreport.md` | recovery authority | source inspection |
| `agents/status/PR994.yaml` | status | source inspection |
| `agents/claims/PR994.yaml` | scope claim | source inspection |
| `agents/MASTER_INDEX.md` | repo coordination | source inspection |

Production physical lines: geometry 177, pipe-runs 175, multi-base 70, anchor-suggestions 110; all under 300-line heuristic.

## 11. Review / CI State

PR994 is draft and unmerged. At creation GitHub reported `mergeable=false`; this may be transient computation or later require inspection, but no merge is authorized in any case. No CI run is claimed.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: PR994
CLAIM_RECORD: PR994
FILE_OVERLAP: no active CII multi-base PR found at grounding
AUTHORITY_OVERLAP: successor to merged CII PR989/992; Writer authority explicitly excluded
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: PR994 diff + this report.
Do not redo: owner OR-vs-AND decision or Appendix A.
Do not change: Writer, transfer, fixed-field parser, external writer, workflows in this PR.
Validation still required for wider product authority: complete checkout CII suite, real CII benchmark, later UI/orchestration tests.
Highest-risk remaining item: successor orchestration must use independent-loop provenance; do not collapse to one global transform.
Exact next action: owner review of the core/sample; keep draft/unmerged.
```

## 14. Takeover / Custody Chain

- `GE-001`: grounded live main/Issue #993/source boundaries and completed Appendix A before mutation.
- `GE-002`: implemented and executed focused exact-blob JS + independent Python proof.
- `GE-003`: PR994 created draft; WIP custody converted to PR-numbered authority.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

## A1 — Method A policy
Independent local bases are OR. Inside one local base, all qualified non-collinear triplets are independent rigid hypotheses and every hypothesis is checked against all anchors assigned to that base. Two residual-qualified bases with material transform disagreement make that local base `METHOD_A_AMBIGUOUS_BASES`; no iteration-order or majority selection.

Numerical ambiguity:

```text
SOURCE: (0,0,0), (1000,0,0), (2000,1,0), (3000,0,1)
TARGET: (0,0,0), (1000,0,0), (2000,1,0), (3000,1,0)
B012 max residual = sqrt(2)=1.414214 mm
B013 max residual = sqrt(2)=1.414214 mm
relative rotation ~=90 deg
=> AMBIGUOUS
```

Separate local base sample:

```text
A1 t=(0,+100,0) READY
A2 t=(0,-200,0) READY
no identity collision => both survive OR
```

## A2 — Method B policy
A run is a maximal connected straight PIPE sequence. Continue through degree-2 nodes only within 0.5°; stop at terminal, branch, component transition, direction change, invalid geometry or 256-edge cap. Opposite collinear rays merge into one undirected run. Independent axes require >=15°. Cross-revision pair comparison uses <=2° included-angle delta, <=10% run-length relative delta, and compatible terminators. OD/WT/process/node-number offset are excluded.

```text
B1: 20 m straight line, midpoint anchor -> left/right undirected angle 0° -> one run -> REVIEW max.
B2: SOURCE X12m+Z7m; TARGET Y12m+Z7m; both 90° -> compatible two-axis basis -> Method B READY.
```

## A3 — transfer/UI invariant, not implemented here

```text
correspondence -> engineering deltas -> APPLY/EXCLUDE scope
-> selected immutable Writer plan -> Writer 1B readiness
-> mutation -> reparse -> negative assurance
```

Excluded blocked SIF/Tee/NodeName changes stay visible but do not enter Writer readiness. Global stale/preimage/pointer/cardinality/duplicate-write/post-write blockers remain global. Writer 1B is not weakened.

**APPENDIX A VERDICT: PASS for PR994 core scope.**

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- GE-001 BASELINE / qualification before mutation.
- GE-002 IMPLEMENT / focused validation.
- GE-003 DRAFT PR / custody migration.
