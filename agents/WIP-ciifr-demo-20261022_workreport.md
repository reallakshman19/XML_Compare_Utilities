# WIP-ciifr-demo-20261022 — Optional synthetic standalone demo button

**State:** DRAFT / READ_ONLY FOLLOW-UP REQUIRED FOR AGENTS BACKUP POLICY. No main-branch merge or deployment authorized in this work packet.
**Authority:** Owner: "ok do it" following request to add a mock icon wired with sample CII and CSV.
**Base main at WIP start:** `8fea0491ca4ca85565132a81f1620f57fbc3014e`.
**Branch:** `wip/ciifr-vnext-demo-synthetic-v14-20261022`.

## Takeover / bounded engineering context
- A1 current production flow: `docs/cii-fnr-vnext.html` imports existing `ui/app.js`, file inputs `data-file=target/source/csv` feed the independently validated Normal parser/planner; invalidation guards prevent stale approval reuse.
- Prior defect classes F02–F06 and ownership boundaries reviewed; demo must not change writer, planner, target byte editing, policy, enabled tabs, or the legacy production tile.
- Physical test contract: synthetic v14 CRLF fixed-field CII, 15-record ELEMENTS, 80-column records, CONTROL.NONAM=1; nonshared NODENAME pairs `OLD-A`/`OLD-B`. Two CSV rules `OLD-A→NEW-A` and `OLD-B→NEW-B`, with normal parser claims `PROPOSED`, no diagnostics.
- Current overlaps: standalone Normal/Config now on main; unmerged A2 and other Writer2 work not modified. Scope classification SAFE for new opt-in standalone demo page and module.
- A1 trace, A2 design, A3 invariants, A4 validation, A5 minimal patch documented here; **not an independently full-checkout-qualified Appendix A takeover**.

## Changed-file ledger
| Path | Role | Origin |
|---|---|---|
| `docs/cii-fnr-vnext.html` | Load-demo icon, demo status, separate module import | Existing HTML, pre-image Git blob `afa694f8f1348caffed73c85e97ed627293e969a` |
| `tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js` | Named exported synthetic sample builder + opt-in file-input adapter | New |
| `docs/tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js` | Byte-identical served mirror | New |
| `tests/cii-fnr-vnext-demo.test.mjs` | Parser/planner, mirror and click→input pipeline regressions | New |

## Functional contract and constraints
- User clicks explicit `🧪 Load demo CII + CSV` button. Switches to Normal, clears old SOURCE, triggers the actual TARGET file `change` handler with a synthetic `File`, **waits for TARGET SHA metadata**, then dispatches the real CSV input `change` and waits for `Imported 2 CSV rows.`. This sequencing avoids F05's revision-token rejection of simultaneous independent async loads.
- Existing `app.js` controls review and all Validate/Apply/Export gates; demo module **never calls writer, approves claims or initiates export**. UI status indicates synthetic data only; private customer/original CII is not embedded or read by this implementation.
- New JavaScript module <300 lines, no changed legacy engine files, no silent default mock load. Source and served module Git blob equality required.

## Validation
- **PASS [READBACK + SOURCE-EXACT V8]**: Generated synthetic v14 CII parses with two single-owner nonblank fields; generated 2-rule CSV creates exactly **2 PROPOSED** Normal claims and no diagnostics. 1460-byte CRLF sample. Synthetically constructed, not original CII custody.
- **PASS [SOURCE-EXACT MOCK DOM]**: Running fetched GitHub `app.js`, new demo module and committed `tests/helpers/vnext-dom-env.mjs` under deterministic fake File/DataTransfer/MutationObserver and stub SHA: click status confirms 2 CSV rules loaded, 2 renderRows and 2 proposals after Generate; Export remains disabled until approval/validation. **Not real browser and not real writer**.
- **NOT_RUN**: Full native `node --test tests/cii-fnr-vnext-demo.test.mjs` and inherited 11-file suite in a complete checkout; real HTTP Chromium/Pages smoke. Local `git ls-remote https://github.com/reallakshman19/XML_Compare_Utilities.git HEAD` failed DNS resolution. **Do not claim CI green**.
- **NOT_RUN / COMPLIANCE GAP:** A full local checkout and canonical `node utils/backup.cjs save` were unavailable, so the edit used a GitHub connector on a **separate draft branch only**. Git contents blob `afa694...` preserves the original HTML pre-image and allows exact remote undo, but **this is NOT an AGENTS-compliant local backup**. `.agent-worklogs` canonical local ledger could not be established. This is an explicit new deviation requiring a capable worktree before merge, not a claim of compliance. Do not merge until resolved.
- No changes to `app.js`, `writer.js`, `config-policy.js`, `physical.js`, legacy Find & Replace tile or live main.

## Undo
- At a separate checkout, verify current HTML SHA and restore pre-image Git blob `afa694f8f1348caffed73c85e97ed627293e969a` with file-level safety and canonical backups.
- For new demo-loader twins and test file, verify exact current SHA and remove only if no later changes; retain original source history. No hard reset or unrelated file rollback.

## Risks and exact next action
- Browser DataTransfer constructor/MutationObserver compatibility, delayed file reads and real Pages deployment are unqualified. Timeout reports clear error; file authorization remains exclusively in existing app logic.
- **EXACT_NEXT_ACTION:** A checkout-capable coding reviewer adopts the draft, runs canonical backup and `.agent-worklogs` checks before any correction, executes committed demo + inherited Node regression suites and real served-browser click→generate test, and returns exact status to the Owner. Owner decides final merge separately.
