# PR1043 work report — Writer2 W2.11 RESTRAINT block DELETE physical writer

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_WITH_EXPLICIT_EXECUTION_LIMITATION
PR_RECOVERY_STATE: ACTIVE / SOURCE-CORRECTED
EXECUTION_MODE: AUTO_MODE
SCOPE_AUTHORITY: ISSUE_1042_COMPONENT_PLUS_INHERITED_AUTHORITY_CORRECTION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1042
PR: #1043
BRANCH: agent/cii-writer2-restraint-delete-physical-w211
BASE_MAIN: f298aa10eba7d2125a9c0f6818e4727b6f4ef0c3
CURRENT_MAIN: f298aa10eba7d2125a9c0f6818e4727b6f4ef0c3
REBASE: NO-OP / NOT PERFORMED / BASE ALREADY CURRENT
GENERIC_RESTRAINT_CREATE: BLOCKED_UNCHANGED
COMPOSITE_PRODUCT_AUTHORITY: FALSE
WRITER1B_FREE_SLOT_AUTHORITY: PRESERVED
EXACT_BRANCH_RUNTIME: NOT_RUN_ENVIRONMENT
```

## 1. Recovery finding

The requested rebase was audited first. `main` has not moved since PR1043 was opened:

```text
main      = f298aa10eba7d2125a9c0f6818e4727b6f4ef0c3
PR base   = f298aa10eba7d2125a9c0f6818e4727b6f4ef0c3
```

A rebase would therefore be a meaningless history rewrite and was not performed.

During source audit, a critical inherited W2.10 authority defect was found before continuing W2.11.

### ISS-W2.10-CONTROL-RESTRAINT-COUNT

The merged W2.10 planner read:

```js
const rows = sectionRows(raw, 'CONTROL');
const values = decodeCiiNumericRow(rows[0] || '');
const count = Number(values?.[3]);
```

That is `CONTROL` row 1 field 4, which is `NONAM`, not the restraint-block count.

Repository CONTROL authority is:

```text
row 1: NUMELT, NUMNOZ, NOHGRS, NONAM, NORED, NUMFLG
row 2: BENDS, RIGIDS, EXPJTS, RESTRAINTS, DISPLMNT, FORCMNT
row 3: UNIFORM, WIND, OFFSETS, ALLOWBLS, SIF&TEES, IZUP
row 4: EQUIPMNT
```

Therefore RESTRAINT count authority is:

```text
CONTROL row 2
field 4 (zero-based field index 3)
width = I13
```

The initial W2.11 writer and validator repeated the same inherited error and would have mutated `NONAM` while leaving the real restraint count unchanged.

This is now corrected in PR1043.

## 2. Corrective scope added to PR1043

The W2.10 planner correction is deliberately narrow:

```diff
- decodeCiiNumericRow(rows[0] || '')
+ decodeCiiNumericRow(rows[1] || '')
```

No other W2.10 planner authority is broadened.

The historical W2.10 planner test fixture is also corrected so:

```text
NONAM = 0
RESTRAINT count = actual 24-row block count
```

This prevents future tests from hiding a row-selection bug by storing the restraint count in the NONAM slot.

## 3. W2.11 physical mutation model

The component uses one untouched TARGET0 and exactly three original-coordinate claim classes:

```text
1. CONTROL row2/field4 restraint-block-count I13
2. changed ELEMENT restraint-pointer I13 fields
3. one complete RESTRANT section-payload replacement
```

The RESTRANT replacement retains complete old 24-row blocks in old-pointer order and removes only W2.10-qualified `deletedPointers`.

Pointer rewrites, section compaction and CONTROL count are all derived from the same corrected relocation plan.

Writer authority:

```text
CII_WRITER_2_RESTRAINT_BLOCK_DELETE_PHYSICAL_WRITE
```

Consumed physical authority:

```text
PROTECTED_WRITER_RESTRANT_BLOCK_INDEX_24_ROWS
EXACT_PARSED_INDEX_ENDPOINTS_AND_PHYSICAL_RESTRAINT_POINTER_I13
```

Generic restraint CREATE remains blocked.

## 4. Writer fail-closed gates

The physical writer rejects at least:

```text
blocked relocation plan
CREATE authority becoming ready
stale TARGET0 SHA
TARGET byte-length mismatch
wrong CONTROL row2/field4 preimage
stale/raw ELEMENT pointer preimage mismatch
RESTRANT row cardinality mismatch
truncated retained block
missing line ending
replacement overlap
stale replacement preimage
non-byte postimage code unit
```

The former helper-shadow defect:

```js
const target0HashCustody = target0HashCustody(targetDocument)
```

was also corrected to avoid the temporal-dead-zone runtime failure.

## 5. Cryptographic and representation custody

Preimage:

```text
SHA256_ORIGINAL_TARGET0_BYTES
```

Postimage:

```text
SHA256_WRITER2_POSTIMAGE_BYTES
CII_PHYSICAL_POSTIMAGE_REINTAKE_EQUIVALENCE
```

Writer exposes:

```text
byteString
Uint8Array bytes
canonical decoded text
mutation ledger
relocationPlan testimony
target0HashCustody
postimageHashCustody
postimageRepresentationCustody
```

Writer testimony does not define validation authority.

## 6. Independent validator

`cii-workspace-writer2-restraint-delete-validation.js` does not import the physical Writer or its payload/splice helpers.

It independently:

```text
rehashes TARGET0
rebuilds corrected W2.10 plan
locates CONTROL row2/field4
rebuilds all ELEMENT pointer replacements
rebuilds retained RESTRANT payload from TARGET0
checks claim disjointness
applies independent splice logic
requires exact complete final-byte equality first
rebuilds postimage SHA
rebuilds physical-file postimage representation
then checks Writer plan/mutation/hash/representation testimony
```

Primary PASS authority remains:

```text
actual final bytes === independently reconstructed expected final bytes
```

## 7. Qualification matrix

### Corrected W2.10 planner suite

Existing:

```text
D01-D18
H01-H05
```

The fixture now places the restraint count in CONTROL row2/field4 and leaves NONAM independent.

### W2.11 positive physical cases

```text
P01 sole block -> 0
P02 first of 3
P03 middle of 3
P04 last of 3
P05 delete {2,4} of 5
P06 pointer 0 unchanged
P19 NONAM unchanged while row2 RESTRAINT count changes
```

### W2.11 falsifiers

```text
P07 stale TARGET0 hash
P08 forged Writer deletedPointers testimony
P09 forged Writer oldToNewPointer testimony
P10 semantic pointer drift vs physical I13
P11 CONTROL restraint-count drift
P12 stale RESTRANT slot preimage
P13 overlapping replacement claims
P14 unrelated final-byte drift
P15 forged Writer mutation ledger
P16 forged postimage hash testimony
P17 forged representation testimony
P18 CREATE/new-block request
```

## 8. Evidence truth

```text
main/base equality                              PASS_SOURCE_INSPECTION
rebase required                                 NO
W2.10 CONTROL authority defect                  FOUND
W2.10 planner source correction                 APPLIED
W2.10 planner test fixture correction           APPLIED
W2.11 writer CONTROL correction                 APPLIED
W2.11 validator CONTROL correction              APPLIED
W2.11 target0 helper-shadow runtime defect      FIXED
P19 NONAM negative-assurance source             AUTHORED
exact current branch native execution           NOT_RUN_ENVIRONMENT
current-head PR workflow runs                   NONE
repository npm test                             NOT_RUN_ENVIRONMENT
browser/product                                 NOT_APPLICABLE_UNCHANGED_ROUTE
```

Do not label any runtime test PASS until it actually executes.

## 9. Current changed-file ledger

Exactly 10 paths are expected:

```text
coordination 3
  agents/PR1043_workreport.md
  agents/status/PR1043.yaml
  agents/claims/PR1043.yaml

production / authority 3
  tabs/cii-workspace/cii-workspace-writer2-restraint-delete-compaction-plan.js
  tabs/cii-workspace/cii-workspace-writer2-restraint-delete-write.js
  tabs/cii-workspace/cii-workspace-writer2-restraint-delete-validation.js

tests 4
  tests/cii-workspace-writer2-restraint-delete-compaction-plan.test.js
  tests/cii-workspace-writer2-restraint-delete-fixture.js
  tests/cii-workspace-writer2-restraint-delete-physical.test.js
  tests/cii-workspace-writer2-restraint-delete-physical-falsifiers.test.js
```

Unexpected paths: 0.

## 10. Negative assurance

```text
CONTROL.NONAM mutation authority     NOT ADDED / MUST REMAIN UNCHANGED
new restraint block allocation      NOT ADDED
GUID generation                      NOT ADDED
default/type synthesis               NOT ADDED
Writer1B free-slot code              UNCHANGED
composite Writer2 route              UNCHANGED
product/core route                   UNCHANGED
UI/browser route                     UNCHANGED
Writer3 topology                     UNCHANGED
SIF CREATE                           UNCHANGED BLOCKED
HANGER CREATE                        UNCHANGED BLOCKED
workflow/package/parser/converter    UNCHANGED
```

## 11. Remaining gate before review-ready

The source correction is complete, but exact execution remains unobserved in this runtime because direct GitHub checkout fails DNS resolution and there are no PR workflow runs on the current head.

Required execution gate when an exact checkout is available:

```text
node tests/cii-workspace-writer2-restraint-delete-compaction-plan.test.js
node tests/cii-workspace-writer2-restraint-delete-physical.test.js
node tests/cii-workspace-writer2-restraint-delete-physical-falsifiers.test.js
```

Then run the relevant inherited Writer2 regression slice and repository `npm test` according to the project qualification policy.

Until observed:

```text
ready_for_review = false
merge_authorized = false
```

## 12. Next phase after separate merge authorization

W2.12 is still the one-TARGET0 composite-adoption phase. It must not start merely because W2.11 source is present.

After PR1043 is explicitly authorized and merged, W2.12 may add RESTRAINT block DELETE to the existing Writer2 composite families while preserving one original TARGET0, original-coordinate claim arbitration and an independent complete-postimage validator.

## Appendix A — expert takeover gate

1. Which CONTROL row and field own the restraint block count, and what was wrong in merged W2.10?
2. Why must NONAM remain unchanged during a restraint block DELETE?
3. Identify the exact ELEMENT restraint-pointer row/field and I13 width.
4. Derive the pointer map for deleting blocks `{2,4}` from five.
5. Why is one complete RESTRANT payload replacement safer than 24 incremental row splices?
6. How does a deleted block with a later retained owner affect that owner's ELEMENT pointer?
7. Why does pointer `0` generate no relocation claim?
8. Why are shared restraint pointers still fail-closed?
9. Why must metadata residue in an otherwise empty block prevent block deletion?
10. Explain why final-byte equality precedes Writer testimony validation.
11. Explain why the validator may reuse the corrected planner authority but must not import Writer payload/splice helpers.
12. What evidence is still NOT_RUN, and why must it not be represented as PASS?
13. Why does generic RESTRAINT CREATE remain blocked after DELETE works?
14. Define the W2.12 one-TARGET0 adoption invariant.