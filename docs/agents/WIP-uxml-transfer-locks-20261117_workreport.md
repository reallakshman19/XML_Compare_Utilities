# WIP-uxml-transfer-locks-20261117 = PR 283 — UXML plan step 6: the property transfer as a UXML change with locks

## Mission and scope
Owner, 17 Nov 2026: "Start step 6", then "Build, merge 282 first" (design D:/CodeD/topofix-agents/roadmap/UXML-STEP6-DESIGN.md, local).
Plan check 5: a U2d transfer done as a delta keeps its locked values through `engineering`; a stage that tries to change them reports a conflict.
Plan check 6: the review page shows each change with its rule and source. Owner D5 (13 Nov): "Transferred values win"; the transfer is post-processing on the Enriched XML.
Not in scope: making the 3D_Converters UXML route the default (needs the Owner's live test and word), Mode B, a transfer button in 3D_Converters, structural engineering changes under locks.
Classification: ENGINEERING_CRITICAL (XML engineering values), additive; no existing runtime path changes.

## Base
main 5a554c1d (PR 282 merge, tree equal to cfea5beb). Branch feat/uxml-transfer-locks-20261117.

## Implementation
- `uxml/v2/transfer/TransferStage.js`: `transferStage` (receipt -> set + lock ops; material follows the branch, today's rule), `noteLockStage` (locks from an existing note), `fieldKey`.
- `uxml/v2/transfer/TransferNote.js`: `readTransferNote`, `noteFromLocks`, `noteComment` (byte-equal to U2d `protect`), `withTransferNote`, `withoutTransferNote`.
- `uxml/v2/transfer/LockedEngineering.js`: `valueChangeOps`, `runEngineeringUnderLocks` (stage gets PSI116 without the note; kernel drops locked writes and lists conflicts; structure change refused).
- `uxml/v2/UxmlV2TransferReview.js` + `review.html` section 5. `README.md` step 6 section. `package.json`: the test joins `test:uxml-v2`.
- Fixtures `fixtures/uxml-v2-transfer/BM2`: base.xml (Owner's BM2 Enriched XML with the 11 Nov CII weights, sha 3449c547), receipt.json (U2d, 14 Nov control CII), protected.xml (the U2d output, sha 5abd49bf); `.gitattributes` keeps them byte-exact. BM2 is a public test model (Owner 16 Nov).

## Validation
| Check | Status | Observation | Oracle |
|---|---|---|---|
| Transfer delta = receipt (10 set + 10 lock, 70 refusals), written file = U2d file byte for byte | PASS | node --test | independent (U2d output file) |
| Under locks: 127 / 110 / 106 kept, conflicts exactly T1 120 and FluidDensity 100; node codes 106 | PASS | node --test | receipt + U2d file |
| Values equal the stage's own note protection on the U2d file; note text identical | PASS | node --test | stage port of today's protection |
| Values equal 3D_Converters today's route on the U2d file (jsdom, main 6ede0bf3d) | PASS | scratch checks.mjs (Oracle local) | today's live code |
| CII from the final XML vs today's route: byte-equal | PASS with note | today's writer refuses BOTH files for the same 8 rigid weights without one CII owner (from the 11 Nov CII weights in this test file); with that guard off for both, byte-equal | today's writer |
| Undo of the transfer = base byte for byte; tampered delta refused (UXML_DELTA_RESULT_MISMATCH) | PASS | node --test | kernel |
| Control: without locks the stage puts T1 back to 120 | PASS | node --test | — |
| Locks from the note give the same final file and conflicts | PASS | node --test | — |
| Review page section 5 on the BM2 sample (local server, browser) | PASS | 10 transferred, 62 follow-ups, 70 refused, 177 stage changes, 2 stopped; no console errors | — |
| Full `npm run test:uxml-v2` (18 files incl. the new one) | PASS | exit 0 | — |
| EF-05 transfer pair | NOT_RUN | no EF-05 receipt exists (EF-05 transfer parked 14 Nov) | — |

## Risks and decisions
- Structural changes under locks (node or restraint changes by the stage) are refused, not handled; on Enriched XML input the stage changes values only (BM2 measured).
- The receipt must be for exactly this file (sha); a re-saved file needs a new transfer.

## EXACT_NEXT_ACTION
Draft PR 283 is open. Owner: open review page section 5 (BM2 sample); merge on the Owner's word.
