# Agent Work Index

Live GitHub state is authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR992 | CII Target Writer 1B qualified fields | `agent/cii-writer-1b-qualified-slice` | IMPLEMENTATION COMPLETE / FOCUSED PASS / REAL BENCHMARK+LIFECYCLE NOT_RUN_ENVIRONMENT / DRAFT | ENGINEERING_CRITICAL | extended ELEMENT fixed fields; topology-closed conditional OD; existing-block single RESTRANT free-slot create/clear; Writer 1A compatibility; plan-driven negative assurance | SAFE / successor to merged PR991 | merge only on explicit owner acceptance of retained NOT_RUN_ENVIRONMENT gates, otherwise run complete-checkout suite first |
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

## PR992 — current authority

Writer 1B extends Writer 1A only where fixed-field and ownership semantics are independently source-qualified.

Qualified ELEMENT layout:

```text
row 2: WT | insulation thickness | corrosion allowance | T1 | T2 | T3
row 3: T4 | T5 | T6 | T7 | T8 | T9
row 4: P1 | P2 | P3 | P4 | P5 | P6
row 5: P7 | P8 | P9 | protected unrelated fields...
row 6: insulation density | fluid density | protected unrelated fields... | hydro pressure
```

Conditional OD is not blanket PIPE_SIZE authority. It requires approved 1:1 element correspondence, `PIPE` on SOURCE/TARGET, zero reducer pointers, no BEND/RIGID semantic transition, and a topology-closed post-write run: every neighboring TARGET edge at each non-terminal endpoint must already match the proposed SOURCE OD. OD remains excluded from M1/M2 identity.

Existing-block RESTRANT slot mutation is limited to:

```text
6 slots × 4 rows = 24 rows per block
one net CREATE or CLEAR per qualified node correspondence
same target block pointer and same section row count
empty tag/GUID metadata only
unique pairing of unchanged records
```

Writer 1B never creates/deletes restraint blocks or mutates restraint tag/GUID strings. Ambiguous pairing fails closed.

Validation truth:

```text
focused exact-module Writer 1B execution: PASS_IMPLEMENTATION_COUPLED
15-row parser ambiguity case: PASS_IMPLEMENTATION_COUPLED
OD topology-closed eligibility: PASS_IMPLEMENTATION_COUPLED
plan-driven negative assurance: PASS_IMPLEMENTATION_COUPLED
real TARGET1/TARGET2 Writer 1B benchmark: NOT_RUN_ENVIRONMENT
explicit Writer 1A TARGET1/TARGET2 compatibility: NOT_RUN_ENVIRONMENT
full shell/browser/inherited CII Workspace suite: NOT_RUN_ENVIRONMENT
CI status checks: none
```

There is no known engineering defect in the implemented Writer 1B slice. Merge is conditionally defensible only with explicit owner acceptance of the retained `NOT_RUN_ENVIRONMENT` gates. Under strict qualification, run those committed tests in a complete checkout first.

Explicitly outside PR992 authority:

```text
SIF/TEE semantic rewrite
new/delete RESTRANT block or pointer re-indexing
multiple-slot restraint cardinality changes
restraint tag/GUID string mutation
BEND/FORCMNT/DISPLMNT/UNIFORM/WIND/OFFSETS/ALLOWBLS mutation
node/element/connectivity/geometry mutation
workflow changes
protected external writer changes
```

See `agents/PR992_workreport.md`, `agents/status/PR992.yaml`, and `agents/claims/PR992.yaml`.

## PR991 — merged Writer 1A authority

Writer 1A applies SOURCE engineering values to an approved TARGET only when every approved non-KEEP operation is compatible with the qualified Writer 1A whitelist.

Executable mutation families merged in PR991:

```text
ELEMENT WT
ELEMENT P1
ELEMENT T1
ELEMENT T2
existing pointer-bound RIGID weight
existing RESTRANT numeric fields through qualified pointer/slot pairing
```

Each existing restraint retains target-native pointer/slot/node custody. Pairing uses singleton cardinality or exhaustive global assignment up to `6! = 720`; exact GUID/tag, approved mapped connecting-node identity and direction cosines are stable evidence. Slot order and mutable type/stiffness/gap/friction are not identity evidence. A tied best assignment fails closed.

PR991 focused execution passed before merge. Real TARGET1/TARGET2/full-browser runtime remained `NOT_RUN_ENVIRONMENT` and was preserved truthfully under the owner's explicit merge authorization.
