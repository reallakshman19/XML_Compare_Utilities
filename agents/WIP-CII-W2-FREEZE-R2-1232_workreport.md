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
| existing browser responsiveness assertion | FAIL_AS_COVERAGE_GAP | no heartbeat/long-task assertion present |
| retained runtime timing baseline | NOT_RUN_ENVIRONMENT | no executable checkout/browser path in current agent environment |
| retained Chromium + real Pyodide on WP-007 | NOT_RUN_ENVIRONMENT | no WP-007 executable branch runner yet |
| production mutation | IN_PROGRESS | first scoped optimization committed at `d1413021`; larger shared-TARGET refactor pending |

## Changed-file ledger

Current branch material:
- `agents/WIP-CII-W2-FREEZE-R2-1232_workreport.md` — recovery-first WIP state.
- `tabs/cii-workspace/cii-workspace-topology-adapter.js` — memoized per-node topology context/neighbourhood derivation.
- `tests/cii-workspace-topology-context-cache.test.js` — focused regression.

No benchmark, workflow, parser, Writer1C/Writer2 mutation, bridge projection, or Common-controlled file has changed.

## Backup / patch ledger

Topology optimization local custody completed before the existing-file edit:
- local task ledger: `.agent-worklogs/20260928_1729_cii-writer2-freeze-r2/` (local/Git-ignored by repository policy);
- repository backup utility: backup #1 for `cii-workspace-topology-adapter.js`;
- pre-edit SHA-256: `c119a1b6a04878f661e22c872710707924603e8982943abeae5a6b19368ab80f`;
- post-edit SHA-256: `ab4caaa948895c5de43ade86bcac46c570e886cc3116b395182bea2716bb7131`;
- focused test SHA-256: `5605783ffb5fc180aeb1e1f771b1b90c4bf95e6584cc80e19bf88c48649f2097`;
- patch generated from the exact pre-edit backup;
- backup verification PASS.

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

The topology optimization is locally validated but the retained runtime timing/heartbeat baseline is still unavailable in this host. The larger prepared-model/shared-TARGET refactor touches core/bridge/source-set contracts and must preserve exact bridge/hash/correspondence semantics; it should therefore be staged with explicit construction-count/parity tests rather than inferred from elapsed time alone.

## EXACT_NEXT_ACTION

Continue PR #1233 with the root architectural fix:
1. introduce prepared-model APIs without changing existing single-pair entry points;
2. split/reuse TARGET side normalization and prepared document/graph state;
3. refactor source-set inspection so TARGET normalize/intake/topology occurs once;
4. add construction-count and parity regressions;
5. only then reuse prepared models in Compare and split common analysis from writer projection.

Retained S1/S2/S3/T timing + Chromium heartbeat remains mandatory before TASK_RESULT and must stay NOT_RUN until actually executed.