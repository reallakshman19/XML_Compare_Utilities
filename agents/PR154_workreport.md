# PR154 — Corrective Round 2 Repair for PR #150 / Issue #153 (F03, F04, F05, F06)

**STATE:** DRAFT / HOLD. Corrective successor targeted to PR #150's branch `wip/cii-fnr-vnext/config-conflict-policy-20261021-gpt6`. Stacked on PR #150 HEAD `19c3cdf1c6d0b666637406ff6dab615f05ae61f7`. PR #150 remains intact, draft, unmerged. No production deployment.

## Authority, scope and identity
- PR URL: https://github.com/reallakshman19/XML_Compare_Utilities/pull/154
- Performer: Antigravity coding agent `c3917ee8`, running in a full Git checkout with Node `v22.23.2` on Windows 11.
- Authority: Oracle Round 2 Directive (PR #154 review comment 6334450320) and Issue #153.
- Scope: Corrective Round 2 repairs addressing confirmed Oracle adversarial review findings:
  1. **F03 Admission Policy Enforcement**: Restored unconditional plan policy enforcement in `ui/line-node-admission.js` (and served twin), applying default policy when omitted and rejecting unrelated blocking diagnostics (e.g. `FORMAT_INVALID` -> `PLAN_HAS_BLOCKING_DIAGNOSTICS`). Preserved collision mapping (`LINE_NODE_PLAN_COLLISION`).
  2. **F04 Operation Ownership**: Introduced monotonic operation generation tokens (`opSeq`) in `ui/app.js` across `generate()`, `validate()`, `apply()`, and `exportCii()`. Older operations cannot overwrite or clear newer valid state upon completion or late rejection. Synchronously refreshed button enablement via `renderResults()` on revocation.
  3. **F05 CSV Tab Binding**: Bound asynchronous CSV intake in `ui/app.js` to initiating tab (`targetTab = active`), initiating state (`s = state()`), revision, and config snapshot before awaiting `file.text()`. Dropped stale CSV results after tab switches, config changes, or rule edits, preventing cross-tab corruption.
  4. **F06 Target/Source Selection Fail-Closed**: Immediately revoked `target = null` (and `source = null`), invalidated all states, cleared metadata, and refreshed UI synchronously upon file selection before awaiting `arrayBuffer()` or SHA-256 digest, closing the pending selection window where old exports remained authorized.
  5. **Parity and A13 Standard**: Maintained 100% byte-matched parity between `tabs/` and `docs/tabs/` source/served twins. Enforced strict file line counts: `app.js` = 298 lines; `line-node-admission.js` = 180 lines (strictly < 300 lines).

## Behavior & invariants
- No weakening of `ui/writer.js` or relaxation of physical alias/blank-name, SHA, atomic Geometry, and width safeguards.
- Line-node admission in `ui/line-node-admission.js`: Callers omitting policy now evaluate against `DEFAULT_POLICY`. Any non-isolated fatal diagnostic rejects with `PLAN_HAS_BLOCKING_DIAGNOSTICS`.
- Operation ownership in `ui/app.js`: Monotonic `opSeq` tracks latest started operation. Succeeded and rejected outcomes guard with `op === opSeq`, rejecting stale completions and late rejections.
- Button enablement: Revoking validated or applied state immediately calls `renderResults()`, disabling Apply and Export instantly.
- Pending selection safety: New file selection immediately drops prior target/source custody, nulls state, and disables Run, Validate, Apply, and Export before async I/O.
- Rule-grid isolation: CSV import applies strictly to the initiating tab and is dropped if the user switched tabs or modified rules/config during the async read.

## Changes
- `tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (180 lines, CRLF): Unconditional `enforcePlanPolicy` invocation with error mapping.
- `docs/tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (180 lines, CRLF): Exact byte match to source.
- `tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (298 lines, CRLF): Added `opSeq` monotonic operation tokens, immediate file selection revocation, tab-bound CSV intake.
- `docs/tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (298 lines, CRLF): Exact byte match to source.
- `tests/cii-fnr-vnext-r2-regressions.test.mjs`: Standalone red-before-green regressions for F03 (default policy & fatal diagnostics CRLF/LF), F04 (stale validate error ordering), F05 (delayed CSV cross-tab and edit race), and F06 (pending target/source selection revocation window and failed loads).

## Real validation completed vs not completed
- **PASS [RED-BEFORE-GREEN]:**
  - `tests/cii-fnr-vnext-r2-regressions.test.mjs`: 7/8 failed on unpatched candidate with exact reviewer reproduction; 8/8 pass post-patch (exit 0).
- **PASS [NATIVE UNIT & INTEGRATION]:**
  - `tests/cii-fnr-vnext-config-policy.test.mjs`: PASS 7/7 (exit 0).
  - `tests/cii-fnr-vnext-a1-f01-compact.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-a1-policy-a-compact.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-a1-line-node-admission.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-p2-repair.test.mjs`: PASS 4/4 (exit 0).
  - `tests/cii-fnr-vnext-f02-lifecycle.test.mjs`: PASS 3/3 (exit 0).
  - `tests/cii-fnr-vnext-a1.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-normal-node-closure.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-scientific-numbers.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-a1-fortran-exponent-adversaries.test.mjs`: PASS (exit 0).
  - `tests/cii-fnr-vnext-r2-regressions.test.mjs`: PASS 8/8 (exit 0).
  - **Overall Suite**: PASS 38/38 tests across 11 test suites (exit code 0, duration: ~430ms).
- **PASS [SOURCE/SERVED PAIR AUDIT]:** `app.js` and `line-node-admission.js` verified 100% byte-matched across `tabs/` and `docs/tabs/`.
- **PASS [LINE COUNT AUDIT]:** `app.js` = 298 lines; `line-node-admission.js` = 180 lines (both strictly < 300 lines).
- **PASS [LOCAL BACKUP & WORKLOG LEDGER]:** Created pre-edit backups #95-#98 via `node utils/backup.cjs save` in full checkout prior to any edit; created `.agent-worklogs/20261022_1145_ciifr-r2-f03-f06-repair/` with binary-safe no-index module patches and full reversal instructions.
- **NOT_RUN:** Live HTTP served Chromium (modular UI component is not yet mounted to standalone host HTML; network policy blocks external browser automation; verified via lightweight headless DOM test harness); private golden BM/BM3 files (unauthorized custody).

## Module backup ledger & undo provenance
- Backup #95: `tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (pre: `ccd22a67dc74f86107d1c37f4b6589c718cc70f4880d484bbd8bcf7a6356eef2`, post: `1b179377d7d9ee31d41c583d68afb897606d436eda594400c0c15991e4871fb2`)
- Backup #96: `docs/tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js` (pre: `ccd22a67dc74f86107d1c37f4b6589c718cc70f4880d484bbd8bcf7a6356eef2`, post: `1b179377d7d9ee31d41c583d68afb897606d436eda594400c0c15991e4871fb2`)
- Backup #97: `tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (pre: `b03b88487c0479647fae47beeb83230e5b38b537586cdfe44f9d9d46868e1333`, post: `8c63e7ad09e4fb2896c4c27b28e43e164fb0ea679619f202a84c67fdd7128c1d`)
- Backup #98: `docs/tabs/cii-workspace/cii-fnr-vnext/ui/app.js` (pre: `b03b88487c0479647fae47beeb83230e5b38b537586cdfe44f9d9d46868e1333`, post: `8c63e7ad09e4fb2896c4c27b28e43e164fb0ea679619f202a84c67fdd7128c1d`)
- Module patches: `.agent-worklogs/20261022_1145_ciifr-r2-f03-f06-repair/modules/f03-admission-policy.patch` (2,212 bytes), `.agent-worklogs/20261022_1145_ciifr-r2-f03-f06-repair/modules/f04-f06-app-lifecycle.patch` (21,214 bytes).

## Engineering risk and falsifier
- Risk: Residual async races in third-party file pickers or browser-specific drag-and-drop implementations.
- Falsifier: In an active session, starting TARGET B selection while TARGET A is validated/applied and initiating Export within the async read delay executes an export of TARGET A.

**EXACT_NEXT_ACTION:** Oracle adversarial re-review of successor draft PR #154 at updated HEAD; Owner explicit disposition of PR150 historical pre-edit backup chronology. Successor PR stays DRAFT/HOLD.
