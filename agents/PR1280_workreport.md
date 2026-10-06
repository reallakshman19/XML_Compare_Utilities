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
`#1276 D3.1 — automatic Method-A anchor provenance only`.

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
| `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` | D3.1 Method-A automatic anchor projection | completed for D3.1 |
| `tests/cii-workspace-method-a-anchor-provenance.test.js` | isolated D3.1 provenance contract | authored |
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
| D3.1 implementation | PASS — direct implementation inspection; hosted isolated test pending |
| inherited broad multi-base baseline | FAIL on untouched #1265 — Method-B-only assertion, run 37509033803 |
| D3.2 | NOT_RUN |
| D3.3 | NOT_RUN |
| D3.4 | NOT_RUN |
| retained D4 | NOT_RUN |

## EXACT_NEXT_ACTION

Create a fresh validation-only branch from the exact refreshed PR #1280 head and run only `node tests/cii-workspace-method-a-anchor-provenance.test.js` with exact product/test hash guards. Do not run #1277 until #1276 TASK_RESULT is published.
