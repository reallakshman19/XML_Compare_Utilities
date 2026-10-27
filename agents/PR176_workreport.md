# PR #176 — Node-Based Name Transfer F1 handover

**Task:** #189, Owner-directed bounded repair (2026-10-26).
**Current state:** F1 implementation committed; native regression and independent structural validation NOT_RUN; PR DRAFT / no merge.
**Pre-edit exact head:** `e973af8b249d4770ae766c8554ac71aba2de119c`.
**Supplemental backup branch:** `backup/cii-nodebased-pr176-f1-preimage-20261026`.

## Intent, authority and source tracing

Node number in TARGET0 is the only selector. `Find` is optional audit information, never a matching or approval predicate. Minimal CSV is `Node,Replace`. Old `Find,FindNode,ReplaceName` remains accepted.

UI flow: standalone VNext NODAL tab -> nodal-panel.js -> parseNodalCsv -> planNodalTransfer -> validateNodalTransfer -> separate TARGET1. Original code rejected Node,Replace because it required all three headings.

Owner's **protected core files**, which must not be changed: VNext app.js, physical.js, writer.js, config-policy.js, all Normal / LINE_NODE / GEOMETRY engines, other tabs, legacy production route, Writer2. HTML changes were limited to NODAL-specific labels/help.

## Exact F1 inventory

- NODAL parser: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js` and its `docs/` mirror. Supports optional Find and Node/FindNode/Replace/ReplaceName aliases, detects duplicate headings, rejects malformed row widths, handles BOM/reordered headings.
- NODAL-only import hint: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-panel.js` and `docs/` mirror.
- NODAL markup only: `docs/cii-fnr-vnext.html` tab name and two-column instructions.
- New regression: `tests/cii-fnr-vnext-node-only-csv.test.mjs`.

Git blob equality: parser source=served `fed548f6e270b167e8a9fcc90a15cbd41bcc9cf7`; panel source=served `38e28c42105548d8e5352dd43043b008e4252aab`. Review current head for drift before using these values.

## Source qualification and validation

- A1 source trace established (tab, parser, planner, writer).
- A2 fail-before reproduced: `Node,Replace` triggers old header-required error. Isolated Node 22.16.0 gate reproduction.
- A3 matching identity remains numeric TARGET0 node only.
- A4 exact patched parser isolated JS checks: **14/14 PASS** for 2-column, legacy 3-column, informational Find, quoted/reordered/BOM, malformed input.
- A5 six-file narrow diff vs immutable PR preimage, no other-tab core touched.
- `node --test` native: NOT_RUN. Actual browser/real-CII/Hexagon importer: NOT_RUN. Independent reviewer and exact-head CI: NOT_RUN.

**Important recovery gap:** The connected GitHub write path had no runnable native checkout (local GitHub DNS failed). Repository-mandated pre-edit `node utils/backup.cjs save` and local history-independent `.agent-worklogs/` patch ledger were **NOT_RUN**. The backup Git branch is *additional preservation, not a substitute*. Do not claim F1 native engineering qualification until a qualified native builder reconciles/replays the changes under those requirements.

## Deferred F2 / release HOLD

Structural writer logic unchanged. Missing/terminal NODENAME section, pointer-zero safety, CII version widths and CONTROL counts, duplicate-name policies, shared pointers and common writer authority still need independently proven engineering repair. No merge, publication or replacement of the existing tile.

## F2-N0 bounded safety guard — 2026-10-26

**Owner restriction observed:** no other-tab core files edited. This batch changed NODAL-only `nodal-transfer.js` and its served mirror, plus the new `tests/cii-fnr-vnext-nodal-zero-guard.test.mjs`.

- Reproduced preimage defect: a physically present zero endpoint entered READY, and the writer inserted an unauthorized name record in an isolated synthetic v14 fixture.
- Repair: after numeric TARGET0 incidence resolution and before name proposal, canonical node `0` now returns HELD / `FINDNODE_ZERO_RESERVED`; padded `000` also canonicalizes to zero and HELDs. Unknown node 0 still gives existing NOT_IN_TARGET0 diagnostic. No writer logic or other-tab core changed.
- Exact source and served NODAL parser/writer blob match: `9c0a645dea7c1ee5f1bb6d2501f69cab596cf9e1`.
- Source-exact isolated synthetic test PASS: node 0 and 000 both HELD; node 285 READY, new-copy write yields two 285 name occurrences and zero ZERO-NAME occurrences; original fixture unchanged. Targeted regression file syntax PASS. These are not native repository or real CAESAR II qualifications.
- F2 preimage backup branch: `backup/cii-nodebased-pr176-f2-preimage-20261026`, at `18d8bede12c52b7d766ab1eefa0ee62b039210ab`. **Native `utils/backup.cjs`, `.agent-worklogs/`, full Node suite, original-CII, browser and independent review remain NOT_RUN** because GitHub cannot be resolved from local container and connector edits cannot execute the native backup step. A branch ref does not substitute.
- Remaining F2: absent/terminal NODENAME, version-qualified record width, CONTROL completeness, insertion-aware byte audit, shared pointer and collision semantics remain unchanged/held. Native builder must establish legitimate section placement and full evidence before any writer expansion.

## F2-SECTION bounded writer repair — 2026-10-26

**Original problem:** Nodal writer rejected an absent optional NODENAME section and also rejected a terminal NODENAME section, including no-insertion ordinary renames.

**Implemented exclusively in NODAL-owned code:** `nodal-transfer.js` and byte-equivalent `docs/` mirror. If NODENAME exists and is terminal, fixed-field edits can proceed without a following section marker; append new records at EOF only when the last NODENAME line has a recognized LF/CR/CRLF terminator. If NODENAME is absent and CONTROL.NONAM=0, insertion is permitted **only when BEND immediately follows ELEMENTS** in the parsed section order: insert `#$ NODENAME` with the existing line ending and approved records before BEND. Other section orders fail `NODAL_MISSING_NODENAME_ORDER_UNQUALIFIED`. Reparse checks the exact expected section addition, element/pointer integrity and NONAM. Preserve immutable TARGET0 and unrelated bytes.

**Evidence:** Dedicated `tests/cii-fnr-vnext-nodal-sections.test.mjs` (five tests). Isolated source-exact JS harness with synthetic CII fixtures and digest stub: **18/18 PASS** across original Nodal suite (8), F1 CSV suite (3), F2-N0 suite (2), F2-SECTION suite (5). Test for new section checks byte equality after removing insertion and ignoring only authorized CONTROL.NONAM and ELEMENTS pointer spans. Includes terminal rename with and without trailing newline, terminal new record creation, and order/line-ending negative cases. Source-exact harness is **not the native Node suite** and the digest stub is **not true SHA-256**.

**References:** Hexagon Auxiliary Element Data for NODENAME optionality and BEND section sequencing; Hexagon neutral file section-header description and CONTROL.NONAM. The public documentation describes an older A10 record width; current project parser uses V11/V14 53-character record slices. Physical V11/V14 version provenance and original-file compatibility remain unqualified; **never treat these synthetic outputs as approved CAESAR II imports.**

**Recovery and HOLD:** Preimage GitHub branch `backup/ciifr-pr176-nodename-sections-20261026` points to `76f3cd419a4efb6ac3696b528c41ecbec12fad65`. It is supplemental only. Native `utils/backup.cjs save`, history-independent `.agent-worklogs/`, actual `node --test`, browser, real original CII, native SHA checks, CAESAR II import/round-trip, external engineering oracle and independent non-author review: **NOT_RUN** (native checkout GitHub DNS unavailable). Other tabs' core code not modified; no shared `app.js`, `physical.js`, `writer.js`, `config-policy.js` or legacy tile changes. PR remains draft/merge HOLD.

## F3-NUMELT native qualification and fail-closed guard — 2026-10-27

- **Local agent / identity / role / disclosure:** Local Coding Agent / Builder (Team Protocol v2.3 Agent)
- **Exact task:** `CIIFR-189-F3-NUMELT-LOCAL-1`
- **Original task authority:** Owner bounded Nodal-only F3; initial READ_ONLY takeover
- **Repository / branch / initial SHA:** `reallakshman19/XML_Compare_Utilities` / `codex/cii-nodal-name-transfer-20261025` / initial SHA: `deb160bf8285d9c8dbcffec676ffa71dffd73627`
- **Main/base SHA; active PR/worktree overlap and resolution:** Base `main` SHA: `c823f0c0edbeb315c07fa2911390dc781968146f`. Zero overlap with other active PRs. Scope strictly restricted to Nodal-owned modules, scoped tests, and work report.
- **Native location / OS / Node / Git version:** Windows (NT 10.0) / Git `2.56.0.windows.1` / Node `v22.23.2` / Isolated native workspace `XML_Compare_Utilities_PR176`
- **Current preimage + pre-existing dirty file inventory:** Preimage HEAD: `deb160bf8285d9c8dbcffec676ffa71dffd73627`. Pre-existing dirty files: NONE (clean clone/checkout).
- **Private original CII access:** NOT_AVAILABLE_IN_LOCAL_TOOL_SESSION (synthetic fixtures tested locally; original private specimen audited under private hash reference `4c9c9546bd9dbd5d0d2028fbd8cb55652747c2b252ab4f05254062994118182e`, not committed).
- **Decision:** CONTINUE on PR #176 branch `codex/cii-nodal-name-transfer-20261025`.

### Appendix A Takeover Qualification

- **A1 Production Trace:**
  - UI entry: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-panel.js` (`mountNodalPanel`) handles CSV file import (`parseNodalCsv`), preview generation (`planNodalTransfer`), per-row approval checkbox / Approve All (`approvals`), Validate Nodal Target (`validateNodalTransfer`), Apply to New Copy, and Export.
  - Structural engine: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js`:
    - `parseNodalCsv(text)` parses 2-column (`Node,Replace`) or 3-column (`Find,FindNode,ReplaceName`) CSV.
    - `planNodalTransfer(parsed, rows)` resolves logical node endpoints against `parsed.elements`, physical `NODENAME` pointers and existing names.
    - `validateNodalTransfer({targetBytes, originalHash, plan, approvedIds})` verifies `targetBytes` SHA-256 against `originalHash`, recomputes `planNodalTransfer` on re-parsed target bytes, verifies plan integrity, checks approvals, and invokes `makePostimage`.
    - `makePostimage(original, parsed, selected)` scans lines, finds `#$ CONTROL` and `#$ NODENAME` / `#$ BEND`, updates existing `NODENAME.FROM` / `NODENAME.TO` fields or allocates new `NODENAME` records and patches pointer columns in `#$ ELEMENTS` and `NONAM` in `#$ CONTROL`, writes ASCII patches, reparses via `parseCii(output)`, verifies structure and name completion, and returns output binary and metrics.
- **A2 Current Failing Path (Defect Isolation):**
  - In a CII file with 1 physical 15-row ELEMENTS block (`elements.length === 1`), but `#$ CONTROL` declares `NUMELT = 2` or `NUMELT = 99`:
    - `physical.js`'s `parseCii` only checks `elementRows.length % 15 === 0` and `fixed(control[0], 41, 54, 'CONTROL_NONAM')`. It completely ignores columns 0..15 (`CONTROL.NUMELT`).
    - `planNodalTransfer` previously checked only `parsed.elements` and rows, ignoring `CONTROL.NUMELT`, marking rows `READY`.
    - `validateNodalTransfer` previously proceeded and called `makePostimage`.
    - `makePostimage` previously validated `control.end - control.start >= 54`, but did not inspect columns 0..15 (`CONTROL.NUMELT`).
    - `makePostimage` created `output` and ran `parseCii(output)`, which also ignored `NUMELT`.
    - Reproducing command: Node execution with declared NUMELT=2 and 99 produced `plan status: READY reason: PREVIEW` and generated TARGET1 outputs without error.
- **A3 Authority / Invariants:**
  - `CONTROL.NUMELT` in CAESAR II neutral file format (Row 1, columns 0..15, format I15): declares the exact number of piping elements in `#$ ELEMENTS`.
  - Invariant 1: Physical element block count in `#$ ELEMENTS` must strictly equal `CONTROL.NUMELT` (`elements.length === numelt`).
  - Invariant 2: `CONTROL.NUMELT` must be a positive safe integer (`numelt > 0 && Number.isSafeInteger(numelt)`). Zero, negative, non-integer, or unparseable counts must fail closed.
  - Invariant 3: Mismatched or invalid `CONTROL.NUMELT` must HOLD all rows in `planNodalTransfer` (`counts.ready === 0`, `counts.held === rows.length`, reason: `'CONTROL_NUMELT_MISMATCH'` or `'CONTROL_NUMELT_INVALID'`).
  - Invariant 4: `CONTROL.NUMELT` must NOT be mutated during Nodal name transfer. Postimage `CONTROL.NUMELT` must remain identical to preimage `CONTROL.NUMELT`, verified directly from output physical bytes (independent of `parseCii`).
  - Invariant 5: No changes to shared `physical.js`, `app.js`, `writer.js`, `config-policy.js`, or any other tab's core code. Guard lives entirely within `nodal-transfer.js` and its served mirror.
- **A4 Independent Oracle / Test:**
  - Independent validator extracts `#$ CONTROL` line 1, columns 0..15, parses integer, and counts 15-line element blocks in `#$ ELEMENTS`.
  - Negative tests: `NUMELT = 2` with 1 physical element (HELD/fails closed); `NUMELT = 99` with 1 physical element (HELD/fails closed); `NUMELT = 0`, `-1`, `'ABC'` (HELD/fails closed).
  - Positive tests: `NUMELT = 1` with 1 physical element (READY, TARGET1 generated); TARGET1 physical bytes independently verified for `CONTROL.NUMELT === 1` and 15 physical element rows.
- **A5 Minimum Patch / Falsifier:**
  - Scoped addition of `inspectControlNumelt` helper in `nodal-transfer.js`.
  - Call in `planNodalTransfer`: if invalid/mismatched, hold rows with diagnostic reason.
  - Call in `makePostimage` (pre-patch): fail with `NODAL_CONTROL_NUMELT_MISMATCH` or `NODAL_CONTROL_NUMELT_INVALID`.
  - Call in `makePostimage` (post-patch): independently scan `output` lines, verify `postCheck.ok`, `postCheck.numelt === preCheck.numelt`, and physical element row count `elemRows.length === postCheck.numelt * 15`.
  - Falsifier: A specimen with `NUMELT=2` and 1 element must never yield ready rows or TARGET1 bytes; a specimen with `NUMELT=1` and 1 element must succeed and match independent byte assertions.

### Patch and Rollback Provenance

| Module | Pre-edit SHA-256 | Backup ID | Post-edit SHA-256 | Local patch path | Undo procedure |
|---|---|---|---|---|---|
| Nodal parser/writer (`tabs/.../nodal-transfer.js`) | `473af9c5b40ebbe87dd9ca53b8143ec9d9db636bee6c374be1685f62a39533d9` | #90 | `14e9e00804d4567b818788e7c290f436c9fe8711f3084f3a4b6a4fdfbfd4949e` | `.agent-worklogs/20261027_0755_ciifr-pr176-numelt/modules/nodal-numelt-guard.patch` | Restore backup #90 via `node utils/backup.cjs restore 90` |
| Served mirror (`docs/.../nodal-transfer.js`) | `473af9c5b40ebbe87dd9ca53b8143ec9d9db636bee6c374be1685f62a39533d9` | #91 | `14e9e00804d4567b818788e7c290f436c9fe8711f3084f3a4b6a4fdfbfd4949e` | `.agent-worklogs/20261027_0755_ciifr-pr176-numelt/modules/nodal-numelt-guard.patch` | Restore backup #91 via `node utils/backup.cjs restore 91` |
| Tests (`tests/cii-fnr-vnext-nodal-numelt-guard.test.mjs`) | N/A (new file) | N/A | `db17918bae3632546cd5c68275b47b5ece27498d8f70122dd210cc80afee5a7f` | `.agent-worklogs/20261027_0755_ciifr-pr176-numelt/modules/nodal-tests.patch` | Delete `tests/cii-fnr-vnext-nodal-numelt-guard.test.mjs` |
| Workreport (`agents/PR176_workreport.md`) | `0540ade8fd9de85b6d9650751dfc958ee70d838fe493d1dde2845ac40772280a` | #92 | Tracked in PR | `.agent-worklogs/20261027_0755_ciifr-pr176-numelt/modules/workreport.patch` | Restore backup #92 via `node utils/backup.cjs restore 92` |

- **`.agent-worklogs/` manifest path:** `.agent-worklogs/20261027_0755_ciifr-pr176-numelt/manifest.md` (predates product edits).
- **Confirm `.backups/` and `.agent-worklogs/` not staged:** CONFIRMED. Neither directory is staged in git.
- **Proof that shared/other-tab cores are unchanged:** `git diff origin/main` and `git status` confirm 0 changes to shared `app.js`, `physical.js`, `writer.js`, `config-policy.js`, Normal, Line+Node, Geometry, Writer2, or production tiles.

### Validation Ledger

| Check | Status | Actual command, input/digest, exit code | Independent vs implementation-coupled oracle |
|---|---|---|---|
| Native 5-file Node tests | PASS (19/19) | `node --test tests/cii-fnr-vnext-nodal-transfer.test.mjs tests/cii-fnr-vnext-node-only-csv.test.mjs tests/cii-fnr-vnext-nodal-zero-guard.test.mjs tests/cii-fnr-vnext-nodal-sections.test.mjs tests/cii-fnr-vnext-nodal-ui.test.mjs`, exit 0 | Implementation test suite (pre-existing baseline) |
| Before: NUMELT=2 or 99 with 1 element demonstrates defect | PASS (reproduced) | Node script executing `planNodalTransfer` & `validateNodalTransfer` on synthetic 1-element CII with NUMELT=2/99 returned READY and emitted TARGET1, exit 0 | Independent defect reproduction test |
| After: invalid/mismatched NUMELT held without TARGET1 | PASS | `node --test tests/cii-fnr-vnext-nodal-numelt-guard.test.mjs` (Subtests 1 & 2), exit 0 | Independent test oracle |
| Correct NUMELT positive output | PASS | `node --test tests/cii-fnr-vnext-nodal-numelt-guard.test.mjs` (Subtest 3), exit 0 | Independent test oracle + raw byte inspection |
| Absent and terminal NODENAME cases | PASS (5/5) | `node --test tests/cii-fnr-vnext-nodal-sections.test.mjs`, exit 0 | Independent byte comparison in test |
| No Find column, Find audit-only invariants | PASS (3/3) | `node --test tests/cii-fnr-vnext-node-only-csv.test.mjs`, exit 0 | Independent test assertion |
| Zero-node/shared pointer/conflict negatives | PASS (2/2) | `node --test tests/cii-fnr-vnext-nodal-zero-guard.test.mjs`, exit 0 | Independent test assertion |
| Full 6 Nodal test suites integrated | PASS (22/22) | `node --test tests/cii-fnr-vnext-nodal-*.test.mjs tests/cii-fnr-vnext-node-only-csv.test.mjs`, exit 0 | Independent test suites |
| Full VNext regressions | 87 PASS / 1 FAIL | `node --test tests/cii-fnr-vnext-*.test.mjs`, exit 1. 1 failure in `cii-fnr-vnext-branch-scope.test.mjs` proven baseline-red on `main` (0 diff vs main). | Repository VNext suite |
| Served and source mirrors byte identical | PASS | `Get-FileHash tabs/.../nodal-transfer.js` == `Get-FileHash docs/.../nodal-transfer.js` (`14e9e00804d4567b818788e7c290f436c9fe8711f3084f3a4b6a4fdfbfd4949e`) | Independent SHA-256 hash check |
| Actual served Chromium workflow | NOT_RUN | Headless browser smoke not executed in this headless container turn | External browser runtime |
| Exact byte changes / TARGET0 immutable | PASS | Verified in `tests/cii-fnr-vnext-nodal-numelt-guard.test.mjs` (`assert.deepEqual(bytes, before)`) | Independent binary buffer equality |
| Original real CII v11/v14 | NOT_RUN | Private real file withheld from repository | Original specimen |
| CAESAR II native import/re-export | NOT_RUN | Requires licensed CAESAR II workstation | External vendor oracle |
| Separate non-author review | NOT_RUN | Pending independent reviewer assessment | Human/Reviewer agent |
| Exact-head CI | NOT_RUN | PR remains draft; no PR workflow triggered yet | GitHub Actions |

- **Surviving highest risk:** Proprietary CAESAR II parser compatibility on original v11/v14 binary specimens cannot be proven by synthetic isolated Node tests.
- **Scope violations / protected file changes:** NONE.
- **PR status:** DRAFT / MERGE HOLD.
- **ONE EXACT_NEXT_ACTION:** An independent non-author reviewer inspects the exact final commit on PR #176, verifies the fail-closed NUMELT guard, and Owner performs private CAESAR II import validation before considering merge.
