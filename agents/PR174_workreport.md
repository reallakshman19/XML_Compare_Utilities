# PR #174 — G1 Geometry recovery-first workreport

- Branch: codex/ciifr-g1-geometry-dualsvg-6addafaa-20261025
- Initial implementation commit: 38f8d8b9a33c4a9a371062578b6d2d4cb5c3363a
- State: DRAFT, NO MERGE. Original browser integration NOT_VERIFIED (Chromium ERR_BLOCKED_BY_ADMINISTRATOR); local scoped Node 27/27 PASS, original SHA/candidate falsifiers PASS. 
- Active authority: G1 REVIEW_ONLY only. Independent validation and Owner acceptance pending.
- EXACT_NEXT_ACTION: verify published head and exact blob inventory, rerun relevant native tests, and independently test served browser/negative file-swap before any Owner merge decision.

---

# XCU #169 — CIIFR G1 Geometry native work report

- Agent: G1 builder `6addafaa`; assignment `CIIFR-GEO-C-G1-DUALSVG-1`; Cycle `Common/oracle-cycles/ciifr/CURRENT.json` revision 1, active.
- Mission: one VNext Geometry REVIEW_ONLY manual physical-anchor correspondence ledger and paired synchronized physical-mm SVG; no G2/G3/Writer/Apply/TARGET1/merge/deploy.
- Baseline: exact public GitHub archive commit `80e693bd81f54003a487cb763421f9bfd0d3dfc2`, unpacked in a standalone tree (no `.git`); no competing local product edits.
- Invariants: original CII SOURCE/TARGET0 unmodified; SHA-scoped Method C graphs; unobservable rotation shown; all candidate alternatives and original NODE/ELEMENT witnesses; Geometry cannot create a writer plan.

## Appendix A — engineering-critical native qualification (pre-product-edit)

A1 Production trace (19/20, current code inspected): `docs/cii-fnr-vnext.html` loads served `docs/tabs/cii-workspace/cii-fnr-vnext/ui/app.js`; intake `data-file` event lines 353–371 takes Uint8Array original snapshots, parses, SHA hashes. `renderTabs` gates Geometry unavailable placeholder. Method C graph/registration/candidates/SVG/export modules under `tabs/cii-workspace` have published served mirrors. Existing A1 trace retained; new source SHA and mirror parity independently checked.

A2 Failure isolation (19/20): no mounting in `renderTabs`, so Geometry button shows unavailability and Normal-specific writer footer. Underlying `revision/opSeq/fileSeqs` guards file races. Separate Geometry panel must not expose Normal's Writer controls, must clear evidence on input start and parameter edits and abort out-of-epoch async parse.

A3 Safety authority (20/20): manual 3910→875 is translation-only and undetermined rotation. Method C candidates only, no identity approval or Writer action. `findMethodCCandidates` preserves zero/one/many physical TARGET NODE alternatives, target collisions, original segment-only projection, signed residual. `4060` is not silently a NODE; no one-to-one auto-map. G1 restricted to registered candidates and paired views, not topology-only G2 or XMLv1.1 G3.

A4 Independent validation (19/20, self-assessed, not reviewer): extracted original benchmark S1 108,330 bytes SHA `9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b`; T 2,866,002 bytes SHA `abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060`. Native Method C registration run: source 3910→target 875 TRANSLATION_ONLY, 41/57 near at XYZ=100mm; S 4060 projects TARGET ELEMENT 900→905 at internal t=0.76175, zero nearby target NODEs; S 4970 nearest TARGET NODE 1065 is Z=-300.57mm outside tolerance. Running `node --test` with original-CII, SVG, candidates and independent benchmark produces 17 PASS / 2 FAIL because separate WP8 test requires unavailable pinned Owner evidence checkout (`WP8_PINNED_OWNER_EVIDENCE_CHECKOUT_REQUIRED`), not a Geometry engine failure. Missing external golden must remain NOT_RUN—not waived.

A5 Minimal patch (19/20): new bounded G1-only `geometry/` controller/pure helper with authored and docs served mirrors; one Geometry markup mount in `docs/cii-fnr-vnext.html`; surgically import/instantiate in existing app authored/served mirror; reuse existing CII snapshots, graphics and exports. Native backup executable and local task manifest created before product edits. New files <300 lines. Tests/browser must exercise originals and stale file switch and Normal→Geometry→Normal; exact PR HEAD independent test is pending publication.

**Score: 96/100; each >=17/20, SELF-ASSESSMENT only; takeover choice CONTINUE G1; no engineering accreditation.** Read-only quarantine remains for writer and protected authority; separate independent review outstanding. This qualification permits bounded G1 UI changes only under the Owner's explicit #169 assignment. No auto-merge.

## Execution status

**Native implementation G1-only:** Geometry mount now present in `docs/cii-fnr-vnext.html`. Authored/served app.js import `geometry/ui.js`, preserve global immutable file selection, hide Normal-specific review/writer sections while showing shared original CII intake and the dedicated Geometry panel. New authored/served `geometry/ui.js`, `scene.js`, `style.css` implement one experimental anchor, existing Method C original graph/registration/candidates/exports, source and target separate SVG DOM trees on the same physical-mm viewBox, selection/filter/zoom/pan/reset and stale revocation. No topology-only algorithm or XML bridge. Original source/target upload is reused; no second parser or Writer action.

**Native tests (executed local archive, not published-head):**
- `node --test tests/cii-fnr-vnext-g1-geometry.test.mjs tests/cii-fnr-vnext-demo.test.mjs tests/cii-fnr-vnext-a1.test.mjs tests/cii-workspace-method-c-original-cii.test.js tests/cii-workspace-method-c-svg.test.js tests/cii-workspace-method-c-candidates.test.js` = **27/27 PASS**.
- `node --test tests/cii-fnr-vnext-branch-scope.test.mjs ...` = **35 PASS / 1 FAIL**. The failing unchanged `branch identifier mismatch` asserts 0 proposals while actual 1; existing baseline Normal parser and unrelated to Geometry. Not repaired under G1 scope.
- Original raw independent WP8 suite attempted = **17 PASS / 2 FAIL** (requires external `WP8_PINNED_OWNER_EVIDENCE_CHECKOUT_REQUIRED`); no fake waiver, not a G1 UI failure.
- Native browser Playwright Chromium attempted: opening local `http://127.0.0.1:<port>/cii-fnr-vnext.html` and local `file://` failed **net::ERR_BLOCKED_BY_ADMINISTRATOR** before app scripts ran; Chromium CLI `--dump-dom` produced no page. Therefore **served-browser interaction/visual, file-swap, synchronous SVG pan tests NOT_VERIFIED**; no browser PASS is claimed. Native Node original CII and stale export tests PASS.
- Mirrored authored/served G1 geometry files and app.js byte-identical. All new JS <300 lines (`geometry/ui.js` 217, `scene.js` 24, test JS 100); application app.js preexisting >300 lines edited surgically (no refactor).
- No trusted independent reviewer, physical mapping acceptance, Writer authority, deploy or merge.


- Original file hashes: PASS.
- Method C falsifiers: PASS, native local run; independent reviewer: NOT_RUN.
- Prior applicable 4-file native test subset: 17 PASS, 2 FAIL (missing pinned WP8 external evidence).
- HTML/Node G1 integration: local PASS as scoped above; served Chromium FAIL ENVIRONMENT (ERR_BLOCKED_BY_ADMINISTRATOR).
- PR head/CI/Owner trial: NOT_RUN until GitHub draft publication; no external acceptance.
- Highest risk: Geometry panels accidentally reusing Normal writer or stale async results; negative browser tests required.
- Worklog: see local `.agent-worklogs/<TASKDIR>`; canonical backups required before editing each existing file.
- EXACT_NEXT_ACTION: Publish these exact native patched bytes to one G1 draft branch; independently read back SHA and rerun accessible exact-head tests. Obtain actual served Chromium/Owner trial on an authorized browser; no merge without Owner decision.

---

## Cycle revision 3 / generation 2 — G1 R1 repair · 25 Oct 2026

**Authority and candidate.** Same G1 builder `6addafaa`, same draft PR #174, no Writer, Apply, TARGET1, G2/G3 or merge. New assignment `CIIFR-GEO-C-G1-REPAIR-R1`, source XCU #169 comment 6397715134. Exact original PR head `a59f479f0dcf8be00a3ca7324da7e4f624a2d6f4`; XCU main `c823f0c0edbeb315c07fa2911390dc781968146f` from #172. Source-recovery archive at `80e693bd81f54003a487cb763421f9bfd0d3dfc2`, original S1/T hashes retained (verified locally in current turn).

**Exact overlap reconciliation (before R1 edit).** Fetched #172 current-main authored/served app and HTML, reconstructed from verified initial archive and GitHub #172 text/diffs. Matched immutable Git blob identities: current-main HTML `4c8d44e22821f7b227139e7ae0d2d29fc4186120`; authored app `0827a5304868cdd6b412295662b0111015b1970c`; served app same. Also reconstructed and verified current-main imported `csv-resolver.js` `17e139cc77d6be226eb642d6271ea10fe5a00200`, `nonconflict-review.js` `59d02296756de27c9eab9c21e0f2f58a7e8399d0` and test helper `cba118f6f28d64f41f441f9b3da9453b32993d76`. G1 merge performed as **additions only** on exact current-main HTML/app, retaining source CSV resolver, nonconflict approvals, cleanup state, callbacks and existing writer semantics. This is not a force-push of the old app.

**Native backup and patch-ledger.** New R1 task `.agent-worklogs/20261025_1740_g1-geometry-r1-repair/` established before any edit, including manifest, per-file preimages and phase plan. Native `node utils/backup.cjs save` ran successfully with recovery IDs **90–98** for existing edited files. Worklog patches regenerated directly from those preimages with `git diff --no-index --binary`, not from Git HEAD, and undo requires checksum match/preimage verification. Native copy of PR #174 report verified against prior Git blob `85e599f9ad269a9b29c1ec45e337fe6b8e22350f` before this append.

**F1 keyboard change.** Authored/served `geometry/ui.js` now use one `selectOriginalNode(node)` for SVG mouse and key events. Enter or Space on physical SOURCE/TARGET `<g data-node>` and on ledger `<tr data-source>` invokes the existing `selection(...)` directly, not `node.click()` on an SVG element. No synthetic matching, new identity rule or Writer coupling. Both original file change and tolerance edits still revoke evidence; zoom remains shared.

**F2 SHA-scope change.** Original input graph always computes SHA-256. Untrusted generic file input displays `SHA_COMPUTED` for each original side. When the calling trusted intake supplies an `expectedSha256`, Method C `buildOriginalGraphFromBytes` compares and rejects mismatch (`ORIGINAL_SHA256_MISMATCH`), and only a matching supplied expected digest is displayed as `PINNED_SHA_VERIFIED`. Never hardcode the S1/T golden SHA for arbitrary uploaded files, and no promise that a mutated S1 is rejected without a trusted digest. Benchmark-specific negative `expectedSha256` test remains in original G1 test.

**Native checks actually executed on integrated #172+G1 candidate (builder self-check, not independent):**
- Source original `Benchmark/S1.CII`, `Benchmark/T.CII` SHA-256: PASS, immutable original raw bytes. Existing Method C 3910→875, 41/57, 4060 segment-only, 4970 negative Z validated by 27-test Node suite.
- Scoped Node suite: **27/27 PASS** with actual current-main CSV/nonconflict modules and helper reconstructed at verified Git blobs.
- Normal branch-scope `node --test tests/cii-fnr-vnext-branch-scope.test.mjs`: pinned base `80e693bd…` = **18/19 PASS, 1 FAIL**; reconstructed exact-current-main relevant files `c823f0c…` = **18/19 PASS, 1 FAIL**; G1 R1 integrated candidate = **18/19 PASS, 1 FAIL**. Same case: `branch identifier mismatch gives zero replacements, no prefix matching`. This is a pre-existing Normal parser/expectation failure; no change/waiver under G1.
- Genuine Chromium native DOM (via `page.set_content` with controlled synthetic/sha stub and exact inline G1 UI module, **NOT full served app**): **9/9 PASS**, including two SVG panes/common viewBox, SOURCE Enter, TARGET Space, row Enter, zoom, stale file swap/export revocation, F2 computed vs expected mismatch. Repro script `tests/cii-fnr-vnext-g1-r1-dom-browser.py`. This is AUTHOR-EXPOSED and synthetic Method C; original-data correctness is covered separately by Node.
- Browser served `http://127.0.0.1/.../cii-fnr-vnext.html`: attempted; Chromium `net::ERR_BLOCKED_BY_ADMINISTRATOR` before code. B1–B4 independent served-browser original-input checks remain **BLOCKED_BROWSER / NOT_VERIFIED**, not replaced by controlled DOM probe.
- GitHub exact-new-head CI/approval: NOT_RUN until publication, then independently review new head and request real served browser. No qualified physical identity or Owner acceptance.

**Highest live risks:** served input selection/Normal→Geometry→Normal behavior under true browser file picker, pending file-swap race, SHA provenance assertion from trusted expected digest. No merge, no G2/G3, no changed Writer authority. (PR #174 stays DRAFT.)

**EXACT_NEXT_ACTION:** publish only verified changed files on same G1 branch #174 after rechecking live PR head and main; verify Git blobs and exact-head tests/CI; native return to #169 + separate `ORACLE-CYCLE-RECEIPT v1` to Common #482 for revision 3 / generation 2. Have an independent reviewer repeat B1–B4 on an authorized served browser and review the new exact head; Owner controls merge.
