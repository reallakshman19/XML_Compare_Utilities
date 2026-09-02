# PR1081 Workreport — finish CII v14 Find & Replace app

## Delivery container

- PR: `#1081`
- Branch: `feature/cii-find-replace-finish-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Product material head: `43761321967387130988590bc61877a79b632c37`
- Merge authority: Owner-only; not granted in the current instruction.

## Owner direction

```text
skip FORCE
qualified
phase-wise coding
proceed next
```

Disposition:

- FORCE is explicitly de-scoped from app completion.
- closed PR #1080 remains an unmerged diagnostic/evidence branch only.
- no FORCE acquisition/qualification work is a release dependency.
- takeover qualification was accepted for the existing supported-app scope; write authority remains bounded to that scope.

## Finished application surface

The v14 Find & Replace app presents one coherent supported workflow:

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

## Phase 1 — CSV/manual synchronization

Takeover reconciliation classified the post-product handover commits as `METADATA_ONLY`. A bounded supported-scope audit then isolated one defect in `onCsvChange()`.

Before the patch, loading/reloading CSV rebuilt `session.rows` from CSV only. A clean, already-synchronized manual grid could remain visibly populated while its rows disappeared from Preview/Validate custody.

The correction:

```text
clean manual grid
→ snapshot synchronized manual inputs
→ rebuild CSV preview
→ restore synchronized manual rows
→ render combined CSV + manual preview
```

Dirty manual-grid values are not auto-admitted. The existing `Update Preview` fail-closed gate remains mandatory before review, validation, Apply, or Download.

Material receipt:

`agents/chains/CII-FIND-REPLACE-V14/material-legs/ML-CII-FR-0002.md`

## FORCE removal from unfinished UI

- selectable block options remain `NODE NAME` and `DISPLACEMENT` only;
- `FORCE — qualification pending` remains absent;
- visible copy remains `Supported block scopes: Node Name and Displacement.`;
- stale/pasted unsupported values remain disabled `— unsupported` options.

Backend fail-closed protection remains unchanged:

- stale FORCE/FORCMNT intake remains blocked;
- FORCE resolver mutable spans remain zero;
- no FORCE writer/mutation authority exists.

## Changed product/test files

Product material delta remains limited to:

- `tabs/cii-workspace/cii-workspace-find-replace-ui.js`
- `tabs/cii-workspace/cii-workspace-find-replace.js`
- `tests/cii-workspace-find-replace-ui-registration.test.js`
- `tests/cii-workspace-find-replace-finish.test.js`

Phase 1 changed only the UI controller and its existing registration/static test. No validator, executor, output custody, Node Name scope, Displacement scope, Writer1/Writer2, parser, converter, benchmark, workflow or direct-overwrite code changed.

## Exact-source execution

Initial app-completion evidence remains:

`agents/evidence/PR1081_find_replace_finish_exact_execution.md` — PASS 9/9.

Latest Phase 1 evidence:

`agents/evidence/PR1081_csv_manual_sync_exact_execution.md`

Exact Git blob closure:

```text
cii-workspace-find-replace.js                       7e2cff19726c904e8ad240302ea5d1acc4d1ee3f
cii-workspace-find-replace-ui.js                    c90723e2b64ff382e22efb8c440c485b0f1506fb
cii-workspace-tab.js                                d612a9e8914d2543a14a2e9912ee4a811fb1e75d
cii-workspace-find-replace-finish.test.js           2ecd535e87ff6c49761f092d5186838b76346dcc
cii-workspace-find-replace-ui-registration.test.js  89a1acd39ff8756f5acf75a93dd3c5f450bda79c
```

Executed:

```text
node --check tabs/cii-workspace/cii-workspace-find-replace-ui.js

node --test \
  tests/cii-workspace-find-replace-finish.test.js \
  tests/cii-workspace-find-replace-ui-registration.test.js
```

Result:

```text
10 PASS
0 FAIL
0 SKIP
```

Validated properties include supported block selection, absence of pending FORCE UI, disabled unsupported pasted values, editable Excel-style grid, dirty-grid fail-closed state, CSV/manual synchronized-row preservation, ordered Validate/Apply/Download flow, one registered tile, and no Writer/file-system mutation imports.

## Inherited functional evidence

Previously merged Find & Replace functional basis remains unchanged:

- Node Name fixed-field ownership and whole-field replacement;
- Displacement scoped block ownership;
- TARGET0-relative claims;
- independent preimage/postimage validation;
- Apply-to-new-copy custody;
- safe download artifact;
- direct overwrite disabled.

Validation truth remains:

```text
PR1081 latest exact-source UI/static       PASS 10/10
merged non-benchmark Find & Replace        PASS 33/33
merged focused Node Name                   PASS 4/4
SOURCE 3 retained-real authored runtime    NOT_RUN
full repository suite                      NOT_RUN
native-v14 archived fixture runtime        NOT_RUN
external CAESAR acceptance                 NOT_RUN
```

No `NOT_RUN` state is promoted to PASS.

## Completion state

```text
APP_SUPPORTED_SCOPE          COMPLETE
NODE_NAME                    COMPLETE
DISPLACEMENT                 COMPLETE
CSV_MANUAL_SYNC              COMPLETE_PHASE_1
EXCEL_STYLE_MANUAL_ENTRY     COMPLETE
PREVIEW_APPROVAL             COMPLETE
VALIDATE_TARGET1             COMPLETE
APPLY_TO_NEW_COPY            COMPLETE
DOWNLOAD_MODIFIED_CII        COMPLETE
AUDIT_EXPORT                 COMPLETE
FORCE                        DE_SCOPED_BY_OWNER
DIRECT_TARGET0_OVERWRITE     DISABLED
```

## Exact next action

Phase 2 performs a bounded read/test audit of target-change and scope-change custody around combined CSV + manual inputs. Patch only if a concrete supported-scope defect is reproduced. Preserve every `NOT_RUN` gate, do not resume FORCE/FORCMNT, and do not merge PR #1081 without explicit Owner merge authorization.