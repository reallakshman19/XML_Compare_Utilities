# PR220 — Explicit S1/S2 CSV/TXT input and transaction-safe preflight

**WORK_INTENT:** IMPLEMENT · **CRITICALITY:** ENGINEERING_CRITICAL · **STATUS:** READY_FOR_REVIEW
**PR:** https://github.com/reallakshman19/XML_Compare_Utilities/pull/220
**Branch:** `feat/iso-s1-s2-csv-preflight-buttons-20261028`, based on `main` `f578d45950f578ad50cc32a68936484269b773d4`.
**Owner request:** Add S1/S2 CSV buttons next to 📥 Drag & Drop, robust preflight and autofix. **Merge authority:** NOT GRANTED. Do not merge.
**Recovery:** `agents/WIP-iso-csv-import-20261028_workreport.md` initial Appendix A; this report records actual outcome, evidence and selective recovery.

## Result

- S1 PS Mapping and S2 ISO Notes picker buttons next to the original drop zone. Native drag/drop now targets the currently selected Table ID. Existing generic upload remains.
- Pure `preflightIsoTableText` validates .csv/.tsv/.txt, strict UTF-8 (browser file reader), 16 MiB limit, empty/NUL, quoted CSV, delimiter, required columns and source-role schema, semantic duplicate/alias headers, blank/odd IDs, and row-shape diagnostics with exact row IDs.
- **Safe autofix only:** strip UTF-8 BOM in parsed copy while retaining `originalSourceText`; automatically detect delimiter; alias `Support No`→`PS NO` and known capitalization while preserving source raw cells. S2 ISONOTE text and load/gap numerical data never silently change.
- Fail-closed: malformed/wrong-role/import error retains both old datasets and generates a visible row-referenced preflight report; no partial writes. Passing imports populate S1/S2 using existing `loadIsoNoteTemplate` and parsing transforms. User review remains required for noncanonical IDs, which are preserved, not substituted.
- No comparison, transfer, authority, model, geometry, or target-XML changes.

## Files / exact preimage SHA ledger
| Path | Baseline blob SHA | Final branch blob SHA |
|---|---|---|
| `xml-compare/table-categorizer/table-categorized-xml-shell.js` + `docs/` mirror | `09ed1a9a30d9ed75673abf70825cfcac3b2aa74b` | `a48e45b0528ff1af8734c4e3ef2bb8c5e7d54de0` |
| `tabs/xml-compare-table-categorized-runtime.js` + `docs/` mirror | `efe5fb46af78a1259d550d1fe5a28b71bfd847da` | `3d9110279b882ea0af8c7e9a531011db3072e63c` |
| `tests/table-categorized-action-contract.test.js` | `17a76b5744651a957eddeb5b2d852bc4854b5b75` | `1ec8e142fe069acda0145d0bf72f09a8a3487ed1` |
| `package.json` | `9bcf186127cfb43f0691e6b439790ca23d3980d7` | `35aef8c6dc798bd7538a4392e4479be95ef4535c` |
| `playwright.iso-composite-identity.config.mjs` | `a44610ba03c89e2fb8ba6193ceac924e5b5e5f0d` | `c2f47699e558bc0392bf834dbc86c43df4769d4a` |
| `xml-compare/table-categorizer/table-categorized-iso-table-preflight.js` + `docs/` mirror | new | `278b848c99aa229e29933673a0a413f813b85af0` |
| `tests/xml-compare-iso-csv-preflight.test.js` | new | check latest branch |
| `tests/browser/iso-source-csv-buttons.spec.mjs` | new | check latest branch |

**Selective rollback:** compare current blobs to branch and preimage SHA; remove role-specific UI, hooks, and preflight service together; preserve all unrelated changes. No broad reset/revert. Source and docs copies verified byte-identical on this branch.

## Validation

**Status PASS**: GitHub Actions `ISO Composite Identity Qualification` run `40649096358`, code head `7e782391dea9d37f2c3691f47c4e8706ca36070b`:
- XML full scripted suite except pre-existing main-branch obsolete CSS build-stamp assertion: PASS. The separately executed legacy assertion remains knowingly nonblocking and is not claimed as a full clean XML suite.
- Full `npm run test:table` including new 11-scenario preflight and UI-action contract: PASS.
- Chromium Playwright ISO config: **3 tests passed**, including actual S1 upload, duplicate/wrong-role rejection, S2 quoted CSV, source preservation and drag/drop; browser page-error list empty.
- Production JS↔docs mirrors: PASS, three exact content checks.
- Topology 1885 / Support Report Typicality CI: PENDING at report time; check exact latest SHA before merge.
- Original confidential 2778/819 input replay: NOT_RUN in public CI; synthetic only.
**Independent oracle:** expected schema and unchanged raw data from parser API and original engineering safety constraints; actual Chromium UI test confirms real file control wiring (not only static DOM).
**Exposure limits:** loaded UTF-8 decoded text preserved; no original-byte hash guarantee for non-UTF8 source; 16 MiB cap. Original note values remain raw.

**Known limitation:** new buttons target the Table Categorized XML popup, not a separate global top-level file picker. Safe autofix never resolves semantic ambiguity (duplicates, malformed rows, blank IDs). If invalid UTF-8/extension, request corrected input rather than interpreting lossy text.

## Risk / change isolation
Generic manually selected CSV upload remains on prior path for non-ISO use. Only the new S1/S2 buttons and drop zone invoke strict ISO preflight. Draft role data survives template load, and blocking errors cannot replace old records. Source transformations otherwise remain existing code.
**Backup constraint:** local `utils/backup.cjs`, ignored `.agent-worklogs` unavailable in GitHub-connector-only environment: **NOT_AVAILABLE**. All modifications use preimage blob SHA preconditions and recoverable immutable GitHub history; do not assert local backup compliance.

## EXACT_NEXT_ACTION
Check Topology and Support Report workflows on current PR220 head; request engineering review of safe-autofix boundary and full-dataset acceptance; keep PR open pending owner explicit merge authority. Deploy and smoke test original S1/S2 files only after merge/deployment sign-off.
