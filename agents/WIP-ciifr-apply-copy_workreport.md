# WIP ciifr-apply-copy — CII v14 explicit Apply-to-new-copy gate

CHAIN: CII-FIND-REPLACE-V14
BRANCH: feature/cii-find-replace-apply-copy-v14
BASE_MAIN: 511d186926b67a71efa8163e85497f489ef3a3ed
STATE: ACTIVE
ENGINEERING_STATE: IN_PROGRESS
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
WORK_ITEM_SOURCE: OWNER_DIRECT
OWNER_COMMAND: proceed

## Mission

Add the explicit user **Preview → Apply → Download** gate requested for CII v14 Find & Replace without granting direct source-file overwrite authority. “Apply” means release the already independently validated TARGET1 as a **new output copy**; immutable TARGET0 remains unchanged.

## Authority boundary

Allowed in this leg:
- feature-local Find & Replace session/UI/panel behavior;
- explicit Apply-to-new-copy release state;
- focused tests proving release invalidation and no direct overwrite/writer authority.

Excluded:
- FORCE/FORCMNT qualification;
- direct overwrite of the loaded CII file;
- Writer1/Writer2 or converter routing;
- workflow changes;
- benchmark/oracle/tolerance changes;
- native-v14/external CAESAR acceptance claims.

## Protected invariants

- TARGET0 remains immutable.
- Claims remain TARGET0-relative and independently postimage-validated.
- Direct mutation authority stays `canApply: false`.
- User-facing new-copy release uses a distinct `canApplyToNewCopy` capability.
- Download is not available until the user explicitly applies the qualified preview to a new copy.
- Any target/CSV/mode/row/review/qualification change invalidates prior release state.
- No Writer1/Writer2 invocation.
- FORCE remains fail-closed.
- Merge remains Owner-only.

## Current hypothesis

The existing qualified TARGET1/output boundary is sufficient; the missing behavior is an explicit release state between validation and download. A small session-state gate plus UI wiring should satisfy the required Apply action without widening mutation authority.

## Falsifier

Any implementation that can alter TARGET0, enables contract-level/direct `canApply`, invokes a writer, permits download before explicit Apply-to-new-copy, preserves release after a changed input/review, or weakens existing validation is invalid.

## Planned changed-file ledger

| File | Preimage blob | Planned change |
|---|---|---|
| `tabs/cii-workspace/cii-workspace-find-replace-session.js` | `062cab0367d0959e936ae8762e40a2ba7d2a3804` | add immutable new-copy release state and capability summary |
| `tabs/cii-workspace/cii-workspace-find-replace-ui.js` | `2aab16841a17dd3f050a568df42e983fe3efa777` | wire explicit Apply button and gate download |
| `tabs/cii-workspace/cii-workspace-find-replace.js` | `3dcb5da7f9f9597b423206d9541e404834f91b64` | relabel Step 5 / Apply action as new-copy release |
| `tests/cii-workspace-find-replace-session.test.js` | `6ec216ca8b7b77c1057d1d90372089ef34a5ae00` | prove Preview → Apply-to-copy → Download readiness and invalidation |
| `tests/cii-workspace-find-replace-ui-registration.test.js` | `f35a83806b548d84bc37dbc2aaddc458a6e5b91c` | prove Apply-to-new-copy UI wiring and FORCE/writer boundaries |

`tests/cii-workspace-find-replace-foundation.test.js` is intentionally unchanged: its direct mutation boundary must continue asserting `canApply === false`.

## Validation plan

1. Exact focused session tests.
2. Exact UI-registration tests.
3. Existing Find & Replace non-benchmark group if materializable in the local runtime.
4. Retained-real SOURCE3 remains `NOT_RUN` unless exact 393008-byte fixture materialization can reproduce Git blob `20c0c37014004fb9de46e3e4d01f0c62535495d5`.
5. Full repository suite remains `NOT_RUN` unless an exact checkout execution substrate becomes available.

## Environment limitation / recovery note

This task is being performed through the connected GitHub API without a local authenticated repository checkout. Therefore repository-local `node utils/backup.cjs save ...` and `.agent-worklogs/` commands cannot be executed in this substrate. Exact Git preimage blob SHAs above are recorded before mutation and the work remains isolated on a fresh branch. This limitation must not be represented as satisfying the local backup/ledger command requirement.

## Exact next action

Implement the session release state first, preserving direct `canApply: false`; then wire the UI to `canApplyToNewCopy`/`canDownload` and update focused tests.
