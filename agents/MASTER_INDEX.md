# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1020 | Writer 2 HANGER delete-all physical rewrite | DRAFT / ACTIVE | Two-span physical writer: exact `CONTROL.NOHGRS -> 0` + complete `MISCEL_1` hanger-payload removal; independent full-postimage validator; partial H>1 and CREATE blocked | Execute exact focused/benchmark qualification; after acceptance adopt as a one-preimage Writer2 composite family before product routing |
| PR1019 | Writer 2 HANGER DELETE authority | MERGED 2026-08-21 · `66342367` | Planner only; IHGRNODE-first; H=1 or H>1 delete-all only; partial H>1 blocked by unresolved HGRDAT/TAG-GUID tail order; CREATE blocked | Reused unchanged by PR1020 physical writer |
| PR1018 | Writer 2 real-benchmark product qualification | MERGED 2026-08-21 · `887eedc0` | Qualification-only real CII preimage for merged NODENAME + V11 SIF DELETE product route | Evidence retained; no new family authority |
| PR1017 | Writer 2 composite product/core routing | MERGED 2026-08-21 · `112e2d78` | Explicit Writer2 NODENAME CREATE/DELETE + V11 SIF existing-block DELETE product route; Writer1B default preserved | Current production Writer2 boundary |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Parent-scope custody; derived family subsets; original-coordinate arbitration; one patch; independent full-postimage validator | Must be extended before HANGER product routing |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + ELEMENT pointers + byte-preserved SIF payload deletion | Component authority |
| PR1014 | Writer 2 V11 SIF/TEE DELETE planner | MERGED 2026-08-21 · `9a2984cb` | Exact owner binding, shared-pointer veto, 10-row compaction; CREATE blocked | Component authority |
| PR1013 | Writer 2 NODENAME initial product route | MERGED 2026-08-21 · `70c7004f` | Initial explicit NODENAME CREATE/DELETE product path | Superseded by PR1017 product composite |
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
  one-original-preimage NODENAME + SIF composite

Writer 2 — merged HANGER planning authority
  H=1 DELETE
  H>1 delete-all
  partial H>1 DELETE    BLOCKED_TAIL_ORDER_UNQUALIFIED
  HANGER CREATE         BLOCKED

Writer 2 — active PR1020 physical authority
  HANGER delete-all only
  CONTROL.NOHGRS + complete MISCEL_1 payload
  product routing       NOT_IMPLEMENTED
  composite adoption    NOT_IMPLEMENTED

Writer 3
  topology/node/element/connectivity mutation only
```

## PR1020 governing physical transaction

Only two original-preimage replacement spans are authorized:

```text
CONTROL_HANGER_COUNT
MISCEL_1_HANGER_DELETE_ALL_PAYLOAD
```

Transaction:

```text
one untouched TARGET0
 + merged PR1019 bound delete-all plan
 -> prove deleteAll=true / countAfter=0
 -> exact CONTROL.NOHGRS 13-byte field -> zero
 -> MISCEL_1 prefix rows copied byte-for-byte
      RRMAT = ceil(NUMELT/6)
      VFLEX = 4*NUMNOZ
 -> complete hanger payload removed
 -> final four execution rows copied byte-for-byte
 -> original-coordinate replacement arbitration
 -> patch TARGET0 once
```

No HGRDAT/TAG/GUID record ordering is interpreted. This is why H>1 delete-all remains valid even though partial H>1 compaction is blocked.

Independent validation separately derives:

```text
prefixRows = ceil(NUMELT/6) + 4*NUMNOZ
hangerRows = 2 + 5*H + 5*ceil(H/6)
postRows   = prefixRows + 4
```

It then reconstructs the complete expected variable-length postimage from untouched TARGET0 bytes and requires exact equality with actual post bytes. Writer mutation/delete-plan ledgers remain testimony only.

### QF-1020-001

First validator draft independently authorized bytes correctly but did not require `writerResult.byteString` and `writerResult.deletePlan` testimony to be present.

Hardened result contract now requires:

```text
schema/status/writer/family
exact byteString == actual post bytes
mutation count
hanger before/after counts
before/after byte lengths
delete-plan testimony matching independent plan
```

This does not elevate writer testimony to authority; exact independent postimage equality remains the authorization gate.

## Stable HANGER blockers

```text
WRITER_2_HANGER_PARTIAL_MULTI_RECORD_TAIL_ORDER_UNQUALIFIED
WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
```

Do not infer partial H>1 record ordering from either repository emitter until the conflict is independently source-qualified.

## Real physical oracle

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
NUMELT = 40
NUMNOZ = 0
NOHGRS = 1
hanger node = 205
MISCEL_1 rows before = 23
MISCEL_1 rows after  = 11
```

PR1020 regression authors the full physical writer + re-intake + independent validator path for this case.

## Current validation truth

```text
PR1019 merge / PR1020 base grounding                  PASS
physical writer source audit                         PASS_SOURCE_INSPECTION
independent validator source audit                   PASS_SOURCE_INSPECTION
QF-1020-001 result-testimony hardening               PASS_SOURCE_INSPECTION
exact repository checkout                            BLOCKED_ENVIRONMENT_DNS
focused PR1020 JS regression                         AUTHORED_NOT_RUN_ENVIRONMENT
merged PR1019 planner regression                     NOT_RUN_ENVIRONMENT
Writer2 NODENAME/SIF regressions                     NOT_RUN_ENVIRONMENT
full repository tests                                NOT_RUN_ENVIRONMENT
browser/product                                      NOT_RUN_ENVIRONMENT
```

Observed environment blocker:

```text
Could not resolve host: github.com
```

No unexecuted test is represented as PASS.

See `agents/PR1020_workreport.md`, `agents/status/PR1020.yaml`, and `agents/claims/PR1020.yaml`.
