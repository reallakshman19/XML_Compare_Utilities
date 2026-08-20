# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`; this index is the repo-wide coordination and continuation view.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR1004 | CII Writer 1C Phase-1 NODENAME byte-custody implementation | `agent/cii-writer-1c` | DRAFT / ENGINEERING PATH QUALIFIED / FULL REPOSITORY SUITE NOT_RUN | ENGINEERING_CRITICAL_WRITER_MUTATION | original-byte NODENAME existing-row COPY; independently derived `S_auth`; equal-width byte patch; no SIF/hanger/cardinality/topology | SAFE SCOPE / STACKED ON PR1002 / base drift must be reconciled after PR1002 authority normalization | reconcile branch onto latest PR1002 head; preserve 20-file implementation ledger; do not merge |
| PR1002 | CII Writer 1C authority + future Writer roadmap | `agent/cii-writer-1c-roadmap` | DRAFT / PHASE1 AUTHORITY NORMALIZED | ENGINEERING_CRITICAL_WRITER_AUTHORITY | original TARGET bytes; independent `S_auth`; Writer claims testimony only; NODENAME-only Phase 1; mixed 1A/1B+1C APPLY blocked; SIF/TEE only after semantic map | SAFE / documentation predecessor of PR1004 / OWNER-ONLY MERGE | refresh exact 5-file ledger, then PR1004 reconciles stacked-base drift |
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

## PR1004 — active Writer 1C Phase-1 implementation

PR1004 implements the first Writer-1C production slice under the authority frozen by PR1002:

```text
existing NODENAME row
+ original TARGET byte authority
+ exact fixed-column pointer/row/FROM/TO custody
+ complete physical owner/alias set
+ explicit APPLY
+ equal-width in-place byte replacement
+ independent validator-derived S_auth
+ structural + semantic + byte negative assurance
```

Current durable evidence reports PASS for exact TARGET1 production intake/core round-trip, independent unauthorized-byte and stale-target falsifiers, shared/redundant NODENAME ownership, Writer1A/1B focused regressions, independent Python oracle, and Chromium Writer1C routing/binary handling. The complete repository suite is still `NOT_RUN`; no GitHub PR checks/workflows are present.

PR1004 remains draft and stacked on PR1002. Because PR1002 authority documentation has now moved, PR1004 must reconcile that base drift before review progression. No merge authority is implied.

## PR1002 — normalized Writer 1C authority roadmap

PR1002 is documentation-only and freezes the Writer boundary:

```text
Writer 1C = existing auxiliary record
            + exact physical ownership
            + original TARGET byte authority
            + pointer unchanged
            + section row count unchanged
            + CONTROL unchanged
            + source-qualified field layout/semantics
            + explicit APPLY
            + apply-time custody re-proof
            + independent validator-derived S_auth
```

For Phase 1:

```text
S_auth = independently authorized physical byte spans
B      = Writer-reported spans / audit testimony
D      = actual byte differences

PASS => D ⊆ S_auth
```

Writer claims do not authorize themselves. Whole-file reconstruction/reserialization is forbidden for the NODENAME edit path. Mixed Writer1A/1B APPLY + Writer1C APPLY remains blocked until separately qualified as one original-byte transaction.

Mandatory first slice is existing-row NODENAME mutation. Existing SIF/TEE fields are a later slice only after an authoritative field-semantic map exists; `FIELD_2_SEMANTICS_UNQUALIFIED` remains a hard blocker. Hanger mutation, pointer allocation/reindexing, record creation/deletion, and CONTROL changes remain Writer 2. Node/element/connectivity changes remain Writer 3.

Future roadmap:

```text
Phase 0  close retained repository-wide qualification debt
Phase 1  Writer 1C NODENAME
Phase 2  source-qualify SIF/TEE semantics, then one field family at a time
Phase 3  optional qualified existing auxiliary text
Phase 4  Writer 2 pointer/cardinality transaction engine
Phase 5  Writer 3 topology transaction engine
Phase 6  mutation manifest / rollback / batch automation
```

See `agents/PR1002_workreport.md`, `agents/status/PR1002.yaml`, `agents/claims/PR1002.yaml`, `docs/CIIcompareconceptnote.md`, Issue #1003, and stacked implementation PR #1004.

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
Writer readiness
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

EXCLUDE is never fake KEEP. It remains in audit custody but is absent from Writer `operations[]`.

Retained validation truth includes several lower-layer environment gates that were not executed at merge time; PR1004 supplies focused Phase-1 evidence but does not retroactively convert unrelated historical `NOT_RUN` entries to PASS.

## PR999 — merged Compare Review / Delta / Transfer clarity

PR999 made the transfer effect explicit without changing Writer authority:

```text
SOURCE candidate
Current TARGET
Effective TARGET after apply
```

Blocked/protected/Writer-blocked proposals keep the current TARGET effective; only a bound, preview-ready operation under ready Writer authority is shown as `WILL APPLY`.

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

Writer 1A/1B applies only the operations it receives and qualifies. Geometry, node numbering and topology remain protected. OD is conditional to the qualified Writer 1B plain-pipe/no-reducer path. Existing-block restraint mutation remains bounded by owned-block/cardinality rules. PR1001 establishes which reviewed classified operations are explicitly selected for Writer evaluation; PR1002 defines the next authority boundary without changing production code.
