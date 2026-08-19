# Agent Work Index

Live GitHub state is authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR994 | CII independent multi-base Method A/B core | `agent/cii-multi-base-core` | DRAFT / OD-SCALED IMPLEMENTATION COMPLETE / FOCUSED JS PASS / INDEPENDENT PYTHON ORACLE PASS / FULL REPO+BROWSER+REAL CII NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL | independent A/B OR loops; Method A `x*SOURCE_OD` residual/basis tolerance; Method B OD-scaled run/angular tolerance + 3D-complexity weight; two-axis gate; conflict veto | SAFE / first core slice of Issue #993 | owner review; complete-checkout/real-CII qualification before wider authority; do not merge without explicit authorization |
| PR992 | CII Target Writer 1B qualified fields | `agent/cii-writer-1b-qualified-slice` | MERGED 2026-08-19 · `168d21bd` / retained REAL BENCHMARK+LIFECYCLE NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL | extended ELEMENT fixed fields; topology-closed conditional OD; existing-block single RESTRANT free-slot create/clear; Writer 1A compatibility; plan-driven negative assurance | HISTORICAL / merged into main | retained NOT_RUN_ENVIRONMENT gates remain historical qualification truth |
| PR991 | CII Target Writer 1A | `agent/cii-writer-1a` | MERGED 2026-08-19 · `edf297f7` | ENGINEERING_CRITICAL | cardinality-preserving WT/P1/T1/T2, existing RIGID, deterministic existing-RESTRANT pointer/slot mutation; Stage06 readiness; reparse/negative assurance | HISTORICAL / merged into main | retained real benchmark/full-suite NOT_RUN_ENVIRONMENT evidence |
| PR990 | Refresh CII compare + writer roadmap | `agent/cii-writer-roadmap-doc` | MERGED 2026-08-19 · `87123aa6` | ENGINEERING_CRITICAL | Writer 1A/1B/2/3 roadmap and mutation-class policy | HISTORICAL / merged into main | none |
| PR989 | Explicit CII base-anchor + approval flow | `agent/cii-anchor-approval-flow` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | topology-only paired base-anchor suggestions; bulk HIGH/MEDIUM approval; Delta Approval projection; approval-gated Transfer Preview | HISTORICAL / merged into main | none |
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | delta-driven read-only transfer policy + Tab3 | HISTORICAL / merged into main | none |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | RESTRANT/SIF/RIGID/hanger custody | HISTORICAL / merged into main | none |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | Compare Review + downstream deltas | HISTORICAL / merged into main | none |
| PR985 | CII anchor-seeded propagation | `agent/cii-anchor-propagation` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | one-anchor multi-hop propagation | HISTORICAL / merged into main | none |
| PR984 | CII M1 Spatial / M2 Network | `agent/cii-m1-m2-evidence` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | independent identity evidence | HISTORICAL / merged into main | none |
| PR983 | CII capability states + benchmark oracle | `agent/cii-oracle-capability-states` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | intake capability truth + oracle | HISTORICAL / merged into main | none |
| PR982 | CII fixed-field parser | `agent/cii-fixed-field-parser` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | fixed-field ELEMENT parsing | HISTORICAL / merged into main | none |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | anchored correspondence foundation | HISTORICAL | none |

## PR994 — current CII base-anchor authority work

Controlling architecture:

```text
independent Method A local bases
          OR
independent Method B local bases
          ↓
compatible READY evidence accumulates
conflicting READY source/target identity claims => AMBIGUOUS
```

Current tolerance authority, superseding the first fixed-tolerance draft:

```text
T = x * SOURCE_OD
x default = 2.0; configurable
SOURCE OD reference = minimum positive incident SOURCE OD
OD role = tolerance scale only; no identity points
TARGET OD = no tolerance or identity authority
```

Method A uses per-anchor normalized residual `r/(x*SOURCE_OD)` and evaluates every qualified local triplet against all anchors. Alternate admissible transforms that materially disagree fail closed with `METHOD_A_AMBIGUOUS_BASES`.

Method B retains the hard minimum two-independent-run gate. Run-length mismatch is compared directly with `x*SOURCE_OD`; included-angle mismatch is converted to transverse displacement `2*L*sin(deltaTheta/2)` and compared with the same tolerance. Geometry complexity weight increases as:

```text
one axis              0 / 40
2 independent axes   24 / 40
3+ coplanar axes     32 / 40
3+ non-coplanar      32 + 8*scalar-triple-product
orthogonal XYZ       40 / 40
```

Focused validation truth:

```text
current production/test syntax: PASS_LOCAL_EXACT_BLOBS
Method A OD-scaled regression: PASS_IMPLEMENTATION_COUPLED
Method B OD-scaled length/angular + complexity regression: PASS_IMPLEMENTATION_COUPLED
Base Anchor weight/target-OD invariance regression: PASS_IMPLEMENTATION_COUPLED
independent Python numerical oracle: PASS_INDEPENDENT_REPRODUCTION
coordinate-invariance execution: NOT_RUN_ENVIRONMENT
real CII benchmark: NOT_RUN_ENVIRONMENT
full repository suite: NOT_RUN_ENVIRONMENT
browser / Chromium: NOT_RUN_ENVIRONMENT
CI: NOT_RUN unless exact-head runs appear
```

Explicitly outside PR994 authority:

```text
full-screen/UI orchestration
transfer APPLY/EXCLUDE
Writer 1A/1B
transfer policy/plan
fixed-field parser
SIF/TEE or NodeName mutation
protected external writer/converter
workflow changes
```

See `agents/PR994_workreport.md`, `agents/status/PR994.yaml`, and `agents/claims/PR994.yaml`.

## PR992 — merged Writer 1B authority

Writer 1B extends Writer 1A only where fixed-field and ownership semantics are independently source-qualified.

Qualified ELEMENT layout:

```text
row 2: WT | insulation thickness | corrosion allowance | T1 | T2 | T3
row 3: T4 | T5 | T6 | T7 | T8 | T9
row 4: P1 | P2 | P3 | P4 | P5 | P6
row 5: P7 | P8 | P9 | protected unrelated fields...
row 6: insulation density | fluid density | protected unrelated fields... | hydro pressure
```

Conditional OD is not blanket PIPE_SIZE authority. It requires approved 1:1 element correspondence, `PIPE` on SOURCE/TARGET, zero reducer pointers, no BEND/RIGID semantic transition, and a topology-closed post-write run. OD remains excluded from M1/M2 identity.

Existing-block RESTRANT slot mutation remains limited to one net CREATE or CLEAR inside an already-owned 24-row block, with target pointer/cardinality and metadata custody preserved. Ambiguous pairing fails closed.

Validation truth retained at merge:

```text
focused Writer 1B execution: PASS_IMPLEMENTATION_COUPLED
real TARGET1/TARGET2 Writer 1B benchmark: NOT_RUN_ENVIRONMENT
Writer 1A TARGET1/TARGET2 compatibility: NOT_RUN_ENVIRONMENT
full shell/browser/inherited CII suite: NOT_RUN_ENVIRONMENT
```

PR992 was merged under explicit owner authority at `main@168d21bd9e9c198d22009f62b6203e4f60fd4ba1`; retained NOT_RUN items remain qualification truth.

## PR991 — merged Writer 1A authority

Writer 1A applies SOURCE engineering values to an approved TARGET only when every approved non-KEEP operation is within the qualified Writer 1A whitelist. Qualified families remain WT/P1/T1/T2, existing RIGID weight and deterministic existing-RESTRANT numeric fields. Target-native pointer/slot/node custody and fail-closed pairing remain authoritative.
