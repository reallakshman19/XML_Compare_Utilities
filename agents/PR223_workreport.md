# PR223 — Separate ISO S1/S2 CSV source tabs and safe exported-header preflight

**WORK_INTENT** FIX ISO Note import UI and non-destructive CSV preflight. **CRITICALITY** ENGINEERING_CRITICAL (source identity and provenance). **BRANCH** `fix/iso-csv-role-tabs-benign-headers-20261028`. **PR** https://github.com/reallakshman19/XML_Compare_Utilities/pull/223. **BASE** main `2dfcdee8c63d7bdf2cf10fe1bc2caa6f492ad52c`. **OWNER REQUEST** S1 and S2 shown in separate tabs and regressions from new CSV implementation corrected. **MERGE AUTHORITY** not newly granted for this follow-up; do not merge automatically.

## Re-grounding and impact
Inspected live ISO import flow in `tabs/xml-compare-table-categorized-runtime.js`, source parser, role assignment, CSV preflight, field catalog and shell, baseline Node/browser tests. Existing import already used S1/S2 source IDs but **one shared Table-step view**, and load-template automatically navigated to Columns. Preflight had unconditional blocker on duplicate/empty canonical headers, even when redundant values exactly matched authoritative first column or extra unnamed column was entirely empty. Field catalog labeled sparse optional S1 X/Y/Z as a warning despite 2777 blank and one valid value. Noncanonical identifiers are **genuine review-only flags**, not parser errors.

## Five-part independent implementation check (Appendix A)
- **A1 Production Trace 19/20**: validated path choose S1/S2 -> `preflightIsoTableText` -> per-role state -> `loadIsoNoteTemplate` -> `parseSourceDraft` -> shared Table view. Found regression in `setActiveTab('levels')` after template load.
- **A2 Failure Isolation 20/20**: semanticHeaderIssues blocked duplicated `NODE_NAME` and all blank trailing header columns without consulting 819 row cells; field_blank_heavy flagged optional axes.
- **A3 Authority 19/20**: Preserve source raw text and cell provenance, first same-name header authoritative, no heuristic overwrite, fail closed on conflicting/second-only duplicate values or populated unnamed columns. No PS/SL normalization or value fabrication. Two source tables remain separate and retain role identity.
- **A4 Independent Validation 18/20**: existing unmodified adverse duplicate test (different PS NO vs Support No) continues blocking; new adversarial contradictory S2 case blocks. Benign exact-copy/empty trailing case passes. Generated 819-row CSV tests width and tab workflow; original S2.csv with duplicate headers not available as unredacted file, outcome cannot be asserted without its values.
- **A5 Minimal Patch 19/20**: production/docs parser preflight, shell UI, runtime selection, field catalog, and existing Node/browser tests only; no code generation, templates, transfer/approval state, XML export schema or identity policy changes.
**QUALIFICATION** 95/100; per criterion >=18/20; decision CONTINUE within agreed role-tab CSV-import scope.

## Changed modules
1. `xml-compare/table-categorizer/table-categorized-iso-table-preflight.js` + `docs/` mirror: compare later duplicates against first-column cells, preserve raw columns and BOM; skip blocker for identical/blank-redundant cells or entirely blank unnamed headers. Keep blockers for conflicts and unnamed data.
2. `xml-compare/table-categorizer/table-categorized-xml-shell.js` + mirror: accessible separate role tabs, active-role-only preflight, distinguish informational field diagnostics from real warnings; keep Safe autofix copy.
3. `tabs/xml-compare-table-categorized-runtime.js` + mirror: role-tab click action, preserve role after upload/blocker, keep ISO template on Table step so role tabs are visible.
4. `xml-compare/table-categorizer/table-categorized-field-catalog.js` + mirror: sparse optional S1 X/Y/Z informational not warning; other heavy blank fields continue to warn.
5. `tests/xml-compare-iso-csv-preflight.test.js`, `tests/table-categorized-field-catalog.test.js`, `tests/browser/iso-source-csv-buttons.spec.mjs`: benign/conflicting duplicate headers, sparse coordinates, two tabs and 819-row CSV UI.

## Validation observations
- Full XML script except unrelated tracked startup build-stamp exception, full Table suite: **PASS** on GitHub Actions first head `b3f7ee7562e9547b479e3c2d4aa466632cd55e84`.
- First Chromium run: **FAIL** — the new role tabs were hidden because load-template navigated to Columns. Isolated source transition and corrected production/docs runtime. Not a test tolerance relaxation.
- Latest XML/Table CI: **PASS** on workflow run `40665244568`, tested product commit `57b1f16c73593e73ea012036435bc765505738a0` (full Table suite plus XML suite excluding tracked legacy build-stamp baseline).
- Latest Chromium ISO engineering browser: **PASS** on same workflow run and code commit. The test exercised actual table source buttons, source-role tabs, a rejected wrong-role S2 file, a valid S2 CSV, generated 819-row CSV with redundant matching NODE_NAME/empty trailing column, preserved S1 data and native drag/drop. First two failed CI runs produced targeted fixes in template navigation, blocked-upload role selection, and a stale expected-navigation test. No adverse schema blocker was weakened.
- Post-test report-only update does not alter product files or test code; exact new PR HEAD may have no workflow run due to path filters.
- Production/docs source parity: **PASS** four changed modules exact matching Git blob SHA.
- User's actual S2.csv with duplicate columns: **NOT_RUN** (header excerpts only), thus do not claim both duplicate values are equal or confidently remove its actual blockers.
- Local `utils/backup.cjs` and ignored `.agent-worklogs`: **NOT_AVAILABLE** in GitHub connector-only environment. Every existing file edit used GitHub SHA-preconditioned update. Git history/diff provides file-level selective recovery; do not claim a physical local backup.

## Highest risk
Some real repeated `NODE_NAME` values might conflict. Preflight must continue blocking those until explicit authoritative column selection; never silently infer from `SupportISONOTE`. Blank S1 X/Y/Z retain original emptiness, no synthetic zeros.

## EXACT_NEXT_ACTION
Request independent review of the guarded duplicate-header relaxation and S1/S2 role-tab UX; collect actual S2.csv header/cell evidence if still blocked. PR is green at last code HEAD; leave open pending explicit merge instruction for this follow-up. If failure, isolate only the specific production bug, do not weaken adverse duplicate test or remove source-custody enforcement.
