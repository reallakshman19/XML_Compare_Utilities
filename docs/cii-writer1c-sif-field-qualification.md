# CII Writer 1C Phase 2A — SIF/TEE Field Qualification

## Corrected verdict

```text
VERSION12_REFERENCE_VERDICT: READY_FOR_V12_SELECTED_SIF_FIELDS
CANONICAL_V11_WRITER_VERDICT: BLOCKED_V11_POSITION_AUTHORITY_UNRESOLVED
CURRENT_WRITER_ELIGIBLE_SIF_POSITIONS: 0
```

This PR remains qualification-only. It does not enable SIF/TEE mutation.

## Why the previous READY verdict was too broad

The canonical benchmark `Benchmark/CIICompare/BM_CII_TARGET1.CII` begins with:

```text
#$ VERSION
    5.00000      11.0000        1256
```

The current canonical target therefore advertises neutral version `11.0000`.

The official Hexagon source currently in custody is **Version 12** neutral-file documentation. It directly proves, for Version 12:

```text
FORTRAN format           = (2X, 6G13.6)
tees per auxiliary       = 2
items per tee             = 30
rows per tee              = 5
rows per auxiliary        = 10
item 3                    = In-Plane SIF (ii)
item 4                    = Out-Plane SIF (io)
```

That source does **not** by itself prove that Version 11 uses identical neutral item positions.

The CAESAR II 2019 / Version 11.0 User's Guide corroborates the engineering meaning of `ii` and `io`, the code-dependent nature of Type, and the rule that a user-defined SIF cannot be less than 1.0. It is not a neutral-file item-position specification.

Therefore the chain:

```text
V12 item3/item4 position authority
+ V11 product ii/io semantics
```

is insufficient to establish:

```text
V11 neutral item3/item4 position authority
```

## Edition-drift falsifier

Cross-edition inference is specifically unsafe because the retrieved neutral documentation demonstrates actual schema drift:

```text
Version 12:
  30 items per tee
  5 rows per tee
  10 rows per auxiliary
  item15 = Torsion SIF
  item16 = Axial SIF

Versions 14/15:
  42 items per tee
  7 rows per tee
  14 rows per auxiliary
  item15 = Axial SIF
  item16 = Torsion SIF
```

This does not prove Version 11 differs from Version 12. It proves that **edition equivalence must be demonstrated, not assumed**.

## Version-12 reference map

For Version 12 only, the following reference positions are directly qualified:

```text
slot1 item3 -> row0 field2 [28,41) -> In-Plane SIF (ii)
slot1 item4 -> row0 field3 [41,54) -> Out-Plane SIF (io)
slot2 item3 -> row5 field2 [28,41) -> In-Plane SIF (ii)
slot2 item4 -> row5 field3 [41,54) -> Out-Plane SIF (io)
```

These are **reference candidates**, not current Writer authority.

`docs/cii-writer1c-sif-field-map.csv` now records all 60 positions with:

```text
v12_position_authority
canonical_v11_position_authority
writable
writer_domain
```

For the canonical V11 target, every row is `writable=NO` while the edition bridge remains unresolved.

## Current product state

The existing product blockers remain correct:

```text
SIF_TEE_FIELD_SEMANTICS_UNQUALIFIED
SIF_TEE_CARDINALITY_OR_SEMANTIC_REWRITE_REQUIRES_FUTURE_QUALIFICATION
```

No SIF Writer code, policy token, pointer allocation, cardinality mutation, raw-payload COPY, converter change or workflow change is authorized by PR1006.

The canonical Writer1C SIF gate is now explicitly:

```text
WRITER_1C_SIF_V11_NEUTRAL_POSITION_AUTHORITY_UNRESOLVED
```

## Evidence required to unblock Phase 2B

At least one authoritative bridge is required before production SIF mutation may be implemented:

1. official CAESAR II Version 11 neutral-file `#$ SIF&TEES` specification directly mapping item 3 and item 4; or
2. authoritative Hexagon statement that Version 11 and Version 12 use identical `SIF&TEES` item 3/item 4 positions.

Benchmark correlation, zero values at the candidate positions, parser field arithmetic, or the Version-11 UI/product semantics are **not** sufficient substitutes.

After that edition gate is resolved, Phase 2B would still separately need:

- exact byte-span custody;
- existing nonzero pointer and unchanged block/cardinality;
- finite explicit TARGET `>=1.0` to proposed `>=1.0` for the initial slice;
- unchanged Type and authoritative piping-code context;
- positive nonzero transaction fixture;
- shared-pointer arbitration;
- independently derived `S_auth`;
- unauthorized-byte/pointer/cardinality/edition falsifiers;
- semantic reparse showing only the intended ii/io delta.

Writer 2 continues to own CREATE/DELETE/reindex, pointer allocation and CONTROL/cardinality changes.

## Validation truth

```text
canonical TARGET1 version-header inspection       PASS (11.0000)
official Hexagon Version12 neutral map             PASS_VERSION12_ONLY
Version11 product ii/io semantic cross-check       PASS_SEMANTICS_ONLY
official Version11 neutral item-position authority NOT_FOUND_NOT_PROVEN
edition-drift falsifier                            PASS
exact local three-file census                      NOT_RUN
production SIF Writer                              NOT_IMPLEMENTED
```

## Engineering rule

```text
Same-looking field number across editions is evidence only.
Mutation authority requires edition-qualified physical position + engineering meaning + byte custody.
```
