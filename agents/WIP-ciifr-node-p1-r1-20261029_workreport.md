# CIIFR-NODE-P1-R0-REPAIR-R1 — recovery-first builder report

Date: 29 October 2026 (Asia/Dubai). Task [#231](https://github.com/reallakshman19/XML_Compare_Utilities/issues/231), parent #227. Governing WBS: CIIFR-Node Page WBS2/M3 = engineering P1.0, feeding WBS2.1/M4 = P1.1. The published `progress-page/data/ciifr-node/index.json` plan is unchanged. No new Cycle or project.

## Mission, authority and current result

Owner directed root to continue because builder `6ae20df5` could not execute. Root now contributes as **builder**: all checks below are **SELF_ASSESSED**. No fresh independent review is claimed. The former builder's local proposal was not received; this patch was derived from the actual assigned source and fail-before cases.

Source/parent: PR226 `b2b695f66fc8dfc907f2b9a493b39bd4d4109570`; main/base `fd86b21aa9dcbfbbe4f8a1d26133b7e9779448be`. Isolated repair branch `codex/ciifr-node-p1-r1-repair-20261029`, targeting `codex/ciifr-property-two-path-r0-20261028`. Parent remains draft and untouched. PR176/174 share app entrypoints: **COORDINATION_REQUIRED** for later integration; neither branch is imported or changed here. PR145/187/184/168 other-engine work is preserved.

F1–F4 repair is implemented and locally tested. **GATE_R0 remains HOLD** for fresh non-author review and outstanding platform/original qualification. No property writer, TARGET1 authority, P2 correspondence, protected parser/writer/other-engine change, workflow, deployment, merge or release.

## Exact behavior and engineering limits

- **F1:** Only navigation entering/leaving Property Transfer skips generic `invalidate(state())`; `opSeq` advances to cancel pending Normal work. Completed Normal plan, approval decisions, validation hash and applied-output eligibility survive independent Property SOURCE/TARGET intake and mode switching. Nodal state also survives. Actual shared TARGET/SOURCE/CSV changes and rule edits still revoke authority; legacy Normal→Config navigation still invalidates. Older-tab navigation policy is preserved.
- **F2:** The new inspector rejects negative ELEMENTS FROM/TO. Its supported profile requires positive endpoints; zero triggers `PROPERTY_ELEMENT_ZERO_ENDPOINT_UNQUALIFIED`. This is an explicit profile HOLD, **not a claim that CAESAR II forbids zero**. No zero is dropped, remapped or silently treated as a logical node. The protected `physical.js` stays intact.
- **F3:** All 15 typed ELEMENTS pointers are checked against their corresponding CONTROL counts. Existing RIGID/RESTRANT/DISPLMNT/FORCMNT cardinality/ownership checks remain. Other populated families receive visible `UNKNOWN` diagnostics: pointer bounds alone do not qualify their content, cardinality, sharing or engineering semantics. BEND pointer999/count0 rejects; bounded BEND content remains unqualified.
- **F4:** A zero node/type/CNode restraint slot with nonzero or unparsed raw payload is retained as `UNKNOWN` evidence with owning element, pointer, slot, byte span and four raw cards. No logical node0 attachment is invented and no input bytes are changed. Lexical zero detection preserves D/E zero spellings without hiding nonzero numeric underflow. Dormant-slot vendor legality, tag/GUID grammar and effective restraint semantics remain **UNKNOWN**.
- The panel shows UNKNOWN evidence immediately after intake and after either mode switch/inspection, using text content rather than HTML interpretation. It exposes no writer or new mapping acceptance.

## Grounding / Appendix A

Takeover began READ_ONLY. Live head/base and issue/comments were reconciled; no product drift observed. Disposition: **CONTINUE**, bounded Owner-authorized repair. Source-based self-qualification: **95/100, 19/20 per A1–A5**; this does not constitute independent acceptance.

| Challenge | Actual source/evidence |
|---|---|
| A1 Production trace | `physical.js` parses safe-integer FROM/TO without positivity; new `cii-index.js` constructs node incidence and typed pointer ownership. `app.js` fallback `state()` resolves non-work tabs to Normal; old navigation invalidates both sides. |
| A2 Failure isolation | New actual-app DOM and literal physical-splice regressions ran before implementation: 9 failures, 1 existing Nodal-preservation pass. The failures include Normal approval loss, negative admission, unchecked BEND and invisible dormant residue. |
| A3 Invariants | Property owns its independent file intake; Normal/Nodal own existing approvals and writers. No semantic node correspondence, shared writer, protected parser mutation or vendor legality inference. |
| A4 Validation | Literal node/pointer values and raw record spans; original app entrypoint with the explicitly imported existing controlled DOM. Existing oracles remain unchanged. Browser and native application acceptance are separate. |
| A5 Minimal patch/falsifier | Six mirrored existing files only (`app.js`, new-module index/panel); one new focused test. Real owning-input edit must still revoke state; bounded unsupported families must stay UNKNOWN; source bytes and served mirrors must match. |

## Native checks and input basis

Execution: Linux, Node v24.22.1. A bounded 108-file exact-head filesystem snapshot was verified against Git blob IDs/sizes; **not a complete Git checkout**. The snapshot contains every file in the actual 23-file predecessor VNext test glob and its runtime/test dependencies. No product dependency installation or runtime switch.

| Check | Result | Oracle / limitation |
|---|---|---|
| Focused repair regressions, before | 1 PASS / 9 FAIL | Fail-before on unchanged assigned source; unchanged expectations used after |
| Focused repair regressions, after | **11/11 PASS** | Actual app entrypoint in existing controlled DOM plus literal physical splices; [SIMULATED DOM], not a real browser |
| Required R0 + Property UI + Nodal UI | **17/17 PASS** | Existing committed tests, unchanged |
| All VNext, sequential complete run | **121 PASS / 1 FAIL** | `node --test --test-reporter=tap --test-concurrency=1 tests/cii-fnr-vnext-*.test.mjs` |
| Same full suite on predecessor head | **110 PASS / 1 FAIL** | Same inherited branch-scope mismatch |
| Same full suite on main/base | **94 PASS / 1 FAIL** | Same inherited branch-scope mismatch |
| Bounded Geometry | **9/9 PASS** | Existing geometry-authority and method-C-original tests; not complete Geometry acceptance |
| Six source/served pairs | **PASS** | Byte equality; all 102 other materialized baseline files unchanged |
| Syntax checks | **PASS** | `node --check` on all three changed source modules and new test |
| Actual Common public SOURCE/TARGET0 | **PASS, bounded** | Each 8,276 bytes, exact catalog SHA-256, 2 elements/3 nodes, input unchanged, no UNKNOWN diagnostics |
| Real browser | **NOT_RUN** | Playwright CLI launched, but Chromium `chrome` executable absent at `/opt/google/chrome/chrome`; no browser interaction claimed |
| Windows, protected original V14, licensed CAESAR II | **NOT_RUN / NOT_RECEIVED** | No protected bytes accessed or published |

The inherited failure is `tests/cii-fnr-vnext-branch-scope.test.mjs:85`, “branch identifier mismatch gives zero replacements, no prefix matching”, actual1/expected0, on all three candidates. It is retained, not skipped or weakened. The first default-concurrency broad log lacked a completion summary; the explicit sequential complete runs above are the authoritative broad-run counts. Later checks followed the final lexical-underflow/legacy-navigation test additions.

Commands:

```bash
node --test tests/cii-fnr-vnext-property-transfer-repair.test.mjs
node --test tests/cii-fnr-vnext-property-transfer-r0.test.mjs tests/cii-fnr-vnext-property-transfer-ui-regression.test.mjs tests/cii-fnr-vnext-nodal-ui.test.mjs
node --test --test-concurrency=1 tests/cii-fnr-vnext-*.test.mjs
node --test tests/cii-workspace-geometry-authority.test.js tests/cii-workspace-method-c-original-geometry.test.js
```

Common public fixture basis is immutable `56dbc3a0af137c433ffb5fec48316fa2022d075c`, existing fixture relay. SOURCE SHA-256 `c8de516c54767c7cf7d5239d404810be891ed3d56ec2111db3dc4c2b07dcdb0b`; TARGET0 `0bbc3b0a8b7b1e73d655d0a0ffc267e6a698dec5ff66763c468cdc835cc19661`. The coordinator previously retrieved these actual bytes and remeasured them for this reader run. They do not qualify nonzero force/displacement vector/case/sentinel semantics or original-model/vendor behavior.

## Change ledger, custody and recovery

Existing paths changed: source/served `ui/app.js`, `ui/property-transfer/cii-index.js`, `ui/property-transfer/panel.js`. New paths: `tests/cii-fnr-vnext-property-transfer-repair.test.mjs` and this report. New JS test is under 300 lines; no protected writer/parser/Normal/Line+Node/Geometry module changes.

The local ledger `.agent-worklogs/20261029_p1-r0-repair-r1/` was created before product edits, with module plans, native backup IDs1–6, before/after SHA-256 and snapshot-derived patches. Native backup #7 preserves an intermediate version of the new test; its task baseline is ABSENT. `.backups/` and `.agent-worklogs/` are repository-ignored local recovery state and are not product commits. Safe patch/evidence copies return through the existing Common artifact relay; original N-01 evidence remains unaltered.

Undo is history-independent: verify current file equals its recorded final checksum; restore only the matching native pre-edit backup or reverse its recorded snapshot-derived hunks. New files may be deleted only if their final SHA is unchanged and no later task has modified them. Never reset/revert or overwrite later work. Preserve local recovery state after handoff.

**Highest remaining risk:** controlled-DOM regression is not real browser/Windows/original-file acceptance; unsupported auxiliary grammar and dormant/zero semantics remain unqualified. The broad suite has its unchanged inherited failure.

**EXACT_NEXT_ACTION:** Fresh non-author reviewer in #228 retrieves the draft repair PR's exact final head and Common return, reproduces the F1–F4 cases and stale-input revocation without changing code/oracles, and returns a bounded verdict. Builder/root must not self-approve or merge. Parent PR226 remains held.
