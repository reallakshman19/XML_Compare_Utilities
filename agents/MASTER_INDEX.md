# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE Phase-4B | DRAFT / ACTIVE | CONTROL SIF count + exact ELEMENT SIF pointers + byte-preserved variable-length SIF payload deletion; independent complete-postimage validator; CREATE hard-blocked | Run exact repository/real-CII qualification; after acceptance build one-preimage Writer2 NODENAME+SIF composite before product routing |
| PR1014 | Writer 2 V11 SIF/TEE DELETE relocation authority | MERGED 2026-08-21 · `9a2984cb` | DELETE-only planning: exact owner binding, shared-pointer veto, 10-row block compaction, complete old→new pointer map, shifted ELEMENT SIF pointers, CONTROL after-count; CREATE hard-blocked | Reused unchanged by PR1015 physical transaction |
| PR1013 | Writer 2 NODENAME product/core routing | MERGED 2026-08-21 · `70c7004f` | Explicit `writerVersion=2`; NODENAME CREATE/DELETE-only routing; scope-bound readiness; Phase-4B apply/re-intake/validation; binary export | Preserve default Writer1B behavior; successor composition must not sequentially mutate bytes |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT NODENAME pointers + variable-length NODENAME payload; independent exact full-postimage validator | Reused by future Writer2 composite |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation, row compaction, complete pointer map, CONTROL after-count | Reused by future Writer2 composite |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified 1A/1B/1C claims from one untouched TARGET; independent final authorization | Architectural precedent for multi-family one-preimage composition |
| PR1009 | Writer 1C V11 SIF selected-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 block; slot1/2 item3 ii and item4 io; explicit >=1; code/Type gates; anti-drift validation | Field-level SIF authority remains unchanged |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical block + FROM/TO mutation custody; shared-span arbitration | Reused by relocation work |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items1..26 named; items27..30 unresolved; selected existing-block ii/io authority | Source authority for SIF CREATE blocker |
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
  one-original-preimage 1A+1B+1C composition
  existing NODENAME field overwrite
  selected existing V11 SIF ii/io fields

Writer 2
  NODENAME CREATE/DELETE: planning + physical rewrite + product routing
  V11 SIF existing-block DELETE: planning merged; physical rewrite in PR1015

Writer 3
  topology mutation only
```

## Writer 2 NODENAME authority — merged

```text
scoped NODENAME CREATE/DELETE
 -> exact physical custody
 -> deterministic allocation / deletion
 -> oldPointer -> newPointer map
 -> CONTROL.NONAM_after
 -> one variable-length original-byte rewrite
 -> re-intake
 -> independent complete expected-postimage validation
 -> binary-authoritative export
```

No option supplied still resolves to Writer 1B. Writer 2 remains explicit.

## Writer 2 SIF DELETE authority

### PR1014 — merged transaction planning

V11 structure:

```text
#$ SIF&TEES
2 tee slots / block
30 values / slot
5 rows / slot
10 rows / block
ELEMENT row13 field5       = 1-based SIF block pointer
CONTROL payload row3 field5 = SIF block count
```

DELETE plan:

```text
explicit SIF/Tee record-presence DELETE
 -> reviewed/locked element identity
 -> exact parsed-index + FROM/TO physical ELEMENT binding
 -> existing nonzero V11 SIF pointer
 -> all shared-pointer owners selected
 -> mark complete 10-row block for removal
 -> compact retained block indices
 -> oldPointer -> newPointer map
 -> derive every changed ELEMENT SIF pointer
 -> derive CONTROL SIF-count_after
```

Critical case:

```text
before pointers: 1,2,3
delete block:       2
after pointers:  1,0,2
mapping: 1->1, 2->0, 3->2
```

### PR1015 — physical transaction

Only three physical replacements are authorized:

```text
CONTROL_SIF_TEE_COUNT
ELEMENT_SIF_TEE_POINTER
SIF_TEE_SECTION_PAYLOAD
```

The SIF payload is not regenerated numerically. Every retained 10-row block is copied from original TARGET byte spans, including the original line endings, and selected blocks are omitted.

Deleting all blocks is a supported DELETE postimage:

```text
CONTROL SIF count -> 0
all owning ELEMENT SIF pointers -> 0
SIF payload -> empty
section marker -> retained
```

Primary validator proof:

```text
untouched TARGET + targetGraph + bound transfer plan
 -> independently rebuild PR1014 relocation plan
 -> independently derive CONTROL/pointer/payload replacements
 -> independently build complete expected variable-length postimage

PASS only if actual post bytes == independent expected post bytes
```

Writer mutation/relocation ledgers are testimony only.

### CREATE remains hard-blocked

```text
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

V11 items27..30 remain unresolved in each tee slot. Not authorized:

- opaque SOURCE 10-row block copy;
- zero/default synthesis;
- later-edition inference;
- assumption that converter structure establishes missing engineering semantics.

## Critical next Writer2 architecture gate

Do not route SIF DELETE as a sequential second pass after the existing NODENAME Writer2 transaction.

Both families can change byte length. Second-pass offsets would then be based on an intermediate postimage instead of the untouched TARGET.

Required successor architecture:

```text
one untouched TARGET
 |-- NODENAME relocation plan -> original-coordinate replacements
 |-- SIF DELETE relocation plan -> original-coordinate replacements

all Writer2 replacements
 -> cross-family same-span / partial-overlap arbitration
 -> patch one original byte stream once
 -> re-intake
 -> independently rebuild both family plans
 -> independently build final complete expected postimage
 -> exact byte equality
```

Expected disjoint physical families must be proven, not assumed:

```text
CONTROL.NONAM              vs CONTROL SIF count
ELEMENT NODENAME pointer   vs ELEMENT SIF pointer
NODENAME payload           vs SIF&TEES payload
```

Only after that composite is qualified should `writerVersion=2` product routing admit mixed NODENAME + SIF DELETE transactions.

## Current validation truth

```text
PR1014 merge / PR1015 base grounding                  PASS
canonical V11 CONTROL SIF count representation        PASS_SOURCE_INSPECTION
PR1015 writer source audit                             PASS_SOURCE_INSPECTION
PR1015 validator source audit                          PASS_SOURCE_INSPECTION
PR1015 physical regression                             AUTHORED_NOT_RUN_ENVIRONMENT
exact repository checkout                              BLOCKED_ENVIRONMENT_DNS
inherited Writer1 / Writer2 NODENAME regressions       NOT_RUN_ENVIRONMENT
full npm test                                          NOT_RUN_ENVIRONMENT
browser / product flow                                 NOT_RUN_ENVIRONMENT
real-CII SIF DELETE export/re-intake                    NOT_RUN_ENVIRONMENT
```

Exact checkout remains blocked by `Could not resolve host: github.com`. No unexecuted repository/browser test is represented as PASS.

See `agents/PR1015_workreport.md`, `agents/status/PR1015.yaml`, and `agents/claims/PR1015.yaml`.
