# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`; this index is the repo-wide coordination and continuation view.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR999 | CII Compare Review / Engineering Delta / effective TARGET clarity | `agent/cii-review-transfer-clarity` | DRAFT / IMPLEMENTATION COMPLETE / FOCUSED EXACT-BLOB PASS / FULL SHELL+BROWSER NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI_PRESENTATION | human-readable structured values; SOURCE candidate vs Current TARGET vs Effective TARGET after apply; Writer-ready conservative outcome projection | SAFE / successor to merged PR998 | final reconcile; owner review; do not merge without explicit authorization |
| PR998 | CII multi-base UI authority fix + concept-note refresh | `agent/cii-multi-base-ui-fix` | MERGED 2026-08-19 · `7d63abe8` / retained UI+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI_AUTHORITY_SEAM | engineer multi-select of independent A/B bases -> explicit `baseLoops[]`; A+B two-loop projection; manual/qualified exclusivity; concept-note refresh | HISTORICAL / merged after squash-history normalization | retained NOT_RUN_ENVIRONMENT gates remain qualification truth |
| PR997 | CII full-screen method-qualified Base Anchor engineering UI | `agent/cii-fullscreen-anchor-evidence-ui` | MERGED 2026-08-19 · `a2b8b055` / retained JS+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI | full viewport; SOURCE→TARGET chrome; Method A/B/A+B/Landmark evidence cards; structured details | HISTORICAL / merged into main | retained NOT_RUN_ENVIRONMENT gates remain qualification truth |
| PR996 | CII Base Anchor Method A/B discovery + fusion | `agent/cii-base-anchor-method-fusion` | MERGED 2026-08-19 · `df19d183` / retained JS+benchmark NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL | diversified Method-A discovery; spatial runner-up recovery; evidence-derived A/B/A+B/Landmark labels; 3-anchor REVIEW cap; B mutual-best+gap | HISTORICAL | retained gates |
| PR995 | CII independent multi-base correspondence orchestration | `agent/cii-multi-base-orchestration` | MERGED 2026-08-19 · `d28e33c1` | ENGINEERING_CRITICAL | explicit A/B loops; per-loop correspondence; OR union; node/element conflict veto; A+B provenance | HISTORICAL | retained gates |
| PR994 | CII independent multi-base Method A/B core | `agent/cii-multi-base-core` | MERGED 2026-08-19 · `daf3be0a` | ENGINEERING_CRITICAL | `x*SOURCE_OD`; Method-A rigid bases; Method-B OD-scaled run/angular tolerance and 3D weight; conflict veto | HISTORICAL | retained gates |
| PR992 | CII Target Writer 1B qualified fields | `agent/cii-writer-1b-qualified-slice` | MERGED 2026-08-19 · `168d21bd` | ENGINEERING_CRITICAL | extended fixed fields; conditional OD; existing-block restraint free-slot create/clear | HISTORICAL | retained gates |
| PR991 | CII Target Writer 1A | `agent/cii-writer-1a` | MERGED 2026-08-19 · `edf297f7` | ENGINEERING_CRITICAL | WT/P1/T1/T2, existing RIGID and deterministic existing-RESTRANT numeric fields | HISTORICAL | retained gates |
| PR990 | CII writer roadmap | `agent/cii-writer-roadmap-doc` | MERGED 2026-08-19 · `87123aa6` | ENGINEERING_CRITICAL | Writer 1A/1B/2/3 roadmap and mutation-class policy | HISTORICAL | none |
| PR989 | Explicit base-anchor + approval flow | `agent/cii-anchor-approval-flow` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | paired Base Anchor suggestions; approval-gated Transfer Preview | HISTORICAL | none |
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | delta-driven transfer policy + Tab 3 | HISTORICAL | none |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | RESTRANT/SIF/RIGID/hanger custody | HISTORICAL | none |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | Compare Review and downstream deltas | HISTORICAL | none |
| PR985 | CII anchor-seeded propagation | `agent/cii-anchor-propagation` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | one-anchor multi-hop propagation | HISTORICAL | none |
| PR984 | CII M1 Spatial / M2 Network | `agent/cii-m1-m2-evidence` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | independent row-level identity evidence | HISTORICAL | none |
| PR983 | CII capability states + benchmark oracle | `agent/cii-oracle-capability-states` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | intake capability truth + oracle | HISTORICAL | none |
| PR982 | CII fixed-field parser | `agent/cii-fixed-field-parser` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | fixed-field ELEMENT parsing | HISTORICAL | none |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | anchored correspondence foundation | HISTORICAL | none |

## PR999 — current Compare Review / Delta / Transfer presentation

PR999 does **not** create a new engineering authority. It presents the already-qualified delta/transfer contracts without making a proposal look applied.

```text
engineering delta
   |
   +-- SOURCE candidate
   +-- Current TARGET
   +-- Effective TARGET after apply
              |
              +-- pending/rejected -> Current TARGET
              +-- approval not rebound -> Current TARGET / REBUILD PREVIEW
              +-- no operation -> Current TARGET
              +-- KEEP/PROTECTED/BLOCKED -> Current TARGET
              +-- PREVIEW_READY + Writer blocked -> Current TARGET + proposal
              +-- PREVIEW_READY + Writer ready -> proposed / WILL APPLY
```

Production rules:

- structured XYZ/vector/restraint/list values are rendered as labelled engineering values, not raw JSON;
- numeric deltas state the sign explicitly as `TARGET − SOURCE`;
- `Effective TARGET after apply` is derived from the **bound review ledger + existing transfer operation + Writer 1B readiness**;
- a local Accept/Lock decision does not alter effective TARGET until `Apply approvals to Transfer Preview` rebuilds the bound review/plan;
- a row-level `PREVIEW_READY` proposal does not become effective if overall Writer readiness is blocked;
- PROTECTED/BLOCKED/KEEP rows retain current TARGET as effective;
- evidence authority and limitations remain visible;
- no APPLY/EXCLUDE per-delta transfer-scope control is introduced in PR999.

Validation truth:

```text
presentation module syntax: PASS_LOCAL_EXECUTION
focused review/delta/transfer presentation: PASS_LOCAL_EXECUTION_EXACT_BRANCH_BLOBS
module blob: 525798bfda60c6c2ab85719d507524e7b679ac16
test blob: 5c95a0e18a2a90d3c16801b90ce197dc3282d6b3
initial production/test diff: PASS_GIT_COMPARE · 3 files · 0 behind main
shell integration: PASS_SOURCE_INSPECTION
full shell lifecycle: NOT_RUN_ENVIRONMENT
SOURCE 3/TARGET 3-1 browser workflow: NOT_RUN_ENVIRONMENT
Chromium: NOT_RUN_ENVIRONMENT
full repository suite: NOT_RUN_ENVIRONMENT
```

Explicitly protected from PR999:

```text
Method A/B mathematics and automatic discovery
multi-base arbitration/correspondence
engineering-delta calculation
transfer-policy and transfer-plan authority
Writer 1A/1B readiness and mutation
fixed-field parser
protected converters
workflows
```

See `agents/PR999_workreport.md`, `agents/status/PR999.yaml`, and `agents/claims/PR999.yaml`.

## PR998 — merged multi-base UI authority fix

PR998 closed the acceptance seam between the PR997 evidence cards and PR995 multi-base correspondence engine:

```text
Method A selection -> entire validated local base
Method B selection -> one qualified B loop
A+B selection      -> A loop OR B loop
                     ↓
                 baseLoops[]
                     ↓
           OR_WITH_CONFLICT_VETO
```

Same Method-A bases dedupe; distinct local transforms remain independent; conflicting B claims reach core ambiguity arbitration. Manual/LANDMARK fallback is kept separate. `docs/CIIcompareconceptnote.md` was refreshed to `x*SOURCE_OD`, Method A/B weights, multi-base OR authority and the `SOURCE 3.CII -> TARGET 3-1.CII` benchmark.

Retained validation truth: focused base-loop projection PASS; full UI/shell/browser suites NOT_RUN_ENVIRONMENT.

## PR997 — merged full-screen Method A/B engineering UI

PR997 exposed canonical Method A / Method B / A+B / LANDMARK evidence in a full-viewport CII Workspace without changing matching or Writer authority. Method A registration residuals/tolerance/weight and Method B physical run evidence/gates are visible; A+B is corroboration rather than score summation.

Retained validation truth: source/diff review PASS; focused UI/browser/full-suite execution NOT_RUN_ENVIRONMENT.

## PR996 → PR994 — retained identity architecture

The retained architecture is:

```text
candidate generation
   ↓
independent local Method-A rigid bases
 OR
independent Method-B network bases
   ↓
OR_WITH_CONFLICT_VETO
   ↓
canonical correspondence
   ↓
engineering deltas
```

Tolerance authority:

```text
T = x * SOURCE_OD
x default = 2.0
SOURCE OD = minimum positive incident SOURCE OD
OD role = tolerance scale only
TARGET OD = no identity/tolerance authority
```

Method A uses non-collinear local rigid registration and all-anchor normalized residual qualification. Method B requires at least two independent compatible runs and awards higher weight only for additional compatible planar/full-3D evidence. Node-number offset is never identity authority.

The real benchmark remains `Benchmark/CIICompare/SOURCE 3.CII -> TARGET 3-1.CII`, including the local `60920/60930/60940 ↔ 7290/7300/7310` A/B case and multiple incompatible local node-number offsets.

## Writer authority retained from PR991/PR992

Writer 1A/1B applies only explicitly qualified operations. Geometry, node numbering and topology remain protected. OD is conditional to the qualified Writer 1B plain-pipe/no-reducer path. Existing-block restraint mutation remains bounded by owned-block/cardinality rules. Unsupported operations block Writer readiness and must never be silently skipped.
