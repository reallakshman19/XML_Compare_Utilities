# Writer 2 — canonical HANGER DELETE authority

## Status

This document qualifies a **planner only** for deleting existing hanger records from the canonical CAESAR II 2019 `MISCEL_1` hanger layout.

It does **not** qualify a physical writer and it does **not** qualify HANGER CREATE.

Policy token:

```text
CII_WRITER_2_HANGER_DELETE_COMPACTION
```

CREATE blocker:

```text
WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
```

## Source basis

Repository source `converters/scripts/cii2019_section_rules.py` records the neutral-file hanger layout used for CII 2019:

```text
CONTROL row 1:
NUMELT, NUMNOZ, NOHGRS, NONAM, NORED, NUMFLG

MISCEL_1 prefix:
RRMAT                         ceil(NUMELT / 6) rows
VFLEX                         4 * NUMNOZ rows

hanger payload, when H=NOHGRS > 0:
2 default/header rows
IHGRNODE                      ceil(H / 6) packed rows
HGRDAT                        2 * H rows
TAG/GUID                      2 * H rows
IHGRFREE                      1 * H rows
IHGRNUM                       ceil(H / 6) packed rows
IHGRTABLE                     ceil(H / 6) packed rows
IHGRSHORT                     ceil(H / 6) packed rows
IHGRCN                        ceil(H / 6) packed rows

MISCEL_1 suffix:
execution options             4 rows
```

Therefore the canonical hanger payload row count is:

```text
H <= 0: 0
H > 0 : 2 + 5*H + 5*ceil(H/6)
```

and the complete canonical nonblank `MISCEL_1` payload count is:

```text
ceil(NUMELT/6)
+ 4*NUMNOZ
+ hanger_payload_rows(H)
+ 4
```

`converters/scripts/cii2019_hanger_miscel_control.py` and `converters/scripts/cii2019_miscel_hardener.py` independently emit the same index-parallel array structure: one hanger order drives IHGRNODE, HGRDAT, TAG/GUID, IHGRFREE, IHGRNUM, IHGRTABLE, IHGRSHORT, and IHGRCN.

`tabs/cii-workspace/cii-workspace-hanger.js` already qualifies `CONTROL.NOHGRS` plus `MISCEL_1.IHGRNODE` node presence and identifies the canonical layout as:

```text
CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

The alternate parser-compatible layout:

```text
INPUTXML_CURRENT_HGRDAT_FIRST
```

is **read-compatible only for this phase** and is not Writer-2 DELETE-authorized.

## Why DELETE can be qualified before CREATE

Deleting an existing record does not require interpretation or synthesis of every hanger engineering field if the following stronger record-index invariant is enforced:

```text
record i in IHGRNODE
record i's 2 HGRDAT rows
record i's 2 TAG/GUID rows
record i's IHGRFREE row
record i in IHGRNUM
record i in IHGRTABLE
record i in IHGRSHORT
record i in IHGRCN

all belong to the same hanger record i.
```

Writer-2 DELETE therefore removes the **same old record index** from every array.

Opaque retained HGRDAT/TAG/GUID/IHGRFREE rows are not reinterpreted. Packed integer arrays are retained as exact original 13-byte fields by record index so a later physical writer can repack them without changing the retained field bytes.

CREATE is different. It would require authoritative construction/default/sentinel semantics for every new HGRDAT value, TAG/GUID representation, IHGRFREE value, IHGRNUM, IHGRTABLE, IHGRSHORT, IHGRCN and their relationship to the new node. Those semantics are not fully qualified here.

## Canonical physical custody gates

The planner requires all of the following:

1. explicit `BOUND` transfer scope;
2. original TARGET byte custody;
3. qualified existing hanger node custody;
4. physical layout exactly `CAESAR_SYNCHRONIZER_IHGRNODE_FIRST`;
5. `CONTROL.NOHGRS` exact field at CONTROL row 1, field 3, width 13;
6. `CONTROL.NOHGRS == hangerEvidence.count`;
7. exact canonical nonblank `MISCEL_1` row count from the formula above;
8. no blank physical rows inside the canonical `MISCEL_1` payload;
9. all five packed H-length arrays contain exactly H integer fields and no trailing nonblank value;
10. physical IHGRNODE order equals the qualified `hangerEvidence.nodes` order;
11. each DELETE operation is REVIEWED/LOCKED and targets exactly one node;
12. every physical hanger record at the selected node is deleted;
13. no other APPLY family is admitted by this planner.

If any gate fails, deletion is blocked.

## Compaction rule

For H existing records and deleted old record-index set D:

```text
old index i in D     -> 0
old index i not in D -> sequential retained index 1..H-|D|
```

Example:

```text
before record indices: 1,2,3
delete record:          2

after mapping:
1 -> 1
2 -> 0
3 -> 2
```

The same retained index set `{1,3}` must be used for HGRDAT groups, TAG/GUID groups, IHGRFREE rows and every packed array. A family-specific or last-writer-wins index is prohibited.

When all hangers are deleted:

```text
NOHGRS -> 0
hanger header/default rows -> removed
IHGRNODE/HGRDAT/TAG/GUID/IHGRFREE/packed arrays -> removed
RRMAT/VFLEX -> retained
4 execution-option rows -> retained
```

## Real benchmark physical oracle

`Benchmark/CIICompare/BM_CII_SOURCE.CII` provides a real canonical case:

```text
NUMELT = 40
NUMNOZ = 0
NOHGRS = 1
hanger node = 205
```

The observed canonical `MISCEL_1` arithmetic is:

```text
RRMAT                    ceil(40/6) = 7
hanger payload           2 + 5*1 + 5*ceil(1/6) = 12
execution rows           4
complete payload         7 + 12 + 4 = 23 rows
```

Deleting the only hanger therefore projects:

```text
NOHGRS                    1 -> 0
old record 1              -> 0
MISCEL_1 payload rows     23 -> 11
                         = 7 RRMAT + 4 execution
```

This benchmark is used as a physical-custody oracle only. No production bytes are changed in this PR.

## Explicit exclusions

This phase does not authorize:

```text
HANGER CREATE
HANGER overwrite / attribute editing
alternate INPUTXML_CURRENT layout mutation
ambiguous SAME_NODES dual-layout mutation
nozzle VFLEX interpretation or mutation
RRMAT mutation
execution-option mutation
physical MISCEL_1 rewrite
product/core Writer-2 routing
Writer-3 topology mutation
```

The next phase, only after this planner is accepted, is a physical HANGER DELETE writer that rebuilds `CONTROL.NOHGRS` and the complete `MISCEL_1` expected postimage from one untouched TARGET preimage and validates full byte equality independently.
