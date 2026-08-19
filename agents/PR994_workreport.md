# PR994 — CII independent multi-base Method A/B core

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE_OD_SCALED_FOCUSED_PASS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — first core increment only
PR: 994
BRANCH: agent/cii-multi-base-core
BASE: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: HANDOVER_RECONCILE
GROUNDING_EPOCH: GE-006 / 2026-08-19
APPENDIX_A_STATUS: PASS_FOR_CURRENT_CORE_INCREMENT
CURRENT_BLOCKER: NONE_FOR_REVIEW; COMPLETE-CHECKOUT VALIDATION NOT_RUN_ENVIRONMENT
HIGHEST_RISK: real-CII calibration must not weaken OD/two-axis/cross-compatible-3D/conflict hard gates
EXACT_NEXT_ACTION: owner review; keep draft and do not merge without explicit authorization.
```

## Handover in 60 Seconds

Current authority is:

```text
independent Method A bases
      OR
independent Method B bases
      ↓
compatible READY evidence accumulates
READY identity collision => AMBIGUOUS
```

Tolerance policy is now owner-defined and implemented:

```text
T = x * SOURCE_OD
x default = 2.0
x configurable
SOURCE OD reference = minimum positive incident SOURCE OD
OD role = tolerance scale only
TARGET OD = no tolerance or identity authority
```

Method A uses per-anchor `residual/(x*SOURCE_OD) <= 1`. Missing SOURCE OD for 3+ anchors is `UNAVAILABLE`; no fixed-mm fallback. Alternate admissible local bases that materially disagree are `METHOD_A_AMBIGUOUS_BASES`.

Method B compares run-length mismatch and angular-equivalent displacement against the same `x*SOURCE_OD` tolerance. It retains the hard minimum two-independent-run gate. Extra planar/full-3D weight is now earned only by **additional cross-revision-compatible mapped runs**. Raw third axes on both sides do not earn extra weight if the third run is incompatible.

Writer/transfer/fixed-field/external-writer authority is untouched.

## Repository Ground Truth

```text
PR994: OPEN / DRAFT / UNMERGED
base: main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1
branch: agent/cii-multi-base-core
base drift at latest compare: 0 behind
merge authority: OWNER_ONLY
```

## Mission / Scope

Implemented:

1. Method A local multi-basis rigid registration.
2. Independent Method A OR loops.
3. Method B executable pipe-run basis.
4. Independent Method B OR loops.
5. Cross-loop identity conflict veto.
6. Configurable `x*SOURCE_OD`, default x=2.
7. Method A evidence weighting.
8. Method B OD-scaled length + angular tolerance.
9. Method B cross-compatible 3D complexity weighting.
10. Focused JS + independent Python qualification.

Not implemented in this PR:

```text
full-screen/UI orchestration
workspace-wide independent-loop propagation
transfer APPLY/EXCLUDE
Writer 1A / Writer 1B changes
transfer policy / transfer plan changes
fixed-field parser changes
SIF/Tee or NodeName mutation
protected external converter/writer changes
workflow changes
```

## Authority and Invariants

### Common tolerance

```text
kind: OD_SCALED
factor: odToleranceFactor, default 2.0
odAuthority: SOURCE
odReferencePolicy: MIN_POSITIVE_INCIDENT_SOURCE_OD
identityRole: TOLERANCE_SCALE_ONLY
TARGET_OD: NO_AUTHORITY
```

### Method A

For anchor `i`:

```text
Ti = x * SOURCE_OD_i
ei = residual_i / Ti
admissible iff max(ei) <= 1
```

Method A weight / 100:

```text
residual quality      35
conditioning          25
spatial extent        20
anchor redundancy     10
basis consensus       10
```

Current provisional bands: HIGH >=85, MEDIUM >=70, otherwise REVIEW. Ambiguity is a hard veto.

### Method B physical compatibility

```text
length error:
  abs(LS-LT) / (x*SOURCE_OD) <= 1

angle error:
  dTheta = abs(thetaS-thetaT)
  dAngular = 2*Lcharacteristic*sin(dTheta/2)
  dAngular / (x*SOURCE_OD) <= 1
```

Run collinearity default remains 0.5 degrees; independent-axis minimum remains 15 degrees. These classify run geometry; they do not replace the OD-scaled cross-revision tolerance.

### Method B weight / 100

```text
geometry complexity          40
run compatibility            20
terminator/topology          15
structural neighbourhood     15
mutual-best + winner gap     10
```

Geometry complexity is based on the **largest compatible independent mapped run set**:

```text
1 compatible axis                    0 / 40; REVIEW hard cap
2 compatible independent axes       24 / 40
3+ compatible coplanar axes         32 / 40
3+ compatible non-coplanar axes     32 + 8*V
V = max min(SOURCE,TARGET) scalar triple product for mapped triples
orthogonal compatible XYZ           40 / 40
```

A raw third axis that changed beyond tolerance does not earn 3D credit. The pair may remain READY from a qualified two-axis basis, but receives only 24/40 geometry complexity.

Current provisional Base Anchor bands: HIGH >=80 with winner gap >= max(required,12); MEDIUM >=65 with required gap; otherwise REVIEW. The two-axis, mutual-best and conflict gates remain hard.

### Negative assurance

Unchanged:

```text
Writer 1A / Writer 1B
transfer policy / transfer plan
parser/fixed-field.js
protected external writer/converter
SIF/Tee and NodeName mutation authority
workflow files
legacy registeredWeight=8 compatibility field for existing M1 consumer
```

New Method A/B weights are separate evidence and do not silently alter legacy M1 weighting.

## Validation Ledger

### V-OD-01 — syntax

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: NONE
Evidence: node --check on current focused production/test files
```

### V-OD-02 — Method A

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-geometry-authority.test.js
Actual: CII Workspace OD-scaled multi-basis geometry authority checks passed.
```

Proves x configurability, SOURCE-OD scaling, TARGET-OD invariance, missing-OD fail closed, and alternate-basis ambiguity.

### V-OD-03 — Method B core

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-multi-base-authority.test.js
Actual: CII independent multi-base OD-scaled A/B authority checks passed.
```

Proves:

```text
SOURCE OD=273, x=2 => T=546 mm
400 mm run mismatch passes x=2, fails x=1
TARGET OD does not change T
3 degree mismatch over 7 m -> inside 546 mm -> READY
5 degree mismatch over 7 m -> outside 546 mm -> REVIEW
one-axis/two-axis/planar/full-3D complexity = 0/24/32/40
changed third run => compatible run count=2 and complexity=24, not false 3D credit
A/B OR and identity conflict veto retained
```

### V-OD-04 — Base Anchor weighting

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED
Command: node tests/cii-workspace-base-anchor-suggestions.test.js
Actual: CII OD-scaled method-qualified paired base-anchor suggestion checks passed.
```

### V-OD-05 — independent Python

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Command: python tests/qualification/cii-workspace-multi-base-oracle.py
Production JS imports: NONE
Actual: Independent CII OD-scaled multi-base Method A/B oracle passed.
```

Current exact focused production/test blobs validated locally include:

```text
86fbb79cb859225b1f980f8d3709dc5286f15c26  cii-workspace-geometry.js
ac2f5eb9422e723b8637e41faf01e555d15becc6  cii-workspace-pipe-runs.js
c782f2c64338845960a7f2d52d8ce25510d849ec  cii-workspace-multi-base-anchor.js
b24fa6f6c709d465b1c92aa61dcbbabfccf5c0be  cii-workspace-anchor-suggestions.js
ecca7bb1daf5bab01afcfcf53dc03e11e47167d5  cii-workspace-core.js
597aa0482265b5e38e7b3fa383d863e4d49615a3  cii-workspace-geometry-authority.test.js
17058db5b05f53403f1b060f89fa38ed15a2c524  cii-workspace-multi-base-authority.test.js
3b1995c6cdb2085eb201323512559537bcb6d651  cii-workspace-base-anchor-suggestions.test.js
b8e8818a560e3eac2da4b7802f2c52205eb5b2f7  cii-workspace-multi-base-oracle.py
```

NOT_RUN:

```text
coordinate-invariance full execution: NOT_RUN_ENVIRONMENT
real CII benchmark: NOT_RUN_ENVIRONMENT
full inherited CII Workspace suite: NOT_RUN_ENVIRONMENT
full repository npm test: NOT_RUN_ENVIRONMENT
browser/Chromium: NOT_RUN_ENVIRONMENT
Writer lifecycle: NOT_RUN_OUT_OF_SCOPE
GitHub Actions/CI: refresh exact head; no PASS claim without observed run
```

## Changed-File Ledger

Expected PR paths are 17 and include only agent custody, five focused CII production modules plus contracts/core seam, focused tests, coordinate/benchmark expectation updates, and the independent Python oracle. No Writer, transfer, fixed-field parser, workflow or external converter file is in scope.

Production physical-line counts at the final focused code checkpoint:

```text
geometry            227
pipe-runs           272
multi-base           71
anchor-suggestions  124
core                 153
```

All remain below the 300-line heuristic.

## Review / CI / Coordination

```text
PR994: DRAFT / UNMERGED
coordination: SAFE
active claim: agents/claims/PR994.yaml
WIP claim: SUPERSEDED / inactive
merge authority: OWNER_ONLY
```

## Continuation State

```text
Do not redo: OR semantics or x*SOURCE_OD decision.
Do not change in this PR: Writer, transfer, fixed-field parser, external writer, workflows.
Validation still required for wider product authority: complete checkout CII suite + real benchmark.
Next action: owner review of current core; keep draft/unmerged.
```

# APPENDIX A — IMPLEMENTATION QUALIFICATION

A1 Method A: independent local OR bases; every triplet validates against all local anchors using `r/(x*SOURCE_OD)`; missing OD fails closed; alternate admissible transform conflict => AMBIGUOUS.

A2 Method B: maximal undirected straight PIPE runs; minimum two independent axes; length/angle differences converted to OD-scaled physical error; extra 3D weight only from additional compatible mapped runs.

A3 UI/transfer: not implemented here; future APPLY/EXCLUDE must remain downstream of correspondence and upstream of unchanged Writer readiness.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

The first PR994 draft used fixed 2 mm Method-A residual/basis tolerance and fixed Method-B 10%/2-degree cross-revision comparison rules. On 2026-08-19 the owner superseded them with configurable `x*SOURCE_OD` default x=2 and requested greater weight for more complex 3D geometry. The later GE-006 refinement further established that extra 3D weight requires cross-revision compatibility of the extra runs, not raw geometric complexity on each side alone.
