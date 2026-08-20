# CII Writer 1C Phase 2A — SIF/TEE Field Qualification

## Verdict

```text
READY_FOR_SELECTED_SIF_FIELDS
```

This remains a **qualification-only** PR. It does not enable SIF/TEE mutation in production.

The first pass correctly found that repository sources alone were insufficient. A second source pass located edition-specific Hexagon neutral-file authority for the 10-row record. That source resolves the physical/semantic structure without inferring meanings from benchmark values.

The only selected fields qualified as candidates for a future Writer 1C Phase-2B PR are:

```text
tee slot 1 / item 3 / row0 field2 -> In-Plane SIF (ii)
tee slot 1 / item 4 / row0 field3 -> Out-Plane SIF (io)
tee slot 2 / item 3 / row5 field2 -> In-Plane SIF (ii)
tee slot 2 / item 4 / row5 field3 -> Out-Plane SIF (io)
```

All other fields remain non-writable in the initial Phase-2B slice.

## 1. Authority hierarchy

This qualification uses four evidence classes:

- `DIRECT_REPOSITORY`: repository source directly establishes physical layout/custody.
- `DIRECT_VENDOR`: Hexagon documentation directly defines neutral-file item position or engineering meaning.
- `CORROBORATING_VENDOR_GUIDE`: CAESAR II 2019 (Version 11.0) User's Guide defines product/UI semantics and value-domain behavior but is not the neutral-file position authority.
- `OBSERVED_ONLY`: benchmark data confirms occurrence only; it never assigns meaning.

For the CSV, `authority_class=DIRECT` means the engineering meaning is directly source-backed by the authority chain above. `OBSERVED_ONLY` is never promoted to Writer authority.

## 2. Repository physical authority

Current `main@692be3fd536b7c62576c443f5f831984e4de66a2` directly establishes:

```text
SIF&TEES auxiliary block rows       = 10
ELEMENT SIF/TEE pointer              = 1-based 10-row block index
fixed numeric widths                 = 15,13,13,13,13,13
CONTROL SIF/TEE count                = source-qualified cardinality custody
current transfer blocker             = SIF_TEE_FIELD_SEMANTICS_UNQUALIFIED
```

Per-row fixed spans are:

```text
field 0 [ 0,15) width 15
field 1 [15,28) width 13
field 2 [28,41) width 13
field 3 [41,54) width 13
field 4 [54,67) width 13
field 5 [67,80) width 13
```

The protected InputXML converter still models only `SifAux(node)` and zero-fills the remaining payload. That converter is intentionally unchanged; it is not used to invent the missing semantics.

## 3. Hexagon Version-12 neutral-file authority

Authoritative source:

```text
CAESAR II User's Guide / Version 12
Auxiliary Element Data / #$ SIF&TEES
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1216040
```

The Version-12 neutral-file specification states:

```text
FORTRAN format              (2X, 6G13.6)
items per tee               30
tees per auxiliary          2
lines per tee               5
lines per auxiliary         10
SIF array                   (N4,60)
```

Therefore the row structure is not conjectural:

```text
rows 0..4 = tee slot 1, items 1..30
rows 5..9 = tee slot 2, items 1..30
```

This resolves the earlier benchmark finding at row 5. `row5/f0` is the second tee's Node (item 1), and `row5/f1` is the second tee's Type (item 2).

### 3.1 Version-12 item map

The retrieved Version-12 source directly names items 1..26:

```text
 1 Node
 2 Type
 3 In-Plane SIF (ii)
 4 Out-Plane SIF (io)
 5 Weld d
 6 Fillet
 7 Pad Thk
 8 Ftg Ro
 9 Crotch R
10 Weld ID
11 B1
12 B2
13 In-Plane Index (Ii)
14 Out-Plane Index (Io)
15 Torsion SIF (it)
16 Axial SIF (ia)
17 Pressure SIF (ip)
18 Pressure Index (Ip)
19..22 code-specific / IGE/TD/12 positions
23 code-related Note option
24 code-related Note option
25 Axial Index (Ia)
26 Torsion Index (It)
27..30 unresolved in the retrieved Version-12 item list
```

Items 27..30 remain `UNRESOLVED`. Later B31J-era meanings are not backported into the Version-12 contract.

## 4. Edition-drift falsifier

Hexagon Versions 14/15 use a materially different neutral shape:

```text
items per tee       42
lines per tee        7
lines per auxiliary 14
SIF array            (N4,84)
```

They also place:

```text
item 15 = Axial SIF
item 16 = Torsion SIF
```

whereas Version 12 places:

```text
item 15 = Torsion SIF
item 16 = Axial SIF
```

This is a direct demonstration that field meaning cannot be inferred from a modern edition merely because a field number looks familiar. Any Phase-2B writer must fail closed unless the TARGET has the qualified 10-row / 30-item-per-tee shape.

Version 14/15 documentation is retained as **edition-drift evidence**, not as authority for unresolved Version-12 items 27..30.

## 5. Product semantics from CAESAR II 2019 / Version 11.0

The CAESAR II 2019 User's Guide identifies itself as Version 11.0 and defines the engineering behavior of the selected SIF fields:

```text
In-Plane SIF (ii)  = in-plane stress intensification factor
Out-Plane SIF (io) = out-of-plane stress intensification factor
```

It states that when ii/io are not specified, CAESAR II performs code-related calculations, and that a user-defined SIF cannot be less than 1.0.

It also confirms that `Type` is engineering-significant and code-dependent. For common non-FRP entries, the guide includes examples such as:

```text
3  welding tee
5  weldolet
11 threaded joint
```

but ISO 14692 uses a different Type vocabulary. Therefore `Type` is directly meaningful but **not selected for mutation** in the first Phase-2B slice.

The 2019 User's Guide mirror used for this semantic cross-check is:

```text
https://studylib.net/doc/27105489/caesar-ii-2019---users-guide
```

It is treated as corroboration of vendor-product semantics; the official Hexagon Version-12 neutral specification remains the neutral item-position authority.

## 6. Selected Phase-2B candidates

Only items 3 and 4 in each tee slot are promoted to `writable=YES` in the qualification map.

`writable=YES` means **qualified for a future implementation PR**, not enabled in the current product.

### 6.1 Initial mutation domain

The first Writer1C SIF implementation should be deliberately narrower than all theoretically valid CAESAR inputs:

```text
existing TARGET SIF/TEE pointer > 0
TARGET uses qualified 10-row / 30-item-per-tee shape
same pointer and block index at preview/apply
same section row count and CONTROL values
same tee Type and piping-code context
field is item 3 (ii) or item 4 (io)
TARGET preimage is finite and >= 1.0
proposed value is finite and >= 1.0
zero -> nonzero transition is NOT in the first slice
blank transition is NOT in the first slice
9999.99 transition is NOT in the first slice
no Node/Type/geometry/index/note mutation
no raw-payload COPY
```

This explicit-to-explicit domain avoids relying on unresolved neutral-file zero/sentinel semantics for the first implementation.

Phase-2B may later qualify zero-to-explicit behavior separately if exact edition-specific zero semantics are proven.

## 7. Non-selected fields

The following remain non-writable even though many now have direct semantic names:

- Node: identity/ownership.
- Type: code-dependent enum; changing it changes fitting semantics.
- Weld d / Fillet / Pad Thk / Ftg Ro / Crotch R: dimensional and component/code-dependent.
- Weld ID / B1 / B2: context/code-dependent.
- stress indices and axial/torsion/pressure SIFs: not selected for the first slice; item 15/16 also exhibit edition ordering drift.
- items 19..22: explicitly code-specific.
- Note items 23/24: Version-12 position is known, but exact Version-12 state/sentinel semantics are not promoted from later editions.
- items 27..30: unresolved for the qualified Version-12 30-item shape.

## 8. Canonical benchmark census

Canonical files inspected:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
Benchmark/CIICompare/BM_CII_TARGET1.CII
Benchmark/CIICompare/BM_CII_TARGET2.CII
```

Each has:

```text
CONTROL SIF/TEE blocks = 9
actual 10-row blocks   = 9
```

Aggregate:

```text
files  = 3
blocks = 27
rows   = 270
```

### 8.1 Type observations

Tee-slot-1 Type values:

```text
3  => 7
5  => 8
11 => 12
```

Tee-slot-2 Type value `11` occurs in 6 of 27 blocks.

These frequencies are still observational. Their engineering meaning comes from the external product documentation, not from frequency correlation.

### 8.2 Note-position observations

The recurring `9999.99` values map physically to items 23 and 24 in both tee slots:

```text
slot1 item23 -> row3/f4
slot1 item24 -> row3/f5
slot2 item23 -> row8/f4
slot2 item24 -> row8/f5
```

All 27 canonical blocks contain those observed values at those positions. Version 14/15 explicitly use `9999.99` as a not-specified state for these note options, but this PR does not backport that state rule to Version 12 for mutation authority.

### 8.3 Selected ii/io benchmark coverage

The canonical files cover the exact physical ii/io positions, but those positions are zero in this corpus. Therefore Phase-2A has physical benchmark coverage but **not a positive explicit-SIF transaction benchmark**.

A future Phase-2B implementation must add a dedicated nonzero ii/io fixture before enabling mutation.

## 9. 60-position result

`docs/cii-writer1c-sif-field-map.csv` contains exactly 60 rows:

```text
DIRECT positions                      52  (items 1..26 repeated for two tee slots)
UNRESOLVED positions                   8  (items 27..30 repeated for two tee slots)
selected Phase-2B writable candidates  4  (ii/io in two tee slots)
currently product-enabled positions    0
```

No unresolved position is writable.

## 10. Product impact

Do not relax the current transfer policy in this PR.

The existing blockers remain product truth until Phase-2B implements narrow field-specific authority:

```text
SIF_TEE_FIELD_SEMANTICS_UNQUALIFIED
SIF_TEE_CARDINALITY_OR_SEMANTIC_REWRITE_REQUIRES_FUTURE_QUALIFICATION
```

Do not add a generic token such as:

```text
CII_WRITER_1C_SIF_RAW_PAYLOAD
```

Future field-specific tokens should be narrow, for example:

```text
CII_WRITER_1C_SIF_IN_PLANE_EXISTING_BLOCK
CII_WRITER_1C_SIF_OUT_PLANE_EXISTING_BLOCK
```

and must retain independent `S_auth`/byte-negative-assurance rules from Phase 1.

## 11. Remaining gates before Phase-2B production authority

Phase-2A now supplies semantic qualification for selected fields, but Phase-2B must still prove:

1. exact physical byte spans for item3/item4 in both tee slots;
2. target hash + field preimage custody;
3. same pointer/block/cardinality at apply;
4. explicit positive-value fixture (`>=1.0 -> >=1.0`);
5. shared-pointer arbitration;
6. independent validator-derived `S_auth`;
7. unauthorized-byte/pointer/cardinality falsifiers;
8. reparse with expected semantic delta only;
9. no code-context or Type drift;
10. no edition-shape drift.

Writer 2 still owns block CREATE/DELETE, pointer allocation/reindex, section/cardinality changes and CONTROL changes.

## 12. Validation truth

```text
repository physical/source custody        PASS
Hexagon Version-12 neutral semantic map   PASS
2019 product ii/io semantic cross-check   PASS
edition-drift comparison                  PASS
canonical remote benchmark inspection     PASS
synthetic census/self-test                 PASS
exact 3-file local census execution        NOT_RUN
production SIF Writer mutation             NOT_IMPLEMENTED
```

`NOT_RUN` is retained exactly; remote/source inspection is not relabeled as local execution.
