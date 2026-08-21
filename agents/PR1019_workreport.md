# PR1019 — Writer 2 canonical HANGER DELETE authority

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: #1019
BRANCH: agent/cii-writer2-hanger-delete-authority
BASE: main@887eedc028f64e3831b28fb755fdbe9ed904682f
MISSION: qualify canonical existing HANGER DELETE record-index compaction before any physical writer
CURRENT_STAGE: DELETE_PLANNER_IMPLEMENTED / DRAFT / REPOSITORY_RUNTIME_NOT_RUN
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
```

## 1. Scope

PR1019 introduces a Writer-2 **planner/readiness contract only** for deleting existing hanger records from the canonical CAESAR II 2019 `MISCEL_1` layout.

Implemented:

```text
HANGER presence DELETE routing
canonical physical custody
record-index parallel-array compaction
real BM_CII_SOURCE node-205 planner oracle
CREATE hard blocker
alternate-layout mutation blocker
```

Not implemented:

```text
physical CONTROL/MISCEL_1 rewrite
independent physical postimage validator
Writer2 composite adoption
product/core routing
browser/UI changes
HANGER CREATE
```

## 2. Source authority inspected

Repository source:

```text
converters/scripts/cii2019_section_rules.py
converters/scripts/cii2019_hanger_miscel_control.py
converters/scripts/cii2019_miscel_hardener.py
tabs/cii-workspace/cii-workspace-hanger.js
parser/fixed-field.js
Benchmark/CIICompare/BM_CII_SOURCE.CII
```

Protected converter corroboration, read-only:

```text
repository: reallaksh19/3D_Converters
commit observed: ad71a42af34afef565ea4645de83d0613996a106
file: converters/scripts/cii2019_hanger_miscel_control.py
```

The neutral-file section rules establish the canonical hanger layout:

```text
RRMAT                         ceil(NUMELT/6)
VFLEX                         4*NUMNOZ
2 hanger default rows
IHGRNODE                      ceil(H/6)
HGRDAT                        2*H
TAG/GUID                      2*H
IHGRFREE                      H
IHGRNUM                       ceil(H/6)
IHGRTABLE                     ceil(H/6)
IHGRSHORT                     ceil(H/6)
IHGRCN                        ceil(H/6)
4 execution rows
```

For H>0:

```text
hanger payload rows = 2 + 5*H + 5*ceil(H/6)
```

## 3. Authority decision

Only this physical layout is mutation-qualified in PR1019:

```text
CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

These remain blocked:

```text
INPUTXML_CURRENT_HGRDAT_FIRST
MULTIPLE_LAYOUTS_SAME_IHGRNODE
unresolved layout
```

Reason: DELETE is safe only when old hanger record index `i` is provably the same record across all parallel hanger arrays.

## 4. Record-index invariant

For each old record index `i`, one logical hanger owns:

```text
IHGRNODE[i]
HGRDAT[i]       two rows
TAG/GUID[i]     two rows
IHGRFREE[i]     one row
IHGRNUM[i]
IHGRTABLE[i]
IHGRSHORT[i]
IHGRCN[i]
```

DELETE removes the same old index from every array. Retained HGRDAT/TAG/GUID/IHGRFREE rows remain opaque; their engineering fields are not reinterpreted. Packed integer values retain exact original 13-byte field custody for a later physical writer.

Compaction example:

```text
before: 1,2,3
delete: 2
mapping:
1 -> 1
2 -> 0
3 -> 2
```

## 5. CREATE boundary

CREATE is explicitly blocked:

```text
WRITER_2_HANGER_CREATE_PAYLOAD_SEMANTICS_NOT_QUALIFIED
```

CREATE requires authoritative construction/default/sentinel semantics for every new HGRDAT value, TAG/GUID, IHGRFREE, IHGRNUM, IHGRTABLE, IHGRSHORT and IHGRCN field. Those semantics are not fully qualified by this PR.

## 6. Real physical oracle

`Benchmark/CIICompare/BM_CII_SOURCE.CII` provides:

```text
NUMELT = 40
NUMNOZ = 0
NOHGRS = 1
hanger node = 205
layout = CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

Arithmetic:

```text
RRMAT rows       ceil(40/6) = 7
hanger rows      2 + 5*1 + 5*ceil(1/6) = 12
execution rows   4
before total     23

after H=0:
RRMAT 7 + execution 4 = 11
```

Planner expectation:

```text
count 1 -> 0
old record 1 -> 0
MISCEL_1 rows 23 -> 11
hanger defaults/arrays removed
RRMAT and execution rows retained
```

## 7. Changed-file ledger

```text
tabs/cii-workspace/cii-workspace-writer2-hanger-delete.js
  new planner/readiness + canonical physical custody

tests/cii-workspace-writer2-hanger-delete-plan.test.js
  canonical middle-delete, CREATE blocker, alternate-layout blocker, real benchmark oracle

docs/cii-writer2-hanger-delete-authority.md
  source and authority record

agents/PR1019_workreport.md
agents/status/PR1019.yaml
agents/claims/PR1019.yaml
agents/MASTER_INDEX.md
  recovery / continuity only
```

No existing parser, Writer1, Writer2 product/core, UI, benchmark CII, or protected converter file is modified.

## 8. Validation truth

```text
PR1018 merge / PR1019 base grounding                   PASS
canonical hanger source/shape review                   PASS_SOURCE_INSPECTION
protected converter corroboration                      PASS_SOURCE_INSPECTION
BM_CII_SOURCE real physical oracle inspection          PASS_SOURCE_INSPECTION
independent row/mapping arithmetic                     PASS_INDEPENDENT_ARITHMETIC
focused JS regression                                  AUTHORED_NOT_RUN_ENVIRONMENT
inherited hanger custody regression                    NOT_RUN_ENVIRONMENT
Writer2 regression suite                               NOT_RUN_ENVIRONMENT
full repository tests                                  NOT_RUN_ENVIRONMENT
browser/product                                        NOT_RUN_ENVIRONMENT
```

Exact checkout remains unavailable in the current environment because `github.com` DNS resolution fails. No unexecuted test is represented as PASS.

## 9. Exact next phase after acceptance

Implement a separate physical HANGER DELETE PR:

```text
untouched TARGET bytes
 + accepted PR1019 delete plan
 -> rewrite CONTROL.NOHGRS exact 13-byte field
 -> rebuild complete canonical MISCEL_1 payload
    retain RRMAT/VFLEX original rows
    retain hanger defaults only if H_after > 0
    retain selected HGRDAT/TAG/GUID/IHGRFREE rows byte-for-byte by old record index
    repack retained packed-array fields without changing retained 13-byte values
    retain execution rows byte-for-byte
 -> one variable-length byte transaction
 -> re-intake
 -> independently rebuild complete expected postimage
 -> PASS iff actual bytes == expected bytes
```

Do not add HANGER CREATE in that phase.

## Appendix A — takeover qualification

1. Why is `CONTROL.NOHGRS + IHGRNODE` alone insufficient to authorize deletion?
2. State the canonical `MISCEL_1` hanger row formula for H>0.
3. Why must record index `i` be removed from all eight hanger data families together?
4. Why can HGRDAT remain semantically opaque for DELETE but not CREATE?
5. Why is `INPUTXML_CURRENT_HGRDAT_FIRST` blocked despite being parser-readable?
6. For H=3 deleting record2, give the exact old→new mapping.
7. For BM_CII_SOURCE, derive 23 rows before and 11 after deletion.
8. Which exact CONTROL field must the physical writer later mutate?
9. What evidence must an independent postimage validator rebuild without trusting writer testimony?
10. Which changes belong to Writer3 rather than Writer2?
