# PR1039 work report — Writer2 W2.9 RESTRAINT cardinality qualification

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ISSUE_1038_QUALIFICATION_SCOPE
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1038
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1038
PR: #1039
BRANCH: agent/cii-writer2-restraint-cardinality-w29
BASE_MAIN: ff9d706796e42a43ebfb1c74696350e9b8cc695b
REPORT_BASIS_HEAD: 857c85e39cdd85988144eee53a0526f594615270
CURRENT_STAGE: W2_9_RESTRAINT_CARDINALITY_QUALIFICATION_COMPLETE_NOT_READY
FINAL_VERDICT: NOT_READY_FOR_WRITER2_RESTRAINT_CARDINALITY_PLANNER
PHYSICAL_WRITER_AUTHORITY: FALSE
COMPOSITE_PRODUCT_AUTHORITY: FALSE
WRITER1B_FREE_SLOT_AUTHORITY: PRESERVED
```

## Handover in 60 Seconds

W2.9 follows merged W2.5 PR #1037. SIF CREATE W2.1 remains NOT_READY in draft PR #1033, blocking W2.2-W2.4. HANGER CREATE W2.5 merged with a NOT_READY verdict, blocking W2.6-W2.8. W2.9 is therefore the next independent Writer2 roadmap phase.

The investigation proves the structural restraint block model and deterministic DELETE-compaction index arithmetic, but generic CREATE-capable cardinality planning remains source-incomplete.

Final verdict:

```text
NOT_READY_FOR_WRITER2_RESTRAINT_CARDINALITY_PLANNER
```

No Writer2 restraint-cardinality planner or physical writer has been added.

## Live grounding epoch GE-1039-001

Starting live authority:

```text
main
  ff9d706796e42a43ebfb1c74696350e9b8cc695b

PR1039 branch
  agent/cii-writer2-restraint-cardinality-w29

source issue
  #1038

coordination
  PR1033 active qualification only
  no RESTRAINT production/test authority overlap
  shared agents/MASTER_INDEX.md requires preservation

classification
  SAFE_WITH_SHARED_INDEX_RECONCILIATION
```

A full clone was attempted and failed before checkout because the environment could not resolve `github.com`. Exact-checkout runtime is therefore retained as `NOT_RUN_ENVIRONMENT`.

## Mission boundary

W2.9 may source-qualify and, only if READY, implement a deterministic cardinality planner.

It must not modify:

```text
Writer1B fixed-slot CREATE/CLEAR
production physical writer
one-TARGET0 composite routing
product/core routing
UI/browser
SIF CREATE
HANGER CREATE
Writer3 topology
workflow/package scripts
```

## Existing Writer1B authority preserved

Merged Writer1B already owns:

```text
6 slots per existing restraint block
4 rows per slot
24 rows per block
CREATE into clean existing free slot
CLEAR qualified existing slot
```

Production authority/blockers retained:

```text
PROTECTED_WRITER_EXISTING_24_ROW_BLOCK_FREE_SLOT
PROTECTED_WRITER_EXISTING_24_ROW_BLOCK_EMPTY_SLOT_TEMPLATE
RESTRAINT_TARGET_FREE_SLOT_REQUIRED
```

Therefore:

```text
existing free slot -> Writer1B
new block required -> Writer2 true-cardinality domain
```

## Source findings

### Exact V11 Piping Input authority

Vendor-authored Version 2019 (11.0) User's Guide establishes:

```text
up to six restraints per element
Node required
Type required
other input optional
blank stiffness -> rigid support behavior
Tag user input
Support GUID may be imported by PCF mapping
```

Most important:

```text
restraint GUID is software-assigned
restraint GUID is display-only in the Restraints list input
```

No external neutral-file GUID generation rule was found.

### CONTROL count

Official Hexagon neutral-file help defines CONTROL auxiliary item 4 as:

```text
number of restraint auxiliary data blocks
```

This is block cardinality, not occupied restraint-slot cardinality.

### Physical neutral block

Vendor neutral-format authority plus V12 official corroboration defines:

```text
IEL item4 -> restraint auxiliary pointer
pointer 0 -> no restraint auxiliary data
six possible restraints per auxiliary block
nine numeric fields per restraint
Support TAG
Support GUID
blank string -> length 0
```

Current merged physical custody establishes the pointer as a 1-based 24-row block index for the supported route.

### Repository converter

`converters/scripts/inputxml_to_cii2019.py` emits:

```text
6 x 4 = 24 rows per block
one block for each element with restraints
next sequential block index
empty numeric/template rows
blank TAG/GUID for unused slots
```

This is repository converter policy/corroboration, not universal vendor CREATE authority.

## Real-source census

Observed block counts:

```text
BM_CII_SOURCE.CII                 7
BM_CII_TARGET1.CII                7
BM_CII_TARGET2.CII                7
SOURCE 3.CII                    132
TARGET 3-1.CII                  135
inputxml_profile_bm_cii_2019      8
Benchmark/Pipeline/CII            0
output.cii                        0
legacy sys30 profile              3  // unsupported W2.9 layout signature
```

`SOURCE 3.CII` explicitly identifies CAESAR II Neutral file interface Ver 11.00.

Real source inspection shows occupied slots plus zero/blank empty slots in 24-row blocks.

No controlled native before/after restraint-block CREATE or DELETE transition was found.

## Qualified DELETE-compaction arithmetic

For original positive block pointer `p` and deleted old block set `D`:

```text
newPointer(p) = p - count(d in D where d < p)
```

Deleted block indices map to zero in the old-to-new block map.

Examples:

```text
3 blocks, delete 2
  {1:1, 2:0, 3:2}

3 blocks, delete 1
  {1:0, 2:1, 3:2}

3 blocks, delete 3
  {1:1, 2:2, 3:0}

5 blocks, delete 2 and 4
  {1:1, 2:0, 3:2, 4:0, 5:3}
```

CONTROL and physical consequences:

```text
blockCountAfter = blockCountBefore - deletedBlockCount
RESTRANT rowsAfter = 24 * blockCountAfter
```

Classification:

```text
PASS_DERIVED_FROM_DIRECT_FORMAT
```

This is not planner or physical-write authority.

## Hard blockers

```text
B01 RESTRAINT_GUID_SOFTWARE_ASSIGNED_CREATE_RULE_UNRESOLVED
B02 RESTRAINT_TYPE_DEPENDENT_CREATE_DEFAULTS_INCOMPLETE
B03 NEW_RESTRAINT_BLOCK_ALLOCATION_POLICY_NOT_VENDOR_QUALIFIED
B04 NATIVE_RESTRAINT_BLOCK_CREATE_TRANSITION_NOT_AVAILABLE
B05 SHARED_POINTER_ALIAS_SEMANTICS_NOT_SOURCE_QUALIFIED
B06 FULL_REPOSITORY_POINTER_ALIAS_CENSUS_NOT_EXECUTED
```

B01-B04 independently block generic CREATE-capable planner authority.

## Recommended future split

A future issue may separately qualify:

```text
RESTRAINT_BLOCK_DELETE_COMPACTION
```

with unique/unambiguous owner custody, fail-closed alias behavior and one deterministic old-to-new block map.

Separately:

```text
RESTRAINT_BLOCK_CREATE_ALLOCATION
```

must remain blocked until GUID/default/allocation authority is complete.

This recommendation is not implementation authority.

## R01-R18 disposition

```text
R01 free slot                         Writer1B only
R02 no free slot                      generic CREATE blocked
R03 pointer=0 first block             generic CREATE blocked
R04 slot clear/block occupied         Writer1B fixed-capacity
R05 last occupied slot                delete-compaction candidate only
R06 middle block remove               relocation arithmetic qualified
R07 first block remove                relocation arithmetic qualified
R08 last block remove                 relocation arithmetic qualified
R09 new-block allocation order        unresolved
R10 shared pointer alias              block unless qualified
R11 duplicate claims                  canonicalize only with complete identical ownership or block
R12 conflicting same-block claims     block
R13 stale TARGET                      block
R14 CONTROL count mismatch            block
R15 row count not multiple of 24      block
R16 CREATE GUID/default unresolved     block
R17 unsupported edition/layout        block
R18 node/element topology change      Writer3
```

## Validation ledger

```text
exact V11 restraint input semantics
  PASS_VENDOR_AUTHORED_EXACT_VERSION_MIRROR

exact V11 GUID software-assigned/display-only
  PASS_VENDOR_AUTHORED_EXACT_VERSION_MIRROR

official Hexagon CONTROL block-count semantics
  PASS_OFFICIAL_HEXAGON_SOURCE

neutral six-slot + TAG/GUID physical format
  PASS_VENDOR_NEUTRAL_DOCUMENTATION
  + PASS_OFFICIAL_HEXAGON_V12_CORROBORATION

Writer1B boundary
  PASS_MERGED_SOURCE_INSPECTION

repository converter policy
  PASS_SOURCE_INSPECTION_REPOSITORY_POLICY_ONLY

real V11 multi-block CII availability
  AVAILABLE / PASS_REMOTE_SOURCE_INSPECTION

native CREATE transition
  NOT_AVAILABLE

native DELETE compaction transition
  NOT_AVAILABLE

full pointer-alias census
  NOT_RUN_ENVIRONMENT

qualification sentinel
  AUTHORED / NOT_RUN_ENVIRONMENT

repository-wide npm test
  NOT_RUN_ENVIRONMENT

browser/product
  NOT_APPLICABLE_NO_PRODUCTION_ROUTE_CHANGE
```

No unexecuted check is reported as PASS.

## Changed-file ledger

Final intended scope:

```text
agents/MASTER_INDEX.md
agents/PR1039_workreport.md
agents/claims/PR1039.yaml
agents/status/PR1039.yaml
docs/cii-writer2-restraint-cardinality-field-map.csv
docs/cii-writer2-restraint-cardinality-qualification.md
docs/cii-writer2-restraint-cardinality-real-source-census.csv
docs/cii-writer2-restraint-cardinality-source-ledger.csv
tests/cii-workspace-writer2-restraint-cardinality-qualification.test.js
```

Expected:

```text
intended paths    9
production paths  0
unexplained       0
```

Final GitHub reconciliation must replace expectation with observed counts before review-ready disposition.

## Exact next action

Not a generic W2.10 implementation.

Either:

```text
A. acquire source authority for GUID/default/allocation semantics and resume W2.9
```

or explicitly create a narrower successor issue for:

```text
B. RESTRAINT_BLOCK_DELETE_COMPACTION qualification/planner only
```

No merge without fresh owner authorization.

## Appendix A — expert takeover gate

1. Why is an existing clean free slot Writer1B while a new seventh slot/block is Writer2?
2. Prove the current pointer unit and physical span for restraint pointer `p`.
3. What exactly does CONTROL restraint count represent?
4. Derive the old-to-new map for blocks 1..5 when blocks 2 and 4 are removed.
5. Why must a pointer to a removed block never be silently redirected?
6. What source establishes the restraint GUID owner, and why does it block generic Writer CREATE?
7. Which repository converter behaviors are policy rather than vendor neutral requirements?
8. Why do real 132/135-block files strengthen physical custody but not prove CREATE?
9. Define the conditions under which an entire block can be removed rather than one slot merely cleared.
10. How must shared-pointer aliases be handled before block deletion?
11. Define the later independent full-postimage oracle for a variable-length RESTRANT compaction.
12. State every condition that keeps the generic W2.9 planner NOT_READY.
