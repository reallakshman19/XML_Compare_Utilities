# Writer2 CREATE source-authority refresh — 2026-08-25

## Status

```text
PR = #1055
BASE_MAIN = 297fb37a0e894a3aac91de9188ebf30e810781fb
MODE = SOURCE_ACQUISITION_REFRESH_ONLY
PRODUCTION_CREATE_AUTHORITY = FALSE
```

This refresh asks whether newly rechecked authoritative source material is sufficient to move any currently blocked Writer2 CREATE family to implementation authority.

Final refresh result:

```text
SIF CREATE       SOURCE_BLOCKED_REAFFIRMED
HANGER CREATE    SOURCE_BLOCKED_REAFFIRMED
RESTRAINT CREATE SOURCE_BLOCKED_REAFFIRMED
```

No production Writer2 CREATE route is enabled by this document.

---

# 1. SIF / TEE CREATE refresh

## Existing verdict

```text
NOT_READY_FOR_WRITER2_SIF_CREATE_IMPLEMENTATION
```

## Direct official source refresh

Official Hexagon CAESAR II Version 12 neutral-file documentation confirms the V11/V12-era `#$ SIF&TEES` shape:

```text
FORTRAN format       (2X, 6G13.6)
items per tee        30
tee slots            2
rows per tee         5
rows per auxiliary   10
array                 SIF(N4,60)
```

It explicitly identifies items 1..26, including node, Type, ii/io, geometry, SIF/index and code-dependent positions. Several positions are explicitly piping-code dependent.

Source:

```text
Hexagon CAESAR II Users Guide
Version 12
Auxiliary Element Data / #$ SIF&TEES
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1216040
```

The Version 12 source does not establish a complete V11/V12 CREATE/default/sentinel contract for positions 27..30, unused second-slot construction, or every omitted/default field.

Official Version 14 documentation demonstrates material edition drift:

```text
array                 SIF(N4,84)
items per tee         42
rows per tee          7
rows per auxiliary    14
B31J positions        introduced from item 27 onward
```

Source:

```text
Hexagon CAESAR II Users Guide
Version 14
Auxiliary Element Data / #$ SIF&TEES
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418
```

The later field meanings are drift evidence only. They cannot be backported to V11 by item number.

## SIF refresh verdict

```text
V11_V12_PHYSICAL_SCHEMA             PASS_DIRECT_SOURCE_REFRESH
V11_ITEMS_1_26_PARTIAL_SEMANTICS    PASS_DIRECT_SOURCE_REFRESH
V11_ITEMS_27_30_CREATE_AUTHORITY    UNRESOLVED
V11_COMPLETE_DEFAULT_CONTRACT       UNRESOLVED
V11_UNUSED_SECOND_SLOT_CREATE_RULE  UNRESOLVED
V14_B31J_BACKPORT_ALLOWED           FALSE
SIF_CREATE                          SOURCE_BLOCKED_REAFFIRMED
```

Existing blocker remains fail-closed:

```text
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

---

# 2. HANGER CREATE refresh

## Existing verdict

Merged W2.5 / PR #1037:

```text
NOT_READY_FOR_WRITER2_HANGER_CREATE_IMPLEMENTATION
```

## Direct official Version 12 neutral-file authority

Official Version 12 `Miscellaneous Data Group #1` documents the hanger record family.

Global hanger-default records include, among others:

```text
IDFTABLE      default hanger table
DEFVAR        default allowable load variation
DEFRIG        default rigid-support displacement criterion
DEFMXTRAVEL   default maximum travel
DEFSHTSPR     default allow-short-range-spring flag
DEFMUL        default multi-load-case design option
IDFOPER       default number of hanger design operating cases
IACTCLD       default cold-load calculation switch
IHGRLDS       number of hanger operating loads
IACTUAL       actual-cold-load case
IMULTIOPTS    multi-load-case design option
```

Per-hanger physical families are directly documented:

```text
IHGRNODE     (2X,6I13)
HGRDAT       11 values per hanger, (2X,6G13.6), two rows per hanger
TAG          (7X,I5,1X,A100)
GUID         (7X,I5,1X,A100)
IHGRFREE     4 values/hanger, (2X,6I13)
IHGRNUM      packed (2X,6I13)
IHGRTABLE    packed (2X,6I13)
IHGRSHORT    packed (2X,6I13)
IHGRCN       packed (2X,6I13)
```

HGRDAT positions are explicitly identified:

```text
1  hanger stiffness
2  allowable load variation
3  rigid support displacement criteria
4  available space
5  theoretical cold load #1
6  hot load #1 — initialize 0.0
7  user-defined operating load for variable springs — initialize 0.0
8  maximum allowed travel
9  multiple-load-case design option
10 hanger hardware weight
11 constant effort support load
```

Source:

```text
Hexagon CAESAR II Users Guide
Version 12
Miscellaneous Data Group #1 / Hangers
https://docs.hexagonppm.com/r/ru-RU/CAESAR-II-Users-Guide/Version-12/337059
```

Version 12 Hanger input documentation also states that individual hanger values can inherit global `Hanger Design Control Data`, and local hanger values override those global values.

Sources:

```text
Hexagon CAESAR II Users Guide Version 12
Hangers
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/335388

Design Data
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/346194

Hanger Design Control Data
https://docs.hexagonppm.com/r/ru-RU/CAESAR-II-Users-Guide/Version-12/336106
```

This is important CREATE evidence: a correct new-record payload cannot assume every per-hanger value is an isolated hard-coded constant because defaults/inheritance depend on global design control and whether the hanger is program-designed or predefined.

## GUID authority refresh

Official later-edition Hexagon documentation states:

```text
hanger GUID = software-assigned
hanger GUID = display-only in hanger list input
```

Source:

```text
Hexagon CAESAR II Users Guide
Version 14
GUID
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/824023
```

Historical Version 10 enhancement notes establish that hanger Tag/GUID fields were introduced to read/import hanger ID and display-only GUID data from PCF files.

Source:

```text
Hexagon CAESAR II Users Guide
CAESAR II 2018 / Version 10 changes and enhancements
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/957848
```

These sources establish ownership/display behavior, but they do **not** publish the V11/V12 neutral CREATE algorithm for generating a fresh GUID, nor prove the result of importing a newly created neutral record with a blank GUID.

## Remaining HANGER CREATE gaps

No authoritative source was found that closes:

```text
GUID_SOFTWARE_ASSIGNED_CREATE_RULE_UNRESOLVED
FIRST_HANGER_HEADER_DEFAULTS_UNRESOLVED
REPOSITORY_FALLBACK_DEFAULT_CONFLICT
NEW_HANGER_RECORD_INSERTION_POLICY_UNRESOLVED
OMITTED_PER_HANGER_DEFAULTS_NOT_COMPLETE
REAL_NATIVE_CREATE_TRANSITION_NOT_AVAILABLE
```

In particular, the refresh did not locate a genuine native H=0 -> H=1 or H=1 -> H=2 neutral transition proving complete preimage/postimage construction and positional insertion behavior.

## HANGER refresh verdict

```text
HANGER_GLOBAL_DEFAULT_FIELDS             PASS_DIRECT_SOURCE_REFRESH
HANGER_PHYSICAL_FIELD_DICTIONARY         PASS_DIRECT_SOURCE_REFRESH
HGRDAT_ITEMS_1_11                        PASS_DIRECT_SOURCE_REFRESH
HGRDAT_ITEM6_ITEM7_ZERO_INITIALIZATION   PASS_DIRECT_SOURCE_REFRESH
TAG_GUID_PHYSICAL_STRING_FORMAT          PASS_DIRECT_SOURCE_REFRESH
GUID_SOFTWARE_OWNERSHIP                  PASS_DIRECT_SOURCE_CORROBORATION
GUID_CREATE_GENERATION_RULE              UNRESOLVED
NEW_RECORD_INSERTION_POLICY              UNRESOLVED
COMPLETE_DEFAULT_INHERITANCE_TO_BYTES    UNRESOLVED
NATIVE_H0_H1_H2_TRANSITION               NOT_AVAILABLE
HANGER_CREATE                            SOURCE_BLOCKED_REAFFIRMED
```

Production HANGER CREATE remains disabled.

---

# 3. RESTRAINT CREATE refresh

## Existing qualification truth

Merged W2.9 qualification established a narrow DELETE/cardinality split and retained CREATE blockers.

Repository authority:

```text
docs/cii-writer2-restraint-cardinality-qualification.md
```

Existing unresolved CREATE gates include:

```text
RESTRAINT_GUID_SOFTWARE_ASSIGNED_CREATE_RULE_UNRESOLVED
RESTRAINT_TYPE_DEPENDENT_CREATE_DEFAULTS_INCOMPLETE
NEW_RESTRAINT_BLOCK_ALLOCATION_POLICY_NOT_VENDOR_QUALIFIED
NATIVE_RESTRAINT_BLOCK_CREATE_TRANSITION_NOT_AVAILABLE
SHARED_POINTER_ALIAS_SEMANTICS_NOT_SOURCE_QUALIFIED
```

## Direct official Version 12 neutral-file authority

Official Hexagon Version 12 auxiliary neutral documentation defines `#$ RESTRANT`.

For each restraint specification, the numeric payload is:

```text
FORTRAN (2X,6G13.6)
1 restraint node number
2 restraint type
3 stiffness
4 gap
5 friction coefficient
6 connecting node
7 X direction cosine
8 Y direction cosine
9 Z direction cosine
```

The payload is followed by:

```text
Support Tag
Support GUID
```

using:

```text
FORTRAN (7X,I5,1X,A100)
```

The documentation repeats the restraint specification for the available restraint DOFs and defines the restraint type domain as integer 1..62.

Source:

```text
Hexagon CAESAR II Users Guide
Version 12
Auxiliary Element Data / #$ RESTRANT
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1216040
```

The repository's exact V11 qualification and real-source evidence already establish the implementation-supported physical block shape:

```text
6 slots × 4 physical rows = 24 rows per restraint auxiliary block
ELEMENT restraint pointer = 1-based block index
CONTROL restraint count = auxiliary block count
```

## Default restraint stiffness

Official Version 12 documentation establishes the software defaults used when translational/rotational stiffness is unspecified:

```text
Default translational restraint stiffness
  1.0E+12 lb/in
  or unit-converted equivalent

Default rotational restraint stiffness
  1.0E+12 in-lb/deg
  or unit-converted equivalent
```

Sources:

```text
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/334803
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/334802
```

This strengthens one default family but does not define the complete per-Type CREATE payload, omitted gap/friction/cosine representation, Tag/GUID behavior, or new-block allocation policy.

## GUID/import evidence

Official Version 12 PCF restraint mapping documentation defines `<SUPPORT_GUID>` as an imported support property.

Source:

```text
Hexagon CAESAR II Users Guide
Version 12
PCF Restraint Mapping
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1428451
```

Historical Version 10 enhancement notes state that support/restraint GUID data is display-only identification read/imported from PCF files.

Source:

```text
Hexagon CAESAR II Users Guide
CAESAR II 2018 / Version 10 changes and enhancements
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/957848
```

The existing repository V11 qualification further records GUID as software-assigned/display-only and explicitly states that no external GUID generation algorithm or blank-GUID neutral CREATE behavior is proven.

## Remaining RESTRAINT CREATE gaps

The source refresh did not establish:

```text
fresh software-assigned GUID generation/import rule
complete Type-dependent CREATE defaults for all required fields
vendor-qualified new 24-row block allocation/insertion policy
first-block CREATE serialization contract
seventh-restraint/new-block transition contract
shared-pointer alias CREATE semantics
genuine native restraint-block CREATE before/after transition
```

The documented `Insert Restraints` UI operation is also not usable as block-allocation authority because that command divides an element into two elements and therefore crosses into Writer3 topology mutation.

Source:

```text
Hexagon CAESAR II Users Guide Version 12
Insert Restraints
https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/788486
```

## RESTRAINT refresh verdict

```text
V11_V12_RESTRAINT_FIELD_DICTIONARY      PASS_DIRECT_SOURCE_REFRESH
TYPE_DOMAIN_1_62                        PASS_DIRECT_SOURCE_REFRESH
TAG_GUID_PHYSICAL_FORMAT                PASS_DIRECT_SOURCE_REFRESH
TRANSLATIONAL_STIFFNESS_DEFAULT         PASS_DIRECT_SOURCE_REFRESH
ROTATIONAL_STIFFNESS_DEFAULT            PASS_DIRECT_SOURCE_REFRESH
GUID_CREATE_GENERATION_RULE             UNRESOLVED
TYPE_DEPENDENT_COMPLETE_CREATE_PAYLOAD  UNRESOLVED
NEW_BLOCK_ALLOCATION_POLICY             UNRESOLVED
SHARED_POINTER_CREATE_SEMANTICS         UNRESOLVED
NATIVE_BLOCK_CREATE_TRANSITION          NOT_AVAILABLE
RESTRAINT_CREATE                        SOURCE_BLOCKED_REAFFIRMED
```

Production blocker remains authoritative:

```text
WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
```

---

# 4. Gate F conclusion

```text
SIF_CREATE_SOURCE_REFRESH        COMPLETE_SOURCE_BLOCKED
HANGER_CREATE_SOURCE_REFRESH     COMPLETE_SOURCE_BLOCKED
RESTRAINT_CREATE_SOURCE_REFRESH  COMPLETE_SOURCE_BLOCKED
PRODUCTION_CREATE_CHANGE         NONE
```

The remaining Writer2 program blockers are now primarily runtime/release evidence for already-implemented authority, not an undefined CREATE implementation backlog.

Writer2 release/freeze may therefore treat these CREATE families as explicitly classified `SOURCE_BLOCKED` provided their production blockers remain fail-closed and regression-tested. A future source acquisition event may reopen one family independently; it does not prevent freezing the currently source-qualified Writer2 authority boundary.
