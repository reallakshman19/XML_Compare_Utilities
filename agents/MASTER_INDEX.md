# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1012 | Writer 2 Phase-4B NODENAME physical relocation | DRAFT / ACTIVE | Apply merged Phase-4A relocation to original TARGET bytes; update CONTROL.NONAM + exact ELEMENT NODENAME pointers + NODENAME payload; independent exact-full-postimage validator | Execute exact repository regressions/benchmark; after acceptance, add Writer2 product/core routing in a separate PR |
| PR1011 | Writer 2 Phase-4A NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation plan, row compaction, complete old→new pointer map and CONTROL.NONAM after-count | Preserve as Writer2 NODENAME transaction-planning authority for PR1012 and later routing |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite transaction | MERGED 2026-08-21 · `7c1b7df0` | Compose only qualified 1A/1B/1C claims from one untouched TARGET; component validation + independently reconstructed final authorization | Preserve as lower-writer transaction authority inside future Writer2 routing/composition |
| PR1009 | Writer 1C V11 SIF Phase-2B exact-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 SIF pointer/block; slot1/2 item3 ii and item4 io; finite >=1; finite equal Type; same-code engineer attestation; independent byte anti-drift | Preserve these field/context gates |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody hardening | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical 15-row block + FROM/TO mutation custody; endpoint fallback read-only only; shared-span arbitration | Preserve exact physical custody in all relocation work |
| PR1006 | Writer 1C SIF/TEE Version-11 field qualification | MERGED 2026-08-20 · `430b2b0e` | Vendor-source-qualified item3/item4 ii/io positions and edition/layout gates | Historical source authority for PR1009 |
| PR1004 | Writer 1C NODENAME byte-custody implementation | MERGED 2026-08-20 · `692be3fd` | Existing-pointer NODENAME fixed-field COPY; one-preimage byte patch; independent authorization | Historical foundation |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Original TARGET bytes; independent authorization; Writer testimony is not authority; Writer2/3 boundaries | Historical authority contract |
| PR1001 | Explicit APPLY / EXCLUDE transfer-scope custody | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + operation-set custody | Historical |
| PR992 | Target Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified fixed fields and existing restraint slice | Lower writer authority |
| PR991 | Target Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-field writer slice | Lower writer authority |

## Current Writer 1C / composite authority

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

V11 SIF production slice remains exactly:

```text
slot1 item3 ii -> r0f2 -> [28,41)
slot1 item4 io -> r0f3 -> [41,54)
slot2 item3 ii -> r5f2 -> [28,41)
slot2 item4 io -> r5f3 -> [41,54)
```

## Writer 2 NODENAME transaction authority

### Phase-4A — merged planning authority

Protected CII format oracle:

```text
NODENAME row = 2X + FROM[26] + TO[25] = 53 characters
CONTROL line1 field4 = NONAM row count
ELEMENT row13 field6 = 1-based NODENAME pointer
```

Phase-4A derives:

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

Critical example:

```text
old rows: 1,2,3
delete old row 2
old->new: 1->1, 2->0, 3->2
```

The `3->2` pointer transition is a relocation consequence and is explicitly part of the transaction authority.

### Phase-4B — PR1012 physical writer

PR1012 applies the Phase-4A transaction using only three physical replacement classes:

```text
1. CONTROL.NONAM fixed-width integer field
2. exact ELEMENT NODENAME pointer fields
3. complete raw NODENAME section payload
```

Everything else is copied verbatim from the original TARGET byte stream.

Cardinality is explicitly variable:

```text
CREATE       -> byte/row count can increase
DELETE       -> byte/row count can decrease
CREATE+DELETE -> count can stay equal while pointer layout changes
```

CONTROL.NONAM uses canonical integer formatting. Existing NODENAME rows must be exactly 53 characters. Retained rows preserve their own physical line endings; appended rows inherit the section row ending.

## Writer 2 Phase-4B validation model

Writer 1C can express same-length negative assurance as an authorized changed-byte subset. Writer 2 cannot use that as its primary proof because inserting/removing rows shifts all downstream byte offsets.

PR1012 therefore independently reconstructs the complete expected postimage:

```text
untouched TARGET + bound transfer plan
 -> independently rebuild Phase-4A relocation plan
 -> independently derive CONTROL/pointer/NODENAME replacements
 -> build complete expected variable-length byte stream

PASS only if
actual post bytes == independent expected post bytes
```

Additional validation requires exact post CONTROL count, NODENAME row count, ELEMENT pointer snapshot, node-name semantics, connectivity, section order, and agreement between Writer testimony and the independent replacement/relocation ledgers.

Writer testimony never defines authorization.

The validator also has an independent six-significant-digit pointer formatter rather than reusing the production writer formatter.

## Writer 2 boundary still not crossed

PR1012 deliberately does not include product/core routing. The next separate phase is:

```text
writerVersion = 2
 -> NODENAME CREATE/DELETE transfer classification
 -> Phase-4A readiness
 -> Phase-4B physical writer
 -> re-intake
 -> Phase-4B independent validator
 -> product/export lifecycle
```

Still later Writer-2 work:

```text
SIF/TEE 10-row block create/delete
hanger create/delete / HGRDAT / packed MISCEL_1 maintenance
generic auxiliary section insertion/deletion
```

Writer 3 remains topology mutation: node/element creation/deletion, connectivity changes, branch insertion, split/merge and topology-aware auxiliary migration.

## Validation truth

```text
PR1011 merge / current-main grounding                 PASS
PR1012 branch ancestry                                PASS_GIT_COMPARE
PR1012 new writer syntax                              PASS_LOCAL_EXECUTION
PR1012 new validator syntax                           PASS_LOCAL_EXECUTION
PR1012 focused test source syntax                     PASS_LOCAL_EXECUTION
isolated exact new Writer2 writer+validator           PASS_ISOLATED_EXACT_NEW_MODULES
forged writer testimony isolated attack               FAIL_AS_REQUIRED
repository Phase4A + Phase4B focused tests            AUTHORED_NOT_RUN_ENVIRONMENT
real Writer2 benchmark                                NOT_RUN_ENVIRONMENT
inherited Writer1A/1B/1C regressions                  NOT_RUN_ENVIRONMENT
full npm test                                         NOT_RUN_ENVIRONMENT
browser / product flow                                NOT_RUN_ENVIRONMENT
```

Exact complete-checkout execution remains unavailable in the current execution environment. No unexecuted repository test is represented as PASS.

See `agents/PR1012_workreport.md`, `agents/status/PR1012.yaml`, and `agents/claims/PR1012.yaml`.
