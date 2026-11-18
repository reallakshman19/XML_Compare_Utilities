# Supports from CAESAR II, step 2: support changes in the receipt (18 Nov 2026)

**Owner's word:** "Start step 2" (18 Nov), after step 1 was merged (PR 289, main d8013df8). The plan is in `topofix-agents/roadmap/UXML-SUPPORTS-FROM-CII-PLAN.md`.

## What changed

**`prototypes/u2d-cii-source/u2d_supports.py`:**
- **Each support change names the one XML node it belongs to** (`ref`: branch, node ordinal, NodeNumber, ComponentRefNo).
  - For an edited or removed support, that is the node holding the supports at that point.
  - For an added one, it is the node numbered like the CII node, or else the only numbered node at that point.
  - When it is unclear, the change is refused with `U2D_SUPPORT_TARGET_UNCLEAR` and a plain reason.
- **Before and after are written in plain words,** for example "+Y, stiffness 1.7513E+12, friction 0.3".
- **Refusals name the XML node** instead of an ordinal pair.

**`u2d_plan.py` and `u2d.py`:**
- `plan()` returns a `supports` block with its changes and refusals.
- The receipt carries it as `receipt.supports`.
- `receipt.changes` and `receipt.refused` are unchanged, so TransferStage applies exactly what it applied before. No support is applied yet; that is step 3.

**Section 5 (`review.html`, `UxmlV2TransferReview.js`):**
- A new table, "Support changes from CAESAR II (listed only, not applied to the XML yet)", with the columns Branch, Node, Change, In the XML and In CAESAR II.
- Under it, a "Support differences not listed" table gives where and why.

**`uxml/v2/transfer/SupportLines.js` (new):** the page's support words as pure functions, `supportsLine` (moved from the page) and `supportRows`.

**Pin:** re-pinned; it still holds 11 files.

## Checked

**Python, `prototypes/u2d-cii-source/tests`:** 29 of 29 pass with `U3B_3DC` set to the 3D_Converters worktree. That includes 3 new tests:
- a change names its node and gives plain before/after text;
- an added support goes on node 90;
- the receipt lists a removed support while its value changes stay empty.

**Node:** 19 of 19 pass:
- `tests/uxml-v2-supports-receipt.test.mjs` (new, 4);
- the in-app tests (3), including the BM2 receipt equal to the command line's;
- the EF-05 sample (5);
- the locks (7).

**Full Node suite:** see the PR. It is compared with main's 67 existing failures.

**Browser (local server):** step 10's EF-05 XML with an EF-05 CII carrying two support edits, node 50's stiffness changed to 2E+12 and node 90's support removed:
- 41 values were transferred, as before.
- The line reads "160 points the same, 2 changed in CAESAR II".
- The table shows node 50 as "support edited" (+Y, stiffness 1.7513E+12 becomes +Y, stiffness 2E+12) and node 90 as "support removed".

## Not changed

- The 11 EF-05 supports that step 10 does not write (ATTA nodes numbered -2) are counted in the line and not listed.
- The open Owner questions for step 3: the lock rule for transferred supports, and who makes the edited CII.
