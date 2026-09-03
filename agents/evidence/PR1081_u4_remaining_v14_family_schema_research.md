# PR1081 U4 — remaining CAESAR II v14 family schema research

Date: 2026-09-03
PR: #1081
Branch: `feature/cii-find-replace-finish-v14`
Product material head entering U4: `700e08a5be64a35bcc157554e809e97ba41bcace`

## Scope

Read-only U4 research for the remaining element-owned v14 auxiliary families before UI/CSV generalization.

Included:

- EXPJT
- DISPLMNT schema confirmation only; existing endpoint semantics remain unchanged
- UNIFORM
- WIND
- OFFSETS
- ALLOWBLS
- FLANGES
- EQUIPMNT

Excluded:

- FORCE/FORCMNT — Owner de-scoped
- NODENAME behavior changes — existing specialized path preserved
- UI/CSV changes
- CONTROL / IEL mutation
- record clone/repoint behavior
- TARGET0 overwrite
- Writer1/Writer2
- merge authorization

## Authoritative v14 source basis

Hexagon CAESAR II Users Guide, Version 14, `Auxiliary Element Data`:

`https://hexagonppm.fluidtopics.net/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418`

The guide defines the physical FORTRAN records and item cardinalities used below. Numeric rows use `(2X,6G13.6)` and can therefore physically terminate after the last declared value. The compact-v14 correction already recognizes the canonical cumulative widths `15, 28, 41, 54, 67, 80` bytes while allowing only zero/blank trailing compatibility padding.

## Exact row-position schemas

### EXPJT

The guide defines five values on one numeric line.

```text
rows/record = 1
field counts = [5]
compact width = 67
```

A sixth full-width field is compatibility padding only and must be zero/blank if present; it is not mutable.

### DISPLMNT

The guide defines 55 values over ten lines for one displacement specification, repeated twice for the two possible displacement definitions.

Sequential `(2X,6G13.6)` packing gives:

```text
one specification = [6,6,6,6,6,6,6,6,6,1]
record             = [6,6,6,6,6,6,6,6,6,1,
                      6,6,6,6,6,6,6,6,6,1]
rows/record        = 20
```

This is a field-shape tightening only. Existing DISPLMNT endpoint-identity semantics remain authoritative and must not be changed.

### UNIFORM

The guide defines 36 values on six lines.

```text
rows/record = 6
field counts = [6,6,6,6,6,6]
```

### WIND

The guide defines six values on one line.

```text
rows/record = 1
field counts = [6]
```

### OFFSETS

The guide defines six values on one line.

```text
rows/record = 1
field counts = [6]
```

### ALLOWBLS

The v14 guide defines 168 values on 28 lines.

```text
rows/record = 28
field counts = [6 x 28]
```

This is the v14-specific 28-row authority already used by U1 cardinality; legacy 26-row authority is not valid here.

### FLANGES

The guide defines 72 data items on 12 physical lines:

```text
row  1  numeric items 1-5      => 5 fields
row  2  numeric items 6-11     => 6 fields
row  3  numeric items 12-14    => 3 fields
row  4  class name             => (2X,A40)
rows 5-12 numeric items 25-72  => 6 fields each
```

Exact schema:

```text
[5,6,3,A40,6,6,6,6,6,6,6,6]
```

All 12 physical lines are required. A blank/space-only A40 class payload is possible at row 4, but an arbitrary physically blank row at another FLANGES position is not schema-authorized.

Repository corroboration: `converters/scripts/cii2019_flanges_sync.py` documents the same 5/6/3/A40/6x8 layout. This is corroboration only; the Hexagon v14 guide is the authority for U4.

### EQUIPMNT

The guide defines two sets of 17 numeric values on six lines total.

Sequential `(2X,6G13.6)` packing gives three rows per set:

```text
set 1 = [6,6,5]
set 2 = [6,6,5]
rows/record = 6
field counts = [6,6,5,6,6,5]
```

Items 13-17 in each set are spares represented by zero but remain declared numeric fields.

## Current U2/U3 implementation gap

Current exact blob:

`tabs/cii-workspace/cii-workspace-find-replace-v14-field-authority.js`
`1607a63ac29068eb74960eb755d047af21746840`

`AUX_NUMERIC_FIELD_COUNTS` currently pins only:

```text
BEND
RIGID
RESTRANT
SIF&TEES
REDUCERS
```

For an unlisted family, `expectedFieldCount` is null and `numericRowSpans()` accepts any canonical one-through-six-field numeric width. That is broader than the v14 row-position authority above.

FLANGES also currently returns PASS for any row whose body trims blank before row-position schema is considered. U4 must tighten this so only the row-4 A40 position can be blank/space-only under the FLANGES schema; other required rows must remain valid numeric rows.

DISPLMNT is likewise not row-position pinned in the common field-authority table even though its existing specialized scope resolver performs pointer/cardinality/endpoint checks.

## Retained-real v14 specimen search

### Exact admitted native benchmark

Pinned source:

```text
reallaksh19/3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
Benchmarks/v11-v14.zip
SYS-0001-v14.CII
SHA-256 d2d4316309d9b1aa34b55ad72f89193fd0e437930db203fecd9ede00e69b2faf
```

Its exact native-v14 row counts are:

```text
EXPJT       0
DISPLMNT    0
UNIFORM     0
WIND        0
OFFSETS     0
ALLOWBLS    0
FLANGES     0
EQUIPMNT    0
```

Therefore it cannot provide retained-real row payload qualification for the U4 families.

The upstream v14 merge qualification record independently lists all of those nonzero constructs as blocked until dedicated v14 fixtures exist.

### Repository / PR / commit search

Searches across `reallaksh19/3D_Converters` and `reallaksh19/XML_Compare_Utilities` found no later dedicated native-v14 fixture increment for EXPJT, DISPLMNT, UNIFORM, WIND, OFFSETS, ALLOWBLS, FLANGES or EQUIPMNT.

A repository CII with nonzero DISPLMNT was found at:

`3D_Converters/Benchmarks/INPUT XML to CII 2019/1001/1001-P - COPY[BenchMark].CII`

but its VERSION row is explicitly `5 / 11`, not v14. It is useful historical format evidence only and MUST NOT be promoted to retained-real v14 qualification.

External web searches for public v14 `.CII` files containing the remaining sections also returned no usable specimens.

## U4 evidence matrix

| Family | Spec-backed row schema | Current row-position pin | retained-real v14 payload |
|---|---|---|---|
| EXPJT | `[5]` | NO | NOT_FOUND |
| DISPLMNT | `[6x9,1] x2` | NO | NOT_FOUND |
| UNIFORM | `[6,6,6,6,6,6]` | NO | NOT_FOUND |
| WIND | `[6]` | NO | NOT_FOUND |
| OFFSETS | `[6]` | NO | NOT_FOUND |
| ALLOWBLS | `[6 x 28]` | NO | NOT_FOUND |
| FLANGES | `[5,6,3,A40,6x8]` | NO | NOT_FOUND |
| EQUIPMNT | `[6,6,5,6,6,5]` | NO | NOT_FOUND |

`NOT_FOUND` is not PASS and is not equivalent to external CAESAR acceptance.

## Required bounded implementation increment

The next material patch should modify only the v14 field-authority table/parser and focused tests:

1. add exact row-position schemas above;
2. pin DISPLMNT field counts without changing its pointer/cardinality/endpoint semantics;
3. make FLANGES row 4 explicitly A40 and reject blank/non-numeric rows at other positions;
4. preserve compact-width support and zero/blank trailing compatibility padding;
5. preserve field-bound claims and numeric postimage validation;
6. add positive schema tests for every U4 family;
7. add malformed-width / wrong-row-count / FLANGES misplaced-blank falsifiers;
8. keep NODENAME production code untouched;
9. keep FORCE/FORCMNT blocked.

After that focused/spec-backed execution passes, absence of retained-real specimens remains explicitly recorded rather than fabricated. UI/CSV generalization can then be evaluated as the next separate phase under the Owner progression model.

## Validation truth for this U4 research leg

```text
U4 official v14 schema mapping                         PASS_READ_ONLY
U4 current-code gap identification                     PASS_READ_ONLY
U4 retained-real specimen search                       COMPLETE_NO_ADMISSIBLE_NEW_SPECIMEN
U4 remaining-family product patch                      NOT_RUN
U4 remaining-family focused runtime                    NOT_RUN
SOURCE 3 retained-real authored runtime                NOT_RUN
Full repository suite                                  NOT_RUN
External CAESAR acceptance                             NOT_RUN
Generic UI/CSV expansion                               NOT_RUN
```

No product/test source was changed in this research leg.
