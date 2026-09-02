# PR1081 Workreport — CII v14 Find & Replace

## Delivery container

- PR: `#1081`
- Branch: `feature/cii-find-replace-finish-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Product material head: `4f9e79fc899fd5e89c33267480208e25f8d627da`
- Latest material leg: `ML-CII-FR-0003`
- Active successor endpoint: `EP-CII-FR-0021`
- Merge authority: Owner-only; `MERGE_AUTHORIZED=FALSE`.

## Current Owner direction

```text
skip FORCE
universal block-wise Find & Replace
universal element-wise Find & Replace
do not change Node Name logic if no errors
skip qualification, proceed next
```

Disposition:

- FORCE/FORCMNT remains de-scoped and is not a release dependency.
- Node Name remains on its existing specialized fixed-field resolver/validator path.
- Displacement semantics and endpoint identity checks are preserved.
- The Owner explicitly skipped the U1 qualification gate. The durable chain records `QUALIFICATION_STATE: NOT_REQUIRED` for U1 rather than fabricating an independent PASS.
- Merge remains Owner-only and unauthorized.

## Existing supported application surface

The user-facing mutable workflow remains:

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

Owner-authorized U1 is complete at product material head `4f9e79fc899fd5e89c33267480208e25f8d627da`.

### New read-authority layer

`tabs/cii-workspace/cii-workspace-find-replace-v14-aux-authority.js` now provides one immutable v14 registry for all 15 IEL auxiliary pointers, their CONTROL count coordinates and v14 rows-per-record.

The resolver proves ownership through:

```text
exact From/To ELEMENTS block
+ requested IEL pointer
+ matching CONTROL count
+ exact physical auxiliary section
+ v14 count * rows-per-record cardinality
+ reverse pointer owner set
=> exact uniquely owned auxiliary record
```

Version-specific v14 cardinalities include:

```text
ALLOWBLS  28
SIF&TEES  14
REDUCERS    2
```

Legacy 26/10/1 values are rejected for v14.

Physical blank payload rows are preserved. Embedded `*` comment ambiguity fails closed. Shared positive pointers fail closed with `AUX_POINTER_SHARED`; U1 does not clone/repoint records or mutate CONTROL/IEL fields.

### Displacement

Displacement now consumes the shared pointer/CONTROL/cardinality/owner resolver before its existing endpoint identity validation. The public authority string and zero-pointer blocker compatibility are preserved.

### Node Name

No Node Name production file was changed. `NODENAME` still dispatches directly to `resolveNodeNameScope()` and its existing whole-field ownership/validation path.

### Generic blocks remain mutation-blocked

U1 intentionally does **not** expose writable spans for BEND/RIGID/EXPJT/RESTRANT/UNIFORM/WIND/OFFSETS/ALLOWBLS/SIF&TEES/REDUCERS/FLANGES/EQUIPMNT. After ownership succeeds, the public scope resolver returns read-only evidence with:

```text
BLOCK_MUTATION_NOT_QUALIFIED:<BLOCK>
```

This prevents U1 ownership infrastructure from being mistaken for completed universal mutation support.

### FORCE

FORCE/FORCMNT remains explicitly blocked. No FORCE resolver, mutable span or UI option was added.

## U1 changed product/test files

```text
NEW     tabs/cii-workspace/cii-workspace-find-replace-v14-aux-authority.js
MODIFY  tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js
MODIFY  tests/cii-workspace-find-replace-scope-resolver.test.js
NEW     tests/cii-workspace-find-replace-v14-aux-authority.test.js
```

Unchanged U1 domains include:

```text
tabs/cii-workspace/cii-workspace-find-replace-nodename-scope.js
tabs/cii-workspace/cii-workspace-find-replace-validator.js
tabs/cii-workspace/cii-workspace-find-replace-executor.js
tabs/cii-workspace/cii-workspace-find-replace-output.js
CSV/UI intake
Writer1 / Writer2
parser/converter sources
benchmarks/oracles
workflows
```

## U1 exact-source execution

Evidence: `agents/evidence/PR1081_universal_auxiliary_u1_exact_execution.md`.

Remote product blob closure:

```text
cii-workspace-find-replace-v14-aux-authority.js       079b55252af7594ea04f959620f2d8d00e348b6f
cii-workspace-find-replace-scope-resolver.js          0d153f4fa513373c426b05443a50c6a7657a0a06
cii-workspace-find-replace-scope-resolver.test.js     3b6c4356879fe08fb6427cdee43f805702adf4c2
cii-workspace-find-replace-v14-aux-authority.test.js  e8ef51c37997abb606cb2c1c465378e13365d141
```

Executed:

```text
node --check tabs/cii-workspace/cii-workspace-find-replace-v14-aux-authority.js
node --check tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js
node --check tests/cii-workspace-find-replace-scope-resolver.test.js
node --check tests/cii-workspace-find-replace-v14-aux-authority.test.js

node --test \
  tests/cii-workspace-find-replace-scope-resolver.test.js \
  tests/cii-workspace-find-replace-v14-aux-authority.test.js
```

Observed:

```text
17 PASS
0 FAIL
0 SKIP
```

## Validation truth

```text
U1 exact-source focused resolver runtime             PASS 17/17
PR1081 prior exact-source UI/static closure           PASS 10/10
Merged non-benchmark Find & Replace                   PASS 33/33
Merged focused Node Name                              PASS 4/4
SOURCE 3 retained-real authored runtime               NOT_RUN
Full repository suite                                 NOT_RUN
Native-v14 archived fixture runtime                   NOT_RUN
External CAESAR acceptance                            NOT_RUN
```

No `NOT_RUN` state is promoted to PASS.

## Local recovery ledger

Ignored local ledger:

`.agent-worklogs/20260902_2228_universal-aux-u1/`

It contains module-wise no-index patches, repository backups/checksums, exact validation output and checksum-gated undo instructions.

## Current completion state

```text
APP_EXISTING_SUPPORTED_SURFACE  COMPLETE
CSV_MANUAL_SYNC                COMPLETE
U1_V14_AUX_REGISTRY            COMPLETE
U1_CONTROL_CORRELATION         COMPLETE
U1_SHARED_POINTER_GATE         COMPLETE
U1_PHYSICAL_ROW_PRESERVATION   COMPLETE
U1_DISPLACEMENT_INTEGRATION    COMPLETE
NODE_NAME_LOGIC                PRESERVED
GENERIC_AUX_MUTATION           NOT_IMPLEMENTED_U2
UNIVERSAL_ELEMENT_MUTATION     NOT_IMPLEMENTED_U2
FORCE/FORCMNT                  DE_SCOPED_BY_OWNER
DIRECT_TARGET0_OVERWRITE       DISABLED
```

## Exact next action

U2 is the field-aware claim-engine phase for universal Element and auxiliary Block mutation. Start it only on the next Owner progression from `EP-CII-FR-0021`. Protect Element From/To and all 15 IEL pointers, constrain replacement to valid field boundaries, preserve numeric parse validity and line-ending bytes, keep Node Name specialized, keep FORCE/FORCMNT excluded, preserve every `NOT_RUN` gate, and do not merge PR #1081 without explicit Owner merge authorization.
