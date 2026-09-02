# PR1076 Workreport — CII Find & Replace Excel-style Manual Grid

## Owner requirement

Section `3. Manual table entry` shall be an editable Microsoft Excel-style table rather than a detached form-style row editor.

## Delivery container

- PR: `#1076`
- Branch: `feature/cii-find-replace-excel-manual-grid-v14`
- Base: `main@274b47ef7a787a9f82cfe585371dc9b19d7983b1`
- Merge authority: Owner-only; not granted in the requirement message.

## Product delta

Changed:

- `tabs/cii-workspace/cii-workspace-find-replace.js`
- `tabs/cii-workspace/cii-workspace-find-replace-ui.js`
- `tabs/cii-workspace/cii-workspace-find-replace-session.js`
- `tabs/cii-workspace/cii-workspace-find-replace.css`
- `tests/cii-workspace-find-replace-session.test.js`
- `tests/cii-workspace-find-replace-ui-registration.test.js`
- `tests/cii-workspace-find-replace-manual-grid.test.js`

Behavior:

1. Manual entry is rendered as an editable spreadsheet grid with row numbers.
2. Three blank rows are available initially; rows can be added/deleted/cleared.
3. Tab navigation remains native; Enter moves to the same column on the next row.
4. Rectangular tab/newline clipboard ranges copied from Microsoft Excel/Google Sheets can be pasted into the grid.
5. Visible editable columns follow the active scope:
   - DOCUMENT: Find Text, Replace Text, Expected Matches
   - ELEMENT: From, To, Find Text, Replace Text, Expected Matches
   - BLOCK: From, To, Block, Find Text, Replace Text, Expected Matches
6. `Update Preview` replaces current manual preview rows deterministically instead of appending duplicates.
7. Existing CSV preview rows are preserved when the manual grid is refreshed.
8. Any unsynchronized spreadsheet edit creates a dirty-grid gate: review decisions, validation, Apply-to-new-copy, audit export and download are disabled until `Update Preview` is run.
9. If an already qualified/applied session is edited, the qualification/release is invalidated immediately.
10. Spreadsheet refresh preserves a non-v14 target blocker; manual editing cannot promote a legacy target into a ready state.
11. NODE NAME and DISPLACEMENT remain selectable; FORCE remains visible but qualification-pending/fail-closed.

## Unchanged authority

No changes to:

- CII v14 target qualification requirements;
- NODENAME or DISPLACEMENT physical ownership;
- FORCE/FORCMNT mutation authority;
- validator/executor claim semantics;
- Apply-to-new-copy/output custody;
- TARGET0 overwrite prohibition;
- Writer1/Writer2;
- parsers/converters;
- benchmarks/oracles;
- workflows.

## Source review findings

Source/diff review: **PASS** for bounded intent after two fail-closed corrections:

1. stale-preview prevention — unsynced edits now block all downstream review/release actions;
2. legacy target preservation — `replaceFindReplaceManualRows()` retains `TARGET_VERSION_BLOCKED` and `TARGET_V14_REQUIRED:*`.

Focused tests were added for:

- rectangular Excel clipboard parsing;
- mode-specific spreadsheet column order;
- block alias normalization;
- blank-row detection;
- deterministic MANUAL-row replacement with CSV preservation;
- non-v14 blocker preservation;
- dirty-grid UI gating;
- existing Apply-to-new-copy and FORCE-blocked boundaries.

## Validation truth

- source/diff review: **PASS / inspection**;
- focused tests: **AUTHORED, NOT_RUN**;
- exact-checkout execution: **NOT_RUN / current connector-only substrate**;
- GitHub CI/check status: no PASS claimed unless attached to final head;
- full repository suite: **NOT_RUN**;
- retained-real/native-v14/external CAESAR gates: unchanged from prior chain state.

## Coordination

Draft PR #1075 is evidence-only and touches only `agents/**`; it does not overlap the seven product/test paths above. The Owner's newer manual-grid requirement is the active product priority.
