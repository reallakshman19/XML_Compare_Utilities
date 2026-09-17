# EP-SUPPORT-PRIMARY-1225-0010 — live-state reconciliation correction and base-drift classification

CHAIN_ID: SUPPORT-PRIMARY-1225
LEG_ID: QUAL-008
ENDPOINT_ID: EP-SUPPORT-PRIMARY-1225-0010
PREVIOUS_ENDPOINT: EP-SUPPORT-PRIMARY-1225-0009
CUSTODY_EPOCH: 1
ENDPOINT_REASON: Correct the stale EP-0009 main-branch reconciliation, separate release-candidate identity from custody-branch identity, and classify intervening base drift before further qualification.
CHAIN_STATE_VERSION: 4
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: fed57820909f4984a97d67437340df952b73a5ab
COMMON_PROTOCOL_STATUS: CURRENT
QUALIFICATION_PROFILE: PARSER_TOPOLOGY
QUALIFICATION_PROFILE_VERSION: 2
WORK_ITEM_SOURCE: GITHUB_ISSUE
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1225
WORK_ITEM_MODE: EXCLUSIVE
OWNER_PROGRESSION_COMMAND: PROCEED_NEXT
QUALIFICATION_SCOPE_ID: QSCOPE-SUPPORT-PRIMARY-1225-RELEASE-HARDENING
QUESTION_SET_ID: QS-SUPPORT-PRIMARY-1225-0001
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
TASK / ISSUE: #1225 Primary Support Assembly release hardening and governed qualification
PR: 1223
PR_STATUS: OPEN_DRAFT
MERGED: FALSE
MERGEABILITY: MERGEABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_BRANCH: feature/support-primary-assembly-graph
CUSTODY_BRANCH: agent/support-primary-1225
RC_SHA: 759612b4e355a585aed7d64b566f199340429bdf
PR_HEAD_OBSERVED: 759612b4e355a585aed7d64b566f199340429bdf
RC_HEAD_MATCH: TRUE
PR_BASE_REF: main
PR_BASE_AT_RC_FREEZE: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
MAIN_HEAD_LIVE: 3ee90ca25368f69d42f44cbe967d5bbc81972f77
CUSTODY_HEAD_BASIS: 6759ce224ce3a992e48bec868db919b47df62a51
CUSTODY_HEAD_SEMANTICS: documentation branch tip advances as this correction is synchronized; RC_SHA is immutable product qualification identity and must not be conflated with custody tip
STATE: ACTIVE
ENGINEERING_STATE: READY
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PENDING
WRITE_AUTHORITY: CUSTODY_ONLY
PRODUCT_WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: NOT_APPLICABLE

### Correction of EP-0009
EP-0009 recorded `MAIN=242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581` and treated final main reconciliation as complete. A live branch fetch now proves `main` had already advanced to `3ee90ca25368f69d42f44cbe967d5bbc81972f77` at 2026-09-16T20:21:34Z, before EP-0009 was authored. Therefore EP-0009's main-head and final-reconciliation claims are superseded by this endpoint.

EP-0009 also used the frozen RC SHA as the generic custody `HEAD` value even though the custody branch had independently advanced to `6759ce224ce3a992e48bec868db919b47df62a51` before this correction. This endpoint separates:
- `RC_SHA`: immutable product/release-candidate identity;
- `PR_HEAD_OBSERVED`: live PR product head;
- `MAIN_HEAD_LIVE`: live base-branch tip;
- `CUSTODY_HEAD_BASIS`: custody branch tip observed before the EP-0010 synchronization writes.

### Base-drift reconciliation
Compare `242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581..3ee90ca25368f69d42f44cbe967d5bbc81972f77` is 86 commits ahead. The returned changed-file set is confined to the separate CII Writer2 / #1224 workstream: `.github/workflows/cii-w2-r1-benchmark.yml`, CII-W2 custody/evidence/program files, and `tests/cii-workspace-multisource-pb0003-benchmark.test.js`.

No `tabs/support-steel-relationship-builder/support-primary-*`, `support-report-*`, shared PS-clash parser, Support Primary tests, Support Report qualification workflows, browser qualification file, or governed benchmark ZIP changed in this main drift.

BASE_DRIFT_STATUS: NON_INTERFERING_FILESET
BASE_DRIFT_ACTION: retain frozen RC; do not rebase or mutate product solely because main advanced

### Live PR / review reconciliation
- PR #1223 remains open, draft, unmerged, mergeable.
- PR head remains exact frozen RC `759612b4e355a585aed7d64b566f199340429bdf`.
- Pull-request review-thread query returns zero review threads; no unresolved thread blocks this checkpoint.
- Merge authority remains Owner-only and no merge authorization exists.

### Qualification truth retained
- Hardened focused Node: `NOT_RUN — infrastructure`.
- Real 1884/1885 benchmark: `NOT_RUN — infrastructure`.
- Protected real-1885 observations `PS-12060=1`, `PS-12877=4`, `PS-12860=6`, `PS-12120=14`: `NOT_RUN` as governed real-ZIP assertions.
- Playwright/browser: `NOT_RUN — infrastructure`.
- Real 1835 relationship qualification: `NOT_RUN / BLOCKED_INPUT` because the authoritative Owner Clash-within-Supports/support-to-support XML remains absent.
- LEG-014 `27/27` and LEG-017 `13/13` remain retained technical evidence only, not #1225 governed PASS receipts.

### Product-fix decision
`NO-PATCH`. This correction is release-control/custody only. No executed product defect has been established.

### Release disposition
`HOLD_DRAFT`.

### Next execution sequence
1. Synchronize CURRENT.md, ACTIVE.md, immutable endpoint issue comment, and mutable Active Handover to this corrected state.
2. Re-check exact-RC workflow/check receipts for any genuinely executing environment; do not repeat an identical hosted retry unless runner conditions materially change.
3. Execute the repository-owned focused Node qualification first on a clean trusted checkout pinned to exact `RC_SHA` when an executing environment is available.
4. Then execute the real 1884/1885 ZIP benchmark and browser/Playwright gates against that same RC.
5. Separately obtain, pin, and execute the authoritative real 1835 relationship XML through parser -> exact zone scope -> relationship bundle -> reconciliation -> orphan/count production path.
6. If any governed execution fails, locate the first wrong production boundary before permitting a minimal regression-backed patch; any product patch creates a new RC and invalidates old governed PASS receipts.
7. Perform final live main/PR/review/check reconciliation only after executable gates are complete.
