# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1019 | Writer 2 canonical HANGER DELETE authority | DRAFT / ACTIVE | Planner only; canonical `CAESAR_SYNCHRONIZER_IHGRNODE_FIRST`; one record-index across all hanger arrays; CREATE and physical rewrite blocked | Review/qualify planner; after acceptance implement separate one-preimage physical DELETE writer + independent postimage validator |
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
  canonical existing HANGER DELETE planner     PR1019
  HANGER CREATE                                BLOCKED
  HANGER physical rewrite                     NOT_IMPLEMENTED

Writer 3
  topology/node/element/connectivity mutation only
```

## PR1019 canonical hanger authority

Source-qualified canonical CII 2019 hanger layout:

```text
MISCEL_1 prefix
  RRMAT                 ceil(NUMELT/6)
  VFLEX                 4*NUMNOZ

hanger payload H>0
  defaults              2 rows
  IHGRNODE              ceil(H/6)
  HGRDAT                2*H
  TAG/GUID              2*H
  IHGRFREE              H
  IHGRNUM               ceil(H/6)
  IHGRTABLE             ceil(H/6)
  IHGRSHORT             ceil(H/6)
  IHGRCN                ceil(H/6)

MISCEL_1 suffix
  execution options     4 rows
```

For H>0:

```text
hanger rows = 2 + 5*H + 5*ceil(H/6)
```

Mutation is limited to physical layout:

```text
CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

The essential delete invariant is one old record index across all parallel arrays:

```text
old i -> IHGRNODE[i]
         HGRDAT[i]
         TAG/GUID[i]
         IHGRFREE[i]
         IHGRNUM[i]
         IHGRTABLE[i]
         IHGRSHORT[i]
         IHGRCN[i]
```

Example:

```text
before 1,2,3
delete 2
1 -> 1
2 -> 0
3 -> 2
```

Real physical oracle:

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

because complete construction/default semantics for HGRDAT, TAG/GUID, IHGRFREE and all packed hanger arrays are not qualified.

## Current validation truth

```text
PR1018 merge / PR1019 base grounding                  PASS
canonical hanger source/shape review                  PASS_SOURCE_INSPECTION
protected converter corroboration                     PASS_SOURCE_INSPECTION
BM_CII_SOURCE physical oracle                         PASS_SOURCE_INSPECTION
independent 23->11 and 1,2,3 mapping arithmetic      PASS_INDEPENDENT_ARITHMETIC
focused PR1019 JS regression                          AUTHORED_NOT_RUN_ENVIRONMENT
inherited hanger custody regression                   NOT_RUN_ENVIRONMENT
Writer2 regression suite                              NOT_RUN_ENVIRONMENT
full repository tests                                 NOT_RUN_ENVIRONMENT
browser/product                                       NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1019_workreport.md`, `agents/status/PR1019.yaml`, and `agents/claims/PR1019.yaml`.
