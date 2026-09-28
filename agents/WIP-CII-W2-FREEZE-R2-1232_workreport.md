# WIP-CII-W2-FREEZE-R2-1232 work report

WIP_ID: WIP-CII-W2-FREEZE-R2-1232
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1232
PROGRAMME: github:reallaksh19/XML_Compare_Utilities#1083
PROGRAM_ID: PGM-XMLCU-CII-W2-MS-NODENAME
WORK_PACKAGE_ID: WP-007
BRANCH: revision/cii-writer2-freeze-r2-1232
BASE_MAIN: 300c05dd5e69419e1f16b3622f0cc24a93170b3a
COMMON_PROTOCOL: engineering-pr-delivery-v3.1
COMMON_BASIS: 1ced68258afeaf50df113b1d38a4ceb9193587e3
TWO_PASS_REVISION: TPG-2P-2026-09-28-R3
STATE: IMPLEMENTATION_IN_PROGRESS
PR: #1233 DRAFT
MERGE_AUTHORITY: OWNER_ONLY
EXECUTION_HOST_UPDATE: 2026-09-28T15:xxZ — this checkpoint was written from a
Claude Code cloud session with a real `git` checkout of this exact branch,
Node 22.22.2, and outbound network/DNS. Unlike the prior ChatGPT execution
host (see "Current execution-environment limitation" below, which is now
historical, not current), this host can and does execute the repository's
own Node test files directly, including the real-retained S1/S2/S3/T
benchmarks. See "FT-1232-003" and the refreshed "Validation status" section.

## Mission / scope

Fix the retained CII Writer2 S1/S2/S3 -> T browser/application freeze without changing PB-0003 FORTRAN fixed-format, NodeName, Writer1C, Writer2, V14 projection, benchmark, or write-authority semantics.

The approved implementation plan is issue #1232 comment `IMPLEMENTATION_PLAN — rev 1`.

## Live basis

Revalidated at execution start:

- XML_Compare_Utilities `main`: `300c05dd5e69419e1f16b3622f0cc24a93170b3a`
- Common `main`: `1ced68258afeaf50df113b1d38a4ceb9193587e3`
- Two-Pass: `TPG-2P-2026-09-28-R3`
- #1232: OPEN
- open overlapping CII Writer2 PRs observed: none
- predecessor #1224: CLOSED
- PR #1228: MERGED
- PR #1230: MERGED

## Current first-wrong-boundary findings

Current-main source trace confirms the approved root hypothesis at the architecture level.

### Inspect amplification

`cii-workspace-source-set.js::inspectCiiWorkspaceSourceSetWithVersionBridge()` loops over every source and calls the pair API `inspectCiiWorkspaceModelsWithVersionBridge()`.

Each pair call:
1. `normalizePairInput()` normalizes SOURCE and TARGET;
2. `inspectCiiWorkspaceModels()` calls `intakePair()`;
3. `intakePair()` independently intakes SOURCE and TARGET and independently builds both topology graphs;
4. inspection computes per-pair anchor suggestions.

For retained S1/S2/S3, the same immutable TARGET therefore reaches TARGET normalize/intake/topology construction three times during Inspect. Converter cache hits can avoid repeated Python conversion output generation, but do not avoid TARGET document parse, topology construction, neighbourhood/context calculation, landmarks, anchor analysis, or deep-freeze traversal.

### Compare amplification

`cii-workspace-multisource-preview.js::createCiiWriter2SourceSetPreviewWithVersionBridge()` loops over each source and creates:
- a complete Writer2 preview; then
- a complete Writer1C replacement preview.

For S1/S2/S3 this is six pair-preview executions against the same TARGET. Each complete preview again enters `normalizePairInput()` and `createCiiWorkspacePreview()`, whose `intakePair()` reparses and regraphs TARGET.

The UI retains `cachedTargetBytes` and prior `inspection`, but Compare calls the preview API from bytes again and does not reuse prepared models.

### Topology repeated traversal

`cii-workspace-topology-adapter.js` on main computed `contextFor(node)` for every edge endpoint in `attachContexts()` and recomputed `neighbourhoodLayers(id)` for graph nodes. Commit `d1413021cd15f9e5c8efcf2769af44593241d738` now builds one context per unique node and reuses its frozen neighbourhood evidence for incident edges and graph nodes. This removes redundant traversal within every topology build without changing topology evidence values.

### FT-1232-003 — prepared-model/shared-TARGET inspection architecture

Implemented in this checkpoint, on top of the topology memoization
(`d1413021`) already on this branch:

- `cii-workspace-writer-version-bridge.js` gained
  `prepareCiiWorkspaceTargetWithVersionBridge()` (normalizes, intakes, and
  topology-graphs TARGET exactly once) and
  `inspectCiiWorkspaceModelsWithPreparedTarget()` (normalizes only SOURCE and
  reuses the prepared TARGET). The pre-existing `normalizeSideToV11()`,
  `inspectCiiWorkspaceModelsWithVersionBridge()`, and
  `createCiiWorkspacePreviewWithVersionBridge()` are byte-for-byte unchanged.
- `cii-workspace-core.js::intakePair()` (and the `inspectCiiWorkspaceModels()`
  / `createCiiWorkspacePreview()` wrappers around it) gained an optional
  trailing `prepared` argument that, when given a `targetDocument`/`targetGraph`,
  skips re-intaking/re-graphing TARGET. Every existing 2-argument caller is
  unaffected (falls back to the original full-intake behavior).
- `cii-workspace-source-set.js::inspectCiiWorkspaceSourceSetWithVersionBridge()`
  now prepares TARGET once and reuses it for every source member, instead of
  calling the single-pair API with full TARGET bytes on every loop iteration.
- `cii-workspace-intake.js` and `cii-workspace-topology-adapter.js` gained an
  optional, default-off `instrumentation.record(event)` hook (no-op when
  absent) so the "TARGET built once / SOURCE built per member" invariant is
  machine-checked, not just asserted by reading the code.
- New test `tests/cii-workspace-source-set-shared-target-construction-count.test.js`
  proves, against a real (small, V11) repository fixture: `TARGET_NORMALIZE`,
  `TARGET_INTAKE`, `TARGET_TOPOLOGY` each fire exactly once per session;
  `SOURCE_NORMALIZE`/`SOURCE_INTAKE`/`SOURCE_TOPOLOGY` each fire once per
  source; all members observe one identical prepared-TARGET content hash; and
  the new prepared path's per-source inspection evidence is `deepEqual` to
  the untouched legacy single-pair API's evidence for identical bytes
  (`.source`, `.target`, `.baseAnchorSuggestions`,
  `.versionBridge.{source,target}`). Result: **PASS**, 0 failures.
- This closes exactly the "Inspect amplification" gap described above for
  the S1/S2/S3 → T Inspect path. It intentionally does **not** touch
  "Compare amplification" (multisource-preview.js Writer2/Writer1C double
  preview) — that is FT-1232-004, still pending.

### Browser acceptance gap

The retained tile Playwright test allows up to 120 seconds for Inspect, Compare/review rebuild and Apply milestones, but contains no independent event-loop heartbeat or long-task responsiveness assertion. Eventual completion can therefore pass while the app is functionally frozen for a long interval.

## Hypothesis state

SOURCE_TRACE_HYPOTHESIS: CONFIRMED

Confirmed meaning: repeated TARGET/common-analysis work exists exactly where the implementation plan predicts.

RUNTIME_DOMINANT_STAGE: NOT_RUN_ENVIRONMENT

The relative wall-clock contribution of parser intake, topology traversal, anchor discovery, deep-freeze traversal, converter wait and DOM rendering still requires runtime instrumentation before attribution.

## Current execution-environment limitation

This ChatGPT execution environment has:
- GitHub provider read/write access through the connected GitHub integration;
- no local XML_Compare_Utilities checkout;
- no `gh` CLI;
- no DNS/network path from the container to github.com;
- no repository-local RLL/CODEX_LOCAL adapter discovered;
- no workflow-dispatch tool for starting a new WP-007 workflow;
- the only CII Writer2 benchmark workflow on main is push-bound specifically to the historical Revision 1 branch.

Repository policy requires the repo backup utility and local `.agent-worklogs/` custody before production-file edits. Those controls must not be bypassed by directly replacing production files through the provider API.

## Validation status

| Gate | Status | Basis |
|---|---|---|
| live Common/V3.1 basis | PASS | Common main re-read this run |
| live target-main basis | PASS | main = 300c05dd5e69419e1f16b3622f0cc24a93170b3a |
| active Writer2 overlap check | PASS | no open Writer2 PR observed |
| source-trace repeated TARGET work | PASS | current-main functions listed above |
| source-trace duplicate Writer2/Writer1C full preview | PASS | current-main multisource preview loop |
| topology redundant neighbourhood/context traversal | PASS_FIXED_FOCUSED | commit `d1413021`; focused context-reuse regression PASS |
| source-set shared-TARGET construction count (TARGET×1, SOURCE×N) | PASS | new test, real V11 fixture, executed to completion this run |
| prepared-model vs legacy single-pair parity | PASS | same new test; `deepEqual` on source/target/anchors/versionBridge for all 3 sources |
| existing topology-context-cache regression | PASS | re-executed this run, 0.064s |
| existing source-set custody regression (real S1/S2/S3/T hashes) | PASS | re-executed this run, 0.098s |
| source-set UI wiring contract test | FAIL_PRE_EXISTING_UNRELATED | re-confirmed via `git stash` bisection against the exact pre-edit branch head; identical failure with or without this change; out of WP-007 scope, not fixed here |
| existing browser responsiveness assertion | FAIL_AS_COVERAGE_GAP | no heartbeat/long-task assertion present (unchanged; still pending, see FT-1232-005) |
| retained real-benchmark timing/correctness (PB-0003 + auto-anchor, real 2.87 MB TARGET) | IN_PROGRESS_NOT_RUN_YET | launched pre-edit as baseline on this host (unlike the prior ChatGPT host, this one can execute them); both still running after 25+ min of ~100% single-core CPU with zero output, which is itself corroborating evidence for the repeated-TARGET-work diagnosis; will be updated to PASS/FAIL only once actually complete, never inferred |
| retained Chromium + real Pyodide on WP-007 | NOT_RUN_ENVIRONMENT | still not attempted this checkpoint; this host has a real Chromium binary available and is a credible candidate to finally execute this, but it was not yet attempted in favor of landing FT-1232-003 first |
| production mutation | IN_PROGRESS | topology memoization (`d1413021`) + shared-TARGET prepared-model architecture (this checkpoint) committed; Compare-side reuse (FT-1232-004) and UI generation/cancellation + Chromium heartbeat (FT-1232-005) remain pending |

## Changed-file ledger

Current branch material:
- `agents/WIP-CII-W2-FREEZE-R2-1232_workreport.md` — recovery-first WIP state.
- `tabs/cii-workspace/cii-workspace-topology-adapter.js` — memoized per-node topology context/neighbourhood derivation (`d1413021`); this checkpoint added an optional `options.instrumentation` parameter to the same exported function.
- `tests/cii-workspace-topology-context-cache.test.js` — focused regression (`d1413021`).
- `tabs/cii-workspace/cii-workspace-intake.js` — this checkpoint: optional instrumentation hook only.
- `tabs/cii-workspace/cii-workspace-core.js` — this checkpoint: optional `prepared` TARGET override threaded through `intakePair`/`inspectCiiWorkspaceModels`/`createCiiWorkspacePreview`.
- `tabs/cii-workspace/cii-workspace-writer-version-bridge.js` — this checkpoint: new `prepareCiiWorkspaceTargetWithVersionBridge()` and `inspectCiiWorkspaceModelsWithPreparedTarget()`; instrumentation hook added to `normalizeSideToV11()`.
- `tabs/cii-workspace/cii-workspace-source-set.js` — this checkpoint: `inspectCiiWorkspaceSourceSetWithVersionBridge()` now prepares TARGET once and reuses it.
- `tests/cii-workspace-source-set-shared-target-construction-count.test.js` — this checkpoint: new construction-count + prepared/legacy parity regression.

No benchmark, workflow, parser, Writer1C/Writer2 mutation, bridge projection, or Common-controlled file has changed.

## Backup / patch ledger

Topology optimization local custody completed before the existing-file edit (prior checkpoint):
- local task ledger: `.agent-worklogs/20260928_1729_cii-writer2-freeze-r2/` (local/Git-ignored by repository policy);
- repository backup utility: backup #1 for `cii-workspace-topology-adapter.js`;
- pre-edit SHA-256: `c119a1b6a04878f661e22c872710707924603e8982943abeae5a6b19368ab80f`;
- post-edit SHA-256: `ab4caaa948895c5de43ade86bcac46c570e886cc3116b395182bea2716bb7131`;
- focused test SHA-256: `5605783ffb5fc180aeb1e1f771b1b90c4bf95e6584cc80e19bf88c48649f2097`;
- patch generated from the exact pre-edit backup;
- backup verification PASS.

Shared-TARGET prepared-model custody completed before each existing-file edit (this checkpoint):
- local task ledger: `.agent-worklogs/20260928_1509_cii-writer2-freeze-r2-ft1232-003/` (local/Git-ignored by repository policy);
- repository backup utility, all pre-edit SHA-256 verified against this exact branch head (`49ce11b9`) before editing:
  - backup #90 `cii-workspace-intake.js` — `cf8739b5311097accd5a965a746d09cba803ce7a5a4ba079314dd90c492e94b9`;
  - backup #91 `cii-workspace-topology-adapter.js` — `ab4caaa948895c5de43ade86bcac46c570e886cc3116b395182bea2716bb7131` (matches the post-edit hash recorded above, confirming this checkpoint started from the exact PR #1233 head);
  - backup #92 `cii-workspace-core.js` — `98028235222dbee0c82e4dbffe765327efc448383aa05f1c9acae18e86aa9c98`;
  - backup #93 `cii-workspace-writer-version-bridge.js` — `0dcfc28d30bd2da797f08647ce01b5239cad87d1c775fa5a3ab00d1b455f4337`;
  - backup #94 `cii-workspace-source-set.js` — `c5ac83928a220da0ca347e6928a10f15ebadafc5b6d1e9cf73bc2ee491de75f3`;
- `tests/cii-workspace-source-set-shared-target-construction-count.test.js` is a new file (no pre-image).

## Protected invariants

- PB-0003 is unchanged.
- Retained S1/S2/S3/T and TEXPECTED bytes are immutable.
- FORTRAN fixed-format and I13 rules are unchanged.
- Writer1C exact-span/preimage REPLACE is unchanged.
- Writer2 CREATE/DELETE relocation authority is unchanged.
- V14 projection/change-isolation guards are unchanged.
- BM-001/TEXPECTED authority classification is unchanged.
- REVIEW_ONLY remains non-writing.
- frozen 3D_Converters sources are unchanged.
- workflow files are protected absent separate Owner authorization.
- merge remains Owner-only.

## Highest risk

FT-1232-003 (this checkpoint) is validated against a real small fixture with
exact construction-count and prepared/legacy parity assertions, all passing.
The remaining risk is that this has *not yet* been proven against the full
real retained 2.87 MB TARGET end-to-end (that run was launched pre-edit and is
still IN_PROGRESS at the time of this checkpoint — see Validation status). Do
not treat the small-fixture PASS as a substitute for that real-retained
result once it lands; append it here and to the PR/issue the moment it
completes, whichever way it goes. FT-1232-004 (Compare-side reuse) and
FT-1232-005 (UI generation/cancellation + Chromium heartbeat) are unstarted
and are larger, more engineering-sensitive slices than this one; they should
each get their own construction-count/parity proof before being claimed done,
for the same reason this one did.

## EXACT_NEXT_ACTION

1. Await/record the real-retained PB-0003 and auto-anchor benchmark results
   (already running; append PASS/FAIL + timing to this report and to issue
   #1232 the moment each finishes — do not infer or backfill).
2. If both PASS: proceed to FT-1232-004 — reuse prepared SOURCE/TARGET models
   from Inspect in Compare (`cii-workspace-multisource-preview.js`), and split
   common correspondence/engineering analysis from Writer1C/Writer2 writer
   projection, each with its own construction-count/parity regression before
   being claimed done.
3. If either real-retained benchmark FAILs (not just "slow"): stop, do not
   proceed to FT-1232-004, and treat it as a `PLAN_UPDATE`-triggering
   falsifier per the approved implementation plan — diagnose against the
   *unmodified* single-pair API path first (still available and untouched)
   before assuming this checkpoint's change is the cause.
4. FT-1232-005 (UI operation-generation/cancellation guards, retained
   Chromium event-loop heartbeat probe) remains the last owned outcome and is
   unstarted; this host has a real Chromium binary and could be the first to
   actually execute it, once FT-1232-004 lands.