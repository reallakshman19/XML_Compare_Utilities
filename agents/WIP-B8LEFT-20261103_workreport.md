# WIP-B8LEFT-20261103 — XCU UXML-B8-LEFTOVERS

**Lane:** coder-b5 / XCU lane B. **Authority:** takeover started READ_ONLY; source and tests inspected, no production mutation before this work report.
**Task:** Owner's small post-merge B8 leftovers; accepted/refused edit semantics must remain unchanged.
**Base:** XCU main `ddd3ebc770359a25e9f0e74b2ea71fa2c063e272` (merged B8 PR #255).
**Branch:** `fix/uxml-b8-leftovers-20261103`. **Target:** new DRAFT PR; issue #239 receipt. No merge.

## Live reconciliation
- Oracle #239 comment 6603248161: merged B8 was PASS 92, all earlier source carry semantics and checks green.
- Main exact base checked; current open PR search found no PR changing `uxml/UxmlCategorizedPatchBack.js` in the active B8 family. All other open PRs serve distinct CIIFR/WP2 features; risk classification SAFE at known path level; recheck before modification.
- Main B8 patcher has 1,227 lines; canonical source/docs byte mirrors retained. Repo AGENTS.md: new JS modules <300 lines, functions <40 where practical; test accuracy and source custody.

## Appendix A — pre-implementation qualification (read-only)
- **A1 Production trace:** `classifyCategorizedEditableFields` line 839; Line choice source holders and `b8CarryRefusals` line 864; patch source writer main starts line 937. Original successful bytes are gated by strict S3/S4.0/S4.1 and the source byte-authoritative slice1.
- **A2 Failure isolation:** Oracle's remaining risks are tests missing multi-Line classifier carry/holder mutants, ambiguous row numbers, empty element-count refusal details, numeric repair text and patcher size; no acceptance defect authorized.
- **A3 Authority:** sourceRefs and exact SHA; one hub; globally shared AllowableStress read-only; no structural edits; accepted set and byte output must remain identical for all existing fields.
- **A4 Independent validation plan:** baseline public 4-sample JSON witness from unchanged `ddd3ebc770359a25e9f0e74b2ea71fa2c063e272`, then exact same witness after refactor (all Line and all section leaves), accepted/refused codes and original bytes included; LF/CRLF fast red/green mutant controls; existing B7/B8/S4.2/strict S3/S4.1/S4.0 tests and real Chromium.
- **A5 Minimal next patch:** add read-only row-coordinate provenance to outputs and UI, fast multi-Line tests; modularize patcher without changing semantic core, prove with baseline witness and exact-head CI.
**TAKEOVER:** CONTINUE scoped, no overlapping active family claims observed.

## Implementation phases and safety
1. Baseline 4-public pre-refactor witness and test harness; define authoritative `viewRow/fileRow/line` semantics; mutate neither acceptance nor bytes.
2. Source-bound row coordinates and UI row labels; structural refusal details; numeric repair suggestion; fast multi-Line red/green tests and isolated mutations.
3. Extract source lexer/legacy, projection, carry/classifier and writer into smaller modules; keep each new JS <300 and functions <40 where feasible; mirror JS source/docs; no physical edit policy changes.
4. All tests + before/after witness and exact-head CI; independent re-review (not author score). No continue-on-error; Owner alone merges.

## Validation
- At first commit: **NOT_RUN** (no source edits).
- Highest risk: provenance mismatch for interleaved A/B/A and accidental changed accepted/refused or bytes after refactor.
- **EXACT_NEXT_ACTION:** open draft PR after this report commit; implement baseline witness before source edits.

## Ledger
- WIP report seed (this file): start of task; no source mutation.
