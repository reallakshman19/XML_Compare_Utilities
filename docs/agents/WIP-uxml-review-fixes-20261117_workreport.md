# WIP-uxml-review-fixes-20261117 — fixes from the 17 Nov high-effort review (XCU part)

## Mission and scope
Independent high-effort review (roadmap REVIEW-20261117-HIGH.md, outside the repo). Owner, 17 Nov: "Paired branches only".
| Finding | Fix |
|---|---|
| B2.1 branch values by name only | u2d_plan.paired_into: an element gives branch values only when both ends are in the match-psi116 pairs, one of them in that branch; else U2D_BRANCH_NOT_PAIRED (CLI and page) |
| B2.2 weight unit preselected | page: unit must be chosen; U2dInBrowser refuses a missing unit; u2d_plan.check_weight_scale refuses >=5 weight edits with >=80 % exactly x10/x0.1 (U2D_WEIGHT_SCALE_SUSPECT) |
| N2.3 BOM dropped -> lock step refused | section 5 decodes XML with ignoreBOM (both receipt and CII routes) |
| N2.4 traceback as message | U2dInBrowser.pyCall surfaces the code line |
| N2.6 stale text | trU2d cleared at the start of a transfer |
| N1.3 record before engine | runOutcome / facts line first; held table heading (3DC writes `outcome`) |
| refusal details | section 5 shows the refusal's details (e.g. branch/node of a structure change) |

## Validation
| Check | Status | Observation |
|---|---|---|
| U2d unittest (+ test_u2d_rules.py) | PASS 18/18 | |
| test:uxml-v2 | PASS 87, 0 fail, 3 skipped | BM2 full page run with U2D_PYODIDE: 3/3 |
| CLI vs page, BM2 / EF-05 | PASS | XML byte-equal, receipts equal; BM2 still 10 values (2 branches now U2D_BRANCH_NOT_PAIRED instead of MATERIAL_CARRIED), EF-05 still 1,183 |
| Reviewer probe p2-transfer | PASS | moved geometry: 0 branch values, 31 NOT_PAIRED; wrong unit refused (143/143 x10) |
| Browser local: EF-05 (BOM) | PASS for the BOM | lock check passes; then UXML_ENGINEERING_STRUCTURE_CHANGED at node 390 (supports stage adds a restraint) — known limit, reported |
| Browser local: run record facts | PASS | outcome line first; old records derive it from parity |
NOT RUN: live Pages; N1.1 (whole-record hash), N1.2 (branch-subset false alarm), N3.x, N2.5 (JS/Pyodide not pinned) left as notes.

## EXACT_NEXT_ACTION
Owner push word -> draft PR (with 3DC fix/uxml-review-findings-20261117).
