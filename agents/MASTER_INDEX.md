# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`; this index is the repo-wide coordination and continuation view.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR1004 | CII Writer 1C Phase-1 NODENAME byte-custody implementation | `agent/cii-writer-1c` | DRAFT / ENGINEERING PATH QUALIFIED / FULL REPOSITORY SUITE NOT_RUN | ENGINEERING_CRITICAL_WRITER_MUTATION | original-byte NODENAME existing-row COPY; independently derived `S_auth`; equal-width byte patch; no SIF/hanger/cardinality/topology | SAFE SCOPE / STACKED ON PR1002 / final ancestry sync required after this PR1002 checkpoint | ingest final PR1002 head as ancestor; retain exact 20-file diff; then only full repository `npm test` remains before review progression |
| PR1002 | CII Writer 1C authority + future Writer roadmap | `agent/cii-writer-1c-roadmap` | DRAFT / PHASE1 AUTHORITY NORMALIZED / READY FOR OWNER REVIEW AFTER FINAL STACK SYNC | ENGINEERING_CRITICAL_WRITER_AUTHORITY | original TARGET bytes; independent `S_auth`; Writer claims testimony only; NODENAME-only Phase 1; mixed 1A/1B+1C APPLY blocked; SIF/TEE only after semantic map | SAFE / documentation predecessor of PR1004 / OWNER-ONLY MERGE | verify exact 5-file ledger; final PR1004 ancestry sync; then owner review/merge decision only |
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

## Current Writer 1C authority

```text
original TARGET byte stream
 -> exact physical NODENAME custody
 -> explicit APPLY scope
 -> independently derived S_auth
 -> equal-width byte patch
 -> re-intake
 -> independent structural / semantic / byte assurance
```

Definitions:

```text
S_auth = validator-derived authorized span union
B      = Writer-reported span union / testimony
D      = actual changed-byte indices

PASS => D ⊆ S_auth
```

Writer-reported spans do not define authorization. Whole-file reconstruction/reserialization is forbidden for Phase-1 NODENAME. Same-span divergent output blocks; identical output may canonicalize only with a complete compatible owner set; an unselected alias side-effect blocks.

Phase-1 transaction authority is NODENAME-only Writer1C APPLY. Mixed Writer1A/1B + Writer1C APPLY remains blocked until separately original-byte-qualified. Product default remains Writer1B; Writer1C is explicit-only.

## Phase boundaries

- Phase 1: existing-row NODENAME only.
- Phase 2: first create source-qualified SIF/TEE engineering field semantics; raw field2 remains `FIELD_2_SEMANTICS_UNQUALIFIED` and unwritable.
- Writer 2: pointer/cardinality changes, record create/delete/reindex, hanger packed arrays/CONTROL counts.
- Writer 3: node/element/connectivity/topology mutation.

PR1004 has focused PASS evidence for exact TARGET1 production round trip, independent byte/stale-target falsifiers, shared/redundant ownership, Writer1A/1B regressions, independent Python oracle and Chromium binary routing. Its complete repository `npm test` remains `NOT_RUN` because an exact full checkout cannot currently be transported into the execution container. Existing workflows do not provide a repository-wide `npm test` path; no workflow has been modified to manufacture evidence.

## Coordination invariant

Before owner review of the stack:

```text
latest PR1002 head is an ancestor of PR1004
compare PR1002 -> PR1004 has behind_by = 0
PR1002 diff = exactly 5 documentation/custody files
PR1004 diff = exactly 20 implementation/recovery files
both PRs remain draft/unmerged unless owner explicitly changes that state
```

See `agents/PR1002_workreport.md`, `agents/status/PR1002.yaml`, `agents/claims/PR1002.yaml`, `docs/CIIcompareconceptnote.md`, Issue #1003, and stacked implementation PR #1004.
