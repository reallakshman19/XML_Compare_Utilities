# Support locks in step 10, step 1: the note names the nodes whose supports were transferred (18 Nov 2026)

**Owner's words (18 Nov):** "Support locks in step 10", then "Yes, start step 1". The plan is in `topofix-agents/roadmap/UXML-SUPPORT-LOCKS-STEP10-PLAN.md`.

**Why:** the full step 10, run on section 5's final XML for the EF-05 four-edit sample, writes node 90's removed support back. Inside the supports step, the ATTA-default and MDS-closure steps re-add default supports after the protected values are restored. Step 2 fixes that; step 1 gives step 10 the list of nodes to protect.

## What changed

**`uxml/v2/transfer/TransferNote.js`:**
- New `supportNoteKeys(doc)` returns the nodes that carry a supports lock, in lock order: `keys` (`<Branchname>|<NodeNumber>`) and `unkeyed` (with the reason).
- Keys follow the note's `nodes` rule: a branch name used once, and a NodeNumber used once in that branch.
- `noteFromLocks` writes `"supports": [...]` after `nodes`, only when there are keys. A note without support locks is byte for byte as before. It stays `v: 1`.

**`uxml/v2/transfer/TransferStage.js`:** `noteLockStage` puts the supports lock back on the nodes the note's `supports` list names, so a file reopened from its note is protected as it was. A NodeNumber that is already locked keeps its lock.

**`uxml/v2/transfer/LockedEngineering.js`:** the result now includes `supportsNotKeyed`.

**`uxml/v2/UxmlV2TransferReview.js`:** when some nodes cannot be keyed, section 5 says so in plain words: they keep their supports on the page, but step 10 will not protect them.

## Checked

**Node:** `tests/uxml-v2-supports-apply.test.mjs` has 3 new tests:
- the note names nodes 50, 90 and 240;
- a file reopened from that note gets the support locks back, and node 90 stays without its support;
- a node whose number is used twice in its branch is listed as not keyable.

The round-trip, apply, receipt, EF-05 sample, in-app and lock tests pass, 30 of 30. The BM2 note stays byte-equal (the lock tests).

**Today's live readers accept the new key and ignore it:**
- 3D_Converters' `readTransferProtection` (vendor/uxml-v2) reads the branches unchanged.
- The Python writer's `_load_transfer_protection` reads the branches unchanged.

**Browser (local server):** the EF-05 support-edits sample's "Download the final XML" carries a note with 41 branches and `supports` = the three nodes. No not-keyable notice appears.

## Not changed

- **Step 2:** the supports step putting those nodes' restraints back at the end.
- **Step 3:** 3D_Converters re-vendored, plus the unticked route.
- **Step 4:** the round trip through the full step 10.
