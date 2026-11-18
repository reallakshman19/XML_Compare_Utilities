# Section 5: EF-05 sample and a plain refusal (18 Nov 2026)

**Owner's word:** "Yes, build it" (18 Nov). This is step 4 of the EF-05 recovery plan, after the step-10 fix (3D_Converters #431) and the 7 mm default (#287).

## What changed

**Plain refusal:** `uxml/v2/transfer/NotThroughStep10.js` provides `runUnderLocksOrExplain`.
- It runs the locked stage as before.
- When that stage refuses for structure, it runs the stage once on the XML as opened. If that XML would change structure too, the page shows: "This XML has not been through step 10: the supports step would still change its structure (counts). Run it through step 10 (the XML to CII tab) and transfer into the Enriched XML that step 10 writes. Nothing was transferred."
- Otherwise the original refusal stands, because then the transfer itself caused the change.
- The lock rule (values only) is unchanged.

**EF-05 sample:**
- A new button, "Use the EF-05 CAESAR II sample", next to the BM2 one.
- Its files are in `fixtures/uxml-v2-transfer/EF05/`:
  - `base.xml`: step 10's Enriched XML;
  - `source.cii`: step 10's CII with Temperature 1 + 10 on all 616 elements.
- The README there gives the SHA-256 of each file and the expected result.

**Tests:** `tests/uxml-v2-ef05-sample.test.mjs`
- the fixture hashes;
- step 10's Enriched EF-05 is settled;
- the plain refusal, with no code in the message;
- the original refusal is kept when only the transfer causes the change;
- the full sample with Pyodide.

## Checked

**Tests:**
- New tests: 5 of 5 pass. The sample test ran with `U2D_PYODIDE` set to 3D_Converters `vendor/pyodide`.
- `tests/uxml-v2-transfer-in-app.test.mjs`: 3 of 3 pass, including BM2 equal to the command-line receipt, with Pyodide.
- `tests/uxml-v2-transfer-locks.test.mjs`: 7 of 7 pass.

**In the browser** (local server, this branch):
- **Raw EF-05 with its old receipt:** the plain message, with 164 nodes removed, 68 restraints added, 14 restraints removed and tags on 227 nodes. There is no result and nothing to download.
- **EF-05 sample:**
  - 41 values transferred, 743 node pairs, 616 elements;
  - refused: 45 ambiguous nodes, 41 material carried;
  - the stage changed 0 values;
  - 41 changes were stopped by a lock: the stage wanted 120 back, and 130 is kept;
  - 3.3 s.
- **BM2 sample unchanged:** 10 values, 643 pairs, refused 41 + 27 + 2, 2 changes stopped by a lock.

## Note, not changed

For branch values, the "Node" column can show -1: the receipt names an unnumbered elbow node as the branch's place.
