# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1025 | Writer 2 partial H>1 HANGER DELETE planner integration | DRAFT / ACTIVE | Planner-only positional record binding across IHGRNODE, qualified HGRDAT/TAG/GUID tail, IHGRFREE and four packed arrays; physical/product partial write remains blocked | Execute focused regressions when exact checkout is available; after acceptance build a separate physical partial-compaction writer/validator |
| PR1024 | Writer 2 H>1 HANGER tail-order qualification | MERGED 2026-08-22 · `1f3f7b8e` | Physical classifier for interleaved vs grouped HGRDAT/TAG/GUID envelopes; exact per-record row ownership; no mutation authority | Consumed by PR1025 planner only |
| PR1023 | Writer 2 tri-family real-benchmark product qualification | MERGED 2026-08-22 · `d9b680d6` | Qualification-only on real `BM_CII_SOURCE.CII`; NODENAME CREATE + V11 SIF DELETE + HANGER DELETE-ALL; direct/product byte parity; independent full-postimage validation | Evidence baseline retained |
| PR1022 | Writer 2 tri-family product/core adoption | MERGED 2026-08-21 · `dcb9c433` | Explicit NODENAME CREATE/DELETE + V11 SIF DELETE + HANGER DELETE-ALL; canonical parent-scope custody; tri-family writer + independent validator | Production baseline; partial HANGER still product-blocked |
| PR1021 | Writer 2 tri-family one-preimage composite | MERGED 2026-08-21 · `257e1d3d` | NODENAME CREATE/DELETE + V11 SIF DELETE + HANGER DELETE-ALL; one TARGET0; independent full-postimage validator | Reused by product/core |
| PR1020 | Writer 2 HANGER delete-all physical rewrite | MERGED 2026-08-21 · `a16a3f2e` | Exact `CONTROL.NOHGRS -> 0` + complete `MISCEL_1` hanger-payload removal; independent full-postimage validator | Physical authority remains DELETE-ALL only |
| PR1019 | Writer 2 HANGER DELETE planner foundation | MERGED 2026-08-21 · `66342367` | IHGRNODE-first HANGER delete planner; delete-all authority; CREATE blocked; original H>1 partial blocker | Extended at planner level by PR1025 only when record binding is qualified |
| PR1018 | Writer 2 real-benchmark product qualification | MERGED 2026-08-21 · `887eedc0` | Qualification-only real CII preimage for merged NODENAME + V11 SIF DELETE product route | Two-family evidence retained |
| PR1017 | Writer 2 composite product/core routing | MERGED 2026-08-21 · `112e2d78` | Explicit Writer2 NODENAME CREATE/DELETE + V11 SIF existing-block DELETE product route; Writer1B default preserved | Superseded by PR1022 |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Parent-scope custody; derived family subsets; original-coordinate arbitration; independent validator | Architectural foundation |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + ELEMENT pointers + byte-preserved SIF payload deletion | Component authority |
| PR1014 | Writer 2 V11 SIF/TEE DELETE planner | MERGED 2026-08-21 · `9a2984cb` | Exact owner binding, shared-pointer veto, 10-row compaction; CREATE blocked | Component authority |
| PR1013 | Writer 2 NODENAME initial product route | MERGED 2026-08-21 · `70c7004f` | Initial explicit NODENAME CREATE/DELETE product path | Superseded |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT pointers + NODENAME payload; independent validator | Component authority |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation and complete pointer relocation | Component authority |
| PR1010 | Writer 1A + 1B + 1C one-preimage composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified Writer1 family claims from one untouched TARGET | Architectural precedent |
| PR1009 | Writer 1C V11 selected SIF fields | MERGED 2026-08-20 · `d63e8c59` | Existing V11 block; selected ii/io fields only | Existing-field authority |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical ELEMENT/NODENAME binding | Physical custody foundation |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items 1..26 named; items 27..30 unresolved | SIF CREATE remains blocked |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Writer1 fixed fields; Writer2 cardinality/pointers; Writer3 topology | Governing architecture |
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + exact candidate/APPLY/EXCLUDE operation-set custody | Governing transaction scope |
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

Writer 2 — merged physical/product authority
  explicit writerVersion=2 only
  NODENAME CREATE/DELETE
  V11 existing SIF 10-row block DELETE
  HANGER H=1 delete / H>1 DELETE-ALL only
  canonical parent APPLY/EXCLUDE scope custody
  one untouched TARGET0 tri-family composite
  re-intake + independent complete-postimage validator

Writer 2 — active PR1025 planner authority only
  H>1 partial HANGER DELETE may be planner READY only when record binding is QUALIFIED
  record i binds IHGRNODE + HGRDAT/TAG/GUID + IHGRFREE + IHGRNUM/IHGRTABLE/IHGRSHORT/IHGRCN
  semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
  plannerPartialRecordAuthority = true
  physicalPartialWriteAuthority = false
  physicalWriterScope = DELETE_ALL_ONLY_UNCHANGED

Writer 2 partial-HANGER gates
  record binding unqualified -> WRITER_2_HANGER_PARTIAL_MULTI_RECORD_TAIL_ORDER_UNQUALIFIED
  physical delete-all writer -> CII_WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED
  product/composite readiness -> WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED

Writer 2 stable CREATE blockers
  HANGER CREATE -> WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
  SIF CREATE    -> WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30

Writer 3
  topology/node/element/connectivity mutation only
```

## PR1025 planner transaction

```text
untouched TARGET0 HANGER payload
 -> existing CONTROL / MISCEL_1 / IHGRNODE structural custody
 -> PR1024 HGRDAT/TAG/GUID tail classifier
 -> positional record-binding proof
      record i / IHGRNODE[i]
      record i / HGRDAT/TAG/GUID physical rows
      record i / IHGRFREE row
      record i / IHGRNUM[i]
      record i / IHGRTABLE[i]
      record i / IHGRSHORT[i]
      record i / IHGRCN[i]
 -> selected record indices
 -> old->new record-index map
 -> retained-row/field custody ledger
 -> PLANNER READY only
 -> NO physical partial write authority
```

For H=3 deleting record 2:

```text
oldToNewRecordIndex = {1:1, 2:0, 3:2}

INTERLEAVED retained tail rows
1,2,3,4,9,10,11,12

GROUPED retained tail rows
1,2,5,6,7,8,11,12
```

## QF-1025 authority boundaries

```text
QF-1025-001
planner READY cannot leak to product/physical apply because two independent delete-all gates remain.

QF-1025-002
blank raw 13-byte packed field cannot silently become zero positional authority; explicit integer token required.

QF-1025-003
delete-all remains independent of retained per-record binding because every hanger-specific record is removed.

QF-1025-004
grouped HGRDAT/TAG/GUID order must remain grouped; no canonicalization to interleaved order.
```

## Current validation truth

```text
PR1024 merge / PR1025 exact base                       PASS
branch scope before recovery docs                      PASS_SOURCE_INSPECTION
merged product delete-all gate                         PASS_SOURCE_INSPECTION
merged physical delete-all gate                        PASS_SOURCE_INSPECTION
record-binding module source audit                     PASS_SOURCE_INSPECTION
planner integration source audit                       PASS_SOURCE_INSPECTION
regression source audit                                PASS_SOURCE_INSPECTION
focused HANGER record-binding regression               AUTHORED_NOT_RUN_ENVIRONMENT
focused HANGER planner regression                      AUTHORED_NOT_RUN_ENVIRONMENT
HANGER delete-all physical regression                  AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 component regressions                NOT_RUN_ENVIRONMENT
tri-family composite/product suites                    NOT_RUN_ENVIRONMENT
full repository tests                                  NOT_RUN_ENVIRONMENT
browser/product                                        NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1025_workreport.md`, `agents/status/PR1025.yaml`, and `agents/claims/PR1025.yaml`.
