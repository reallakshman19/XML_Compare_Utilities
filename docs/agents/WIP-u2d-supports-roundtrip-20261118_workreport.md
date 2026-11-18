# Supports from CAESAR II, steps 4 and 5: the sample button and the round trip (18 Nov 2026)

**Owner's words (18 Nov):** "Yes, start both". This comes after step 3 merged (PR 291, main 20cdc213). The plan is in `topofix-agents/roadmap/UXML-SUPPORTS-FROM-CII-PLAN.md`.

## What changed

**Step 4, the sample button:** section 5 has a new button, "Use the EF-05 support-edits sample" (`review.html`, `UxmlV2TransferReview.js`). It runs step 10's Enriched EF-05 with `fixtures/uxml-v2-transfer/EF05/supports-edits.cii`. That file has four scripted edits:
- node 50's stiffness changed to 2E+12;
- node 90's support removed;
- a guide added at node 240;
- a support on node 99999.

**Step 5, the round trip:** `prototypes/u2d-cii-source/supports_roundtrip.py` (new) runs step 10's writer on a revised XML and compares the written CII's supports with the edited CII's, node by node.
- The writer is 3D_Converters' `converters/scripts`, run through `u3b_core.convert`.
- Step 10's own open-end anchors are left out on both sides.
- A direction counts only where the edited CII gives one, as `support_report` compares them.

## Checked

**`tests/uxml-v2-supports-roundtrip.test.mjs` (new; needs `U2D_PYODIDE` and `U3B_3DC`):**
- Section 5's final XML for the four-edit CII, run through step 10 again, gives exactly the edited supports.
- Only node 99999 differs, the support the transfer refused.
- **Control:** the XML as opened differs at all four nodes (50, 90, 240, 99999), so the check is not empty.

**Node:** the round-trip, apply, receipt, EF-05 sample, in-app and lock tests pass, 27 of 27.

**Browser, local server:** the new button gives:
- 41 values;
- 3 support changes, transferred and locked;
- node 99999 refused;
- node 90 "Supports" stopped by a lock.

## The Owner's checks (plan), as run

- [x] No edits: step 10's own EF-05 CII gives 0 support changes; BM2 also gives 0 (steps 1–3, live).
- [x] With the four edits: 3 support changes transferred, 1 refused with "a node the XML does not have".
- [x] The 30 open-end anchors never appear as added supports.
- [x] The revised XML shows the new stiffness, has no removed support, and has the new guide on its node.
- [x] Step 10 run on the revised XML gives back the edited supports. This is the round-trip test; only node 99999 differs.
- [x] The BM2 and EF-05 temperature samples are unchanged: 10 values and 41 values.

These are my runs, not your acceptance.

## Notes

**Step 10 writes the added guide at node 240 with direction cosines (0, 0, 1).** The scripted edit had none, so the guide counts as equal under the comparison rule.

**Still open, both changes in 3D_Converters that need the Owner's word:**
- Support locks are not in the step 10 note, so the live app does not protect them.
- Step 10 never writes the 11 EF-05 supports on nodes numbered -2.
