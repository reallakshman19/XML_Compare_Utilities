# WIP-CIIFR-F02-P2-REPAIR-20261022 — Bounded corrective repair for PR #150

**STATE:** DRAFT / HOLD. Corrective successor targeted to PR #150's branch `wip/cii-fnr-vnext/config-conflict-policy-20261021-gpt6`. Stacked on PR #150 HEAD `19c3cdf1c6d0b666637406ff6dab615f05ae61f7`. PR #150 remains intact, draft, unmerged. No production deployment.

## Authority, scope and identity
- Performer: Antigravity agent `c3917ee8`, running in a full Git checkout with Node `v22.23.2` on Windows 11.
- Authority: Owner restart words (CoordinatorLandingpage #1 comment 6321391687) and Oracle O2 handoff on issue #153 (comment 6322554084).
- Scope: Narrow corrective repair addressing confirmed review #152 failure surfaces:
  1. F02: Async lifecycle repair in `ui/app.js` with monotonic operation revision guards, request sequencing for file inputs, and pre-await state snapshotting.
  2. P2-A: Enforce claim schema checks (`ruleId` string, `evidence` non-array object) in `ui/line-node-admission.js` to match `writer.js`.
  3. P2-B: Reject shared physical NODENAME pointers in `ui/line-node-admission.js` with `NODENAME_SHARED_POINTER_FORBIDDEN`, agreeing with writer's exclusion of `!f.shared` fields.
  4. Ensure `tabs/` and `docs/tabs/` source and served mirrors remain 100% byte-matched.
  5. Enforce A13 line count standard: all modified JavaScript files kept strictly under 300 lines.

## Behavior & invariants
- No weakening of `ui/writer.js` or relaxation of physical alias/blank-name, SHA, atomic Geometry, and width safeguards.
- Operation lifecycle in `ui/app.js`: Monotonic revision tokens snapshot operation context before async boundaries in `generate()`, `validate()`, `apply()`, and `exportCii()`. If the user changes tabs, alters configuration, edits rules, loads a new file, or issues a newer operation, stale completions and rejections are dropped silently and cannot resurrect proposals, emit stale diagnostics, or overwrite valid plans.
- File and CSV intake in `ui/app.js`: Monotonic sequence counters (`fileSeqs[field]`, `csvSeq`) guarantee that slow reads from earlier file selections can never overwrite newer selections.
- Line-node admission in `ui/line-node-admission.js`: Claims missing valid `ruleId` or valid non-array object `evidence` reject with `LINE_NODE_CLAIM_SCHEMA_INVALID`. Shared physical pointers reject with `NODENAME_SHARED_POINTER_FORBIDDEN`. Conditional invocation `if (policy !== undefined)` preserves legacy test behavior when called outside writer context.

## Changes
- `tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (296 lines, CRLF): Monotonic operation revision guards on try and catch across all async workflows; monotonic file input sequencing; snapshotting before awaits.
- `docs/tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (296 lines, CRLF): Exact byte match to source.
- `tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (180 lines, CRLF): Added `ruleId` and `evidence` schema checks; added `NODENAME_SHARED_POINTER_FORBIDDEN` guard for shared physical pointers; guarded `enforcePlanPolicy` call.
- `docs/tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (180 lines, CRLF): Exact byte match to source.
- `tests/cii-fnr-vnext-p2-repair.test.mjs`: Standalone red-before-green parity regressions for P2-A and P2-B (LF + CRLF).
- `tests/cii-fnr-vnext-f02-lifecycle.test.mjs`: Standalone red-before-green regressions for F02 delayed Generate, late rejected digest, and target file race.
- `tests/helpers/vnext-dom-env.mjs`: Lightweight headless DOM test environment.

## Real validation completed vs not completed
- **PASS [RED-BEFORE-GREEN]:**
  - `tests/cii-fnr-vnext-p2-repair.test.mjs`: 4/4 failed with `AssertionError: Missing expected rejection` on unpatched candidate; 4/4 pass post-patch.
  - `tests/cii-fnr-vnext-f02-lifecycle.test.mjs`: 3/3 failed with exact reviewer reproduction (`2 !== 0` stale proposals, `1 !== 0` stale diagnostics, target overwrite) on unpatched candidate; 3/3 pass post-patch.
- **PASS [NATIVE UNIT & INTEGRATION]:**
  - `tests/cii-fnr-vnext-config-policy.test.mjs`: PASS 7/7 (exit 0).
  - `tests/cii-fnr-vnext-a1-f01-compact.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-a1-policy-a-compact.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-a1-line-node-admission.test.mjs`: PASS 4/4 (exit 0, previously 2/4 failed).
  - `tests/cii-fnr-vnext-a1.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-normal-node-closure.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-scientific-numbers.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-fortran-exponent-adversaries.test.mjs`: PASS (exit 0).
- **PASS [SOURCE/SERVED PAIR AUDIT]:** `app.js`, `line-node-admission.js`, `writer.js`, `config-policy.js` verified 100% byte-matched across `tabs/` and `docs/tabs/`.
- **PASS [LINE COUNT AUDIT]:** `app.js` = 296 lines; `line-node-admission.js` = 180 lines; `writer.js` = 80 lines; `config-policy.js` = 56 lines (all <= 300 lines).
- **PASS [LOCAL BACKUP & WORKLOG LEDGER]:** Created pre-edit backups #95-#98 via `node utils/backup.cjs save` in full checkout prior to any edit; created `.agent-worklogs/20261022_0500_ciifr-f02-p2-repair/` with binary-safe no-index module patches and full reversal instructions.
- **NOT_RUN:** Live HTTP served Chromium (corporate network administrator blocked navigation in reviewer session); private golden BM/BM3 files (unauthorized custody).

## Module backup ledger & undo provenance
- Backup #95: `tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (pre: `595ff6ae...`, post: `b03b8848...`)
- Backup #96: `docs/tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (pre: `595ff6ae...`, post: `b03b8848...`)
- Backup #97: `tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (pre: `fd4151ea...`, post: `ccd22a67...`)
- Backup #98: `docs/tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (pre: `fd4151ea...`, post: `ccd22a67...`)
- Module patches: `modules/f02-async-lifecycle.patch` (18,108 bytes), `modules/p2-line-node-admission.patch` (4,626 bytes).

## Engineering risk and falsifier
- Risk: Residual async races in third-party file pickers or browser-specific drag-and-drop implementations.
- Falsifier: In an active browser session with network-throttled or delayed SHA calculation, executing Generate followed by Config change within 50ms produces >0 proposals or stale diagnostic warnings.

**EXACT_NEXT_ACTION:** Oracle adversarial re-review of successor draft PR; Owner explicit disposition of PR150 historical pre-edit backup chronology. Successor PR stays DRAFT/HOLD.
