# EP-CII-FR-0027 — U4 remaining-v14-family schema research checkpoint

CHAIN_ID: CII-FIND-REPLACE-V14
ENDPOINT_ID: EP-CII-FR-0027
PREDECESSOR_ENDPOINT: EP-CII-FR-0026
LATEST_MATERIAL_LEG: ML-CII-FR-0005
LATEST_MATERIAL_LEG_FILE: agents/chains/CII-FIND-REPLACE-V14/material-legs/ML-CII-FR-0005.md
PR: 1081
BRANCH: feature/cii-find-replace-finish-v14
BASE_MAIN: bfe3abbb67060c1212001f2e9d967c229a057640
PRODUCT_MATERIAL_HEAD: 700e08a5be64a35bcc157554e809e97ba41bcace
STATE: U4_SCHEMA_RESEARCH_COMPLETE_SPEC_BACKED_PATCH_REQUIRED
ENGINEERING_STATE: READY_FOR_BOUNDED_U4_SCHEMA_PATCH
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
MERGEABILITY: MERGEABLE_CLEAN
NEXT_PHASE_AUTHORITY: READ_ONLY_PENDING_OWNER_PROGRESSION

## U4 outcome

Read-only U4 research pinned the remaining CAESAR II v14 auxiliary row-position schemas from the official Hexagon Version 14 `Auxiliary Element Data` specification.

Evidence:

`agents/evidence/PR1081_u4_remaining_v14_family_schema_research.md`

Exact schemas:

```text
EXPJT      [5]
DISPLMNT   [6,6,6,6,6,6,6,6,6,1] x 2
UNIFORM    [6,6,6,6,6,6]
WIND       [6]
OFFSETS    [6]
ALLOWBLS   [6 x 28]
FLANGES    [5,6,3,A40,6,6,6,6,6,6,6,6]
EQUIPMNT   [6,6,5,6,6,5]
```

DISPLMNT tightening is field-shape only. Existing pointer/cardinality/endpoint semantics remain unchanged.

## Current implementation gap

Current field-authority blob:

`1607a63ac29068eb74960eb755d047af21746840`

Its row-position table pins only BEND, RIGID, RESTRANT, SIF&TEES and REDUCERS. All remaining families currently fall back to generic canonical 1–6 numeric-field acceptance.

FLANGES is additionally broader than the official schema because a row whose body trims blank currently passes at any row position. The bounded U4 patch must make row 4 the explicit A40 text position and require the other eleven rows to satisfy their numeric schemas.

## Retained-real search

The admitted native benchmark `SYS-0001-v14.CII` has zero records for every U4 family, including DISPLMNT.

The upstream Ver 14 merge qualification independently classifies EXPJT, DISPLMNT, UNIFORM, WIND, OFFSETS, ALLOWBLS, FLANGES and EQUIPMNT as requiring dedicated Ver 14 fixtures.

Repository, PR and commit searches found no later admissible native-v14 fixture increment for those families.

A nonzero DISPLMNT repository specimen was located but its VERSION is explicitly 11; it remains historical evidence only and is not v14 retained-real qualification.

Therefore:

```text
U4_RETAINED_REAL_NEW_SPECIMENS = NONE_ADMISSIBLE_FOUND
```

This is not PASS and does not change external-CAESAR status.

## Validation truth

```text
U4 official v14 schema mapping                         PASS_READ_ONLY
U4 current-code gap identification                     PASS_READ_ONLY
U4 retained-real specimen search                       COMPLETE_NO_ADMISSIBLE_NEW_SPECIMEN
U4 remaining-family product patch                      NOT_RUN
U4 remaining-family focused runtime                    NOT_RUN
Compact-v14 promoted focused runtime                   PASS 20/20 / retained
Native-v14 represented Element/aux runtime             PASS / retained
Native-v14 represented ownership                       PASS 95/95 / retained
NODENAME retained-real regression                      PASS 55/55 / retained
Prior exact U1 focused runtime                         PASS 17/17 / retained
SOURCE 3 retained-real authored runtime                NOT_RUN
Full repository suite                                  NOT_RUN
External CAESAR acceptance                             NOT_RUN
Generic UI/CSV expansion                               NOT_RUN
```

## Protected invariants

```text
TARGET0 overwrite                 DISABLED
Direct Apply-to-source            DISABLED
Writer1/Writer2 invocation        NONE
NODENAME production logic         UNCHANGED
DISPLMNT endpoint semantics       PRESERVE
FORCE/FORCMNT                     DE_SCOPED
CONTROL / IEL mutation            NONE
record clone/repoint              NONE
UI/CSV generic block expansion    NOT AUTHORIZED THIS ENDPOINT
merge                             OWNER_ONLY / NOT AUTHORIZED
```

## Exact next action

On the next Owner progression, perform the bounded U4 schema-pinning material leg only: update `cii-workspace-find-replace-v14-field-authority.js` with the exact EXPJT/DISPLMNT/UNIFORM/WIND/OFFSETS/ALLOWBLS/FLANGES/EQUIPMNT row-position contracts; add focused positive and fail-closed tests including misplaced FLANGES blank-row and malformed compact-width falsifiers; preserve U1 ownership/cardinality/shared-owner gates, compact-v14 support, DISPLMNT endpoint semantics, NODENAME specialized logic and FORCE exclusion. Run exact-source focused tests. Do not fabricate retained-real coverage, do not expand UI/CSV, and do not merge PR1081 without explicit Owner authorization.
