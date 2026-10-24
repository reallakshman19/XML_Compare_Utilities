# WIP-CIIFR-V14-VNEXT-ENTRY — recovery record

## Mission and scope
Owner asks to make already merged PR #155 (demo loader) and #156 (branch-scope editor) visible from the existing CII Find & Replace V14 modal. Existing V14 production modal currently mounts a separate app; VNext is independent at `docs/cii-fnr-vnext.html`. Implement an **opt-in, clearly isolated VNext pane in that modal**, with a separate-tab fallback. No changes to CII parsing, engineering fields, scope policy, writers, exports, user fixtures, or protected work.

## Authority and baseline
Owner request: 2026-10-24 "can you fix it". Base `main`: `17fa937d668bb7007c4bc9051e7b3dc07f40c655`. Branch: `wip/ciifr-v14-vnext-entry-20261024-oracle`. PR #155 and #156 are already merged. PR #162 scroll fix is part of base. Open PR #157 and #163 do not touch the existing modal files. Other active Writer2 PRs overlap the wider area but not the intended V14 modal files.
MERGE_AUTHORITY = OWNER_ONLY. Sensitive engineering/writer authority = NO CHANGE.

## Hypothesis and falsifier
The missing Branch and Demo controls come from V14 modal and VNext using different entrypoints. Rendering the VNext standalone application in an iframe opened only by an explicit mode switch should surface both without changing either session's state. Contradictory result: rendered iframe cannot load the VNext app under the deployed GitHub Pages path, or switching unexpectedly mutates the legacy editor; retain blocker rather than merging.

## Planned changes
- Mirrored `tabs/cii-workspace/cii-workspace-find-replace.js` and `docs/tabs/cii-workspace/cii-workspace-find-replace.js`: opt-in mode button, hidden independent iframe panel.
- Mirrored `*-find-replace-ui.js`: toggle with lazily resolved URL and a separate-tab fallback; destroy existing overlay normally.
- Mirrored `*-find-replace.css`: isolated frame sizing, hidden state and accessible controls.
- A source-contract and mirror-parity test.

## Environment and source limitations
Remote GitHub tools provide exact Git blobs; container Git checkout fails with DNS error `Could not resolve host: github.com`. Canonical full-checkout `node utils/backup.cjs save` and `.agent-worklogs` patch ledger cannot be completed remotely and MUST NOT be falsely claimed. Remain in a separate DRAFT PR, no merge. Preimage Git blob SHA, branch history and this workreport are noncanonical recovery aids, not substitutes for required local backup/patch ledger.

## Validation
Status: IN_PROGRESS. Source contract, mirror parity, branch and route inspections pending. Full checkout `node --test` and served Chromium: NOT_RUN unless evidence added.

## Highest risk
Iframe routing differs between mirrored source and deployed docs; dynamic resolver must check module path. Never auto-pass legacy TARGET0/CSV into VNext or invoke its writer.

## EXACT_NEXT_ACTION
Make the scoped source/served changes from independently refetched baseline blobs, add a regression test, source-check mirror parity and report any deployment-runtime test not run. Open DRAFT PR, then on full checkout complete repository backup and native regression before Owner-authorized merge.
