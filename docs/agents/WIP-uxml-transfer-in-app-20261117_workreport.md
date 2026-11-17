# WIP-uxml-transfer-in-app-20261117 — CAESAR II -> Enriched XML transfer in the review page

## Mission and scope
Owner, 17 Nov 2026: "Transfer in the app" -> plan (roadmap UXML-TRANSFER-IN-APP-PLAN.md) -> "Yes, build it".
Section 5 of uxml/v2/review.html takes the Enriched XML + the CAESAR II file and runs the U2d transfer in the browser
(same code as the command line), then the existing transfer-under-locks flow with the receipt it made.

## Changed files
| File | Change |
|---|---|
| uxml/v2/transfer/U2dInBrowser.js (new) | pinned Python loader (Pyodide), match-psi116 in JS, U1 in JS, transferCiiIntoXml; page rule U2D_NO_NODE_PAIRS |
| uxml/v2/transfer/u2d-py-pin.json (new), scripts/pin-u2d-py.mjs (new) | SHA-256 of the 10 Python files; Pyodide 0.27.2; 3DC commit e53ae9a0 |
| uxml/v2/vendor/cii-v11-v14/*.py (new, 6) | 3D_Converters converters/scripts at e53ae9a0 (same bytes as its v045 copy) |
| prototypes/u2d-cii-source/u2d.py | check_inputs, u1_envelope, build_receipt split out (CLI behaviour unchanged) |
| prototypes/u2d-cii-source/u2d_plan.py | de-duplicated refusals sorted (was set order: differed run to run) |
| prototypes/u2d-cii-source/u2d_browser.py (new) | to_v14, plan_edits, finish for Pyodide |
| uxml/v2/UxmlV2TransferReview.js, review.html | CAESAR II input, weight unit, Transfer + BM2 CII sample buttons, receipt/XML downloads; process.argv line + import map for the matcher's vendored validator (as on the matcher's own page) |
| fixtures/uxml-v2-transfer/BM2/source.cii (new) | BM2 CII (public), the receipt's source (sha 51dc211f) |
| tests/uxml-v2-transfer-in-app.test.mjs (new), package.json | pin, pin tamper, BM2 full run (needs U2D_PYODIDE) |
| .gitattributes in u2d-cii-source, u3b-cii-check, vendor/cii-v11-v14 | pinned files keep exact bytes (LF) on every checkout |

## Validation
| Check | Status | Observation |
|---|---|---|
| Command line vs page code (Pyodide in Node), BM2 and EF-05 | PASS | transferred XML byte-identical; receipt text identical apart from the CLI's Windows CRLF; BM2 10 values, EF-05 1,183 |
| u2d unittest (RMS-BLOW-1) | PASS 14/14 | |
| test:uxml-v2 | PASS 87, 0 fail, 3 skipped | the BM2 full run skips without U2D_PYODIDE; run with it: 3/3 PASS |
| Browser (local 8779): BM2 XML + BM2 CII | PASS | 10 transferred, 643 pairs, refusals as CLI, 4.2 s; tables identical to the old BM2 receipt sample |
| Browser: EF-05 CII against BM2 XML | PASS | refused U2D_NO_NODE_PAIRS, nothing shown |
| Browser: "Use the BM2 CAESAR II sample" | PASS | same result, 2.9 s |
NOT RUN: live Pages (after merge); step-10 Run of the downloaded XML (same bytes as the CLI-made XML, which step 10 already keeps).

## EXACT_NEXT_ACTION
Owner push word -> draft PR; merge word; then live check of section 5 with the BM2 CAESAR II sample.
