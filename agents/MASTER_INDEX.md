# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`; this index is the repo-wide coordination and continuation view.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1008 | Writer 1C Phase-1 exact ELEMENT/NODENAME custody hardening | MERGED 2026-08-20 · `cd09968c` | Writer1C mutation requires exact parsed-index + physical 15-row block + FROM/TO binding; endpoint fallback is read-only/blocking | Preserve this authority in all future Writer1C work |
| PR1006 | Writer 1C Phase-2A SIF/TEE qualification | ACTIVE / DRAFT / `BLOCKED_V11_POSITION_AUTHORITY_UNRESOLVED` | V12 neutral map is qualified as V12 reference only; canonical TARGET1 advertises V11; canonical SIF Writer-eligible positions = 0 | Obtain official V11 neutral item3/item4 positions or authoritative V11/V12 equivalence statement; no Phase2B mutation before this gate |
| PR1004 | Writer 1C Phase-1 NODENAME byte-custody implementation | MERGED 2026-08-20 · `692be3fd` | original-byte existing-row NODENAME COPY; independent `S_auth`; equal-width byte patch; repo-wide `npm test` retained NOT_RUN | Historical foundation |
| PR1002 | Writer 1C authority + future Writer roadmap | MERGED 2026-08-20 · `77fecdc` | original TARGET bytes; independent `S_auth`; Writer testimony is not authority; Writer2/3 boundaries | Historical authority contract |
| PR1001 | Explicit APPLY / EXCLUDE transfer-scope custody | MERGED 2026-08-19 · `5a5fa0ae` | target/source hash + operation-set custody | Historical |
| PR992 | Target Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | qualified fixed fields and existing restraint slice | Historical |
| PR991 | Target Writer 1A | MERGED 2026-08-19 · `edf297f7` | initial fixed-field writer slice | Historical |

## Current Writer 1C production authority

```text
original TARGET byte stream
 -> exact physical custody
 -> explicit APPLY scope
 -> independently derived S_auth
 -> equal-width byte patch
 -> re-intake
 -> independent structural / semantic / byte assurance
```

For NODENAME, PR1008 strengthens the physical binding condition to:

```text
parsed ELEMENT index == physical 15-row block index
AND parsed FROM == physical FROM
AND parsed TO == physical TO
```

Endpoint-only fallback may support read-only evidence but cannot qualify mutation custody.

Definitions remain:

```text
S_auth = validator-derived authorized span union
B      = Writer-reported span union / testimony
D      = actual changed-byte indices
PASS   => D ⊆ S_auth
```

## Current SIF/TEE authority

The canonical TARGET1 header is:

```text
#$ VERSION
    5.00000      11.0000        1256
```

Official Hexagon Version-12 neutral documentation establishes for **V12 only**:

```text
2 tee slots
30 items per tee
5 rows per tee
10 rows total
item3 = In-Plane SIF (ii)
item4 = Out-Plane SIF (io)
```

The V11/2019 product guide corroborates engineering semantics/domain but is not neutral-file item-position authority. Later official neutral documentation demonstrates edition drift, so V12 positions cannot be silently backported to V11.

Current verdict:

```text
VERSION12_REFERENCE_VERDICT            = READY_FOR_V12_SELECTED_SIF_FIELDS
CANONICAL_V11_WRITER_VERDICT           = BLOCKED_V11_POSITION_AUTHORITY_UNRESOLVED
CANONICAL_WRITER_ELIGIBLE_SIF_POSITIONS = 0
```

Existing product blockers remain in force. PR1006 contains qualification/recovery artifacts only; it does not alter Writer, transfer-policy, converter or workflow production sources.

## Phase boundaries

- Phase 1: existing-row NODENAME — implemented and hardened in PR1004/PR1008.
- Phase 2A: SIF/TEE source qualification — active in PR1006 and blocked for canonical V11 positional authority.
- Phase 2B: field-specific existing-block ii/io mutation — **do not start** until the V11 position/equivalence gate is source-qualified.
- Writer 2: pointer/cardinality changes, record create/delete/reindex, hanger packed arrays/CONTROL counts.
- Writer 3: node/element/connectivity/topology mutation.

## PR1006 unblocking evidence

One of the following is required:

1. official CAESAR II Version 11 neutral-file `#$ SIF&TEES` specification mapping item3/item4; or
2. authoritative Hexagon statement proving V11/V12 `SIF&TEES` item3/item4 positional equivalence.

Benchmark occurrence, zero values, parser arithmetic, or V11 UI semantics are insufficient substitutes.

See `agents/PR1006_workreport.md`, `agents/status/PR1006.yaml`, `agents/claims/PR1006.yaml`, `docs/cii-writer1c-sif-field-qualification.md`, and Issue #1005.
