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
