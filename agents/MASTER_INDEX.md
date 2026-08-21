# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1018 | Writer 2 real-benchmark product qualification | DRAFT / ACTIVE | Qualification only: real `BM_CII_TARGET1.CII` physical preimage + controlled bound NODENAME CREATE and V11 SIF DELETE through public Writer2 apply; export/re-intake, stale-hash and anti-drift falsifiers | Execute exact-head regression when checkout environment is available; no new mutation family |
| PR1017 | Writer 2 composite product/core routing | MERGED 2026-08-21 · `112e2d78` | Explicit Writer2 requalification of NODENAME CREATE/DELETE + V11 SIF existing-block DELETE; composite readiness/apply/validation; Writer1B default preserved | Qualified by PR1018 |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Canonical PR1001 parent-scope custody; derived family subsets; original-coordinate claim arbitration; one patch; independent full-postimage validator | Reused by product route and PR1018 |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE Phase-4B | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + exact ELEMENT SIF pointers + byte-preserved SIF payload deletion; independent complete-postimage validator | Component authority |
| PR1014 | Writer 2 V11 SIF/TEE DELETE relocation authority | MERGED 2026-08-21 · `9a2984cb` | Exact owner binding, shared-pointer veto, 10-row compaction, complete old→new pointer mapping; CREATE blocked | Component authority |
| PR1013 | Writer 2 NODENAME initial product route | MERGED 2026-08-21 · `70c7004f` | Initial explicit NODENAME CREATE/DELETE product route | Product boundary superseded by PR1017; component authority retained |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT NODENAME pointers + variable-length NODENAME payload; independent exact-postimage validator | Component authority |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation, compaction, complete pointer relocation | Component authority |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified Writer1 family claims from one untouched TARGET with independent final authorization | Architectural precedent |
| PR1009 | Writer 1C V11 selected SIF fields | MERGED 2026-08-20 · `d63e8c59` | Existing V11 block; selected ii/io fields only | Existing field-level authority |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical ELEMENT/NODENAME binding | Physical custody foundation |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items 1..26 named; items 27..30 unresolved | Governs SIF CREATE blocker |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Writer1 fixed fields; Writer2 cardinality/pointers; Writer3 topology | Governing architecture |
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + candidate/APPLY/EXCLUDE operation-set custody | Governing transaction scope |
| PR992 | Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified extended fixed-field writer | PRODUCT DEFAULT |
| PR991 | Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-cardinality writer | Historical |

## Current writer authority stack

```text
Writer 1A
  fixed-cardinality qualified fields

Writer 1B
  qualified extended fixed fields
  PRODUCT DEFAULT

Writer 1C
  one-original-preimage Writer1 composition
  existing NODENAME overwrite
  selected existing V11 SIF ii/io fields

Writer 2
  NODENAME CREATE/DELETE component authority        MERGED
  V11 existing SIF 10-row block DELETE authority   MERGED
  one-original-preimage mixed composite             MERGED PR1016
  product/core composite route                      MERGED PR1017
  real physical-preimage qualification              PR1018

Writer 3
  topology mutation only
```

## PR1018 qualification boundary

The real physical fixture is:

```text
Benchmark/CIICompare/BM_CII_TARGET1.CII
repository blob  1a1cb9ac27e9c347cfcd3e4a8766ebad0e4b7853
size             64462 bytes
ELEMENTS         40
NODENAME rows    2
V11 SIF blocks   9
```

PR1018 does **not** claim that `BM_CII_SOURCE.CII -> BM_CII_TARGET1.CII` naturally contains the same mixed cardinality mutation. The benchmark's published SIF oracle is a pointer-bound raw-field change. The qualification therefore uses a controlled, canonical explicit scope against the real TARGET preimage.

Transaction under qualification:

```text
real untouched BM_CII_TARGET1 bytes
 -> exact intake + physical custody
 -> deterministic real zero-pointer NODENAME endpoint
 -> deterministic real existing SIF pointer
 -> all SIF owners selected if pointer is shared
 -> canonical PR1001 bound APPLY scope
 -> applyCiiWorkspaceTargetWriter2
 -> merged PR1016 one-preimage composite
 -> binary export
 -> re-intake
 -> exact independent composite validator
```

Positive requirements:

```text
NODENAME rows  2 -> 3
SIF blocks     9 -> 8
selected SIF owners -> pointer 0
element connectivity unchanged
product bytes == low-level composite bytes
post-image exact-byte custody remains qualified
```

Falsifiers:

```text
old preview replay against modified export -> CII_WRITER_2_STALE_TARGET_HASH
one unrelated reparsable header byte       -> EXACT_COMPOSITE_POSTIMAGE_MISMATCH
```

Still prohibited:

```text
NODENAME overwrite                       -> Writer1C
SIF CREATE                               -> WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
PROCESS                                  -> unsupported Writer2
restraint cardinality                    -> unsupported Writer2
hanger cardinality                       -> unsupported Writer2
topology/connectivity mutation           -> Writer3
```

## Current validation truth

```text
PR1017 merge / PR1018 base grounding                  PASS
benchmark file metadata/custody inspection            PASS_SOURCE_INSPECTION
BM_CII_TARGET1 CONTROL 40 / NONAM 2 / SIF 9           PASS_SOURCE_INSPECTION
SOURCE3 / TARGET3-1 CONTROL SIF count 14 / 14          PASS_SOURCE_INSPECTION
qualification test source audit                        PASS_SOURCE_INSPECTION
exact checkout                                         BLOCKED_ENVIRONMENT_GITHUB_DNS
real-benchmark Writer2 regression                      AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 regressions                          NOT_RUN_ENVIRONMENT
full repository tests                                  NOT_RUN_ENVIRONMENT
browser scoped Writer2 flow                            NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1018_workreport.md`, `agents/status/PR1018.yaml`, and `agents/claims/PR1018.yaml`.
