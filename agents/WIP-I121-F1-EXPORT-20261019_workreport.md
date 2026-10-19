# WIP-I121-F1-EXPORT-20261019 — Review-export freshness, recovery record

**Status:** READ_ONLY SOURCE RECONCILIATION COMPLETE; PRE-EDIT BACKUP PENDING. Owner request: "ok start fix" following accepted I121-RELEASE-READINESS-R2 review and source-established F1. One bounded existing-file edit is authorized: `docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` only. Add new tests/backup-validation CI as necessary; do not edit PR135, PR107 tabs files, original CII fixtures, Python, Method A/B/BM001, or unapproved physical authority.

**Mission:** Ensure the multi-source CSV and JSON artifacts never claim pending/dirty review decisions as a current committed review. Existing preview and transfer must remain available for the user to reconcile review; but while reviewDirty, CSV/JSON are disabled, and direct export events are rejected. When review is successfully rebuilt, exports re-enable; SOURCE/TARGET/base reset stays fail-closed. Preserve one-source legacy path.

**Original Owner:** [Issue #121](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121), [G1 Stage 2](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121#issuecomment-6251903599), [latest Owner-path release reconciliation](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121#issuecomment-6259107716), [P2 workpack #134](https://github.com/reallakshman19/XML_Compare_Utilities/issues/134). Reviewer still not assigned. Current PR135 HEAD pinned `0a75aa30f8e00155985929ec769aa607563f51a6`; parent PR132 `ec98151dfe58afb8cf2e1aee4575ad3d8b7032f8`; sibling QA PR133 `92b21bf5fd71e08bf3c724dce885293e8ba5bae5`; main `9a5916f972af170f272c525907728237391b7ca8`. Preserve separate `docs/` inspection-only contract and PR107 `tabs/` preparedSession contract.

## Appendix A source-grounded takeover trace

A1 — **Production:** `mountCiiWriter2MultiSourceShell` composes legacy shell, uses async Inspector Worker, publishes `preview` in `analyzeMultiSource` and review-rebuild; `renderMultiReview()` enables CSV/JSON whenever preview exists; `onCsvExport/onJsonExport` export `preview.artifacts`; Writer2 TARGET export is a different `applyScoped` guarded by async stamps.

A2 — **Failure:** `markReviewDirty` sets `reviewDirty=true`, clears scope but calls `renderMultiReview` which unconditionally enables audit buttons and leaves `preview` intact. Therefore old artifacts may download during pending review decisions. Legacy shell has its own button listeners, demanding a capture-phase source-context guard before downstream handlers.

A3 — **Authority:** Original S1 remains unqualified at 2/3 automatic physical bases, B0/C0; never create a fake S1↔T anchor, BOUND/Apply or broaden export into physical transfer. Preserve exact original SOURCE/TARGET SHA and Method A/B/BM001.

A4 — **Validation:** Historic genuine four-file Inspector Worker Chromium [#39218403502](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39218403502) and hosted Edge [#39218403610](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39218403610) PASS Inspect only; no genuine full downstream export. New independent F1 predicate and actual UI wiring tests will be run. If no real QA runner, mark NOT_RUN, not PASS. No P2 self-approval.

A5 — **Smallest patch:** one existing docs UI file, one isolated new test, CI proof of true preedit binary backup and targeted checks. Add a per-shell review-export readiness predicate, gate both enabled states and direct click handlers, and intercept capture before legacy handlers; unchanged public `getMultiSourcePreview` (F3 has no known unsafe consumer). Falsifier: exports reachable while dirty, export stays blocked after successfully committed review, or one-source legacy behavior regresses.

## Scope/ownership and rollback

Before any existing-file edit, in a full clean GitHub Actions checkout at this branch's **pre-edit** head run `node utils/backup.cjs save docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js "Plan to ..."`; record Git blob, SHA256, backup ID, original byte snapshot and local hidden `.agent-worklogs` manifest. Preserve artifact; later generate `git diff --no-index --binary` from **actual saved preimage** to postimage, and explicit SHA-constrained selective undo. Never treat a Git history diff as the backup. Keep backups untracked. The one existing docs UI baseline blob: `dcd5e8928db7fc204d9cbe9ff6a025b8c4d7a06d`.

## Evidence and continuation

- Source baseline: verified pre-edit GitHub fetch at PR135 head `0a75aa30...`; exact source file SHA `dcd5e8928db7fc204d9cbe9ff6a025b8c4d7a06d`.
- Tests: `NOT_RUN` until qualifying workflow execution.
- Independent P2: `NOT_DONE`; Owner local Edge: `NOT_RUN`; final release composition: `NOT_APPROVED`.
- NEXT: obtain **genuine preedit backup CI** and verify exact source unchanged; only then apply source patch and targeted tests, create DRAFT PR stacked on #135; request distinct P2 and maintain RELEASE HOLD.
