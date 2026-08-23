# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1027 | Writer 2 partial H>1 HANGER physical compaction + independent full-postimage validation | REVIEW READY with explicit evidence limitations | Component-only partial writer; canonical BOUND APPLY/EXCLUDE disjointness; raw I13 repacking; active-fields-only packed source shape; INTERLEAVED/GROUPED preservation; independent complete-postimage validator; real-source census H0=7/H1=2/H>1=0; 15 intended paths / 0 unexplained; no product/composite/UI adoption | Owner engineering review; merge only on fresh explicit owner authorization. Run F31/F32 + focused current-head tests on first native checkout; first real H>1 source must trigger dedicated qualification |
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
  record i binds IHGRNODE + HGRDAT/TAG/GUID + IHGRFREE
                   + IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN
  semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY

PR1027 component authority
  H>1 partial HANGER DELETE physical compaction only; H' > 0
  caller-supplied BOUND scope must prove APPLY ∩ EXCLUDE = ∅ in both PLAN and SCOPE testimony
  upstream applyCiiTransferScope remains unchanged and disjoint by construction
  one untouched TARGET0
  two top-level replacements: CONTROL.NOHGRS + complete MISCEL_1
  exact retained raw I13 field repacking across all five arrays
  packed source authority = SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
  no extra packed-row source bytes are silently normalized
  retained IHGRFREE copied by the same positional map
  INTERLEAVED/GROUPED HGRDAT/TAG/GUID order class preserved
  independent complete-postimage validator independently re-proves scope disjointness
  actual final bytes == independently expected final bytes
  Writer testimony is secondary evidence only
```

Stable blockers:

```text
HANGER CREATE -> WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
SIF CREATE    -> WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
product partial HANGER -> WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
```

## PR1027 scope-disjointness hardening

The upstream canonical scope builder uses one decision per mutable operation ID and is disjoint by construction. PR1027 nevertheless treats the supplied BOUND transferPlan as an untrusted component boundary.

Previous `sameStrings()` set-equivalence could hide a forged duplicate authority because it normalizes through a Set. PR1027 now requires:

```text
PLAN appliedOperationIds ∩ PLAN excludedOperationIds   = ∅
SCOPE appliedOperationIds ∩ SCOPE excludedOperationIds = ∅
```

Independent Writer/validator changes:

```text
Writer    575962cbe8bcc8e30a68758158d774aba2d5c26c
Validator df9eef839dc7511c6ff2d51bd46c5e9853679fe0
```

Falsifier:

```text
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
F31 PLAN_APPLY_EXCLUDE_OVERLAP
F32 SCOPE_APPLY_EXCLUDE_OVERLAP
```

Observation:

```text
Writer gate source audit        PASS_SOURCE_INSPECTION
Validator independent audit     PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F31/F32 test                    AUTHORED / NOT_RUN_ENVIRONMENT
```

## PR1027 real-source census

Frozen ledger:

```text
docs/cii-writer2-hanger-real-source-census.csv
```

Current qualified inventory:

```text
repository CII assets = 9
NOHGRS=0 assets       = 7
NOHGRS=1 assets       = 2
NOHGRS>1 assets       = 0
```

H=1 sources:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
converters/scripts/inputxml_profile_bm_cii_2019.cii
```

Both expose active-only one-value HANGER packed rows. No real repository H>1 CII exists, so:

```text
real H>1 source                      NOT_AVAILABLE
real H>1 partial-delete roundtrip    NOT_RUN_NO_REAL_SOURCE
```

`tests/cii-workspace-writer2-hanger-real-source-census.test.js` independently scans the census roots and fails with `REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION` when the first real H>1 file appears.

## PR1027 validation truth

Historical reconstructed evidence retained at its original observation class:

```text
mandatory packing matrix                       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED/GROUPED representative cases       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 +12 custody                            PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
frozen independent postimage SHA oracles       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27 / F29-F30                              PASS / FAIL_CLOSED as expected
pre-merge deleted-record testimony falsifier  PASS_FAIL_CLOSED_RECONSTRUCTED_AT_TIME
real BM_CII_SOURCE HANGER slice                PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

Current source/evidence state:

```text
F31 PLAN APPLY/EXCLUDE overlap                 PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F32 bound-SCOPE APPLY/EXCLUDE overlap          PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
synchronizer _pack_i active-only authority     PASS_SOURCE_INSPECTION
real BM_CII_SOURCE active-only H=1 rows        PASS_SOURCE_INSPECTION
converter profile active-only H=1 rows         PASS_SOURCE_INSPECTION
repository real-source census                  PASS_SOURCE_INSPECTION
real repository H>1 source                     NOT_AVAILABLE
real H>1 physical roundtrip                    NOT_RUN_NO_REAL_SOURCE
scope-disjointness falsifier                   NOT_RUN_ENVIRONMENT
packed-tail integrated test                    NOT_RUN_ENVIRONMENT
real-source census test                        NOT_RUN_ENVIRONMENT
all focused current-head tests                 NOT_RUN_ENVIRONMENT
full-file BM_CII_SOURCE exact roundtrip        NOT_RUN_ENVIRONMENT
broader Writer2/product regression             NOT_RUN_ENVIRONMENT
full repository npm test                       NOT_RUN_ENVIRONMENT
```

See `agents/PR1027_workreport.md`, `agents/status/PR1027.yaml`, `agents/claims/PR1027.yaml`, `docs/cii-writer2-hanger-partial-physical.md`, and the census CSV for exact custody and observation classes.
