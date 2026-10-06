# PR1280 work report — Method-A provenance projection

## Mission

Implement #1268 D3 selected design from #1267:
`METHOD_A_SINGLE_SPAN_PROVENANCE_PROJECTION`.

Serial children:
- #1276 D3.1 automatic Method-A anchor provenance
- #1277 D3.2 adjacent-boundary projection
- #1278 D3.3 arbitration/generic identity integration
- #1279 D3.4 exact-head + #1239-stack compatibility
- #1269 retained D4

## Protocol / authority

- PROTOCOL_REF: `reallaksh19/Common@b47f16746a2f9029e7dcd7f523536046a847dc67:skills/engineering-pr-delivery-v3.2`
- parent decomposition: #1268 issuecomment-6022349819
- D2 evidence/design: #1267 issuecomment-6022315384
- merge: OWNER_ONLY / NOT AUTHORIZED

## Exact material basis

- PR: #1280 OPEN / DRAFT
- branch: `fix/cii-method-a-provenance-1268`
- base: PR #1265 exact head `a7e96865301a09865e0b4126c38310d7b1c8d421`
- D3 product file at start: `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js`
- #1276 implementation authorization: #1276 issuecomment-6022360653

## Current state

Current unit:
`#1277 D3.2 — qualified Method-A adjacent-boundary projection only`.

#1276 D3.1 is complete with hosted isolated PASS run `37510261973`.

Material frontier before this report refresh:
- PR #1280 head: `c75c22200720dcf6929a7be6446ba66d4369f93d`
- product blob: `553d9c2645173419e5856004345ccbe4bcce846e`
- isolated focused test blob: `2462f0571a27b1b3c960baafd7cc718d08cc2316`
- inherited broad test blob: `bf5304efb01acc0ec597ca4903551fd6ee315f1b` (restored byte-identical to #1265 base)

Implemented:
- automatic Method-A anchor rows are projected only when they are exact anchor pairs and originate as `LOCKED / USER_LOCKED_ANCHOR`;
- projected automatic rows are `REVIEW / METHOD_A_QUALIFIED_ANCHOR`;
- HIGH/MEDIUM loop confidence supplies identity support at that confidence;
- REVIEW loop confidence remains unbound;
- manual USER_LOCKED_LEGACY path is unchanged.

A duplicate D3 PR #1281 was detected and superseded/closed. PR #1280 is the sole authoritative D3 material surface.

## Selected design

Keep current single Method-A first↔last span.

Before arbitration, project automatic Method-A node evidence:
- qualified anchor endpoints: REVIEW / METHOD_A_QUALIFIED_ANCHOR;
- #1277 later owns qualified adjacent-boundary projection.

Manual topology helper semantics remain unchanged.

## Protected

No changes to:
- preselection;
- topology/manual USER_LOCKED semantics;
- geometry;
- Method-A qualification/confidence thresholds;
- Method B;
- arbitration conflict policy;
- Writer/scope;
- V11/V14;
- Benchmark/TEXPECTED.

## Intended changed files

| File | Role | Status |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` | D3.1 anchor projection + D3.2 adjacent-boundary projection | D3.2 implemented / hosted validation pending |
| `tests/cii-workspace-method-a-anchor-provenance.test.js` | isolated D3.1 provenance contract | PASS hosted |
| `tests/cii-workspace-method-a-boundary-provenance.test.js` | isolated D3.2 boundary contract | authored / hosted pending |
| `tests/cii-workspace-multi-base-correspondence.test.js` | inherited broad suite | restored unchanged to base |
| `agents/PR1280_workreport.md` | recovery surface | active |

## Recovery tooling

Normal local repository checkout is unavailable on this execution host. Local backup/agent-worklog utilities cannot be truthfully executed.

Compensation:
- exact GitHub blob SHAs recorded before every replacement;
- writes use expected SHA leases;
- no reset/revert/history rewrite;
- work report carries preimages, final hashes, validation and undo boundary.

## Validation truth

| Check | Status |
|---|---|
| D2 hosted design | PASS |
| final PR #1265 C4 frontier | PASS as evidence / C4 acceptance NOT_ACHIEVED |
| D3.1 implementation | PASS — hosted isolated run 37510261973 |
| inherited broad multi-base baseline | FAIL on untouched #1265 — Method-B-only assertion, run 37509033803 |
| D3.2 | implementation authored; hosted isolated validation pending |
| D3.3 | NOT_RUN |
| D3.4 | NOT_RUN |
| retained D4 | NOT_RUN |

## D3.1 exact validation

- validated product/report head: `42aaabca976783c41a3af2a07ea70b0260d3dbfa`
- validation branch: `validation/cii-method-a-anchor-1276-r2`
- validation head: `fe23efac937e80b9a8c424d514a58dbf0acabef9`
- hosted run: `37510261973`
- job: `112429267289`
- conclusion: PASS
- product blob: `553d9c2645173419e5856004345ccbe4bcce846e`
- isolated test blob: `2462f0571a27b1b3c960baafd7cc718d08cc2316`
- inherited broad test blob: `bf5304efb01acc0ec597ca4903551fd6ee315f1b`

The broad inherited test remains red on untouched #1265 because of a Method-B-only assertion (baseline run `37509033803`). It is not modified or claimed green by D3.1.

## D3.2 material frontier before hosted validation

- PR head before this report refresh: `8db51a3dc69d6e0848be5135ca87e9f5518e3d49`
- combined D3 product blob: `adf5c71f189f564cea87e38f55f62a36817e9d20`
- D3.1 isolated test blob: `2462f0571a27b1b3c960baafd7cc718d08cc2316`
- D3.2 isolated test blob: `70e1407ddc94feb64b87a6079ea41442ed9dca78`
- inherited broad test blob: `bf5304efb01acc0ec597ca4903551fd6ee315f1b` (unchanged #1265 baseline)

D3.2 adds no spans and does not edit arbitration. It projects only raw Method-A `ADJACENT_MATCH_BOUNDARY` rows with fail-closed evidence rules.

## EXACT_NEXT_ACTION

Create a validation-only branch from the refreshed PR #1280 head and execute only:
- `node tests/cii-workspace-method-a-anchor-provenance.test.js`
- `node tests/cii-workspace-method-a-boundary-provenance.test.js`

with exact product/test hash guards. Do not start #1278 until #1277 TASK_RESULT is published.
