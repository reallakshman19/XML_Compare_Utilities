# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | DRAFT / ACTIVE | Project qualified family scopes from one untouched TARGET; original-coordinate claim arbitration; single patch; independent full-postimage validator; SIF CREATE hard-blocked | Execute exact repository/real-CII mixed qualification; after acceptance route product/core Writer2 through this composite |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE Phase-4B | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + exact ELEMENT SIF pointers + byte-preserved variable-length SIF payload deletion; independent complete-postimage validator | Reused unchanged by PR1016 composite |
| PR1014 | Writer 2 V11 SIF/TEE DELETE relocation authority | MERGED 2026-08-21 · `9a2984cb` | DELETE-only planning: exact owner binding, shared-pointer veto, 10-row compaction, old→new pointer map, CONTROL after-count; CREATE hard-blocked | Reused unchanged by PR1015/PR1016 |
| PR1013 | Writer 2 NODENAME product/core routing | MERGED 2026-08-21 · `70c7004f` | Explicit `writerVersion=2`; NODENAME CREATE/DELETE-only routing; scope-bound readiness; binary export | Must be replaced by composite routing after PR1016 acceptance; never sequence SIF after NODENAME |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT NODENAME pointers + variable-length NODENAME payload; independent exact-postimage validator | Reused unchanged by PR1016 |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation, row compaction, complete pointer map, CONTROL after-count | Reused unchanged by PR1016 |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified Writer1 family claims from one untouched TARGET with independent final authorization | Architectural precedent |
| PR1009 | Writer 1C V11 SIF selected-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 block; ii/io item3/item4 only; explicit >=1; code/Type gates | Existing-block field authority preserved |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical block + FROM/TO mutation custody | Physical binding foundation |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items1..26 named; items27..30 unresolved | Source authority for SIF CREATE blocker |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Writer1 fixed fields; Writer2 cardinality/pointers; Writer3 topology; Writer testimony not authority | Governing architecture |
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + operation-set custody | Governing transaction scope |
| PR992 | Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified fixed fields / restraint slice | Production default remains Writer 1B |
| PR991 | Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-cardinality writer slice | Historical |

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
  NODENAME CREATE/DELETE: qualified planner + physical writer + current product route
  V11 SIF existing-block DELETE: qualified planner + physical writer
  NODENAME + SIF DELETE one-preimage composite: PR1016

Writer 3
  topology mutation only
```

## PR1016 governing transaction

Sequential cardinality mutation is prohibited:

```text
INVALID
TARGET0 -> NODENAME variable-length write -> SIF write using TARGET0 offsets
```

Qualified composition pattern:

```text
one untouched TARGET0
 |-- project NODENAME APPLY scope
 |    -> merged NODENAME Phase-4B dry-run from TARGET0
 |    -> candidate original-coordinate claims
 |
 |-- project V11 SIF DELETE APPLY scope
      -> merged SIF Phase-4B dry-run from TARGET0
      -> candidate original-coordinate claims

all candidate claims
 -> exact TARGET0 beforeField proof
 -> preserve family authority identity
 -> reject any original-coordinate overlap
 -> patch TARGET0 once
 -> re-intake
 -> independently rebuild both family relocation plans
 -> independently rebuild all expected replacements
 -> independently build complete variable-length postimage
 -> PASS only if actual bytes == expected bytes
```

Potential physical claim families:

```text
CONTROL.NONAM
ELEMENT NODENAME pointer
NODENAME payload
CONTROL SIF count
ELEMENT SIF pointer
SIF&TEES payload
```

The two ELEMENT pointer fields are adjacent but disjoint 13-byte fields. Disjointness is verified by absolute original spans; it is never assumed from field identity.

## SIF CREATE boundary

Still hard-blocked:

```text
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

No whole-block SOURCE copy, zero/default synthesis, or later-edition inference is authorized.

## QF-1016-001 — byte-array freeze defect

Repository `deepFreeze()` recursively calls `Object.freeze()`.

Node rejects recursive freeze of non-empty typed arrays:

```text
TypeError: Cannot freeze array buffer views with elements
```

Because composite/component results contain `Uint8Array` bytes, PR1016 uses:

```text
composite result envelope   shallow Object.freeze
components envelope         shallow Object.freeze
plain metadata/claims       deepFreeze allowed
byte arrays                  not recursively frozen
```

## Authored mixed regression

The fixture deliberately creates true offset drift:

```text
NODENAME CREATE node80
  row count 3 -> 4
  NODENAME section grows before SIF&TEES

SIF DELETE pointer2
  blocks 3 -> 2
  pointers 1,2,3,0 -> 1,0,2,0
  SIF section shrinks later
```

Falsifiers also cover:

- unrelated later-section tamper;
- forged final mutation testimony;
- forged SIF component relocation testimony;
- cross-family original-span overlap;
- unsupported APPLY operation.

## Current validation truth

```text
PR1015 merge / PR1016 base grounding                  PASS
PR1016 branch ancestry                                PASS_GIT_COMPARE
composite writer syntax                               PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
composite validator syntax                            PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
mixed regression syntax                               PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
Uint8Array freeze falsifier                           PASS_LOCAL_REPRODUCTION_AND_SOURCE_FIX
repository mixed composite regression                 AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 NODENAME tests                      NOT_RUN_ENVIRONMENT
inherited Writer2 SIF DELETE tests                    NOT_RUN_ENVIRONMENT
inherited Writer1 tests                               NOT_RUN_ENVIRONMENT
full npm test                                         NOT_RUN_ENVIRONMENT
browser/product flow                                  NOT_RUN_ENVIRONMENT
real-CII mixed export/re-intake                       NOT_RUN_ENVIRONMENT
```

Exact checkout remains blocked by `Could not resolve host: github.com`. No unexecuted repository/browser test is represented as PASS.

## Exact next phase after PR1016 disposition

Update the explicit Writer2 product/core route so it recognizes both qualified cardinality families and invokes **only** the one-preimage composite:

```text
base engineering deltas
 -> Writer2 route NODENAME CREATE/DELETE + V11 SIF DELETE
 -> explicit APPLY/EXCLUDE scope
 -> composite readiness
 -> one-preimage composite write
 -> re-intake
 -> independent composite validation
 -> binary-authoritative Modified_<target>.cii export
```

Do not retain a product path that applies NODENAME first and SIF DELETE second.

See `agents/PR1016_workreport.md`, `agents/status/PR1016.yaml`, and `agents/claims/PR1016.yaml`.
