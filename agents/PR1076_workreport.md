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
8. NODE NAME and DISPLACEMENT remain selectable; FORCE remains visible but qualification-pending/fail-closed.

## Unchanged authority

No changes to:

- CII v14 target qualification;
- NODENAME or DISPLACEMENT physical ownership;
- FORCE/FORCMNT mutation authority;
- validator/executor claim semantics;
- Apply-to-new-copy/output custody;
- TARGET0 overwrite prohibition;
- Writer1/Writer2;
- parsers/converters;
- benchmarks/oracles;
- workflows.

## Validation truth

- source/diff review: in progress at handover creation;
- new session/static/manual-grid tests: authored;
- exact-checkout execution: NOT_RUN in current connector-only substrate;
- full repository suite: NOT_RUN;
- retained-real/native-v14 gates: unchanged from prior chain state.

## Coordination

Draft PR #1075 is evidence-only and touches only `agents/**`; it does not overlap the seven product/test paths above. The Owner's newer manual-grid requirement is the active product priority.
