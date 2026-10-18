# PR131 · I121-WORKER-ADOPTION-02 · Recovery-first work report

**Owner purpose:** Native Writer2 must handle genuine S1/S2/S3/T without blocking the UI, while preserving exact source/target SHA256, Method A/B/BM001, downstream prepared session and review/transfer gates. **This is WP2 staging / executable source-first validation, not a production UI hookup or merge authority.**

**PR chain:** [PR131](https://github.com/reallakshman19/XML_Compare_Utilities/pull/131) DRAFT, base [PR130](https://github.com/reallakshman19/XML_Compare_Utilities/pull/130) `492607c254f9e1eb8d6bb876ad2a88762fd08e57`, itself based on DRAFT PR129 and DRAFT PR127. [PR107](https://github.com/reallakshman19/XML_Compare_Utilities/pull/107) DRAFT owns `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` and `tabs/cii-workspace/cii-workspace-source-set.js`. **No edits to these files in PR131.** Current deployed `docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` is a different, older implementation and also remains unchanged.

## Critical design reconciliation — two genuine product contracts

1. **Deployed docs path** imports `inspectCiiWorkspaceSourceSetWithVersionBridge` and consumes an **inspection-only** object. It awaits this inside `[data-ciiw-inspect]`; the URL-served source is still synchronous on production.
2. **Newer tabs path** imports `prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge` and consumes **`{inspection, preparedSession}`**. The preparedSession provides normalized source/target documents and graphs, source-set ownership and downstream preview/saved session contracts. Substituting PR130's inspection-only worker into this path would drop preparedSession and is **unsafe**.
3. The two paths **must be integrated separately** under authorized file grants; copying the legacy docs UI patch into tabs or vice versa is not acceptable.

## What was actually implemented (new modules only)

- Mirrored `tabs/` and `docs/tabs/` `cii-workspace-inspection-route.js`: per-shell adapter for PR130 inspection-only Worker, deriving exact SHA expectations from already verified canonical SOURCE rows and retained TARGET SHA, with cancel/dispose.
- Mirrored `cii-workspace-prepared-inspection-protocol.js`: independent verification of the full prepared-session schema/authority, source set SHA, target original SHA, normalized source documents and graphs, member order and individual SHA256. NO fallback to inspection-only session.
- Mirrored `cii-workspace-prepared-inspection.worker.js`: invokes existing newer source-set `prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge` in a dedicated ESM Worker, validates and clones the `{inspection,preparedSession}` response. In the older docs module tree the prepared export is unavailable; the worker is explicitly fail-closed there until parity/integration is authorized.
- Mirrored `cii-workspace-prepared-inspection-client.js`: run identity, explicit SOURCE/TARGET SHA expectations, cancellation, AbortSignal, stale/foreign reply rejection, runtime/response failures, buffer preservation and disposal. No synchronous fallback.
- New Node22/24 hostile response tests; new genuinely original-file Chromium test for newer source path, plus separate HTTP-served copy ONLY UI integration test for deployed docs.
- New isolated qualification workflows. No prior frozen benchmark, chemistry/geometry tolerance, auto/manual physical authority, session persistence, Method C C/BOUND/Apply or prior PR129 negative cache changed.

## Real tests and results

- **Docs UI wiring proof:** [Actions #39138284219](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39138284219) SUCCESS. Test temporarily substitutes exact-segment integration on HTTP-served copies of the unmodified deployed UI module, preserving the real native Writer2 Inspect button/Method C A-only review, 57 rows, NODE 4060→T900–905 segment only, B0/C0, 3 real SOURCE files and T. **READY after 13,922ms**, max 50ms-heartbeat gap **82.6ms**, zero gaps over 500ms; PASS 1/1. Real deployed module on GitHub remains unchanged.
- **Newer source prepared-session proof:** [Actions #39139055563](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39139055563) SUCCESS. Served current repository `tabs/` source and parser/converter dependencies via alias for test only. Actual new source prepared Worker returned `CORRESPONDENCE_INPUT_READY` and `preparedStatus=PREPARED`, original source SHA provenance and prepared source-set SHA both **`5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3`**. Prepared graph counts **S1 57, S2 47, S3 46, T 1,619 nodes**; elapsed **5,780.9ms**, max GUI heartbeat **52.7ms**, zero gaps >500ms. The unchanged deployed Writer2/Method C native test also passed (source-set READY 13,881ms); PASS 1/1.
- **Prepared-session hostile-response cases:** [Actions #39139251761](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39139251761) SUCCESS on **Node22 and Node24**, deliberately [SIMULATED] FakeWorker tests cover wrong target/SOURCE, shuffled members, missing graphs, stale run, crash, cancel, abort and dispose; mirror byte parity.
- **Red history retained:** first docs harness RED #39137974305 was exactly a seven-spaces versus six-spaces test-only UI destroy anchor, corrected after real backup; first source-prepared RED #39138788237 was missing `../../parser` alias in test HTTP server, corrected after real backup. No production source or protected oracle was changed in either correction.
- Latest native/protected workflows rerun automatically at the final report head; **do not attribute an earlier SHA's PASS to a later commit without checking it**.

## Backup / selective undo

Every production path in this PR is **NEW**, with absent preimage. Undo requires checking each current Git blob/byte digest and no downstream edits before deleting only that file; no Git reset and no edits to PR107/UI/WP1 files. Any later existing-file edits require full checkout `node utils/backup.cjs save ...` and per-module local `.agent-worklogs/` patches.

The two previously created test-harness files were edited only **after true full-checkout backups**: docs UI staged test `tests/cii-workspace-i121-wp2-served-ui-integration.test.mjs` backup **#90** from run #39138223854 / artifact **#12139823749**, pre-edit SHA256 `fd8f55e7808857db4cce689310fc345bbd76abef9973afadba80df3f622e3503`; prepared tabs test `tests/cii-workspace-i121-wp2-prepared-session-native.test.mjs` backup **#90** from run #39138995292 / artifact **#12140678562**, pre-edit SHA256 `17a0d69ee589c68baccc1421f487ed83f13c44ad008d1c4750a00e94d5cf62b7`. These backup IDs are local to their distinct artifacts; **not a single global backup ID**.

## Takeover / authority

Takeover started READ_ONLY; source-first A1 production path, A2 measured failures/confirmation, A3 original SHA/Method A/B / prepared-session authority, A4 real Chromium independent originals and hostile failure gates, A5 minimal new-only modules and exact selective undo were inspected. **Implementation remains gated for UI source mutations; no Appendix A self-score substitutes for independent approval**. Do not overstate browser heartbeat test 500ms experimental criterion as Owner Windows Edge accepted threshold.

### EXACT_NEXT_ACTION

**I121-WORKER-ADOPTION-02B / Owner file-arbitration:** explicitly allocate the exact tabs and docs Writer2 UI paths, reconcile PR107 existing claims, authorize full-checkout `utils/backup.cjs save` preimages and local module-wise patches, then integrate the right adapter per UI contract: docs `inspection` and tabs `{inspection, preparedSession}`. Keep per-shell epoch, cancel on source/target replacement, reject late promises, preserve chosen base, persistence, preview and B0/C0 authority. Use the existing staged docs HTTP-copy patch from the new native test as the minimal starting point **only for docs**, not tabs. Add actual UI cancellation/replacement and persisted session tests on both branches; original Chromium and Owner Windows Edge; independent P2 and Owner-only merge. Until then `PRODUCT_UI_WORKER=NOT_INSTALLED`; all PRs DRAFT; release HOLD.
