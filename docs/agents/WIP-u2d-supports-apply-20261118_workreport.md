# Supports from CAESAR II, step 3: support changes applied and locked (18 Nov 2026)

**Owner's words (18 Nov):** "Yes, allow and lock" (supports added, removed and edited in CAESAR II are applied and locked), then "Yes, start step 3". The plan is in `topofix-agents/roadmap/UXML-SUPPORTS-FROM-CII-PLAN.md`.

## What changed

**`prototypes/u2d-cii-source/u2d_supports.py`:**
- Each support change now carries `restraintCount` and `restraints`, the exact `<Restraint>` edits on its one node: keep, edit, remove or add, with the texts before and after.
- A restraint that already equals a CAESAR II support is kept. Otherwise it is edited into the remaining CII support (same type first) or removed, or the CII support is added.
- A field that already equals CAESAR II keeps its XML text, so a stiffness edit changes only `<Stiffness>`.
- The CII's raw values are kept, so an edited stiffness is written as `2.000000E+12`, not rounded.

**`uxml/v2/transfer/TransferStage.js`:**
- `receipt.supports.changes` are applied as kernel ops: set, remove, or add a restraint. Every value of an edited or added restraint is locked.
- The node's NodeNumber gets a supports lock (`field: 'Node/Supports', supports: true`).
- A receipt that saw other restraints on the node is refused with `UXML_TRANSFER_BEFORE_MISMATCH` (field `Node/Supports`).
- The stage now declares the `supports` layer.

**`uxml/v2/transfer/LockedEngineering.js`:**
- On a node with a supports lock, the stage's restraints are never taken.
- When they differ from the transferred ones, the attempt is one conflict, key `Supports`, listing what was kept and what the stage wanted.
- Every other node stays values-only, as before.

**`uxml/v2/transfer/TransferNote.js`:** support locks are not written to the TOPOFIX-TRANSFER-PROTECT note, because today's step 10 note has no place for them.

**Page:**
- The heading now reads "Support changes from CAESAR II (applied to the XML and locked)".
- The summary adds "n support change(s) transferred and locked".
- The supports line reads "applied and locked, listed below".

**Fixture:** `fixtures/uxml-v2-transfer/EF05/supports-edits.cii` is `source.cii` with four scripted RESTRANT edits:
- node 50's stiffness changed to 2E+12;
- node 90's support removed;
- a guide added at node 240;
- a +Y support on node 99999, which the XML does not have.

**Pin:** re-pinned, 11 files.

## Finding

**The supports stage itself puts node 90's removed support back** on step 10's Enriched EF-05. This is the wrong output the plan's fifth check was written to catch. The lock stops it, and section 5 lists it as stopped by a lock: kept "none", the stage wanted "+Y 1.751270E+12 gap 0 friction 0.3". The final XML has no support on node 90.

## Checked

- **Python:** 33 of 33 pass (`tests.test_u2d`, `tests.test_u2d_rules`, `tests.test_u2d_supports`, with `U3B_3DC` set). Among them, 4 new tests cover:
  - three changes and one refusal;
  - exact edits;
  - a bare axis type keeps its letter;
  - the round trip: the edits applied to the XML (ElementTree), then compared again, give 0 changes.
- **Node:**
  - `tests/uxml-v2-supports-apply.test.mjs` (new): 7 of 7 pass, the Pyodide EF-05 four-edit run among them.
  - The supports, EF-05 sample, in-app and lock tests all pass, 21 tests.
  - The `*transfer*` tests have two failures; both are on main's list of 67 known failures.
- **Browser (local server), the EF-05 four-edit CII:**
  - 41 values and 3 support changes are transferred and locked.
  - The table shows node 50 edited, node 90 removed and node 240 added.
  - "CII node 99999: this support is on a node the XML does not have".
  - "Supports" at node 90 is stopped by a lock.
  - The plain EF-05 sample gives 41 values and 0 support changes; BM2 gives 10 values and 0 support changes.

## Not changed / left for later

- **The "Download the transferred XML" file** (U2d's own output) still carries values only. The supports are in section 5's final XML ("Download the final XML").
- **Support locks stay inside UXML.** A file written from section 5 has the supports themselves, but today's step 10 note does not protect them in the live app.
- **Step 4 (the sample button) and step 5 (step 10 run again on the revised XML)** are next.
