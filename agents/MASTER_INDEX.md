# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1027 | Writer 2 partial H>1 HANGER physical compaction + independent full-postimage validation | REVIEW READY with explicit evidence limitations | Component-only partial writer; TARGET0 SHA-256 recomputed from original bytes; canonical BOUND operation-container custody; raw I13 repacking; active-fields-only packed source shape; INTERLEAVED/GROUPED preservation; independent complete-postimage validator; real-source census H0=7/H1=2/H>1=0; 17 intended paths / 0 unexplained; no product/composite/UI adoption | Owner engineering review; merge only on fresh explicit owner authorization. Run SHA/F40-F45 then all focused current-head tests on first native checkout; first real H>1 source must trigger dedicated qualification |
| PR1025 | Writer 2 partial H>1 HANGER DELETE planner integration | MERGED 2026-08-22 · `ae1de402` | Planner positional record binding across IHGRNODE, HGRDAT/TAG/GUID, IHGRFREE and all five packed arrays; semantic authority positional-only | Authority consumed read-only by PR1027 |
| PR1024 | Writer 2 H>1 HANGER tail-order qualification | MERGED 2026-08-22 · `1f3f7b8e` | Physical classifier for INTERLEAVED vs GROUPED HGRDAT/TAG/GUID envelopes | Consumed by PR1025/PR1027 |
| PR1023 | Writer 2 tri-family real-benchmark product qualification | MERGED 2026-08-22 · `d9b680d6` | Real `BM_CII_SOURCE.CII`; NODENAME CREATE + V11 SIF DELETE + HANGER DELETE-ALL | Evidence baseline retained |
| PR1022 | Writer 2 tri-family product/core adoption | MERGED 2026-08-21 · `dcb9c433` | NODENAME CREATE/DELETE + V11 SIF DELETE + HANGER DELETE-ALL | Partial HANGER deliberately product-blocked |
| PR1021 | Writer 2 tri-family one-preimage composite | MERGED 2026-08-21 · `257e1d3d` | One TARGET0 + independent postimage validation | Architectural foundation |
| PR1020 | Writer 2 HANGER delete-all physical rewrite | MERGED 2026-08-21 · `a16a3f2e` | `CONTROL.NOHGRS -> 0` + complete MISCEL_1 HANGER payload removal | Delete-all authority unchanged |
| PR1019 | Writer 2 HANGER DELETE planner foundation | MERGED 2026-08-21 · `66342367` | IHGRNODE-first HANGER delete planner; CREATE blocked | Foundation |
| PR1018 | Writer 2 real-benchmark product qualification | MERGED 2026-08-21 · `887eedc0` | Real CII preimage for NODENAME + V11 SIF DELETE | Evidence retained |
| PR1017 | Writer 2 composite product/core routing | MERGED 2026-08-21 · `112e2d78` | NODENAME CREATE/DELETE + V11 SIF DELETE | Superseded by PR1022 |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Original-coordinate arbitration + independent validator | Architectural foundation |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE | MERGED 2026-08-21 · `d5ecd8ac` | Existing 10-row SIF block delete | Component authority |
| PR1014 | Writer 2 V11 SIF/TEE DELETE planner | MERGED 2026-08-21 · `9a2984cb` | Owner binding/shared-pointer veto; CREATE blocked | Component authority |
| PR1013 | Writer 2 NODENAME initial product route | MERGED 2026-08-21 · `70c7004f` | Initial NODENAME product path | Superseded |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + pointers + NODENAME payload | Component authority |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation | Component authority |
| PR1010 | Writer 1A + 1B + 1C one-preimage composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified Writer1 claims from one TARGET | Architectural precedent |
| PR1009 | Writer 1C V11 selected SIF fields | MERGED 2026-08-20 · `d63e8c59` | Existing V11 selected fields | Existing-field authority |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical binding | Physical custody foundation |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items 1..26 named; 27..30 unresolved | SIF CREATE remains blocked |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Writer1 fixed fields; Writer2 cardinality/pointers; Writer3 topology | Governing architecture |
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Hash + operation-set custody | Governing transaction scope |
| PR992 | Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Extended fixed-field writer | PRODUCT DEFAULT |
| PR991 | Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-cardinality writer | Historical |

## Current Writer 2 HANGER authority stack

```text
Merged product authority
  HANGER H=1 / H>1 DELETE-ALL
  partial HANGER product/composite remains blocked

Merged PR1025 planner authority
  H>1 partial plan only with qualified positional record binding
  semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY

PR1027 component authority
  H>1 partial HANGER DELETE physical compaction only; H' > 0

  TARGET0 preimage custody
    declared target hash must be lowercase SHA-256
    physical/document byte lengths must bind untouched originalByteString
    SHA256(original TARGET0 bytes) is recomputed before planner execution
    recomputed digest must equal target document, transfer-plan and BOUND-scope target hashes
    authority = SHA256_ORIGINAL_TARGET0_BYTES
    independent validator separately rehashes TARGET0
    Writer target0HashCustody is secondary testimony

  BOUND transaction custody
    operations[] required
      mutable rows -> APPLY only
      KEEP rows    -> KEEP only
    excludedOperations[] required
      mutable rows -> EXCLUDE only
      KEEP forbidden
    PLAN APPLY ∩ EXCLUDE = empty
    SCOPE APPLY ∩ EXCLUDE = empty
    operation IDs globally unique across both containers

  physical compaction
    one untouched TARGET0
    two top-level replacements: CONTROL.NOHGRS + complete MISCEL_1
    exact retained raw I13 field repacking across all five arrays
    packed source authority = SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
    retained IHGRFREE copied by the same positional map
    INTERLEAVED/GROUPED HGRDAT/TAG/GUID order class preserved
    actual final bytes == independently expected final bytes
```

Stable blockers:

```text
HANGER CREATE -> WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
SIF CREATE    -> WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
product partial HANGER -> WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

## PR1027 TARGET0 cryptographic custody

Production intake already computes `contentSha256` from the exact original physical bytes. PR1027 previously compared declared target hashes but did not recompute that digest at its callable component boundary.

Current hardening:

```text
SHA primitive       3470e9871469fae1a2a13cbc916c6c328bd8168c
Writer gate         39e6770a70f284c0f36400425f19789e430fb9fa
Validator gate      4d34f7699f46fd1025c3cba52ae16335dff87448
SHA/F40-F44 test    3c820eb73639c76be22c1cde824c911732728ea8
F45 testimony       3652e38832f626755e1f99c308f94fe42b558682
```

Falsifiers:

```text
F40 CONSISTENTLY_FORGED_DECLARED_TARGET_HASHES
F41 STALE_TARGET0_PHYSICAL_BYTES_WITH_OLD_DIGEST
F42 NON_SHA_PLACEHOLDER_TARGET_HASH
F43 PHYSICAL_BYTE_LENGTH_TESTIMONY_MISMATCH
F44 DOCUMENT_BYTE_LENGTH_TESTIMONY_MISMATCH
F45 FORGED_WRITER_TARGET0_HASH_TESTIMONY
```

SOURCE physical bytes are not present at this component API, so independent SOURCE-byte rehash is not claimed. Existing SOURCE hash equality remains inherited BOUND-scope testimony.

Observation:

```text
production intake SHA basis          PASS_SOURCE_INSPECTION
SHA utility source                   PASS_SOURCE_INSPECTION
Writer gate                          PASS_SOURCE_INSPECTION
Validator independent gate           PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F40-F45 source                       AUTHORED / PASS_SOURCE_INSPECTION
F40-F45 exact runtime                NOT_RUN_ENVIRONMENT
```

## PR1027 canonical scope-container hardening

```text
Writer container custody    4a9f2f7daf6b7c50f776a4b8ad569df76ada1106
Validator independent proof c6fb4d2c1b8d415581eb14d876f4d84f7a70708b
Test suite extension         4def181b64e70b348bd3540d505765090ece02c2
```

Integrated F31-F39 rejects APPLY/EXCLUDE overlap, wrong-container mutable rows, wrong decisions, excluded KEEP, KEEP/mutable ID alias, missing excluded container, blank IDs and malformed KEEP decisions.

## PR1027 real-source census

```text
repository CII assets = 9
NOHGRS=0 assets       = 7
NOHGRS=1 assets       = 2
NOHGRS>1 assets       = 0

real H>1 source                   NOT_AVAILABLE
real H>1 partial-delete roundtrip NOT_RUN_NO_REAL_SOURCE
```

First real H>1 discovery must trigger explicit qualification; synthetic evidence is not represented as real source authority.

## PR1027 validation truth

Historical reconstructed evidence remains at its original observation class and is not relabelled as current-head native execution.

```text
F40-F45 TARGET0 hash suite                 AUTHORED / PASS_SOURCE_INSPECTION / NOT_RUN_ENVIRONMENT
F31-F39 canonical scope/container suite    AUTHORED / PASS_SOURCE_INSPECTION / NOT_RUN_ENVIRONMENT
synchronizer active-only authority         PASS_SOURCE_INSPECTION
repository real-source census              PASS_SOURCE_INSPECTION
real repository H>1 source                 NOT_AVAILABLE
real H>1 physical roundtrip                NOT_RUN_NO_REAL_SOURCE
packed-tail integrated test                NOT_RUN_ENVIRONMENT
real-source census test                    NOT_RUN_ENVIRONMENT
all focused current-head tests             NOT_RUN_ENVIRONMENT
full-file BM_CII_SOURCE exact roundtrip    NOT_RUN_ENVIRONMENT
broader Writer2/product regression         NOT_RUN_ENVIRONMENT
full repository npm test                   NOT_RUN_ENVIRONMENT
```

See `agents/PR1027_workreport.md`, `agents/status/PR1027.yaml`, `agents/claims/PR1027.yaml`, `docs/cii-writer2-hanger-partial-physical.md`, and the real-source census CSV for exact custody and observation classes.
