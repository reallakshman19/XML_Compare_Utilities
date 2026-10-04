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

The Owner-requested benchmark-first lane is now also authored test-only: T.CII and TEXPECTED-PARTIALLLYDONE.CII are compared by the existing independent oracle to derive the exact changed TARGET-node list at runtime, and the retained-real benchmark now requires the Source→Target audit to cover every one of those known-positive target nodes. No benchmark answer is imported by production code.

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

Multiple correspondence rows for the same source node are retained as multiplicity and target arrays. Distinct competing TARGET IDs force `UNRESOLVED` even if one of the rows is individually bound; the audit never silently selects one target.

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
- competing-target fail-closed classification;
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

## Tests and benchmark lane

### `tests/cii-workspace-multisource-correspondence-audit.test.mjs`

Proves:

- 6 SOURCE nodes with only 3 emitted source-node correspondences still produce 6 audit rows;
- 3 nodes are explicitly `UNEMITTED`;
- one source with two different TARGET claims remains `UNRESOLVED` even when one claim is individually bound;
- aggregate counts reconcile;
- CSV contains header + all source nodes;
- JSON retains custody hashes;
- UI preview cap does not imply export truncation.

### `tests/cii-workspace-source-set-ui-contract.test.js`

Pins:

- cache token routing;
- audit helper registration;
- current-preview use;
- CSV/JSON export controls and filenames;
- explicit negative assurance that the production audit shell does not reference `TEXPECTED-PARTIALLLYDONE`.

### `tests/cii-workspace-source-target-texpected-coverage.js`

Test-only coverage helper. It takes an audit and independently derived T→TEXPECTED delta rows and reports:

- denominator / covered target nodes;
- bound target nodes;
- review-only target nodes;
- missing target nodes and exact missing IDs.

Authority is explicitly labelled `TEST_ONLY_PARTIAL_TEXPECTED_KNOWN_POSITIVE`.

### `tests/cii-workspace-source-target-texpected-benchmark.test.js`

Benchmark-first census requested by Owner:

- reads frozen `Benchmark/T.CII` and `Benchmark/TEXPECTED-PARTIALLLYDONE.CII`;
- uses existing `deriveExpectedNodeNameDelta()` independent oracle;
- derives the full changed TARGET-node list at runtime;
- asserts 1265→1266 physical NODENAME rows;
- asserts exactly 36 observed NodeName changes: 35 REPLACE + 1 CREATE + 0 DELETE;
- prints machine-readable target node/action/before-name/partial-expected-name rows;
- exercises the coverage classifier without feeding answers to production.

No target-node answer list is hard-coded in production.

### Existing retained benchmark strengthened

`tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js` now builds the real Source→Target audit from the retained preview and requires:

- known-positive denominator equals the independent T→TEXPECTED delta count;
- every known-positive TARGET node is present in the audit;
- missing known-positive target count is zero.

Its diagnostics now expose total audit census plus known-positive covered/bound/review-only/missing counts. This benchmark remains expensive and has **not** executed on the current head in this session.

## Benchmark / anti-gaming boundary

The independent T→TEXPECTED known-positive lower bound remains:

- NODENAME physical row count 1265→1266;
- 36 observed NodeName semantic deltas;
- 35 same-cardinality REPLACE;
- 1 structural CREATE at target 10330;
- 0 DELETE.

`TEXPECTED-PARTIALLLYDONE.CII` is partial validation authority only. No production module in this PR imports, fetches, parses, or hard-codes it. Benchmark reconciliation exists under `tests/**` only and must never create correspondence, promote confidence, bind transfer scope, or choose Writer2 mutations.

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

## Current stacked changed-file ledger

Relative to dependency head `8eb2685a...`:

1. `agents/PR1242_workreport.md`
2. `tabs/cii-workspace/cii-workspace-multisource-correspondence-audit.js`
3. `tabs/cii-workspace/cii-workspace-multisource-next-step-shell.js`
4. `tabs/cii-workspace/cii-workspace-tab.js`
5. `tests/cii-workspace-multisource-correspondence-audit.test.mjs`
6. `tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js`
7. `tests/cii-workspace-source-set-ui-contract.test.js`
8. `tests/cii-workspace-source-target-texpected-benchmark.test.js`
9. `tests/cii-workspace-source-target-texpected-coverage.js`

## Validation ledger

| Gate | Status | Observation / oracle |
|---|---|---|
| stack base exactness | PASS | #1240 exact head `8eb2685a...` |
| stacked diff boundary | PASS | 9 audit/UI/test/report files only |
| source-first census model | PASS_ISOLATED | exact pure-module test fixture before final conflict hardening |
| N>K source/emitted falsifier | PASS_ISOLATED | 6 source nodes / 3 emitted -> 6 rows / 3 UNEMITTED |
| multi-emission custody | AUTHORED / NOT_RUN_EXACT_HEAD | final test now includes one bound + one competing target and requires UNRESOLVED |
| deterministic CSV/JSON | PASS_ISOLATED | complete row count + hashes asserted |
| UI bounded/export-complete contract | PASS_ISOLATED | 2-row UI test cap with 6-row export statement |
| stale-preview cleanup | SOURCE_INSPECTED | committed guard removes audit when current preview is absent |
| routing/cache audit registration | SOURCE_INSPECTED | static test authored; full repo execution not available |
| T→TEXPECTED changed-node census | AUTHORED / NOT_RUN_EXACT_HEAD | real frozen files + existing independent oracle; derives 36-node list at runtime |
| audit known-positive coverage helper | AUTHORED / NOT_RUN_EXACT_HEAD | test-only; no production authority |
| retained-real audit 36/36 coverage gate | AUTHORED / NOT_RUN_EXACT_HEAD | existing expensive retained benchmark strengthened |
| full repository focused suite | NOT_RUN | no authenticated complete checkout in this session |
| retained S1/S2/S3→T browser path | NOT_RUN | not claimed on this head |
| GitHub Actions/status | NONE_INSTANTIATED at last observation | do not treat as PASS |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## Environment limitation

This session can read/write GitHub through the authenticated connector but has no complete authenticated checkout. Repository-local backup/worklog artifacts required by local protocol cannot be truthfully claimed. Git history + this PR report are the durable remote recovery surface. Any checkout-capable successor must establish the local backup ledger before additional local product edits.

## Stack/release note

PR #1242 currently targets the #1240 branch to isolate its own delta. If #1240 later merges under Owner authorization, re-ground #1242, retarget to current `main`, inspect drift, and rerun the relevant exact-head gates. Do not merge this stacked PR first.

## EXACT_NEXT_ACTION

Keep #1242 draft. Execute, on exact head, the pure audit test, T→TEXPECTED census test, source-set UI contract, and retained-real Auto Anchor benchmark with its new 36/36 audit gate. Then run the retained browser path. If the 36/36 gate fails, use the emitted missing TARGET IDs to diagnose correspondence coverage; do not patch expected data or feed TEXPECTED answers into production. Only after those gates pass should blocker presentation, anchor proposal actions, or persistence proceed.