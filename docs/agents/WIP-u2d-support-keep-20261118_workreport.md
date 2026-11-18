# Support locks in step 10, step 2: the supports step keeps the note's nodes' supports (18 Nov 2026)

**Owner's word (18 Nov):** "Yes, add step 2", on the same branch as step 1. The plan is in `topofix-agents/roadmap/UXML-SUPPORT-LOCKS-STEP10-PLAN.md`.

## What changed

**`uxml/v2/supports/process/TransferSupportsKeep.js` (new):**
- `transferSupportKeys` reads the note's `supports` list from the text.
- `snapshotTransferSupports` copies the `<Restraint>` entries of each named node from the stage's input.
- `restoreTransferSupports` puts exactly those back on that node in the final XML: what the run added there is removed, and what it removed comes back.
- Nodes are keyed as the note keys them: a branch name used once and a NodeNumber used once in that branch. A named node that is not found gives a warning, `TRANSFER_SUPPORTS_NODE_NOT_FOUND`.
- When something was kept, one info diagnostic: "n node(s) keep the supports transferred from CAESAR II", with the nodes listed.
- No note, or a note without `supports`: the text comes back unchanged.

**`uxml/v2/supports/SupportsStage.js`:**
- The snapshot is taken at the start. The restore is the very last step, after the MDS closure (the ATTA-default and MDS-closure steps re-add default supports after process parity).
- New `stats.transferSupportsKept`.

## Checked

**`tests/uxml-v2-support-keep.test.mjs` (new), 3 of 3 pass.** The input is section 5's final XML for the four edits.
- `runSupportsStage` keeps node 90 without a support, node 50 at 2.000000E+12 and node 240 with the GUI.
- The diagnostic reads "1 node(s) keep ...": node 90, where the run wanted `+Y 1.751270E+12 0 0.3`.
- **Control:** the same XML without the note gets node 90's support back.
- A file with no note: nothing kept, no diagnostic.

**All `tests/uxml-v2-*.test.mjs`** (with `U2D_PYODIDE` and `U3B_3DC` set): 113 tests, 111 pass, 0 fail, 2 skipped.

## Not yet checked

- **The CII the full step 10 writes.** This needs 3D_Converters re-vendored (plan step 3) and a browser run of the full workflow.
- **The unticked UXML route:** also step 3.
