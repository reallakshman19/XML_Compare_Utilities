# PR150 — Configurable conflict policy for CIIFR VNext

**STATE:** DRAFT / HOLD. Owner-approved bounded implementation, **NOT** standalone or production acceptance. PR base = PR149 head `5bc6dbffc2ddacb512f619adc5693ca51803e15c`. Code/test head before this receipt = `0bf18867d655f1cb0acd493f8bc7838dec6d2cce`. After this metadata commit, use current PR HEAD for reviews.

## Authority, scope and identity
Owner's direct request followed Config-tab specification. ChatGPT GPT-6 authored code under connected Owner GitHub credentials, **not** an independent reviewer. Preserve A1 predecessor PRs and A2 PR145, A3 #142, main, existing tile and private CII inputs. No merge. New successor branch; one coherent feature.

## Behavior & invariants
Fourth settings tab, three functional tabs unchanged. `ISOLATE_UNRELATED` (default) permits approvals only when none overlaps any other claim, even withheld HOLD/REJECTED; `BLOCK_PLAN` enforces strict conflicts. `UNCHANGED` (default) leaves unapproved proposals untouched; `BLOCK_PLAN` blocks their presence. `LOGICAL_NODE` approval UX groups eligible same-node/same-after claims and `INDIVIDUAL` allows individual review inputs, **not** individual unsafe alias exports. No change to physical group completeness; geometry atomic groups remain unavailable. Shared `config-policy.js` used by both `writer.js` and `line-node-admission.js`. Only supported `DUPLICATE_FIELD_CLAIM` diagnostics for an independently observed conflict pair are isolatable, never arbitrary ERROR diagnostics. All approved physical spans rechecked against every status. Config changes revoke all tab plans and exports and trigger asynchronous operation version guards.

## Changes
New source+served `ui/config-policy.js`; modified source+served `ui/app.js`, `ui/writer.js`, `ui/line-node-admission.js`; modified `docs/cii-fnr-vnext.html`; new `tests/cii-fnr-vnext-config-policy.test.mjs`; prior WIP report. Source/served parity of all four module pairs confirmed by Git blob equality at `f2d95a4ff2a8929d5d4e0b1cee9783d7e46ee1e1`; config-policy pair changed together in `0bf18867d655f1cb0acd493f8bc7838dec6d2cce`.

## Real validation completed vs not completed
- **PASS [STATIC]:** exact-source V8 syntax-only parse of 5 code/test files after removing ESM directives solely for parser checks.
- **PASS [SOURCE-EXACT PURE POLICY / SYNTHETIC]:** 7 standalone test propositions evaluating the actual content of new config-policy.js in isolated V8: unrelated B/C isolated, strict rejection, unapproved-blocking, chosen versus HOLD overlap rejection, unrelated format diagnostic rejection, INDIVIDUAL does not allow physical overlap, unknown configuration key rejection. These are NOT Node integration tests.
- **PASS [READBACK]:** exact GitHub blob IDs and four source/served module mirrors (postcommit final parity should be rechecked on review).
- **NOT_RUN:** native `node --test tests/cii-fnr-vnext-config-policy.test.mjs`; inherited A1/F01/LINE_NODE suites; actual integrated Normal/LINE_NODE writer with privately approved originals; full checkout CI (0 statuses/0 workflow runs observed at `f2d95a4`); browser HTTP served Config→Normal Validate→Apply→Export; canonical backup and local patch ledger.
- **BLOCKER [REPOSITORY POLICY]:** HTTPS git checkout fails DNS in author container. Repository-required BEFORE-EDIT canonical `utils/backup.cjs save` and `.agent-worklogs` ledger **were not performed**; preserving preimage blobs in GitHub history is not a compliant substitute. Needs independent Owner disposition before any acceptance. Historical predecessor backup deviations remain UNWAIVED. No retroactive claim that backups occurred.

## Engineering risk and falsifier
Priority: no acceptance until independent full-checkout reviewer proves stable Node writer behavior for real CII v11/v14, LF+CRLF, named/blank Policy A, two nonblank alias closure and true LINE_NUMBER admission, non-overlap across all statuses, duplicate-diagnostic authority, strict semantics and config invalidation of stale export. Distinct reviewer to challenge all 14 previously reported F01 scenario mismatches and report which are policy vs implementation. Source mirrors are not proof of served Chromium.

**EXACT_NEXT_ACTION:** Independent reviewer checks PR150 current HEAD, executes committed and inherited native tests + browser + allowed original qualification; Owner/Oracle reconciles P1 policy choice and P2 acceptance, explicitly dispositions backup requirement before merge. Maintain DRAFT/HOLD and prohibit production tile replacement.
