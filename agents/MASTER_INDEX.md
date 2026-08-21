# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | DRAFT / ACTIVE | Canonical PR1001 parent-scope custody; duplicate-free candidate/APPLY/EXCLUDE IDs; derived family subsets only; original-coordinate claim arbitration; single patch; independent full-postimage validator; SIF CREATE hard-blocked | Execute exact repository/real-CII mixed qualification; after acceptance route product/core Writer2 through this composite |
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
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + candidate/APPLY/EXCLUDE operation-set custody | Governing transaction scope; PR1016 revalidates this parent scope before any family projection |
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

Parent scope must first be proven exactly:

```text
mode      = EXPLICIT_APPLY_EXCLUDE
status    = BOUND
authority = USER_EXPLICIT_OPERATION_SCOPE
source/target hashes match
candidate/APPLY/EXCLUDE operation IDs match exactly
all IDs are nonblank and duplicate-free
APPLY and EXCLUDE are disjoint
```

Family views are internal monotonic projections only:

```text
DERIVED_BOUND_SUBSET / PARENT_TRANSFER_SCOPE_SUBSET_ONLY
```

They preserve the original user-bound `transferScope` unchanged and can only remove sibling APPLY operations from a component view; they cannot create a new APPLY authorization.

Qualified composition pattern:

```text
one untouched TARGET0
 |-- derived NODENAME APPLY subset
 |    -> merged NODENAME Phase-4B dry-run from TARGET0
 |    -> candidate original-coordinate claims
 |
 |-- derived V11 SIF DELETE APPLY subset
      -> merged SIF Phase-4B dry-run from TARGET0
      -> candidate original-coordinate claims

all candidate claims
 -> exact TARGET0 beforeField proof
 -> preserve family authority identity
 -> reject any original-coordinate overlap
 -> patch TARGET0 once
 -> re-intake
 -> independently revalidate parent scope
 -> independently rebuild both family relocation plans
 -> independently rebuild all expected replacements
 -> independently build complete variable-length postimage
 -> PASS only if actual bytes == expected bytes
```

Potential physical claim families:

```text
CONTROL_NONAM
ELEMENT_NODENAME_POINTER
NODENAME_SECTION_PAYLOAD
CONTROL_SIF_TEE_COUNT
ELEMENT_SIF_TEE_POINTER
SIF_TEE_SECTION_PAYLOAD
```

SIF CREATE remains hard-blocked:

```text
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

No opaque whole-block copy, default synthesis, or later-edition semantic inference is authorized.

## PR1016 qualification findings

```text
QF-1016-001  recursive deepFreeze fails on non-empty Uint8Array
             FIXED: shallow result/components envelope

QF-1016-002  internal family projection was initially capable of looking like a new BOUND user scope
             FIXED: original PR1001 scope preserved; derived subset explicitly identified

QF-1016-003  set normalization can hide duplicate operation IDs
             FIXED: writer + independent validator enforce exact unique ID cardinality
```

## Current validation truth

```text
PR1015 merge / PR1016 base grounding                  PASS
branch ancestry                                      PASS_GIT_COMPARE
PR1001 transfer-scope compatibility audit             PASS_SOURCE_INSPECTION
canonical-scope projection audit                      PASS_SOURCE_INSPECTION
Uint8Array freeze falsifier                           PASS_LOCAL_REPRODUCTION_AND_SOURCE_FIX
post-hardening writer/validator syntax                NOT_RUN_ENVIRONMENT
scope-custody falsifier regression                    AUTHORED_NOT_RUN_ENVIRONMENT
mixed composite regression                            AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 NODENAME regressions                NOT_RUN_ENVIRONMENT
inherited Writer2 SIF DELETE regressions              NOT_RUN_ENVIRONMENT
inherited Writer1 regressions                         NOT_RUN_ENVIRONMENT
full npm test                                         NOT_RUN_ENVIRONMENT
browser/product flow                                  NOT_RUN_ENVIRONMENT
real-CII mixed round trip                             NOT_RUN_ENVIRONMENT
```

Exact checkout remains blocked by `Could not resolve host: github.com`. No unexecuted repository/browser test is represented as PASS.

See `agents/PR1016_workreport.md`, `agents/status/PR1016.yaml`, and `agents/claims/PR1016.yaml`.
