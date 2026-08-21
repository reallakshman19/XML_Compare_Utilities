# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1019 | Writer 2 HANGER DELETE authority | DRAFT / ACTIVE / HARDENED | Planner only; IHGRNODE-first; H=1 or H>1 delete-all only; partial H>1 blocked by unresolved HGRDAT/TAG-GUID tail order; CREATE and physical rewrite blocked | Review/qualify narrowed planner; after acceptance implement delete-all physical writer + independent postimage validator |
| PR1018 | Writer 2 real-benchmark product qualification | MERGED 2026-08-21 · `887eedc0` | Qualification-only real CII preimage for merged NODENAME + V11 SIF DELETE product route | Evidence retained; no new family authority |
| PR1017 | Writer 2 composite product/core routing | MERGED 2026-08-21 · `112e2d78` | Explicit Writer2 NODENAME CREATE/DELETE + V11 SIF existing-block DELETE product route; Writer1B default preserved | Current production Writer2 boundary |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Parent-scope custody; derived family subsets; original-coordinate arbitration; one patch; independent full-postimage validator | Reused by product route |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + ELEMENT pointers + byte-preserved SIF payload deletion | Component authority |
| PR1014 | Writer 2 V11 SIF/TEE DELETE planner | MERGED 2026-08-21 · `9a2984cb` | Exact owner binding, shared-pointer veto, 10-row compaction; CREATE blocked | Component authority |
| PR1013 | Writer 2 NODENAME initial product route | MERGED 2026-08-21 · `70c7004f` | Initial explicit NODENAME CREATE/DELETE product path | Product boundary superseded by PR1017 |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT pointers + NODENAME payload; independent postimage validator | Component authority |
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

Writer 2 — merged product authority
  NODENAME CREATE/DELETE
  V11 existing SIF 10-row block DELETE
  one-original-preimage mixed composite

Writer 2 — active qualification
  HANGER H=1 DELETE / H>1 delete-all planner   PR1019
  HANGER partial H>1 DELETE                    BLOCKED_TAIL_ORDER_UNQUALIFIED
  HANGER CREATE                                BLOCKED
  HANGER physical rewrite                     NOT_IMPLEMENTED

Writer 3
  topology/node/element/connectivity mutation only
```

## PR1019 governing finding

Stable row-count authority:

```text
MISCEL_1 prefix
  RRMAT                 ceil(NUMELT/6)
  VFLEX                 4*NUMNOZ

hanger payload H>0
  defaults              2
  IHGRNODE              ceil(H/6)
  HGRDAT + TAG/GUID     4*H total rows
  IHGRFREE              H
  IHGRNUM               ceil(H/6)
  IHGRTABLE             ceil(H/6)
  IHGRSHORT             ceil(H/6)
  IHGRCN                ceil(H/6)

execution options       4
```

For H>0:

```text
hanger rows = 2 + 5*H + 5*ceil(H/6)
```

### QF-1019-001

The two cited repository emitters disagree for H>1:

```text
cii2019_hanger_miscel_control.py
  per hanger: HGRDAT1,HGRDAT2,TAG,GUID

cii2019_miscel_hardener.py
  all HGRDAT first, then all TAG/GUID
```

`buildCiiHangerEvidence()` proves IHGRNODE-first placement but cannot distinguish those tail orders.

Therefore:

```text
H = 1                         DELETE eligible
H > 1, delete all records     DELETE eligible
H > 1, retain any records     BLOCK
```

Mandatory blocker:

```text
WRITER_2_HANGER_PARTIAL_MULTI_RECORD_TAIL_ORDER_UNQUALIFIED
```

The arithmetic map `1->1, 2->0, 3->2` is testimony only until tail order is qualified.

Packed hanger integer arrays additionally require canonical `2X` prefix plus exact 13-byte integer fields.

Real physical oracle remains:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
NUMELT = 40
NUMNOZ = 0
NOHGRS = 1
node = 205
MISCEL_1 rows: 23 -> 11 for complete hanger deletion
```

CREATE remains blocked:

```text
WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
```

## Current validation truth

```text
PR1018 merge / PR1019 base grounding                  PASS
row-count source review                              PASS_SOURCE_INSPECTION
QF-1019-001 emitter-order conflict                   PASS_SOURCE_INSPECTION
protected synchronizer inspection                    PASS_SOURCE_INSPECTION
BM_CII_SOURCE physical oracle                        PASS_SOURCE_INSPECTION
independent delete-all arithmetic                    PASS_INDEPENDENT_ARITHMETIC
focused PR1019 JS regression                         AUTHORED_NOT_RUN_ENVIRONMENT
inherited hanger custody regression                  NOT_RUN_ENVIRONMENT
Writer2 regression suite                             NOT_RUN_ENVIRONMENT
full repository tests                                NOT_RUN_ENVIRONMENT
browser/product                                      NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1019_workreport.md`, `agents/status/PR1019.yaml`, and `agents/claims/PR1019.yaml`.