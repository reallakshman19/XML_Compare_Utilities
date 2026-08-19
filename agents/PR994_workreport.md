# PR994 — CII independent multi-base Method A/B core

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE_OD_SCALED_FOCUSED_PASS
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
REPORT_BASIS_HEAD: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1 + current PR994 branch
MAIN_HEAD_LAST_CHECKED: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_BASE: 168d21bd9e9c198d22009f62b6203e4f60fd4ba1
REPORT_SYNC: GE-005
APPENDIX_A_STATUS: PASS_FOR_CURRENT_CORE_INCREMENT
GROUNDING_EPOCH: GE-005 / 2026-08-19
CURRENT_STAGE: HANDOVER_RECONCILE
LAST_COMPLETED_STAGE: IMPLEMENT_OD_SCALE_WEIGHT_VALIDATE
CURRENT_BLOCKER: NONE_FOR_REVIEW; COMPLETE_CHECKOUT VALIDATION NOT_RUN_ENVIRONMENT
HIGHEST_RISK: real-CII calibration must not weaken hard SOURCE-OD/two-axis/conflict gates
EXACT_NEXT_ACTION: owner review of updated OD-scaled core; keep PR draft and do not merge without explicit authorization.
```

## 2. Handover in 60 Seconds

PR994 implements the first core slice of Issue #993. Independent Method A and Method B base loops combine as:

```text
A1 OR A2 OR ... OR B1 OR B2 ...
compatible READY evidence accumulates
READY identity collisions => AMBIGUOUS
```

The owner subsequently superseded the first fixed-tolerance draft with this policy:

```text
T = x * SOURCE_OD
x default = 2.0
x configurable
SOURCE OD only
OD role = tolerance scale only, never identity score
TARGET OD = no tolerance or identity authority
```

Method A now accepts a local rigid hypothesis only when every anchor satisfies `residual/(x*SOURCE_OD) <= 1`. Missing SOURCE OD for a 3+ anchor Method A base fails to `UNAVAILABLE`; there is no fixed-mm fallback. Basis disagreement remains fail-closed.

Method B now judges run-length mismatch and angular mismatch using the same OD-scaled physical tolerance. Angular disagreement is converted to transverse displacement `2*L*sin(deltaTheta/2)`. The hard two-axis gate remains. Geometry complexity weight increases from one-axis to two-axis to planar multi-axis to genuine non-coplanar 3D.

Writer 1A/1B, transfer policy/plan, fixed-field parser, SIF/Tee mutation, NodeName mutation, workflows and the protected external writer remain unchanged.

## 3. Repository Ground Truth

```text
repository: reallaksh19/XML_Compare_Utilities
PR: 994
state: OPEN / DRAFT / UNMERGED
base: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
branch: agent/cii-multi-base-core
base drift at latest grounding: 0 commits behind
merge authority: OWNER_ONLY
```

Live GitHub remains authoritative over this report. PR992 is already merged into the above main baseline.

## 4. Mission / Scope / Acceptance

Current approved core mission:

1. Method A local multi-basis rigid registration.
2. Independent Method A bases combined as OR.
3. Method B executable pipe-run extraction and two-axis hard gate.
4. Independent Method B loops combined as OR.
5. Cross-loop source/target identity conflict veto.
6. Configurable `x*SOURCE_OD` tolerance, default `x=2`.
7. Method A explicit evidence-weight breakdown.
8. Method B higher weight for more distinctive 3D geometry.
9. Focused JS regression + independent Python numerical reproduction.

Explicit non-goals:

```text
full-screen/UI orchestration
workspace-wide independent-loop propagation
transfer APPLY/EXCLUDE
Writer 1A / Writer 1B
transfer policy / transfer plan
fixed-field parser
SIF/Tee or NodeName mutation
protected external CII writer/converter
workflow files
```

## 5. Current Implementation State

| Item | Implementation | Production integration | Validation | Remaining |
|---|---|---|---|---|
| Method A alternate bases | COMPLETE | geometry API | PASS focused | real CII/full suite |
| Method A OD-scaled tolerance | COMPLETE | core supplies SOURCE OD per locked anchor | PASS focused | real CII |
| Method A weight | COMPLETE | loop diagnostics | PASS focused | calibration |
| Method B run extraction | COMPLETE | Base Anchor suggestions | PASS focused | real CII |
| Method B OD-scaled length/angle | COMPLETE | Base Anchor suggestions | PASS focused | calibration |
| Method B 3D complexity weight | COMPLETE | Base Anchor suggestions | PASS focused | calibration |
| A/B OR + conflict veto | COMPLETE | multi-base core | PASS focused | workspace orchestration |
| Issue #993 UI/transfer | NOT_IMPLEMENTED | none | NOT_RUN | successor |

## 6. Active Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | DEC | ACCEPTED | independent A/B local loops use OR + conflict veto |
| DEC-002 | DEC | ACCEPTED | no first-success or majority-vote identity authority |
| DEC-003 | DEC | ACCEPTED | tolerance is configurable `x*SOURCE_OD`, default x=2 |
| DEC-004 | DEC | ACCEPTED | OD scales tolerance only; it does not earn identity confidence |
| DEC-005 | DEC | ACCEPTED | TARGET OD cannot alter correspondence tolerance |
| IMP-001 | IMP | COMPLETE | Method A normalized OD-scaled residuals |
| IMP-002 | IMP | COMPLETE | Method B OD-scaled run and angular-equivalent displacement checks |
| IMP-003 | IMP | COMPLETE | Method B dimension/3D complexity weighting |
| RISK-001 | RISK | OPEN_SUCCESSOR | complete workspace is still single-global-transform shaped until successor orchestration |
| RISK-002 | RISK | OPEN_CALIBRATION | score breakpoints are policy defaults; calibrate on real CII without weakening hard gates |

## 7. Current Technical Diagnosis

### Method A

```text
for each accepted local anchor i:
    Ti = x * SOURCE_OD_i
    ei = residual_i / Ti

hypothesis admissible iff max(ei) <= 1
```

All qualified non-collinear triplets are enumerated. Every triplet hypothesis is validated against every anchor assigned to that local base. If admissible hypotheses materially disagree beyond the OD-scaled base tolerance, result is `METHOD_A_AMBIGUOUS_BASES`.

### Method B

At the SOURCE anchor node:

```text
ODref = minimum positive incident SOURCE PIPE OD
T = x * ODref
```

Run-length evidence:

```text
normalizedLengthError = abs(LS-LT)/T
```

Angular evidence:

```text
dTheta = abs(thetaS-thetaT)
dAngular = 2*Lcharacteristic*sin(dTheta/2)
normalizedAngleError = dAngular/T
```

A mapped two-axis basis is geometrically compatible only when both normalized errors are <=1 and terminator classes are compatible.

## 8. Authority and Invariants

### Common tolerance policy

```text
kind: OD_SCALED
factor: odToleranceFactor, default 2.0
odAuthority: SOURCE
odReferencePolicy: MIN_POSITIVE_INCIDENT_SOURCE_OD
identityRole: TOLERANCE_SCALE_ONLY
TARGET_OD: no tolerance authority
```

There is no fixed 2 mm fallback in Method A and no fixed 10%/2-degree cross-revision compatibility gate in Method B.

### Method A weight / 100

```text
residual quality      35
conditioning          25
spatial extent        20
anchor redundancy     10
basis consensus       10
```

Current provisional confidence bands:

```text
HIGH   >=85
MEDIUM >=70
REVIEW otherwise
```

Ambiguity is a hard veto; weight cannot override it.

### Method B weight / 100

```text
geometry complexity          40
run compatibility            20
terminator/topology          15
structural neighbourhood     15
mutual-best + winner gap     10
```

Geometry-complexity component:

```text
one axis                    0 / 40; REVIEW hard cap
exactly two independent    24 / 40
3+ coplanar axes           32 / 40
3+ non-coplanar axes       32 + 8*V
V = max absolute scalar triple product, capped at 1
orthogonal X/Y/Z           40 / 40
```

Current provisional Base Anchor bands:

```text
HIGH   weight>=80 and winnerGap>=max(requiredGap,12)
MEDIUM weight>=65 and winnerGap>=requiredGap
REVIEW otherwise
```

The minimum two-axis gate and mutual-best behavior remain hard gates. OD/WT/process values/node numbering do not earn Method B identity score.

### Negative assurance

Unchanged:

```text
Writer 1A / Writer 1B
transfer policy / plan
parser/fixed-field.js
protected external writer/converter
SIF/Tee and NodeName mutation
workflow files
legacy registeredWeight=8 compatibility field for existing M1 consumer
```

The new Method A/B engineering weights are separate evidence fields; they do not silently alter the legacy M1 weight.

## 9. Current Validation

### V-OD-01 — exact-blob syntax

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: NONE
Evidence: node --check on current geometry, pipe-runs, multi-base, anchor-suggestions, core and focused tests
```

### V-OD-02 — Method A OD scale

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-geometry-authority.test.js
Actual: CII Workspace OD-scaled multi-basis geometry authority checks passed.
```

Proves:

```text
OD 88.9, x=2 => 177.8 mm
OD 100, 150 mm distortion: x=1 fails, x=2 passes
TARGET OD 20 vs 1000 leaves SOURCE-OD tolerance unchanged
missing SOURCE OD at 3+ anchors => UNAVAILABLE
ambiguous alternate bases remain AMBIGUOUS
```

### V-OD-03 — Method B scale and complexity

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-multi-base-authority.test.js
Actual: CII independent multi-base OD-scaled A/B authority checks passed.
```

Proves:

```text
SOURCE OD 273, x=2 => 546 mm
400 mm length mismatch passes x=2, fails x=1
TARGET OD 88.9 vs 1000 leaves tolerance 546 mm
3 degree two-axis angular mismatch over 7 m => within 546 mm => READY
5 degree mismatch over 7 m => exceeds 546 mm => REVIEW
complexity: one-axis 0, two-axis 24, planar multi-axis 32, orthogonal 3D 40
A1 OR A2 remains READY with different transforms
READY identity collision => AMBIGUOUS
```

### V-OD-04 — Base Anchor weighting

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-base-anchor-suggestions.test.js
Actual: CII OD-scaled method-qualified paired base-anchor suggestion checks passed.
```

Proves one-axis REVIEW cap, two-axis HIGH eligibility under strong structural evidence, explicit Method-B weight, and TARGET-OD invariance.

### V-OD-05 — independent numerical oracle

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Command: python tests/qualification/cii-workspace-multi-base-oracle.py
Production JS imports: NONE
Actual: Independent CII OD-scaled multi-base Method A/B oracle passed.
```

Independent equations reproduce `x*OD`, Method A configurable-x behavior, ambiguity, Method B length and angular tolerance, and 0/24/32/40 geometry weights.

### Current exact production blobs validated

```text
86fbb79cb859225b1f980f8d3709dc5286f15c26  cii-workspace-geometry.js
7e61e55d68390bd795a3cca2f093ca61dc9c8973  cii-workspace-pipe-runs.js
c782f2c64338845960a7f2d52d8ce25510d849ec  cii-workspace-multi-base-anchor.js
b24fa6f6c709d465b1c92aa61dcbbabfccf5c0be  cii-workspace-anchor-suggestions.js
ecca7bb1daf5bab01afcfcf53dc03e11e47167d5  cii-workspace-core.js
597aa0482265b5e38e7b3fa383d863e4d49615a3  cii-workspace-geometry-authority.test.js
6c328ac0374401eb07407438938230b0382425ec  cii-workspace-multi-base-authority.test.js
3b1995c6cdb2085eb201323512559537bcb6d651  cii-workspace-base-anchor-suggestions.test.js
b8e8818a560e3eac2da4b7802f2c52205eb5b2f7  cii-workspace-multi-base-oracle.py
```

### Syntax-only / not fully executed in reconstructed environment

```text
tests/cii-workspace-coordinate-invariance.test.js: node --check PASS; execution NOT_RUN_ENVIRONMENT
tests/cii-workspace-benchmark-base-anchor.test.js: node --check PASS; real benchmark execution NOT_RUN_ENVIRONMENT
```

### NOT_RUN

```text
full repository npm test: NOT_RUN_ENVIRONMENT
full inherited CII Workspace suite: NOT_RUN_ENVIRONMENT
browser/Chromium: NOT_RUN_ENVIRONMENT
real CII benchmark: NOT_RUN_ENVIRONMENT
GitHub Actions/CI: NOT_RUN unless exact-head runs appear later
Writer lifecycle: NOT_RUN_OUT_OF_SCOPE
```

No unexecuted check is represented as PASS.

## 10. Changed-File Ledger

Intended production/test paths in this PR include:

```text
agents/MASTER_INDEX.md
agents/PR994_workreport.md
agents/status/PR994.yaml
agents/claims/PR994.yaml
agents/claims/WIP-CII993-MULTIBASE.yaml        historical inactive pointer
tabs/cii-workspace/cii-workspace-contracts.js
tabs/cii-workspace/cii-workspace-geometry.js
tabs/cii-workspace/cii-workspace-pipe-runs.js
tabs/cii-workspace/cii-workspace-multi-base-anchor.js
tabs/cii-workspace/cii-workspace-anchor-suggestions.js
tabs/cii-workspace/cii-workspace-core.js
tests/cii-workspace-geometry-authority.test.js
tests/cii-workspace-base-anchor-suggestions.test.js
tests/cii-workspace-multi-base-authority.test.js
tests/cii-workspace-coordinate-invariance.test.js
tests/cii-workspace-benchmark-base-anchor.test.js
tests/qualification/cii-workspace-multi-base-oracle.py
```

Production physical-line counts on the OD-scaled checkpoint:

```text
geometry            227
pipe-runs           212
multi-base           71
anchor-suggestions  124
core                 153
```

All remain below the 300-line heuristic. Final GitHub changed-file reconciliation must be refreshed after this report commit.

## 11. Review / CI State

```text
PR994: OPEN / DRAFT / UNMERGED
merge authority: OWNER_ONLY
review decision: pending owner
CI: refresh after current head
```

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: YES
STATUS_RECORD: agents/status/PR994.yaml
CLAIM_RECORD: agents/claims/PR994.yaml
WIP_CLAIM: SUPERSEDED / active_authority=false
FILE/AUTHORITY_OVERLAP: no active competing CII multi-base PR identified at grounding
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: current PR994 diff and this report.
Do not redo: owner OR semantics and x*SOURCE_OD policy.
Do not change: Writer, transfer policy/plan, fixed-field parser, protected external writer, workflows.
Validation still required for wider authority: complete checkout CII suite, real benchmark, browser where applicable.
Highest risk: calibrating scores from real data without weakening OD/two-axis/conflict hard gates.
Exact next action: owner review; keep draft/unmerged.
```

## 14. Takeover / Custody Chain

- GE-001: original #993 baseline grounding and Appendix A.
- GE-002: initial Method A multi-basis + Method B two-axis core.
- GE-003/004: PR994 draft publication, OR core production consumer, custody reconciliation.
- GE-005: owner superseded fixed tolerance with configurable `x*SOURCE_OD`, default x=2; Method B 3D complexity weighting added; focused validation rerun.

# APPENDIX A — IMPLEMENTATION QUALIFICATION

## A1 — Method A

Policy is independent local bases under OR. Within each local base, every qualified triplet hypothesis is validated against all assigned anchors using per-anchor normalized residual `r/(x*SOURCE_OD)`. No SOURCE OD => no Method A tolerance authority. Alternate admissible bases that materially disagree fail closed. Different independent local bases need not share one transform.

## A2 — Method B

A run is a maximal undirected straight PIPE run through degree-2 continuation. Opposite collinear rays merge. At least two independent directions are required. Cross-revision geometric mismatch is normalized by `x*minimum-positive-incident-SOURCE-OD`. Angular mismatch is converted to transverse displacement. Complexity weight increases with independent dimension and scalar triple-product evidence. OD never earns identity points.

## A3 — UI/transfer invariant

Not implemented in this core slice. Selective transfer must remain downstream of correspondence/delta authority and upstream of unchanged Writer readiness. Unsupported excluded deltas remain visible; selected unsupported/global structure blockers remain fail-closed.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

The initial PR994 draft used a fixed 2 mm Method-A residual/basis tolerance and fixed Method-B cross-revision 2-degree/10% comparison defaults. On 2026-08-19 the owner explicitly superseded that policy with configurable `x*OD`, default `x=2`, and requested greater Method-B weight for more complex 3D geometry. Those fixed comparison tolerances are historical only and must not be restored as current authority.
