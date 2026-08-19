# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`; this index is the repo-wide coordination and continuation view.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR1002 | CII Writer 1C authority + future Writer roadmap | `agent/cii-writer-1c-roadmap` | DRAFT / DOCUMENTATION COMPLETE / SOURCE-BOUNDARY AUDIT PASS | ENGINEERING_CRITICAL_WRITER_AUTHORITY | Writer 1C = pointer-stable/row-count-stable existing auxiliary mutation; NODENAME first; SIF/TEE only after semantic map; anti-drift byte-span assurance; Writer 2/3 boundaries | SAFE / documentation successor to merged PR1001 / OWNER-ONLY MERGE | owner review; implementation proceeds through separate Writer 1C issue/PR |
| PR1001 | CII explicit APPLY / EXCLUDE transfer-scope custody | `agent/cii-explicit-transfer-scope` | MERGED 2026-08-19 · `5a5fa0ae` / retained repo+UI+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_MUTATION_AUTHORITY | exact SOURCE/TARGET hash + mutable operation-set binding; APPLY to Writer set; EXCLUDE audit custody; stale-scope fail-closed; product scoped shell | HISTORICAL / merged into main | retained NOT_RUN_ENVIRONMENT gates remain qualification truth |
| PR999 | CII Compare Review / Engineering Delta / effective TARGET clarity | `agent/cii-review-transfer-clarity` | MERGED 2026-08-19 · `0274f63c` / retained shell+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI_PRESENTATION | human-readable structured values; SOURCE candidate vs Current TARGET vs Effective TARGET after apply; conservative Writer outcome projection | HISTORICAL / merged into main | retained NOT_RUN_ENVIRONMENT gates remain qualification truth |
| PR998 | CII multi-base UI authority fix + concept-note refresh | `agent/cii-multi-base-ui-fix` | MERGED 2026-08-19 · `7d63abe8` / retained UI+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI_AUTHORITY_SEAM | engineer multi-select of independent A/B bases -> explicit `baseLoops[]`; A+B two-loop projection; manual/qualified exclusivity; concept-note refresh | HISTORICAL | retained gates |
| PR997 | CII full-screen method-qualified Base Anchor engineering UI | `agent/cii-fullscreen-anchor-evidence-ui` | MERGED 2026-08-19 · `a2b8b055` / retained JS+browser NOT_RUN_ENVIRONMENT | ENGINEERING_CRITICAL_UI | full viewport; SOURCE→TARGET chrome; Method A/B/A+B/Landmark evidence cards | HISTORICAL | retained gates |
| PR996 | CII Base Anchor Method A/B discovery + fusion | `agent/cii-base-anchor-method-fusion` | MERGED 2026-08-19 · `df19d183` | ENGINEERING_CRITICAL | independent Method-A discovery; spatial runner-up recovery; A/B/A+B/Landmark labels; B gates | HISTORICAL | retained gates |
| PR995 | CII independent multi-base correspondence orchestration | `agent/cii-multi-base-orchestration` | MERGED 2026-08-19 · `d28e33c1` | ENGINEERING_CRITICAL | explicit A/B loops; per-loop correspondence; OR union; conflict veto | HISTORICAL | retained gates |
| PR994 | CII independent multi-base Method A/B core | `agent/cii-multi-base-core` | MERGED 2026-08-19 · `daf3be0a` | ENGINEERING_CRITICAL | `x*SOURCE_OD`; Method-A rigid bases; Method-B OD-scaled run/angular tolerance and 3D weight | HISTORICAL | retained gates |
| PR992 | CII Target Writer 1B qualified fields | `agent/cii-writer-1b-qualified-slice` | MERGED 2026-08-19 · `168d21bd` | ENGINEERING_CRITICAL | extended fixed fields; conditional OD; existing-block restraint free-slot create/clear | HISTORICAL | retained gates |
| PR991 | CII Target Writer 1A | `agent/cii-writer-1a` | MERGED 2026-08-19 · `edf297f7` | ENGINEERING_CRITICAL | WT/P1/T1/T2, existing RIGID and deterministic existing-RESTRANT numeric fields | HISTORICAL | retained gates |
| PR990 | CII writer roadmap | `agent/cii-writer-roadmap-doc` | MERGED 2026-08-19 · `87123aa6` | ENGINEERING_CRITICAL | Writer 1A/1B/2/3 roadmap | HISTORICAL | none |
| PR989 | Explicit base-anchor + approval flow | `agent/cii-anchor-approval-flow` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | paired Base Anchor suggestions; approval-gated transfer | HISTORICAL | none |
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | delta-driven transfer policy + Tab 3 | HISTORICAL | none |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | RESTRANT/SIF/RIGID/hanger custody | HISTORICAL | none |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | Compare Review and downstream deltas | HISTORICAL | none |
| PR985 | CII anchor-seeded propagation | `agent/cii-anchor-propagation` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | one-anchor multi-hop propagation | HISTORICAL | none |
| PR984 | CII M1 Spatial / M2 Network | `agent/cii-m1-m2-evidence` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | independent row-level identity evidence | HISTORICAL | none |
| PR983 | CII capability states + benchmark oracle | `agent/cii-oracle-capability-states` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | intake capability truth + oracle | HISTORICAL | none |
| PR982 | CII fixed-field parser | `agent/cii-fixed-field-parser` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | fixed-field ELEMENT parsing | HISTORICAL | none |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | anchored correspondence foundation | HISTORICAL | none |

## PR1002 — current Writer 1C authority roadmap

PR1002 is documentation-only and freezes the next Writer boundary before implementation:

```text
Writer 1C = existing auxiliary record
            + exact ownership
            + pointer unchanged
            + section row count unchanged
            + CONTROL unchanged
            + source-qualified field layout/semantics
            + explicit APPLY
```

Mandatory first slice is existing-row NODENAME mutation. Existing SIF/TEE block fields are a later 1C slice only after an authoritative field-semantic map is established. Hanger mutation, pointer allocation/reindexing, record creation/deletion, and CONTROL count changes remain Writer 2. Node/element/connectivity changes remain Writer 3.

Anti-drift authority requires exact physical mutation spans and proof that all bytes outside those spans remain identical. Parseability alone is not a PASS criterion.

Future roadmap:

```text
Phase 0  close retained qualification debt
Phase 1  Writer 1C NODENAME
Phase 2  Writer 1C existing SIF/TEE fields after semantic map
Phase 3  optional qualified existing auxiliary text
Phase 4  Writer 2 pointer/cardinality transaction engine
Phase 5  Writer 3 topology transaction engine
Phase 6  mutation manifest / rollback / batch automation
```

See `agents/PR1002_workreport.md`, `agents/status/PR1002.yaml`, `agents/claims/PR1002.yaml`, and `docs/CIIcompareconceptnote.md`.

## PR1001 — merged explicit mutation-scope authority

PR1001 separates **identity acceptance** from **mutation selection**:

```text
canonical identity + engineering delta
        ↓
correspondence ACCEPT / LOCK
        ↓
classified transfer candidates
        ↓
operation-level APPLY / EXCLUDE
        ↓
APPLY operations[] only
        ↓
Writer 1B readiness
        ↓
qualified mutation
```

Scope custody:

```text
schema: CIIWorkspaceTransferScope.v1
authority: USER_EXPLICIT_OPERATION_SCOPE
SOURCE SHA-256
TARGET SHA-256
exact candidateOperationIds[]
appliedOperationIds[]
excludedOperationIds[]
scopeId
```

Fail-closed rules:

- unbound scope blocks the product Writer path;
- SOURCE/TARGET hash mismatch invalidates scope;
- missing/new operation ID invalidates scope;
- duplicate/invalid decisions invalidate scope;
- selected unsupported APPLY remains blocked by existing Writer policy;
- all EXCLUDE returns `TRANSFER_SCOPE_NO_APPLY_OPERATIONS` and no mutation authority.

EXCLUDE is never fake KEEP. It remains in `excludedOperations[]`, scoped audit JSON, excluded-operation UI and engineering-delta presentation as `EXCLUDED`, but is absent from Writer `operations[]`.

After a scope is bound, existing audit/CSV export controls emit the scoped artifact bundle so the mutation-authority audit does not compete with an unscoped export.

Retained validation truth:

```text
main/source grounding: PASS_SOURCE_INSPECTION
authority-boundary diff: PASS_GIT_COMPARE
standalone scope state machine: PASS_INDEPENDENT_REPRODUCTION
APPLY-qualified + EXCLUDE-unsupported: PASS_INDEPENDENT_REPRODUCTION
all EXCLUDE blocker: PASS_INDEPENDENT_REPRODUCTION
stale operation-set blocker: PASS_INDEPENDENT_REPRODUCTION
TARGET-hash mismatch blocker: PASS_INDEPENDENT_REPRODUCTION
focused repository scope test: AUTHORED_NOT_RUN_ENVIRONMENT
focused scope UI/product-routing test: AUTHORED_NOT_RUN_ENVIRONMENT
shell lifecycle: NOT_RUN_ENVIRONMENT
SOURCE 3/TARGET 3-1 browser: NOT_RUN_ENVIRONMENT
Chromium: NOT_RUN_ENVIRONMENT
full repository suite: NOT_RUN_ENVIRONMENT
```

## PR999 — merged Compare Review / Delta / Transfer clarity

PR999 made the transfer effect explicit without changing Writer authority:

```text
SOURCE candidate
Current TARGET
Effective TARGET after apply
```

Blocked/protected/Writer-blocked proposals keep the current TARGET effective; only a bound, preview-ready operation under ready Writer authority is shown as `WILL APPLY`. Structured engineering data is rendered without raw JSON in primary cells.

Retained validation truth: focused presentation PASS; full shell/browser/full-suite execution NOT_RUN_ENVIRONMENT.

## PR998 → PR994 — retained identity architecture

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

Tolerance authority remains:

```text
T = x * SOURCE_OD
x default = 2.0
SOURCE OD = minimum positive incident SOURCE OD
OD role = tolerance scale only
TARGET OD = no identity/tolerance authority
```

The real benchmark remains `Benchmark/CIICompare/SOURCE 3.CII -> TARGET 3-1.CII`, including the local `60920/60930/60940 ↔ 7290/7300/7310` A/B case and multiple incompatible local node-number offsets.

## Writer authority retained from PR991/PR992

Writer 1A/1B applies only the operations it receives and qualifies. Geometry, node numbering and topology remain protected. OD is conditional to the qualified Writer 1B plain-pipe/no-reducer path. Existing-block restraint mutation remains bounded by owned-block/cardinality rules. PR1001 establishes which reviewed classified operations are explicitly selected for Writer evaluation; PR1002 documents the next authority boundary without changing production code.
