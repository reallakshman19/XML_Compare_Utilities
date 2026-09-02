# PR1081 Workreport — CII v14 Find & Replace

## Delivery container

- PR: `#1081`
- Branch: `feature/cii-find-replace-finish-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Product material head: `09c7c1aab70fab5d918065d11b557050205b97f0`
- Latest material leg: `ML-CII-FR-0004`
- Active successor endpoint: `EP-CII-FR-0023`
- Merge authority: Owner-only; `MERGE_AUTHORIZED=FALSE`.

## Current Owner direction

```text
skip FORCE
universal block-wise Find & Replace
universal element-wise Find & Replace
do not change Node Name logic if no errors
skip qualification, proceed next
proceed next
```

Disposition:

- FORCE/FORCMNT remains de-scoped and is not a release dependency.
- Node Name remains on its existing specialized fixed-field resolver/validator path.
- Displacement semantics and endpoint identity checks are preserved.
- U1 qualification was explicitly skipped by the Owner and recorded as `NOT_REQUIRED`, not fabricated PASS.
- The latest `proceed next` consumed EP-0021's exact next action and authorized bounded U2 field-aware mutation work only.
- Merge remains Owner-only and unauthorized.

## Existing supported application surface

The currently advertised user-facing mutable workflow remains:

```text
Target CII v14
-> Document / Element / Block scope
-> Block: Node Name or Displacement
-> CSV or editable manual grid
-> Preview + approve/reject
-> Validate TARGET1
-> Apply to New Copy
-> Download Modified CII / Audit JSON
```

Backend U1/U2 now supports ownership + field-aware validation for generic auxiliary records, but UI/CSV generic block expansion is deliberately deferred pending retained-real evidence.

Protected custody remains:

```text
TARGET0 never overwritten
Direct Apply-to-source disabled
Writer1/Writer2 not invoked
Download requires released qualified TARGET1
manual-grid dirty state invalidates stale qualification/release
```

## Phase 1 — CSV/manual synchronization

Phase 1 corrected `onCsvChange()` so already-synchronized clean manual rows remain in Preview/Validate custody when CSV is loaded or reloaded. Dirty manual rows are never auto-admitted and still require `Update Preview`.

Material receipt: `agents/chains/CII-FIND-REPLACE-V14/material-legs/ML-CII-FR-0002.md`.

Exact-source UI/static validation: **PASS 10/10**.

## U1 — universal v14 auxiliary ownership/cardinality foundation

U1 completed at product material head `4f9e79fc899fd5e89c33267480208e25f8d627da`.

`tabs/cii-workspace/cii-workspace-find-replace-v14-aux-authority.js` provides one immutable v14 registry for all 15 IEL auxiliary pointers, CONTROL count coordinates and v14 rows-per-record.

Ownership proof is:

```text
exact From/To ELEMENTS block
+ requested IEL pointer
+ matching CONTROL count
+ exact physical auxiliary section
+ v14 count * rows-per-record cardinality
+ reverse pointer owner set
=> exact uniquely owned auxiliary record
```

Version-specific v14 cardinalities include `ALLOWBLS=28`, `SIF&TEES=14`, `REDUCERS=2`; legacy 26/10/1 values are rejected. Blank physical payload rows are preserved, embedded comment ambiguity fails closed, and shared pointers fail closed. U1 never clones/repoints records or mutates CONTROL/IEL fields.

Displacement consumes the shared U1 resolver before its existing endpoint validation. Node Name production logic was not changed. FORCE remains blocked.

Material receipt: `ML-CII-FR-0003`.

Exact-source U1 focused validation: **PASS 17/17**.

## U2 — field-aware universal Element / auxiliary claims

U2 completed at product material head `09c7c1aab70fab5d918065d11b557050205b97f0`.

### U2 material paths

```text
NEW     tabs/cii-workspace/cii-workspace-find-replace-v14-field-authority.js
NEW     tabs/cii-workspace/cii-workspace-find-replace-v14-field-claims.js
MODIFY  tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js
MODIFY  tabs/cii-workspace/cii-workspace-find-replace-validator.js
MODIFY  tests/cii-workspace-find-replace-scope-resolver.test.js
NEW     tests/cii-workspace-find-replace-v14-field-authority.test.js
```

### Element field authority

U2 validator mutation spans permit:

```text
physical rows 1-9 numeric fields except row1 FROM/TO
Element Name declared text payload
Line Number declared text payload
Line Color/Visibility numeric fields
```

and protect:

```text
FROM selector
TO selector
all 15 IEL pointer fields
text length/control columns
line-ending bytes
```

Rows 13-15 are parsed/validated as non-negative integral IEL pointer rows but expose no mutable spans.

### Auxiliary field authority

Generic auxiliary mutation validation first requires the complete U1 ownership proof. Only the exact uniquely owned record proceeds to field parsing.

U2 field schemas currently admit:

- canonical fixed numeric fields;
- length-prefixed text payloads such as RESTRANT Tag/GUID;
- FLANGES A40 class text;
- meaningful FLANGES blank physical rows as preserved non-mutable content.

Numeric matches are field-contained. The validator rebuilds the complete numeric field in memory and requires it to remain finite/parseable after replacement. A literal crossing adjacent numeric fields cannot form a claim.

All field-scoped CII mutation text must be ASCII and equal byte width. Line-ending search/replace remains blocked.

### Compatibility boundary

Default/raw calls to `resolveFindReplaceScope()` preserve U1 behavior. Generic auxiliary raw resolution still reports read-only ownership and `BLOCK_MUTATION_NOT_QUALIFIED:*`. Only the validator explicitly opts into `fieldAwareMutation` for claim generation.

This keeps unrelated resolver consumers from silently acquiring generic mutation authority.

Node Name continues through the existing specialized resolver/whole-field claim plan. FORCE/FORCMNT remains blocked. Executor/output custody is unchanged.

### U2 exact-source execution

Evidence: `agents/evidence/PR1081_universal_field_u2_exact_execution.md`.

Remote exact blob closure:

```text
field-authority.js                   6626346a5d2b98603bd7235ceb24bc5bb0f028cb
field-claims.js                      b76cb034dfd6e6c4859c65d87b050d94abe8f896
scope-resolver.js                    e5294be666d235c85c69fe97a181db9fbc893fbe
validator.js                         ce4c31b01ce522d8d0c39fd0cfafa698328b337a
scope-resolver.test.js               748381089868f80f0be78ce9fefa4ba4af40648f
v14-field-authority.test.js          4c5e163628335568cb030db9d33b4e4d5c25b143
```

Executed:

```text
node --check tabs/cii-workspace/cii-workspace-find-replace-v14-field-authority.js
node --check tabs/cii-workspace/cii-workspace-find-replace-v14-field-claims.js
node --check tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js
node --check tabs/cii-workspace/cii-workspace-find-replace-validator.js

node --test \
  tests/cii-workspace-find-replace-validator.test.js \
  tests/cii-workspace-find-replace-scope-resolver.test.js \
  tests/cii-workspace-find-replace-v14-field-authority.test.js
```

Observed:

```text
19 PASS
0 FAIL
0 SKIP
```

The suite covers protected Element identity/pointers, Element numeric/text claims, invalid numeric postimages, cross-field falsification, U1 shared ownership, RESTRANT text, FLANGES A40/blank rows, all numeric generic v14 auxiliary families, FORCE exclusion and existing resolver/validator regressions.

## Validation truth

```text
U2 exact-source focused field runtime                 PASS 19/19
U1 exact-source focused resolver runtime              PASS 17/17
PR1081 prior exact-source UI/static closure            PASS 10/10
Merged non-benchmark Find & Replace                    PASS 33/33
Merged focused Node Name                               PASS 4/4
SOURCE 3 retained-real authored runtime                NOT_RUN
Full repository suite                                  NOT_RUN
Native-v14 archived fixture runtime                    NOT_RUN
External CAESAR acceptance                             NOT_RUN
```

No `NOT_RUN` state is promoted to PASS.

## Local recovery ledger

Ignored U2 local ledger:

`.agent-worklogs/20260903_0315_u2-field-claims/`

The ledger explicitly records one recovery caveat: its first three mandatory backups were created from behavior-equivalent local reconstruction preimages rather than byte-exact branch files. They are not treated as exact restore evidence. The exact pre-U2 Git blob SHAs are recorded in the module logs as authoritative recovery references.

## Current completion state

```text
APP_EXISTING_SUPPORTED_SURFACE     COMPLETE
CSV_MANUAL_SYNC                   COMPLETE
U1_V14_AUX_REGISTRY               COMPLETE
U1_CONTROL_CORRELATION            COMPLETE
U1_SHARED_POINTER_GATE            COMPLETE
U2_ELEMENT_FIELD_AUTHORITY        COMPLETE_SYNTHETIC_FOCUSED
U2_GENERIC_AUX_FIELD_AUTHORITY    COMPLETE_SYNTHETIC_FOCUSED
U2_NUMERIC_POSTIMAGE_GATE         COMPLETE
U2_CROSS_FIELD_GATE               COMPLETE
NODE_NAME_LOGIC                   PRESERVED
FORCE/FORCMNT                     DE_SCOPED_BY_OWNER
UI_CSV_GENERIC_AUX_EXPANSION      NOT_STARTED
RETAINED_REAL_U3                  NOT_RUN
DIRECT_TARGET0_OVERWRITE          DISABLED
```

## Exact next action

On the next Owner progression, execute bounded U3 retained-real/native-v14 evidence from `EP-CII-FR-0023`. Reconstruct the archived native-v14 fixture and exercise U1+U2 ownership/field claims for available nonzero BEND, RIGID, RESTRANT, SIF&TEES and REDUCERS records, with Node Name regression only. Do not invent missing retained-real specimens, do not resume FORCE/FORCMNT, do not expand UI/CSV before that evidence leg, preserve all unexecuted gates, and do not merge PR #1081 without explicit Owner authorization.
