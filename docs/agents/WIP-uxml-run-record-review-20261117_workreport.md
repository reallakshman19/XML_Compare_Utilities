# WIP-uxml-run-record-review-20261117 — review page section 4 "Open a Run record"

## Mission and scope
Owner, 17 Nov 2026: "Yes, build it". 3D_Converters step 10 now downloads a Run record after a Run on the UXML route
(that Run's own supports-stage provenance, the CII input XML, hashes, transfer-protected values; separate 3DC PR).
Section 4 opens it and shows the same support and engineering tables (with CSV) without re-running anything, plus the
Run facts (stage commit, parity, comparison with today's route), the transfer-protected values (kept / CHANGED), and,
if the model XML is opened too, whether it is the Run's input file or CII input XML. A record whose CII input XML no
longer matches its hash is refused.

Files: uxml/v2/UxmlV2RunRecord.js (new), uxml/v2/UxmlV2SupportsReview.js, uxml/v2/review.html,
tests/uxml-v2-run-record.test.mjs (new), fixtures/uxml-v2-run-record/G30_uxml-run-record.json (a GOLDEN-30 Run recorded
with the 3DC branch in Node), package.json (test:uxml-v2 includes the new test).

## Validation
| Check | Status | Observation |
|---|---|---|
| tests/uxml-v2-run-record.test.mjs | PASS 2/2 | record rows deep-equal a fresh stage run on the same inputs (150 support rows); wrong XML -> null; changed record refused |
| test:uxml-v2 | PASS | 85 pass, 0 fail, 2 skipped (CII gate needs UXML_CII_WRITER) |
| Browser, local server: G30 record + G30 XML | PASS | 150 of 150 rows, 449 engineering values, "the Run's input file" |
| Browser: BM2 transfer-protected record + another XML | PASS | "NOT the file of this Run record"; 10 of 10 transfer values kept |

## EXACT_NEXT_ACTION
Local commit only. Owner word to push + open draft PR.
