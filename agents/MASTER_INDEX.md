# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1011 | Writer 2 Phase-4A NODENAME relocation planner | DRAFT / ACTIVE | Deterministic CREATE/DELETE allocation plan, row compaction, complete old→new pointer map, CONTROL.NONAM after-count; no physical rewrite yet | Review relocation authority; next separate Phase-4B implements physical rewrite + independent post-layout validation |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite transaction | MERGED 2026-08-21 · `7c1b7df0` | Compose only qualified 1A/1B/1C claims from one untouched TARGET; component validation + independently reconstructed final authorization | Preserve as lower-writer transaction authority inside future Writer2 work |
| PR1009 | Writer 1C V11 SIF Phase-2B exact-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 SIF pointer/block; slot1/2 item3 ii and item4 io; finite >=1; finite equal Type; same-code engineer attestation; independent byte anti-drift | Preserve these field/context gates |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody hardening | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical 15-row block + FROM/TO mutation custody; endpoint fallback read-only only; shared-span arbitration | Preserve exact physical custody in all relocation work |
| PR1006 | Writer 1C SIF/TEE Version-11 field qualification | MERGED 2026-08-20 · `430b2b0e` | Vendor-source-qualified item3/item4 ii/io positions and edition/layout gates | Historical source authority for PR1009 |
| PR1004 | Writer 1C NODENAME byte-custody implementation | MERGED 2026-08-20 · `692be3fd` | Existing-pointer NODENAME fixed-field COPY; one-preimage byte patch; independent authorization | Historical foundation |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Original TARGET bytes; independent authorization; Writer testimony is not authority; Writer2/3 boundaries | Historical authority contract |
| PR1001 | Explicit APPLY / EXCLUDE transfer-scope custody | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + operation-set custody | Historical |
| PR992 | Target Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified fixed fields and existing restraint slice | Lower writer authority |
| PR991 | Target Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-field writer slice | Lower writer authority |

## Current Writer 1C / composite production authority

```text
untouched original TARGET
 |-- qualified Writer1A/1B claims from original text
 |-- qualified Writer1C NODENAME/SIF claims from original bytes

all claims
 -> exact original preimage proof
 -> preserve Writer1A / Writer1B / Writer1C authority identity
 -> reject cross-family same-span or partial overlap
 -> patch one original byte vector once
 -> re-intake
 -> validate each component independently
 -> independently reconstruct final authorized union
 -> require actual byte diff inside that union
```

NODENAME physical binding remains:

```text
parsed ELEMENT index == physical 15-row block index
AND parsed FROM == physical FROM
AND parsed TO == physical TO
```

Endpoint fallback is read-only and cannot authorize mutation or relocation.

V11 SIF production slice remains:

```text
slot1 item3 ii -> r0f2 -> [28,41)
slot1 item4 io -> r0f3 -> [41,54)
slot2 item3 ii -> r5f2 -> [28,41)
slot2 item4 io -> r5f3 -> [41,54)
```

## Writer 2 Phase-4A authority

PR1011 starts Writer 2 with NODENAME relocation planning because NODENAME semantics and pointer custody are already qualified.

Protected CII format oracle:

```text
NODENAME row = 2X + FROM[26] + TO[25] = 53 characters
CONTROL line1 field4 = NONAM row count
ELEMENT row13 field6 = 1-based NODENAME pointer
```

Phase-4A plan:

```text
scoped NODENAME CREATE/DELETE
 -> exact existing physical custody
 -> deterministic CREATE owner selection among pointer=0 ELEMENTs
 -> clear selected DELETE fields
 -> remove only rows made fully blank
 -> compact retained rows
 -> derive complete oldPointer -> newPointer map
 -> append deterministic CREATE rows
 -> derive every ELEMENT pointer transition
 -> derive CONTROL.NONAM_after from final row count
```

Critical relocation example:

```text
old NODENAME pointers: 1,2,3
delete row 2
mapping: 1->1, 2->0, 3->2
```

The `3->2` ELEMENT pointer change is required even if that ELEMENT was not selected for deletion; it is a transaction-level relocation consequence and must be explicitly audited.

## Writer 2 boundary still not crossed

PR1011 does not yet authorize physical cardinality-changing output. Still blocked until Phase-4B:

```text
CONTROL byte mutation
ELEMENT NODENAME pointer rewrite
NODENAME section physical row insertion/deletion
modified-CII export
```

Still later Writer2 work:

```text
SIF/TEE block create/delete
hanger create/delete
other auxiliary section insertion/deletion
```

Writer 3 remains topology mutation: node/element creation/deletion, connectivity change, branch insertion and new component topology.

## Validation truth

```text
PR1010 merge / current-main grounding            PASS
PR1011 branch ancestry                           PASS_GIT_COMPARE
PR1011 changed-file scope                        PASS_GIT_COMPARE
Writer2 planner syntax                           PASS_LOCAL_SOURCE
isolated relocation logic                       PASS_ISOLATED_PLANNER_HARNESS
PR1011 repository focused tests                  AUTHORED_NOT_RUN_ENVIRONMENT
full npm test                                    NOT_RUN_ENVIRONMENT
browser product flow                             NOT_RUN_ENVIRONMENT
```

Exact repository execution remains blocked in the current session by `github.com` DNS resolution failure. No unexecuted repository test is represented as PASS.

See `agents/PR1011_workreport.md`, `agents/status/PR1011.yaml`, and `agents/claims/PR1011.yaml`.
