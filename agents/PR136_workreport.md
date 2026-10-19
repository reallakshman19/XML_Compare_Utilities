# PR #136 — F1 review-export freshness | recovery-first engineering workreport

**State:** CODE FIX COMMITTED IN DRAFT · EXACT FINAL HEAD CI IN PROGRESS (verify current GitHub head). **No production release or independent P2 sign-off.**
**Owner directive:** "ok start fix" 2026-10-19, following accepted `I121-RELEASE-READINESS-R2`. **Single bounded fix:** source-verified F1 CSV/JSON stale snapshot leakage while review decisions are dirty. No F3 change without actual consumer and qualified P2 finding.
**Head branch:** `i121/f1-export-freshness-20261019-01`, **PR base:** `i121/postinspect-epoch-revocation-20261019` frozen draft PR135 at `0a75aa30f8e00155985929ec769aa607563f51a6`. PR132 parent `ec98151dfe58afb8cf2e1aee4575ad3d8b7032f8`, QA #133 sibling `92b21bf5fd71e08bf3c724dce885293e8ba5bae5`; no branch merge or production deployment.

## Owner problem and purpose

Issue #121 originally reports genuine Windows Edge freezing on generic Writer2 Inspect for SHA-pinned original S1/S2/S3/T. PR132+135 put Inspector in a Worker and add four post-Inspect async revision guards, but an independent source audit found a separate **F1** stale audit-CSV/JSON loophole: `markReviewDirty` retained old `preview`, `renderMultiReview` re-enabled export buttons, and `onCsvExport/onJsonExport` exported prior `preview.artifacts` despite uncommitted changed review decisions. This can misrepresent review evidence but is not evidence of unauthorized TARGET Apply.

**Conservative accepted fix contract:** the multi-source audit CSV/JSON exports may be downloaded only when current on-screen review decisions match the last computed/committed preview; dirty changes disable exports until `applyMultiSourceReview` finishes successfully. No automatic physical certification or export of TARGET. Existing one-source legacy Writer2 path preserved.

## Five source-grounded engineering challenges and decision

- **A1 Trace:** `docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` computes preview/review, enables toolbar exports and delegates legacy shell. `cii-workspace-transfer-scope-ui.js` pre-registers older target button listeners.
- **A2 Failure:** `markReviewDirty` sets dirty then calls `renderMultiReview`; old version re-enabled stale CSV/JSON. A handler-only guard would not preempt already registered legacy button listeners. A container capture gate runs before target handlers.
- **A3 Authority:** correct original four CII hashes, Method A/B/BM001 veto, 2/3 automatic base qualified (S1 unresolved), no Method C B/C, no BOUND/Apply promotion, no PR107-owned `tabs/` change.
- **A4 Validation:** nine prior PR135 async helper tests and existing Chromium/Edge original Inspect prove different behavior; do not claim they demonstrate F1 export. Here: red-before-green native admission + source-wiring tests and inherited post-Inspect guard suite, plus real original-file Chromium before claiming any Worker regression evidence. No self-P2 or owner-local Edge.
- **A5 Minimal patch:** one existing deployed docs Writer2 file, pure named export-readiness predicate, disabled UI controls, parent capture event veto, two direct export handler vetoes; one new focused test, CI custody/undo runner and WIP report. `getMultiSourcePreview()` F3 stays unchanged; no established unsafe consumer.

## Changed-file ledger relative to PR135

| File | Why | Status |
|---|---|---|
| `docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` | F1 review export admission; enable only when preview committed; stop stale direct/legacy click; dirty message | Product edited, one existing file |
| `tests/cii-workspace-i121-f1-review-export.test.mjs` | 10 predicates and actual source-wiring/protection cases | Created |
| `.github/workflows/cii-i121-f1-review-export.yml` | Full checkout true preedit backup; original-to-new binary no-index selective undo; red/green node tests; original-file Chromium validation | Created, task-scoped |
| `agents/WIP-I121-F1-EXPORT-20261019_workreport.md` | Source-first preedit plan and assumption/falsifier record | Created before product edit |
| `agents/PR136_workreport.md` | This durable final recovery report | Created |

## Exact evidence and protected limits

**Preedit, BEFORE product modification:** Original PR135 docs UI Git blob `dcd5e8928db7fc204d9cbe9ff6a025b8c4d7a06d`; SHA256 `37c4dcba03c46e8429ecc400e935cdf1b1111bcff3de6efdd943e9843a5c846a`. Actual `node utils/backup.cjs save` ID **#90** ran against this unchanged file on a full checkout. [Run #39234101506](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234101506), [artifact #12177278859](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234101506/artifacts/12177278859). That initial workflow's **overall** status was FAIL solely from a later `find | head` broken pipe, *after* successful backup and upload. Explicitly do not represent its whole run as PASS. The workflow code was corrected. Postedit source blob `6759715dcc9d1f56f6394c62f1f6b9f4d57c807b` at original fix commit `4fb200e334831e98dbfc7fc4fa9484b4a57217c8`; post SHA256 `7c0e807cafb9bfeef0d65335a1ea46a687515f89334220ba6e9197f152ef9141`.

**Preimage RED:** [Run #39234237810](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234237810) test job FAIL, expected because new named export predicate absent from old source. Preedit backup still captured but diagnostic pipe made backup job FAIL at that run too.

**Postimage GREEN (actual executed source):** [Run #39234725732](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234725732) exact then-current head `251a951cd28c409274fddd0ccc993ffd1793157e`: F1 native+source 10/10 PASS, inherited post-Inspect 13/13 PASS, preedit guard correctly skips postimage, and selective undo job SUCCESS. [Binary no-index task-local undo artifact #12178174596](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234725732/artifacts/12178174596) explicitly downloads preserved original artifact ID #12177278859, asserts original Git blob and SHA, compares saved original bytes directly to current file, stores post SHA, reverse instructions, `.agent-worklogs` manifest and patch.

**Original-file browser:** a dedicated Chromium regression was added to the draft CI runner after the 10+13 PASS checkpoint. Check the **latest exact GitHub head** for its SUCCESS/FAIL before calling original/browser validation complete; no new Owner-local Windows Edge or real physically qualified Compare→Review→Scope→Apply is claimed.

## Remaining issues / handover gates

- **F1 product behavior:** source fix and native tests present; direct full UI-browser download-path falsification still **NOT_RUN** because authentic S1 needs genuine qualified third base to reach review; no fake manual physical correspondence inserted.
- **F3 preview getter:** NOT CHANGED; hypothetical contract ambiguity remains for independent P2 consumer tracing. Do not label authorization bypass without concrete caller.
- **Independent P2:** existing [Issue #134](https://github.com/reallakshman19/XML_Compare_Utilities/issues/134) still needs a genuinely distinct reviewer and must include PR136's exact candidate head in its final scope.
- **Owner actual local Windows Edge:** NOT_RUN; sibling PR133 kit does not automatically include child PR136; qualify chosen exact release composition deliberately.
- **Release composition:** main `9a5916f972af170f272c525907728237391b7ca8` lacks all draft Worker fixes. The full main→PR135 was 81 files at previous check; the child PR changes only its own scoped files. Owner must approve release composition, independent P2 on final release head, and Owner-only merge/deploy.
- **Protected:** original 4/4 fixture hashes, frozen Python, PR107 `tabs/`, physical Method A/B/BM001, Method C A-only / B0 C0, and actual Writer2 Apply authority unmodified.

## Undo / exact next

**Selective undo:** retrieve original byte snapshot and no-index patch from [artifact #12178174596](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39234725732/artifacts/12178174596). Before replacing file, verify current SHA256 is `7c0e807cafb9bfeef0d65335a1ea46a687515f89334220ba6e9197f152ef9141` and that no subsequent engineer changed it. If mismatch STOP. Restore only original `docs/` UI byte preimage; new owned files may be removed only after checksum checking and confirming absence of later edits. **Never reset/checkout/revert history or touch unrelated files.**

**EXACT_NEXT_ACTION:** verify newest full exact-head four-job GitHub workflow status, especially authentic original Chromium Inspector; report latest SHA/tests to PR136 and Issue #121. Then request a genuinely distinct P2 review (Issue #134) of #136 plus #135/#132/#133, and Owner-local Edge acceptance on chosen release composition. DRAFT/RELEASE HOLD until Owner-only approval.
