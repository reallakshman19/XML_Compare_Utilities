# PR1081 Workreport — finish CII v14 Find & Replace app

## Delivery container

- PR: `#1081`
- Branch: `feature/cii-find-replace-finish-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Product material head: `48a73acf849ed8f7e30144022156cc803b3075ff`
- Merge authority: Owner-only; not granted in the current instruction.

## Owner direction

```text
skip FORCE, finish the app, proceed next
```

Disposition:

- FORCE is explicitly de-scoped from app completion.
- closed PR #1080 remains an unmerged diagnostic/evidence branch only.
- no FORCE acquisition/qualification work is a release dependency.

## Finished application surface

The v14 Find & Replace app now presents one coherent supported workflow:

```text
1. Target CII v14
2. Scope and CSV
3. Editable Excel-style manual table
4. Preview and approval
5. Validate -> Apply to New Copy -> Download
```

Supported scopes:

```text
DOCUMENT
ELEMENT
BLOCK / NODE NAME
BLOCK / DISPLACEMENT
```

Manual entry supports direct cell editing, add/delete/clear rows, rectangular Excel paste, keyboard movement and deterministic `Update Preview` synchronization.

Finalization preserves:

```text
TARGET0 never overwritten
qualified in-memory TARGET1
explicit Apply to New Copy release
Download only after release receipt
Audit JSON export
```

## FORCE removal from unfinished UI

Changed only the user-facing supported block surface:

- selectable block options are now `NODE NAME` and `DISPLACEMENT` only;
- removed `FORCE — qualification pending` from the UI;
- added visible copy: `Supported block scopes: Node Name and Displacement.`;
- stale/pasted unsupported values are rendered as disabled `— unsupported` options.

Backend fail-closed protection remains unchanged:

- stale FORCE/FORCMNT intake remains blocked;
- FORCE resolver mutable spans remain zero;
- no FORCE writer/mutation authority exists.

## Changed product/test files

Product material delta:

- `tabs/cii-workspace/cii-workspace-find-replace-ui.js`
- `tabs/cii-workspace/cii-workspace-find-replace.js`
- `tests/cii-workspace-find-replace-ui-registration.test.js`
- `tests/cii-workspace-find-replace-finish.test.js`

No validator, executor, output custody, Node Name scope, Displacement scope, Writer1/Writer2, parser, converter, benchmark, workflow or direct-overwrite code changed.

## Exact-source execution

Evidence:

`agents/evidence/PR1081_find_replace_finish_exact_execution.md`

All five executed source/test files reproduced their authoritative Git blob SHAs before Node execution.

Command:

```text
node --test \
  tests/cii-workspace-find-replace-finish.test.js \
  tests/cii-workspace-find-replace-ui-registration.test.js
```

Result:

```text
9 PASS
0 FAIL
0 SKIP
```

Validated release properties include supported block selection, absence of pending FORCE UI, disabled unsupported pasted values, Excel-style grid presence, dirty-grid fail-closed state, ordered Validate/Apply/Download flow, one registered tile, and no Writer/file-system mutation imports.

## Inherited functional evidence

Previously merged Find & Replace functional basis remains unchanged:

- Node Name fixed-field ownership and whole-field replacement;
- Displacement scoped block ownership;
- TARGET0-relative claims;
- independent preimage/postimage validation;
- Apply-to-new-copy custody;
- safe download artifact;
- direct overwrite disabled.

The prior non-benchmark Find & Replace synthetic execution evidence remains inherited; this PR does not reclassify retained-real/full-repository/native-v14/external-CAESAR gates.

## Completion state

```text
APP_SUPPORTED_SCOPE          COMPLETE
NODE_NAME                    COMPLETE
DISPLACEMENT                 COMPLETE
EXCEL_STYLE_MANUAL_ENTRY     COMPLETE
PREVIEW_APPROVAL             COMPLETE
VALIDATE_TARGET1             COMPLETE
APPLY_TO_NEW_COPY            COMPLETE
DOWNLOAD_MODIFIED_CII        COMPLETE
AUDIT_EXPORT                 COMPLETE
FORCE                         DE_SCOPED_BY_OWNER
DIRECT_TARGET0_OVERWRITE      DISABLED
```

## Exact next action

Review PR #1081 as the app-completion delivery container. Merge only on explicit Owner authorization. After merge, perform post-merge smoke/status reconciliation; no FORCE work should be resumed unless the Owner explicitly re-adds it to scope.
