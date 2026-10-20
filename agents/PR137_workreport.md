# PR #137 — I126 MC126-PROT-A01 recovery-first workreport

## Mission / Owner purpose
Owner reported actual Writer2 Method C A-only screen with 57 original S1 physical NODE observations, 41 geometric near candidates, 5 original TARGET ELEMENT segment-only observations and 11 outside-tolerance rows, yet no UI next action. Purpose: a genuinely usable **A-only candidate investigation prototype**, not BOUND or Writer2 Apply. Owner explicitly said "proceed fix" after [Issue #126 Owner decision request](https://github.com/reallakshman19/XML_Compare_Utilities/issues/126#issuecomment-6269726896). BuddyRunner v1.7 already completed at #126; no repeated handover required.

**Source base:** draft PR136 @ `0a0f28ab5d4932f1412815c8c69e1c16445aee9f` directly, deliberately not `main`. Main at baseline `9a5916f972af170f272c525907728237391b7ca8`; main→PR136 has 85 unrelated inherited files. PR107 changed `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` but NOT this Method C bridge. This branch does not edit multi-source Writer2, BOUND logic, Method A/B/BM001, fixtures, frozen V11/V14 Python or Method C geometry algorithms.

## 1. Evidence / production trace / source architecture
Actual native current path: `mountMethodCWriter2NativeShell` obtains SHA-bound S1/S2/S3/T File custody; `mountMethodCWriter2ABridge` parses original signed graphs, computes A-only pose and immutable candidate sidecar, renders its own HTML in original Compare Review. Previously this was a dead end and parent continued to say `Input required` because its genuine Compare inspection state was absent. The new review controller is **only** mounted in the Method C sibling section. It must NOT mark the parent ready or mint BOUND.

### Exact changes (child PR scope)
- `docs/tabs/cii-workspace/cii-workspace-method-c-writer2-bridge.js` and mirrored `tabs/.../cii-workspace-method-c-writer2-bridge.js`: mount the A-only candidate investigation, clear on SHA/file/anchor/epoch reset, expose same immutable sidecar via existing getter, dispose with shell. Source/deployed blobs kept byte-identical.
- **New** `docs/tabs/cii-workspace/cii-workspace-method-c-a-candidate-review.js` and byte-identical `tabs/` mirror, under 300 lines: the real "Review geometric candidates →" action, interactive SOURCE NODE selection, distinct original TARGET NODE alternatives, signed TARGET ELEMENT segment evidence, original SOURCE ELEMENT witnesses, OD/wall, distance and XYZ residuals, filters/search, review dispositions `INVESTIGATE/REJECT/EVIDENCE_REQUESTED`, original SHA/epoch/pose-bound JSON receipt. No `BOUND`, no Writer2-authorizing operation; 0 mutations.
- New `tests/cii-workspace-method-c-a-candidate-review.test.mjs`: independent synthetic A-only pure predicate and forged physical authority refusal.
- New `tests/cii-workspace-method-c-a-candidate-review-browser.test.mjs`: authentic original S1/S2/S3/T in served docs Chromium, navigate native Writer2, interactive 4060 (original 900→905 segment-only) and 4970 (outside), save dispositions and actually download SHA-bound JSON, check 57 observations and 0 writer operations, change anchor and deny stale export.
- New task-scoped `.github/workflows/cii-i126-a01-prototype.yml` performs genuine preedit binary backups, full-history protected I126 native unit source/deployed parity, real Chromium, and history-independent selective rollback artifacts.
- `agents/WIP-I126-A01-20261020_workreport.md`: pre-edit plan, Appendix A source-first reconstruction, hypothesis/falsifiers.

## 2. Genuine backup/rollback (before existing-file edits)
Original both Method C writer2 bridge files Git blob `8ea39d62f230e5fef13bff5f67bc0f7047e66313`, original SHA256 `1658a0c981a584db889f0591b2d98b5d9d62c73f0386c078e22335577dc75a86`. Actual **`node utils/backup.cjs save` ran BEFORE the first bridge modification**, IDs **#90 docs / #91 tabs** on [run #39354421616](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39354421616); artifact [#12233883888](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39354421616/artifacts/12233883888). Preedit job PASS, full workflow initially FAIL for unrelated shallow Git scope fixture; do not call entire initial run green.

New review module initially produced nested second `tbody` which caused existing native test to count **114 != 57** (actual RED). A separate subsequent `node utils/backup.cjs save` #90/#91 for these new module files captured actual byte preimage at blob `07f05faa2fee74c7115d2225049f87cb3a984f17`, SHA256 `2091cf1331d2616cbfbade26433b5e0349a74459adddd9e559f075013275afc5`; the production correction changes that nested table into accessible `role=list` items. Review panel now reiterates `GEOMETRY_READY_A · physical verification pending · Transfer unavailable`. Source/deployed parity maintained.

History-independent selective undo workflow retrieves **the actual preserved original byte artifact**, asserts SHA and produces two `git diff --no-index --binary` patches plus exact after-SHAs and new-file SHA receipts in `.agent-worklogs` artifact. Undo requires checking current SHA before selectively restoring original snapshots, never reset/revert/checkout or deleting later work. Check exact latest run for green selective-undo job before claiming qualification.

## 3. Testing and known limitations
- Earlier native Chromium test **FAIL** at 114!=57; root cause was a second candidate table nested inside original geometry section. Corrected to a separate accessible list. That test is retained, not weakened.
- Initial inherited `cii-workspace-method-c-i126-firebreak.test.mjs` on this large stacked branch **FAIL** correctly against its frozen `main→PR127` grant expectation (the inherited #121 stack already changed many other files). Keep the test unchanged; the task-scoped CI now runs the untouched reusable sidecar/markup tests, separately names the inherited scope-grant as **NOT QUALIFIED BY STACK**. A main-based release would require separate scope qualification, not cherry-pick by convenience.
- New native test is real Chromium original SHA custody, **not Owner local Microsoft Edge**. Browser test should be checked on latest exact head after corrections. Before green, record **NOT_DONE**.
- Review-only JSON contains complete original A geometry and dispositions. Every displayed 0 mm is rounded coordinate residual and never proof of unique physical identity. No new physical BOUND or Writer2 operation is authorized.
- No independent P2 or Owner-local Edge performed. Genuine future productive B certification and B→correspondence adapter remain separate policy workpacks under Issue #126, not in scope.

## 4. Key risks and exact next action
1. Verify current exact head, native old-test recovery, actual browser JSON export, new unit tests, original SHA custody, parity and no-index rollback via GitHub Actions.
2. Fix only **observed** prototype regressions; no correspondence, B/C policy or transfer integration edits.
3. Publish exact-run receipts to PR137 and Issue126. Request a distinct independent reviewer and Owner's local Edge prototype feedback. No merge or release without separate Owner approval.

**`A_ONLY_PROTOTYPE=IMPLEMENTED_DRAFT`, `METHOD_C_B_CERTIFIER=NOT_IMPLEMENTED`, `METHOD_C_BOUND_ADAPTER=NOT_IMPLEMENTED`, `WRITER2_RELEASE=HOLD`.**

**EXACT_NEXT_ACTION = verify exact-head native browser + unit+custody/undo tests, inspect failed cases, make only bounded corrections, then hand off draft for Owner prototype testing.**
