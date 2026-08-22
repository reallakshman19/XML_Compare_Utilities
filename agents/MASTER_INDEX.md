# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1024 | Writer 2 H>1 HANGER tail-order qualification | DRAFT / ACTIVE | Qualification-only physical classifier for interleaved vs grouped HGRDAT/TAG/GUID envelopes; per-record row ownership; no mutation authority | Execute focused classifier regression when environment permits; successor may integrate classifier into planner only |
| PR1023 | Writer 2 tri-family real-benchmark product qualification | MERGED 2026-08-22 · `d9b680d6` | Qualification-only on real `BM_CII_SOURCE.CII`; NODENAME CREATE + V11 SIF DELETE + HANGER DELETE-ALL; direct/product byte parity; independent full-postimage validation | Evidence baseline retained |
| PR1022 | Writer 2 tri-family product/core adoption | MERGED 2026-08-21 · `dcb9c433` | Explicit NODENAME CREATE/DELETE + V11 SIF DELETE + HANGER DELETE-ALL; canonical parent-scope custody; tri-family writer + independent validator | Production baseline |
| PR1021 | Writer 2 tri-family one-preimage composite | MERGED 2026-08-21 · `257e1d3d` | NODENAME CREATE/DELETE + V11 SIF DELETE + HANGER DELETE-ALL; one TARGET0; independent full-postimage validator | Reused by product/core |
| PR1020 | Writer 2 HANGER delete-all physical rewrite | MERGED 2026-08-21 · `a16a3f2e` | Exact `CONTROL.NOHGRS -> 0` + complete `MISCEL_1` hanger-payload removal; independent full-postimage validator | Component authority |
| PR1019 | Writer 2 HANGER DELETE authority | MERGED 2026-08-21 · `66342367` | IHGRNODE-first; H=1 or H>1 delete-all only; partial H>1 blocked; CREATE blocked | Planner authority under PR1024 qualification extension |
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

Writer 2 — merged production
  explicit writerVersion=2 only
  NODENAME CREATE/DELETE
  V11 existing SIF 10-row block DELETE
  HANGER H=1 delete / H>1 delete-all
  canonical parent APPLY/EXCLUDE scope custody
  one untouched TARGET0 tri-family composite
  re-intake + independent complete-postimage validator

Writer 2 — active PR1024 qualification
  H>1 HGRDAT/TAG/GUID envelope classification only
  interleaved order: numeric6,numeric5,string,string per record
  grouped order: all numeric pairs, then all string pairs
  exact per-record row ownership
  retained-row testimony preserves original ordering class
  no planner/physical/product authority expansion

Writer 2 stable blockers
  partial H>1 HANGER DELETE  BLOCKED_TAIL_ORDER_UNQUALIFIED in merged planner
  HANGER CREATE               BLOCKED_PAYLOAD_SEMANTICS_NOT_QUALIFIED
  SIF CREATE                  BLOCKED_ITEMS_27_30_UNRESOLVED

Writer 3
  topology/node/element/connectivity mutation only
```

## PR1024 qualification boundary

```text
untouched 4*H HGRDAT/TAG/GUID envelope
 -> exact row-count gate
 -> numeric HGRDAT card proof (6 values, then 5 values)
 -> TAG/GUID string-card proof (7X + I5 + 1X + body)
 -> classify INTERLEAVED or GROUPED
 -> emit exact 1-based per-record row ownership
 -> retained-row testimony preserves the same ordering class
 -> NO MUTATION AUTHORITY
```

For H=3 retaining records 1 and 3:

```text
interleaved rows -> 1,2,3,4,9,10,11,12
grouped rows     -> 1,2,5,6,7,8,11,12
```

QF-1024-001 corrected an initial helper defect that would have reordered grouped retention into interleaved order.

## Stable blockers

```text
WRITER_2_HANGER_PARTIAL_MULTI_RECORD_TAIL_ORDER_UNQUALIFIED
WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
```

## Current validation truth

```text
PR1023 merge / PR1024 exact base                       PASS
3D_Converters dual-emitter source conflict             PASS_SOURCE_INSPECTION
interleaved physical order                              PASS_SOURCE_INSPECTION
grouped physical order                                  PASS_SOURCE_INSPECTION
PR1024 classifier source audit                          PASS_SOURCE_INSPECTION
QF-1024-001 grouped-retention correction                PASS_SOURCE_INSPECTION
focused HANGER tail-order regression                    AUTHORED_NOT_RUN_ENVIRONMENT
inherited HANGER / Writer2 regressions                  NOT_RUN_ENVIRONMENT
full repository tests                                   NOT_RUN_ENVIRONMENT
browser/product                                         NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1024_workreport.md`, `agents/status/PR1024.yaml`, and `agents/claims/PR1024.yaml`.
