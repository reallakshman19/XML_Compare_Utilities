# PR164 — CIIFR V14 → VNext entrypoint recovery

DRAFT PR: https://github.com/reallakshman19/XML_Compare_Utilities/pull/164


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
Status: SOURCE_CHECKED (SELF-ASSESSED). Executed a fresh GitHub source-exact, 16-condition inspection after the six changed assets were committed: 16/16 true, including all three source/docs mirror byte equalities, legacy scope preservation, opt-in hidden iframe, two-way toggle, lazy src, absence of cross-frame state transfer, VNext Demo and Branch presence, URL resolution for both module locations, under-300-line JS check, and a wrong-path negative contrast. An initial 15/16 inspection had an error in the inspection harness (relative path missing leading slash); corrected harness independently resolved both source and docs paths to `docs/cii-fnr-vnext.html`. This is a source contract only, not browser execution.
Added `tests/cii-workspace-vnext-modal-entry.test.mjs` (5 tests, including source-bound URL check and wrong-route counterexample); the Node test file was NOT_RUN locally. Full checkout native test suites, browser/HTTP GitHub Pages runtime, `.agent-worklogs` and canonical pre-edit backup: NOT_RUN due container Git DNS failure. Do not present them as PASS.

## Implemented outcome
The existing V14 modal now contains an explicit `VNext · Branch + Demo` switch. VNext is loaded lazily in a full-height iframe of the standalone `docs/cii-fnr-vnext.html` document, with an independent new-tab fallback. Back to V14 preserves its in-memory session; both applications retain separate inputs/approvals; closing the modal destroys the full overlay. Source and docs mirrors are byte-identical. No CII files or converters were edited.

## Actual changed-file ledger
`tabs/cii-workspace/cii-workspace-find-replace.js` + `docs/` mirror: old Git blob `0536ba10892d8138fddaf41fab821ed9ef89f24e`, new `d03e1004b2f6142fb1bc43773eb40e1f740b7158`.
`tabs/cii-workspace/cii-workspace-find-replace-ui.js` + `docs/` mirror: old `43ff0d7157151adadb3a5cfea1763742e25f2db2`, new `b60dd0188a6c2104b5478b146cc9146e325584ca`.
`tabs/cii-workspace/cii-workspace-find-replace.css` + `docs/` mirror: old `067a24ee4b1870c28066e96c6b0cd688773ac826`, new `d6baec2c116de090c04e7bd8bdb72c20444d34a1`.
New `tests/cii-workspace-vnext-modal-entry.test.mjs`; WIP workreport. Original source content retrievable by old Git blob IDs, but this is NOT a local backup replacement.

## Remaining risks / checked boundaries
Browser module caching may require Ctrl+Shift+R; existing pinned cache-lineage and Method C historical tests prohibit casually changing the shared entrypoint. GitHub Pages iframe and file-download behavior still needs actual browser verification. No automatic data transfer to VNext. Module route is source-qualified, not production-verified. Do not merge without Owner approval; run canonical local backup/ledger, native tests and browser walkthrough on an accessible full checkout before merge.

## Highest risk
Iframe routing differs between mirrored source and deployed docs; dynamic resolver must check module path. Never auto-pass legacy TARGET0/CSV into VNext or invoke its writer.

## EXACT_NEXT_ACTION
Open and review the DRAFT PR. On a complete checkout, complete canonical backup/patch-ledger recovery, run `node --test tests/cii-workspace-vnext-modal-entry.test.mjs tests/cii-workspace-find-replace-scroll-export-ui.test.js`, and perform a real GitHub Pages V14 -> VNext -> V14 browser walkthrough with `GLRD-SYS-20-10.CII` kept local. Do not merge without explicit Owner permission.
