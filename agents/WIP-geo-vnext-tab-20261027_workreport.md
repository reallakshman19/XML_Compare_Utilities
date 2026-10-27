# CIIFR_GEO — independent VNext tab integration
Owner: “wire it to CII Find & Replace > ↔ CII Find & Replace VNext · Standalone as a new tab (independent modules).”
Contributor: existing standalone Oracle. WIP-geo-vnext-tab-20261027. Source task: XCU#180 / WBS3.1, new Owner amendment. SELF_ASSESSED implementation; independent reviewer pending. No new product merge authority inferred.

## Mission and behavior
Add CIIFR_GEO beside the existing VNext Geometry tab. Its iframe lazily opens the existing main standalone XML A/B/C workbench and retains that document on tab switches. SOURCE/TARGET XML intake, matching state, selection and evidence exports stay within its own module/document. Existing VNext CII inputs, rules, approval invalidation, Writer and original Geometry placeholder remain unchanged.

## Baseline, integration and file boundary
Live main e3d52e8a5e2855f0e684e9cb1358f4bca5f2b211, tree47fca239283da31f1c53d48ac4a560451b39a463. Actual native local checkout3a1bec9 plus Git-blob-verified immutable main overlay; do not claim a native Git checkout of current main. Local product scope is the12 allowlisted paths below, not the baseline overlay or operational .backups/log.json.
- docs/cii-fnr-vnext.html: additive button/panel/style link.
- source/docs ui/app.js: small tab display hook and known-tab validation.
- source/docs ui/geo-tab.js: named render/route functions, no engine/Writer/state bridge.
- source/docs ui/geo-tab.css: panel-only styles and expanded host width.
- source/docs cii-workspace-find-replace.js: fullscreen delegation through the outer VNext iframe only.
- tests/cii-fnr-vnext-geo-tab.test.mjs: actual production handler in existing controlled DOM; lazy-once/retained document, route mirrors, host state and approval reset.
- tests/cii-fnr-vnext-geo-pages-smoke.py: actual unchanged workflow rsync,57 HTTP module/style assets and original public sample hashes.
- this report.

Other draft overlap: COORDINATION_REQUIRED. PR174/176 share host HTML/app; PR171 app only. All53 open PR file inventories were fetched (all under100paths); no other exact module claim found. Owner explicitly directs this additive integration at main. Preserve separate IDs, existing draft branches and their engineering scopes. Future merges must reconcile only the small shared hunks; no draft174/176/171 code adopted.
No workflow, prototype engine/data, shared viewer, CII converter, geometry transform, persistence or Writer/export modifications. Fullscreen attributes delegate the browser permission; actual fullscreen success remains NOT_RUN.

## Hypothesis, falsifier and authority
Owner outcome is access through the real VNext tabbar without coupling engines. Wrong implementation: docs-relative iframe path silently points at nonexistent docs/prototypes, or tab return reloads and discards anchors, or normal CII approval survives contrary to existing policy. Tests discriminate module routing from both mirrors with three hosting prefixes and count src assignments while executing the actual host handler.
No contentWindow/postMessage/storage/data transfer to the host. Parent panels are hidden while CIIFR_GEO is active. Frame kept alive, allowing pending work to finish; hidden-frame heavy-model/GPU resource behavior remains unmeasured.

## Validation
PASS SELF_ASSESSED: new focused3 tests + existing outer-modal5 =8/8. Full relevant VNext77 tests:76 PASS,1 FAIL,0 skips. Same branch-scope test fails unchanged baseline18/19; no expectations/tolerances changed. The preexisting failure at tests/cii-fnr-vnext-branch-scope.test.mjs:85 expects0claims for B1 although its synthetic fixture has a named matching B1 occurrence. No branch engine repair within this task.
PASS SELF_ASSESSED: untouched workbench native58/58; actual workflow staged nested VNext/workbench HTTP57 assets and original XML SHA256s; existing root Pages graph check.
Public sample hashes1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995 and a332dd7b2551faae51de3c016941762c3b795cdf19073b373817354e309526e6.
NOT_RUN: actual rendered new nested tab, GPU/WebGL, browser fullscreen, Windows, big-model performance, Owner acceptance, product merge/deployment. Python Playwright unavailable; installed Node Playwright native Chromium launch also exits before a usable page with writable TMPDIR. No browser PASS fabricated.
Independent exact-candidate review pending. Existing main packaging/core reviews do not independently approve this host delta. No PR check/CI status claimed.

## Recovery, risk and next action
Location: /workspace/scratch/ca71d2f89cf7/geo-vnext-tab-20261027.
Ledger .agent-worklogs/20261027_vnext-geo-tab, preimages and native backups90–96. Existing-main overlay is preexisting; do not discard it. .backups and .agent-worklogs excluded from publication. Reverse recorded hunks only after matching final hashes; delete only exact new files after verification; never reset/discard later work.
Highest risks: browser frame lifecycle/fullscreen and later shared-hunk reconciliation; native DOM/HTTP cannot prove rendered/GPU behavior.
EXACT_NEXT_ACTION: publish/read back12-path candidate on dedicated main-based branch, obtain distinct non-author integration assessment against actual Owner outcome, then return reviewable PR for explicit Owner merge decision. Other engineering lanes and original-CII VNext/G2/Writer authority remain separate.
