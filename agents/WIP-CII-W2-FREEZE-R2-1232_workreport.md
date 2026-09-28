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
STATE: READ_ONLY_BASELINE_ESTABLISHED
PR: NONE
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

`cii-workspace-topology-adapter.js` currently computes `contextFor(node)` for every edge endpoint in `attachContexts()`; `contextFor()` includes `neighbourhoodLayers()`. Afterward graph-node construction calls `neighbourhoodLayers(id)` again for each node. This is redundant derived traversal within every topology build.

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
| topology redundant neighbourhood/context traversal | PASS | current-main topology adapter |
| existing browser responsiveness assertion | FAIL_AS_COVERAGE_GAP | no heartbeat/long-task assertion present |
| retained runtime timing baseline | NOT_RUN_ENVIRONMENT | no executable checkout/browser path in current agent environment |
| retained Chromium + real Pyodide on WP-007 | NOT_RUN_ENVIRONMENT | no WP-007 executable branch runner yet |
| production mutation | NOT_RUN | intentionally not started before mandatory local backup/worklog custody |

## Changed-file ledger

Process/custody only:

- this WIP report.

No production, test, benchmark, workflow, or Common-controlled file has changed.

## Backup / patch ledger

No existing production/test file has been edited.

Before the first existing-file edit:
1. establish a byte-faithful local workspace/checkout;
2. create `.agent-worklogs/<timestamp>_cii-writer2-freeze-r2/`;
3. write `manifest.md` before edits;
4. run `node utils/backup.cjs save <path> "Plan to ..."` for every existing target file;
5. record pre-edit SHA-256 and backup IDs;
6. generate module patches from the pre-edit snapshots, not Git history.

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

Starting production edits through GitHub's contents API would bypass the repository's mandatory local backup and module-wise patch ledger, and would also prevent the approved Phase-1 runtime falsifier from executing before architecture changes.

## EXACT_NEXT_ACTION

Run Phase 1 from a byte-faithful executable checkout on branch `revision/cii-writer2-freeze-r2-1232`:
- establish backup + `.agent-worklogs` custody;
- add timing/count instrumentation and retained Chromium heartbeat evidence;
- execute retained Inspect and Compare;
- record TARGET preparation counts, stage durations and largest event-loop gap.

If measurements confirm the source-trace diagnosis, proceed to the prepared-model/shared-TARGET refactor from `IMPLEMENTATION_PLAN — rev 1`. If measurements falsify it, publish `PLAN_UPDATE` before production architecture changes.
