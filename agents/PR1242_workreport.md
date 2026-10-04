# PR1242 work report — complete Writer2 Source→Target correspondence audit

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1241`
- `PR`: `#1242`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL / AUDIT_SURFACE
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `STACK_BASE`: draft PR #1240 branch `fix/cii-writer2-evidence-qualified-review-1239`
- `STACK_BASE_SHA`: `8eb2685a0c6d401d22e266b0abf5dfa6918bbd96`
- `BRANCH`: `feat/cii-writer2-source-target-audit-1241`
- `PATCH_HEAD_AT_PR_CREATION`: `ebfd90a7481c567e0eeca97b4c8fdde03c96314f`
- `PR_STATE`: OPEN / DRAFT / UNMERGED

## Handover in 60 seconds

PR #1242 supplies the missing source-first correspondence audit for retained S1/S2/S3 Writer2. Compare Review remains an emitted-row review surface; this new audit begins from the complete SOURCE node inventory and left-joins correspondence/review state so nodes that were never emitted are explicitly visible as `UNEMITTED`.

This PR is intentionally stacked on #1240 because it consumes the corrected evidence-basis fields introduced there. It must not be merged independently of #1240.

## Product contract

For every SOURCE node across S1/S2/S3, the audit emits one stable row containing:

- source member/node/name;
- emitted NODE correspondence count;
- all target IDs/names observed for that source;
- `BOUND`, `REVIEW`, `UNRESOLVED`, or `UNEMITTED`;
- confidence/workflow statuses;
- authority/evidence basis;
- decisions;
- changed-delta count and families;
- stable `SOURCE:node` audit identity.

Multiple correspondence rows for the same source node are retained as multiplicity and target arrays. The audit never silently selects one target.

## SOURCE census authority

The source node inventory is the deterministic union of:

1. every `from` and `to` endpoint in `sourceDocument.parsed.elements`;
2. every explicit key in `sourceDocument.nodeNames`.

The inventory is therefore SOURCE-document custody, not reconstruction from emitted correspondence.

## Implementation

### `tabs/cii-workspace/cii-workspace-multisource-correspondence-audit.js`

New pure module:

- source-node census;
- left join to NODE Compare Review rows;
- aggregate and per-member summaries;
- stable row IDs;
- deterministic complete CSV;
- deterministic JSON with source-set/target custody hashes;
- audit UI markup with explicit `UNEMITTED` rows;
- 500-row UI display default while exports remain complete.

Production module contains no benchmark expected-output knowledge.

### `tabs/cii-workspace/cii-workspace-multisource-next-step-shell.js`

Small retained Writer2 wrapper extension:

- obtains the current retained preview through existing `getMultiSourcePreview()`;
- prepends the source-first audit to the review results after core rendering;
- listens for review rerenders without modifying the core Writer2 shell;
- handles complete CSV/JSON audit exports;
- exports are regenerated from the current preview at click time;
- removes stale audit when source/preview custody is reset;
- preserves existing Compare/transfer waiting behavior.

### `tabs/cii-workspace/cii-workspace-tab.js`

Updates only the next-step shell cache token so browsers receive the audit wrapper.

### Tests

`tests/cii-workspace-multisource-correspondence-audit.test.mjs` proves:

- 6 SOURCE nodes with only 3 emitted source-node correspondences still produce 6 audit rows;
- 3 nodes are explicitly `UNEMITTED`;
- one source with two emitted rows retains both target IDs and is `UNRESOLVED` rather than silently collapsed;
- aggregate counts reconcile;
- CSV contains header + all source nodes;
- JSON retains custody hashes;
- UI preview cap does not imply export truncation.

`tests/cii-workspace-source-set-ui-contract.test.js` pins:

- cache token routing;
- audit helper registration;
- current-preview use;
- CSV/JSON export controls and filenames;
- explicit negative assurance that the production audit shell does not reference `TEXPECTED-PARTIALLLYDONE`.

## Benchmark / anti-gaming boundary

The independent T→TEXPECTED known-positive lower bound remains:

- NODENAME physical row count 1265→1266;
- 36 observed NodeName semantic deltas;
- 35 same-cardinality REPLACE;
- 1 structural CREATE at target 10330;
- 0 DELETE.

`TEXPECTED-PARTIALLLYDONE.CII` is partial validation authority only. No production module in this PR imports, fetches, parses, or hard-codes it. A benchmark reconciliation may consume this audit in tests/validation only; it must never create correspondence, promote confidence, bind transfer scope, or choose Writer2 mutations.

## Protected scope / negative assurance

No change to:

- Method-A/B matching or geometry;
- anchor discovery/search budget;
- correspondence generation;
- engineering delta authority;
- Writer1C/Writer2 mutations;
- transfer-scope authority;
- V11↔V14 bridge/projector;
- frozen Benchmark files;
- workflow/deployment files;
- local-storage/session persistence.

## Validation ledger

| Gate | Status | Observation / oracle |
|---|---|---|
| stack base exactness | PASS | #1240 exact head `8eb2685a...` |
| stacked diff boundary | PASS | six audit/UI/test/report files only |
| source-first census model | PASS_ISOLATED | exact pure-module test fixture |
| N>K source/emitted falsifier | PASS_ISOLATED | 6 source nodes / 3 emitted -> 6 rows / 3 UNEMITTED |
| multi-emission custody | PASS_ISOLATED | one source retains targets 102 + 103 and remains UNRESOLVED |
| deterministic CSV/JSON | PASS_ISOLATED | complete row count + hashes asserted |
| UI bounded/export-complete contract | PASS_ISOLATED | 2-row UI test cap with 6-row export statement |
| stale-preview cleanup | SOURCE_INSPECTED | committed guard removes audit when current preview is absent |
| routing/cache audit registration | SOURCE_INSPECTED | static test authored; full repo execution not available |
| full repository focused suite | NOT_RUN | no authenticated complete checkout in this session |
| retained S1/S2/S3→T browser path | NOT_RUN | not claimed on this head |
| T→TEXPECTED audit reconciliation | NOT_RUN | intentionally separate test/validation slice |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## Environment limitation

This session can read/write GitHub through the authenticated connector but has no complete authenticated checkout. Repository-local backup/worklog artifacts required by local protocol cannot be truthfully claimed. Git history + this PR report are the durable remote recovery surface. Any checkout-capable successor must establish the local backup ledger before additional local product edits.

## Stack/release note

PR #1242 currently targets the #1240 branch to isolate its own delta. If #1240 later merges under Owner authorization, re-ground #1242, retarget to current `main`, inspect drift, and rerun the relevant exact-head gates. Do not merge this stacked PR first.

## EXACT_NEXT_ACTION

Keep #1242 draft. Add a separate test/validation-only benchmark reconciliation lane that consumes the source-first audit and the existing independent T→TEXPECTED oracle to report known-positive correspondence coverage without importing benchmark answers into production. Then execute the focused audit/routing tests and retained browser path in a checkout-capable environment before any readiness claim.