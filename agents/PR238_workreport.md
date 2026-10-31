# PR238 — CIIFR-Node inherited B1 test oracle correction

Task: continuation of CIIFR-Node P1 integration / issues231,228,229; parent227. Draft PR238, branch codex/ciifr-node-b1-oracle-20261030. Agent: root, Chat ID UNKNOWN, author-exposed. Date: 2026-10-30 Asia/Dubai. State: test-only draft; review and merge HOLD.

## Problem and final change
The existing synthetic fixture assigns element 9000->9001 to exact branch B1, with pointer3 and ALIAS-OLD in its branch-isolated FROM field. The old mismatched-identifier test incorrectly expected zero claims for B1 together with two nonexistent identifiers. Correct production behavior is one B1 claim. No implementation defect is established.

Keep the two genuinely nonexistent identifiers at zero and add a B1 positive test requiring the exact owner, FROM-field identity, branch and empty diagnostics. Compare writer output to an independent literal splice of the final synthetic NODENAME card's fixed 26-character FROM field. The expected byte address is not obtained from production claim offsets. All fixture construction and production code stay unchanged.

## Live baseline and overlap
Base main: 417bf6a954c5a6de72237537e94b05b285191350. PR232: d3fbd4041ef4434b4cf5b3c22459f06167be2729. PR226: b2b695f66fc8dfc907f2b9a493b39bd4d4109570. Existing candidate heads were not changed. Main's 86 commits/43 changed paths since the old base have no exact-file overlap with the 22 net Property Transfer paths. Inspected relevant active CII PR file lists do not edit this test.

## Validation
Node v24.22.1, Linux. Individually Git-verified source subsets, not full cloned or merged worktrees. All VNext tests are present.

| Input | Result |
| --- | --- |
| Current-main before correction, 21 test files | 94 PASS / 1 FAIL; exit1 |
| Current-main plus correction, 21 files | 96/96 PASS; exit0 |
| Isolated current-main + all22 PR232 net paths + correction, 24 files | 125/125 PASS; exit0 |

[Raw logs, exact command/exit receipts, source inventories, literal patch and integration assessment](https://github.com/reallakshman19/Common/blob/836aa0b553010df897323995333432ebbeabee1c/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/returns/P1-INTEGRATION-BASELINE-20261030/receipt.md) are committed in the existing Common task relay and all nine files were retrieved and matched. No test is skipped or deleted. Historical PR232 123/1 remains true on its unchanged head. Browser/Windows/solver were not rerun for this test-only change; existing application-byte-qualified evidence stays bound to d3fbd404.

## Change ledger and recovery
Existing file: tests/cii-fnr-vnext-branch-scope.test.mjs (one case split; 289 lines). New file: this recovery report. No production, writer, parser, runtime, workflow, fixture-constructor or served-asset edit.

Native utils/backup.cjs backup1 preceded editing. Preimage SHA-256 1f5e7a9a2e5745013e1bfc8e873ec396ed602eb41c5ff20b33bb56c3b5aebb81; final dfc12abfc1b93b613f6369a1098186c36437790ed22b6360afe7d8cbc89c17d1. Local .agent-worklogs/20261030_ciifr-branch-oracle contains planned scope, native backup ID, checksums and a patch generated from the filesystem preimage. Check current checksums before restoring only recorded files; preserve later changes. No private original, identity or field ledger is included.

## Gates and exact next action
SELF_ASSESSED test correction; non-author review NOT_RUN. Overall GATE_R0, PR226 and PR232 remain HOLD/draft. This separate test PR does not authorize integration, P2, property writing, solver, deployment or release. The remaining actual combined head must be checked after authorized integration; this overlay is not that merge.

EXACT_NEXT_ACTION: non-author reviewer verifies the fixture's B1 ownership and literal expected-byte derivation on this PR's exact head. Root prepares the controlled integration only after required review; Owner retains R0 acceptance and merge authority. No agent launch or new assignment is claimed.
