# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1017 | Writer 2 composite product/core routing | DRAFT / ACTIVE | Explicit Writer2 requalification of NODENAME CREATE/DELETE + V11 SIF existing-block DELETE; composite readiness/apply/validation; Writer1B default preserved | Run focused/repository/browser/real-CII qualification; do not merge without fresh owner authority |
| PR1016 | Writer 2 one-original-preimage NODENAME + V11 SIF DELETE composite | MERGED 2026-08-21 · `5a160285` | Canonical PR1001 parent-scope custody; derived family subsets; original-coordinate claim arbitration; one patch; independent full-postimage validator | Product/core route now being adopted by PR1017 |
| PR1015 | Writer 2 V11 SIF/TEE physical DELETE Phase-4B | MERGED 2026-08-21 · `d5ecd8ac` | CONTROL SIF count + exact ELEMENT SIF pointers + byte-preserved SIF payload deletion; independent complete-postimage validator | Reused unchanged by PR1016/PR1017 |
| PR1014 | Writer 2 V11 SIF/TEE DELETE relocation authority | MERGED 2026-08-21 · `9a2984cb` | DELETE-only exact owner binding, shared-pointer veto, 10-row compaction, complete old→new pointer mapping; CREATE blocked | Reused unchanged |
| PR1013 | Writer 2 NODENAME product/core routing | MERGED 2026-08-21 · `70c7004f` | Initial explicit Writer2 NODENAME CREATE/DELETE product route and byte export | Product transaction boundary superseded by PR1017; standalone NODENAME authority retained |
| PR1012 | Writer 2 NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT NODENAME pointers + variable-length NODENAME payload; independent exact-postimage validator | Reused unchanged as component authority |
| PR1011 | Writer 2 NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation, compaction, complete pointer relocation | Reused unchanged |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite | MERGED 2026-08-21 · `7c1b7df0` | Qualified Writer1 family claims from one untouched TARGET with independent final authorization | Architectural precedent |
| PR1009 | Writer 1C V11 selected SIF fields | MERGED 2026-08-20 · `d63e8c59` | Existing V11 block; selected ii/io fields only | Existing field-level authority preserved |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical ELEMENT/NODENAME binding | Physical custody foundation |
| PR1006 | V11 SIF/TEE field qualification | MERGED 2026-08-20 · `430b2b0e` | Items 1..26 named; items 27..30 unresolved | Governs SIF CREATE blocker |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Writer1 fixed fields; Writer2 cardinality/pointers; Writer3 topology | Governing architecture |
| PR1001 | Explicit APPLY / EXCLUDE transfer scope | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + candidate/APPLY/EXCLUDE operation-set custody | Governing transaction scope |
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

Writer 2
  NODENAME CREATE/DELETE component authority        MERGED
  V11 existing SIF 10-row block DELETE authority   MERGED
  one-original-preimage mixed composite             MERGED PR1016
  product/core composite route                      PR1017

Writer 3
  topology mutation only
```

## PR1017 product transaction

The base engineering-delta layer already exposes qualified pointer-presence evidence:

```text
category  = SIF_TEE
property  = SIF/Tee record presence
authority = ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD
```

The generic transfer policy remains deliberately conservative and unchanged. Changed SIF presence is BLOCKED there because generic Writer1/default paths do not have cardinality authority.

PR1017 adds a Writer2-only requalification layer:

```text
raw auditable base transfer plan
 |-- NODENAME family -> merged Writer2 NODENAME routing contract
 |-- SIF presence    -> merged Writer2 SIF DELETE routing contract
 |-- KEEP            -> preserve
 `-- any other mutable family -> BLOCKED

explicit PR1001 APPLY / EXCLUDE scope
 -> composite readiness against current TARGET graph
 -> merged PR1016 one-original-preimage composite
 -> re-intake binary bytes
 -> merged PR1016 independent composite validator
 -> binary-authoritative Modified_Target.CII
```

Qualified Writer2 product APPLY shapes:

```text
NODE_NAME / Node name / to-name / CREATE
NODE_NAME / Node name / to-name / DELETE
SIF_TEE / SIF/Tee record presence / DELETE
```

Either family alone or both together may be selected.

Still prohibited:

```text
NODENAME overwrite                       -> Writer1C
SIF CREATE                               -> WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30
PROCESS                                  -> unsupported Writer2
restraint cardinality                    -> unsupported Writer2
hanger cardinality                       -> unsupported Writer2
topology/connectivity mutation           -> Writer3
```

## Isolation requirements

Writer2 deliberately remains on base engineering deltas:

```js
if (version === '2') {
  engineeringDeltas = baseDeltas;
}
```

Therefore Writer2 does not inherit Writer1B process/restraint augmentation or Writer1C selected-field augmentation.

No option supplied still resolves to Writer1B. The product tile does not silently opt into Writer2.

The old product-level direct NODENAME sequence is removed from core:

```text
NOT product boundary:
applyCiiWriter2NodeNameRelocation
validateCiiWriter2NodeNameRoundTrip

CURRENT product boundary:
applyCiiWriter2Composite
validateCiiWriter2CompositeRoundTrip
```

Standalone NODENAME and SIF modules remain component authorities and regressions; they are not deleted or semantically widened.

## Current validation truth

```text
PR1016 merge / PR1017 base grounding                  PASS
branch ancestry                                       PASS_GIT_COMPARE
base SIF-presence delta grounding                     PASS_SOURCE_INSPECTION
generic SIF-cardinality policy grounding              PASS_SOURCE_INSPECTION
core composite dispatch source audit                  PASS_SOURCE_INSPECTION
scope composite readiness source audit                PASS_SOURCE_INSPECTION
focused composite product-routing regression          AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 NODENAME product regression         AUTHORED_NOT_RUN_ENVIRONMENT
PR1016 mixed composite regression                     NOT_RUN_ENVIRONMENT
Writer2 component regressions                         NOT_RUN_ENVIRONMENT
full repository tests                                 NOT_RUN_ENVIRONMENT
browser scoped Writer2 flow                           NOT_RUN_ENVIRONMENT
real-CII mixed export/re-intake                       NOT_RUN_ENVIRONMENT
```

No unexecuted test is represented as PASS.

See `agents/PR1017_workreport.md`, `agents/status/PR1017.yaml`, and `agents/claims/PR1017.yaml`.
